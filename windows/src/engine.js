'use strict';

// The dashboard's data engine, for the Windows app (Electron's main process). Reads Claude Code's folder live: the
// session registry (who is running; busy, idle or waiting) and the transcripts (every prompt, tool call, result and
// token count), and gives the dashboard page (app/Resources/web) the same JSON the Mac app's engine
// (Engine/RadarEngine.swift) gives it, so the page runs unchanged. Read-only: nothing is written under the Claude folder.
//
//   const engine = createEngine({ claudeDir, limitsFile, isAppPid, onInit, onState, onEvents });
//   engine.start();
//
// onInit, onState and onEvents get the JSON text of window.__radar.init(...), .state(...) and .events(...).

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { randomUUID } = require('node:crypto');

const HOME = os.homedir();
const WIN = process.platform === 'win32';
const MIN = 60_000;
const BIG_FILE = 8 << 20;
const CHUNK = 4 << 20;

// ---------- pricing: list price, $ per million tokens ----------
// Cache writes bill 1.25x input (5m TTL) or 2x input (1h TTL); cache reads bill `cr`.
const PRICES = [
  ['claude-fable-5-1', { in: 10, out: 50, cr: 0.25, ctx: 1e6 }],
  ['claude-mythos-5-1', { in: 10, out: 50, cr: 0.25, ctx: 1e6 }],
  ['claude-fable-5', { in: 10, out: 50, cr: 1, ctx: 1e6 }],
  ['claude-mythos-5', { in: 10, out: 50, cr: 1, ctx: 1e6 }],
  ['claude-opus-5-5', { in: 4, out: 20, cr: 0.2, ctx: 1e6 }],
  ['claude-opus-5', { in: 5, out: 25, cr: 0.5, ctx: 1e6 }],
  ['claude-opus-4', { in: 5, out: 25, cr: 0.5, ctx: 1e6 }],
  ['claude-sonnet-5', { in: 2, out: 10, cr: 0.2, ctx: 1e6 }],
  ['claude-sonnet-4', { in: 3, out: 15, cr: 0.3, ctx: 1e6 }],
  ['claude-haiku-5-5', { in: 0.1, out: 0.5, cr: 0.01, ctx: 0, long: { at: 100_000, in: 0.5, out: 2.5, cr: 0.05 } }],
  ['claude-haiku-4-5', { in: 1, out: 5, cr: 0.1, ctx: 2e5 }],
];

function priceFor(model) {
  if (typeof model !== 'string' || !model) return null;
  const hit = PRICES.find(([p]) => model.startsWith(p));
  return hit ? hit[1] : null;
}

// The context a session really works with: its model's window, or less when Claude's auto-compact window is set
// (/autocompact), since Claude compacts at the smaller of the two.
function contextLimit(model, cwd, userSettings) {
  const window = priceFor(model)?.ctx || 0;
  if (!(window > 0)) return window;
  const set = autoCompactWindow(cwd, userSettings);
  return set === null ? window : Math.min(window, set);
}

// The auto-compact window in tokens, as Claude resolves it: CLAUDE_CODE_AUTO_COMPACT_WINDOW, else the
// `autoCompactWindow` setting from the project's local settings, the project's, then the user's ("auto" or none:
// null). The files are read at most every 5 s.
function autoCompactWindow(cwd, userSettings) {
  const env = process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW;
  if (env) {
    const n = tokenCount(env);
    if (n !== null) return n;
  }
  const files = cwd ? [path.join(cwd, '.claude', 'settings.local.json'), path.join(cwd, '.claude', 'settings.json'), userSettings] : [userSettings];
  for (const f of files) {
    const n = compactSetting(f);
    if (n !== null) return n;
  }
  return null;
}

const compactCache = new Map();

// What a settings file says, read again once the cached answer is 5 s old: null when it doesn't set the window.
function compactSetting(file) {
  const now = Date.now();
  const hit = compactCache.get(file);
  if (hit && now - hit.at < 5000) return hit.value;
  let value = null;
  try {
    const v = JSON.parse(fs.readFileSync(file, 'utf8'))?.autoCompactWindow;
    if (typeof v === 'number') value = v < 10_000 ? v * 1000 : v;
    else if (typeof v === 'string') value = tokenCount(v);
  } catch {}
  compactCache.set(file, { value, at: now });
  return value;
}

// "500k", "1M", "200000", or "200" as shorthand for 200k; "auto" or anything else: null.
function tokenCount(text) {
  const t = String(text).trim().toLowerCase();
  const unit = t.endsWith('m') ? 1e6 : t.endsWith('k') ? 1e3 : 1;
  const raw = unit === 1 ? t : t.slice(0, -1);
  const n = raw === '' ? NaN : Number(raw);
  if (!(n > 0)) return null;
  const tokens = n * unit;
  return tokens < 10_000 ? tokens * 1000 : tokens;
}

function costOf(model, u) {
  const p = priceFor(model);
  if (!p) return 0;
  const inp = int(u.input_tokens), out = int(u.output_tokens);
  const cr = int(u.cache_read_input_tokens), cw = int(u.cache_creation_input_tokens);
  const w1h = int(isObj(u.cache_creation) ? u.cache_creation.ephemeral_1h_input_tokens : 0);
  const w5m = Math.max(0, cw - w1h);
  const r = p.long && inp + cr + cw > p.long.at ? p.long : p;
  const speed = u.speed === 'fast' ? 2 : 1;
  return (speed * (inp * r.in + out * r.out + cr * r.cr + w5m * r.in * 1.25 + w1h * r.in * 2)) / 1e6;
}

function savedOf(model, u) {
  const p = priceFor(model);
  return p ? (int(u.cache_read_input_tokens) * (p.in - p.cr)) / 1e6 : 0;
}

function shortModel(m) {
  if (typeof m !== 'string' || !m) return '';
  let s = m.startsWith('claude-') ? m.slice(7) : m;
  s = s.replace(/-\d{8}$/, '');
  s = s.replace(/^([a-z]+)-(\d+)-(\d+)$/, '$1 $2.$3');
  s = s.replace(/^([a-z]+)-(\d+)$/, '$1 $2');
  return s;
}

// ---------- tool categories ----------
const CATS = ['web', 'browser', 'read', 'search', 'edit', 'bash', 'agent', 'mcp', 'plan'];
const CAT_OF = {
  WebSearch: 'web', WebFetch: 'web',
  Read: 'read', NotebookRead: 'read',
  Grep: 'search', Glob: 'search', ToolSearch: 'search', LSP: 'search',
  ListMcpResourcesTool: 'search', ReadMcpResourceTool: 'search', ReadMcpResourceDirTool: 'search',
  Edit: 'edit', Write: 'edit', MultiEdit: 'edit', NotebookEdit: 'edit',
  Bash: 'bash', BashOutput: 'bash', KillShell: 'bash', KillBash: 'bash', Monitor: 'bash', PowerShell: 'bash',
  Agent: 'agent', Task: 'agent', Workflow: 'agent', SendMessage: 'agent', TaskStop: 'agent',
  TaskOutput: 'agent', ListAgents: 'agent',
};

function catOf(name) {
  if (Object.hasOwn(CAT_OF, name)) return CAT_OF[name];
  if (name.startsWith('mcp__claude-in-chrome__') || name.startsWith('mcp__computer') || name === 'computer') return 'browser';
  if (name.startsWith('mcp__')) return 'mcp';
  return 'plan';
}

// ---------- value helpers ----------
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const int = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : 0);
const str = (v) => (typeof v === 'string' ? v : undefined);

// Whitespace runs fold to one space; longer text ends in "…". Counted in code points, so an emoji is never cut in half.
function clip(s, n) {
  if (s == null || s === '') return '';
  const t = String(s).split(/\s+/).filter(Boolean).join(' ');
  if (t.length <= n) return t;
  const chars = Array.from(t);
  return chars.length > n ? chars.slice(0, n - 1).join('') + '…' : t;
}

// The dashboard may end up in a screen recording, so obvious credentials never reach the page.
const SECRET_PATTERNS = [
  /sk-ant-[A-Za-z0-9_-]{10,}/g,
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\blin_(?:api|oauth)_[A-Za-z0-9]{20,}/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}/g,
  /\b[A-Fa-f0-9]{32,}\b/g,
];
const KEY_VALUE = /\b(pass(?:word|wd)?|secret|token|api[_-]?key|apikey|authorization|bearer)(["']?\s*[:=]\s*["']?|\s+)([^\s"'&;]{6,})/gi;
const LONG_TOKEN = /[A-Za-z0-9+=]{32,}/g;

function redact(s) {
  if (s == null || s === '') return '';
  let t = String(s);
  for (const rx of SECRET_PATTERNS) t = t.replace(rx, '‹•••›');
  t = t.replace(KEY_VALUE, (m, k, sep, v) => (v.startsWith('$') ? m : `${k}${sep}‹•••›`));
  t = t.replace(LONG_TOKEN, (m) => (/\d.*\d/.test(m) && /[A-Z].*[A-Z]/.test(m) && /[a-z].*[a-z]/.test(m) ? '‹•••›' : m));
  return t;
}

function parseURL(u) {
  if (typeof u !== 'string') return null;
  try {
    return new URL(u);
  } catch {
    return null;
  }
}

