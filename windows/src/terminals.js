'use strict';
// The shells and Claude chats behind the terminal windows: each in a pseudo-console (node-pty, ConPTY on Windows), as
// VS Code runs its terminal. A chat runs Claude inside the user's shell, so the window stays a terminal when Claude
// exits, as on the Mac. Windows has no `screen`: everything here ends with the app.
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

let pty = null;
try {
  pty = require('node-pty');
} catch (e) {
  console.error('terminals: node-pty is missing (npm run rebuild):', e.message);
}

const WIN = process.platform === 'win32';

/** The shell a terminal opens: PowerShell 7 when it's there, else Windows PowerShell; the login shell elsewhere. */
function shellFor() {
  if (!WIN) return { file: process.env.SHELL || '/bin/zsh', args: ['-il'], run: (cmd) => ['-ilc', `${cmd}; exec ${process.env.SHELL || '/bin/zsh'} -il`] };
  const pwsh = which('pwsh.exe');
  const file = pwsh || path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  return { file, args: ['-NoLogo'], run: (cmd) => ['-NoLogo', '-NoExit', '-Command', cmd] };
}

/** A program on PATH (with Windows' extensions), or null. */
function which(name) {
  try {
    const out = execFileSync(WIN ? 'where.exe' : 'which', [name], { encoding: 'utf8', windowsHide: true, timeout: 3000 });
    return out.split(/\r?\n/).map((s) => s.trim()).find(Boolean) || null;
  } catch {
    return null;
  }
}

/** A shell-safe word: PowerShell's single quotes, or POSIX ones. */
const quote = (s) => (WIN ? `'${String(s).replace(/'/g, "''")}'` : `'${String(s).replace(/'/g, `'\\''`)}'`);

function createTerminals({ onData, onExit }) {
  const all = new Map(); // id -> { pty, cwd, claude, startedAt, lastIO }
  const shell = shellFor();

  return {
    available: !!pty,
    /**
     * A terminal for window `id` in `cwd`. With `claudeArgs` ([] for a new chat, ['--resume', id] …) Claude runs first
     * and the shell stays when it exits; without, it's a plain terminal.
     */
    spawn({ id, cwd, claudeArgs, cols = 100, rows = 30 }) {
      if (!pty) throw new Error('node-pty is not available');
      const dir = cwd && fs.existsSync(cwd) ? cwd : os.homedir();
      const args = claudeArgs ? shell.run(['claude', ...claudeArgs].map((a, i) => (i ? quote(a) : a)).join(' ')) : shell.args;
      const env = { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', TERM_PROGRAM: 'AtalaysTerminal' };
      const p = pty.spawn(shell.file, args, { name: 'xterm-256color', cols, rows, cwd: dir, env, useConpty: true });
      const t = { pty: p, cwd: dir, claude: !!claudeArgs, startedAt: Date.now(), lastIO: Date.now() };
      all.set(id, t);
      p.onData((data) => {
        t.lastIO = Date.now();
        onData(id, data);
      });
      p.onExit(({ exitCode }) => {
        all.delete(id);
        onExit(id, exitCode);
      });
      return { pid: p.pid, cwd: dir };
    },
    write(id, data) {
      const t = all.get(id);
      if (!t) return;
      t.lastIO = Date.now();
      t.pty.write(data);
    },
    resize(id, cols, rows) {
      const t = all.get(id);
      if (t && cols > 0 && rows > 0) t.pty.resize(cols, rows);
    },
    kill(id) {
      const t = all.get(id);
      if (!t) return;
      all.delete(id);
      try {
        t.pty.kill();
      } catch {}
    },
    killAll() {
      for (const id of [...all.keys()]) this.kill(id);
    },
    has: (id) => all.has(id),
    pids: () => new Set([...all.values()].map((t) => t.pty.pid)),
    /** The folders the terminals were opened in (Source Control looks for repos there too). */
    cwds: () => [...new Set([...all.values()].map((t) => t.cwd))],
    /** Typed in or printed to lately: a sign of work, for the active time (XP). */
    busySince: (ms) => [...all.values()].some((t) => Date.now() - t.lastIO < ms),
    list: () => [...all.entries()].map(([id, t]) => ({ id, cwd: t.cwd, claude: t.claude, pid: t.pty.pid, startedAt: t.startedAt })),
  };
}

module.exports = { createTerminals, which };
