'use strict';
// Whether a process that looks like an AI tool runs that tool's own program, before its time goes to the tool's badge
// (main.js noteToolsAtWork), as the Mac's Vendor.swift. The native Claude Code, Codex and Antigravity for Windows are
// signed by their makers (Authenticode, the publisher below), so another program renamed after one of them doesn't pass
// for it. A tool run as a script (Node, Bun, Deno, Python: an npm install) can't be told apart this way and passes; Gemini
// CLI has no signed program of its own, so it isn't checked. A program is read once, in the background (PowerShell's
// Get-AuthenticodeSignature), and again only when its file changes; until then the tool counts.
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

// The organisation (O=) in each maker's code-signing certificate.
const MAKERS = { claude: 'Anthropic, PBC', codex: 'OpenAI OpCo, LLC', antigravity: 'Google LLC' };
const INTERPRETER = /^(node|bun|deno|python[0-9.]*|pythonw)\.exe$/i;
// A pid's program is looked up again after this long: Windows soon gives a dead process's pid to a new one.
const PID_TTL = 5 * 60_000;
// After PowerShell couldn't answer, the next try; after this many, a program that can't be read doesn't count.
const RETRY = 30_000;
const TRIES = 3;

const byPid = new Map(); // pid -> { file: path or null (no program found), at }
const verdicts = new Map(); // maker|file|size|mtime -> signed by that maker
const failed = new Map(); // verdict key -> { n: reads that failed, at }
const pending = new Set(); // pids and verdict keys being read

// Windows' own PowerShell, by its full path (not whichever powershell.exe comes first on the PATH).
const POWERSHELL = path.join(process.env.SystemRoot || process.env.windir || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

// A short PowerShell script, its values passed in the environment (a path can hold any character), its output as UTF-8.
// Without PSModulePath: one left by PowerShell 7 (the app started from a pwsh terminal) points Windows PowerShell at
// PowerShell 7's modules, which it can't load, and Get-AuthenticodeSignature is then missing.
function ps(script, vars) {
  const full = `try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}\n${script}`;
  const env = {};
  for (const [k, v] of Object.entries(process.env)) if (k.toLowerCase() !== 'psmodulepath') env[k] = v;
  Object.assign(env, vars);
  return new Promise((resolve) => {
    execFile(
      POWERSHELL,
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(full, 'utf16le').toString('base64')],
      { windowsHide: true, timeout: 60_000, env },
      (err, out) => resolve(err ? null : String(out).trim()),
    );
  });
}

// The O= of a certificate's subject (CN="Anthropic, PBC", O="Anthropic, PBC", L=…).
function organisation(subject) {
  const m = /(?:^|,\s*)O=(?:"((?:[^"]|"")*)"|([^,]*))/.exec(subject || '');
  if (!m) return '';
  return m[1] !== undefined ? m[1].replace(/""/g, '"') : m[2].trim();
}

// The program a process runs, as Task Manager reads it (QueryFullProcessImageName with limited query access): Get-Process's
// Path reads the process's own module list, which fails for a Claude run as administrator.
const IMAGE = [
  '$ProgressPreference = "SilentlyContinue"',
  'Add-Type -Namespace AtlVendor -Name Image -MemberDefinition @"',
  '[DllImport("kernel32.dll")] public static extern System.IntPtr OpenProcess(int access, bool inherit, int pid);',
  '[DllImport("kernel32.dll", CharSet = CharSet.Unicode)] public static extern bool QueryFullProcessImageName(System.IntPtr h, int flags, System.Text.StringBuilder name, ref int size);',
  '[DllImport("kernel32.dll")] public static extern bool CloseHandle(System.IntPtr h);',
  '"@',
  '$h = [AtlVendor.Image]::OpenProcess(0x1000, $false, [int]$env:ATL_VENDOR_PID)',
  'if ($h -ne [IntPtr]::Zero) {',
  '  $name = New-Object System.Text.StringBuilder 32768; $size = 32768',
  '  if ([AtlVendor.Image]::QueryFullProcessImageName($h, 0, $name, [ref]$size)) { [Console]::Out.Write($name.ToString()) }',
  '  [void][AtlVendor.Image]::CloseHandle($h)',
  '}',
].join('\n');

function lookUp(pid) {
  if (pending.has(pid)) return;
  pending.add(pid);
  ps(IMAGE, { ATL_VENDOR_PID: String(pid) }).then((out) => {
    pending.delete(pid);
    // No answer at all (PowerShell failed): asked again soon. An empty one: no such process, or no program to read.
    byPid.set(pid, { file: out || null, at: out === null ? Date.now() - PID_TTL + RETRY : Date.now() });
  });
}

function check(maker, file, key) {
  const fail = failed.get(key);
  if (pending.has(key) || (fail && Date.now() - fail.at < RETRY)) return;
  pending.add(key);
  ps('$ProgressPreference = "SilentlyContinue"\n$s = Get-AuthenticodeSignature -LiteralPath $env:ATL_VENDOR_FILE\n[Console]::Out.Write("$($s.Status)`n$($s.SignerCertificate.Subject)")', {
    ATL_VENDOR_FILE: file,
  }).then((out) => {
    pending.delete(key);
    const [status = '', subject = ''] = (out || '').split('\n');
    if (status.trim()) return verdicts.set(key, status.trim() === 'Valid' && organisation(subject) === maker);
    // No answer (PowerShell failed, or the cmdlet did): asked again in a while; one that never reads doesn't count.
    const n = (fail ? fail.n : 0) + 1;
    failed.set(key, { n, at: Date.now() });
    if (n >= TRIES) verdicts.set(key, false);
  });
}

/** Whether the time of `tool` ("claude", "codex", "gemini", "antigravity"), run by process `pid`, counts for its badge. */
function genuine(tool, pid) {
  const maker = MAKERS[tool];
  if (!maker || process.platform !== 'win32') return true;
  if (!Number.isInteger(pid) || pid <= 0) return false;
  // Old pids forgotten now and then (a long day of chats coming and going).
  if (byPid.size > 200) for (const [p, k] of byPid) if (Date.now() - k.at > PID_TTL) byPid.delete(p);
  const known = byPid.get(pid);
  if (!known || Date.now() - known.at > PID_TTL) lookUp(pid);
  if (!known) return true;
  if (!known.file) return false;
  if (INTERPRETER.test(path.basename(known.file))) return true;
  let st;
  try {
    st = fs.statSync(known.file);
  } catch {
    return false;
  }
  const key = `${maker}|${known.file.toLowerCase()}|${st.size}|${st.mtimeMs}`;
  if (verdicts.has(key)) return verdicts.get(key);
  check(maker, known.file, key);
  return true;
}

module.exports = { genuine };