// What Foundation's URL.path gives the Mac engine: percent-decoded, without a trailing slash.
function urlPath(url) {
  let p = url.pathname;
  try {
    p = decodeURIComponent(p);
  } catch {}
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

function hostPath(u) {
  const url = parseURL(u);
  if (!url || !url.hostname) return clip(redact(u), 70);
  const p = urlPath(url);
  return clip(url.hostname.replace(/^www\./, '') + (p === '/' || p === '' ? '' : p), 70);
}

function hostOf(u) {
  const url = parseURL(u);
  return url && url.hostname ? url.hostname.replace(/^www\./, '') : '';
}

// Paths: Claude on Windows writes `C:\Users\…` (sometimes with forward slashes), so both separators split a path there,
// and a label keeps the path's own separator.
const SPLIT = WIN ? /[\\/]/ : '/';
const sepOf = (p) => (WIN && p.includes('\\') ? '\\' : '/');

function shortPath(p) {
  if (p == null || p === '') return '';
  const s = String(p);
  return s.split(SPLIT).filter(Boolean).slice(-2).join(sepOf(s));
}

// The last part of a path, as NSString.lastPathComponent gives it.
function baseName(p) {
  if (p == null || p === '') return '';
  const s = String(p);
  const parts = s.split(SPLIT).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : s.slice(0, 1);
}

function tildify(p) {
  if (p == null || p === '') return '';
  const s = String(p);
  const head = s.slice(0, HOME.length);
  return (WIN ? head.toLowerCase() === HOME.toLowerCase() : head === HOME) ? '~' + s.slice(HOME.length) : s;
}

function cwdLabel(cwd) {
  const t = tildify(cwd);
  const sep = sepOf(t);
  const parts = t.split(sep);
  if (parts.length <= 4) return parts.join(sep);
  return parts.slice(0, 2).join(sep) + sep + '…' + sep + parts.slice(-2).join(sep);
}

function fmtBytes(n) {
  if (n >= 1 << 20) return (n / (1 << 20)).toFixed(1) + 'MB';
  if (n >= 1024) return Math.floor(n / 1024) + 'KB';
  return n + 'B';
}

// Leading and trailing spaces and tabs (Foundation's .whitespaces), not newlines.
const trimWs = (s) => s.replace(/^[\t\p{Zs}]+|[\t\p{Zs}]+$/gu, '');

function summarize(name, input) {
  const i = isObj(input) ? input : {};
  switch (name) {
    case 'WebSearch': return { label: clip(redact(str(i.query)), 90) };
    case 'WebFetch': return { label: hostPath(str(i.url)) };
    case 'Read': case 'NotebookRead': case 'Edit': case 'MultiEdit': case 'Write': {
      const f = str(i.file_path);
      return { label: shortPath(f), file: f };
    }
    case 'NotebookEdit': {
      const f = str(i.notebook_path);
      return { label: shortPath(f), file: f };
    }
    case 'Grep': return { label: clip(`/${str(i.pattern) ?? ''}/ ${shortPath(str(i.path) ?? str(i.glob))}`, 70) };
    case 'Glob': return { label: clip(str(i.pattern), 70) };
    // Claude Code's PowerShell tool (Windows) takes a command and a description as Bash does.
    case 'Bash': case 'PowerShell': return { label: clip(redact(str(i.description) ?? str(i.command)), 90), cmd: clip(redact(str(i.command)), 180) };
    case 'Agent': case 'Task': return { label: clip(str(i.description) ?? str(i.subagent_type) ?? 'agent', 70) };
    case 'Skill': return { label: clip(str(i.skill), 50) };
    case 'ToolSearch': return { label: clip(str(i.query), 60) };
    case 'TodoWrite': return { label: `${Array.isArray(i.todos) ? i.todos.length : 0} todos` };
    case 'Workflow': {
      const sp = str(i.scriptPath);
      return { label: clip(str(i.name) ?? (sp !== undefined ? baseName(sp) : undefined) ?? 'workflow', 60) };
    }
    case 'SendMessage': return { label: clip(`→ ${str(i.to) ?? ''}`, 50) };
    case 'AskUserQuestion': {
      const q = Array.isArray(i.questions) && isObj(i.questions[0]) ? str(i.questions[0].question) : undefined;
      return { label: clip(q, 70) };
    }
  }
  if (name.startsWith('mcp__')) {
    const parts = name.split('__');
    let server = parts.length > 1 ? parts[1] : '';
    if (server.startsWith('claude_ai_')) server = server.slice(10);
    const tool = parts.length > 2 ? parts.slice(2).join('__') : '';
    let extra = '';
    if (str(i.url) !== undefined) extra = hostPath(i.url);
    else if (Array.isArray(i.actions)) extra = `×${i.actions.length}`;
    else if (str(i.action) !== undefined) extra = i.action;
    else if (str(i.query) !== undefined) extra = clip(redact(i.query), 40);
    return { label: clip(`${server}.${tool}${extra ? ' ' + extra : ''}`, 80) };
  }
  return { label: '' };
}

// What a tool's result says in a few words (status code and size, number of search results, a subagent's status), the
// hosts a web search found, and the subagent a Task/Agent call started.
function resultMeta(tr) {
  const out = { meta: '', hosts: [], agentId: null };
  if (!isObj(tr)) return out;
  if (tr.url !== undefined && tr.code !== undefined) {
    const bytes = int(tr.bytes);
    out.meta = `${tr.code}${bytes > 0 ? ' · ' + fmtBytes(bytes) : ''}`;
  } else if (tr.query !== undefined && Array.isArray(tr.results)) {
    const links = tr.results.flatMap((r) => (isObj(r) && Array.isArray(r.content) ? r.content.filter(isObj) : []));
    for (const l of links) {
      const h = hostOf(l.url);
      if (h && !out.hosts.includes(h)) out.hosts.push(h);
      if (out.hosts.length === 4) break;
    }
    out.meta = `${links.length} results`;
  } else if (str(tr.agentId) !== undefined) {
    out.meta = str(tr.status) ?? '';
    out.agentId = tr.agentId;
  } else if (tr.interrupted === true) {
    out.meta = 'interrupted';
  }
  return out;
}

// A Codex tool call as a pending tool: its shell command, the files it patches, or what it looks up on the web.
function codexCall(name, p, at) {
  if (/patch/.test(name)) return { n: 'Edit', c: 'edit', l: 'apply patch', t: at };
  if (/web_search/.test(name)) {
    const a = (p && p.action) || {};
    return { n: 'WebSearch', c: 'web', l: clip(a.query || a.url || 'web search', 120), t: at };
  }
  const input = typeof p.input === 'string' ? p.input : typeof p.arguments === 'string' ? p.arguments : '';
  // `tools.exec_command({"cmd":"…"})`, or the older shell call's {"command":["bash","-lc","…"]}.
  let command = '';
  const m = /"cmd"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(input);
  if (m) {
    try {
      command = JSON.parse(`"${m[1]}"`);
    } catch {
      command = m[1];
    }
  } else {
    try {
      const j = JSON.parse(input);
      if (Array.isArray(j.command)) command = String(j.command[j.command.length - 1] || '');
      // Codex on Windows (shell_command) gives it as it's typed: {"command":"Get-ChildItem"}.
      else if (typeof j.command === 'string') command = j.command;
    } catch {}
  }
  return { n: 'Bash', c: 'bash', l: clip(command || name, 120), t: at };
}

// The lines a tool's log (O.log) got since the last look, parsed (from its last 2 MB when it's long).
function readNewLines(O) {
  let st;
  try {
    st = fs.statSync(O.log);
  } catch {
    return [];
  }
  if (st.size <= (O.logOffset || 0)) return [];
  const from = Math.max(O.logOffset || 0, st.size > 2 << 20 ? st.size - (2 << 20) : 0);
  const buf = Buffer.alloc(st.size - from);
  const fd = fs.openSync(O.log, 'r');
  try {
    fs.readSync(fd, buf, 0, buf.length, from);
  } finally {
    fs.closeSync(fd);
  }
  const end = buf.lastIndexOf(0x0a);
  if (end < 0) return [];
  O.logOffset = from + end + 1;
  const out = [];
  for (const line of buf.subarray(0, end).toString('utf8').split('\n')) {
    try {
      out.push(JSON.parse(line));
    } catch {}
  }
  return out;
}

// node:sqlite (Electron's Node has it); without it, Antigravity's planets keep their CPU-made status.
let sqlite = null;
try {
  sqlite = require('node:sqlite');
} catch {}

// A read-only connection to one of Antigravity's databases: while it has it open (its write-ahead log beside it), as any
// reader; otherwise (the log merged in and gone; it opens its conversations' only to write) as it stands.
function agyOpen(file) {
  if (!sqlite || !fs.existsSync(file)) return null;
  const { pathToFileURL } = require('url');
  const asItStands = () => new sqlite.DatabaseSync(new URL(`${pathToFileURL(file).href}?immutable=1`), { readOnly: true });
  const ways = fs.existsSync(`${file}-wal`) ? [() => new sqlite.DatabaseSync(file, { readOnly: true }), asItStands] : [asItStands];
  for (const open of ways) {
    let db = null;
    try {
      db = open();
      db.exec('SELECT 1 FROM sqlite_master LIMIT 1');
      return db;
    } catch {
      try {
        if (db) db.close();
      } catch {}
    }
  }
  return null;
}

function agyClose(db) {
  try {
    db.close();
  } catch {}
}

// Antigravity's newest conversation in `cwd` (its folders are file:// addresses, decoded to compare).
function agyConversation(db, cwd) {
  const { fileURLToPath } = require('url');
  const same = (uri) => {
    try {
      const p = path.resolve(fileURLToPath(uri));
      return process.platform === 'win32' ? p.toLowerCase() === path.resolve(cwd).toLowerCase() : p === path.resolve(cwd);
    } catch {
      return false;
    }
  };
  let rows = [];
  try {
    rows = db.prepare('SELECT conversation_id, title, status, workspace_uris FROM conversation_summaries WHERE nesting_depth = 0 ORDER BY last_modified_time DESC LIMIT 40').all();
  } catch {}
  for (const r of rows) {
    let uris = [];
    try {
      uris = JSON.parse(r.workspace_uris);
    } catch {}
    if (Array.isArray(uris) && uris.some(same)) return r;
  }
  return null;
}

// A conversation's steps not over yet, from its own database (the transcript only gets a step once it's done): the
// first that runs or waits to (a tool's), and the first WAITING for the user's permission. Null: it can't be read.
// Its step statuses: 1 pending, 2 running, 9 waiting, 11 queued (3 done; 8 the model still writing its reply).
function agySteps(root, id) {
  const db = agyOpen(path.join(root, 'conversations', `${id}.db`));
  if (!db) return null;
  try {
    const rows = db.prepare('SELECT idx, status FROM steps WHERE status IN (1, 2, 9, 11) ORDER BY idx').all();
    const waiting = rows.find((r) => Number(r.status) === 9);
    return { open: rows.length ? Number(rows[0].idx) : null, waiting: waiting ? Number(waiting.idx) : null };
  } catch {
    return null;
  } finally {
    agyClose(db);
  }
}

// The tool call a step runs: a reply's calls run in order, a step each, right after it.
function agyPlanned(plan, step) {
  const k = step - plan.idx - 1;
  return k >= 0 && k < plan.calls.length ? plan.calls[k] : null;
}

function agyCall(plan, step) {
  const call = step == null ? null : agyPlanned(plan, step);
  return call ? agyTool(call, plan.ts) : null;
}

// What the user asked in an Antigravity step: the request, without what Antigravity adds to it (the time…).
function agyRequest(content) {
  const s = String(content || '');
  const m = /<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/.exec(s);
  return (m ? m[1] : s).trim();
}

// An Antigravity tool call's argument as it was meant: its transcript writes each as JSON (a string in quotes, a list…).
function agyValue(v) {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function agyArg(v) {
  const d = agyValue(v);
  if (d == null) return null;
  if (Array.isArray(d)) return d.map(agyArg).filter((x) => x != null).join(', ');
  return typeof d === 'object' ? JSON.stringify(d) : String(d);
}

const AGY_LABEL_KEYS = ['CommandLine', 'Command', 'command', 'Query', 'query', 'queries', 'Url', 'url', 'Uri', 'AbsolutePath', 'TargetFile', 'File', 'path', 'SearchPath', 'DirectoryPath', 'Role', 'ServerName', 'toolSummary', 'Prompt'];

// An Antigravity tool call as Claude's tools are shown: its kind (a shell, the web, a file…) and what it's on.
function agyTool(call, at) {
  const name = String(call.name || 'tool');
  const args = call.args || {};
  let what = name;
  for (const k of AGY_LABEL_KEYS) {
    const v = agyArg(args[k]);
    if (v) {
      what = v;
      break;
    }
  }
  let n = name, c = 'plan';
  if (['run_command', 'read_terminal', 'send_command_input', 'command_status'].includes(name)) [n, c] = ['Bash', 'bash'];
  else if (name === 'search_web') [n, c] = ['WebSearch', 'web'];
  else if (name === 'read_url_content' || name === 'view_content_chunk') [n, c] = ['WebFetch', 'web'];
  else if (name.startsWith('browser_') || name.endsWith('_browser_url') || name.endsWith('_browser_page') || name === 'capture_browser_screenshot') [n, c] = ['Browser', 'browser'];
  else if (['view_file', 'view_file_outline', 'view_code_item', 'list_dir'].includes(name)) [n, c] = ['Read', 'read'];
  else if (['grep_search', 'find_by_name', 'codebase_search'].includes(name)) [n, c] = ['Grep', 'search'];
  else if (/write|replace|edit/.test(name)) [n, c] = ['Edit', 'edit'];
  else if (name === 'invoke_subagent') [n, c] = ['Agent', 'agent'];
  else if (name.startsWith('mcp')) [n, c] = ['MCP', 'mcp'];
  return { n, c, l: clip(what, 120), t: at };
}

// A subagent's whole transcript (it's short): when it started and last moved, what it was asked, its last reply's tool
// calls, and its counts (tools, errors, web, tokens), as Claude's subagents have them.
function agyLog(file, mtime) {
  const log = { mtime, firstTs: 0, lastTs: 0, prompt: '', plan: null, tools: 0, errors: 0, web: 0, tokIn: 0, tokOut: 0, tokCache: 0 };
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return log;
  }
  for (const line of text.split('\n')) {
    let j;
    try {
      j = JSON.parse(line);
    } catch {
      continue;
    }
    const ts = parseISO(j.created_at) || 0;
    if (!log.firstTs) log.firstTs = ts;
    log.lastTs = Math.max(log.lastTs, ts);
    if (j.status === 'ERROR') log.errors++;
    if (j.type === 'SYSTEM_MESSAGE' && !log.prompt) {
      // The session's message to it: what it was asked.
      const s = String(j.content || '');
      const at = s.indexOf(' content=');
      if (at >= 0) log.prompt = s.slice(at + 9).replace('</SYSTEM_MESSAGE>', '').trim();
    } else if (j.type === 'USER_INPUT' && !log.prompt) {
      log.prompt = agyRequest(j.content);
    } else if (j.type === 'PLANNER_RESPONSE') {
      const calls = Array.isArray(j.tool_calls) ? j.tool_calls : [];
      log.plan = calls.length ? { idx: Number(j.step_index) || 0, calls, ts } : null;
      log.tools += calls.length;
      log.web += calls.filter((call) => ['web', 'browser'].includes(agyTool(call, ts).c)).length;
      log.tokIn += Number(j.input_tokens) || 0;
      log.tokOut += Number(j.output_tokens) || 0;
      log.tokCache += Number(j.cache_read_tokens) || 0;
    }
  }
  return log;
}

// The newest Codex log of the last week begun in `cwd` and written since `since` (ms).
function codexLog(cwd, since) {
  const root = path.join(process.env.CODEX_HOME || path.join(HOME, '.codex'), 'sessions');
  const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
  let found = null;
  for (let back = 0; back < 7; back++) {
    const d = new Date(Date.now() - back * 86_400_000);
    const dir = path.join(root, String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0'));
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith('.jsonl')) continue;
      const file = path.join(dir, name);
      let st;
      try {
        st = fs.statSync(file);
      } catch {
        continue;
      }
      if (st.mtimeMs < since - 5000 || (found && st.mtimeMs <= found.mtime)) continue;
      try {
        const fd = fs.openSync(file, 'r');
        const head = Buffer.alloc(Math.min(st.size, 64 << 10));
        fs.readSync(fd, head, 0, head.length, 0);
        fs.closeSync(fd);
        const meta = JSON.parse(head.toString('utf8').split('\n')[0]);
        if (meta && meta.payload && meta.payload.cwd && same(meta.payload.cwd, cwd)) found = { file, mtime: st.mtimeMs };
      } catch {}
    }
  }
  return found ? found.file : null;
}

// ---------- time ----------
// Parses "2026-10-24T19:41:07.123Z" into epoch milliseconds, as UTC whatever the suffix (as the Mac engine does).
function parseISO(s) {
  if (typeof s !== 'string' || s.length < 20) return 0;
  const num = (a, b) => Number(s.slice(a, b));
  let ms = 0;
  if (s.length > 20 && s[19] === '.') {
    let scale = 100;
    for (let k = 20; k < s.length; k++) {
      const d = s.charCodeAt(k) - 48;
      if (d < 0 || d > 9) break;
      ms += d * scale;
      scale /= 10;
    }
  }
  const t = Date.UTC(num(0, 4), num(5, 7) - 1, num(8, 10), num(11, 13), num(14, 16), num(17, 19));
  return Number.isFinite(t) ? t + ms : 0;
}

function dayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ---------- chat window history (transcriptItems) ----------
// Longer, newline-preserving text for a chat window's body.
function fullText(s, n) {
  if (s == null) return '';
  const t = redact(String(s)).replace(/\r/g, '').trim();
  if (t.length <= n) return t;
  const chars = Array.from(t);
  return chars.length > n ? chars.slice(0, n - 1).join('') + '…' : t;
}

function toolDetail(name, input) {
  const i = isObj(input) ? input : {};
  switch (name) {
    case 'Bash': case 'PowerShell': return fullText(i.command, 800);
    case 'WebSearch': return fullText(i.query, 300);
    case 'WebFetch': return hostPath(str(i.url));
    case 'Read': case 'Edit': case 'MultiEdit': case 'Write': return tildify(str(i.file_path) || '');
    case 'NotebookEdit': return tildify(str(i.notebook_path) || '');
    case 'Grep': return fullText(`${str(i.pattern) || ''}${str(i.path) ? '  in ' + tildify(i.path) : ''}`, 300);
    case 'Glob': return fullText(i.pattern, 300);
    case 'Agent': case 'Task': return fullText(str(i.description) || i.prompt, 300);
    case 'TodoWrite':
      return (Array.isArray(i.todos) ? i.todos : []).slice(0, 8).filter(isObj).map((t) => `${t.status === 'completed' ? '☒' : '☐'} ${clip(t.content, 90)}`).join('\n');
    default: return '';
  }
}

function outputPreview(b, tr) {
  let text = '';
  if (isObj(tr)) {
    if (typeof tr.stdout === 'string' || typeof tr.stderr === 'string') text = tr.stdout || tr.stderr || '';
    else if (isObj(tr.file) && tr.file.numLines) return `${tr.file.numLines} lines`;
    else if (tr.type === 'create') return 'created';
    else if (tr.structuredPatch) return 'updated';
  }
  if (!text) {
    const c = b.content;
    if (typeof c === 'string') text = c;
    else if (Array.isArray(c)) text = c.filter((x) => isObj(x) && x.type === 'text').map((x) => x.text).join('\n');
  }
  const lines = String(text).split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
  return fullText(lines.slice(0, 3).join('\n'), 320);
}

