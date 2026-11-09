'use strict';
// Claude's line to Codex against a stand-in for `codex app-server proxy` (WebSocket over stdio) and throwaway folders:
// `npm test`.
const test = require('node:test');
const assert = require('node:assert');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createBridge, cli, installCLI } = require('./codexbridge');

const THREAD = '019a2b3c-4d5e-7f60-8a9b-0c1d2e3f4a5b';

// The proxy: the upgrade, then JSON-RPC in masked frames; it answers in plain ones and writes down what it was asked.
// FAKE_ACTIVE=1: a turn is already running on the thread when the bridge joins it.
const FAKE = String.raw`
const fs = require('fs');
let buf = Buffer.alloc(0), up = false;
const out = (obj) => {
  const p = Buffer.from(JSON.stringify(obj));
  const head = p.length < 126 ? Buffer.from([0x81, p.length]) : Buffer.from([0x81, 126, p.length >> 8, p.length & 255]);
  process.stdout.write(Buffer.concat([head, p]));
};
const note = (m) => fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify(m) + '\n');
function rpc(m) {
  note({ method: m.method, params: m.params });
  if (m.id === undefined) return;
  const r = (result) => out({ id: m.id, result });
  const t = m.params && m.params.threadId;
  switch (m.method) {
    case 'initialize': return r({ userAgent: 'fake' });
    case 'thread/resume': return r({ thread: { id: t, status: 'idle' } });
    case 'thread/turns/list': return r({ data: process.env.FAKE_ACTIVE ? [{ id: 'turn-0', status: 'inProgress' }] : [{ id: 'turn-x', status: 'completed' }] });
    case 'turn/steer': return r({ turnId: m.params.expectedTurnId });
    case 'turn/start':
      r({ turn: { id: 'turn-1', status: 'inProgress' } });
      out({ method: 'turn/started', params: { threadId: t, turn: { id: 'turn-1' } } });
      out({ method: 'item/completed', params: { threadId: t, turnId: 'turn-1', item: { type: 'agentMessage', text: 'done: ' + m.params.input[0].text } } });
      return out({ method: 'turn/completed', params: { threadId: t, turn: { id: 'turn-1', status: 'completed' } } });
    default: return out({ id: m.id, error: { message: 'no ' + m.method } });
  }
}
process.stdin.on('data', (d) => {
  buf = Buffer.concat([buf, d]);
  if (!up) {
    const i = buf.indexOf('\r\n\r\n');
    if (i < 0) return;
    up = true;
    buf = buf.subarray(i + 4);
    process.stdout.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
  }
  while (buf.length >= 2) {
    let len = buf[1] & 0x7f, off = 2;
    if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
    if (buf.length < off + 4 + len) return;
    const mask = buf.subarray(off, off + 4), p = Buffer.from(buf.subarray(off + 4, off + 4 + len));
    for (let i = 0; i < len; i++) p[i] ^= mask[i & 3];
    buf = buf.subarray(off + 4 + len);
    rpc(JSON.parse(p.toString()));
  }
});
process.stdin.on('end', () => process.exit(0));
`;

