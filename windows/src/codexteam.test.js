'use strict';
// The Codex team against throwaway settings and a stand-in session host on a pipe of its own: `npm test`.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { createCodexTeam, codexArgs } = require('./codexteam');

const THREAD = '019a2b3c-4d5e-7f60-8a9b-0c1d2e3f4a5b';
const NODE = '"C:\\Program Files\\nodejs\\node.exe" "C:\\Users\\u\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\bin\\codex.js"';
const LOG = `C:\\Users\\u\\.codex\\sessions\\2026\\11\\09\\rollout-2026-11-09T10-00-00-${THREAD}.jsonl`;

// The app's settings.json, read again as a new launch does.
function settingsFile() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'codexteam-')), 'settings.json');
  const open = () => {
    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}
    return { get: (k) => data[k], set: (k, v) => ((data[k] = v), fs.writeFileSync(file, JSON.stringify(data))) };
  };
  return { open, file };
}

test('off until turned on', () => {
  const team = createCodexTeam({ settings: settingsFile().open() });
  assert.strictEqual(team.on(), false);
  assert.deepStrictEqual(team.list(), []);
  team.set(true);
  assert.strictEqual(team.on(), true);
});

test('a command line gives the options as typed, nothing added', () => {
  assert.deepStrictEqual(codexArgs(`${NODE} resume ${THREAD} -m gpt-5.5 -c model_reasoning_effort=xhigh -c approval_policy=never -c sandbox_mode=danger-full-access`), {
    thread: THREAD, args: ['-m', 'gpt-5.5', '-c', 'model_reasoning_effort=xhigh', '-c', 'approval_policy=never', '-c', 'sandbox_mode=danger-full-access'],
  });
  // A new session: its prompt and its image are the first start's only; its thread comes from its log.
  assert.deepStrictEqual(codexArgs('"C:\\bin\\codex.exe" --model=o3 -i shot.png --sandbox workspace-write "fix the bug"'), {
    thread: null, args: ['--model', 'o3', '--sandbox', 'workspace-write'],
  });
  assert.deepStrictEqual(codexArgs(`${NODE}`), { thread: null, args: [] });
  assert.strictEqual(codexArgs(`${NODE} exec "do it"`), null);
  assert.strictEqual(codexArgs('node server.js'), null);
});

test('remembered, read back at the next launch, started again with its own options', () => {
  const s = settingsFile();
  const team = createCodexTeam({ settings: s.open() });
  team.seen([{ tab: 'tab-1', cmd: `${NODE} -m o3 "hello"`, log: LOG, cwd: 'C:\\work\\api', title: 'api' }], ['tab-1']);

  const next = createCodexTeam({ settings: s.open() });
  const [e] = next.list();
  assert.deepStrictEqual(e, { thread: THREAD, cwd: 'C:\\work\\api', title: 'api', args: ['-m', 'o3'], tab: 'tab-1' });
  assert.deepStrictEqual(next.command(e), ['codex', 'resume', THREAD, '-m', 'o3']);
  // Still in the session host (the app only quit): not started twice.
  assert.deepStrictEqual(next.missing([{ id: 'tab-1' }]), []);
  assert.deepStrictEqual(next.missing([{ id: 'other', codex: THREAD }]), []);
  assert.deepStrictEqual(next.missing([]), [e]);
});

test('forgotten when Codex is quit in its terminal or the session ended, not while it comes back', () => {
  const s = settingsFile();
  const team = createCodexTeam({ settings: s.open() });
  const run = { tab: 'tab-1', cmd: `${NODE} resume ${THREAD}`, log: null, cwd: 'C:\\w', title: 'w' };
  team.seen([run], ['tab-1']);
  team.seen([], ['tab-1']);
  assert.deepStrictEqual(team.list(), []);

  team.seen([run], ['tab-1']);
  const next = createCodexTeam({ settings: s.open() });
  next.placed(THREAD, 'tab-2');
  next.seen([], ['tab-2']);
  assert.strictEqual(next.list().length, 1, 'not seen yet in this launch: still starting');
  next.forget('tab-2');
  assert.deepStrictEqual(next.list(), []);
});

test('a hand-edited entry that is not a thread is left out', () => {
  const s = settingsFile();
  fs.writeFileSync(s.file, JSON.stringify({ codexTeamSessions: [{ thread: '1; Remove-Item x', cwd: 'C:\\', args: [] }, { thread: THREAD, cwd: 'C:\\', args: [1] }] }));
  assert.deepStrictEqual(createCodexTeam({ settings: s.open() }).list(), []);
});

test('the session host gets the command from the stored options, and the thread comes back with the session', { skip: process.platform !== 'win32' }, async (t) => {
  process.env.CLAUDE_CONFIG_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'codexteam-claude-'));
  const { createTerminals } = require('./terminals');
  const name = `atalay-terminal-host-test-${crypto.randomUUID()}`;
  const sessions = [];
  const host = net.createServer((sock) => {
    let buf = '';
    sock.setEncoding('utf8');
    sock.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const m = JSON.parse(buf.slice(0, i));
        buf = buf.slice(i + 1);
        const reply = (r) => sock.write(JSON.stringify({ ...r, rid: m.rid }) + '\n');
        if (m.t === 'hello') reply({ t: 'hello', v: 1, end: true });
        else if (m.t === 'spawn') sessions.push(m), reply({ t: 'spawned', pid: 4242 });
        else if (m.t === 'list') reply({ t: 'list', sessions: sessions.map((x) => ({ id: x.id, pid: 4242, meta: x.meta })) });
      }
    });
  });
  await new Promise((r) => host.listen(`\\\\.\\pipe\\${name}`, r));
  t.after(() => host.close());

  const team = createCodexTeam({ settings: settingsFile().open() });
  team.seen([{ tab: 'old', cmd: `${NODE} -m o3`, log: LOG, cwd: os.tmpdir(), title: 'w' }], ['old']);
  const [e] = team.missing([]);
  const one = createTerminals({ onData() {}, onExit() {}, host: { name, dir: os.tmpdir(), source: 'none' } });
  await one.spawn({ id: 'tab-2', cwd: e.cwd, command: team.command(e), codex: e.thread, title: e.title });
  one.detachAll();

  const { cmd, meta } = sessions[0];
  assert.ok(cmd.endsWith(` -NoLogo -NoExit -Command "codex 'resume' '${THREAD}' '-m' 'o3'"`), cmd);
  assert.doesNotMatch(cmd, /sandbox|approval|effort|dangerously/);
  assert.strictEqual(JSON.parse(meta).codex, THREAD);

  // The next launch: the host still has it, so the team doesn't start it again.
  const two = createTerminals({ onData() {}, onExit() {}, host: { name, dir: os.tmpdir(), source: 'none' } });
  const found = await two.restore();
  two.detachAll();
  assert.strictEqual(found[0].codex, THREAD);
  assert.deepStrictEqual(team.missing(found), []);
});
