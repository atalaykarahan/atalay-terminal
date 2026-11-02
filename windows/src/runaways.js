'use strict';
// Runaway processes, as the Mac app's Runaways.swift finds them: one of yours left burning a CPU core where nobody sees
// it, half a core or more for two minutes. On Windows that's a shell or a script runtime (PowerShell, cmd, bash, node,
// python …) whose parent is gone: a process without a parent is everyday there (an app's launcher exits), so only those
// count. Run from the sources elsewhere (a Mac): as on the Mac, a process of yours hanging off launchd, without a
// terminal, that isn't an app. One long-lived PowerShell reads the processes every few seconds (`ps` elsewhere); the
// dashboard sounds the alarm, and End ends one if it's still the same process.
const { spawn, execFile } = require('child_process');

const WIN = process.platform === 'win32';
const SHELLS = '^(pwsh|powershell|cmd|bash|sh|zsh|fish|node|python[0-9.]*|ruby|perl|php|java|deno|bun|claude)(\\.exe)?$';
// The staging demo's PowerShell says so in its command line, so the panel can tell it apart.
const DEMO_MARK = 'atalay-terminal staging demo';

function createRunaways({ onChange, staging }) {
  const LINE = 50, SUSTAIN = staging ? 3000 : 120_000, EVERY = staging ? 1500 : 5000;
  const last = new Map(); // pid -> { started, cpu (ms of CPU in all), at }
  const over = new Map(); // pid -> since when it has been over the line
  let json = '[]', demoPid = 0, timer = null, sampler = null, stopped = false, demoChecked = !staging;

  // One reading: [{ pid, name, cmd, started (ms since 1970), cpu (ms of CPU in all) }], the candidates only.
  function consider(list, at) {
    // Staging's demo starts after the first reading, unless the last launch's still spins (one at a time; its command
    // line says so).
    if (!demoChecked) {
      demoChecked = true;
      if (!list.some((p) => String(p.cmd || '').includes(DEMO_MARK))) startDemo();
    }
    const items = [], seen = new Set();
    for (const p of list) {
      seen.add(p.pid);
      const prev = last.get(p.pid);
      last.set(p.pid, { started: p.started, cpu: p.cpu, at });
      if (!prev || prev.started !== p.started || at <= prev.at || p.cpu < prev.cpu) continue;
      const pct = ((p.cpu - prev.cpu) / (at - prev.at)) * 100;
      if (pct < LINE) {
        over.delete(p.pid);
        continue;
      }
      const since = over.get(p.pid) ?? Date.now();
      over.set(p.pid, since);
      if (Date.now() - since < SUSTAIN) continue;
      const cmd = String(p.cmd || p.name).slice(0, 300);
      items.push({ pid: p.pid, name: p.name, cmd, cpu: Math.round(pct * 10) / 10, since, started: p.started, cpuTime: p.cpu / 1000, demo: p.pid === demoPid || cmd.includes(DEMO_MARK) });
    }
    for (const k of [...last.keys()]) if (!seen.has(k)) last.delete(k);
    for (const k of [...over.keys()]) if (!seen.has(k)) over.delete(k);
    items.sort((a, b) => b.cpu - a.cpu);
    const next = JSON.stringify(items);
    if (next !== json) {
      json = next;
      onChange(next);
    }
  }

  // ---------- Windows: one PowerShell, a line of JSON every few seconds ----------
  function startWindows() {
    const script = [
      '$ErrorActionPreference = "SilentlyContinue"',
      '$me = (Get-Process -Id $PID).SessionId',
      'while ($true) {',
      '  $all = Get-CimInstance Win32_Process -Filter "SessionId=$me" -Property ProcessId,ParentProcessId,Name,CommandLine,CreationDate,KernelModeTime,UserModeTime',
      '  $ids = @{}; foreach ($p in $all) { $ids[[int]$p.ProcessId] = 1 }',
      `  $out = foreach ($p in $all) { if ($p.Name -match '${SHELLS}' -and -not $ids.ContainsKey([int]$p.ParentProcessId)) {`,
      '    [pscustomobject]@{ pid = [int]$p.ProcessId; name = ($p.Name -replace "\\.exe$", ""); cmd = [string]$p.CommandLine;',
      '      started = [DateTimeOffset]::new($p.CreationDate).ToUnixTimeMilliseconds(); cpu = ([double]$p.KernelModeTime + [double]$p.UserModeTime) / 10000 } } }',
      '  [Console]::Out.WriteLine((ConvertTo-Json -Compress -InputObject @($out)))',
      `  Start-Sleep -Milliseconds ${EVERY}`,
      '}',
    ].join('\n');
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    sampler = ps;
    let buf = '';
    ps.stdout.on('data', (d) => {
      buf += d.toString('utf8');
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        try {
          const list = line ? JSON.parse(line) : [];
          consider(Array.isArray(list) ? list : [list], Date.now());
        } catch {}
      }
    });
    // It shouldn't end; if it does, it starts again in a while.
    ps.on('exit', () => {
      sampler = null;
      if (!stopped) setTimeout(() => !stopped && startWindows(), 30_000);
    });
  }

  // ---------- elsewhere: ps ----------
  const seconds = (t) => t.split('-').reduce((acc, part, i, all) => {
    if (all.length === 2 && i === 0) return Number(part) * 86400;
    return acc + part.split(':').reduce((s, x) => s * 60 + Number(x), 0);
  }, 0);
  function readPs() {
    execFile('ps', ['-axo', 'pid=,ppid=,uid=,tty=,time=,lstart=,command='], { maxBuffer: 8 << 20 }, (err, out) => {
      if (err || stopped) return;
      const me = process.getuid(), list = [];
      for (const line of out.split('\n')) {
        const f = line.trim().split(/\s+/);
        if (f.length < 11 || Number(f[1]) !== 1 || Number(f[2]) !== me || f[3] !== '??') continue;
        const command = f.slice(10).join(' ');
        if (command.includes('.app/')) continue;
        list.push({ pid: Number(f[0]), name: f[10].split('/').pop(), cmd: command, started: Date.parse(f.slice(5, 10).join(' ')), cpu: seconds(f[4]) * 1000 });
      }
      consider(list, Date.now());
    });
  }

  // ---------- staging: a demo runaway a few seconds after the app opens ----------
  function startDemo() {
    if (WIN) {
      // cmd starts it and exits at once, so it's left without a parent as a runaway is; it ends by itself in 3 minutes.
      const loop = `$e = (Get-Date).AddMinutes(3); while ((Get-Date) -lt $e) {} # ${DEMO_MARK}`;
      spawn('cmd.exe', ['/d', '/c', 'start', '""', '/b', 'powershell.exe', '-NoProfile', '-Command', loop], { detached: true, windowsHide: true, stdio: 'ignore' }).unref();
      return;
    }
    const sh = spawn('/bin/sh', ['-c', `/bin/zsh -fc 'end=$((SECONDS + 180)); while (( SECONDS < end )); do :; done; : ${DEMO_MARK}' </dev/null >/dev/null 2>&1 & echo $!`]);
    sh.stdout.on('data', (d) => (demoPid = Number(String(d).trim()) || 0));
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
    // The dashboard's End button: only the process it showed (same pid, same start). Windows ends it at once; elsewhere
    // TERM, then KILL two seconds later if it's still there (a shell ignores TERM).
    end(pid, started) {
      const p = last.get(Number(pid));
      if (!p || Math.abs(p.started - Number(started)) > 1000) return false;
      try {
        process.kill(pid, WIN ? undefined : 'SIGTERM');
      } catch {
        return false;
      }
      if (!WIN) setTimeout(() => {
        const q = last.get(Number(pid));
        if (q && q.started === p.started) {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {}
        }
      }, 2000);
      return true;
    },
  };
}

module.exports = { createRunaways };