function setup(t, active) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codexbridge-'));
  const fake = path.join(root, 'fake-proxy.js'), calls = path.join(root, 'calls.jsonl'), dir = path.join(root, 'codex-bridge');
  fs.writeFileSync(fake, FAKE);
  const env = { ...process.env, FAKE_LOG: calls, ...(active && { FAKE_ACTIVE: '1' }) };
  const bridge = createBridge({ dir, start: () => spawn(process.execPath, [fake], { stdio: ['pipe', 'pipe', 'inherit'], env }), team: () => [{ thread: THREAD, title: 'api', cwd: 'C:\\w' }] });
  t.after(() => bridge.close());
  const sent = () => fs.readFileSync(calls, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const events = () => (fs.existsSync(path.join(dir, 'events.jsonl')) ? fs.readFileSync(path.join(dir, 'events.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  return { bridge, dir, sent, events };
}

// The CLI, its output caught.
async function run(args, dir) {
  const lines = [], log = console.log, err = console.error;
  console.log = console.error = (s) => lines.push(String(s));
  try {
    return { code: await cli(args, dir), out: lines.join('\n') };
  } finally {
    console.log = log;
    console.error = err;
  }
}

const until = async (ok) => {
  for (let i = 0; i < 100 && !ok(); i++) await new Promise((r) => setTimeout(r, 20));
};

test('no turn running: the CLI starts one, and what Codex does lands in the events', async (t) => {
  const { bridge, dir, sent, events } = setup(t, false);
  await bridge.listen();
  const r = await run(['send', THREAD, 'run', 'the', 'tests'], dir);
  assert.strictEqual(r.code, 0, r.out);
  assert.deepStrictEqual(JSON.parse(r.out), { threadId: THREAD, turnId: 'turn-1', mode: 'turn/start' });
  assert.deepStrictEqual(sent().map((m) => m.method), ['initialize', 'initialized', 'thread/resume', 'thread/turns/list', 'turn/start']);
  assert.deepStrictEqual(sent()[4].params, { threadId: THREAD, input: [{ type: 'text', text: 'run the tests' }] });

  await until(() => events().length >= 3);
  assert.deepStrictEqual(events().map((e) => [e.kind, e.threadId]), [['turn_started', THREAD], ['agent_message', THREAD], ['turn_completed', THREAD]]);
  assert.strictEqual(events()[1].text, 'done: run the tests');
  const ev = await run(['events', THREAD, '--last', '1'], dir);
  assert.strictEqual(JSON.parse(ev.out).kind, 'turn_completed');

  const st = JSON.parse((await run(['status'], dir)).out);
  assert.deepStrictEqual(st.team, [{ thread: THREAD, title: 'api', cwd: 'C:\\w' }]);
  assert.deepStrictEqual(st.threads, [{ threadId: THREAD, activeTurnId: null }]);
});

test('a turn running: the text steers it, no new turn', async (t) => {
  const { bridge, dir, sent } = setup(t, true);
  await bridge.listen();
  const r = await run(['send', THREAD, 'also check the docs'], dir);
  assert.deepStrictEqual(JSON.parse(r.out), { threadId: THREAD, turnId: 'turn-0', mode: 'turn/steer' });
  const steer = sent().find((m) => m.method === 'turn/steer');
  assert.deepStrictEqual(steer.params, { threadId: THREAD, expectedTurnId: 'turn-0', input: [{ type: 'text', text: 'also check the docs' }] });
  assert.ok(!sent().some((m) => m.method === 'turn/start'));
});

test('only with the token, only a thread id, and nothing listening once it is off', async (t) => {
  const { bridge, dir } = setup(t, false);
  await bridge.listen();
  const port = fs.readFileSync(path.join(dir, 'port'), 'utf8');
  const bad = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', headers: { 'x-token': 'nope' }, body: '{"cmd":"status"}' });
  assert.strictEqual(bad.status, 401);
  const r = await run(['send', 'not-a-thread', 'hi'], dir);
  assert.strictEqual(r.code, 1);
  assert.match(r.out, /not a Codex thread id/);
  bridge.close();
  const off = await run(['status'], dir);
  assert.strictEqual(off.code, 1);
  assert.match(off.out, /isn't running/);
});

test('the CLI the app puts in its bin runs on its own', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codexbridge-bin-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bin = path.join(root, 'bin');
  installCLI(bin);
  fs.mkdirSync(path.join(root, 'codex-bridge'));
  fs.writeFileSync(path.join(root, 'codex-bridge', 'events.jsonl'), `{"kind":"agent_message","threadId":"${THREAD}","text":"hi"}
{"kind":"agent_message","threadId":"other"}
`);
  // It finds the bridge's folder next to its own.
  const r = spawnSync(process.execPath, [path.join(bin, 'atalay-codex.js'), 'events', THREAD], { encoding: 'utf8', env: { ...process.env, ATALAY_CODEX_HOME: '' } });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout.trim(), `{"kind":"agent_message","threadId":"${THREAD}","text":"hi"}`);
  assert.ok(fs.existsSync(path.join(bin, 'atalay-codex.cmd')) && fs.existsSync(path.join(bin, 'atalay-codex')));
});
