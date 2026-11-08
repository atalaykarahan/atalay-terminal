'use strict';
// The user's processes, read every few seconds, for three things the Mac app's Runaways.swift and MainWindowController
// do with the kernel's process list:
// - runaways: one of yours left burning a CPU core where nobody sees it, half a core or more for two minutes. On Windows
//   that's a shell or a script runtime (PowerShell, cmd, bash, node, python …) whose parent is gone: a process without
//   a parent is everyday there (an app's launcher exits), so only those count. The dashboard sounds the alarm, and End
//   ends one if it's still the same process.
// - what a closed terminal left running (Runaways.left): the same kind of process, its parent gone, burning or not (a dev
//   server still holding its port after its terminal closed). The orbit shows each as an amber car; ending it is a click.
// - what runs in the app's terminals (the orbit's cars): a shell's jobs, what they print as their command, the CPU they use.
// One long-lived PowerShell reads the list when it's asked (a line on its input, every few seconds) and ends with its
// input, so it never outlives the app; the folder a process runs in comes from the process itself, for the few that need
// it. Run from the sources elsewhere (a Mac), `ps` finds the runaways, as on the Mac, and the rest stays empty.
const { spawn, execFile } = require('child_process');
const os = require('os');

const WIN = process.platform === 'win32';
const HOME_NORM = (os.homedir() || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
const POSIX_EXCLUDED = /(\.xpc\/|\.appex\/|^\/System\/|^\/usr\/libexec\/|^\/usr\/sbin\/|^\/Library\/Apple\/|^\/Library\/Application Support\/Apple\/|(?:^|\/)com\.apple\.)/;

function isExcludedPosix(cmd, name) {
  const c = String(cmd || '').trim(), n = String(name || '');
  if (POSIX_EXCLUDED.test(c) || n.startsWith('com.apple.')) return true;
  if (c.includes('/Python.app/Contents/MacOS/Python')) return false;
  return c.includes('.app/Contents/') || c.split(/\s+/)[0].includes('.app/');
}

function normDir(d) {
  return String(d || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function inFolder(dir, root) {
  const d = normDir(dir), r = normDir(root);
  if (!d || !r || r === '/' || /^[a-z]:$/.test(r)) return false;
  if (d === r) return true;
  return r !== HOME_NORM && d.startsWith(`${r}/`);
}

// AI coding tools besides Claude Code, as the Mac's Proc.otherAIs: by the program's name, or for one Node, Bun or Python
// runs, by its script or its npm package in the command line (npm's .cmd shims run node with the package's own path).
// Each one running is a session on the orbit (the engine's setOthers).
const AI_TOOLS = {
  codex: 'Codex', agy: 'Antigravity', gemini: 'Gemini', opencode: 'OpenCode', aider: 'Aider', 'cursor-agent': 'Cursor', amp: 'Amp',
  qwen: 'Qwen Code', crush: 'Crush', droid: 'Droid', copilot: 'Copilot', 'kiro-cli': 'Kiro', grok: 'Grok', auggie: 'Auggie',
  cline: 'Cline', kimi: 'Kimi', kilocode: 'Kilo Code', plandex: 'Plandex',
};
const AI_PACKAGES = [['@openai/codex', 'Codex'], ['@google/gemini-cli', 'Gemini'], ['@qwen-code/', 'Qwen Code'], ['@github/copilot', 'Copilot'],
  ['@sourcegraph/amp', 'Amp'], ['opencode-ai', 'OpenCode'], ['@augmentcode/auggie', 'Auggie'], ['@kilocode/cli', 'Kilo Code'], ['@vibe-kit/grok-cli', 'Grok']];
const INTERPRETER = /^(node|bun|deno|python[0-9.]*|pythonw)$/i;
function aiTool(p) {
  const name = String(p.name).toLowerCase();
  if (AI_TOOLS[name]) return AI_TOOLS[name];
  if (!INTERPRETER.test(name)) return null;
  const cmd = String(p.cmd || '');
  // The script, past the interpreter's options (`node --no-warnings …\codex.js`, `python -m aider`).
  const words = [...cmd.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2]);
  const script = words.slice(1).find((w) => !w.startsWith('-'));
  const base = script ? script.split(/[\\/]/).pop().replace(/\.[^.]*$/, '').toLowerCase() : '';
  if (AI_TOOLS[base]) return AI_TOOLS[base];
  const lower = cmd.replace(/\\/g, '/').toLowerCase();
  const hit = AI_PACKAGES.find(([pkg]) => lower.includes(pkg));
  return hit ? hit[1] : null;
}

const SHELLS = '^(pwsh|powershell|cmd|bash|sh|zsh|fish|node|python[0-9.]*|ruby|perl|php|java|deno|bun|claude)(\\.exe)?$';
const SHELL_RE = new RegExp(SHELLS, 'i');
// An AI tool counts when it runs in a terminal, as the Mac's has a tty: a shell or a terminal app among its parents.
// One an editor runs in the background (the Codex extension's codex.exe in VS Code) is no session of anyone's.
const TERMINAL_RE = /^(pwsh|powershell|cmd|bash|sh|zsh|fish|nu|WindowsTerminal|wezterm-gui|alacritty|mintty|ConEmuC?(64)?|tabby|hyper|warp)$/i;

// The folder a process is in: its current directory, read from its process parameters (x64 layout; a 32-bit process, or
// one this user can't read, has none). And the battery's charge and battery saver (AtlPower), for power save.
const CWD_READER = `
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class AtlCwd {
  [StructLayout(LayoutKind.Sequential)] struct PBI { public IntPtr R1; public IntPtr Peb; public IntPtr R2; public IntPtr R3; public IntPtr Pid; public IntPtr R4; }
  [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr h, int cls, ref PBI info, int size, out int ret);
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(int access, bool inherit, int pid);
  [DllImport("kernel32.dll")] static extern bool ReadProcessMemory(IntPtr h, IntPtr at, byte[] buf, IntPtr size, out IntPtr read);
  [DllImport("kernel32.dll")] static extern bool IsWow64Process(IntPtr h, out bool wow);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  static byte[] Read(IntPtr h, IntPtr at, int n) { var b = new byte[n]; IntPtr got; return ReadProcessMemory(h, at, b, (IntPtr)n, out got) ? b : null; }
  public static string Of(int pid) {
    IntPtr h = OpenProcess(0x0410, false, pid);
    if (h == IntPtr.Zero) return "";
    try {
      bool wow;
      if (IntPtr.Size != 8 || (IsWow64Process(h, out wow) && wow)) return "";
      var pbi = new PBI(); int ret;
      if (NtQueryInformationProcess(h, 0, ref pbi, Marshal.SizeOf(pbi), out ret) != 0) return "";
      var p = Read(h, pbi.Peb + 0x20, 8); if (p == null) return "";
      var us = Read(h, (IntPtr)BitConverter.ToInt64(p, 0) + 0x38, 16); if (us == null) return "";
      int len = BitConverter.ToUInt16(us, 0);
      if (len <= 0 || len > 8192) return "";
      var s = Read(h, (IntPtr)BitConverter.ToInt64(us, 8), len); if (s == null) return "";
      var dir = Encoding.Unicode.GetString(s);
      return dir.Length > 3 ? dir.TrimEnd('\\\\') : dir;
    } catch { return ""; } finally { CloseHandle(h); }
  }
}
public static class AtlPower {
  [StructLayout(LayoutKind.Sequential)] struct SPS { public byte AC; public byte Flag; public byte Percent; public byte Saver; public int Life; public int Full; }
  [DllImport("kernel32.dll")] static extern bool GetSystemPowerStatus(out SPS s);
  // The battery's charge (%), -1 without one; and battery saver (Energy Saver on Windows 11), 1 when on.
  public static string Of() {
    SPS s;
    if (!GetSystemPowerStatus(out s)) return "0\\t-1";
    int pct = (s.Flag & 128) != 0 || s.Flag == 255 || s.Percent > 100 ? -1 : s.Percent;
    return (s.Saver == 1 ? "1" : "0") + "\\t" + pct;
  }
}`;

// `onPower({ saver, charge })`: with every reading on Windows, the battery's charge (%, null without one) and whether
// the system's saver is on, for power save (power.js).
function createRunaways({ onChange, onRead, onPower }) {
  const LINE = 50, SUSTAIN = 120_000, EVERY = 5000;
  const last = new Map(); // pid -> { started, cpu (ms of CPU in all), at }
  const over = new Map(); // pid -> since when it has been over the line
  const busyUntil = new Map(); // pid -> until when an orphan tree was actively working
  let json = '[]', timer = null, sampler = null, stopped = false;
  // The latest reading of every process (Windows): pid -> { pid, ppid, orphan, started, cpu, name, cwd, cmd, pct }.
  let table = new Map();
  let kids = new Map(); // pid -> its children's pids
  let wanted = [];
  let liveSessions = []; // [{ cwd, started }] from the engine
  let ask = () => {};
  const waiting = []; // what waits for the next reading

  function allLiveSessions() {
    const out = [...liveSessions];
    for (const p of table.values()) {
      if ((/^claude$/i.test(p.name) || aiTool(p)) && p.cwd && !out.some((s) => normDir(s.cwd) === normDir(p.cwd))) {
        out.push({ cwd: p.cwd, started: p.started, busy: true });
      }
    }
    return out;
  }

  function matchingSessions(p) {
    if (!p.cwd) return [];
    return allLiveSessions().filter((s) => s.cwd && p.started >= (s.started || 0) - 5000 && inFolder(p.cwd, s.cwd));
  }

  function ownerSession(p) {
    return matchingSessions(p)[0] || null;
  }

  function isLiveWork(p, now) {
    const matches = matchingSessions(p);
    if (!matches.length) return false;
    return matches.some((s) => s.busy !== false) || (busyUntil.get(p.pid) || 0) > now || now - p.started < 15_000;
  }

  // Runaways among one reading's candidates: [{ pid, name, cmd, started (ms since 1970), cpu (ms of CPU in all) }].
  function consider(list, at) {
    const items = [], seen = new Set(), now = Date.now();
    for (const p of list) {
      seen.add(p.pid);
      const prev = last.get(p.pid);
      last.set(p.pid, { started: p.started, cpu: p.cpu, at });
      if (!prev || prev.started !== p.started || at <= prev.at || p.cpu < prev.cpu) continue;
      // Measure the whole process tree when available (e.g. `npm run dev` waiting on a frozen `node` child).
      const pct = typeof p.treePct === 'number' ? p.treePct : ((p.cpu - prev.cpu) / (at - prev.at)) * 100;
      const liveWork = isLiveWork(p, now);
      if (pct >= 1 && matchingSessions(p).some((s) => s.busy !== false)) busyUntil.set(p.pid, now + 15_000);
      if (liveWork || pct < LINE) {
        over.delete(p.pid);
        continue;
      }
      const since = over.get(p.pid) ?? now;
      over.set(p.pid, since);
      if (now - since < SUSTAIN) continue;
      const cmd = String(p.cmd || p.name).slice(0, 300);
      const totalCpu = typeof p.treeCpu === 'number' ? p.treeCpu : p.cpu;
      items.push({ pid: p.pid, name: p.name, cmd, cpu: Math.round(pct * 10) / 10, since, started: p.started, cpuTime: totalCpu / 1000 });
    }
    for (const k of [...last.keys()]) if (!seen.has(k)) last.delete(k);
    for (const k of [...over.keys()]) if (!seen.has(k)) over.delete(k);
    for (const k of [...busyUntil.keys()]) if (!seen.has(k)) busyUntil.delete(k);
    items.sort((a, b) => b.cpu - a.cpu);
    const next = JSON.stringify(items);
    if (next !== json) {
      json = next;
      onChange(next);
    }
  }

  // ---------- Windows: one PowerShell, the whole list when asked ----------
  function startWindows() {
    const script = [
      '$ErrorActionPreference = "SilentlyContinue"',
      '$me = (Get-Process -Id $PID).SessionId',
      `try { Add-Type -TypeDefinition @'\n${CWD_READER}\n'@ } catch {}`,
      '$pm = $null; try { $pm = [Windows.System.Power.PowerManager,Windows.System.Power,ContentType=WindowsRuntime] } catch {}',
      'while ($true) {',
      '  $ask = [Console]::In.ReadLine()',
      '  if ($ask -eq $null) { break }',
      '  $want = @{}; foreach ($x in $ask.Split(",")) { $n = 0; if ([int]::TryParse($x, [ref]$n)) { $want[$n] = 1 } }',
      '  $all = Get-CimInstance Win32_Process -Filter "SessionId=$me" -Property ProcessId,ParentProcessId,Name,CommandLine,CreationDate,KernelModeTime,UserModeTime',
      '  $born = @{}; foreach ($p in $all) { $born[[int]$p.ProcessId] = $p.CreationDate }',
      '  $sb = New-Object System.Text.StringBuilder',
      '  foreach ($p in $all) {',
      '    $id = [int]$p.ProcessId; $pp = [int]$p.ParentProcessId',
      '    if (-not $p.CreationDate) { continue }',
      // A parent gone, or a later process that took its number: an orphan.
      '    $orphan = (-not $born.ContainsKey($pp)) -or ($born[$pp] -gt $p.CreationDate)',
      '    $cwd = ""',
      `    if ($want.ContainsKey($id) -or $p.Name -match '^claude(\\.exe)?$' -or ($orphan -and $p.Name -match '${SHELLS}')) { try { $cwd = [AtlCwd]::Of($id) } catch {} }`,
      '    $c = [string]$p.CommandLine; if ($c.Length -gt 400) { $c = $c.Substring(0, 400) }',
      '    $t = [DateTimeOffset]::new($p.CreationDate).ToUnixTimeMilliseconds()',
      // Whole milliseconds: a fraction would be written with the PC's own decimal sign.
      '    $cpu = [long](([double]$p.KernelModeTime + [double]$p.UserModeTime) / 10000)',
      '    [void]$sb.Append("$id`t$pp`t$([int]$orphan)`t$t`t$cpu`t$($p.Name)`t$cwd`t$($c -replace "[`t`r`n]", " ")`n")',
      '  }',
      // The battery's charge and Windows' saver, for power save (power.js): Electron tells neither. The saver as the
      // classic call reports it, or as Windows 11's PowerManager does.
      '  $pw = "0`t-1"; try { $pw = [AtlPower]::Of() } catch {}',
      '  try { if ($pm -and [string]$pm::EnergySaverStatus -eq "On") { $pw = "1" + $pw.Substring(1) } } catch {}',
      '  [void]$sb.Append("power`t$pw`n")',
      '  [void]$sb.Append("end`n")',
      '  [Console]::Out.Write($sb.ToString())',
      '  [Console]::Out.Flush()',
      '}',
    ].join('\n');
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    sampler = ps;
    ps.stdin.on('error', () => {});
    let buf = '', rows = [];
    ps.stdout.on('data', (d) => {
      buf += d.toString('utf8');
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, '');
        buf = buf.slice(i + 1);
        if (line.startsWith('power\t')) {
          const [, saver, pct] = line.split('\t');
          if (onPower) onPower({ saver: saver === '1', charge: Number(pct) >= 0 ? Number(pct) : null });
          continue;
        }
        if (line !== 'end') {
          rows.push(line);
          continue;
        }
        read(rows, Date.now());
        rows = [];
      }
    });
    ask = () => {
      if (sampler === ps && ps.stdin.writable) ps.stdin.write(`${wanted.join(',')}\n`);
    };
    timer = setInterval(ask, EVERY);
    ask();
    // It shouldn't end; if it does, it starts again in a while.
    ps.on('exit', () => {
      clearInterval(timer);
      sampler = null;
      if (!stopped) setTimeout(() => !stopped && startWindows(), 30_000);
    });
  }

  function read(rows, at) {
    const next = new Map(), children = new Map();
    for (const row of rows) {
      const f = row.split('\t');
      if (f.length < 8) continue;
      const p = {
        pid: Number(f[0]), ppid: Number(f[1]), orphan: f[2] === '1', started: Number(f[3]), cpu: Number(f[4]), name: f[5].replace(/\.exe$/i, ''),
        cwd: f[6], cmd: f.slice(7).join(' '), pct: 0,
      };
      if (!(p.pid > 0)) continue;
      // % of a core since the last reading, for the cars' speed.
      const prev = table.get(p.pid);
      if (prev && prev.started === p.started && p.cpu >= prev.cpu && prev.at < at) p.pct = ((p.cpu - prev.cpu) / (at - prev.at)) * 100;
      p.at = at;
      next.set(p.pid, p);
    }
    for (const p of next.values()) {
      const parent = !p.orphan && next.get(p.ppid);
      if (!parent || parent.pid === p.pid) continue;
      if (!children.has(p.ppid)) children.set(p.ppid, []);
      children.get(p.ppid).push(p.pid);
    }
    table = next;
    kids = children;
    if (onRead) onRead();
    const candidates = [...next.values()].filter((p) => p.orphan && SHELL_RE.test(p.name) && !/^claude$/i.test(p.name) && !aiTool(p));
    for (const p of candidates) {
      p.treePct = busy([p.pid]);
      p.treeCpu = tree(p.pid).reduce((s, t) => s + ((next.get(t.pid) || {}).cpu || 0), 0);
    }
    consider(candidates, at);
    for (const done of waiting.splice(0)) done();
  }

  /** The next reading, asked for now (what's ended a moment later is only ended if it's still the same process). */
  function fresh() {
    if (!sampler) return Promise.resolve();
    return new Promise((resolve) => {
      waiting.push(resolve);
      setTimeout(resolve, 4000);
      ask();
    });
  }

  /** A process and everything under it, deepest first, with when each started. */
  function tree(pid) {
    const out = [], seen = new Set();
    const walk = (p) => {
      if (seen.has(p)) return;
      seen.add(p);
      for (const c of kids.get(p) || []) walk(c);
      const t = table.get(p);
      if (t) out.push({ pid: p, started: t.started });
    };
    walk(pid);
    return out;
  }

  /** Ends, at once, what of `procs` the latest reading still has as the same process (pid and start). */
  function kill(procs) {
    for (const t of procs) {
      const now = table.get(t.pid);
      if (!now || now.started !== t.started) continue;
      try {
        process.kill(t.pid);
      } catch {}
    }
  }

  // ---------- elsewhere: ps ----------
  const seconds = (t) => t.split('-').reduce((acc, part, i, all) => {
    if (all.length === 2 && i === 0) return Number(part) * 86400;
    return acc + part.split(':').reduce((s, x) => s * 60 + Number(x), 0);
  }, 0);
  function readPs() {
    execFile('ps', ['-axo', 'pid=,ppid=,uid=,tty=,time=,lstart=,command='], { maxBuffer: 8 << 20 }, (err, out) => {
      if (err || stopped) return;
      const me = process.getuid(), all = new Map(), byParent = new Map();
      for (const line of out.split('\n')) {
        const f = line.trim().split(/\s+/);
        if (f.length < 11 || Number(f[2]) !== me) continue;
        const pid = Number(f[0]), ppid = Number(f[1]), tty = f[3];
        if (!(pid > 1)) continue;
        const command = f.slice(10).join(' ');
        const name = f[10].split('/').pop();
        if (isExcludedPosix(command, name)) continue;
        const entry = { pid, ppid, tty, name, cmd: command, started: Date.parse(f.slice(5, 10).join(' ')), cpu: seconds(f[4]) * 1000 };
        all.set(pid, entry);
        if (ppid > 1) {
          if (!byParent.has(ppid)) byParent.set(ppid, []);
          byParent.get(ppid).push(pid);
        }
      }
      table = all;
      kids = byParent;
      const list = [];
      for (const p of all.values()) {
        if (p.ppid !== 1 || p.tty !== '??' || /^claude$/i.test(p.name) || aiTool(p)) continue;
        let totalCpu = p.cpu, level = byParent.get(p.pid) || [];
        for (let d = 0; d < 6 && level.length; d++) {
          for (const c of level) totalCpu += (all.get(c) || {}).cpu || 0;
          level = level.flatMap((c) => byParent.get(c) || []);
        }
        list.push({ ...p, cpu: totalCpu });
      }
      consider(list, Date.now());
    });
  }

  return {
    start() {
      if (WIN) startWindows();
      else timer = setInterval(readPs, EVERY);
    },
    stop() {
      stopped = true;
      clearInterval(timer);
      if (sampler) sampler.kill();
    },
    json: () => json,
    // The dashboard's End button: only the process it showed (same pid, same start). Windows ends it and its tree;
    // elsewhere TERM, then KILL two seconds later if it's still there (a shell ignores TERM).
    end(pid, started) {
      const p = last.get(Number(pid));
      if (!p || Math.abs(p.started - Number(started)) > 1000) return false;
      const all = tree(Number(pid));
      // At once, deepest first: ending the root first left its children running without it until a later pass.
      if (WIN) {
        kill(all);
        return true;
      }
      const targets = all.length ? all.map((t) => t.pid) : [Number(pid)];
      let any = false;
      for (const tPid of targets) {
        try {
          process.kill(tPid, 'SIGTERM');
          any = true;
        } catch {}
      }
      if (!any) return false;
      setTimeout(() => {
        const q = last.get(Number(pid));
        if (q && q.started === p.started) {
          for (const tPid of targets) {
            try {
              process.kill(tPid, 'SIGKILL');
            } catch {}
          }
        }
      }, 2000);
      return true;
    },
    /**
     * What closed terminals left running, for the orbit's amber cars: a shell or runtime whose parent is gone, that has
     * run for a few seconds (not a launcher's step on its way) and isn't burning a core (that's a runaway's alarm), a
     * busy job started by a live AI session, nor an AI session itself (that's a planet on the orbit).
     */
    left(live) {
      if (Array.isArray(live)) {
        liveSessions = live.filter((s) => s && s.cwd).map((s) => {
          const proc = s.pid ? table.get(s.pid) : null;
          return { cwd: s.cwd, started: (proc && proc.started) || s.started || 0, busy: s.status === 'busy' };
        });
      }
      const burning = new Set(JSON.parse(json).map((r) => r.pid));
      const now = Date.now(), out = [];
      for (const p of table.values()) {
        if (!p.orphan || !SHELL_RE.test(p.name) || /^claude$/i.test(p.name) || aiTool(p) || burning.has(p.pid) || now - p.started < 10_000) continue;
        const cpu = busy([p.pid]);
        if (cpu >= 1) busyUntil.set(p.pid, now + 15_000);
        if (ownerSession(p)) continue;
        out.push({ pid: p.pid, started: p.started, name: p.name, cmd: p.cmd || p.name, cwd: p.cwd, cpu });
      }
      return out.sort((a, b) => a.started - b.started);
    },
    /** A left-behind process ended from its car: it and all it started, gently first (a window of its own is asked to
     *  close, as taskkill does), at once two seconds later for what's still there. Only the process the page showed. */
    endLeft(pid, started) {
      const p = table.get(Number(pid));
      if (!WIN || !p || Math.abs(p.started - Number(started)) > 1000) return false;
      const all = tree(p.pid);
      execFile('taskkill.exe', ['/PID', String(p.pid), '/T'], { windowsHide: true }, () => {});
      setTimeout(() => fresh().then(() => kill(all)), 2000);
      return true;
    },
    tree,
    kill,
    fresh,
    /** A process's children, oldest first: [{ pid, name, cmd, cwd }]. */
    children: (pid) => (kids.get(pid) || []).map((c) => table.get(c)).filter(Boolean).sort((a, b) => a.started - b.started),
    /** A process's parents' pids, nearest first, as far as the last reading knows them. */
    parents(pid) {
      const out = [];
      const p = table.get(pid);
      for (let q = p && !p.orphan && table.get(p.ppid); q && out.length < 12; q = !q.orphan && table.get(q.ppid)) out.push(q.pid);
      return out;
    },
    /** % of a core the processes under `roots` used over the last reading. */
    busy,
    /**
     * The other AI tools running in a terminal (aiTool, TERMINAL_RE), each once: a launcher's child that's the same tool
     * (Codex's Node script starts its own codex.exe) isn't another, nor one Claude runs. Its CPU is all it runs: the
     * launcher only waits while its child works. [{ pid, started, tool, cwd, pct, chain (its parents) }]
     */
    ais() {
      const found = new Map();
      for (const p of table.values()) {
        // `codex app-server` serves a program, no one at a keyboard: the engine's own reader of Codex's limits, under a
        // cmd.exe that would pass for a terminal, flew as a Codex planet (and stayed two minutes as an ended one).
        if (/\bapp-server\b/.test(p.cmd || '')) continue;
        const tool = aiTool(p);
        if (tool) found.set(p.pid, tool);
      }
      const out = [];
      for (const [pid, tool] of found) {
        const p = table.get(pid);
        if (!p.orphan && found.has(p.ppid)) continue;
        const chain = [];
        for (let q = !p.orphan && table.get(p.ppid); q && chain.length < 12; q = !q.orphan && table.get(q.ppid)) chain.push(q);
        if (chain.some((q) => /^claude$/i.test(q.name)) || !chain.some((q) => TERMINAL_RE.test(q.name))) continue;
        const shell = shellCommand(pid);
        out.push({ pid, started: p.started, tool, cwd: p.cwd || '', pct: busy([pid]), chain: chain.map((q) => q.pid), command: shell && shell.line, commandStarted: shell && shell.started });
      }
      return out;
    },
    /** Processes whose folder the next reading should look up (the terminals' shells, for a path Ctrl-clicked). */
    want(pids) {
      wanted = [...new Set(pids)].filter((p) => p > 0);
    },
    /** A process's folder as the last reading found it (one asked for with `want`), or ''. */
    cwd: (pid) => (table.get(pid) || {}).cwd || '',
  };

  // The command a tool has a shell run right now (`powershell -Command "npm test"`, `cmd /c …`, `bash -c …`), from the
  // processes under it: the one started last, and when it started (the engine tells a turn's command from a server the
  // tool keeps by it).
  function shellCommand(pid) {
    let level = kids.get(pid) || [], found = null;
    for (let depth = 0; depth < 3 && level.length; depth++) {
      for (const c of level) {
        const p = table.get(c);
        if (!p || !/^(powershell|pwsh|cmd|bash|sh|zsh)$/i.test(p.name)) continue;
        const m = /\s(?:-Command|-c|-lc|\/c)\s+(.+)$/i.exec(p.cmd || '');
        if (m && (!found || p.started >= found.started)) found = { line: m[1].replace(/^"(.*)"$/, '$1').slice(0, 120), started: p.started };
      }
      level = level.flatMap((c) => kids.get(c) || []);
    }
    return found;
  }

  function busy(roots) {
    let pct = 0;
    for (const r of roots) for (const t of tree(r)) pct += (table.get(t.pid) || {}).pct || 0;
    return pct;
  }
}

module.exports = { createRunaways };
