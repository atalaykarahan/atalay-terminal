'use strict';
// Claude talks to Codex (Settings · CODEX, with the Codex team): a Claude session in one of the app's terminals runs
// `atalay-codex send <thread> "text"` and the text goes to that Codex thread, the one its terminal shows. The app joins
// Codex's shared background server (`codex app-server daemon`, where `codex resume` runs its threads) through
// `codex app-server proxy`, so the terminal and the bridge are on the same thread in the same process, never a second
// copy of it. A send starts a turn (turn/start), or steers the turn that's running (turn/steer). What the joined threads
// do (turns started and over, Codex's answers, its commands) goes to events.jsonl, which `atalay-codex events` reads.
// The app's side listens on 127.0.0.1 only, with a token in a file only this user can read; nothing goes anywhere else.
// The proxy starts at the first request, not before. The same file, run with Node, is the CLI (the app copies it next
// to its rtk, which its terminals have on their PATH). Protocol as of codex-cli 0.167 (`codex app-server
// generate-json-schema`).
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const THREAD = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const files = (dir) => ({ port: path.join(dir, 'port'), token: path.join(dir, 'token'), events: path.join(dir, 'events.jsonl') });

/**
 * `dir`: where the port, the token and events.jsonl go. `start()`: the proxy (a child process, or a promise of one) that
 * speaks WebSocket over its stdio. `team()`: the Codex team's sessions, which `status` lists.
 */
