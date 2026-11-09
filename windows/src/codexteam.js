'use strict';
// The Codex team (Settings · CODEX, off until turned on): Codex sessions come back after a restart as Claude's chats do.
// A Codex the user runs in one of the app's terminals is remembered by its thread, with the folder and the options it was
// started with, exactly as typed (its model, `-c model_reasoning_effort=…`, its sandbox and approval flags): nothing is
// added. At the next launch every remembered thread that isn't running in the session host any more (the PC restarted)
// opens again as `codex resume <thread> <those options>`, hidden like the chats that come back. Quitting Codex in its
// terminal, or End Session, forgets it. The list is `codexTeamSessions` in the app's settings.json, editable by hand.
const path = require('path');

const ON = 'codexTeam';
const LIST = 'codexTeamSessions';
const THREAD = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// The options a session is started again with; the rest (an image, --last, a remote server, a new worktree) belong to
// the first start only.
const VALUE = new Set(['-m', '--model', '-c', '--config', '-s', '--sandbox', '-a', '--ask-for-approval', '-p', '--profile',
  '--enable', '--disable', '--add-dir', '-C', '--cd', '--local-provider']);
const FLAG = new Set(['--search', '--oss', '--full-auto', '--yolo', '--dangerously-bypass-approvals-and-sandbox', '--approve-for-me', '--no-alt-screen']);
// Codex's commands that aren't a session at a keyboard.
const NOT_A_SESSION = new Set(['exec', 'e', 'review', 'login', 'logout', 'mcp', 'mcp-server', 'app-server', 'completion', 'sandbox',
  'debug', 'apply', 'a', 'cloud', 'features', 'help', 'fork']);

/** A Windows command line split into its words, as programs split it (CommandLineToArgvW's rules for quotes and \). */
function argv(line) {
  const out = [];
  let cur = '', has = false, quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\') {
      let n = 0;
      while (line[i] === '\\') n++, i++;
      if (line[i] === '"') {
        cur += '\\'.repeat(n >> 1);
        if (n & 1) cur += '"';
        else quoted = !quoted;
      } else {
        cur += '\\'.repeat(n);
        i--;
      }
      has = true;
    } else if (ch === '"') {
      quoted = !quoted;
      has = true;
    } else if (!quoted && /\s/.test(ch)) {
      if (has) out.push(cur);
      cur = '';
      has = false;
    } else {
      cur += ch;
      has = true;
    }
  }
  if (has) out.push(cur);
  return out;
}

/**
 * A Codex process's command line (`node …\codex.js resume <id> -m … -c …`, `codex.exe -m …`) as { thread, args }: the
 * thread when it was resumed by id (null for a new one, whose thread its log tells), and the options to start it again
 * with. null when it isn't an interactive session.
 */
function codexArgs(cmd) {
  const words = argv(String(cmd || ''));
  const at = words.findIndex((w) => /^codex(\.js|\.exe|\.cmd|\.ps1)?$/i.test(path.win32.basename(w)));
  if (at < 0) return null;
  const rest = words.slice(at + 1), args = [], positional = [];
  for (let i = 0; i < rest.length; i++) {
    const w = rest[i];
    // What follows is the prompt.
    if (w === '--') break;
    if (!w.startsWith('-') || w === '-') {
      positional.push(w);
      continue;
    }
    const eq = w.startsWith('--') ? w.indexOf('=') : -1;
    const name = eq > 0 ? w.slice(0, eq) : w;
    if (VALUE.has(name)) {
      const v = eq > 0 ? w.slice(eq + 1) : rest[++i];
      if (v === undefined) break;
      args.push(name, v);
    } else if (FLAG.has(name)) args.push(name);
  }
  if (NOT_A_SESSION.has(positional[0])) return null;
  const thread = positional[0] === 'resume' && THREAD.test(positional[1] || '') ? positional[1] : null;
  return { thread, args };
}

/** The thread of a Codex log (CODEX_HOME\sessions\…\rollout-<date>-<thread>.jsonl), or null. */
const threadOfLog = (file) => (/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i.exec(String(file || '')) || [])[1] || null;

function createCodexTeam({ settings }) {
  // Only well-formed entries: the file can be edited by hand, and a thread goes on a command line.
  const list = () => (Array.isArray(settings.get(LIST)) ? settings.get(LIST) : [])
    .filter((e) => e && THREAD.test(e.thread) && typeof e.cwd === 'string' && Array.isArray(e.args) && e.args.every((a) => typeof a === 'string'));
  const save = (next) => JSON.stringify(next) !== JSON.stringify(list()) && settings.set(LIST, next);
  // The threads seen running in this launch: only those can be forgotten for being gone, not one still on its way back.
  const seenNow = new Set();

  return {
    on: () => settings.get(ON) === true,
    set: (on) => settings.set(ON, !!on),
    list,
    /** The command a remembered session starts again with: its own options, nothing else. */
    command: (e) => ['codex', 'resume', e.thread, ...e.args],
    /** The remembered sessions not among the host's sessions that came back (`found`: terminals.restore()'s). */
    missing: (found) => list().filter((e) => !found.some((s) => s.codex === e.thread || s.id === e.tab)),
    /**
     * Every reading: `running`, the Codex sessions in the app's terminals ({ tab, cmd, log, cwd, title }), and `alive`,
     * the app's terminals. A new one is remembered; one whose terminal goes on without it was quit, and is forgotten.
     */
    seen(running, alive) {
      let next = list();
      for (const r of running) {
        const parsed = codexArgs(r.cmd);
        const thread = parsed && (parsed.thread || threadOfLog(r.log));
        // Its folder comes with the process reading after it's first seen.
        if (!thread || !r.cwd) continue;
        seenNow.add(thread);
        const entry = { thread, cwd: r.cwd, title: r.title || path.basename(r.cwd || '') || thread.slice(0, 8), args: parsed.args, tab: r.tab };
        next = next.some((e) => e.thread === thread) ? next.map((e) => (e.thread === thread ? entry : e)) : [...next, entry];
      }
      const tabs = new Set(running.map((r) => r.tab));
      next = next.filter((e) => !(seenNow.has(e.thread) && alive.includes(e.tab) && !tabs.has(e.tab)));
      save(next);
    },
    /** A session coming back in terminal `tab`: it's this thread's now. */
    placed: (thread, tab) => save(list().map((e) => (e.thread === thread ? { ...e, tab } : e))),
    /** End Session on terminal `tab`. */
    forget: (tab) => save(list().filter((e) => e.tab !== tab)),
  };
}

module.exports = { createCodexTeam, codexArgs, argv, threadOfLog };
