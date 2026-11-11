'use strict';
// Codex's approval prompts for the dashboard, as exact as Claude Code's own status (the Mac's CodexHooks.swift): Codex
// runs our script on its hooks (~/.codex/hooks.json, https://developers.openai.com/codex/hooks). A PermissionRequest
// (Codex is about to ask the user to approve a command; it doesn't run for commands that need no approval) is kept by
// Codex session in `dir`; that session's next tool output, stop, interrupt or prompt drops it. The script decides
// nothing, so Codex asks as usual. Codex runs a new hook only once the user trusts it in its `/hooks`.
//
// Codex runs a hook with its shell, PowerShell on Windows (`powershell -NoProfile -Command "<command>"`; pwsh when it's
// installed, cmd.exe /C without either), so a command here is a plain program with its arguments, which reads the same
// in all of them. There's no /bin/sh and node isn't on every PC that has Codex, so the script is PowerShell's (~150 ms
// to start, which Codex waits for only before it asks). The hooks that only drop a request start it only while one
// waits: cmd's `if exist` costs next to nothing, and PostToolUse runs after every tool call.
const fs = require('fs');
const path = require('path');

let sqlite = null;
try {
  sqlite = require('node:sqlite');
} catch {}

const SCRIPT = `# Atalay's Terminal: Codex runs this on its hooks (~/.codex/hooks.json), the event's JSON on stdin. A PermissionRequest
# (Codex is about to ask you to approve a command) is kept for the dashboard; the same session's next tool output, stop,
# interrupt or prompt drops it. It prints nothing: Codex decides nothing differently and asks as usual.
$ErrorActionPreference = 'SilentlyContinue'
$dir = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'codex-waiting'
# The JSON's own bytes (UTF-8), not the console code page's reading of them.
$buf = New-Object IO.MemoryStream
[Console]::OpenStandardInput().CopyTo($buf)
$bytes = $buf.ToArray()
$m = [regex]::Match([Text.Encoding]::UTF8.GetString($bytes), '"session_id"\\s*:\\s*"([A-Za-z0-9._-]+)"')
if (-not $m.Success) { exit 0 }
$sid = $m.Groups[1].Value
$file = Join-Path $dir ($sid + '.json')
if ($args[0] -eq 'PermissionRequest') {
  [void][IO.Directory]::CreateDirectory($dir)
  $tmp = Join-Path $dir ('.' + $sid + '.' + $PID)
  [IO.File]::WriteAllBytes($tmp, $bytes)
  Move-Item -Force -LiteralPath $tmp -Destination $file
} else {
  Remove-Item -Force -LiteralPath $file
}
exit 0
`;

// The hooks it takes: PermissionRequest keeps a request (Codex waits for it, a moment), the others answer it (in the
// background, Codex doesn't wait for them). Interrupt's can't be (Codex's rule: 1 s, at most 3): 3 here, as PowerShell can
// take over a second to start on a busy PC, and it only starts while a request waits.
const EVENTS = [
  { name: 'PermissionRequest', background: false, timeout: 5 },
  { name: 'PostToolUse', background: true, timeout: 5 },
  { name: 'Stop', background: true, timeout: 5 },
  { name: 'Interrupt', background: false, timeout: 3 },
  { name: 'UserPromptSubmit', background: true, timeout: 5 },
];

/**
 * createCodexHooks({ ownDir, codexDir }): `ownDir` is the app's folder in %LOCALAPPDATA% (the same for every build and
 * profile, so all of them read the same requests), `codexDir` Codex's (CODEX_HOME or ~/.codex).
 */
