'use strict';
// Claude's usage limits (the 5-hour and the weekly window) for the dashboard's top bar: the Windows side of the Mac app's
// Limits.swift. Claude Code runs the `statusLine` command from its settings.json on every status update and passes its
// status JSON on stdin; the script keeps the latest one that carries `rate_limits` in `file`, which the engine reads.
// A status line the user had before stays in use: its command moves to `statusline-next` and still gets the JSON.
const fs = require('fs');
const path = require('path');

// PowerShell, as Claude Code can run the command from Git Bash or from cmd; `$input` is the JSON Claude Code pipes in.
const SCRIPT = `# Atalay's Terminal: Claude Code passes its status JSON here (statusLine in its settings.json). The latest one that
# carries the account's usage limits is kept for the dashboard. A status line of your own (statusline-next) still gets
# the JSON and shows what it prints.
$ErrorActionPreference = 'SilentlyContinue'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$json = [Console]::In.ReadToEnd()
if ($json -match '"rate_limits"') {
  $tmp = Join-Path $dir ('limits.' + $PID + '.tmp')
  [IO.File]::WriteAllText($tmp, $json, (New-Object Text.UTF8Encoding($false)))
  Move-Item -Force -LiteralPath $tmp -Destination (Join-Path $dir 'limits.json')
}
$next = Join-Path $dir 'statusline-next'
if ((Test-Path -LiteralPath $next) -and (Get-Item -LiteralPath $next).Length -gt 0) {
  $json | & cmd.exe /d /c ([IO.File]::ReadAllText($next))
}
exit 0
`;

/**
 * createLimits({ dir, claudeDir }): `dir` is the app's data folder (limits.json lands in it), `claudeDir` Claude Code's.
 * install() writes the script and hooks it into Claude Code's settings; it never throws.
 */
function createLimits({ dir, claudeDir }) {
  const scriptFile = path.join(dir, 'statusline.ps1');
  const nextFile = path.join(dir, 'statusline-next');
  const settingsFile = path.join(claudeDir, 'settings.json');
  // Forward slashes: the same command works from Git Bash, cmd and PowerShell.
  const ours = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptFile.replace(/\\/g, '/')}"`;

  function writeScript() {
    let have = null;
    try {
      have = fs.readFileSync(scriptFile, 'utf8');
    } catch {}
    if (have === SCRIPT) return;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(scriptFile, SCRIPT);
  }

  // Points Claude Code's statusLine at the script, or the limits never reach the dashboard. A settings file that doesn't
  // read as JSON is left alone.
  function hook() {
    let settings = {};
    let raw = null;
    try {
      raw = fs.readFileSync(settingsFile, 'utf8');
    } catch {}
    if (raw !== null) {
      try {
        settings = JSON.parse(raw.replace(/^﻿/, ''));
      } catch {
        return;
      }
      if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return;
    }
    const line = settings.statusLine && typeof settings.statusLine === 'object' ? settings.statusLine : {};
    const current = typeof line.command === 'string' ? line.command : '';
    if (current === ours) return;
    if (current) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(nextFile, current);
    }
    settings.statusLine = { ...line, type: 'command', command: ours };
    fs.mkdirSync(claudeDir, { recursive: true });
    const tmp = settingsFile + '.atl.tmp';
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2));
    fs.renameSync(tmp, settingsFile);
  }

  return {
    file: path.join(dir, 'limits.json'),
    install() {
      try {
        writeScript();
        hook();
      } catch (e) {
        console.error('limits:', e.message);
      }
    },
  };
}

module.exports = { createLimits };