function createBridge({ dir, start, team = () => [] }) {
  const F = files(dir);
  const event = (e) => {
    try {
      fs.appendFileSync(F.events, JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');
    } catch {}
  };
  const threads = new Map(); // threadId -> { active (the running turn's id), joined (a promise) }
  const th = (id) => threads.get(id) || threads.set(id, { active: null, joined: null }).get(id);
  let conn = null, server = null, token = null;

  function onMessage(c, line) {
    let m;
    try {
      m = JSON.parse(line);
    } catch {
      return;
    }
    if (m.id !== undefined && m.method === undefined) {
      const p = c.pending.get(m.id);
      c.pending.delete(m.id);
      if (p) m.error ? p.reject(new Error(m.error.message || JSON.stringify(m.error))) : p.resolve(m.result);
      return;
    }
    const p = m.params || {};
    // An approval and the like: the Codex terminal answers it, the log only says it came.
    if (m.id !== undefined) return event({ kind: 'server_request', method: m.method, threadId: p.threadId, turnId: p.turnId });
    const it = p.item || {};
    switch (m.method) {
      case 'turn/started':
        th(p.threadId).active = p.turn.id;
        return event({ kind: 'turn_started', threadId: p.threadId, turnId: p.turn.id });
      case 'turn/completed':
        if (th(p.threadId).active === p.turn.id) th(p.threadId).active = null;
        return event({ kind: 'turn_completed', threadId: p.threadId, turnId: p.turn.id, status: p.turn.status, error: p.turn.error });
      case 'item/started':
        if (it.type === 'userMessage') {
          return event({ kind: 'user_message', threadId: p.threadId, turnId: p.turnId, text: (it.content || []).map((x) => x.text || '').join('') });
        }
        return;
      case 'item/completed':
        if (it.type === 'agentMessage') return event({ kind: 'agent_message', threadId: p.threadId, turnId: p.turnId, text: it.text });
        if (it.type === 'commandExecution' || it.type === 'fileChange') {
          return event({ kind: it.type, threadId: p.threadId, turnId: p.turnId, status: it.status, command: it.command, exitCode: it.exitCode });
        }
        return;
      case 'error':
        return event({ kind: 'error', threadId: p.threadId, turnId: p.turnId, error: p.error, willRetry: p.willRetry });
      case 'thread/status/changed':
        return event({ kind: 'thread_status', threadId: p.threadId, status: p.status });
    }
  }

  /** The line to Codex's server: the proxy started and introduced at the first request, again after it went away. */
  function connect() {
    if (conn) return conn;
    conn = (async () => {
      const child = await start();
      const c = { child, pending: new Map(), next: 1 };
      child.stdin.on('error', () => {});
      const ws = wsOverStdio(child, (line) => onMessage(c, line));
      const gone = new Promise((_, reject) => child.once('exit', (code) => reject(new Error(`codex app-server proxy exited (${code})`))));
      gone.catch((err) => {
        if (conn && c.live) conn = null;
        for (const p of c.pending.values()) p.reject(err);
        c.pending.clear();
        threads.clear();
        if (c.live) event({ kind: 'bridge', msg: err.message });
      });
      c.rpc = (method, params) => Promise.race([gone, new Promise((resolve, reject) => {
        const id = c.next++;
        c.pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ method, id, params }));
      })]);
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Codex's server didn't answer (is Codex installed and signed in?)")), 30_000).unref());
      try {
        await Promise.race([ws.ready, gone, timeout]);
        await Promise.race([c.rpc('initialize', { clientInfo: { name: 'atalay_terminal', title: "Atalay's Terminal", version: '1' } }), timeout]);
      } catch (e) {
        child.stdin.end();
        throw e;
      }
      ws.send(JSON.stringify({ method: 'initialized' }));
      c.live = true;
      return c;
    })();
    conn.catch(() => (conn = null));
    return conn;
  }

  /** A thread joined once per connection, so its events come here too; a turn already running is the one to steer. */
  function join(c, threadId) {
    const t = th(threadId);
    if (!t.joined) {
      t.joined = (async () => {
        await c.rpc('thread/resume', { threadId, excludeTurns: true });
        const last = ((await c.rpc('thread/turns/list', { threadId, limit: 1 })) || {}).data?.[0];
        if (last && last.status === 'inProgress' && !t.active) t.active = last.id;
      })();
      t.joined.catch(() => (t.joined = null));
    }
    return t.joined.then(() => t);
  }

  const handlers = {
    async send({ threadId, text }) {
      if (!THREAD.test(threadId || '')) throw new Error('not a Codex thread id');
      if (typeof text !== 'string' || !text.trim()) throw new Error('nothing to send');
      const c = await connect();
      const t = await join(c, threadId);
      const input = [{ type: 'text', text }];
      if (t.active) {
        try {
          const r = await c.rpc('turn/steer', { threadId, expectedTurnId: t.active, input });
          return { threadId, turnId: r.turnId, mode: 'turn/steer' };
        } catch (e) {
          // The turn ended meanwhile: a new one. Still running, it's a real error.
          if (t.active) throw e;
        }
      }
      const r = await c.rpc('turn/start', { threadId, input });
      t.active = r.turn.id;
      return { threadId, turnId: r.turn.id, mode: 'turn/start' };
    },
    status: () => ({
      connected: !!conn,
      team: team().map((e) => ({ thread: e.thread, title: e.title, cwd: e.cwd })),
      threads: [...threads].map(([threadId, t]) => ({ threadId, activeTurnId: t.active })),
      events: F.events,
    }),
  };

  return {
    /** Listening for the CLI: a port of the system's choosing and a new token, both in `dir`. */
    listen() {
      if (server) return Promise.resolve();
      fs.mkdirSync(dir, { recursive: true });
      token = crypto.randomBytes(24).toString('hex');
      fs.writeFileSync(F.token, token, { mode: 0o600 });
      server = http.createServer((req, res) => {
        let body = '';
        req.on('data', (d) => {
          body += d;
          if (body.length > 1 << 20) req.destroy();
        });
        req.on('end', async () => {
          const out = (code, obj) => {
            res.writeHead(code, { 'content-type': 'application/json' });
            res.end(JSON.stringify(obj));
          };
          if (req.method !== 'POST' || req.headers['x-token'] !== token) return out(401, { error: 'bad token' });
          try {
            const a = JSON.parse(body || '{}');
            const h = Object.hasOwn(handlers, a.cmd) && handlers[a.cmd];
            if (!h) return out(400, { error: `unknown command ${a.cmd}` });
            out(200, await h(a));
          } catch (e) {
            out(500, { error: e.message });
          }
        });
      });
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
          fs.writeFileSync(F.port, String(server.address().port));
          resolve();
        });
      });
    },
    /** Off, or the app quits: the CLI finds no one, and the proxy ends (Codex's server and its threads go on). */
    close() {
      if (server) server.close();
      server = null;
      fs.rmSync(F.port, { force: true });
      const c = conn;
      conn = null;
      if (c) c.then((x) => x.child.stdin.end(), () => {});
    },
  };
}

