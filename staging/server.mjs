#!/usr/bin/env node
// atalay-terminal STAGING: web preview of the next app UI, fed by the same live data as the app.
// Sources: ~/.claude/sessions/<pid>.json (live status) and ~/.claude/projects/**/*.jsonl (transcripts).
// Listens on 127.0.0.1 only.   node server.mjs   ->   http://127.0.0.1:4790

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, 'public');
const HOME = os.homedir();
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(HOME, '.claude');
const PROJECTS = path.join(CLAUDE_DIR, 'projects');
const REGISTRY = path.join(CLAUDE_DIR, 'sessions');
const PORT = Number(process.env.PORT) || 4790;
const HOST = '127.0.0.1';
const BIG_FILE = 8 << 20;
const CHUNK = 4 << 20;
const MIN = 60_000;

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
const priceFor = (model) => (model && PRICES.find(([p]) => model.startsWith(p))?.[1]) || null;

function costOf(model, u) {
  const p = priceFor(model);
  if (!p) return 0;
  const inp = u.input_tokens || 0, out = u.output_tokens || 0;
  const cr = u.cache_read_input_tokens || 0, cw = u.cache_creation_input_tokens || 0;
  const w1h = u.cache_creation?.ephemeral_1h_input_tokens || 0;
  const w5m = Math.max(0, cw - w1h);
  const r = p.long && inp + cr + cw > p.long.at ? { ...p, ...p.long } : p;
  const speed = u.speed === 'fast' ? 2 : 1;
  return (speed * (inp * r.in + out * r.out + cr * r.cr + w5m * r.in * 1.25 + w1h * r.in * 2)) / 1e6;
}

function savedOf(model, u) {
  const p = priceFor(model);
  return p ? ((u.cache_read_input_tokens || 0) * (p.in - p.cr)) / 1e6 : 0;
}

const shortModel = (m) =>
  !m ? '' : m.replace(/^claude-/, '').replace(/-\d{8}$/, '').replace(/^([a-z]+)-(\d+)-(\d+)$/, '$1 $2.$3').replace(/^([a-z]+)-(\d+)$/, '$1 $2');

// ---------- tool categories ----------
const CATS = ['web', 'browser', 'read', 'search', 'edit', 'bash', 'agent', 'mcp', 'plan'];
const CAT_OF = {
  WebSearch: 'web', WebFetch: 'web',
  Read: 'read', NotebookRead: 'read',
  Grep: 'search', Glob: 'search', ToolSearch: 'search', LSP: 'search',
  ListMcpResourcesTool: 'search', ReadMcpResourceTool: 'search', ReadMcpResourceDirTool: 'search',
  Edit: 'edit', Write: 'edit', MultiEdit: 'edit', NotebookEdit: 'edit',
  Bash: 'bash', BashOutput: 'bash', KillShell: 'bash', KillBash: 'bash', Monitor: 'bash', PowerShell: 'bash',
  Agent: 'agent', Task: 'agent', Workflow: 'agent', SendMessage: 'agent', TaskStop: 'agent', TaskOutput: 'agent', ListAgents: 'agent',
};
function catOf(name) {
  if (CAT_OF[name]) return CAT_OF[name];
  if (name.startsWith('mcp__claude-in-chrome__') || name.startsWith('mcp__computer') || name === 'computer') return 'browser';
  if (name.startsWith('mcp__')) return 'mcp';
  return 'plan';
}

// ---------- text helpers ----------
const clip = (s, n) => {
  if (s == null) return '';
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

// The page may be screen-recorded, so obvious credentials never leave the server.
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
  if (!s) return '';
  let t = String(s);
  for (const rx of SECRET_PATTERNS) t = t.replace(rx, '‹•••›');
  t = t.replace(KEY_VALUE, (m, k, sep, v) => (v.startsWith('$') ? m : `${k}${sep}‹•••›`));
  t = t.replace(LONG_TOKEN, (m) => (/\d.*\d/.test(m) && /[A-Z].*[A-Z]/.test(m) && /[a-z].*[a-z]/.test(m) ? '‹•••›' : m));
  return t;
}

function hostPath(u) {
  try {
    const x = new URL(u);
    return clip(x.host.replace(/^www\./, '') + (x.pathname === '/' ? '' : x.pathname), 70);
  } catch {
    return clip(redact(u), 70);
  }
}
const hostOf = (u) => {
  try { return new URL(u).host.replace(/^www\./, ''); } catch { return ''; }
};
const shortPath = (p) => (p ? String(p).split('/').filter(Boolean).slice(-2).join('/') : '');
const tildify = (p) => (p && p.startsWith(HOME) ? '~' + p.slice(HOME.length) : p || '');
function cwdLabel(cwd) {
  const parts = tildify(cwd).split('/');
  return parts.length <= 4 ? parts.join('/') : `${parts.slice(0, 2).join('/')}/…/${parts.slice(-2).join('/')}`;
}
const fmtBytes = (n) => (n >= 1 << 20 ? (n / (1 << 20)).toFixed(1) + 'MB' : n >= 1024 ? Math.round(n / 1024) + 'KB' : n + 'B');

// Longer, newline-preserving text for the chat window body.
const fullText = (s, n) => {
  if (s == null) return '';
  const t = redact(String(s)).replace(/\r/g, '').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

function toolDetail(name, input) {
  const i = input && typeof input === 'object' ? input : {};
  switch (name) {
    case 'Bash': return fullText(i.command, 800);
    case 'WebSearch': return fullText(i.query, 300);
    case 'WebFetch': return hostPath(i.url);
    case 'Read': case 'Edit': case 'MultiEdit': case 'Write': return tildify(i.file_path || '');
    case 'NotebookEdit': return tildify(i.notebook_path || '');
    case 'Grep': return fullText(`${i.pattern || ''}${i.path ? '  in ' + tildify(i.path) : ''}`, 300);
    case 'Glob': return fullText(i.pattern, 300);
    case 'Agent': case 'Task': return fullText(i.description || i.prompt, 300);
    case 'TodoWrite': return (i.todos || []).slice(0, 8).map((t) => `${t.status === 'completed' ? '☒' : '☐'} ${clip(t.content, 90)}`).join('\n');
    default: return '';
  }
}

function resultMeta(tr) {
  let meta = '';
  let hosts = [];
  if (tr && typeof tr === 'object' && !Array.isArray(tr)) {
    if (tr.url !== undefined && tr.code !== undefined) meta = `${tr.code}${tr.bytes ? ' · ' + fmtBytes(tr.bytes) : ''}`;
    else if (tr.query !== undefined && Array.isArray(tr.results)) {
      const links = tr.results.flatMap((r) => (r && typeof r === 'object' && Array.isArray(r.content) ? r.content : []));
      hosts = [...new Set(links.map((l) => hostOf(l.url)).filter(Boolean))].slice(0, 4);
      meta = `${links.length} results`;
    } else if (tr.agentId) meta = tr.status || '';
    else if (tr.interrupted) meta = 'interrupted';
  }
  return { meta, hosts };
}

function outputPreview(b, tr) {
  let text = '';
  if (tr && typeof tr === 'object' && !Array.isArray(tr)) {
    if (typeof tr.stdout === 'string' || typeof tr.stderr === 'string') text = tr.stdout || tr.stderr || '';
    else if (tr.file && typeof tr.file === 'object' && tr.file.numLines) return `${tr.file.numLines} lines`;
    else if (tr.type === 'create') return 'created';
    else if (tr.structuredPatch) return 'updated';
  }
  if (!text) {
    const c = b.content;
    if (typeof c === 'string') text = c;
    else if (Array.isArray(c)) text = c.filter((x) => x && x.type === 'text').map((x) => x.text).join('\n');
  }
  const lines = String(text).split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
  return fullText(lines.slice(0, 3).join('\n'), 320);
}

function summarize(name, input) {
  const i = input && typeof input === 'object' ? input : {};
  switch (name) {
    case 'WebSearch': return { label: clip(redact(i.query), 90) };
    case 'WebFetch': return { label: hostPath(i.url) };
    case 'Read': case 'NotebookRead': return { label: shortPath(i.file_path), file: i.file_path };
    case 'Edit': case 'MultiEdit': case 'Write': return { label: shortPath(i.file_path), file: i.file_path };
    case 'NotebookEdit': return { label: shortPath(i.notebook_path), file: i.notebook_path };
    case 'Grep': return { label: clip(`/${i.pattern || ''}/ ${shortPath(i.path || i.glob || '')}`, 70) };
    case 'Glob': return { label: clip(i.pattern, 70) };
    case 'Bash': return { label: clip(redact(i.description || i.command), 90), cmd: clip(redact(i.command), 180) };
    case 'Agent': case 'Task': return { label: clip(i.description || i.subagent_type || 'agent', 70) };
    case 'Skill': return { label: clip(i.skill, 50) };
    case 'ToolSearch': return { label: clip(i.query, 60) };
    case 'TodoWrite': return { label: `${(i.todos || []).length} todos` };
    case 'Workflow': return { label: clip(i.name || (i.scriptPath && path.basename(i.scriptPath)) || 'workflow', 60) };
    case 'SendMessage': return { label: clip(`→ ${i.to || ''}`, 50) };
    case 'AskUserQuestion': return { label: clip(i.questions?.[0]?.question, 70) };
  }
  if (name.startsWith('mcp__')) {
    const parts = name.split('__');
    const server = (parts[1] || '').replace(/^claude_ai_/, '');
    const tool = parts.slice(2).join('__');
    let extra = '';
    if (i.url) extra = hostPath(i.url);
    else if (Array.isArray(i.actions)) extra = `×${i.actions.length}`;
    else if (i.action) extra = String(i.action);
    else if (i.query) extra = clip(redact(i.query), 40);
    return { label: clip(`${server}.${tool}${extra ? ' ' + extra : ''}`, 80) };
  }
  return { label: '' };
}

// ---------- state ----------
const dayStartOf = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};
let DAY0 = dayStartOf();
let booted = false;