function createCodexHooks({ ownDir, codexDir }) {
  const dir = path.join(ownDir, 'codex-waiting');
  const scriptFile = path.join(ownDir, 'codex-hook.ps1');
  const hooksFile = path.join(codexDir, 'hooks.json');
  const logDatabase = path.join(codexDir, 'logs_2.sqlite');
  const run = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptFile}"`;
  const command = (event) => (event === 'PermissionRequest' ? `${run} ${event}` : `cmd.exe /d /c if exist "${path.join(dir, '*.json')}" ${run} ${event}`);
  // One of the app's hooks, as this version writes it or as an earlier one did.
  const ours = (cmd) => typeof cmd === 'string' && cmd.toLowerCase().includes(scriptFile.toLowerCase());

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

  function writeFile(file, data) {
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, data);
    try {
      fs.renameSync(tmp, file);
    } catch {
      try {
        fs.unlinkSync(tmp);
      } catch {}
      fs.writeFileSync(file, data);
    }
  }

  return {
    dir,
    logDatabase,

    /**
     * Writes the script and adds its hooks to Codex's hooks.json, next to the user's own; once there, nothing changes (a
     * changed hook would need trusting again), and one an earlier version wrote differently gives way to this one's. A
     * hooks.json that doesn't read as JSON is left alone; without Codex, nothing. Never throws.
     */
    install() {
      try {
        if (!fs.existsSync(codexDir)) return;
        fs.mkdirSync(dir, { recursive: true });
        let have = null;
        try {
          have = fs.readFileSync(scriptFile, 'utf8');
        } catch {}
        if (have !== SCRIPT) writeFile(scriptFile, SCRIPT);
        const root = readJSON(hooksFile);
        if (!root) return;
        const hooks = root.hooks && typeof root.hooks === 'object' && !Array.isArray(root.hooks) ? root.hooks : {};
        let changed = false;
        for (const { name, background, timeout } of EVENTS) {
          const cmd = command(name);
          let groups = Array.isArray(hooks[name]) ? hooks[name] : [];
          // An earlier version's own hook for this event, written differently: out, with its group if nothing's left.
          const stale = (h) => h && ours(h.command) && h.command !== cmd;
          if (groups.some((g) => g && Array.isArray(g.hooks) && g.hooks.some(stale))) {
            groups = groups
              .map((g) => (g && Array.isArray(g.hooks) ? { ...g, hooks: g.hooks.filter((h) => !stale(h)) } : g))
              .filter((g) => !(g && Array.isArray(g.hooks) && !g.hooks.length));
            hooks[name] = groups;
            changed = true;
          }
          if (groups.some((g) => g && Array.isArray(g.hooks) && g.hooks.some((h) => h && h.command === cmd))) continue;
          groups.push({ hooks: [{ type: 'command', command: cmd, timeout, ...(background ? { async: true } : {}) }] });
          hooks[name] = groups;
          changed = true;
        }
        if (!changed) return;
        root.hooks = hooks;
        let target = hooksFile;
        try {
          target = fs.realpathSync(hooksFile);
        } catch {}
        writeFile(target, JSON.stringify(root, null, 2) + '\n');
      } catch (e) {
        console.error('codex hooks:', e.message);
      }
    },

    /**
     * What waits for the user's approval now, by Codex session id: the command (or Codex's reason, or the tool) and since
     * when (ms). One a day old was left by a Codex that quit while asking, and goes.
     */
    waiting() {
      const out = new Map();
      let names;
      try {
        names = fs.readdirSync(dir);
      } catch {
        return out;
      }
      for (const name of names) {
        if (!name.endsWith('.json') || name.startsWith('.')) continue;
        const file = path.join(dir, name);
        let st;
        try {
          st = fs.statSync(file);
        } catch {
          continue;
        }
        if (Date.now() - st.mtimeMs > 86_400_000) {
          try {
            fs.unlinkSync(file);
          } catch {}
          continue;
        }
        let what = '';
        try {
          const j = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
          const input = j && j.tool_input && typeof j.tool_input === 'object' ? j.tool_input : {};
          const cmd = typeof input.command === 'string' ? input.command : Array.isArray(input.command) ? input.command.join(' ') : '';
          what = [cmd, typeof input.description === 'string' ? input.description : '', typeof j.tool_name === 'string' ? j.tool_name : ''].find(Boolean) || '';
        } catch {}
        out.set(name.slice(0, -5), { command: what.replace(/\r?\n/g, ' '), since: st.mtimeMs });
      }
      return out;
    },

    /**
     * Whether the user has answered a request made at `since` (ms), as Codex's own log says (a SQLite database it writes
     * as things happen): its session's approval of a command, a patch or an MCP server's question
     * (`operation="exec_approval"` … `decision: approved`), or an interrupt.
     */
    answered(session, since) {
      if (!sqlite || !fs.existsSync(logDatabase)) return false;
      let db = null;
      try {
        db = new sqlite.DatabaseSync(logDatabase, { readOnly: true });
        db.exec('PRAGMA busy_timeout = 200');
        const row = db
          .prepare(
            `SELECT 1 FROM logs WHERE thread_id = ? AND ts >= ? AND target = 'codex_core::session::handlers'
               AND (feedback_log_body LIKE '%operation="exec_approval"%' OR feedback_log_body LIKE '%operation="patch_approval"%'
                 OR feedback_log_body LIKE '%operation="resolve_elicitation"%' OR feedback_log_body LIKE '%operation="interrupt"%')
               AND ts * 1000 + ts_nanos / 1000000 > ?
             LIMIT 1`,
          )
          .get(session, Math.floor(since / 1000) - 1, since);
        return !!row;
      } catch {
        return false;
      } finally {
        try {
          if (db) db.close();
        } catch {}
      }
    },

    /**
     * Drops a request once answered (Codex's own hooks that would drop it run only once trusted), unless a newer one has
     * taken its place meanwhile.
     */
    drop(session, since) {
      const file = path.join(dir, `${session}.json`);
      try {
        if (Math.abs(fs.statSync(file).mtimeMs - since) < 1) fs.unlinkSync(file);
      } catch {}
    },
  };
}

/** A Codex session's id, from its log's name (rollout-2026-11-09T23-47-11-<session id>.jsonl). */
function codexSession(logPath) {
  const name = path.basename(String(logPath || ''));
  if (!name.startsWith('rollout-') || !name.endsWith('.jsonl') || name.length <= 42) return null;
  return name.slice(0, -6).slice(-36);
}

module.exports = { createCodexHooks, codexSession };