// A minimal WebSocket client (RFC 6455) over a child's stdio, which is what `codex app-server proxy` carries: masked text
// frames out; text, continuation, ping and close in.
function wsOverStdio(child, onMessage) {
  let buf = Buffer.alloc(0), upgraded = false, frag = [], ready;
  const readyP = new Promise((resolve, reject) => (ready = { resolve, reject }));
  const frame = (op, payload) => {
    const key = crypto.randomBytes(4), n = payload.length;
    let head;
    if (n < 126) head = Buffer.from([0x80 | op, 0x80 | n]);
    else if (n < 65536) head = Buffer.from([0x80 | op, 0x80 | 126, n >> 8, n & 255]);
    else {
      head = Buffer.alloc(10);
      head[0] = 0x80 | op;
      head[1] = 0x80 | 127;
      head.writeBigUInt64BE(BigInt(n), 2);
    }
    const body = Buffer.from(payload);
    for (let i = 0; i < n; i++) body[i] ^= key[i & 3];
    child.stdin.write(Buffer.concat([head, key, body]));
  };
  child.stdout.on('data', (d) => {
    buf = Buffer.concat([buf, d]);
    if (!upgraded) {
      const i = buf.indexOf('\r\n\r\n');
      if (i < 0) return;
      const status = buf.subarray(0, i).toString().split('\r\n')[0];
      if (!/ 101 /.test(status)) return ready.reject(new Error(`codex app-server proxy: ${status}`));
      upgraded = true;
      buf = buf.subarray(i + 4);
      ready.resolve();
    }
    for (;;) {
      if (buf.length < 2) return;
      const fin = buf[0] & 0x80, op = buf[0] & 0x0f, masked = buf[1] & 0x80;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2));
        off = 10;
      }
      const mask = masked ? buf.subarray(off, off + 4) : null;
      if (masked) off += 4;
      if (buf.length < off + len) return;
      const payload = Buffer.from(buf.subarray(off, off + len));
      if (mask) for (let i = 0; i < len; i++) payload[i] ^= mask[i & 3];
      buf = buf.subarray(off + len);
      if (op === 1 || op === 0) {
        frag.push(payload);
        if (fin) {
          onMessage(Buffer.concat(frag).toString('utf8'));
          frag = [];
        }
      } else if (op === 9) frame(10, payload);
    }
  });
  child.stdin.write('GET / HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
    + `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
  return { ready: readyP, send: (s) => frame(1, Buffer.from(s, 'utf8')) };
}

/** The CLI in `binDir` (the app's, on its terminals' PATH): this file, and a word for cmd/PowerShell and one for Git Bash. */
function installCLI(binDir) {
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(path.join(binDir, 'atalay-codex.js'), fs.readFileSync(__filename));
  fs.writeFileSync(path.join(binDir, 'atalay-codex.cmd'), '@node "%~dp0atalay-codex.js" %*\r\n');
  fs.writeFileSync(path.join(binDir, 'atalay-codex'), '#!/bin/sh\nexec node "$(dirname "$0")/atalay-codex.js" "$@"\n');
}

// ---------- the CLI: atalay-codex send|status|events ----------
const USAGE = `usage:
  atalay-codex send THREAD_ID "text"     to that Codex thread: a new turn, or into the turn that's running
  atalay-codex status                    the Codex team's threads, and the ones this app has joined
  atalay-codex events [THREAD_ID] [--last N]   what the joined threads did (default: the last 20)`;

async function cli([cmd, ...rest], dir = process.env.ATALAY_CODEX_HOME || path.join(__dirname, '..', 'codex-bridge')) {
  const F = files(dir);
  if (cmd === 'events') {
    const at = rest.indexOf('--last');
    const last = at >= 0 ? Number(rest.splice(at, 2)[1]) || 20 : 20;
    const lines = fs.existsSync(F.events) ? fs.readFileSync(F.events, 'utf8').split('\n').filter(Boolean) : [];
    const mine = rest[0] ? lines.filter((l) => l.includes(`"threadId":"${rest[0]}"`)) : lines;
    for (const l of mine.slice(-last)) console.log(l);
    return 0;
  }
  if (cmd !== 'send' && cmd !== 'status') {
    console.log(USAGE);
    return cmd ? 1 : 0;
  }
  let port, token;
  try {
    port = fs.readFileSync(F.port, 'utf8').trim();
    token = fs.readFileSync(F.token, 'utf8').trim();
  } catch {
    console.error("atalay-codex: Atalay's Terminal isn't running with the Codex team on (Settings · CODEX)");
    return 1;
  }
  const body = cmd === 'send' ? { cmd, threadId: rest[0], text: rest.slice(1).join(' ') } : { cmd };
  // A port left behind by an app that didn't quit cleanly: no one answers there.
  const r = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', headers: { 'x-token': token, 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .catch(() => null);
  if (!r) {
    console.error("atalay-codex: Atalay's Terminal isn't running with the Codex team on (Settings · CODEX)");
    return 1;
  }
  console.log(JSON.stringify(await r.json(), null, 2));
  return r.ok ? 0 : 1;
}

if (require.main === module) {
  cli(process.argv.slice(2)).then(
    (code) => (process.exitCode = code),
    (e) => {
      console.error('atalay-codex:', e.message);
      process.exitCode = 1;
    },
  );
}

module.exports = { createBridge, installCLI, cli };