const zeroTok = () => ({ in: 0, out: 0, cr: 0, cw: 0 });
const addTok = (a, b) => { a.in += b.in; a.out += b.out; a.cr += b.cr; a.cw += b.cw; };

const sessions = new Map(); // sessionId -> session
const agents = new Map(); // `${sessionId}:${agentId}` -> subagent
const tracked = new Map(); // transcript path -> read cursor
const seenMsg = new Set(); // assistant message ids already billed (one API response spans several lines)
// Record uuids already counted. A forked session (resume while open elsewhere, --fork-session) starts
// its transcript with a copy of the parent's history; counting it again duplicated research items and
// flagged every file the parent edited as edited by two agents.
// Session of every record uuid seen. A session repeating another one's records continues that chat.
const recOwner = new Map();
const regPid = new Map(); // registry pid -> session id it showed last
const log = [];
const logIndex = new Map();
let outbox = [];
let G = freshGlobals();

function freshGlobals() {
  return {
    cost: 0, saved: 0, tok: zeroTok(), byModel: new Map(),
    tools: 0, errors: 0, prompts: 0, web: 0, turns: 0, turnMs: 0,
    byCat: Object.fromEntries(CATS.map((c) => [c, 0])),
    lastByCat: {},
    research: [], shells: [], ticker: [], files: new Map(),
    min: new Map(), // minute -> { tools, tok, cost, cats }
  };
}

function counters() {
  return { tok: zeroTok(), cost: 0, tools: 0, errors: 0, web: 0, prompts: 0, byCat: {}, spark: new Map() };
}

function getSession(sid) {
  let S = sessions.get(sid);
  if (!S) {
    S = {
      id: sid, name: '', title: '', lastPrompt: '', cwd: '', branch: '', model: '', effort: '',
      live: false, reg: null, waitingFor: null, statusSince: 0, pid: null, tty: null, cpu: 0, mem: 0, kind: '', entry: '',
      firstTs: 0, lastTs: 0, ctx: 0, ctxMax: 0, turnMs: 0, endTurn: false,
      pending: new Map(), last: null, sig: [], ...counters(),
    };
    sessions.set(sid, S);
  }
  return S;
}

function getAgent(sid, aid) {
  const key = `${sid}:${aid}`;
  let A = agents.get(key);
  if (!A) {
    A = {
      key, id: aid, sid, desc: '', type: '', model: '', bg: false, firstTs: 0, lastTs: 0, endTurn: false,
      pending: new Map(), last: null, sig: [], ...counters(),
    };
    agents.set(key, A);
  }
  return A;
}

function minuteBucket(ts) {
  const k = Math.floor(ts / MIN);
  let b = G.min.get(k);
  if (!b) G.min.set(k, (b = { tools: 0, tok: 0, cost: 0, cats: {} }));
  return b;
}

const LOGGED = new Set(['tool', 'prompt', 'say', 'sys']);
function emit(ev, today) {
  if (!today) return;
  if (ev.k === 'result') {
    const t = logIndex.get(ev.id);
    if (t) Object.assign(t, { ok: ev.ok, d: ev.d, m: ev.m, o: ev.o });
  } else if (LOGGED.has(ev.k)) {
    log.push(ev);
    if (ev.k === 'tool') logIndex.set(ev.id, ev);
    if (booted && log.length > 240) {
      const x = log.shift();
      if (x.k === 'tool') logIndex.delete(x.id);
    }
  }
  if (booted) outbox.push(ev);
}

// Rings fill out of order while boot reads file after file, so they are trimmed by time only once at the end.
const trimRing = (arr, n) => arr.splice(0, arr.length, ...arr.sort((a, b) => a.t - b.t).slice(-n));
const ringPush = (arr, item, n) => {
  arr.push(item);
  if (booted && arr.length > n) arr.shift();
};
function settleRings() {
  trimRing(log, 240);
  logIndex.clear();
  for (const ev of log) if (ev.k === 'tool') logIndex.set(ev.id, ev);
  trimRing(G.research, 60);
  trimRing(G.shells, 40);
  trimRing(G.ticker, 200);
}

// ---------- transcript ingestion ----------
function ingest(rec, f) {
  const sid = rec.sessionId || f.sid;
  if (!sid) return;
  if (rec.uuid) {
    const owner = recOwner.get(rec.uuid);
    if (owner) {
      // Already seen in another session: Claude Code starts a new session id when a compacted or still open
      // conversation is resumed, and repeats its records there. The older one is the same chat.
      if (owner !== sid && !f.agentId && sessions.has(owner) && !sessions.get(owner).supersededBy) sessions.get(owner).supersededBy = sid;
      return;
    }
    recOwner.set(rec.uuid, sid);
  }
  const ts = rec.timestamp ? Date.parse(rec.timestamp) : 0;
  const S = getSession(sid);
  const aid = f.agentId || (rec.isSidechain ? rec.agentId : null);
  const A = aid ? getAgent(sid, aid) : null;
  const today = ts >= DAY0;
  if (ts) {
    if (ts > S.lastTs) S.lastTs = ts;
    if (!S.firstTs || ts < S.firstTs) S.firstTs = ts;
    if (A) {
      if (ts > A.lastTs) A.lastTs = ts;
      if (!A.firstTs || ts < A.firstTs) A.firstTs = ts;
    }
  }
  if (rec.cwd && !S.cwd) S.cwd = rec.cwd;
  if (rec.gitBranch && rec.gitBranch !== 'HEAD' && !A) S.branch = rec.gitBranch;

  switch (rec.type) {
    case 'ai-title':
      if (rec.aiTitle) S.title = clip(redact(rec.aiTitle), 90);
      return;
    case 'last-prompt':
      if (rec.lastPrompt && !A) S.lastPrompt = clip(redact(rec.lastPrompt), 220);
      return;
    case 'assistant':
      return onAssistant(rec, S, A, ts, today);
    case 'user':
      return onUser(rec, S, A, ts, today);
    case 'system':
      return onSystem(rec, S, A, ts, today);
  }
}

