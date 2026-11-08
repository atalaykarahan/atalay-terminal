'use strict';
// The token savers for the AI tools on this PC, as the Mac app's TokenSavers.swift has them: both ship in the app and are
// on from its first launch that has them, without asking; Settings turns each off (and on again).
// - rtk (github.com/rtk-ai/rtk, Apache-2.0) shortens what commands print before Claude Code, Codex or Antigravity reads it:
//   the app's copy goes to %LOCALAPPDATA%\atalay-terminal\bin (an update's installer replaces the app's own folder) and
//   sets itself up as `rtk init` does, a hook in Claude Code, its notes and hook in Codex, and its plugin in Antigravity.
//   Off: `rtk init --uninstall`.
// - caveman (github.com/JuliusBrussee/caveman, MIT) makes Claude Code, Codex and Antigravity answer tersely: its rules at
//   the start of every session and a one-line reminder with every prompt (two hooks in Claude Code's settings that print
//   the app's copies), the rules in Codex's AGENTS.md, and a plugin in Antigravity. Off: the hooks, the rules and the
//   plugin go.
// - agent rules (the app's own, app/Resources/agent-rules) keep multi-agent work to few, short model calls: caveman's way
//   (a SessionStart hook that prints the app's copy, a block in Codex's AGENTS.md, a plugin in Antigravity), but off until
//   the user turns them on.
// One the user set up themselves (their own rtk hook, the caveman plugin or the hooks its installer wires) takes the app's
// place and switches the same way: off takes it out of the tools' settings and keeps it, on puts it back as it was. The
// app keeps it current too: an rtk older than the app's is replaced by it where it lies (rtk has no updater; one a
// package manager keeps, winget's or Scoop's, is theirs), and Claude Code updates the caveman plugin by itself
// (auto-update on for its marketplace, as /plugin's "Enable auto-update" does).
const { execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const KINDS = ['rtk', 'caveman', 'agentRules'];
// On or off as the user left it before the switches could take the user's own (missing: not decided yet).
const KEY = { rtk: 'tokenSavers', caveman: 'tokenSaverCaveman' };
// Now: what the user decided for each, and what of their own the app took out when they turned it off.
const STATE_KEY = 'tokenSaversState';

/**
 * `ownDir`: the app's folder for them; `bundled`: { rtk, caveman, agentRules }, what the app ships (rtk.exe, the caveman
 * and agent-rules folders);
 * `claudeDir`, `codexDir` and `home`: where Claude Code, Codex and Antigravity keep their settings, which rtk reads too.
 * `which(name)`: a program on PATH, for an rtk of the user's own.
 */
function createSavers({ settings, ownDir, bundled, claudeDir, codexDir, home = os.homedir(), which, usable = true }) {
  const binDir = path.join(ownDir, 'bin');
  const ourRtk = path.join(binDir, 'rtk.exe');
  const localRtk = path.join(home, '.local', 'bin', 'rtk.exe');
  const localMark = path.join(binDir, 'local-rtk.sha256');
  const ourCaveman = path.join(ownDir, 'caveman');
  const settingsFile = path.join(claudeDir, 'settings.json');
  const codexHooks = path.join(codexDir, 'hooks.json');
  const geminiDir = path.join(home, '.gemini');
  const agyConfig = path.join(geminiDir, 'config', 'config.json');
  const agyPlugins = path.join(geminiDir, 'config', 'plugins');
  const agyRtkHooks = path.join(agyPlugins, 'rtk', 'hooks.json');
  const agyCaveman = path.join(agyPlugins, 'caveman');
  const codex = () => fs.existsSync(codexDir);
  const agy = () => ['antigravity-cli', 'antigravity', 'antigravity-ide'].some((d) => fs.existsSync(path.join(geminiDir, d)));
  const exists = (p) => !!p && fs.existsSync(p);

  // rtk's hook rewrites `git status` into `rtk git status` and its own hook command is a plain `rtk`, so it has to be on
  // the PATH: the app's terminals have binDir on theirs (terminals.js), and ~/.local/bin gets a copy unless an rtk is
  // there already. Where it's on neither (Claude started elsewhere), the hook does nothing at all and commands run as they
  // are. Claude Code runs hooks with Git Bash, Codex and Antigravity with cmd.exe, so each gets the guard in its own shell.
  const GUARD_MARK = 'atalay-terminal-rtk';
  const guarded = (tool) => `sh -c 'command -v rtk >/dev/null 2>&1 && exec rtk hook ${tool}; cat >/dev/null' ${GUARD_MARK}`;
  const CODEX_GUARD = 'where /q rtk & if errorlevel 1 (more >nul) else (rtk hook codex)';
  const OLD_CODEX_GUARD = 'where /q rtk && rtk hook codex || more >nul';
  const isCodexGuard = (cmd) => cmd === CODEX_GUARD || cmd === OLD_CODEX_GUARD;
  // Antigravity runs a hook as Go does a program, `cmd /c "<command>"` with each double quote in it as \": a command here
  // can't hold one. An `echo {"decision":"allow"}` printed its backslashes too, and that broken JSON blocked every command
  // where rtk isn't on the PATH. Nothing printed lets the command through to Antigravity's own permissions.
  const AGY_GUARD = 'where /q rtk & if errorlevel 1 (more >nul) else (rtk hook antigravity)';
  const cmdWord = (s) => s.replace(/([\s^&()<>|,;=!'])/g, '^$1');
  // What marks the app's caveman hooks and Codex notes, so they come out again and nothing else does.
  const MARK = 'atalay-terminal/caveman/';
  const marked = (cmd, mark) => typeof cmd === 'string' && cmd.replace(/\\/g, '/').includes(mark);
  const hasMark = (cmd) => marked(cmd, MARK);
  const CODEX_START = '<!-- atalay-terminal: caveman -->', CODEX_END = '<!-- /atalay-terminal: caveman -->';
  const ourRules = path.join(ownDir, 'agent-rules');
  const RULES_MARK = 'atalay-terminal/agent-rules/';
  const RULES_START = '<!-- atalay-terminal: agent-rules -->', RULES_END = '<!-- /atalay-terminal: agent-rules -->';
  const AGY_RULES = 'atalay-agent-rules', agyRules = path.join(agyPlugins, AGY_RULES);
  const codexNotes = () => {
    try {
      return fs.readFileSync(path.join(codexDir, 'AGENTS.md'), 'utf8');
    } catch {
      return '';
    }
  };

  const decisionsFile = path.join(ownDir, 'token-savers.json');
  const shipped = (kind) => usable && (kind === 'rtk' ? exists(bundled.rtk) : exists(bundled[kind] && path.join(bundled[kind], 'rules.md')));
  const record = (kind) => ({ ...((readJSON(decisionsFile) || {})[kind] || (settings.get(STATE_KEY) || {})[kind] || {}) });
  const saveRecord = (kind, rec) => {
    const all = { ...(settings.get(STATE_KEY) || {}), ...(readJSON(decisionsFile) || {}), [kind]: rec };
    writeJSON(decisionsFile, all);
    settings.set(STATE_KEY, all);
  };
  // Agent rules have no earlier key: off until the user turns them on.
  const decided = (kind) => (typeof record(kind).on === 'boolean' ? record(kind).on : KEY[kind] ? settings.get(KEY[kind]) : false);
  const available = (kind) => shipped(kind) || !!theirs(kind) || !!record(kind).kept;

  // ---------- JSON settings files ----------
  // Unreadable settings (a stray comma while the user edits them) are left as they are: writing them back would lose
  // the rest of what's in them.
  function readJSON(file) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      return {};
    }
    if (!text.trim()) return {};
    try {
      const j = JSON.parse(text.replace(/^﻿/, ''));
      return j && typeof j === 'object' && !Array.isArray(j) ? j : null;
    } catch {
      return null;
    }
  }
  function writeJSON(file, json) {
    let target = file;
    try {
      target = fs.realpathSync(file);
    } catch {}
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const data = JSON.stringify(json, null, 2) + '\n';
    const tmp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, data);
    try {
      fs.renameSync(tmp, target);
    } catch {
      try {
        fs.unlinkSync(tmp);
      } catch {}
      fs.writeFileSync(target, data);
    }
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

  /** Every hook (its command and where it is) in a settings file: Claude Code's, Codex's or Antigravity's hooks.json. */
  function hooksOf(file, key = 'hooks') {
    const json = readJSON(file) || {};
    const out = [];
    for (const [event, list] of Object.entries(json[key] && typeof json[key] === 'object' ? json[key] : {})) {
      for (const entry of Array.isArray(list) ? list : []) {
        for (const h of (entry && entry.hooks) || []) if (h && typeof h.command === 'string') out.push({ event, entry, hook: h });
      }
    }
    return out;
  }
  // `rtk hook claude` (with or without its path, quoted or not) or the rewrite script older rtks set up; not the app's.
  const words = (cmd) => [...cmd.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2]);
  function isRtkHook(h) {
    const cmd = h.command;
    if (cmd.includes(GUARD_MARK) || isCodexGuard(h.commandWindows) || cmd === AGY_GUARD) return false;
    if (cmd.includes('rtk-rewrite')) return true;
    const w = words(cmd);
    return w.length >= 2 && path.basename(w[0].replace(/\\/g, '/')).replace(/\.exe$/i, '').toLowerCase() === 'rtk' && w[1] === 'hook';
  }
  const isTheirCaveman = (h) => h.command.includes('caveman') && !hasMark(h.command);

  function agyPluginEnabled(name) {
    if (!exists(path.join(agyPlugins, name, 'plugin.json'))) return false;
    const plugins = (readJSON(agyConfig) || {}).plugins;
    const entry = plugins && typeof plugins === 'object' ? plugins[name] : null;
    return !entry || entry.enabled !== false;
  }

  function setAgyPlugin(name, on) {
    if (!exists(path.join(agyPlugins, name, 'plugin.json'))) return false;
    const json = readJSON(agyConfig);
    if (!json) return false;
    const plugins = json.plugins && typeof json.plugins === 'object' && !Array.isArray(json.plugins) ? { ...json.plugins } : {};
    const entry = plugins[name] && typeof plugins[name] === 'object' ? { ...plugins[name] } : {};
    if ((entry.enabled ?? true) === on) return false;
    entry.enabled = on;
    plugins[name] = entry;
    json.plugins = plugins;
    writeJSON(agyConfig, json);
    return true;
  }

  /** What one the user set up themselves runs: their rtk hook's program, the caveman plugin, or "hooks" for the hooks
   *  caveman's installer wires into Claude Code's settings where its plugin wouldn't install. */
  function theirs(kind) {
    if (kind === 'rtk') {
      const claudeOwn = hooksOf(settingsFile).find((x) => isRtkHook(x.hook));
      if (claudeOwn) return words(claudeOwn.hook.command)[0] || 'rtk';
      if (hooksOf(settingsFile).some((x) => x.hook.command.includes(GUARD_MARK))) return null;
      const other = [...hooksOf(codexHooks), ...hooksOf(agyRtkHooks, 'rtk-rewrite')].find((x) => isRtkHook(x.hook));
      return other ? words(other.hook.command)[0] || 'rtk' : null;
    }
    if (kind === 'agentRules') return null;
    const plugins = (readJSON(settingsFile) || {}).enabledPlugins || {};
    const plugin = Object.keys(plugins).find((k) => k.startsWith('caveman@') && plugins[k] === true);
    if (plugin) return plugin;
    return hooksOf(settingsFile).some((x) => isTheirCaveman(x.hook)) ? 'hooks' : null;
  }

  const ourAgyRtk = () => hooksOf(agyRtkHooks, 'rtk-rewrite').some((x) => x.hook.command === AGY_GUARD);

  function ourAgyCaveman() {
    const json = readJSON(path.join(agyCaveman, 'hooks.json')) || {};
    const list = (json.caveman && Array.isArray(json.caveman.PreInvocation) && json.caveman.PreInvocation) || [];
    return list.some((h) => h && hasMark(h.command));
  }

  /** Whether the app's own is set up: its hook in Claude Code's settings, Codex's hooks or Antigravity's plugins. */
  function installed(kind) {
    if (kind === 'rtk') {
      return (
        hooksOf(settingsFile).some((x) => x.hook.command.includes(GUARD_MARK)) ||
        hooksOf(codexHooks).some((x) => isCodexGuard(x.hook.commandWindows)) ||
        (ourAgyRtk() && agyPluginEnabled('rtk')) ||
        (!theirs('rtk') && agyPluginEnabled('rtk'))
      );
    }
    if (kind === 'agentRules') {
      return hooksOf(settingsFile).some((x) => marked(x.hook.command, RULES_MARK)) || codexNotes().includes(RULES_START) || exists(agyRules);
    }
    let codexOn = false;
    try {
      codexOn = fs.readFileSync(path.join(codexDir, 'AGENTS.md'), 'utf8').includes(CODEX_START);
    } catch {}
    return (
      hooksOf(settingsFile).some((x) => hasMark(x.hook.command)) ||
      codexOn ||
      (ourAgyCaveman() && agyPluginEnabled('caveman')) ||
      (!theirs('caveman') && agyPluginEnabled('caveman'))
    );
  }

  /** Whether the app's copy and every installed tool's hook/plugin are current (a tool installed later gets it too). */
  function synced(kind) {
    const mark = { caveman: MARK, agentRules: RULES_MARK }[kind];
    if (!hooksOf(settingsFile).some((x) => (kind === 'rtk' ? x.hook.command.includes(GUARD_MARK) : marked(x.hook.command, mark)))) return false;
    if (kind === 'agentRules') {
      if (!sameFile(path.join(bundled.agentRules, 'rules.md'), path.join(ourRules, 'rules.md'))) return false;
      if (codex() && !codexNotes().includes(RULES_START)) return false;
      return !agy() || (exists(path.join(agyRules, 'plugin.json')) && agyPluginEnabled(AGY_RULES));
    }
    if (kind === 'rtk') {
      if (exists(bundled.rtk) && !sameFile(bundled.rtk, ourRtk)) return false;
      if (exists(bundled.rtk) && (!exists(localRtk) || ourLocalRtk()) && !sameFile(bundled.rtk, localRtk)) return false;
      if (codex() && !hooksOf(codexHooks).some((x) => x.hook.commandWindows === CODEX_GUARD)) return false;
      if (agy() && ((!ourAgyRtk() && !exists(path.join(agyPlugins, 'rtk', 'plugin.json'))) || !agyPluginEnabled('rtk'))) return false;
      return true;
    }
    if (exists(bundled.caveman) && !sameFile(path.join(bundled.caveman, 'rules.md'), path.join(ourCaveman, 'rules.md'))) return false;
    if (codex()) {
      let notes = '';
      try {
        notes = fs.readFileSync(path.join(codexDir, 'AGENTS.md'), 'utf8');
      } catch {}
      if (!notes.includes(CODEX_START)) return false;
    }
    if (agy() && (!exists(agyCaveman) || !agyPluginEnabled('caveman'))) return false;
    return true;
  }

  /** Takes the hooks `match` picks out of a settings file (an entry left with none goes too), and returns them with
   *  where they were, to put back later. */
  function takeOutHooks(file, match, key = 'hooks') {
    const json = exists(file) ? readJSON(file) : null;
    if (!json || !json[key] || typeof json[key] !== 'object') return [];
    const taken = [];
    for (const [event, list] of Object.entries(json[key])) {
      if (!Array.isArray(list)) continue;
      json[key][event] = list
        .map((entry) => {
          if (!entry || !Array.isArray(entry.hooks)) return entry;
          const picked = entry.hooks.filter((h) => h && typeof h.command === 'string' && match(h));
          if (!picked.length) return entry;
          for (const hook of picked) taken.push({ file, key, event, matcher: entry.matcher ?? null, hook });
          const rest = entry.hooks.filter((h) => !picked.includes(h));
          return rest.length ? { ...entry, hooks: rest } : null;
        })
        .filter(Boolean);
      if (!json[key][event].length) delete json[key][event];
    }
    if (!Object.keys(json[key]).length) delete json[key];
    if (taken.length) writeJSON(file, json);
    return taken;
  }

  /** The user's own out of the tools' settings, and what it takes to put it back: their rtk hooks (Claude Code's,
   *  Codex's and Antigravity's), the caveman plugin turned off as `claude plugin disable` leaves it, or its installer's hooks. */
  function takeOut(kind) {
    if (kind === 'rtk') {
      const out = {
        hooks: [
          ...takeOutHooks(settingsFile, isRtkHook),
          ...takeOutHooks(codexHooks, isRtkHook),
          ...takeOutHooks(agyRtkHooks, isRtkHook, 'rtk-rewrite'),
        ],
      };
      if (setAgyPlugin('rtk', false)) out.agyPlugin = 'rtk';
      return out;
    }
    const json = readJSON(settingsFile);
    const plugins = [];
    if (json && json.enabledPlugins) {
      for (const k of Object.keys(json.enabledPlugins)) if (k.startsWith('caveman@') && json.enabledPlugins[k] === true) plugins.push(k);
      for (const k of plugins) json.enabledPlugins[k] = false;
      if (plugins.length) writeJSON(settingsFile, json);
    }
    const out = { plugins, hooks: takeOutHooks(settingsFile, isTheirCaveman) };
    if (!ourAgyCaveman() && setAgyPlugin('caveman', false)) out.agyPlugin = 'caveman';
    return out;
  }

  function putBack(kept) {
    if (typeof kept.agyPlugin === 'string') setAgyPlugin(kept.agyPlugin, true);
    if (Array.isArray(kept.plugins) && kept.plugins.length) {
      const json = readJSON(settingsFile);
      if (json) {
        json.enabledPlugins = { ...(json.enabledPlugins || {}) };
        for (const k of kept.plugins) json.enabledPlugins[k] = true;
        writeJSON(settingsFile, json);
      }
    }
    const byFile = new Map();
    for (const r of Array.isArray(kept.hooks) ? kept.hooks : []) {
      if (!r || !r.file || !r.hook) continue;
      if (!byFile.has(r.file)) byFile.set(r.file, []);
      byFile.get(r.file).push(r);
    }
    for (const [file, taken] of byFile) {
      const json = exists(file) ? readJSON(file) : {};
      if (!json) continue;
      for (const r of taken) {
        const key = r.key || 'hooks';
        json[key] = json[key] && typeof json[key] === 'object' ? json[key] : {};
        const entries = Array.isArray(json[key][r.event]) ? json[key][r.event] : [];
        // Set up again by the user meanwhile: not twice.
        if (entries.some((e) => e && Array.isArray(e.hooks) && e.hooks.some((h) => h && h.command === r.hook.command))) continue;
        entries.push({ ...(r.matcher != null && { matcher: r.matcher }), hooks: [r.hook] });
        json[key][r.event] = entries;
      }
      writeJSON(file, json);
    }
  }

  /** The app's own, beside the user's: only what is the app's goes (rtk's own uninstall would take the user's RTK.md
   *  along). */
  function removeOurs(kind) {
    if (kind === 'caveman') return uninstallCaveman();
    takeOutHooks(settingsFile, (h) => h.command.includes(GUARD_MARK));
    takeOutHooks(codexHooks, (h) => isCodexGuard(h.commandWindows));
    if (ourAgyRtk()) {
      fs.rmSync(path.join(agyPlugins, 'rtk'), { recursive: true, force: true });
    }
    const userBin = rtkBinary(theirs('rtk'));
    if (!userBin || path.resolve(userBin) !== path.resolve(localRtk)) {
      removeLocalRtk();
    }
  }

  /** The rtk binary a user's hook runs: its path, or for a plain `rtk` the first of the places installers put it. */
  function rtkBinary(bin) {
    if (!bin) return null;
    const expanded = bin.startsWith('~/') || bin.startsWith('~\\') ? path.join(home, bin.slice(2)) : bin;
    if (!/^rtk(\.exe)?$/i.test(path.basename(expanded.replace(/\\/g, '/')))) return null;
    if (path.isAbsolute(expanded)) {
      if (exists(expanded)) return expanded;
      if (!/\.exe$/i.test(expanded) && exists(`${expanded}.exe`)) return `${expanded}.exe`;
      return null;
    }
    const found = which && which('rtk');
    if (found && exists(found)) return found;
    const places = [path.join(home, '.local', 'bin', 'rtk.exe'), path.join(home, '.cargo', 'bin', 'rtk.exe')];
    return places.find(exists) || null;
  }

  /** `rtk --version`'s numbers ("rtk 1.1.0"). */
  async function rtkVersion(bin) {
    const m = /^rtk (\d+(?:\.\d+)*)/.exec((await run(['--version'], bin)).trim());
    return m ? m[1].split('.').map(Number) : null;
  }
  const older = (a, b) => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0);
    return false;
  };

  /** The user's own, current: their rtk replaced by the app's newer one where it lies, as rtk's installer updates it
   *  (not one a package manager keeps, nor the app's own); Claude Code updating their caveman plugin. */
  async function keepCurrent(kind, own) {
    if (kind === 'caveman') {
      const at = own.indexOf('@');
      if (at > 0) autoUpdate(own.slice(at + 1));
      return;
    }
    const named = rtkBinary(own);
    if (!named || !exists(bundled.rtk) || path.resolve(named) === path.resolve(ourRtk)) return;
    if (/[\\/](WinGet|scoop|chocolatey)[\\/]/i.test(named) || !/^rtk(\.exe)?$/i.test(path.basename(named))) return;
    // What an earlier update moved aside (it was running, so it couldn't be deleted then) goes now.
    const dir = path.dirname(named), aside = `${path.basename(named)}.old-`;
    try {
      for (const name of fs.readdirSync(dir).filter((n) => n.startsWith(aside))) {
        try {
          fs.unlinkSync(path.join(dir, name));
        } catch {}
      }
    } catch {}
    const [theirsV, oursV] = [await rtkVersion(named), await rtkVersion(bundled.rtk)];
    if (!theirsV || !oursV || !older(theirsV, oursV)) return;
    try {
      // A running one (a hook at work) can't be written over, but it can be moved aside.
      try {
        fs.copyFileSync(bundled.rtk, named);
      } catch {
        fs.renameSync(named, `${named}.old-${Date.now()}`);
        fs.copyFileSync(bundled.rtk, named);
      }
    } catch (e) {
      console.error('savers: rtk update:', e.message);
    }
  }

  /** Claude Code updates a plugin by itself only from a marketplace with auto-update on: Anthropic's own by default,
   *  the rest once /plugin's "Enable auto-update" is chosen. This turns it on for the caveman plugin's, in the user's
   *  settings, where that switch writes it too. One the user turned off stays off. */
  function autoUpdate(name) {
    const known = (readJSON(path.join(claudeDir, 'plugins', 'known_marketplaces.json')) || {})[name];
    if (known && known.autoUpdate !== undefined) return;
    const json = readJSON(settingsFile);
    if (!json || (json.extraKnownMarketplaces !== undefined && (typeof json.extraKnownMarketplaces !== 'object' || Array.isArray(json.extraKnownMarketplaces)))) return;
    const all = { ...(json.extraKnownMarketplaces || {}) };
    const entry = { ...(all[name] || {}) };
    if (entry.source === undefined) {
      // Recorded only by Claude Code (an older install): declared here too, from the same source.
      if (!known || known.source === undefined) return;
      entry.source = known.source;
    }
    if (entry.autoUpdate !== undefined) return;
    entry.autoUpdate = true;
    all[name] = entry;
    json.extraKnownMarketplaces = all;
    writeJSON(settingsFile, json);
  }

  // ---------- rtk ----------
  function run(args, bin = ourRtk) {
    return new Promise((resolve) => {
      const child = execFile(
        bin,
        args,
        {
          windowsHide: true,
          timeout: 30_000,
          maxBuffer: 4 << 20,
          env: { ...process.env, CLAUDE_CONFIG_DIR: claudeDir, CODEX_HOME: codexDir, HOME: home, USERPROFILE: home },
        },
        (err, stdout) => resolve(err && !stdout ? '' : String(stdout || '')),
      );
      // Its stdin closed, so a prompt can't hold it for those 30 seconds (execFile takes no `stdio`: it always opens pipes).
      child.stdin.on('error', () => {});
      child.stdin.end();
    });
  }

  const fileHash = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

  const sameFile = (a, b) => {
    try {
      if (fs.statSync(a).size !== fs.statSync(b).size) return false;
      return fileHash(a) === fileHash(b);
    } catch {
      return false;
    }
  };

  /** Whether ~/.local/bin/rtk.exe is the copy the app placed there (tracked by its SHA-256 in localMark, or matching ourRtk). */
  function ourLocalRtk() {
    if (!exists(localRtk)) return false;
    try {
      const mark = fs.readFileSync(localMark, 'utf8').trim();
      if (mark) return fileHash(localRtk) === mark;
    } catch {}
    return exists(ourRtk) && sameFile(localRtk, ourRtk);
  }

  function removeLocalRtk() {
    if (ourLocalRtk()) {
      try {
        fs.unlinkSync(localRtk);
      } catch {}
    }
    try {
      fs.unlinkSync(localMark);
    } catch {}
  }

  /** The app's rtk in its own folder (and ~/.local/bin unless another rtk is there): a running one can be moved aside. */
  function placeRtk() {
    fs.mkdirSync(binDir, { recursive: true });
    for (const f of fs.readdirSync(binDir)) if (/^rtk\.exe\.old-/.test(f)) fs.rm(path.join(binDir, f), { force: true }, () => {});
    const updateLocal = !exists(localRtk) || ourLocalRtk();
    if (!sameFile(bundled.rtk, ourRtk)) {
      try {
        fs.copyFileSync(bundled.rtk, ourRtk);
      } catch {
        fs.renameSync(ourRtk, `${ourRtk}.old-${Date.now()}`);
        fs.copyFileSync(bundled.rtk, ourRtk);
      }
      const licence = path.join(path.dirname(bundled.rtk), 'rtk-LICENSE');
      if (exists(licence)) fs.copyFileSync(licence, path.join(binDir, 'rtk-LICENSE'));
    }
    if (updateLocal) {
      try {
        const localDir = path.dirname(localRtk);
        fs.mkdirSync(localDir, { recursive: true });
        for (const f of fs.readdirSync(localDir)) if (/^rtk\.exe\.old-/.test(f)) fs.rm(path.join(localDir, f), { force: true }, () => {});
        if (!sameFile(ourRtk, localRtk)) {
          try {
            fs.copyFileSync(ourRtk, localRtk);
          } catch {
            fs.renameSync(localRtk, `${localRtk}.old-${Date.now()}`);
            fs.copyFileSync(ourRtk, localRtk);
          }
        }
        fs.writeFileSync(localMark, fileHash(localRtk) + '\n');
      } catch {}
    }
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

  /** rtk's hooks in Claude Code's settings, Codex's hooks.json and Antigravity's rtk plugin, guarded (`guarding`) or plain again. */
  function rewriteRtkHooks(guarding) {
    editSettings((hooks) => (guarding ? rewrite(hooks, 'rtk hook claude', guarded('claude')) : rewrite(hooks, guarded('claude'), 'rtk hook claude')));
    const codexJson = exists(codexHooks) ? readJSON(codexHooks) : null;
    if (codexJson && codexJson.hooks && typeof codexJson.hooks === 'object') {
      const was = JSON.stringify(codexJson);
      for (const list of Object.values(codexJson.hooks)) {
        for (const entry of Array.isArray(list) ? list : []) {
          for (const h of (entry && entry.hooks) || []) {
            if (!h || h.command !== 'rtk hook codex') continue;
            if (guarding) h.commandWindows = CODEX_GUARD;
            else if (isCodexGuard(h.commandWindows)) delete h.commandWindows;
          }
        }
      }
      if (JSON.stringify(codexJson) !== was) writeJSON(codexHooks, codexJson);
    }
    const agyJson = exists(agyRtkHooks) ? readJSON(agyRtkHooks) : null;
    if (agyJson && agyJson['rtk-rewrite'] && typeof agyJson['rtk-rewrite'] === 'object') {
      const was = JSON.stringify(agyJson);
      rewrite(agyJson['rtk-rewrite'], guarding ? 'rtk hook antigravity' : AGY_GUARD, guarding ? AGY_GUARD : 'rtk hook antigravity');
      if (JSON.stringify(agyJson) !== was) writeJSON(agyRtkHooks, agyJson);
    }
  }

  async function installRtk() {
    if (!exists(bundled.rtk)) return;
    placeRtk();
    // rtk knows its hook only as it writes it: plain while it looks, or it puts a second one in.
    rewriteRtkHooks(false);
    await run(['init', '-g', '--auto-patch']);
    if (codex()) await run(['init', '-g', '--codex']);
    if (agy()) {
      if (!exists(path.join(agyPlugins, 'rtk', 'plugin.json')) || ourAgyRtk()) {
        await run(['init', '-g', '--agent', 'antigravity']);
      }
      setAgyPlugin('rtk', true);
    }
    rewriteRtkHooks(true);
  }

  async function uninstallRtk() {
    if (!exists(ourRtk)) return removeOurs('rtk');
    const hadOurAgy = ourAgyRtk();
    // rtk takes out the hooks it knows, the plain ones.
    rewriteRtkHooks(false);
    await run(['init', '-g', '--uninstall']);
    if (codex()) await run(['init', '-g', '--codex', '--uninstall']);
    if (hadOurAgy) await run(['init', '-g', '--agent', 'antigravity', '--uninstall']);
    removeLocalRtk();
  }

  // ---------- caveman ----------
  // Git Bash reads a Windows path with forward slashes as it is; single quotes keep spaces and the like in one word.
  const shellQuote = (s) => `'${s.replace(/\\/g, '/').replace(/'/g, `'\\''`)}'`;

  function addHook(hooks, event, command, mark = MARK) {
    removeHook(hooks, event, mark);
    hooks[event] = [...(Array.isArray(hooks[event]) ? hooks[event] : []), { hooks: [{ type: 'command', command, timeout: 5 }] }];
  }
  /** Takes the app's caveman (or `mark`'s) hook out of an event, and the entry with it when nothing else is left in it. */
  function removeHook(hooks, event, mark = MARK) {
    if (!Array.isArray(hooks[event])) return;
    const list = hooks[event]
      .map((entry) => {
        if (!entry || !Array.isArray(entry.hooks)) return entry;
        const kept = entry.hooks.filter((h) => !(h && marked(h.command, mark)));
        return kept.length ? { ...entry, hooks: kept } : null;
      })
      .filter(Boolean);
    if (list.length) hooks[event] = list;
    else delete hooks[event];
  }

  /** Codex's AGENTS.md without the app's caveman notes (or those between `start` and `end`), then `change` (which may put
   *  them back). */
  function editCodexNotes(change, start = CODEX_START, end = CODEX_END) {
    const file = path.join(codexDir, 'AGENTS.md');
    let old = '';
    try {
      old = fs.readFileSync(file, 'utf8');
    } catch {}
    let text = old;
    const a = text.indexOf(start), b = a >= 0 ? text.indexOf(end, a) : -1;
    if (a >= 0 && b >= 0) {
      // The notes go with the line break put before them and the one after.
      let lo = a, hi = b + end.length;
      if (lo > 0 && text[lo - 1] === '\n') lo--;
      if (lo > 0 && text[lo - 1] === '\r') lo--;
      if (text[hi] === '\r') hi++;
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

  /** Antigravity's caveman plugin: its rules at the start of every session, its skill, and the one-line reminder before
   *  every prompt (`PreInvocation`, run via `cmd /c`). One the user installed themselves stays theirs. */
  function installAgyCaveman(text, remind) {
    if (exists(agyCaveman) && !ourAgyCaveman()) {
      setAgyPlugin('caveman', true);
      return;
    }
    const agyRemind = path.join(ourCaveman, 'agy-remind.json');
    const prompt = ((readJSON(remind) || {}).hookSpecificOutput || {}).additionalContext;
    if (prompt) fs.writeFileSync(agyRemind, JSON.stringify({ injectSteps: [{ ephemeralMessage: prompt }] }) + '\n');
    const rulesDir = path.join(agyCaveman, 'rules');
    const skillDir = path.join(agyCaveman, 'skills', 'caveman');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.mkdirSync(skillDir, { recursive: true });
    const desc = 'Terse caveman responses that cut output tokens while keeping full technical accuracy.';
    writeJSON(path.join(agyCaveman, 'plugin.json'), {
      name: 'caveman',
      version: '1.0.0',
      description: desc,
      repository: 'https://github.com/JuliusBrussee/caveman',
    });
    fs.writeFileSync(path.join(rulesDir, 'AGENTS.md'), `${CODEX_START}\n${text}\n${CODEX_END}\n`);
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `---\nname: caveman\ndescription: ${desc}\n---\n\n${text}\n`);
    writeJSON(path.join(agyCaveman, 'hooks.json'), {
      caveman: {
        // No quotes around the path (AGY_GUARD says why): its spaces escaped, read by `more`, as `type` won't take those.
        PreInvocation: [{ type: 'command', command: `more < ${cmdWord(agyRemind)}`, timeout: 5 }],
      },
    });
    setAgyPlugin('caveman', true);
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
    const text = fs.readFileSync(rules, 'utf8').trim();
    if (codex()) {
      const block = `${CODEX_START}\n${text}\n${CODEX_END}\n`;
      editCodexNotes((notes) => `${notes}\n${block}`);
    }
    if (agy()) installAgyCaveman(text, remind);
  }

  function uninstallCaveman() {
    editSettings((hooks) => {
      for (const event of ['SessionStart', 'UserPromptSubmit']) removeHook(hooks, event);
    });
    editCodexNotes((notes) => notes);
    if (ourAgyCaveman()) fs.rmSync(agyCaveman, { recursive: true, force: true });
    fs.rmSync(ourCaveman, { recursive: true, force: true });
  }

  // ---------- agent rules ----------
  function installAgentRules() {
    if (!exists(bundled.agentRules)) return;
    fs.mkdirSync(ourRules, { recursive: true });
    const rules = path.join(ourRules, 'rules.md');
    fs.copyFileSync(path.join(bundled.agentRules, 'rules.md'), rules);
    editSettings((hooks) => addHook(hooks, 'SessionStart', `cat ${shellQuote(rules)}`, RULES_MARK));
    const block = `${RULES_START}\n${fs.readFileSync(rules, 'utf8').trim()}\n${RULES_END}\n`;
    if (codex()) editCodexNotes((notes) => `${notes}\n${block}`, RULES_START, RULES_END);
    if (agy()) {
      // As the app's caveman plugin, rules only: no skill, no reminder.
      fs.mkdirSync(path.join(agyRules, 'rules'), { recursive: true });
      writeJSON(path.join(agyRules, 'plugin.json'), { name: AGY_RULES, version: '1.0.0', description: "Atalay's Terminal's agent token rules." });
      fs.writeFileSync(path.join(agyRules, 'rules', 'AGENTS.md'), block);
      setAgyPlugin(AGY_RULES, true);
    }
  }

  function uninstallAgentRules() {
    editSettings((hooks) => removeHook(hooks, 'SessionStart', RULES_MARK));
    editCodexNotes((notes) => notes, RULES_START, RULES_END);
    fs.rmSync(agyRules, { recursive: true, force: true });
    fs.rmSync(ourRules, { recursive: true, force: true });
  }
  const INSTALL = { rtk: installRtk, caveman: installCaveman, agentRules: installAgentRules };
  const UNINSTALL = { rtk: uninstallRtk, caveman: uninstallCaveman, agentRules: uninstallAgentRules };

  // ---------- the switches ----------
  // One at a time: two quick clicks would otherwise write the same settings at once.
  let queue = Promise.resolve();
  const serial = (fn) => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => {});
    return next;
  };

  async function turn(kind, on) {
    const rec = record(kind);
    rec.on = !!on;
    try {
      if (on) {
        // The user's own goes back as it was; without one, the app's.
        if (rec.kept) {
          putBack(rec.kept);
          delete rec.kept;
        }
        const own = theirs(kind);
        if (own) await keepCurrent(kind, own);
        else if (!synced(kind)) await INSTALL[kind]();
      } else if (theirs(kind)) {
        rec.kept = takeOut(kind);
        if (installed(kind)) removeOurs(kind);
      } else if (installed(kind)) {
        if (kind === 'rtk' && !ourAgyRtk() && setAgyPlugin('rtk', false)) {
          rec.kept = { agyPlugin: 'rtk' };
        } else if (kind === 'caveman' && !ourAgyCaveman() && setAgyPlugin('caveman', false)) {
          rec.kept = { agyPlugin: 'caveman' };
        }
        await UNINSTALL[kind]();
      }
    } catch (e) {
      console.error(`savers: ${kind} ${on ? 'on' : 'off'}:`, e.message);
    }
    saveRecord(kind, rec);
  }

  /** Settings' switches: the choice is kept, then the tools' settings follow. */
  function set(kind, on) {
    return serial(() => turn(kind, on));
  }

  /** For Settings: each saver's state, and what rtk saved so far (its `gain`). */
  function state() {
    return serial(async () => {
      const out = {};
      for (const kind of KINDS) {
        const own = theirs(kind);
        const on = !!own || installed(kind);
        const s = { available: available(kind), on };
        if (kind === 'rtk' && on) {
          const bin = (own && rtkBinary(own)) || (exists(ourRtk) ? ourRtk : null);
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
    /** At a launch: each saver on unless the user turned it off. The user's own is kept current, and the app's goes out
     *  of its way (both would run). */
    autoStart() {
      return serial(async () => {
        for (const kind of KINDS) {
          if (!available(kind)) continue;
          const own = theirs(kind);
          if (own) {
            try {
              await keepCurrent(kind, own);
              if (installed(kind)) removeOurs(kind);
            } catch (e) {
              console.error(`savers: ${kind}:`, e.message);
            }
          } else if (decided(kind) !== false && !synced(kind)) {
            await turn(kind, true);
          }
        }
      });
    },
    known: (kind) => KINDS.includes(kind),
  };
}

module.exports = { createSavers };