// The last records of a transcript as a chat window shows them: prompts, replies, tool calls with their results.
async function parseTail(fp, start, size) {
  const fh = await fsp.open(fp, 'r');
  let data;
  try {
    const buf = Buffer.allocUnsafe(size - start);
    const { bytesRead } = await fh.read(buf, 0, buf.length, start);
    data = buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
  const items = [];
  const byId = new Map();
  let off = 0;
  if (start > 0) {
    const nl = data.indexOf(10);
    off = nl < 0 ? data.length : nl + 1;
  }
  let slice = Date.now();
  while (off < data.length) {
    let nl = data.indexOf(10, off);
    if (nl < 0) nl = data.length;
    const rec = nl > off && !skipped(data, off, nl) ? parseLine(data, off, nl) : null;
    off = nl + 1;
    // A wide tail is many megabytes of JSON: the event loop gets a turn every few milliseconds.
    if (Date.now() - slice > 12) {
      await new Promise(setImmediate);
      slice = Date.now();
    }
    if (!rec || rec.isSidechain) continue;
    const t = parseISO(rec.timestamp);
    const content = isObj(rec.message) ? rec.message.content : undefined;
    if (rec.type === 'assistant') {
      for (const b of Array.isArray(content) ? content : []) {
        if (!isObj(b)) continue;
        if (b.type === 'text' && typeof b.text === 'string' && b.text.trim()) items.push({ k: 'say', t, x: fullText(b.text, 4000) });
        else if (b.type === 'tool_use') {
          const name = typeof b.name === 'string' ? b.name : '?';
          const it = { k: 'tool', t, id: b.id, n: name, c: catOf(name), l: summarize(name, b.input).label, x: toolDetail(name, b.input) };
          byId.set(b.id, it);
          items.push(it);
        }
      }
    } else if (rec.type === 'user') {
      if (typeof content === 'string' || (Array.isArray(content) && !content.some((b) => isObj(b) && b.type === 'tool_result'))) {
        const raw = typeof content === 'string' ? content : content.filter((b) => isObj(b) && b.type === 'text').map((b) => b.text).join(' ');
        const p = String(raw || '').trim();
        if (!rec.isMeta && p && !p.startsWith('<') && !p.startsWith('Caveat:') && !p.startsWith('[Request interrupted')) items.push({ k: 'prompt', t, x: fullText(p, 4000) });
      } else if (Array.isArray(content)) {
        for (const b of content) {
          if (!isObj(b) || b.type !== 'tool_result') continue;
          const it = byId.get(b.tool_use_id);
          if (!it) continue;
          it.ok = b.is_error !== true;
          it.d = t && it.t ? Math.max(0, t - it.t) : null;
          it.m = resultMeta(rec.toolUseResult).meta;
          it.o = outputPreview(b, rec.toolUseResult);
        }
      }
    } else if (rec.type === 'system' && rec.subtype === 'compact_boundary') {
      items.push({ k: 'sys', t, x: 'context compacted' });
    }
  }
  return items;
}

// ---------- transcript lines ----------
// Records the dashboard never looks at, recognised in the first bytes of their line and not parsed at all.
const SKIP_TYPES = ['attachment', 'file-history-snapshot', 'progress', 'queue-operation', 'permission-mode', 'atis-latch'].map((t) => Buffer.from(`"type":"${t}"`));
const DATA_KEY = Buffer.from('"data":"');
const CWD_KEY = Buffer.from('"cwd":"');
const AI_TITLE = Buffer.from('"type":"ai-title"');
const LAST_PROMPT = Buffer.from('"type":"last-prompt"');

function skipped(data, off, end) {
  const head = data.subarray(off, Math.min(end, off + 600));
  return SKIP_TYPES.some((t) => head.indexOf(t) !== -1);
}

// Screenshots sit in transcripts as base64 (86% of a busy day's bytes) and nothing here reads them, so long
// `"data":"…"` strings are dropped before parsing instead of being decoded into strings.
function withoutImages(line) {
  const parts = [];
  let i = 0;
  for (;;) {
    const hit = line.indexOf(DATA_KEY, i);
    if (hit < 0) {
      parts.push(line.subarray(i));
      break;
    }
    const open = hit + DATA_KEY.length;
    parts.push(line.subarray(i, open));
    let close = line.indexOf(0x22, open);
    if (close < 0) close = line.length;
    if (close - open <= 1024) parts.push(line.subarray(open, close));
    i = close;
  }
  return Buffer.concat(parts);
}

function parseLine(data, off, end) {
  const text = end - off > 32 << 10 ? withoutImages(data.subarray(off, end)).toString('utf8') : data.toString('utf8', off, end);
  try {
    const rec = JSON.parse(text);
    return isObj(rec) ? rec : null;
  } catch {
    return null;
  }
}

// Binary search for the byte offset where records reach `since`, so huge transcripts load fast.
async function seekTime(fp, size, since) {
  const fh = await fsp.open(fp, 'r');
  try {
    const probe = async (pos) => {
      const len = Math.min(2 << 20, size - pos);
      const buf = Buffer.allocUnsafe(len);
      const { bytesRead } = await fh.read(buf, 0, len, pos);
      const data = buf.subarray(0, bytesRead);
      const nl = data.indexOf(10);
      if (nl < 0) return null;
      const s = data.toString('utf8', nl + 1, Math.min(data.length, nl + 1 + (256 << 10)));
      const m = /"timestamp":"(\d{4}-\d\d-\d\dT[^"]+)"/.exec(s);
      return m ? parseISO(m[1]) : null;
    };
    let lo = 0, hi = size;
    for (let i = 0; i < 32 && hi - lo > 1 << 20; i++) {
      const mid = Math.floor((lo + hi) / 2);
      const t = await probe(mid);
      if (t !== null && t < since) lo = mid;
      else hi = mid;
    }
    return lo;
  } finally {
    await fh.close();
  }
}

// The first record's cwd is where the chat started; `claude --resume` must run from there, later records follow any
// `cd` the session made. A resumed conversation can open with 100 KB and more of file-history snapshots before the
// first record that has one, so the head is read further when its first 64 KB have none (the Mac app's sidebar stops
// there and falls back to the tail). With none in the first 8 MB, the newest one in the tail. Bounded reads, so it
// can answer at once.
function readFirstCwd(fp) {
  let fd;
  try {
    fd = fs.openSync(fp, 'r');
    const size = fs.fstatSync(fd).size;
    const lines = (from, count) => {
      const buf = Buffer.allocUnsafe(Math.max(0, Math.min(count, size - from)));
      const data = buf.subarray(0, fs.readSync(fd, buf, 0, buf.length, from));
      const parts = [];
      for (let off = 0; off < data.length; ) {
        let nl = data.indexOf(10, off);
        if (nl < 0) nl = data.length;
        if (nl > off) parts.push(data.subarray(off, nl));
        off = nl + 1;
      }
      if (from > 0) parts.shift();
      return parts;
    };
    const cwdOf = (line) => {
      if (line.subarray(0, 800).indexOf(CWD_KEY) < 0) return null;
      try {
        const rec = JSON.parse(line.toString('utf8'));
        return isObj(rec) && typeof rec.cwd === 'string' ? rec.cwd : null;
      } catch {
        return null;
      }
    };
    for (const count of size > 64 << 10 ? [64 << 10, 8 << 20] : [64 << 10]) {
      for (const line of lines(0, count)) {
        const cwd = cwdOf(line);
        if (cwd !== null) return cwd;
      }
    }
    for (const line of lines(size > 96 << 10 ? size - (96 << 10) : 0, 96 << 10).reverse()) {
      const cwd = cwdOf(line);
      if (cwd !== null) return cwd;
    }
    return null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
  }
}

// A saved conversation for the chats list (the Mac's readTail): where it started, its title and its last prompt. The
// first record with a cwd is read from the head in steps, up to 8 MB (a resumed or compacted conversation can open with
// records that have none, well past the first 64 KB; stopping short resumed the chat in its last folder instead); the
// title and the last prompt from the tail, else from the head. False when the file couldn't be read.
async function readChat(item) {
  let fh;
  try {
    fh = await fsp.open(item.path, 'r');
  } catch {
    return false;
  }
  const size = item.size;
  const read = async (from, count) => {
    const buf = Buffer.allocUnsafe(Math.max(0, Math.min(count, size - from)));
    const { bytesRead } = await fh.read(buf, 0, buf.length, from);
    return buf.subarray(0, bytesRead);
  };
  const lines = (data, from) => {
    const parts = [];
    for (let off = 0; off < data.length; ) {
      let nl = data.indexOf(10, off);
      if (nl < 0) nl = data.length;
      if (nl > off) parts.push(data.subarray(off, nl));
      off = nl + 1;
    }
    if (from > 0) parts.shift();
    return parts;
  };
  const parse = (line) => {
    try {
      const rec = JSON.parse(line.toString('utf8'));
      return isObj(rec) ? rec : null;
    } catch {
      return null;
    }
  };
  const scan = (list) => {
    for (let i = list.length - 1; i >= 0; i--) {
      if (item.title && item.lastPrompt && item.cwd) return;
      const head = list[i].subarray(0, 800);
      const isTitle = head.indexOf(AI_TITLE) >= 0, isPrompt = head.indexOf(LAST_PROMPT) >= 0;
      if (!isTitle && !isPrompt && (item.cwd || head.indexOf(CWD_KEY) < 0)) continue;
      const rec = parse(list[i]);
      if (!rec) continue;
      // The list sits on the dashboard, which may be on a stream: no credentials, as everywhere on it.
      if (isTitle && !item.title && typeof rec.aiTitle === 'string') item.title = clip(redact(rec.aiTitle), 90);
      if (isPrompt && !item.lastPrompt && typeof rec.lastPrompt === 'string') item.lastPrompt = clip(redact(rec.lastPrompt), 160);
      if (!item.cwd && typeof rec.cwd === 'string') item.cwd = rec.cwd;
    }
  };
  try {
    item.cwd = '';
    item.title = '';
    item.lastPrompt = '';
    let rest = null;
    for (let off = 0; !item.cwd && off < Math.min(size, 8 << 20); ) {
      const chunk = await read(off, 256 << 10);
      if (!chunk.length) break;
      off += chunk.length;
      const data = rest ? Buffer.concat([rest, chunk]) : chunk;
      const nl = data.lastIndexOf(10);
      if (nl < 0) {
        rest = data;
        continue;
      }
      rest = data.subarray(nl + 1);
      for (const line of lines(data.subarray(0, nl), 0)) {
        if (line.subarray(0, 800).indexOf(CWD_KEY) < 0) continue;
        const rec = parse(line);
        if (rec && typeof rec.cwd === 'string') {
          item.cwd = rec.cwd;
          break;
        }
      }
    }
    const tail = size > 96 << 10 ? size - (96 << 10) : 0;
    scan(lines(await read(tail, 96 << 10), tail));
    if (!item.title && !item.lastPrompt && size > 96 << 10) scan(lines(await read(0, 96 << 10), 0));
    return true;
  } catch {
    return false;
  } finally {
    await fh.close().catch(() => {});
  }
}