function onAssistant(rec, S, A, ts, today) {
  const actor = A || S;
  const m = rec.message || {};
  const model = m.model;
  if (rec.isApiErrorMessage || model === '<synthetic>') {
    const txt = Array.isArray(m.content) ? m.content.map((b) => b.text || '').join(' ') : '';
    emit({ t: ts, s: S.id, a: A?.id, k: 'sys', l: clip(redact(txt) || 'API error', 100), err: true }, today);
    return;
  }
  if (model) {
    actor.model = model;
    if (!A) S.model = model;
  }
  if (rec.effort && !A) S.effort = rec.effort;

  const u = m.usage;
  if (u && m.id && !seenMsg.has(m.id)) {
    seenMsg.add(m.id);
    if (!A) {
      S.ctx = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      S.ctxMax = priceFor(model)?.ctx || 0;
    }
    if (today) {
      const tk = { in: u.input_tokens || 0, out: u.output_tokens || 0, cr: u.cache_read_input_tokens || 0, cw: u.cache_creation_input_tokens || 0 };
      const c = costOf(model, u);
      for (const x of A ? [S, A] : [S]) {
        addTok(x.tok, tk);
        x.cost += c;
      }
      addTok(G.tok, tk);
      G.cost += c;
      G.saved += savedOf(model, u);
      const mk = shortModel(model) || '?';
      const bm = G.byModel.get(mk) || { model: mk, priced: !!priceFor(model), tok: zeroTok(), cost: 0, calls: 0 };
      addTok(bm.tok, tk);
      bm.cost += c;
      bm.calls++;
      G.byModel.set(mk, bm);
      const b = minuteBucket(ts);
      b.tok += tk.in + tk.out + tk.cr + tk.cw;
      b.cost += c;
      emit({ t: ts, s: S.id, a: A?.id, k: 'usage', out: tk.out, cr: tk.cr, cw: tk.cw, in: tk.in, c, m: mk }, today);
    }
  }
  if (m.stop_reason) actor.endTurn = m.stop_reason === 'end_turn';
  for (const b of Array.isArray(m.content) ? m.content : []) {
    if (b.type === 'tool_use') onToolUse(b, S, A, ts, today);
    else if (b.type === 'text' && b.text && b.text.trim()) emit({ t: ts, s: S.id, a: A?.id, k: 'say', l: clip(redact(b.text), 160), x: fullText(b.text, 4000) }, today);
    else if (b.type === 'thinking') emit({ t: ts, s: S.id, a: A?.id, k: 'think' }, today);
  }
}

function onToolUse(b, S, A, ts, today) {
  const actor = A || S;
  const name = b.name || '?';
  const c = catOf(name);
  const sm = summarize(name, b.input);
  actor.pending.set(b.id, { n: name, c, l: sm.label, t: ts });
  actor.last = { n: name, c, l: sm.label, t: ts };
  actor.sig.push(`${name}|${sm.label}`);
  if (actor.sig.length > 4) actor.sig.shift();
  if (!today) return;

  for (const x of A ? [S, A] : [S]) {
    x.tools++;
    x.byCat[c] = (x.byCat[c] || 0) + 1;
    if (c === 'web') x.web++;
  }
  const sk = Math.floor(ts / 20_000);
  S.spark.set(sk, (S.spark.get(sk) || 0) + 1);
  G.tools++;
  G.byCat[c]++;
  if (ts >= (G.lastByCat[c]?.t || 0)) G.lastByCat[c] = { l: sm.label, t: ts, s: S.id };
  const mb = minuteBucket(ts);
  mb.tools++;
  mb.cats[c] = (mb.cats[c] || 0) + 1;
  ringPush(G.ticker, { id: b.id, t: ts, c, st: 'run', n: name }, 200);

  if (c === 'web') {
    G.web++;
    ringPush(G.research, { id: b.id, t: ts, s: S.id, a: A?.id || null, kind: name === 'WebSearch' ? 'search' : 'fetch', l: sm.label, m: '', ok: null, d: null, hosts: [] }, 60);
  }
  if (name === 'Bash') ringPush(G.shells, { id: b.id, t: ts, s: S.id, a: A?.id || null, l: sm.label, cmd: sm.cmd, ok: null, d: null }, 40);
  if (sm.file) touchFile(sm.file, name, S, A, ts);
  if ((name === 'Agent' || name === 'Task') && b.input) agentHints.set(b.id, { desc: clip(b.input.description, 70), type: b.input.subagent_type || '' });
  emit({ t: ts, s: S.id, a: A?.id, k: 'tool', id: b.id, n: name, c, l: sm.label, x: toolDetail(name, b.input) }, today);
}

const agentHints = new Map(); // Agent tool_use id -> { desc, type }

function touchFile(fp, name, S, A, ts) {
  let F = G.files.get(fp);
  if (!F) G.files.set(fp, (F = { p: fp, r: 0, w: 0, last: 0, editors: new Map() }));
  if (name === 'Read' || name === 'NotebookRead') F.r++;
  else {
    F.w++;
    F.editors.set(A ? `${S.id}:${A.id}` : S.id, { t: ts, s: S.id, a: A?.id || null });
  }
  F.last = ts;
}

function onUser(rec, S, A, ts, today) {
  const content = rec.message?.content;
  if (typeof content === 'string') {
    if (!A) onPrompt(content, rec, S, ts, today);
    return;
  }
  if (!Array.isArray(content)) return;
  let hasResult = false;
  const texts = [];
  for (const b of content) {
    if (b.type === 'tool_result') {
      hasResult = true;
      onToolResult(b, rec, S, A, ts, today);
    } else if (b.type === 'text' && b.text) texts.push(b.text);
  }
  if (!hasResult && texts.length && !A) onPrompt(texts.join(' '), rec, S, ts, today);
}

function onPrompt(text, rec, S, ts, today) {
  if (rec.isMeta) return;
  const t = String(text).trim();
  if (!t) return;
  if (t.startsWith('[Request interrupted')) {
    emit({ t: ts, s: S.id, k: 'sys', l: 'interrupted by user', err: true }, today);
    return;
  }
  if (t.startsWith('<task-notification')) {
    emit({ t: ts, s: S.id, k: 'sys', l: 'background task reported back' }, today);
    return;
  }
  if (t.startsWith('<') || t.startsWith('Caveat:')) {
    const cmd = /<command-name>([^<]+)<\/command-name>/.exec(t);
    if (cmd) emit({ t: ts, s: S.id, k: 'prompt', l: cmd[1].trim(), cmd: true }, today);
    return;
  }
  S.endTurn = false;
  if (today) {
    S.prompts++;
    G.prompts++;
  }
  emit({ t: ts, s: S.id, k: 'prompt', l: clip(redact(t), 180), x: fullText(t, 4000) }, today);
}

function onToolResult(b, rec, S, A, ts, today) {
  const actor = A || S;
  const id = b.tool_use_id;
  const p = actor.pending.get(id) || S.pending.get(id);
  actor.pending.delete(id);
  S.pending.delete(id);
  const ok = !b.is_error;
  const d = p && ts ? Math.max(0, ts - p.t) : null;
  const tr = rec.toolUseResult;
  const { meta, hosts } = resultMeta(tr);
  if (tr && typeof tr === 'object' && !Array.isArray(tr)) {
    if (tr.agentId) {
      const sub = getAgent(S.id, tr.agentId);
      const hint = agentHints.get(id);
      if (!sub.desc) sub.desc = clip(tr.description || hint?.desc, 70);
      if (!sub.type && hint?.type) sub.type = hint.type;
      if (tr.resolvedModel && !sub.model) sub.model = tr.resolvedModel;
    }
  }
  if (!today) return;
  if (!ok) {
    actor.errors++;
    if (A) S.errors++;
    G.errors++;
  }
  const tk = G.ticker.findLast((x) => x.id === id);
  if (tk) tk.st = ok ? 'ok' : 'err';
  const rs = G.research.findLast((x) => x.id === id);
  if (rs) Object.assign(rs, { ok, d, m: meta, hosts });
  const sh = G.shells.findLast((x) => x.id === id);
  if (sh) Object.assign(sh, { ok, d });
  emit({ t: ts, s: S.id, a: A?.id, k: 'result', id, n: p?.n, c: p?.c, ok, d, m: meta, o: outputPreview(b, tr) }, today);
}

function onSystem(rec, S, A, ts, today) {
  if (rec.subtype === 'turn_duration' && rec.durationMs) {
    if (!A) S.turnMs = rec.durationMs;
    if (today) {
      G.turns++;
      G.turnMs += rec.durationMs;
    }
    emit({ t: ts, s: S.id, k: 'turn', d: rec.durationMs }, today);
  } else if (rec.subtype === 'compact_boundary') {
    emit({ t: ts, s: S.id, k: 'sys', l: 'context compacted' }, today);
  } else if (rec.level === 'error' || rec.subtype === 'api_error') {
    emit({ t: ts, s: S.id, k: 'sys', l: clip(redact(rec.content || rec.subtype), 100), err: true }, today);
  }
}

