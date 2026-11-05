'use strict';
// The shells and Claude chats behind the terminal windows, each in a pseudo console (ConPTY). A chat runs Claude inside
// the user's shell, so the window stays a terminal when Claude exits, as on the Mac. They run in the session host
// (host.cs, sessionhost.js), Windows' stand-in for the Mac's screen sessions: the app can quit, update or crash and they
// go on, and its windows attach to them again at the next launch. Without the host (it couldn't be built or started)
// they run in the app itself (node-pty, as VS Code runs its terminal) and end with it.
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { openHost } = require('./sessionhost');

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
    const out = execFileSync(WIN ? 'where.exe' : 'which', [name], { encoding: 'utf8', windowsHide: true, timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split(/\r?\n/).map((s) => s.trim()).find(Boolean) || null;
  } catch {
    return null;
  }
}

/** A shell-safe word: PowerShell's single quotes, or POSIX ones. */
const quote = (s) => (WIN ? `'${String(s).replace(/'/g, "''")}'` : `'${String(s).replace(/'/g, `'\\''`)}'`);

/** One command line from a program and its arguments, quoted so Windows programs split it back into the same words. */
const commandLine = (file, args) =>
  [file, ...args].map((a) => (a && !/[\s"]/.test(a) ? a : `"${a.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')}"`)).join(' ');

/**
 * The app's environment minus anything that would make Claude think it runs inside another terminal or another Claude,
 * as ChatTerminal.swift has it: started with `npm start` from a Claude session's shell or from Windows Terminal, the
 * app would otherwise hand those on to every chat.
 */
function childEnvironment(extraPath) {
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    // Codex's tool environment too (the app started from a Codex command): NO_COLOR turned every chat's Claude white. What
    // the user set for themselves stays: where Codex's home is (the engine and the token savers look for it there, and
    // nothing here sets it again as a Mac's login shell does) and where Claude Code finds Git Bash.
    if (/^(CODEX_HOME|CLAUDE_CODE_GIT_BASH_PATH)$/i.test(k)) {
      env[k] = v;
      continue;
    }
    if (/^(CLAUDECODE|CLAUDE_CODE_|WT_|CODEX_)/i.test(k)) continue;
    if (/^(CLAUDE_PID|TERM_SESSION_ID|TERM_PROGRAM_VERSION|NO_COLOR|LC_ALL|LC_CTYPE|GIT_PAGER|GH_PAGER)$/i.test(k)) continue;
    env[k] = v;
  }
  // The app's rtk (savers.js), last, so one of the user's own comes first. Windows spells the variable "Path" and
  // takes it in any case: a second one beside it would leave which one wins to chance.
  if (extraPath) {
    const key = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH';
    env[key] = env[key] ? `${env[key]}${path.delimiter}${extraPath}` : extraPath;
  }
  // Claude's full-screen renderer keeps the whole conversation scrollable inside Claude; the classic one redraws by
  // clearing the screen, which takes the top of a long conversation out of the terminal's scrollback. A user who chose
  // the classic one (/tui default) keeps it.
  if (claudeTUI() !== 'default') env.CLAUDE_CODE_NO_FLICKER = '1';
  return { ...env, TERM: 'xterm-256color', COLORTERM: 'truecolor', TERM_PROGRAM: 'AtalaysTerminal' };
}

/** The renderer the user picked in Claude Code (`/tui`, "tui" in its settings.json): "fullscreen", "default" or null. */
function claudeTUI() {
  const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  try {
    const tui = JSON.parse(fs.readFileSync(path.join(dir, 'settings.json'), 'utf8')).tui;
    return typeof tui === 'string' ? tui : null;
  } catch {
    return null;
  }
}

/**
 * `host`: where the session host is ({ name, dir, source }, see sessionhost.js), or null to run everything in the app.
 * Sessions are known by their window's id, which the host keeps, so a window opened at the next launch finds its own.
 * `extraPath`: a folder the shells find programs in after their own (the app's rtk).
 */
function createTerminals({ onData, onExit, host, extraPath }) {
  const all = new Map(); // id -> { cwd, claude, title, pid, startedAt, lastIO, pty (only when it runs in the app) }
  const shell = shellFor();
  let link = null;
  const ready = !host
    ? Promise.resolve(false)
    : openHost(host).then(
        (l) => {
          link = l;
          l.on('data', (id, data) => {
            const t = all.get(id);
            if (t) t.lastIO = Date.now();
            onData(id, data);
          });
          l.on('exit', (id, code) => {
            all.delete(id);
            onExit(id, code);
          });
          // The host gone (it crashed, or was ended): its sessions went with it.
          l.on('close', () => {
            if (link !== l) return;
            link = null;
            for (const [id, t] of [...all]) {
              if (t.pty) continue;
              all.delete(id);
              onExit(id, 1);
            }
          });
          return true;
        },
        (e) => {
          console.error('terminals: no session host, chats end with the app:', e.message);
          return false;
        },
      );

  function spawnHere(id, t, args, cols, rows) {
    if (!pty) throw new Error('node-pty is not available');
    const p = pty.spawn(shell.file, args, { name: 'xterm-256color', cols, rows, cwd: t.cwd, env: childEnvironment(extraPath), useConpty: true });
    t.pty = p;
    t.pid = p.pid;
    p.onData((data) => {
      t.lastIO = Date.now();
      onData(id, data);
    });
    p.onExit(({ exitCode }) => {
      all.delete(id);
      onExit(id, exitCode);
    });
  }

  return {
    available: !!pty || !!host,
    /** Whether the sessions go on when the app quits (they're in the session host). */
    get persistent() {
      return !!link;
    },
    /**
     * A terminal for window `id` in `cwd`. With `claudeArgs` ([] for a new chat, ['--resume', id] …) Claude runs first
     * and the shell stays when it exits; without, it's a plain terminal. `title` goes with it, for its window after a
     * restart. Known at once (`has`); its process a moment later.
     */
    spawn({ id, cwd, claudeArgs, cols = 100, rows = 30, title }) {
      const dir = cwd && fs.existsSync(cwd) ? cwd : os.homedir();
      const args = claudeArgs ? shell.run(['claude', ...claudeArgs].map((a, i) => (i ? quote(a) : a)).join(' ')) : shell.args;
      const t = { cwd: dir, claude: !!claudeArgs, title, pid: null, startedAt: Date.now(), lastIO: Date.now(), pty: null };
      all.set(id, t);
      return ready.then(async () => {
        if (!link) return spawnHere(id, t, args, cols, rows);
        const r = await link.request({
          t: 'spawn', id, cmd: commandLine(shell.file, args), cwd: dir, env: childEnvironment(extraPath), cols, rows,
          meta: JSON.stringify({ cwd: dir, claude: t.claude, title }),
        });
        if (r.t !== 'spawned') {
          all.delete(id);
          throw new Error(r.message || "the session host couldn't start it");
        }
        t.pid = r.pid;
      });
    },
    /** The host's sessions that outlived the last launch, now known here: their windows attach to them. */
    async restore() {
      if (!(await ready) || !link) return [];
      const r = await link.request({ t: 'list' });
      const found = [];
      for (const s of r.sessions || []) {
        if (all.has(s.id)) continue;
        let meta = {};
        try {
          meta = JSON.parse(s.meta || '{}');
        } catch {}
        const t = { cwd: meta.cwd || os.homedir(), claude: !!meta.claude, title: meta.title, pid: s.pid, startedAt: s.startedAt || Date.now(), lastIO: Date.now(), pty: null };
        all.set(s.id, t);
        found.push({ id: s.id, ...t });
      }
      return found;
    },
    /**
     * A window (new, or its page reloaded) showing a session that's already running: in the host, it gets the end of
     * the output to start from, then takes the window's size, one row short first so the program draws itself again.
     */
    attach(id, cols, rows) {
      const t = all.get(id);
      if (!t || t.pty || t.pid == null || !link) return;
      link.request({ t: 'attach', id }).then((r) => {
        if (r.t === 'error') {
          if (all.delete(id)) onExit(id, 1);
          return;
        }
        if (!(cols > 0 && rows > 1) || !link) return;
        link.send({ t: 'resize', id, cols, rows: rows - 1 });
        setTimeout(() => link && link.send({ t: 'resize', id, cols, rows }), 60);
      });
    },
    write(id, data) {
      const t = all.get(id);
      if (!t) return;
      t.lastIO = Date.now();
      if (t.pty) t.pty.write(data);
      else if (link) link.send({ t: 'input', id, d: data });
    },
    resize(id, cols, rows) {
      const t = all.get(id);
      if (!t || !(cols > 0 && rows > 0)) return;
      if (t.pty) t.pty.resize(cols, rows);
      else if (link) link.send({ t: 'resize', id, cols, rows });
    },
    kill(id) {
      const t = all.get(id);
      if (!t) return;
      all.delete(id);
      if (t.pty) {
        try {
          t.pty.kill();
        } catch {}
      } else if (link) link.send({ t: 'kill', id });
    },
    /**
     * End Session: in the host, the session is hung up and what's still running three seconds on is ended, its job and
     * all (true). An older host only kills, and a terminal running in the app ends at once (false): what its shell
     * started apart from the console is the caller's to sweep up.
     */
    end(id) {
      const t = all.get(id);
      if (!t) return false;
      if (t.pty || !link || !link.canEnd) {
        this.kill(id);
        return false;
      }
      all.delete(id);
      link.send({ t: 'end', id });
      return true;
    },
    killAll() {
      for (const id of [...all.keys()]) this.kill(id);
    },
    /** The app quits: the host's sessions go on without it, the ones running in the app end. */
    detachAll() {
      const l = link;
      link = null;
      if (l) l.close();
      for (const [id, t] of [...all]) if (t.pty) this.kill(id);
    },
    has: (id) => all.has(id),
    /** Running in the app itself, so quitting (or an update's restart) would end it. */
    local: (id) => !!(all.get(id) || {}).pty,
    pids: () => new Set([...all.values()].map((t) => t.pid).filter(Boolean)),
    /** The folders the terminals were opened in (Source Control looks for repos there too). */
    cwds: () => [...new Set([...all.values()].map((t) => t.cwd))],
    /** Typed in or printed to lately: a sign of work, for the active time (XP). */
    busySince: (ms) => [...all.values()].some((t) => Date.now() - t.lastIO < ms),
    list: () => [...all.entries()].map(([id, t]) => ({ id, cwd: t.cwd, claude: t.claude, pid: t.pid, startedAt: t.startedAt })),
  };
}

module.exports = { createTerminals, which };
