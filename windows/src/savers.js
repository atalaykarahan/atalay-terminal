'use strict';
// The token savers for the AI tools on this PC, as the Mac app's TokenSavers.swift has them: both ship in the app and are
// on from its first launch that has them, without asking; Settings turns each off (and on again).
// - rtk (github.com/rtk-ai/rtk, Apache-2.0) shortens what commands print before Claude Code or Codex reads it: the app's
//   copy goes to %LOCALAPPDATA%\atalay-terminal\bin (an update's installer replaces the app's own folder) and sets itself
//   up as `rtk init` does, a hook in Claude Code and its notes and hook in Codex. Off: `rtk init --uninstall`.
// - caveman (github.com/JuliusBrussee/caveman, MIT) makes Claude Code and Codex answer tersely: its rules at the start of
//   every session and a one-line reminder with every prompt (two hooks in Claude Code's settings that print the app's
//   copies), and the rules in Codex's AGENTS.md. Off: the hooks and the rules go.
// One the user set up themselves (their own rtk hook, the caveman plugin) is theirs: the app leaves it alone and only
// shows it.
const { execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KINDS = ['rtk', 'caveman'];
// On or off as the user left it; missing: not decided yet (the first launch that has it turns it on).
const KEY = { rtk: 'tokenSavers', caveman: 'tokenSaverCaveman' };

/**
 * `ownDir`: the app's folder for them; `bundled`: { rtk, caveman }, what the app ships (rtk.exe, the caveman folder);
 * `claudeDir` and `codexDir`: where Claude Code and Codex keep their settings (CLAUDE_CONFIG_DIR, CODEX_HOME), which rtk
 * reads too. `which(name)`: a program on PATH, for an rtk of the user's own.
 */
function createSavers({ settings, ownDir, bundled, claudeDir, codexDir, which, usable = true }) {
  const binDir = path.join(ownDir, 'bin');
  const ourRtk = path.join(binDir, 'rtk.exe');
  const ourCaveman = path.join(ownDir, 'caveman');
  const settingsFile = path.join(claudeDir, 'settings.json');
  const codex = () => fs.existsSync(codexDir);
  const exists = (p) => !!p && fs.existsSync(p);

  // rtk's hook rewrites `git status` into `rtk git status` and its own hook command is a plain `rtk`, so it has to be on
  // the PATH: the app's terminals have binDir on theirs (terminals.js). Where it isn't (Claude started elsewhere), the
  // hook does nothing at all and commands run as they are. Claude Code runs hooks with Git Bash, Codex with cmd.exe (its
  // `commandWindows`, which it takes over `command` on Windows), so each gets the guard in its own shell.
  const GUARD_MARK = 'atalay-terminal-rtk';
  const guarded = (tool) => `sh -c 'command -v rtk >/dev/null 2>&1 && exec rtk hook ${tool}; cat >/dev/null' ${GUARD_MARK}`;
  const CODEX_GUARD = 'where /q rtk && rtk hook codex || more >nul';
  // What marks the app's caveman hooks and Codex notes, so they come out again and nothing else does.
  const MARK = 'atalay-terminal/caveman/';
  const CODEX_START = '<!-- atalay-terminal: caveman -->', CODEX_END = '<!-- /atalay-terminal: caveman -->';

  const shipped = (kind) => usable && (kind === 'rtk' ? exists(bundled.rtk) : exists(bundled.caveman && path.join(bundled.caveman, 'rules.md')));
  const available = (kind) => shipped(kind) || !!theirs(kind);

  // ---------- Claude Code's settings ----------
  // Unreadable settings (a stray comma while the user edits them) are left as they are: writing them back would lose
  // the rest of what's in them.
  function readJSON(file) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      return {};
    }
    try {
      const j = JSON.parse(text.replace(/^﻿/, ''));
      return j && typeof j === 'object' && !Array.isArray(j) ? j : null;
    } catch {
      return null;
    }
  }
  function writeJSON(file, json) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(json, null, 2) + '\n');
    fs.renameSync(tmp, file);
  }
  /** Claude Code's settings with their hooks changed, the rest as they were (and the file untouched when nothing is). */
  function editSettings(change) {
    const json = readJSON(settingsFile);
    if (!json) return;
    const was = JSON.stringify(json);
    const hooks = json.hooks && typeof json.hooks === 'object' ? json.hooks : {};
    change(hooks);
    if (Object.keys(hooks).length) json.hooks = hooks;
    else delete json.hooks;
    if (JSON.stringify(json) !== was) writeJSON(settingsFile, json);
  }

  /** What one the user set up themselves runs: their rtk hook's program, or the caveman plugin. */
  function theirs(kind) {
    const json = readJSON(settingsFile) || {};
    if (kind === 'rtk') {
      for (const entry of (json.hooks && json.hooks.PreToolUse) || []) {
        for (const hook of (entry && entry.hooks) || []) {
          const cmd = hook && typeof hook.command === 'string' ? hook.command : '';
          if (cmd.includes('rtk') && cmd.includes(' hook ') && !cmd.includes(GUARD_MARK)) return cmd.split(' ')[0] || 'rtk';
        }
      }
      return null;
    }
    const plugins = json.enabledPlugins || {};
    return Object.keys(plugins).find((k) => k.startsWith('caveman@') && plugins[k] === true) || null;
  }

  // ---------- rtk ----------
  function run(args, bin = ourRtk) {
    return new Promise((resolve) => {
      execFile(bin, args, { windowsHide: true, timeout: 30_000, maxBuffer: 4 << 20 }, (err, stdout) => resolve(err && !stdout ? '' : String(stdout || '')));
    });
  }

  const sameFile = (a, b) => {
    try {
      if (fs.statSync(a).size !== fs.statSync(b).size) return false;
      const hash = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
      return hash(a) === hash(b);
    } catch {
      return false;
    }
  };

  /** The app's rtk in its own folder: a running one (a hook at work) can't be written over, but it can be moved aside. */
  function placeRtk() {
    fs.mkdirSync(binDir, { recursive: true });
    for (const f of fs.readdirSync(binDir)) if (/^rtk\.exe\.old-/.test(f)) fs.rm(path.join(binDir, f), { force: true }, () => {});
    if (sameFile(bundled.rtk, ourRtk)) return;
    try {
      fs.copyFileSync(bundled.rtk, ourRtk);
    } catch {
      fs.renameSync(ourRtk, `${ourRtk}.old-${Date.now()}`);
      fs.copyFileSync(bundled.rtk, ourRtk);
    }
    const licence = path.join(path.dirname(bundled.rtk), 'rtk-LICENSE');
    if (exists(licence)) fs.copyFileSync(licence, path.join(binDir, 'rtk-LICENSE'));
  }

  /** Every hook command `from` in every event becomes `to`; the same hook twice in one event goes once. */
  function rewrite(hooks, from, to) {
    for (const [event, list] of Object.entries(hooks)) {
      if (!Array.isArray(list)) continue;
      const seen = new Set();
      hooks[event] = list
        .map((entry) => {
          if (!entry || !Array.isArray(entry.hooks)) return entry;
          const kept = entry.hooks.map((h) => (h && h.command === from ? { ...h, command: to } : h)).filter((h) => {
            // Only the app's own hook is taken out when it's there twice (rtk adds its plain one again beside it).
            if (!h || h.command !== to) return true;
            const k = `${entry.matcher || ''}\n${to}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          return kept.length ? { ...entry, hooks: kept } : null;
        })
        .filter(Boolean);
      if (!hooks[event].length) delete hooks[event];
    }
  }

  /** rtk's hooks in Claude Code's settings and Codex's hooks.json, guarded (`guarding`) or plain again. */
  function rewriteRtkHooks(guarding) {
    editSettings((hooks) => (guarding ? rewrite(hooks, 'rtk hook claude', guarded('claude')) : rewrite(hooks, guarded('claude'), 'rtk hook claude')));
    const file = path.join(codexDir, 'hooks.json');
    const json = exists(file) ? readJSON(file) : null;
    if (!json || !json.hooks || typeof json.hooks !== 'object') return;
    const was = JSON.stringify(json);
    for (const list of Object.values(json.hooks)) {
      for (const entry of Array.isArray(list) ? list : []) {
        for (const h of (entry && entry.hooks) || []) {
          if (!h || h.command !== 'rtk hook codex') continue;
          if (guarding) h.commandWindows = CODEX_GUARD;
          else if (h.commandWindows === CODEX_GUARD) delete h.commandWindows;
        }
      }
    }
    if (JSON.stringify(json) !== was) writeJSON(file, json);
  }

  async function installRtk() {
    if (!exists(bundled.rtk)) return;
    placeRtk();
    // rtk knows its hook only as it writes it: plain while it looks, or it puts a second one in.
    rewriteRtkHooks(false);
    await run(['init', '-g', '--auto-patch']);
    if (codex()) await run(['init', '-g', '--codex']);
    rewriteRtkHooks(true);
  }

  async function uninstallRtk() {
    if (!exists(ourRtk)) return;
    // rtk takes out the hooks it knows, the plain ones.
    rewriteRtkHooks(false);
    await run(['init', '-g', '--uninstall']);
    if (codex()) await run(['init', '-g', '--codex', '--uninstall']);
  }

  // ---------- caveman ----------
  // Git Bash reads a Windows path with forward slashes as it is; single quotes keep spaces and the like in one word.
  const shellQuote = (s) => `'${s.replace(/\\/g, '/').replace(/'/g, `'\\''`)}'`;

  function addHook(hooks, event, command) {
    removeHook(hooks, event);
    hooks[event] = [...(Array.isArray(hooks[event]) ? hooks[event] : []), { hooks: [{ type: 'command', command, timeout: 5 }] }];
  }
  /** Takes the app's caveman hook out of an event, and the entry with it when nothing else is left in it. */
  function removeHook(hooks, event) {
    if (!Array.isArray(hooks[event])) return;
    const list = hooks[event]
      .map((entry) => {
        if (!entry || !Array.isArray(entry.hooks)) return entry;
        const kept = entry.hooks.filter((h) => !(h && typeof h.command === 'string' && h.command.includes(MARK)));
        return kept.length ? { ...entry, hooks: kept } : null;
      })
      .filter(Boolean);
    if (list.length) hooks[event] = list;
    else delete hooks[event];
  }

  /** Codex's AGENTS.md without the app's caveman notes, then `change` (which may put them back). */
  function editCodexNotes(change) {
    const file = path.join(codexDir, 'AGENTS.md');
    let old = '';
    try {
      old = fs.readFileSync(file, 'utf8');
    } catch {}
    let text = old;
    const a = text.indexOf(CODEX_START), b = a >= 0 ? text.indexOf(CODEX_END, a) : -1;
    if (a >= 0 && b >= 0) {
      // The notes go with the line break put before them and the one after.
      let lo = a, hi = b + CODEX_END.length;
      if (lo > 0 && text[lo - 1] === '\n') lo--;
      if (text[hi] === '\n') hi++;
      text = text.slice(0, lo) + text.slice(hi);
    }
    const next = change(text);
    if (next === old) return;
    // A file only the app's notes were in goes with them.
    if (!next.trim()) return fs.rmSync(file, { force: true });
    fs.mkdirSync(codexDir, { recursive: true });
    fs.writeFileSync(file, next);
  }

  function installCaveman() {
    if (!exists(bundled.caveman)) return;
    fs.mkdirSync(ourCaveman, { recursive: true });
    for (const name of ['rules.md', 'remind.json', 'LICENSE']) fs.copyFileSync(path.join(bundled.caveman, name), path.join(ourCaveman, name));
    const rules = path.join(ourCaveman, 'rules.md'), remind = path.join(ourCaveman, 'remind.json');
    editSettings((hooks) => {
      addHook(hooks, 'SessionStart', `cat ${shellQuote(rules)}`);
      addHook(hooks, 'UserPromptSubmit', `cat ${shellQuote(remind)}`);
    });
    if (codex()) {
      const block = `${CODEX_START}\n${fs.readFileSync(rules, 'utf8').trim()}\n${CODEX_END}\n`;
      editCodexNotes((notes) => `${notes}\n${block}`);
    }
  }

  function uninstallCaveman() {
    editSettings((hooks) => {
      for (const event of ['SessionStart', 'UserPromptSubmit']) removeHook(hooks, event);
    });
    editCodexNotes((notes) => notes);
    fs.rmSync(ourCaveman, { recursive: true, force: true });
  }

  // ---------- the switches ----------
  // One at a time: two quick clicks would otherwise write the same settings at once.
  let queue = Promise.resolve();
  const serial = (fn) => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => {});
    return next;
  };

  /** Settings' switches: the choice is kept, then the tools' settings follow. */
  function set(kind, on) {
    settings.set(KEY[kind], !!on);
    return serial(async () => {
      if (theirs(kind)) return;
      try {
        if (kind === 'rtk') await (on ? installRtk() : uninstallRtk());
        else on ? installCaveman() : uninstallCaveman();
      } catch (e) {
        console.error(`savers: ${kind} ${on ? 'on' : 'off'}:`, e.message);
      }
    });
  }

  /** For Settings: each saver's state, and what rtk saved so far (its `gain`). */
  function state() {
    return serial(async () => {
      const out = {};
      for (const kind of KINDS) {
        const own = theirs(kind);
        const on = !!own || settings.get(KEY[kind]) === true;
        const s = { available: available(kind), on, theirs: !!own };
        if (kind === 'rtk' && on) {
          const bin = own ? (exists(own) ? own : which('rtk')) : exists(ourRtk) ? ourRtk : null;
          try {
            const sum = bin && JSON.parse(await run(['gain', '--format', 'json'], bin)).summary;
            if (sum) Object.assign(s, { saved: sum.total_saved, pct: sum.avg_savings_pct, commands: sum.total_commands });
          } catch {}
        }
        out[kind] = s;
      }
      return out;
    });
  }

  return {
    binDir,
    state,
    set,
    /** Turns on, at a launch, the savers this build has that were never decided: off only when the user turns it off. */
    autoStart() {
      // One of the user's own stays undecided: if it goes one day, the app's comes on at the next launch.
      for (const kind of KINDS) if (settings.get(KEY[kind]) === undefined && available(kind) && !theirs(kind)) set(kind, true);
    },
    known: (kind) => KINDS.includes(kind),
  };
}

module.exports = { createSavers };