// ---------- transcript files ----------
function newCursor(fp) {
  const rel = path.relative(PROJECTS, fp).split(path.sep);
  const f = { fp, off: 0, rest: null, sid: null, agentId: null, started: false, skipLine: false, busy: false, again: false };
  if (rel.length === 2) f.sid = rel[1].replace(/\.jsonl$/, '');
  else if (rel.length >= 3) {
    f.sid = rel[1];
    const base = rel[rel.length - 1].replace(/\.jsonl$/, '');
    f.agentId = base.replace(/^agent-/, '');
    loadAgentMeta(fp, f);
  }
  return f;
}

async function loadAgentMeta(fp, f) {
  try {
    const meta = JSON.parse(await fsp.readFile(fp.replace(/\.jsonl$/, '.meta.json'), 'utf8'));
    const A = getAgent(f.sid, f.agentId);
    A.desc = clip(meta.description, 70) || A.desc;
    A.type = meta.agentType || A.type;
    if (meta.model && meta.model !== 'inherit') A.model = meta.model;
    A.bg = meta.requestShape === 'background';
  } catch {}
}

// Binary search for the byte offset where records reach `since`, so huge transcripts load fast.
async function seekTime(fp, size, since) {
  const fh = await fsp.open(fp, 'r');
  try {
    const probe = async (pos) => {
      const len = Math.min(2 << 20, size - pos);
      const buf = Buffer.allocUnsafe(len);
      const { bytesRead } = await fh.read(buf, 0, len, pos);
      const s = buf.toString('utf8', 0, bytesRead);
      const nl = s.indexOf('\n');
      if (nl < 0) return null;
      const m = /"timestamp":"(\d{4}-\d\d-\d\dT[^"]+)"/.exec(s.slice(nl + 1));
      return m ? Date.parse(m[1]) : null;
    };
    let lo = 0, hi = size;
    for (let i = 0; i < 32 && hi - lo > 1 << 20; i++) {
      const mid = Math.floor((lo + hi) / 2);
      const t = await probe(mid);
      if (t === null || t >= since) hi = mid;
      else lo = mid;
    }
    return lo;
  } finally {
    await fh.close();
  }
}

async function pump(fp) {
  let f = tracked.get(fp);
  if (!f) tracked.set(fp, (f = newCursor(fp)));
  if (f.busy) {
    f.again = true;
    return;
  }
  f.busy = true;
  try {
    do {
      f.again = false;
      const st = await fsp.stat(fp).catch(() => null);
      if (!st) return;
      if (st.size < f.off) Object.assign(f, { off: 0, rest: null });
      if (!f.started) {
        f.started = true;
        if (st.size > BIG_FILE) {
          f.off = await seekTime(fp, st.size, DAY0 - 10 * MIN);
          f.skipLine = f.off > 0;
        }
      }
      if (st.size > f.off) await readFrom(f, st.size);
    } while (f.again);
  } catch (e) {
    console.error('read failed', tildify(fp), e.message);
  } finally {
    f.busy = false;
  }
}

async function readFrom(f, size) {
  const fh = await fsp.open(f.fp, 'r');
  try {
    let pos = f.off;
    while (pos < size) {
      const len = Math.min(CHUNK, size - pos);
      const buf = Buffer.allocUnsafe(len);
      const { bytesRead } = await fh.read(buf, 0, len, pos);
      if (!bytesRead) break;
      pos += bytesRead;
      const chunk = buf.subarray(0, bytesRead);
      const data = f.rest ? Buffer.concat([f.rest, chunk]) : chunk;
      let start = 0;
      if (f.skipLine) {
        const nl = data.indexOf(10);
        if (nl < 0) {
          f.rest = null;
          continue;
        }
        start = nl + 1;
        f.skipLine = false;
      }
      const last = data.lastIndexOf(10);
      if (last < start) {
        f.rest = Buffer.from(data.subarray(start));
        continue;
      }
      const text = data.toString('utf8', start, last);
      f.rest = last + 1 < data.length ? Buffer.from(data.subarray(last + 1)) : null;
      for (const line of text.split('\n')) {
        if (!line) continue;
        let rec;
        try {
          rec = JSON.parse(line);
        } catch {
          continue;
        }
        ingest(rec, f);
      }
    }
    f.off = pos;
  } finally {
    await fh.close();
  }
}

async function collectFiles(since) {
  const out = [];
  async function walk(dir, depth) {
    let ents;
    try {
      ents = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (depth < 6 && e.name !== 'memory') await walk(p, depth + 1);
      } else if (e.name.endsWith('.jsonl')) {
        const st = await fsp.stat(p).catch(() => null);
        if (st && st.mtimeMs >= since) out.push(p);
      }
    }
  }
  await walk(PROJECTS, 0);
  return out;
}

const transcriptFor = (cwd, sid) => path.join(PROJECTS, String(cwd || '').replace(/[^A-Za-z0-9]/g, '-'), `${sid}.jsonl`);

// ---------- live registry + processes ----------
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

async function pollRegistry() {
  let names = [];
  try {
    names = await fsp.readdir(REGISTRY);
  } catch {}
  const seen = new Set();
  // Two live processes can hold one conversation (a `claude --resume` that didn't fork): the one updated last
  // carries the card.
  const carriers = new Map();
  for (const n of names) {
    if (!/^\d+\.json$/.test(n)) continue;
    let j;
    try {
      j = JSON.parse(await fsp.readFile(path.join(REGISTRY, n), 'utf8'));
    } catch {
      continue;
    }
    if (!j.sessionId || !j.pid || !alive(j.pid)) continue;
    // Only the user's chats: Claude Code also registers background jobs and daemons (kind), pre-started spare
    // processes and sessions hosted inside another session.
    if ((j.kind || 'interactive') !== 'interactive' || j.spare === true || j.hostSessionId) continue;
    // Same process, new session id: Claude moved this chat on (e.g. after compacting), not a new chat.
    const before = regPid.get(j.pid);
    if (before && before !== j.sessionId && sessions.has(before)) sessions.get(before).supersededBy = j.sessionId;
    regPid.set(j.pid, j.sessionId);
    const other = carriers.get(j.sessionId);
    if (!other || (j.updatedAt || 0) > (other.updatedAt || 0)) carriers.set(j.sessionId, j);
  }
  for (const j of carriers.values()) {
    seen.add(j.sessionId);
    const S = getSession(j.sessionId);
    const prev = S.reg;
    Object.assign(S, {
      live: true, pid: j.pid, name: j.name || S.name, reg: j.status || 'busy', waitingFor: j.waitingFor || null,
      statusSince: j.statusUpdatedAt || j.updatedAt || S.statusSince, kind: j.kind || '', entry: j.entrypoint || '',
    });
    if (!S.cwd) S.cwd = j.cwd;
    if (!S.firstTs) S.firstTs = j.startedAt || 0;
    if (S.reg === 'idle' || S.reg === 'shell') S.pending.clear();
    if (prev && prev !== S.reg && booted) outbox.push({ t: Date.now(), s: S.id, k: 'status', from: prev, to: S.reg, w: S.waitingFor });
    const fp = transcriptFor(j.cwd, j.sessionId);
    if (!tracked.has(fp) && fs.existsSync(fp)) pump(fp);
  }
  for (const S of sessions.values()) {
    if (S.live && !seen.has(S.id)) {
      S.live = false;
      if (booted) outbox.push({ t: Date.now(), s: S.id, k: 'status', from: S.reg, to: 'ended' });
      S.reg = null;
      S.endedAt = Date.now();
    }
  }
}

function pollProcesses() {
  const live = [...sessions.values()].filter((S) => S.live && S.pid);
  if (!live.length) return;
  execFile('/bin/ps', ['-o', 'pid=,tty=,%cpu=,rss=', '-p', live.map((S) => S.pid).join(',')], (err, out) => {
    if (err && !out) return;
    for (const line of String(out).trim().split('\n')) {
      const [pid, tty, cpu, rss] = line.trim().split(/\s+/);
      const S = live.find((x) => String(x.pid) === pid);
      if (!S) continue;
      S.tty = tty && tty !== '??' ? `/dev/${tty}` : null;
      S.cpu = Number(String(cpu).replace(',', '.')) || 0;
      S.mem = Math.round((Number(rss) || 0) / 1024);
    }
  });
}

