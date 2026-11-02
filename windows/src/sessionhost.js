'use strict';
// The app's side of the session host (host.cs), which keeps the chats and terminals running while the app is closed:
// finds it on its pipe, or compiles and starts it first, then talks to it one JSON object per line.
const cp = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { EventEmitter } = require('events');

const PROTOCOL = 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A line to the host: requests answered by `rid`, and its sessions' output ("data") and ends ("exit") as events. */
class Link extends EventEmitter {
  constructor(sock) {
    super();
    this.sock = sock;
    this.rid = 0;
    this.waiting = new Map();
    this.closed = false;
    let buf = '';
    sock.setEncoding('utf8');
    sock.on('data', (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        let m;
        try {
          m = JSON.parse(line);
        } catch {
          continue;
        }
        // A replay goes out as output here, in line: the output after it may already be behind it in this read.
        if (m.t === 'data' || m.t === 'replay') this.emit('data', m.id, m.d);
        else if (m.t === 'exit') this.emit('exit', m.id, m.code);
        const done = m.rid && this.waiting.get(m.rid);
        if (done) {
          this.waiting.delete(m.rid);
          done(m);
        }
      }
    });
    sock.on('error', () => {});
    sock.on('close', () => {
      this.closed = true;
      for (const done of this.waiting.values()) done({ t: 'error', message: 'the session host went away' });
      this.waiting.clear();
      this.emit('close');
    });
  }

  send(m) {
    if (!this.closed) this.sock.write(JSON.stringify(m) + '\n');
  }

  request(m) {
    if (this.closed) return Promise.resolve({ t: 'error', message: 'the session host went away' });
    return new Promise((resolve) => {
      const rid = String(++this.rid);
      this.waiting.set(rid, resolve);
      this.send({ ...m, rid });
    });
  }

  close() {
    this.sock.end();
  }
}

function connect(pipe) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(pipe);
    sock.once('error', reject);
    sock.once('connect', () => {
      sock.removeListener('error', reject);
      resolve(new Link(sock));
    });
  });
}

/**
 * The host's program for this source: compiled once (a fraction of a second) by .NET Framework's C# compiler, which
 * every Windows has, into `dir`, outside the app's folder (an update's installer ends whatever runs from there). A
 * changed source makes a new program; the old ones go when nothing runs them anymore.
 */
async function build(dir, source) {
  const code = fs.readFileSync(source);
  const hash = crypto.createHash('sha256').update(code).digest('hex').slice(0, 12);
  const exe = path.join(dir, `atalay-terminal-host-${hash}.exe`);
  if (fs.existsSync(exe)) return exe;
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) {
    if (/^(atalay-terminal-host-|host-)/.test(f) && !f.includes(hash)) fs.rm(path.join(dir, f), { force: true }, () => {});
  }
  // The source goes next to it: the compiler can't read the one inside the app's archive.
  const cs = path.join(dir, `host-${hash}.cs`);
  const building = path.join(dir, `atalay-terminal-host-${hash}-${process.pid}.exe`);
  fs.writeFileSync(cs, code);
  const csc = path.join(process.env.SystemRoot || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
  await new Promise((resolve, reject) => {
    cp.execFile(
      csc,
      ['/nologo', '/target:winexe', '/optimize+', '/r:System.Web.Extensions.dll', '/r:System.Core.dll', `/out:${building}`, cs],
      { windowsHide: true, timeout: 60_000 },
      (err, stdout) => (err ? reject(new Error(`csc: ${String(stdout || err.message).trim().split(/\r?\n/)[0]}`)) : resolve()),
    );
  });
  try {
    fs.renameSync(building, exe);
  } catch (e) {
    // Another copy of the app built it at the same moment.
    fs.rmSync(building, { force: true });
    if (!fs.existsSync(exe)) throw e;
  }
  return exe;
}

/** The host on pipe `name`, started from `dir` (built from `source`) when it isn't running yet. */
async function openHost({ name, dir, source }) {
  const pipe = `\\\\.\\pipe\\${name}`;
  let link = await connect(pipe).catch(() => null);
  if (!link) {
    const exe = await build(dir, source);
    // It starts the host proper as a copy of itself, without this app's handles, and leaves.
    const child = cp.spawn(exe, [name], { cwd: dir, detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', () => {});
    child.unref();
    for (let i = 0; i < 50 && !link; i++) {
      await sleep(100);
      link = await connect(pipe).catch(() => null);
    }
    if (!link) throw new Error("the session host didn't start");
  }
  const hello = await link.request({ t: 'hello' });
  if (hello.v !== PROTOCOL) {
    link.close();
    throw new Error(`the session host speaks version ${hello.v}, not ${PROTOCOL}`);
  }
  return link;
}

module.exports = { openHost };
