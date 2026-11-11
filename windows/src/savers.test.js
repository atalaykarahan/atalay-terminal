'use strict';
// The agent-rules saver against throwaway Claude Code, Codex and Antigravity folders: `npm test`.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createSavers } = require('./savers');

const RULES = path.join(__dirname, '..', '..', 'app', 'Resources', 'agent-rules');
const START = '<!-- atalay-terminal: agent-rules -->', END = '<!-- /atalay-terminal: agent-rules -->';
const CAVEMAN = '<!-- atalay-terminal: caveman -->\ncaveman rules\n<!-- /atalay-terminal: caveman -->\n';
const USER_SETTINGS = JSON.stringify({ model: 'opus', hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'echo mine' }] }] } }, null, 2) + '\n';

function setup() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'savers-'));
  const dirs = { home, claudeDir: path.join(home, '.claude'), codexDir: path.join(home, '.codex'), ownDir: path.join(home, 'atalay-terminal') };
  fs.mkdirSync(dirs.claudeDir, { recursive: true });
  fs.mkdirSync(dirs.codexDir, { recursive: true });
  fs.mkdirSync(path.join(home, '.gemini', 'antigravity-cli'), { recursive: true });
  fs.writeFileSync(path.join(dirs.claudeDir, 'settings.json'), USER_SETTINGS);
  fs.writeFileSync(path.join(dirs.codexDir, 'AGENTS.md'), `my notes\n\n${CAVEMAN}`);
  const store = {};
  const settings = { get: (k) => store[k], set: (k, v) => (store[k] = v) };
  const make = () =>
    createSavers({ settings, ...dirs, bundled: { rtk: path.join(home, 'none.exe'), caveman: path.join(home, 'none'), agentRules: RULES }, which: () => null });
  const read = () => ({
    settings: fs.readFileSync(path.join(dirs.claudeDir, 'settings.json'), 'utf8'),
    agents: fs.readFileSync(path.join(dirs.codexDir, 'AGENTS.md'), 'utf8'),
  });
  const agy = path.join(home, '.gemini', 'config', 'plugins', 'atalay-agent-rules');
  return { ...dirs, make, read, agy, done: () => fs.rmSync(home, { recursive: true, force: true }) };
}

test('agent rules: off by default, the tools untouched', async () => {
  const t = setup();
  const s = t.make();
  await s.autoStart();
  assert.deepStrictEqual(t.read(), { settings: USER_SETTINGS, agents: `my notes\n\n${CAVEMAN}` });
  assert.deepStrictEqual((await s.state()).agentRules, { available: true, on: false });
  assert.ok(!fs.existsSync(t.agy));
  t.done();
});

test('agent rules: on puts in the hook, the AGENTS.md block and the plugin; again changes nothing', async () => {
  const t = setup();
  const s = t.make();
  await s.set('agentRules', true);
  const once = t.read();
  const rules = path.join(t.ownDir, 'agent-rules', 'rules.md');
  assert.strictEqual(fs.readFileSync(rules, 'utf8'), fs.readFileSync(path.join(RULES, 'rules.md'), 'utf8'));
  const json = JSON.parse(once.settings);
  assert.strictEqual(json.model, 'opus');
  assert.deepStrictEqual(json.hooks.SessionStart.map((e) => e.hooks[0].command), ['echo mine', `cat '${rules.replace(/\\/g, '/')}'`]);
  assert.ok(once.agents.startsWith(`my notes\n\n${CAVEMAN}\n${START}\n# Token use in multi-agent work\n`));
  assert.ok(once.agents.endsWith(`${END}\n`));
  assert.ok(fs.readFileSync(path.join(t.agy, 'rules', 'AGENTS.md'), 'utf8').includes('# Token use in multi-agent work'));
  assert.strictEqual((await s.state()).agentRules.on, true);

  await s.set('agentRules', true);
  await t.make().autoStart();
  assert.deepStrictEqual(t.read(), once);
  t.done();
});

test('agent rules: off takes out exactly what on put in, the text around the block stays', async () => {
  const t = setup();
  const s = t.make();
  await s.set('agentRules', true);
  // The user writes after the block meanwhile.
  fs.appendFileSync(path.join(t.codexDir, 'AGENTS.md'), 'later notes\n');
  await s.set('agentRules', false);
  assert.deepStrictEqual(t.read(), { settings: USER_SETTINGS, agents: `my notes\n\n${CAVEMAN}later notes\n` });
  assert.ok(!fs.existsSync(t.agy));
  assert.ok(!fs.existsSync(path.join(t.ownDir, 'agent-rules')));
  assert.strictEqual((await s.state()).agentRules.on, false);
  t.done();
});

test('agent rules: the choice is kept across launches', async () => {
  const t = setup();
  await t.make().set('agentRules', true);
  // Claude Code's settings lose the hook (the user reset them): the next launch puts it back.
  fs.writeFileSync(path.join(t.claudeDir, 'settings.json'), USER_SETTINGS);
  await t.make().autoStart();
  assert.ok(t.read().settings.includes('atalay-terminal/agent-rules/rules.md'));

  await t.make().set('agentRules', false);
  await t.make().autoStart();
  assert.deepStrictEqual(t.read(), { settings: USER_SETTINGS, agents: `my notes\n\n${CAVEMAN}` });
  t.done();
});