// Brings the iTerm2 tab that runs this session to the front.
function focusTty(tty) {
  const script = [
    'on run argv',
    'set target to item 1 of argv',
    'if application "iTerm2" is not running then return "iTerm2 is not running"',
    'tell application "iTerm2"',
    'repeat with w in windows',
    'repeat with t in tabs of w',
    'repeat with s in sessions of t',
    'if tty of s is target then',
    'try',
    'set miniaturized of w to false',
    'end try',
    'select w',
    'select t',
    'select s',
    'activate',
    'return "ok"',
    'end if',
    'end repeat',
    'end repeat',
    'end repeat',
    'end tell',
    'return "tab not found"',
    'end run',
  ].join('\n');
  return new Promise((resolve) =>
    execFile('/usr/bin/osascript', ['-e', script, tty], { timeout: 5000 }, (err, out) => {
      const r = String(out || '').trim();
      resolve({ ok: !err && r === 'ok', result: err ? clip(err.message, 160) : r });
    }),
  );
}

// ---------- chat window history ----------
async function transcriptPathFor(sid) {
  for (const f of tracked.values()) if (f.sid === sid && !f.agentId) return f.fp;
  const S = sessions.get(sid);
  if (S?.cwd && fs.existsSync(transcriptFor(S.cwd, sid))) return transcriptFor(S.cwd, sid);
  for (const d of await fsp.readdir(PROJECTS).catch(() => [])) {
    const fp = path.join(PROJECTS, d, `${sid}.jsonl`);
    if (fs.existsSync(fp)) return fp;
  }
  return null;
}

async function transcriptItems(sid, limit = 140) {
  const fp = await transcriptPathFor(sid);
  if (!fp) return [];
  const st = await fsp.stat(fp);
  // Screenshots and big tool outputs make lines huge, so widen the tail until enough items show up.
  let items = [];
  for (let span = 2 << 20; ; span *= 2) {
    const start = Math.max(0, st.size - span);
    items = await parseTail(fp, start, st.size);
    if (items.length >= limit || start === 0 || span >= 64 << 20) break;
  }
  return items.slice(-limit);
}