// ---------- usage limits ----------
// Claude's usage limits, the 5-hour and the weekly window, as Claude Code's status line reports them: the app keeps
// the latest status JSON that carries `rate_limits` in `limitsFile`, so nothing here needs Claude's credentials.
// `{fiveHour: {pct, resetsAt}, week: {pct, resetsAt}, at}` with times in ms, or null if nothing was reported yet.
function parseLimits(file, mtime) {
  let j;
  try {
    j = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
  const rl = isObj(j) ? j.rate_limits : null;
  if (!isObj(rl)) return null;
  const window = (w) => {
    if (!isObj(w) || typeof w.used_percentage !== 'number') return null;
    const reset = typeof w.resets_at === 'number' ? w.resets_at : 0;
    return { pct: w.used_percentage, resetsAt: reset < 1e12 ? reset * 1000 : reset };
  };
  return { fiveHour: window(rl.five_hour), week: window(rl.seven_day), at: mtime };
}

// ---------- processes ----------
// process.kill(pid, 0) checks without signalling, on Windows too; EPERM means it runs as someone else.
function alive(pid) {
  if (!(pid > 0)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

// Every process's parent, for telling the app's own chats from the rest, and on Windows when each started (see
// RadarEngine's `verified`). The Mac engine asks the kernel (Proc.swift); Node has no such call, so this asks the
// system's process list, and only when a new Claude process shows up: { parents: pid -> ppid, starts: pid -> FILETIME }.
function processTable() {
  return new Promise((resolve) => {
    const done = (err, out) => {
      if (err && !out) return resolve(null);
      const parents = new Map();
      const starts = new Map();
      for (const line of String(out).split(/\r?\n/)) {
        const m = /^\s*(\d+)\s+(\d+)(?:\s+(\d+))?\s*$/.exec(line);
        if (!m) continue;
        parents.set(Number(m[1]), Number(m[2]));
        if (m[3]) starts.set(Number(m[1]), Number(m[3]));
      }
      resolve(parents.size ? { parents, starts } : null);
    };
    if (WIN) {
      const exe = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      // The start as a FILETIME (100 ns since 1601, UTC), as Claude writes procStart; the system's own processes have none.
      const script = "Get-CimInstance Win32_Process | ForEach-Object { '{0} {1} {2}' -f $_.ProcessId, $_.ParentProcessId, $(if ($_.CreationDate) { $_.CreationDate.ToFileTimeUtc() } else { '' }) }";
      execFile(exe, ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 20_000, maxBuffer: 8 << 20 }, done);
    } else {
      execFile('ps', ['-A', '-o', 'pid=,ppid='], { timeout: 10_000, maxBuffer: 8 << 20 }, done);
    }
  });
}

// A process's parent, grandparent and so on, nearest first. Claude on Windows can sit a few levels under the shell
// (claude.cmd -> cmd.exe -> node.exe).
function ancestors(pid, parents) {
  const chain = [];
  for (let p = parents.get(pid); p > 0 && p !== pid && !chain.includes(p) && chain.length < 16; p = parents.get(p)) chain.push(p);
  return chain;
}

// Two process starts (FILETIMEs) are one when they're 2 ms apart at most: the process list has them to the microsecond.
const sameStart = (a, b) => Math.abs(a - b) < 20_000;

// ---------- model ----------
// Shared counters for a session or one of its subagents (today only).
class Track {
  constructor() {
    this.tokIn = 0; this.tokOut = 0; this.tokCr = 0; this.tokCw = 0;
    this.cost = 0; this.tools = 0; this.errors = 0; this.web = 0; this.prompts = 0;
    this.byCat = {};
    this.spark = new Map();
    // Tool calls waiting for their result, by tool_use id, oldest first: { n, c, l, t }.
    this.pending = new Map();
    this.last = null;
    this.sig = [];
    this.model = '';
    this.endTurn = false;
    this.firstTs = 0;
    this.lastTs = 0;
  }

  resetCounters() {
    this.tokIn = 0; this.tokOut = 0; this.tokCr = 0; this.tokCw = 0;
    this.cost = 0; this.tools = 0; this.errors = 0; this.web = 0; this.prompts = 0;
    this.byCat = {};
    this.spark = new Map();
  }

  addTok(i, o, r, w) {
    this.tokIn += i; this.tokOut += o; this.tokCr += r; this.tokCw += w;
  }

  tokDict() {
    return { in: this.tokIn, out: this.tokOut, cr: this.tokCr, cw: this.tokCw };
  }

  pendingSet(id, p) {
    this.pending.delete(id);
    this.pending.set(id, p);
  }

  get isLoop() {
    const s = this.sig;
    return s.length >= 3 && s.slice(-3).every((x) => x === s[s.length - 1]);
  }
}

class Session extends Track {
  constructor(id) {
    super();
    this.id = id;
    this.name = ''; this.title = ''; this.lastPrompt = ''; this.cwd = ''; this.branch = ''; this.effort = '';
    this.live = false;
    this.reg = null;
    this.waitingFor = null;
    this.statusSince = 0;
    this.pid = null;
    // `updatedAt` of the registry entry that carries this chat. Two live processes can hold one conversation (a
    // `--resume` that didn't fork); the one updated last carries the card.
    this.regUpdated = 0;
    this.tty = null;
    this.cpu = 0;
    this.mem = 0;
    this.kind = ''; this.entry = '';
    this.ctx = 0; this.ctxMax = 0; this.turnMs = 0; this.endedAt = 0;
    // What isAppPid said for this session's process or one of its parents (a tab id or true): a chat in the app.
    this.hostTab = null;
    // The session this conversation continues in: Claude resumed it under a new session id.
    this.supersededBy = null;
  }
}

class SubAgent extends Track {
  constructor(sid, id) {
    super();
    this.key = `${sid}:${id}`;
    this.id = id;
    this.sid = sid;
    this.desc = ''; this.type = ''; this.bg = false;
  }
}

class FileHeat {
  constructor(p) {
    this.p = p;
    this.r = 0; this.w = 0; this.last = 0;
    this.editors = new Map(); // session id, or `${session}:${agent}` -> { t, s, a }
  }
}

function freshGlobals() {
  return {
    cost: 0, saved: 0,
    tokIn: 0, tokOut: 0, tokCr: 0, tokCw: 0,
    tools: 0, errors: 0, prompts: 0, web: 0, turns: 0, turnMs: 0,
    byCat: Object.fromEntries(CATS.map((c) => [c, 0])),
    lastByCat: {},
    research: [], shells: [], ticker: [],
    files: new Map(),
    minutes: new Map(), // minute -> { tools, tok, cost, cats }
    byModel: new Map(), // short model -> { model, priced, tokIn, tokOut, tokCr, tokCw, cost, calls }
  };
}

const LOGGED = new Set(['tool', 'prompt', 'say', 'sys']);
const STATUS_ORDER = { waiting: 0, idle: 1, busy: 2, ended: 3 };
const REG_FILE = /^\d+\.json$/;
const SID = /^[A-Za-z0-9-]{8,64}$/;

function report(e) {
  console.error('engine:', e && e.stack ? e.stack : e);
}

// ---------- the engine ----------
class RadarEngine {
  constructor(opts) {
    this.claudeDir = opts.claudeDir || process.env.CLAUDE_CONFIG_DIR || path.join(HOME, '.claude');
    this.projects = path.join(this.claudeDir, 'projects');
    this.registry = path.join(this.claudeDir, 'sessions');
    this.userSettings = path.join(this.claudeDir, 'settings.json');
    this.limitsFile = opts.limitsFile || null;
    this.isAppPid = typeof opts.isAppPid === 'function' ? opts.isAppPid : null;
    this.handlers = { onInit: opts.onInit, onState: opts.onState, onEvents: opts.onEvents, onHistory: opts.onHistory };

    this.started = false;
    this.stopped = false;
    this.booted = false;
    this.initWanted = false;
    this.day0 = dayStart();
    this.sessions = new Map();
    // Other AI tools running (Codex, Antigravity…), by session id ("ai:<pid>:<start>"): see setOthers.
    this.others = new Map();
    this.agents = new Map();
    this.cursors = new Map();
    this.seenMsg = new Set();
    // Session of every record uuid seen. A forked session starts its transcript with a copy of the parent's history;
    // counting it again duplicated research items and flagged the parent's files as collisions. A session repeating
    // another one's records continues that chat.
    this.recOwner = new Map();
    this.agentHints = new Map(); // Agent tool_use id -> { desc, type }
    this.log = [];
    this.logIndex = new Map();
    this.outbox = [];
    this.G = freshGlobals();
    // Usage limits last read from the status line's file, by the file's mtime.
    this.limits = { mtime: -1, json: null };
    // Sessions ended from the dashboard or a chat window, by the pid of the Claude that was ended (0 if none ran).
    this.dismissed = new Map();
    // Registry file name -> what it said last time, so unchanged files are not re-read.
    this.regCache = new Map();
    // Claude pid -> its parents, nearest first (see processTable).
    this.chains = new Map();
    // Registry entry ("pid:procStart") -> whether the process under that pid is the Claude that wrote it. Windows gives
    // a dead process's pid to a new one soon, so the file of a Claude that was killed would otherwise keep its session
    // live for whatever runs under the pid now. `checking`: entries waiting for the next process list.
    this.verified = new Map();
    this.checking = new Set();
    this.procBusy = false;
    this.procRetryAt = 0;
    this.firstCwd = new Map();
    this.bootPumps = [];
    this.timers = [];
    this.watchers = { projects: null, registry: null };
    this.lastRun = {};
    this.lastScan = 0;
    this.scanning = false;
    this.regTimer = null;
    this.flushTimer = null;
    this.stateDirty = true;
    this.lastStateJSON = '';
    this.lastStateAt = 0;
    // The chats list's saved conversations by session id (scanHistory), and the scan's own bookkeeping.
    this.history = new Map();
    this.historyBusy = false;
    this.historyAgain = false;
    this.historyTimer = null;
  }

  // ----- public API -----

  start() {
    if (this.started || this.stopped) return;
    this.started = true;
    this.boot().catch(report);
  }

  stop() {
    this.stopped = true;
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    clearTimeout(this.regTimer);
    clearTimeout(this.flushTimer);
    clearTimeout(this.historyTimer);
    for (const k of Object.keys(this.watchers)) {
      try {
        this.watchers[k]?.close();
      } catch {}
      this.watchers[k] = null;
    }
  }

  requestInit() {
    if (this.booted) this.sendInit();
    else this.initWanted = true;
  }

  // The user ended this session: it leaves the dashboard now, instead of once Claude has exited and then another 30
  // minutes as "ended", where a click would resume it again. It comes back if the conversation is resumed later
  // (another Claude process).
  dismiss(sessionId, pid) {
    if (typeof sessionId !== 'string' || !sessionId) return;
    this.dismissed.set(sessionId, pid > 0 ? pid : 0);
    this.stateDirty = true;
    this.publishState();
  }

  // For Source Control: the folders today's sessions work in, then the folders of the files they wrote today (Claude
  // often works in a parent folder and edits the repos under it).
  gitSources() {
    const out = new Set();
    for (const S of this.sessions.values()) if (S.cwd && (S.live || S.lastTs >= this.day0)) out.add(S.cwd);
    for (const F of this.G.files.values()) if (F.w > 0 && path.isAbsolute(F.p)) out.add(path.dirname(F.p));
    return [...out];
  }

  // Source Control's view (git.js): today's sessions as the Mac's GitBridge lists them on their repos (the session
  // cards' chips), and the files they wrote with who wrote each (the ✦ on a file a Claude session edited).
  gitSessions() {
    const now = Date.now();
    const bySession = this.agentsBySession();
    const out = [];
    for (const S of this.sessions.values()) {
      if (!S.cwd || !(S.live || S.lastTs >= this.day0)) continue;
      out.push({ id: S.id, name: S.name || S.id.slice(0, 8), title: S.title || '', status: this.shownStatus(S, bySession.get(S.id) || [], now), live: !!S.live, cwd: S.cwd });
    }
    return out;
  }

  written() {
    const out = {};
    for (const F of this.G.files.values()) {
      if (F.w > 0 && path.isAbsolute(F.p)) out[F.p] = [...new Set([...F.editors.values()].map((e) => e.s))];
    }
    return out;
  }

  // The chats Claude Code's registry has running now, with the status the dashboard shows for each.
  live() {
    const now = Date.now();
    const bySession = this.agentsBySession();
    const out = [];
    for (const S of this.sessions.values()) {
      if (!S.live || S.pid == null) continue;
      out.push({
        sessionId: S.id, pid: S.pid, cwd: S.cwd, status: this.shownStatus(S, bySession.get(S.id) || [], now),
        name: S.name || S.id.slice(0, 8), title: S.title || '', host: this.hostLabel(S), tab: typeof S.hostTab === 'string' ? S.hostTab : null,
      });
    }
    // The other AI tools (`ai`: no conversation to resume, nor one a new chat window should take for its own).
    for (const O of this.others.values()) {
      if (O.endedAt > 0) continue;
      out.push({
        sessionId: O.id, pid: O.pid, cwd: O.cwd, status: this.otherStatus(O).status, name: O.tool, title: O.title || O.prompt || baseName(O.cwd),
        host: O.hostTab != null ? 'app' : 'term', tab: typeof O.hostTab === 'string' ? O.hostTab : null, ai: true,
      });
    }
    return out;
  }

  // Where a conversation started (its transcript's first record), the folder `claude --resume` must run in.
  sessionCwd(sessionId) {
    if (!SID.test(String(sessionId || ''))) return null;
    if (this.firstCwd.has(sessionId)) return this.firstCwd.get(sessionId);
    const fp = this.transcriptPath(sessionId);
    const cwd = fp ? readFirstCwd(fp) : null;
    if (cwd) this.firstCwd.set(sessionId, cwd);
    return cwd;
  }

  // A chat window's history: the last `limit` prompts, replies and tool calls of the conversation.
  async transcriptItems(sessionId, limit = 140) {
    if (!SID.test(String(sessionId || ''))) return [];
    const n = Number.isInteger(limit) && limit > 0 ? limit : 140;
    const fp = this.transcriptPath(sessionId);
    if (!fp) return [];
    const st = await fsp.stat(fp).catch(() => null);
    if (!st) return [];
    // Screenshots and big tool outputs make lines huge, so widen the tail until enough items show up.
    let items = [];
    for (let span = 2 << 20; ; span *= 2) {
      const start = Math.max(0, st.size - span);
      items = await parseTail(fp, start, st.size);
      if (items.length >= n || start === 0 || span >= 64 << 20) break;
    }
    return items.slice(-n);
  }

  // ----- boot & timers -----

  async boot() {
    const t0 = Date.now();
    this.pollRegistry();
    for (const fp of this.bootPumps.splice(0)) await this.pump(fp);
    const files = new Set(await this.collectFiles(this.day0));
    for (const S of this.sessions.values()) if (S.live) files.add(this.transcriptFor(S.cwd, S.id));
    // Oldest transcript first, so copied history is credited to the session that made it, not its fork.
    const born = new Map();
    await Promise.all([...files].map(async (fp) => {
      const st = await fsp.stat(fp).catch(() => null);
      born.set(fp, st ? st.birthtimeMs : Infinity);
    }));
    const order = [...files].sort((a, b) => (born.get(a) === born.get(b) ? 0 : born.get(a) < born.get(b) ? -1 : 1));
    for (const fp of order) {
      if (this.stopped) return;
      if (born.get(fp) !== Infinity) await this.pump(fp);
    }
    if (this.stopped) return;
    this.settleRings();
    this.booted = true;
    this.pollProcesses();
    console.log(`engine: indexed ${files.size} transcripts in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    if (this.initWanted) this.sendInit();
    this.scanHistory(true).catch(report);
    this.startWatch();
    this.lastScan = Date.now();
    for (const k of ['registry', 'recent', 'scan']) this.lastRun[k] = Date.now();
    // The watches deliver transcript and registry changes as they happen; these timers are only safety nets, and the
    // way changes arrive where a watch couldn't start or broke (then at the old server's pace).
    this.every(1, () => {
      const w = this.watchers;
      if (this.due('registry', w.registry ? 5000 : 1000)) this.pollRegistry();
      if (this.due('recent', w.projects ? 10_000 : 2000)) this.pumpRecent();
      if (this.due('scan', w.projects ? 60_000 : 10_000)) this.scanNew();
      this.publishState();
    });
    this.every(3, () => this.pollProcesses());
    this.every(60, () => {
      this.maybeNewDay();
      this.startWatch();
    });
    this.every(120, () => this.scanHistory(false));
  }

  every(seconds, fn) {
    this.timers.push(setInterval(() => {
      if (this.stopped) return;
      try {
        const r = fn();
        if (r && typeof r.catch === 'function') r.catch(report);
      } catch (e) {
        report(e);
      }
    }, seconds * 1000));
  }

  due(name, ms) {
    const now = Date.now();
    if (now - (this.lastRun[name] || 0) < ms) return false;
    this.lastRun[name] = now;
    return true;
  }

  pumpRecent() {
    const now = Date.now();
    for (const c of this.cursors.values()) {
      if (now - (this.sessions.get(c.sid ?? '')?.lastTs ?? 0) < 30 * MIN) this.pumpSoon(c.path);
    }
  }

  async scanNew() {
    if (this.scanning) return;
    this.scanning = true;
    try {
      const since = this.lastScan - 5000;
      this.lastScan = Date.now();
      for (const fp of await this.collectFiles(since)) this.pumpSoon(fp);
    } finally {
      this.scanning = false;
    }
  }

  // Starts the watches that aren't running (the folders may not exist yet on a new install).
  startWatch() {
    if (this.stopped) return;
    const watch = (key, dir, opts, onChange) => {
      if (this.watchers[key]) return;
      try {
        const w = fs.watch(dir, opts, onChange);
        w.on('error', () => {
          try {
            w.close();
          } catch {}
          if (this.watchers[key] === w) this.watchers[key] = null;
        });
        this.watchers[key] = w;
      } catch {}
    };
    watch('projects', this.projects, { recursive: true }, (_event, name) => {
      if (!name || !String(name).endsWith('.jsonl')) return;
      const fp = path.join(this.projects, String(name));
      // A transcript the engine wasn't reading: a new chat, or an old one resumed, for the chats list.
      if (!this.cursors.has(this.cursorKey(fp))) this.historySoon();
      this.pumpSoon(fp);
    });
    watch('registry', this.registry, {}, () => this.registryChanged());
  }

  registryChanged() {
    if (this.regTimer || this.stopped) return;
    this.regTimer = setTimeout(() => {
      this.regTimer = null;
      if (this.stopped) return;
      try {
        this.pollRegistry();
        this.publishState();
      } catch (e) {
        report(e);
      }
    }, 50);
  }

  // ----- the chats list (the Mac's scanHistory) -----

  // A new transcript: the list scans again a little later, once its first records (cwd, prompt) are written.
  historySoon() {
    if (this.historyTimer || this.stopped) return;
    this.historyTimer = setTimeout(() => {
      this.historyTimer = null;
      this.scanHistory(false).catch(report);
    }, 8000);
  }

  // Every saved conversation (a transcript right under a project's folder), read again only when it changed. The list
  // gets the ones with a folder and a title or prompt, newest first. A scan asked for while one runs follows it.
  async scanHistory(force) {
    if (this.historyBusy) {
      this.historyAgain = true;
      return;
    }
    this.historyBusy = true;
    try {
      do {
        this.historyAgain = false;
        let changed = force;
        force = false;
        const present = new Set();
        let dirs = [];
        try {
          dirs = await fsp.readdir(this.projects, { withFileTypes: true });
        } catch {}
        for (const d of dirs) {
          if (this.stopped) return;
          if (!d.isDirectory()) continue;
          const dir = path.join(this.projects, d.name);
          let names = [];
          try {
            names = await fsp.readdir(dir);
          } catch {
            continue;
          }
          for (const n of names) {
            if (!n.endsWith('.jsonl')) continue;
            const sid = n.slice(0, -6);
            present.add(sid);
            const fp = path.join(dir, n);
            const st = await fsp.stat(fp).catch(() => null);
            if (!st) continue;
            const old = this.history.get(sid);
            if (old && old.mtime === st.mtimeMs && old.size === st.size) continue;
            const item = { id: sid, path: fp, cwd: '', mtime: st.mtimeMs, size: st.size, title: '', lastPrompt: '' };
            // Unreadable for a moment (Claude writing it): kept as it was, and read again next time.
            if (!(await readChat(item))) continue;
            this.history.set(sid, item);
            changed = true;
          }
        }
        for (const sid of this.history.keys()) {
          if (present.has(sid)) continue;
          this.history.delete(sid);
          changed = true;
        }
        if (changed && !this.stopped) {
          const items = [...this.history.values()]
            .filter((i) => i.cwd && (i.title || i.lastPrompt))
            .sort((a, b) => b.mtime - a.mtime)
            .map(({ id, cwd, mtime, size, title, lastPrompt }) => ({ id, cwd, mtime, size, title, lastPrompt }));
          this.call('onHistory', items);
        }
      } while (this.historyAgain && !this.stopped);
    } finally {
      this.historyBusy = false;
    }
  }

  maybeNewDay() {
    const d = dayStart();
    if (d === this.day0) return;
    this.day0 = d;
    this.G = freshGlobals();
    this.seenMsg.clear();
    this.recOwner.clear();
    for (const S of this.sessions.values()) S.resetCounters();
    for (const A of this.agents.values()) A.resetCounters();
  }

  // ----- lookup helpers -----

  session(sid) {
    let S = this.sessions.get(sid);
    if (!S) this.sessions.set(sid, (S = new Session(sid)));
    return S;
  }

  agent(sid, aid) {
    const key = `${sid}:${aid}`;
    let A = this.agents.get(key);
    if (!A) this.agents.set(key, (A = new SubAgent(sid, aid)));
    return A;
  }

  agentsBySession() {
    const m = new Map();
    for (const A of this.agents.values()) {
      if (!m.has(A.sid)) m.set(A.sid, []);
      m.get(A.sid).push(A);
    }
    return m;
  }

  minute(ts) {
    const k = Math.floor(ts / MIN);
    let m = this.G.minutes.get(k);
    if (!m) this.G.minutes.set(k, (m = { tools: 0, tok: 0, cost: 0, cats: {} }));
    return m;
  }

  ev(k, ts, S, A, extra = {}) {
    const e = { ...extra, k, t: ts, s: S.id };
    if (A) e.a = A.id;
    return e;
  }

  emit(e, today) {
    if (!today) return;
    const k = e.k;
    if (k === 'result') {
      const entry = this.logIndex.get(e.id);
      if (entry) {
        entry.ok = e.ok;
        if (e.d !== undefined) entry.d = e.d;
        entry.m = e.m;
      }
    } else if (LOGGED.has(k)) {
      // The log keeps its own copy: a result fills in the logged call, not the event still waiting in the outbox.
      const entry = { ...e };
      this.log.push(entry);
      if (k === 'tool' && typeof e.id === 'string') this.logIndex.set(e.id, entry);
      if (this.booted && this.log.length > 240) {
        const x = this.log.shift();
        if (typeof x.id === 'string') this.logIndex.delete(x.id);
      }
    }
    if (!this.booted) return;
    this.outbox.push(e);
    this.stateDirty = true;
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this.flushEvents();
      }, 120);
    }
  }

  ringPush(arr, item, n) {
    arr.push(item);
    if (this.booted && arr.length > n) arr.shift();
  }

  // Rings fill out of order while boot reads file after file, so they are trimmed by time once at the end.
  settleRings() {
    const byT = (a, b) => (a.t || 0) - (b.t || 0);
    this.log.sort(byT);
    if (this.log.length > 240) this.log.splice(0, this.log.length - 240);
    this.logIndex.clear();
    for (const e of this.log) if (typeof e.id === 'string') this.logIndex.set(e.id, e);
    const G = this.G;
    G.research = G.research.sort(byT).slice(-60);
    G.shells = G.shells.sort(byT).slice(-40);
    G.ticker = G.ticker.sort(byT).slice(-200);
  }

  // ----- transcript ingestion -----

  ingest(rec, c) {
    const sid = str(rec.sessionId) ?? c.sid;
    if (!sid) return;
    const uuid = str(rec.uuid);
    if (uuid !== undefined) {
      const owner = this.recOwner.get(uuid);
      if (owner !== undefined) {
        // Already seen in another session: Claude Code starts a new session id when a compacted or still open
        // conversation is resumed, and repeats its records there. The older one is the same chat.
        const O = this.sessions.get(owner);
        if (owner !== sid && !c.agentId && O && O.supersededBy == null) {
          O.supersededBy = sid;
          this.stateDirty = true;
        }
        return;
      }
      this.recOwner.set(uuid, sid);
    }
    const ts = parseISO(rec.timestamp);
    const S = this.session(sid);
    const aid = c.agentId ?? (rec.isSidechain === true ? str(rec.agentId) ?? null : null);
    const A = aid != null ? this.agent(sid, aid) : null;
    const today = ts >= this.day0;
    if (ts > 0) {
      S.lastTs = Math.max(S.lastTs, ts);
      if (S.firstTs === 0 || ts < S.firstTs) S.firstTs = ts;
      if (A) {
        A.lastTs = Math.max(A.lastTs, ts);
        if (A.firstTs === 0 || ts < A.firstTs) A.firstTs = ts;
      }
    }
    if (!S.cwd && typeof rec.cwd === 'string') S.cwd = rec.cwd;
    if (!A && typeof rec.gitBranch === 'string' && rec.gitBranch !== 'HEAD') S.branch = rec.gitBranch;

    switch (rec.type) {
      case 'ai-title':
        if (typeof rec.aiTitle === 'string') S.title = clip(redact(rec.aiTitle), 90);
        break;
      case 'last-prompt':
        if (!A && typeof rec.lastPrompt === 'string') S.lastPrompt = clip(redact(rec.lastPrompt), 220);
        break;
      case 'assistant':
        this.onAssistant(rec, S, A, ts, today);
        break;
      case 'user':
        this.onUser(rec, S, A, ts, today);
        break;
      case 'system':
        this.onSystem(rec, S, A, ts, today);
        break;
    }
  }

  onAssistant(rec, S, A, ts, today) {
    const actor = A || S;
    const m = isObj(rec.message) ? rec.message : {};
    const model = str(m.model);
    const content = Array.isArray(m.content) ? m.content.filter(isObj) : [];
    if (rec.isApiErrorMessage === true || model === '<synthetic>') {
      const txt = clip(redact(content.map((b) => str(b.text)).filter((x) => x !== undefined).join(' ')), 100);
      this.emit(this.ev('sys', ts, S, A, { l: txt || 'API error', err: true }), today);
      return;
    }
    if (model !== undefined) {
      actor.model = model;
      if (!A) S.model = model;
    }
    if (!A && typeof rec.effort === 'string') S.effort = rec.effort;

    const u = m.usage;
    const mid = str(m.id);
    if (isObj(u) && mid !== undefined && !this.seenMsg.has(mid)) {
      this.seenMsg.add(mid);
      const i = int(u.input_tokens), o = int(u.output_tokens);
      const r = int(u.cache_read_input_tokens), w = int(u.cache_creation_input_tokens);
      if (!A) {
        S.ctx = i + r + w;
        S.ctxMax = contextLimit(model, S.cwd, this.userSettings);
      }
      if (today) {
        const G = this.G;
        const c = costOf(model, u);
        S.addTok(i, o, r, w);
        S.cost += c;
        if (A) {
          A.addTok(i, o, r, w);
          A.cost += c;
        }
        G.tokIn += i; G.tokOut += o; G.tokCr += r; G.tokCw += w;
        G.cost += c;
        G.saved += savedOf(model, u);
        const mk = shortModel(model) || '?';
        let bm = G.byModel.get(mk);
        if (!bm) G.byModel.set(mk, (bm = { model: mk, priced: priceFor(model) !== null, tokIn: 0, tokOut: 0, tokCr: 0, tokCw: 0, cost: 0, calls: 0 }));
        bm.tokIn += i; bm.tokOut += o; bm.tokCr += r; bm.tokCw += w;
        bm.cost += c;
        bm.calls += 1;
        const mb = this.minute(ts);
        mb.tok += i + o + r + w;
        mb.cost += c;
        this.emit(this.ev('usage', ts, S, A, { out: o, cr: r, cw: w, in: i, c, m: mk }), today);
      }
    }
    if (typeof m.stop_reason === 'string') actor.endTurn = m.stop_reason === 'end_turn';
    for (const b of content) {
      switch (b.type) {
        case 'tool_use':
          this.onToolUse(b, S, A, ts, today);
          break;
        case 'text':
          if (typeof b.text === 'string' && b.text.trim()) this.emit(this.ev('say', ts, S, A, { l: clip(redact(b.text), 160) }), today);
          break;
        case 'thinking':
          this.emit(this.ev('think', ts, S, A), today);
          break;
      }
    }
  }

  onToolUse(b, S, A, ts, today) {
    const actor = A || S;
    const name = typeof b.name === 'string' ? b.name : '?';
    const id = typeof b.id === 'string' ? b.id : randomUUID();
    const c = catOf(name);
    const sm = summarize(name, b.input);
    const p = { n: name, c, l: sm.label, t: ts };
    actor.pendingSet(id, p);
    actor.last = p;
    actor.sig.push(`${name}|${sm.label}`);
    if (actor.sig.length > 4) actor.sig.shift();
    if (!today) return;

    for (const x of A ? [S, A] : [S]) {
      x.tools += 1;
      x.byCat[c] = (x.byCat[c] || 0) + 1;
      if (c === 'web') x.web += 1;
    }
    const sk = Math.floor(ts / 20_000);
    S.spark.set(sk, (S.spark.get(sk) || 0) + 1);
    const G = this.G;
    G.tools += 1;
    G.byCat[c] = (G.byCat[c] || 0) + 1;
    if (ts >= (G.lastByCat[c]?.t ?? 0)) G.lastByCat[c] = { l: sm.label, t: ts, s: S.id };
    const mb = this.minute(ts);
    mb.tools += 1;
    mb.cats[c] = (mb.cats[c] || 0) + 1;
    this.ringPush(G.ticker, { id, t: ts, c, st: 'run', n: name }, 200);
    if (c === 'web') {
      G.web += 1;
      const r = { id, t: ts, s: S.id, kind: name === 'WebSearch' ? 'search' : 'fetch', l: sm.label, m: '', ok: null, d: null, hosts: [] };
      if (A) r.a = A.id;
      this.ringPush(G.research, r, 60);
    }
    if (name === 'Bash' || name === 'PowerShell') {
      const r = { id, t: ts, s: S.id, l: sm.label, cmd: sm.cmd ?? '', ok: null, d: null };
      if (A) r.a = A.id;
      this.ringPush(G.shells, r, 40);
    }
    if (sm.file !== undefined) this.touchFile(sm.file, name, S, A, ts);
    if ((name === 'Agent' || name === 'Task') && isObj(b.input)) {
      this.agentHints.set(id, { desc: clip(str(b.input.description), 70), type: str(b.input.subagent_type) ?? '' });
    }
    this.emit(this.ev('tool', ts, S, A, { id, n: name, c, l: sm.label }), today);
  }

  touchFile(fp, name, S, A, ts) {
    let F = this.G.files.get(fp);
    if (!F) this.G.files.set(fp, (F = new FileHeat(fp)));
    if (name === 'Read' || name === 'NotebookRead') {
      F.r += 1;
    } else {
      F.w += 1;
      F.editors.set(A ? `${S.id}:${A.id}` : S.id, { t: ts, s: S.id, a: A ? A.id : null });
    }
    F.last = ts;
  }

  onUser(rec, S, A, ts, today) {
    const content = isObj(rec.message) ? rec.message.content : undefined;
    if (typeof content === 'string') {
      if (!A) this.onPrompt(content, rec, S, ts, today);
      return;
    }
    if (!Array.isArray(content)) return;
    let hasResult = false;
    const texts = [];
    for (const b of content) {
      if (!isObj(b)) continue;
      if (b.type === 'tool_result') {
        hasResult = true;
        this.onToolResult(b, rec, S, A, ts, today);
      } else if (b.type === 'text' && typeof b.text === 'string') {
        texts.push(b.text);
      }
    }
    if (!hasResult && texts.length && !A) this.onPrompt(texts.join(' '), rec, S, ts, today);
  }

  onPrompt(text, rec, S, ts, today) {
    if (rec.isMeta === true) return;
    const t = text.trim();
    if (!t) return;
    if (t.startsWith('[Request interrupted')) {
      this.emit(this.ev('sys', ts, S, null, { l: 'interrupted by user', err: true }), today);
      return;
    }
    if (t.startsWith('<task-notification')) {
      this.emit(this.ev('sys', ts, S, null, { l: 'background task reported back' }), today);
      return;
    }
    if (t.startsWith('<') || t.startsWith('Caveat:')) {
      const cmd = /<command-name>([^<]+)<\/command-name>/.exec(t);
      if (cmd) this.emit(this.ev('prompt', ts, S, null, { l: trimWs(cmd[1]), cmd: true }), today);
      return;
    }
    S.endTurn = false;
    if (today) {
      S.prompts += 1;
      this.G.prompts += 1;
    }
    this.emit(this.ev('prompt', ts, S, null, { l: clip(redact(t), 180) }), today);
  }

  onToolResult(b, rec, S, A, ts, today) {
    const actor = A || S;
    const id = b.tool_use_id;
    if (typeof id !== 'string') return;
    const p = actor.pending.get(id) || S.pending.get(id) || null;
    actor.pending.delete(id);
    S.pending.delete(id);
    const ok = b.is_error !== true;
    const d = p ? (ts > 0 ? Math.max(0, ts - p.t) : 0) : null;
    const tr = rec.toolUseResult;
    const { meta, hosts, agentId } = resultMeta(tr);
    if (agentId !== null) {
      const sub = this.agent(S.id, agentId);
      const hint = this.agentHints.get(id);
      if (!sub.desc) sub.desc = clip(str(tr.description) ?? hint?.desc, 70);
      if (!sub.type && hint?.type !== undefined) sub.type = hint.type;
      if (!sub.model && typeof tr.resolvedModel === 'string') sub.model = tr.resolvedModel;
    }
    if (!today) return;
    const G = this.G;
    if (!ok) {
      actor.errors += 1;
      if (A) S.errors += 1;
      G.errors += 1;
    }
    const tk = G.ticker.findLast((x) => x.id === id);
    if (tk) tk.st = ok ? 'ok' : 'err';
    const rs = G.research.findLast((x) => x.id === id);
    if (rs) Object.assign(rs, { ok, d, m: meta, hosts });
    const sh = G.shells.findLast((x) => x.id === id);
    if (sh) Object.assign(sh, { ok, d });
    const extra = { id, ok, m: meta };
    if (p) {
      extra.n = p.n;
      extra.c = p.c;
    }
    if (d !== null) extra.d = d;
    this.emit(this.ev('result', ts, S, A, extra), today);
  }

  onSystem(rec, S, A, ts, today) {
    const subtype = str(rec.subtype);
    if (subtype === 'turn_duration' && typeof rec.durationMs === 'number') {
      const ms = rec.durationMs;
      if (!A) S.turnMs = ms;
      if (today) {
        this.G.turns += 1;
        this.G.turnMs += ms;
      }
      this.emit(this.ev('turn', ts, S, null, { d: ms }), today);
    } else if (subtype === 'compact_boundary') {
      this.emit(this.ev('sys', ts, S, null, { l: 'context compacted' }), today);
    } else if (rec.level === 'error' || subtype === 'api_error') {
      this.emit(this.ev('sys', ts, S, null, { l: clip(redact(str(rec.content) ?? subtype), 100), err: true }), today);
    }
  }

  // ----- transcript files -----

  // NTFS doesn't care about case, so on Windows one transcript reached by two spellings keeps one read cursor.
  cursorKey(fp) {
    return WIN ? fp.toLowerCase() : fp;
  }

  newCursor(fp) {
    const c = { path: fp, off: 0, rest: null, sid: null, agentId: null, started: false, skipLine: false, busy: false, again: false };
    const rel = path.relative(this.projects, fp);
    const parts = !rel || rel.startsWith('..') || path.isAbsolute(rel) ? [] : rel.split(path.sep);
    if (parts.length === 2) {
      c.sid = parts[1].replace(/\.jsonl$/, '');
    } else if (parts.length >= 3) {
      c.sid = parts[1];
      c.agentId = parts[parts.length - 1].replace(/\.jsonl$/, '').replace(/^agent-/, '');
      this.loadAgentMeta(fp, c);
    }
    return c;
  }

  // A subagent's transcript has its description, type and model next to it. Read before its records, so those win
  // where they say more (the model it actually ran on).
  loadAgentMeta(fp, c) {
    let meta;
    try {
      meta = JSON.parse(fs.readFileSync(fp.replace(/\.jsonl$/, '.meta.json'), 'utf8'));
    } catch {
      return;
    }
    if (!isObj(meta)) return;
    const A = this.agent(c.sid, c.agentId);
    if (typeof meta.description === 'string') A.desc = clip(meta.description, 70);
    if (typeof meta.agentType === 'string') A.type = meta.agentType;
    if (typeof meta.model === 'string' && meta.model !== 'inherit') A.model = meta.model;
    A.bg = meta.requestShape === 'background';
  }

  // During boot, transcripts the registry points at are read first and in order; afterwards each read runs on its own.
  pumpSoon(fp) {
    if (this.booted) this.pump(fp).catch(report);
    else this.bootPumps.push(fp);
  }

  // Reads what was appended to a transcript since the last time, in chunks, and ingests every whole line. A read that
  // is asked for while one runs on the same file is done right after it.
  async pump(fp) {
    const key = this.cursorKey(fp);
    let c = this.cursors.get(key);
    if (!c) this.cursors.set(key, (c = this.newCursor(fp)));
    if (c.busy) {
      c.again = true;
      return;
    }
    c.busy = true;
    try {
      do {
        c.again = false;
        const st = await fsp.stat(c.path).catch(() => null);
        if (!st || this.stopped) return;
        if (st.size < c.off) {
          c.off = 0;
          c.rest = null;
        }
        if (!c.started) {
          c.started = true;
          if (st.size > BIG_FILE) {
            c.off = await seekTime(c.path, st.size, this.day0 - 10 * MIN);
            c.skipLine = c.off > 0;
          }
        }
        if (st.size > c.off) await this.readFrom(c, st.size);
      } while (c.again && !this.stopped);
    } catch {
      // Locked or removed for a moment: read again on the next change or poll.
    } finally {
      c.busy = false;
    }
  }

  async readFrom(c, size) {
    const fh = await fsp.open(c.path, 'r');
    try {
      let pos = c.off;
      while (pos < size && !this.stopped) {
        const want = Math.min(CHUNK, size - pos);
        const buf = Buffer.allocUnsafe(want);
        const { bytesRead } = await fh.read(buf, 0, want, pos);
        if (!bytesRead) break;
        pos += bytesRead;
        let data = buf.subarray(0, bytesRead);
        if (c.rest) data = Buffer.concat([c.rest, data]);
        c.rest = null;
        let start = 0;
        if (c.skipLine) {
          const nl = data.indexOf(10);
          if (nl < 0) continue;
          start = nl + 1;
          c.skipLine = false;
        }
        const lastNL = data.lastIndexOf(10);
        if (lastNL < start) {
          c.rest = Buffer.from(data.subarray(start));
          continue;
        }
        c.rest = lastNL + 1 < data.length ? Buffer.from(data.subarray(lastNL + 1)) : null;
        this.ingestLines(data, start, lastNL, c);
      }
      c.off = pos;
    } finally {
      await fh.close();
    }
  }

  ingestLines(data, start, end, c) {
    for (let off = start; off < end; ) {
      let nl = data.indexOf(10, off);
      if (nl < 0 || nl > end) nl = end;
      if (nl > off && !skipped(data, off, nl)) {
        const rec = parseLine(data, off, nl);
        if (rec) this.ingest(rec, c);
      }
      off = nl + 1;
    }
  }

  async collectFiles(since) {
    const out = [];
    const walk = async (dir, depth) => {
      let ents;
      try {
        ents = await fsp.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of ents) {
        const p = path.join(dir, e.name);
        if (e.name.endsWith('.jsonl')) {
          const st = await fsp.stat(p).catch(() => null);
          if (st && st.mtimeMs >= since) out.push(p);
        } else if (depth < 6 && e.name !== 'memory' && !e.name.includes('.') && e.isDirectory()) {
          await walk(p, depth + 1);
        }
      }
    };
    await walk(this.projects, 0);
    return out;
  }

  // Claude Code names a project's folder after its cwd with every character but ASCII letters and digits made '-'
  // (`C:\Users\x\repo` -> `C--Users-x-repo`), per UTF-16 unit as JavaScript does it.
  transcriptFor(cwd, sid) {
    return path.join(this.projects, String(cwd || '').replace(/[^A-Za-z0-9]/g, '-'), `${sid}.jsonl`);
  }

  transcriptPath(sid) {
    for (const c of this.cursors.values()) if (c.sid === sid && !c.agentId) return c.path;
    const S = this.sessions.get(sid);
    if (S?.cwd) {
      const fp = this.transcriptFor(S.cwd, sid);
      if (fs.existsSync(fp)) return fp;
    }
    let dirs = [];
    try {
      dirs = fs.readdirSync(this.projects);
    } catch {}
    for (const d of dirs) {
      const fp = path.join(this.projects, d, `${sid}.jsonl`);
      if (fs.existsSync(fp)) return fp;
    }
    return null;
  }

  // ----- live registry + processes -----

  // Claude Code keeps one small JSON file per running process in sessions/<pid>.json. Unchanged files (same mtime)
  // are not read again.
  pollRegistry() {
    let names = [];
    try {
      names = fs.readdirSync(this.registry);
    } catch {}
    const seen = new Set();
    const present = new Set();
    for (const n of names) {
      if (!REG_FILE.test(n)) continue;
      present.add(n);
      const file = path.join(this.registry, n);
      let st;
      try {
        st = fs.statSync(file);
      } catch {
        continue;
      }
      const cached = this.regCache.get(n);
      if (cached && cached.mtime === st.mtimeMs) {
        if (!cached.chat || !this.running(cached.pid, cached.procStart)) continue;
        seen.add(cached.sid);
        const S = this.sessions.get(cached.sid);
        const owner = S ? S.pid : null;
        if (owner === cached.pid || (owner != null && alive(owner))) {
          if (S && (S.reg === 'idle' || S.reg === 'shell') && S.pending.size) {
            S.pending.clear();
            this.stateDirty = true;
          }
          continue;
        }
        // The process that carried this chat is gone; this one holds the same conversation: read it again.
      }
      let j;
      try {
        j = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        continue; // half written: read again next time
      }
      if (!isObj(j) || typeof j.sessionId !== 'string' || typeof j.pid !== 'number') continue;
      const sid = j.sessionId;
      const pid = Math.trunc(j.pid);
      // Only the user's chats: Claude Code also registers background jobs and daemons (`kind`), pre-started spare
      // processes and sessions hosted inside another session.
      const chat = (str(j.kind) ?? 'interactive') === 'interactive' && j.spare !== true && !str(j.hostSessionId);
      // Same process, new session id: Claude moved this chat on (e.g. after compacting), not a new chat.
      if (cached && cached.pid === pid && cached.sid !== sid && chat) {
        const old = this.sessions.get(cached.sid);
        if (old) old.supersededBy = sid;
      }
      // When this Claude's process started (a Windows FILETIME): see `verified`.
      const procStart = WIN && typeof j.procStart === 'string' && /^\d+$/.test(j.procStart) ? j.procStart : null;
      this.regCache.set(n, { mtime: st.mtimeMs, sid, pid, chat, procStart });
      if (!chat || !this.running(pid, procStart)) continue;
      seen.add(sid);
      const S = this.session(sid);
      // A second live process on this conversation that was updated earlier doesn't take the card over.
      const updated = typeof j.updatedAt === 'number' ? j.updatedAt : 0;
      if (S.live && S.pid != null && S.pid !== pid && alive(S.pid) && S.regUpdated > updated) continue;
      S.regUpdated = updated;
      this.stateDirty = true;
      S.live = true;
      S.pid = pid;
      if (typeof j.name === 'string') S.name = j.name;
      S.reg = str(j.status) ?? 'busy';
      S.waitingFor = str(j.waitingFor) ?? null;
      S.statusSince = typeof j.statusUpdatedAt === 'number' ? j.statusUpdatedAt : typeof j.updatedAt === 'number' ? j.updatedAt : S.statusSince;
      S.kind = str(j.kind) ?? '';
      S.entry = str(j.entrypoint) ?? '';
      if (!S.cwd && typeof j.cwd === 'string') S.cwd = j.cwd;
      if (S.firstTs === 0) S.firstTs = typeof j.startedAt === 'number' ? j.startedAt : 0;
      if (S.reg === 'idle' || S.reg === 'shell') S.pending.clear();
      const fp = this.transcriptFor(S.cwd, sid);
      if (!this.cursors.has(this.cursorKey(fp)) && fs.existsSync(fp)) this.pumpSoon(fp);
    }
    for (const n of this.regCache.keys()) if (!present.has(n)) this.regCache.delete(n);
    const entries = new Set([...this.regCache.values()].map((c) => `${c.pid}:${c.procStart}`));
    for (const key of this.verified.keys()) if (!entries.has(key)) this.verified.delete(key);
    for (const S of this.sessions.values()) {
      if (S.live && !seen.has(S.id)) {
        S.live = false;
        S.reg = null;
        S.hostTab = null;
        S.endedAt = Date.now();
        this.stateDirty = true;
      }
    }
  }

  // A registry entry's Claude is running: its pid is alive and, where the entry says when that Claude started
  // (procStart, on Windows), the process under the pid started then (see `verified`). An entry not matched to the
  // process list yet waits for the next one (pollProcesses asks for it) instead of showing a session that may be a ghost.
  running(pid, procStart) {
    const key = `${pid}:${procStart}`;
    if (!alive(pid)) {
      this.verified.delete(key);
      return false;
    }
    if (!procStart) return true;
    const ok = this.verified.get(key);
    if (ok !== undefined) return ok;
    // No process list to be had for now (see pollProcesses): taken as it is.
    if (Date.now() < this.procRetryAt) return true;
    if (!this.checking.has(key)) {
      this.checking.add(key);
      // Asked for at once rather than at the next round, so a new chat shows within a moment.
      setImmediate(() => !this.stopped && this.pollProcesses());
    }
    return false;
  }

  // The Mac engine reads each live Claude's parent, terminal, CPU and memory from the kernel here. Node can't, so only
  // the parents are looked up (once per Claude process, see processTable), for the app's own chats, with when each
  // started for the registry's new entries; cpu and mem stay 0 and tty null, which the page shows as nothing.
  pollProcesses() {
    const pids = new Set();
    for (const S of this.sessions.values()) if (S.live && S.pid != null) pids.add(S.pid);
    // /autocompact changed the window mid-session: the gauge follows within seconds, not at Claude's next reply.
    for (const S of this.sessions.values()) {
      if (!S.live || !S.model) continue;
      const limit = contextLimit(S.model, S.cwd, this.userSettings);
      if (limit !== S.ctxMax) {
        S.ctxMax = limit;
        this.stateDirty = true;
      }
    }
    for (const pid of this.chains.keys()) if (!pids.has(pid)) this.chains.delete(pid);
    const want = this.isAppPid ? [...pids].filter((pid) => !this.chains.has(pid)) : [];
    const check = [...this.checking];
    if ((want.length || check.length) && !this.procBusy && Date.now() >= this.procRetryAt) {
      this.procBusy = true;
      processTable().then((table) => {
        this.procBusy = false;
        if (this.stopped) return;
        // Without a process list the entries are taken as they are: better a ghost now and then than no sessions.
        for (const key of check) {
          const [pid, start] = key.split(':').map(Number);
          const seen = table && table.starts.get(pid);
          this.verified.set(key, !table || (seen !== undefined && sameStart(seen, start)));
          this.checking.delete(key);
        }
        if (check.length) {
          this.pollRegistry();
          this.publishState();
        }
        if (!table) {
          this.procRetryAt = Date.now() + 60_000;
          return;
        }
        for (const pid of want) this.chains.set(pid, ancestors(pid, table.parents));
        this.matchTabs();
      }, (e) => {
        this.procBusy = false;
        report(e);
      });
    }
    this.matchTabs();
  }

  // The other AI tools running (Codex, Antigravity…; runaways.js finds them in its process readings), each a session as
  // on the Mac: busy while it uses the CPU, idle once it has been quiet for 10 seconds, ended for two minutes after it
  // quits so its window turns back into a terminal. No transcript to read: no tokens nor cost.
  setOthers(list) {
    const now = Date.now(), seen = new Set();
    for (const a of list) {
      const id = `ai:${a.pid}:${a.started}`;
      seen.add(id);
      let O = this.others.get(id);
      if (!O) {
        O = { id, tool: a.tool, pid: a.pid, cwd: '', cpu: 0, busy: false, busyUntil: 0, statusSince: now, firstTs: a.started, lastTs: now, endedAt: 0, hostTab: null, chain: [] };
        this.others.set(id, O);
        this.stateDirty = true;
      }
      O.cpu = a.pct;
      O.chain = a.chain;
      if ((a.command || null) !== (O.command || null)) {
        O.command = a.command || null;
        O.commandSince = now;
        this.stateDirty = true;
      }
      if (O.tool === 'Codex' && a.cwd) this.readCodexLog(O, a.cwd, a.started, now);
      if (O.tool === 'Antigravity' && a.cwd) this.readAntigravity(O, a.cwd, now);
      if (a.pct >= 1) O.busyUntil = now + 10_000;
      const busy = now < O.busyUntil;
      if (busy) O.lastTs = now;
      const cwd = a.cwd || O.cwd;
      if (busy !== O.busy || cwd !== O.cwd) {
        if (busy !== O.busy) O.statusSince = now;
        O.busy = busy;
        O.cwd = cwd;
        this.stateDirty = true;
      }
    }
    for (const O of this.others.values()) {
      if (O.endedAt === 0 && !seen.has(O.id)) {
        O.endedAt = now;
        O.busy = false;
        this.stateDirty = true;
      }
      if (O.endedAt > 0 && now - O.endedAt >= 120_000) {
        this.others.delete(O.id);
        this.stateDirty = true;
      }
    }
    this.matchTabs();
    this.publishState();
  }

  // Its status: ended, or what its records say (over is the user's turn, unless its subagents still work, as Claude's
  // background ones; a step waiting for the user's permission, its own or a subagent's, waits; without Antigravity's
  // steps to tell, a tool call that runs nothing and burns nothing for a few seconds does), else busy while it works the
  // CPU or runs a command.
  otherStatus(O, now = Date.now()) {
    if (O.endedAt > 0) return { status: 'ended', waiting: null };
    if (O.turnOpen != null && (O.waitsForUser || O.agentWaiting)) {
      const p = O.waitsForUser ? O.call && O.call.p : O.agentWaiting;
      return { status: 'waiting', waiting: `approval: ${p ? p.l : 'a step'}` };
    }
    if (O.turnOpen === false) return { status: (O.agents || []).some((a) => a.running) ? 'busy' : 'idle', waiting: null };
    if (O.turnOpen === true) {
      if (!O.stepsKnown && !O.command && !O.busy && O.call && now - O.call.p.t > 4000) return { status: 'waiting', waiting: `approval: ${O.call.p.l}` };
      return { status: 'busy', waiting: null };
    }
    return { status: O.busy || O.command ? 'busy' : 'idle', waiting: null };
  }

  // What it runs: a shell of its own right now, else the tool call its log has it on.
  otherRunning(O) {
    return O.command ? { n: 'Bash', c: 'bash', l: O.command, t: O.commandSince || Date.now() } : O.call ? O.call.p : null;
  }

  // Antigravity's own records (~/.gemini/antigravity-cli), as the Mac engine reads them: its newest conversation in this
  // folder from conversation_summaries.db (its title and run status: RUNNING or BUSY while it works, IDLE once it's the
  // user's turn); that conversation's transcript.jsonl for the prompt, the context and its last reply's tool calls; and
  // its own database (conversations\<id>.db) for the steps not over yet, which the transcript only gets once they're
  // done: the tool call that runs, or one WAITING for the user's permission. Its subagents (the conversation's children)
  // show as Claude's do. Its screen redrawing while the user types is no work.
  readAntigravity(O, cwd, now) {
    const root = path.join(HOME, '.gemini', 'antigravity-cli');
    const db = agyOpen(path.join(root, 'conversation_summaries.db'));
    if (!db) return;
    try {
      const row = agyConversation(db, cwd);
      if (!row) return;
      const id = row.conversation_id;
      const open = /_(RUNNING|BUSY|CANCELING)$/.test(row.status || '');
      if (O.turnOpen !== open || O.title !== row.title) {
        O.turnOpen = open;
        O.title = row.title || '';
        this.stateDirty = true;
      }
      this.readAgyTranscript(O, root, id, now);
      // What runs, or waits for the user, right now: its steps not over yet.
      const was = `${O.call ? O.call.p.l : ''}|${O.waitsForUser}`;
      if (!open) {
        O.call = null;
        O.waitsForUser = false;
      } else {
        const steps = agySteps(root, id);
        O.stepsKnown = !!steps;
        if (steps) {
          O.waitsForUser = steps.waiting != null;
          const p = O.plan ? agyCall(O.plan, steps.waiting ?? steps.open) : null;
          O.call = p ? { id: '', p } : null;
        }
      }
      if (was !== `${O.call ? O.call.p.l : ''}|${O.waitsForUser}`) this.stateDirty = true;
      this.readAntigravityAgents(O, db, id, root, now);
    } finally {
      agyClose(db);
    }
  }

  // The conversation's transcript, read on from where it was (a new conversation: from the start): the prompt, the
  // context, its last reply's tool calls (the last of them runs until a step is over, when its steps can't be read), and
  // the subagents it started.
  readAgyTranscript(O, root, id, now) {
    const file = path.join(root, 'brain', id, '.system_generated', 'logs', 'transcript.jsonl');
    if (O.log !== file) {
      O.log = file;
      O.logOffset = 0;
      O.plan = null;
    }
    const lines = readNewLines(O);
    for (const j of lines) {
      const step = j.status || '';
      const ts = parseISO(j.created_at) || now;
      const idx = Number(j.step_index) || 0;
      O.waitsForUser = step === 'WAITING';
      if (j.type === 'USER_INPUT') {
        O.prompt = clip(agyRequest(j.content), 200);
        O.call = null;
        O.plan = null;
      } else if (j.type === 'PLANNER_RESPONSE') {
        if (j.input_tokens != null) O.ctx = (Number(j.input_tokens) || 0) + (Number(j.cache_read_tokens) || 0);
        // A reply that calls tools: they run (or wait) next, a step each.
        const calls = Array.isArray(j.tool_calls) ? j.tool_calls : [];
        O.plan = calls.length ? { idx, calls, ts } : null;
        O.call = calls.length ? { id: '', p: agyTool(calls[calls.length - 1], ts) } : null;
      } else {
        // A tool's own step: done, it no longer waits; still running or waiting, it does.
        if (['DONE', 'ERROR', 'CANCELED'].includes(step)) O.call = null;
        // One that started subagents says which, in the order the call asked for them (their roles, prompts).
        const call = O.plan && agyPlanned(O.plan, idx);
        if (!call || call.name !== 'invoke_subagent' || typeof j.content !== 'string') continue;
        const args = call.args || {};
        const listed = agyValue(args.Subagents);
        const asked = Array.isArray(listed) && listed.length ? listed : [args];
        const children = [...j.content.matchAll(/"conversationId"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
        O.agentRoles = O.agentRoles || new Map();
        children.forEach((child, k) => {
          const spec = asked[Math.min(k, asked.length - 1)] || {};
          O.agentRoles.set(child, { role: agyArg(spec.Role) || '', prompt: agyArg(spec.Prompt) || '' });
        });
      }
    }
    if (lines.length) this.stateDirty = true;
  }

  // Antigravity's subagents: its conversation's children in conversation_summaries.db, each running or done, with its
  // role, what it was asked and the tool it's on (its steps; its transcript, read again when it changes), as Claude's
  // subagents are shown. One waiting for the user's permission is the session's wait.
  readAntigravityAgents(O, db, parent, root, now) {
    let rows = [];
    try {
      rows = db.prepare('SELECT conversation_id, title, status, agent_name, killed FROM conversation_summaries WHERE parent_conversation_id = ? ORDER BY last_modified_time DESC LIMIT 12').all(parent);
    } catch {
      return;
    }
    O.agentLogs = O.agentLogs || new Map();
    const views = [], seen = new Set();
    let waiting = null;
    for (const r of rows) {
      const id = r.conversation_id, title = r.title || '', agent = r.agent_name || '';
      seen.add(id);
      const running = /_(RUNNING|BUSY)$/.test(r.status || '') && Number(r.killed) !== 1;
      const file = path.join(root, 'brain', id, '.system_generated', 'logs', 'transcript.jsonl');
      let mtime = 0;
      try {
        mtime = fs.statSync(file).mtimeMs;
      } catch {}
      let log = O.agentLogs.get(id);
      if (!log || log.mtime !== mtime) {
        log = agyLog(file, mtime);
        O.agentLogs.set(id, log);
        this.stateDirty = true;
      }
      // Done more than 15 minutes ago: off the list, as Claude's.
      if (!running && now - mtime >= 15 * MIN) continue;
      let call = null, waits = false;
      if (running && log.plan) {
        const steps = agySteps(root, id);
        if (steps) {
          waits = steps.waiting != null;
          call = agyCall(log.plan, steps.waiting ?? steps.open);
        } else call = agyTool(log.plan.calls[log.plan.calls.length - 1], log.plan.ts);
      }
      if (waits && !waiting) waiting = call || { n: 'Agent', c: 'agent', l: 'a step', t: now };
      const asked = O.agentRoles && O.agentRoles.get(id);
      const firstLine = ((asked && asked.prompt) || log.prompt).split(/\r?\n/)[0];
      const desc = [asked && asked.role, title, firstLine, agent].find((x) => x) || 'subagent';
      views.push({
        id, sid: O.id, desc: clip(desc, 90), type: agent === 'self' ? '' : agent, model: O.model || '', bg: true, running,
        firstTs: log.firstTs || mtime, lastTs: Math.max(log.lastTs, mtime), tools: log.tools, errors: log.errors, web: log.web, cost: 0,
        tok: { in: log.tokIn, out: log.tokOut, cr: log.tokCache, cw: 0 }, pending: call ? [call] : [], loop: false,
        ...(call && { last: call }),
      });
    }
    for (const id of [...O.agentLogs.keys()]) if (!seen.has(id)) O.agentLogs.delete(id);
    const key = (list) => (list || []).map((a) => `${a.id}${a.running}${a.last ? a.last.l : ''}`).join('|');
    if (key(views) !== key(O.agents) || (waiting && waiting.l) !== (O.agentWaiting && O.agentWaiting.l)) this.stateDirty = true;
    O.agents = views;
    O.agentWaiting = waiting;
  }

  // Codex's own log (CODEX_HOME\sessions\<date>\rollout-….jsonl), as the Mac engine reads it: its turn open or over,
  // the tool call it's on, the prompt, the context and the model. Matched to the process by folder and start, looked for
  // again every 30 s until found; read on from where it was.
  readCodexLog(O, cwd, started, now) {
    if (!O.log && now - (O.logChecked || 0) > 30_000) {
      O.logChecked = now;
      const found = codexLog(cwd, started);
      if (found) {
        O.log = found;
        O.logOffset = 0;
      }
    }
    if (!O.log) return;
    let st;
    try {
      st = fs.statSync(O.log);
    } catch {
      return;
    }
    if (st.size <= (O.logOffset || 0)) return;
    const from = Math.max(O.logOffset || 0, st.size > 2 << 20 ? st.size - (2 << 20) : 0);
    const fd = fs.openSync(O.log, 'r');
    const buf = Buffer.alloc(st.size - from);
    try {
      fs.readSync(fd, buf, 0, buf.length, from);
    } finally {
      fs.closeSync(fd);
    }
    const end = buf.lastIndexOf(0x0a);
    if (end < 0) return;
    O.logOffset = from + end + 1;
    for (const line of buf.subarray(0, end).toString('utf8').split('\n')) {
      let j;
      try {
        j = JSON.parse(line);
      } catch {
        continue;
      }
      const p = j && j.payload;
      if (!p || typeof p !== 'object') continue;
      const ts = parseISO(j.timestamp) || now;
      if (j.type === 'event_msg') {
        if (p.type === 'task_started') {
          O.turnOpen = true;
          O.call = null;
        } else if (p.type === 'task_complete' || p.type === 'turn_aborted') {
          O.turnOpen = false;
          O.call = null;
        } else if (p.type === 'item_completed' && p.item && p.item.type === 'UserMessage') {
          const text = (p.item.content || []).map((c) => c && c.text).find(Boolean);
          if (text) O.prompt = clip(text, 200);
        } else if (p.type === 'user_message' && typeof p.message === 'string' && p.message.trim()) {
          // Older Codex logs (0.10x, still what many Windows users run) write the prompt this way.
          O.prompt = clip(p.message.trim(), 200);
        } else if (p.type === 'token_count' && p.info) {
          if (p.info.last_token_usage) O.ctx = Number(p.info.last_token_usage.input_tokens) || 0;
          if (p.info.model_context_window) O.ctxMax = Number(p.info.model_context_window) || 0;
        } else if (p.type === 'thread_settings_applied' && p.thread_settings && p.thread_settings.model) {
          O.model = String(p.thread_settings.model);
        }
      } else if (j.type === 'turn_context' && typeof p.model === 'string' && p.model) {
        // Older Codex logs give the model with every turn instead.
        O.model = p.model;
      } else if (j.type === 'response_item' && typeof p.type === 'string') {
        if (p.type.endsWith('_call_output')) {
          if (O.call && O.call.id === p.call_id) O.call = null;
        } else if (p.type === 'web_search_call') {
          // Logged once the search is over, with no output line to end it: nothing left running.
          if (p.status !== 'completed') O.call = { id: p.call_id || '', p: codexCall(p.type, p, ts) };
        } else if (p.type.endsWith('_call')) {
          O.call = { id: p.call_id || '', p: codexCall(p.name || p.type, p, ts) };
        }
      }
    }
    this.stateDirty = true;
  }

  // A live session whose Claude process is one the app started, or under one, runs in the app's own window.
  matchTabs() {
    for (const S of this.sessions.values()) {
      let tab = null;
      if (S.live && S.pid != null && this.isAppPid) {
        for (const pid of [S.pid, ...(this.chains.get(S.pid) || [])]) {
          let hit = false;
          try {
            hit = this.isAppPid(pid);
          } catch (e) {
            report(e);
          }
          if (hit) {
            tab = hit;
            break;
          }
        }
      }
      if (tab !== S.hostTab) this.stateDirty = true;
      S.hostTab = tab;
    }
    // An AI tool under one of the app's terminals runs in that window.
    for (const O of this.others.values()) {
      let tab = null;
      if (O.endedAt === 0 && this.isAppPid) {
        for (const pid of [O.pid, ...O.chain]) {
          let hit = false;
          try {
            hit = this.isAppPid(pid);
          } catch (e) {
            report(e);
          }
          if (hit) {
            tab = hit;
            break;
          }
        }
      }
      if (tab !== O.hostTab) this.stateDirty = true;
      O.hostTab = tab;
    }
  }

  // ----- snapshot -----

  // The session's name, or its folder's with the start of its id.
  displayName(S) {
    return S.name || clip(baseName(S.cwd) + '-' + S.id.slice(0, 2), 24);
  }

  statusOf(S, now) {
    if (S.live) {
      switch (S.reg) {
        // "shell": Claude's turn is over and only a background shell (a server, a watcher) is still running.
        case 'idle': case 'shell': return 'idle';
        case 'waiting': return 'waiting';
        default: return 'busy';
      }
    }
    return now - S.lastTs < 90_000 ? 'busy' : 'ended';
  }

  // Claude ended its turn to wait for its background subagents: not the user's turn yet. Nor right after one has
  // finished; Claude picks its result up a moment later.
  shownStatus(S, agents, now) {
    const status = this.statusOf(S, now);
    if (status === 'idle' && agents.some((A) => A.bg && (A.pending.size > 0 || (!A.endTurn && now - A.lastTs < 3 * MIN) || now - A.lastTs < 20_000))) return 'busy';
    return status;
  }

  hostLabel(S) {
    return S.hostTab != null ? 'app' : S.live ? 'term' : null;
  }

  pendingList(t, now) {
    const out = [];
    for (const p of t.pending.values()) if (now - p.t < 3 * 3_600_000) out.push(p);
    return out;
  }

  agentView(A, S, now) {
    const running = A.pending.size > 0 || (!A.endTurn && now - A.lastTs < (S.reg === 'busy' ? 15 : 3) * MIN);
    const v = {
      id: A.id, sid: A.sid, desc: A.desc || A.type || A.id.slice(0, 8), type: A.type, model: shortModel(A.model), bg: A.bg,
      running, firstTs: A.firstTs, lastTs: A.lastTs, tools: A.tools, errors: A.errors, web: A.web,
      cost: A.cost, tok: A.tokDict(), pending: this.pendingList(A, now), loop: A.isLoop,
    };
    if (A.last) v.last = A.last;
    return v;
  }

  snapshot() {
    const now = Date.now();
    const list = [];
    let runningAgents = 0;
    const pendingByCat = Object.fromEntries(CATS.map((c) => [c, 0]));
    const agentsBySession = this.agentsBySession();

    for (const S of this.sessions.values()) {
      if (this.dismissed.has(S.id)) {
        if (!(S.live && S.pid != null && S.pid !== this.dismissed.get(S.id))) continue;
        this.dismissed.delete(S.id);
      }
      // A compacted conversation shows once, as the session it continues in.
      if (S.supersededBy != null && !S.live) continue;
      const mine = agentsBySession.get(S.id) || [];
      const status = this.shownStatus(S, mine, now);
      const host = this.hostLabel(S);
      if (!(S.live || now - S.lastTs < 30 * MIN)) continue;
      const subs = mine
        .map((A) => this.agentView(A, S, now))
        .filter((a) => a.running || now - a.lastTs < 15 * MIN)
        .sort((a, b) => (a.running !== b.running ? (a.running ? -1 : 1) : b.lastTs - a.lastTs));
      const nRun = subs.filter((a) => a.running).length;
      runningAgents += nRun;
      const pending = this.pendingList(S, now);
      for (const p of pending) pendingByCat[p.c ?? 'plan'] = (pendingByCat[p.c ?? 'plan'] || 0) + 1;
      for (const a of subs) for (const p of a.pending) pendingByCat[p.c ?? 'plan'] = (pendingByCat[p.c ?? 'plan'] || 0) + 1;
      const k0 = Math.floor(now / 20_000);
      const spark = [];
      for (let k = k0 - 29; k <= k0; k++) spark.push(S.spark.get(k) || 0);
      const flags = [];
      if (S.isLoop || subs.some((a) => a.loop)) flags.push('loop?');
      if (status === 'busy' && pending.some((p) => now - p.t > 3 * MIN)) flags.push('slow tool');
      if (S.ctxMax > 0 && S.ctx / S.ctxMax > 0.8) flags.push('ctx 80%+');
      const item = {
        id: S.id, name: this.displayName(S),
        title: S.title, lastPrompt: S.lastPrompt, cwd: cwdLabel(S.cwd), branch: S.branch,
        model: shortModel(S.model), effort: S.effort, status, live: S.live,
        statusSince: S.live ? S.statusSince : S.endedAt > 0 ? S.endedAt : S.lastTs,
        cpu: S.cpu, mem: S.mem, kind: S.kind, entry: S.entry,
        firstTs: S.firstTs, lastTs: S.lastTs, ctx: S.ctx, ctxMax: S.ctxMax, turnMs: S.turnMs,
        tok: S.tokDict(), cost: S.cost, tools: S.tools, errors: S.errors, web: S.web, prompts: S.prompts,
        byCat: S.byCat, pending, spark, flags, agents: subs, agentsRunning: nRun,
        waitingFor: S.waitingFor ?? null, tty: S.tty ?? null, pid: S.pid ?? null, host,
        tab: typeof S.hostTab === 'string' ? S.hostTab : null,
      };
      if (S.last) item.last = S.last;
      list.push(item);
    }
    // The other AI tools: what Claude's sessions show, minus what only a transcript would tell.
    for (const O of this.others.values()) {
      if (this.dismissed.has(O.id) && this.dismissed.get(O.id) === O.pid) continue;
      const live = O.endedAt === 0;
      const { status, waiting } = this.otherStatus(O, now);
      const running = this.otherRunning(O);
      // Its subagents end with it.
      const agents = (O.agents || []).map((a) => (live ? a : { ...a, running: false, pending: [] }));
      const nRun = agents.filter((a) => a.running).length;
      runningAgents += nRun;
      for (const p of [...(running ? [running] : []), ...agents.flatMap((a) => a.pending)]) pendingByCat[p.c ?? 'plan'] = (pendingByCat[p.c ?? 'plan'] || 0) + 1;
      list.push({
        id: O.id, name: O.tool, title: O.title || baseName(O.cwd), lastPrompt: O.prompt || '', cwd: cwdLabel(O.cwd), branch: '',
        model: O.model || O.tool, effort: '', status, live, statusSince: live ? O.statusSince : O.endedAt,
        cpu: O.cpu, mem: 0, kind: '', entry: '', firstTs: O.firstTs, lastTs: O.lastTs, ctx: O.ctx || 0, ctxMax: O.ctxMax || 0, turnMs: 0,
        tok: { in: 0, out: 0, cr: 0, cw: 0 }, cost: 0, tools: 0, errors: 0, web: 0, prompts: 0,
        byCat: {}, pending: running ? [running] : [], spark: new Array(30).fill(0), flags: [], agents, agentsRunning: nRun,
        waitingFor: waiting, tty: null, pid: O.pid, host: O.hostTab != null ? 'app' : live ? 'term' : null,
        tab: typeof O.hostTab === 'string' ? O.hostTab : null,
        ...(running && { last: running }),
      });
    }
    list.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.lastTs - a.lastTs);

    const G = this.G;
    const m0 = Math.floor(now / MIN);
    for (const k of G.minutes.keys()) if (k < m0 - 90) G.minutes.delete(k);
    const catSpark = Object.fromEntries(CATS.map((c) => [c, []]));
    const toolSpark = [], tokSpark = [], costSpark = [];
    for (let k = m0 - 29; k <= m0; k++) {
      const b = G.minutes.get(k);
      toolSpark.push(b ? b.tools : 0);
      tokSpark.push(b ? b.tok : 0);
      costSpark.push(Math.round((b ? b.cost : 0) * 10_000) / 10_000);
      if (k > m0 - 15) for (const c of CATS) catSpark[c].push(b ? b.cats[c] || 0 : 0);
    }
    const last5 = (a) => a.slice(-5).reduce((x, y) => x + y, 0) / 5;
    const cost15 = costSpark.slice(-15).reduce((x, y) => x + y, 0);

    const files = [...G.files.values()]
      .map((F) => ({ F, collision: [...F.editors.values()].filter((e) => now - e.t < 20 * MIN).length > 1 }))
      .sort((a, b) => {
        if (a.collision !== b.collision) return a.collision ? -1 : 1;
        const wa = a.F.w * 3 + a.F.r, wb = b.F.w * 3 + b.F.r;
        return wa !== wb ? wb - wa : b.F.last - a.F.last;
      })
      .slice(0, 14)
      .map(({ F, collision }) => ({
        p: tildify(F.p), short: shortPath(F.p), r: F.r, w: F.w, last: F.last, collision,
        editors: [...F.editors.values()].map((e) => ({ s: e.s, a: e.a ?? null })),
      }));

    const promptTok = G.tokIn + G.tokCr + G.tokCw;
    let sessionsToday = 0, agentsToday = 0, agentCost = 0;
    for (const S of this.sessions.values()) if (S.lastTs >= this.day0 && (S.tools > 0 || S.prompts > 0)) sessionsToday++;
    for (const A of this.agents.values()) {
      if (A.lastTs >= this.day0 && A.tools > 0) agentsToday++;
      agentCost += A.cost;
    }
    const totals = {
      live: list.filter((s) => s.live).length, sessionsToday, agentsToday,
      runningAgents, cost: G.cost, saved: G.saved,
      tok: { in: G.tokIn, out: G.tokOut, cr: G.tokCr, cw: G.tokCw },
      tools: G.tools, errors: G.errors, web: G.web, prompts: G.prompts,
      cacheHit: promptTok > 0 ? G.tokCr / promptTok : 0,
      okRate: G.tools > 0 ? (G.tools - G.errors) / G.tools : 1,
      avgTurn: G.turns > 0 ? G.turnMs / G.turns : 0, turns: G.turns,
      toolsPerMin: last5(toolSpark), tokPerMin: last5(tokSpark), costPerHour: cost15 * 4,
      agentShare: G.cost > 0 ? agentCost / G.cost : 0,
    };
    const out = {
      day0: this.day0, booted: this.booted, app: true,
      sessions: list, totals,
      byCat: G.byCat, lastByCat: G.lastByCat, pendingByCat, catSpark,
      toolSpark, tokSpark, costSpark,
      byModel: [...G.byModel.values()].sort((a, b) => b.cost - a.cost).map((m) => ({
        model: m.model, priced: m.priced, cost: m.cost, calls: m.calls,
        tok: { in: m.tokIn, out: m.tokOut, cr: m.tokCr, cw: m.tokCw },
      })),
      research: G.research.slice(-30).reverse(),
      shells: G.shells.slice(-14).reverse(),
      ticker: G.ticker.slice(-200),
      files,
    };
    const limits = this.readLimits();
    if (limits) out.limits = limits;
    return out;
  }

  // The usage limits, read again when the file changes; none while there is no file (the page then hides them).
  readLimits() {
    if (!this.limitsFile) return null;
    let st;
    try {
      st = fs.statSync(this.limitsFile);
    } catch {
      this.limits = { mtime: -1, json: null };
      return null;
    }
    if (st.mtimeMs !== this.limits.mtime) this.limits = { mtime: st.mtimeMs, json: parseLimits(this.limitsFile, st.mtimeMs) };
    return this.limits.json;
  }

  // ----- publishing -----

  call(name, json) {
    const f = this.handlers[name];
    if (typeof f !== 'function' || this.stopped) return;
    try {
      f(json);
    } catch (e) {
      report(e);
    }
  }

  sendInit() {
    this.initWanted = false;
    this.call('onInit', JSON.stringify({ state: this.snapshot(), log: this.log.slice(-160) }));
  }

  // Builds and sends the state when something changed (and every few seconds for the time-based figures), and skips
  // the page entirely when the result is identical.
  publishState() {
    if (!this.booted || this.stopped) return;
    const now = Date.now();
    if (!this.stateDirty && now - this.lastStateAt <= 5000) return;
    this.stateDirty = false;
    this.lastStateAt = now;
    const js = JSON.stringify(this.snapshot());
    if (js === this.lastStateJSON) return;
    this.lastStateJSON = js;
    this.call('onState', js);
  }

  flushEvents() {
    if (!this.outbox.length) return;
    const batch = this.outbox;
    this.outbox = [];
    this.call('onEvents', JSON.stringify(batch));
  }
}

function createEngine(opts = {}) {
  const e = new RadarEngine(opts);
  return {
    start: () => e.start(),
    requestInit: () => e.requestInit(),
    stop: () => e.stop(),
    gitSources: () => e.gitSources(),
    gitSessions: () => e.gitSessions(),
    written: () => e.written(),
    live: () => e.live(),
    setOthers: (list) => e.setOthers(list),
    sessionCwd: (sessionId) => e.sessionCwd(sessionId),
    dismiss: (sessionId, pid) => e.dismiss(sessionId, pid),
    transcriptItems: (sessionId, limit) => e.transcriptItems(sessionId, limit),
  };
}

module.exports = { createEngine };