async function parseTail(fp, start, size) {
  const fh = await fsp.open(fp, 'r');
  let text;
  try {
    const buf = Buffer.allocUnsafe(size - start);
    const { bytesRead } = await fh.read(buf, 0, buf.length, start);
    text = buf.toString('utf8', 0, bytesRead);
  } finally {
    await fh.close();
  }
  const lines = text.split('\n');
  if (start > 0) lines.shift();
  const items = [];
  const byId = new Map();
  for (const line of lines) {
    if (!line) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (rec.isSidechain) continue;
    const t = rec.timestamp ? Date.parse(rec.timestamp) : 0;
    if (rec.type === 'assistant') {
      for (const b of Array.isArray(rec.message?.content) ? rec.message.content : []) {
        if (b.type === 'text' && b.text?.trim()) items.push({ k: 'say', t, x: fullText(b.text, 4000) });
        else if (b.type === 'tool_use') {
          const name = b.name || '?';
          const it = { k: 'tool', t, id: b.id, n: name, c: catOf(name), l: summarize(name, b.input).label, x: toolDetail(name, b.input) };
          byId.set(b.id, it);
          items.push(it);
        }
      }
    } else if (rec.type === 'user') {
      const c = rec.message?.content;
      if (typeof c === 'string' || (Array.isArray(c) && !c.some((b) => b.type === 'tool_result'))) {
        const raw = typeof c === 'string' ? c : c.filter((b) => b.type === 'text').map((b) => b.text).join(' ');
        const p = String(raw || '').trim();
        if (!rec.isMeta && p && !p.startsWith('<') && !p.startsWith('Caveat:') && !p.startsWith('[Request interrupted')) items.push({ k: 'prompt', t, x: fullText(p, 4000) });
      } else if (Array.isArray(c)) {
        for (const b of c) {
          if (b.type !== 'tool_result') continue;
          const it = byId.get(b.tool_use_id);
          if (!it) continue;
          it.ok = !b.is_error;
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

// ---------- folder picker + shortcut slots ----------
const DATA_DIR = path.join(HERE, 'data');
// The pie's 5 slices, and the 14 places around the new-terminal folder picker (?set=picker).
const SLOT_SETS = {
  pie: { file: path.join(DATA_DIR, 'shortcuts.json'), count: 5 },
  picker: { file: path.join(DATA_DIR, 'picker-shortcuts.json'), count: 14 },
};
const slotSet = (name) => SLOT_SETS[name] || SLOT_SETS.pie;
const expandHome = (p) => (p === '~' ? HOME : p.startsWith('~/') ? path.join(HOME, p.slice(2)) : p);
const encodeCwd = (cwd) => String(cwd || '').replace(/[^A-Za-z0-9]/g, '-');

async function isDir(p) {
  try {
    return (await fsp.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function listFolder(raw) {
  const dir = path.resolve(expandHome(raw || '~'));
  let ents;
  try {
    ents = await fsp.readdir(dir, { withFileTypes: true });
  } catch (e) {
    return { path: dir, display: tildify(dir), parent: path.dirname(dir), error: e.code === 'EACCES' || e.code === 'EPERM' ? 'no permission' : 'cannot open', entries: [] };
  }
  const folders = [];
  for (const e of ents) {
    if (folders.length >= 600) break;
    const full = path.join(dir, e.name);
    let folder = e.isDirectory();
    if (e.isSymbolicLink()) folder = await isDir(full);
    if (!folder || e.name.endsWith('.app')) continue;
    const st = await fsp.stat(full).catch(() => null);
    folders.push({
      name: e.name,
      path: full,
      hidden: e.name.startsWith('.'),
      modified: st ? st.mtimeMs : 0,
      git: fs.existsSync(path.join(full, '.git')),
      claude: fs.existsSync(path.join(PROJECTS, encodeCwd(full))),
    });
  }
  folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
  return { path: dir, display: tildify(dir), parent: dir === '/' ? null : path.dirname(dir), entries: folders };
}

// Folders where Claude ran recently: the first record of each recent transcript holds its start folder.
async function recentFolders(limit = 12) {
  const files = [];
  for (const d of await fsp.readdir(PROJECTS).catch(() => [])) {
    const dir = path.join(PROJECTS, d);
    for (const n of await fsp.readdir(dir).catch(() => [])) {
      if (!n.endsWith('.jsonl')) continue;
      const st = await fsp.stat(path.join(dir, n)).catch(() => null);
      if (st) files.push({ fp: path.join(dir, n), t: st.mtimeMs });
    }
  }
  files.sort((a, b) => b.t - a.t);
  const out = [];
  const seen = new Set();
  for (const f of files.slice(0, 80)) {
    const fh = await fsp.open(f.fp, 'r').catch(() => null);
    if (!fh) continue;
    let head = '';
    try {
      const buf = Buffer.allocUnsafe(32 << 10);
      const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
      head = buf.toString('utf8', 0, bytesRead);
    } finally {
      await fh.close();
    }
    const m = /"cwd":"((?:[^"\\]|\\.)*)"/.exec(head);
    if (!m) continue;
    const cwd = JSON.parse(`"${m[1]}"`);
    if (seen.has(cwd) || !(await isDir(cwd))) continue;
    seen.add(cwd);
    out.push({ name: path.basename(cwd) || cwd, path: cwd, display: tildify(cwd), t: f.t });
    if (out.length >= limit) break;
  }
  return out;
}

async function readSlots(set) {
  const { file, count } = slotSet(set);
  try {
    const j = JSON.parse(await fsp.readFile(file, 'utf8'));
    const slots = Array.isArray(j.slots) ? j.slots.slice(0, count) : [];
    while (slots.length < count) slots.push(null);
    return slots;
  } catch {
    return Array(count).fill(null);
  }
}

async function writeSlots(input, set) {
  const { file, count } = slotSet(set);
  if (!Array.isArray(input) || input.length !== count) throw new Error(`need ${count} slots`);
  const slots = [];
  for (const it of input) {
    if (!it) {
      slots.push(null);
      continue;
    }
    const dir = path.resolve(expandHome(String(it.dir || '')));
    if (!(await isDir(dir))) throw new Error(`not a folder: ${it.dir}`);
    slots.push({ name: clip(it.name || path.basename(dir) || dir, 40), dir, display: tildify(dir) });
  }
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(file, JSON.stringify({ slots }, null, 2));
  return slots;
}

function readBody(req, max = 64 << 10) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > max) {
        reject(new Error('body too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ---------- snapshot ----------
const STATUS_ORDER = { waiting: 0, idle: 1, busy: 2, ended: 3 };

function statusOf(S, now) {
  // "shell": Claude's turn is over and only a background shell (a server, a watcher) is still running.
  if (S.live) return S.reg === 'waiting' ? 'waiting' : S.reg === 'idle' || S.reg === 'shell' ? 'idle' : 'busy';
  return now - S.lastTs < 90_000 ? 'busy' : 'ended';
}

const isLoop = (sig) => sig.length >= 3 && sig.slice(-3).every((x) => x === sig[sig.length - 1]);

function pendingList(actor, now) {
  return [...actor.pending.values()].filter((p) => now - p.t < 3 * 3600_000).map((p) => ({ n: p.n, c: p.c, l: p.l, t: p.t }));
}

function agentView(A, S, now) {
  const running = A.pending.size > 0 || (!A.endTurn && now - A.lastTs < (S.reg === 'busy' ? 15 : 3) * MIN);
  return {
    id: A.id, sid: A.sid, desc: A.desc || A.type || A.id.slice(0, 8), type: A.type, model: shortModel(A.model), bg: A.bg,
    running, firstTs: A.firstTs, lastTs: A.lastTs, tools: A.tools, errors: A.errors, web: A.web, cost: A.cost, tok: A.tok,
    last: A.last, pending: pendingList(A, now), loop: isLoop(A.sig),
  };
}

// Usage limits as Claude Code's status line reports them (statusline.sh keeps the latest JSON that has them).
const LIMITS_FILE = path.join(os.homedir(), 'Library/Application Support/atalay-terminal/limits.json');
let limitsCache = { mtime: -1, value: null };
function readLimits() {
  let st;
  try {
    st = fs.statSync(LIMITS_FILE);
  } catch {
    return null;
  }
  if (st.mtimeMs === limitsCache.mtime) return limitsCache.value;
  let value = null;
  try {
    const rl = JSON.parse(fs.readFileSync(LIMITS_FILE, 'utf8')).rate_limits || {};
    const win = (w) => (w && typeof w.used_percentage === 'number'
      ? { pct: w.used_percentage, resetsAt: w.resets_at ? (w.resets_at < 1e12 ? w.resets_at * 1000 : w.resets_at) : 0 }
      : null);
    value = { fiveHour: win(rl.five_hour), week: win(rl.seven_day), at: st.mtimeMs };
  } catch {}
  limitsCache = { mtime: st.mtimeMs, value };
  return value;
}

// Sessions ended or removed from the dashboard's list (its cards' red button), with the Claude process they had; one
// comes back only if another process resumes it.
const dismissed = new Map();

function snapshot() {
  const now = Date.now();
  const list = [];
  let runningAgents = 0;
  for (const S of sessions.values()) {
    const gone = dismissed.get(S.id);
    if (gone !== undefined) {
      if (!(S.live && S.pid && S.pid !== gone)) continue;
      dismissed.delete(S.id);
    }
    // A compacted conversation shows once, as the session it continues in.
    if (S.supersededBy && !S.live) continue;
    let status = statusOf(S, now);
    // Claude ended its turn to wait for its background subagents: not the user's turn yet. Nor right after one
    // has finished; Claude picks its result up a moment later.
    if (status === 'idle') {
      for (const A of agents.values()) {
        if (A.sid !== S.id || !A.bg) continue;
        if (A.pending.size > 0 || (!A.endTurn && now - A.lastTs < 3 * MIN) || now - A.lastTs < 20_000) {
          status = 'busy';
          break;
        }
      }
    }
    if (status === 'ended' && now - S.lastTs > 30 * MIN) continue;
    const subs = [...agents.values()]
      .filter((A) => A.sid === S.id)
      .map((A) => agentView(A, S, now))
      .filter((a) => a.running || now - a.lastTs < 15 * MIN)
      .sort((a, b) => b.running - a.running || b.lastTs - a.lastTs);
    const nRun = subs.filter((a) => a.running).length;
    runningAgents += nRun;
    const pending = pendingList(S, now);
    const spark = [];
    const k0 = Math.floor(now / 20_000);
    for (let k = k0 - 29; k <= k0; k++) spark.push(S.spark.get(k) || 0);
    const flags = [];
    if (isLoop(S.sig) || subs.some((a) => a.loop)) flags.push('loop?');
    if (pending.some((p) => now - p.t > 3 * MIN) && status === 'busy') flags.push('slow tool');
    if (S.ctxMax && S.ctx / S.ctxMax > 0.8) flags.push('ctx 80%+');
    list.push({
      id: S.id, name: S.name || clip(path.basename(S.cwd || '') + '-' + S.id.slice(0, 2), 24), title: S.title, lastPrompt: S.lastPrompt,
      cwd: cwdLabel(S.cwd), branch: S.branch, model: shortModel(S.model), effort: S.effort,
      status, live: S.live, waitingFor: S.waitingFor, statusSince: S.live ? S.statusSince : S.endedAt || S.lastTs,
      pid: S.pid, tty: S.tty, cpu: S.cpu, mem: S.mem, kind: S.kind, entry: S.entry,
      firstTs: S.firstTs, lastTs: S.lastTs, ctx: S.ctx, ctxMax: S.ctxMax, turnMs: S.turnMs,
      tok: S.tok, cost: S.cost, tools: S.tools, errors: S.errors, web: S.web, prompts: S.prompts, byCat: S.byCat,
      pending, last: S.last, spark, flags, agents: subs, agentsRunning: nRun,
    });
  }
  list.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.lastTs - a.lastTs);

  const m0 = Math.floor(now / MIN);
  for (const k of G.min.keys()) if (k < m0 - 90) G.min.delete(k);
  const catSpark = Object.fromEntries(CATS.map((c) => [c, []]));
  const toolSpark = [], tokSpark = [], costSpark = [];
  for (let k = m0 - 29; k <= m0; k++) {
    const b = G.min.get(k);
    toolSpark.push(b?.tools || 0);
    tokSpark.push(b?.tok || 0);
    costSpark.push(+(b?.cost || 0).toFixed(4));
    if (k > m0 - 15) for (const c of CATS) catSpark[c].push(b?.cats[c] || 0);
  }
  const last5 = (arr) => arr.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const cost15 = costSpark.slice(-15).reduce((a, b) => a + b, 0);

  const files = [...G.files.values()]
    .map((F) => {
      const recent = [...F.editors.values()].filter((e) => now - e.t < 20 * MIN);
      return {
        p: tildify(F.p), short: shortPath(F.p), r: F.r, w: F.w, last: F.last,
        editors: [...F.editors.values()].map((e) => ({ s: e.s, a: e.a })), collision: recent.length > 1,
      };
    })
    .sort((a, b) => b.collision - a.collision || b.w * 3 + b.r - (a.w * 3 + a.r) || b.last - a.last)
    .slice(0, 14);

  const pendingByCat = Object.fromEntries(CATS.map((c) => [c, 0]));
  for (const s of list) {
    for (const p of s.pending) pendingByCat[p.c]++;
    for (const a of s.agents) for (const p of a.pending) pendingByCat[p.c]++;
  }

  const t = G.tok;
  const promptTok = t.in + t.cr + t.cw;
  const sessionsToday = [...sessions.values()].filter((S) => S.lastTs >= DAY0 && (S.tools || S.prompts)).length;
  const agentsToday = [...agents.values()].filter((A) => A.lastTs >= DAY0 && A.tools).length;
  return {
    now, day0: DAY0, booted,
    sessions: list,
    totals: {
      live: list.filter((s) => s.live).length, sessionsToday, agentsToday, runningAgents,
      cost: G.cost, saved: G.saved, tok: G.tok, tools: G.tools, errors: G.errors, web: G.web, prompts: G.prompts,
      cacheHit: promptTok ? t.cr / promptTok : 0, okRate: G.tools ? (G.tools - G.errors) / G.tools : 1,
      avgTurn: G.turns ? G.turnMs / G.turns : 0, turns: G.turns,
      toolsPerMin: last5(toolSpark), tokPerMin: last5(tokSpark), costPerHour: cost15 * 4,
      agentShare: G.cost ? [...agents.values()].reduce((a, A) => a + A.cost, 0) / G.cost : 0,
    },
    byCat: G.byCat, lastByCat: G.lastByCat, pendingByCat, catSpark, toolSpark, tokSpark, costSpark,
    byModel: [...G.byModel.values()].sort((a, b) => b.cost - a.cost),
    research: G.research.slice(-30).reverse(),
    shells: G.shells.slice(-14).reverse(),
    ticker: G.ticker.slice(-200),
    files,
    limits: readLimits(),
  };
}

// ---------- day rollover ----------
function maybeNewDay() {
  const d = dayStartOf();
  if (d === DAY0) return;
  DAY0 = d;
  G = freshGlobals();
  seenMsg.clear();
  recOwner.clear();
  for (const x of [...sessions.values(), ...agents.values()]) Object.assign(x, counters());
}

// ---------- http ----------
// ---------- terminals: plain shells in the app's sessions, the orbit's ships ----------
// The app's terminals without Claude in them: what runs in each (the shell's foreground job, e.g. `npm run dev`),
// in which folder, how busy. Read from the app's detached screen sessions (atl-…, and atld-… of a dev run).
let terminalsJson = '[]';
const cwdCache = new Map(); // shell pid -> { cwd, at }

async function shellCwd(pid) {
  const c = cwdCache.get(pid);
  if (c && Date.now() - c.at < 10_000) return c.cwd;
  const out = await new Promise((resolve) => execFile('/usr/sbin/lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], (e, so) => resolve(e ? '' : so)));
  const cwd = /^n(.+)$/m.exec(out)?.[1] || '';
  cwdCache.set(pid, { cwd, at: Date.now() });
  return cwd;
}

// "node /…/node_modules/.bin/vite --port 5173" -> "vite --port 5173"; "npm run dev" stays.
function commandLabel(cmd) {
  const parts = cmd.split(/\s+/).filter(Boolean).map((p) => (p.includes('/') ? path.basename(p) : p));
  if (/^node(js)?$/.test(parts[0]) && parts.length > 1) parts.shift();
  return clip(parts.join(' '), 48);
}

async function pollTerminals() {
  const out = await new Promise((resolve) => execFile('/bin/ps', ['-axo', 'pid=,ppid=,pcpu=,command='], { maxBuffer: 8 << 20 }, (e, so) => resolve(e ? '' : so)));
  const procs = new Map(), kids = new Map();
  for (const line of out.split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+([\d.,]+)\s+(.*)$/.exec(line);
    if (!m) continue;
    const p = { pid: +m[1], ppid: +m[2], cpu: Number(m[3].replace(',', '.')) || 0, cmd: m[4] };
    procs.set(p.pid, p);
    if (!kids.has(p.ppid)) kids.set(p.ppid, []);
    kids.get(p.ppid).push(p);
  }
  const tree = (pid) => {
    const all = [];
    const walk = (id, depth) => {
      for (const c of kids.get(id) || []) {
        all.push(c);
        if (depth) walk(c.pid, depth - 1);
      }
    };
    walk(pid, 6);
    return all;
  };
  const list = [];
  for (const p of procs.values()) {
    const m = /SCREEN\b.*-dmS (atld?-[0-9a-f-]+)/i.exec(p.cmd);
    if (!m) continue;
    const all = tree(p.pid);
    if (all.some((c) => /(^|\/)claude(\.exe)?(\s|$)/.test(c.cmd))) continue; // a chat, not a terminal
    const shell = all.find((c) => /^-?(\/\S*\/)?(zsh|bash|fish)(\s|$)/.test(c.cmd));
    if (!shell) continue;
    const job = (kids.get(shell.pid) || [])[0];
    const cwd = await shellCwd(shell.pid);
    list.push({
      id: m[1], cwd: tildify(cwd), dir: path.basename(cwd) || cwd, cmd: job ? commandLabel(job.cmd) : '', running: !!job,
      cpu: job ? Math.round(tree(shell.pid).reduce((sum, c) => sum + c.cpu, 0)) : 0,
    });
  }
  list.sort((a, b) => a.id.localeCompare(b.id));
  const json = JSON.stringify(list);
  if (json === terminalsJson) return;
  terminalsJson = json;
  for (const c of clients) send(c, 'terminals', json);
}

// ---------- cloud: hacker name, online count, updates ----------
// Staging is the same Mac as the app, so it uses the app's identity: the same device hash, and the token file the app
// keeps for the same API (one per API, see Cloud.swift), so staging and a dev run of the app share one sign-in.
// It shows updates; only the app installs them.
const API_URL = (process.env.ATALAY_API_URL || 'http://127.0.0.1:4800').replace(/\/+$/, '');
const APP_SUPPORT = path.join(HOME, 'Library/Application Support/atalay-terminal');
const API_HOST = new URL(API_URL);
const TOKEN_FILE = path.join(APP_SUPPORT, `device-token-${API_HOST.hostname}${API_HOST.port ? '-' + API_HOST.port : ''}`);
const APP_PLIST = path.join(HERE, '../app/Resources/Info.plist');

function appVersion() {
  try {
    const plist = fs.readFileSync(APP_PLIST, 'utf8');
    const key = (k) => new RegExp(`<key>${k}</key>\\s*<string>([^<]*)</string>`).exec(plist)?.[1];
    return { version: key('CFBundleShortVersionString') || 'staging', build: Number(key('CFBundleVersion')) || 0 };
  } catch {
    return { version: 'staging', build: 0 };
  }
}

let deviceHash = null;
async function getDeviceHash() {
  if (deviceHash) return deviceHash;
  const out = await new Promise((resolve) => execFile('/usr/sbin/ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], (e, so) => resolve(e ? '' : so)));
  const uuid = /"IOPlatformUUID" = "([^"]+)"/.exec(out)?.[1];
  if (!uuid) throw new Error('no hardware UUID');
  return (deviceHash = createHash('sha256').update('atalay-terminal/device/v1:' + uuid).digest('hex'));
}

const readToken = () => {
  try {
    return fs.readFileSync(TOKEN_FILE, 'utf8').trim() || null;
  } catch {
    return null;
  }
};
const writeToken = (t) => {
  fs.mkdirSync(APP_SUPPORT, { recursive: true });
  fs.writeFileSync(TOKEN_FILE, t, { mode: 0o600 });
};

async function api(method, p, body, token) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = 'Bearer ' + token;
  const r = await fetch(`${API_URL}/${p}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || `http ${r.status}`), { status: r.status, code: j.error || '' });
  return j;
}

async function identify() {
  const a = await api('POST', 'v1/devices/identify', { deviceHash: await getDeviceHash(), appVersion: appVersion().version, build: appVersion().build });
  if (a.known) writeToken(a.token);
  return a.known;
}

async function cloudState() {
  const app = appVersion();
  const s = { reachable: false, registered: null, hackerName: null, tag: null, online: 0, version: app.version, build: app.build, update: null, updating: null, updateError: null };
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = readToken();
      if (token) {
        try {
          const a = await api('POST', 'v1/heartbeat', app.build ? { build: app.build } : {}, token);
          const u = a.update;
          return { ...s, reachable: true, registered: true, hackerName: a.hackerName, tag: a.tag, online: a.online, update: u && { version: u.version, build: u.build, notes: u.notes }, xp: a.xp || null };
        } catch (e) {
          if (e.status !== 401) throw e;
        }
      }
      if (!(await identify())) return { ...s, reachable: true, registered: false };
    }
  } catch {}
  return s;
}

const errorCode = (e) => (e.status ? e.code || `http_${e.status}` : 'offline');

// Friends and messages for the page: the same endpoints the app's bridge allows, with this Mac's token.
const SOCIAL_PATH = /^v1\/(me\/(status|activity|leaderboard)$|social$|feedback$|leaderboard(\?|$)|friends(\/|$)|messages(\/|\?|$))/;
async function socialCall({ method = 'GET', path: p = '', body } = {}) {
  const token = readToken();
  if (!token) return { error: 'signed_out' };
  if (!SOCIAL_PATH.test(p) || p.includes('..')) return { error: 'bad_path' };
  const headers = { authorization: 'Bearer ' + token };
  const send = method !== 'GET' && body !== undefined && body !== null;
  if (send) headers['content-type'] = 'application/json';
  try {
    const r = await fetch(`${API_URL}/${p}`, { method, headers, body: send ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10_000) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? j : { error: j.error || `http_${r.status}` };
  } catch {
    return { error: 'offline' };
  }
}

// The live line, as the app keeps it: one WebSocket to the API, its events passed on to every open page (SSE
// "social"). Reopens after a drop, backing off up to a minute.
let liveDelay = 2000;
let liveSocket = null;
async function openLive() {
  if (liveSocket) return;
  const token = readToken();
  const retry = () => {
    liveSocket = null;
    setTimeout(openLive, liveDelay);
    liveDelay = Math.min(liveDelay * 2, 60_000);
  };
  if (!token) return setTimeout(openLive, 30_000);
  let ticket;
  try {
    ticket = (await api('POST', 'v1/live/ticket', {}, token)).ticket;
  } catch {
    return retry();
  }
  const ws = new WebSocket(`${API_URL.replace(/^http/, 'ws')}/v1/live?ticket=${encodeURIComponent(ticket)}`);
  liveSocket = ws;
  ws.addEventListener('open', () => (liveDelay = 2000));
  ws.addEventListener('message', (e) => {
    for (const c of clients) send(c, 'social', String(e.data));
  });
  ws.addEventListener('close', retry);
  ws.addEventListener('error', () => {});
}

async function cloudCall(type, body) {
  const name = String(body.name || '');
  switch (type) {
    case 'state':
      return cloudState();
    case 'register':
      try {
        const app = appVersion();
        const a = await api('POST', 'v1/devices', { deviceHash: await getDeviceHash(), hackerName: name, appVersion: app.version, build: app.build });
        writeToken(a.token);
        return { error: null };
      } catch (e) {
        if (e.code === 'device_exists') return { error: (await identify().catch(() => false)) ? null : 'offline' };
        return { error: errorCode(e) };
      }
    case 'rename': {
      const token = readToken();
      if (!token) return { error: 'offline' };
      return api('PATCH', 'v1/me', { hackerName: name }, token).then(() => ({ error: null }), (e) => ({ error: errorCode(e) }));
    }
    case 'update':
      return { error: 'app_only' };
    default:
      return { error: 'unknown' };
  }
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const clients = new Set();
const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

function send(c, event, data) {
  c.res.write(`event: ${event}\ndata: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
}
const sendInit = (c) => {
  send(c, 'init', { state: snapshot(), log: log.slice(-160) });
  send(c, 'terminals', terminalsJson);
};

const server = http.createServer(async (req, res) => {
  if (!ALLOWED_HOSTS.has(req.headers.host || '')) {
    res.writeHead(403).end('forbidden');
    return;
  }
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/stream') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write('retry: 2000\n\n');
    const c = { res, ready: booted };
    clients.add(c);
    if (booted) sendInit(c);
    req.on('close', () => clients.delete(c));
    return;
  }

  const sendJson = (code, obj) => res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(obj));

  if (url.pathname === '/api/fs/list') {
    sendJson(200, await listFolder(url.searchParams.get('path') || '~'));
    return;
  }

  if (url.pathname === '/api/fs/places') {
    const fav = [
      { name: 'Home', path: HOME, icon: 'home' },
      { name: 'Desktop', path: path.join(HOME, 'Desktop'), icon: 'desktop' },
      { name: 'Documents', path: path.join(HOME, 'Documents'), icon: 'doc' },
      { name: 'Downloads', path: path.join(HOME, 'Downloads'), icon: 'down' },
      { name: 'Repos', path: path.join(HOME, 'Documents', 'Repos'), icon: 'code' },
    ];
    const favorites = [];
    for (const f of fav) if (await isDir(f.path)) favorites.push({ ...f, display: tildify(f.path) });
    sendJson(200, { home: HOME, favorites, recents: await recentFolders() });
    return;
  }

  if (url.pathname === '/api/shortcuts') {
    if (req.method === 'PUT') {
      if (req.headers['x-radar'] !== '1') return sendJson(403, { error: 'forbidden' });
      try {
        const body = JSON.parse(await readBody(req));
        sendJson(200, { slots: await writeSlots(body.slots, url.searchParams.get('set')) });
      } catch (e) {
        sendJson(400, { error: e.message });
      }
      return;
    }
    sendJson(200, { slots: await readSlots(url.searchParams.get('set')) });
    return;
  }

  if (url.pathname === '/api/cloud/social' && req.method === 'POST') {
    if (req.headers['x-radar'] !== '1') return sendJson(403, { error: 'forbidden' });
    let body = {};
    try {
      body = JSON.parse((await readBody(req)) || '{}');
    } catch {}
    sendJson(200, await socialCall(body));
    return;
  }

  if (url.pathname.startsWith('/api/cloud/') && req.method === 'POST') {
    if (req.headers['x-radar'] !== '1') return sendJson(403, { error: 'forbidden' });
    let body = {};
    try {
      body = JSON.parse((await readBody(req)) || '{}');
    } catch {}
    sendJson(200, await cloudCall(url.pathname.slice('/api/cloud/'.length), body));
    return;
  }

  if (url.pathname === '/api/transcript') {
    const sid = url.searchParams.get('sid') || '';
    const items = /^[A-Za-z0-9-]{8,64}$/.test(sid) ? await transcriptItems(sid).catch(() => []) : [];
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify({ items }));
    return;
  }

  // A card's red button: Claude stops (SIGTERM to its process, wherever it runs) and the card goes; an ended session's
  // card just goes.
  if (url.pathname === '/api/session/end' && req.method === 'POST') {
    if (req.headers['x-radar'] !== '1') return sendJson(403, { error: 'forbidden' });
    const S = sessions.get(url.searchParams.get('sid') || '');
    if (!S) return sendJson(404, { error: 'no such session' });
    if (S.live && S.pid) {
      try {
        process.kill(S.pid, 'SIGTERM');
      } catch {}
    }
    dismissed.set(S.id, S.live && S.pid ? S.pid : 0);
    return sendJson(200, { ok: true });
  }

  if (url.pathname === '/api/focus' && req.method === 'POST') {
    if (req.headers['x-radar'] !== '1') {
      res.writeHead(403).end();
      return;
    }
    const S = sessions.get(url.searchParams.get('sid') || '');
    const r = S?.tty ? await focusTty(S.tty) : { ok: false, result: 'no terminal for this session' };
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(r));
    return;
  }

  const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  if (!/^[a-z0-9._-]+$/i.test(file)) {
    res.writeHead(404).end();
    return;
  }
  try {
    const body = await fsp.readFile(path.join(PUBLIC, file));
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

// ---------- boot ----------
async function boot() {
  const t0 = Date.now();
  await pollRegistry();
  const files = new Set(await collectFiles(DAY0));
  for (const S of sessions.values()) if (S.live) files.add(transcriptFor(S.cwd, S.id));
  // Oldest transcript first, so copied history is credited to the session that made it, not its fork.
  const born = (fp) => fs.statSync(fp, { throwIfNoEntry: false })?.birthtimeMs ?? Infinity;
  for (const fp of [...files].sort((a, b) => born(a) - born(b))) if (fs.existsSync(fp)) await pump(fp);
  settleRings();
  booted = true;
  pollProcesses();
  console.log(`claude-radar: indexed ${files.size} transcripts in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${sessions.size} sessions, ${agents.size} agents`);
  for (const c of clients) sendInit(c);
  openLive();

  try {
    fs.watch(PROJECTS, { recursive: true }, (_evt, name) => {
      if (name && String(name).endsWith('.jsonl')) pump(path.join(PROJECTS, String(name)));
    });
  } catch (e) {
    console.error('fs.watch unavailable, polling only:', e.message);
  }
  let lastScan = Date.now();
  setInterval(async () => {
    const since = lastScan - 5000;
    lastScan = Date.now();
    for (const fp of await collectFiles(since)) pump(fp);
  }, 10_000);
  setInterval(() => {
    for (const f of tracked.values()) if (Date.now() - (sessions.get(f.sid)?.lastTs || 0) < 30 * MIN) pump(f.fp);
  }, 2000);
  setInterval(pollRegistry, 1000);
  setInterval(pollProcesses, 3000);
  pollTerminals();
  setInterval(pollTerminals, 3000);
  setInterval(maybeNewDay, MIN);
  setInterval(() => {
    if (!outbox.length || !clients.size) {
      outbox = [];
      return;
    }
    const data = JSON.stringify(outbox);
    outbox = [];
    for (const c of clients) send(c, 'ev', data);
  }, 120);
  setInterval(() => {
    if (!clients.size) return;
    const data = JSON.stringify(snapshot());
    for (const c of clients) send(c, 'state', data);
  }, 1000);
}

server.listen(PORT, HOST, () => {
  console.log(`Atalay's Terminal staging: http://${HOST}:${PORT}  (reading ${tildify(CLAUDE_DIR)})`);
  boot().catch((e) => {
    console.error('boot failed:', e);
    process.exit(1);
  });
});
