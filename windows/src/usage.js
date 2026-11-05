'use strict';

// The activity bar's limit panel (app/Resources/web/git.js): for each AI tool on this PC, its usage limits as the tool
// reports them, and the tokens it used today and over the last 30 days, day by day. Read-only, from the tools' own logs:
//   Claude Code   ~/.claude/projects/**/*.jsonl        assistant replies' `usage` (one reply can span several lines:
//                                                       counted once by message id and request id); limits from the
//                                                       status line (limits.json, as the top bar has them)
//   Codex         ~/.codex/sessions/YYYY/MM/DD/*.jsonl  `token_count` events (the growth of its running total) and
//                                                       their `rate_limits`
//   Antigravity   ~/.gemini/antigravity-cli/brain/<id>/.system_generated/logs/transcript.jsonl  each reply's tokens
// Each file is read once and then only from where it was left, so asking again costs only what was written since.
//
//   const usage = createUsage({ claudeDir, limitsFile });
//   await usage.report();   // { at, days: ['2026-10-07', …, today], providers: [...] }

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { costOf, shortModel, parseLimits } = require('./engine');

const HOME = os.homedir();
const DAY = 86_400_000;
const SPAN = 30;
const CHUNK = 8 << 20;

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const tick = () => new Promise((r) => setImmediate(r));

// Where the last 30 days start: local midnight 29 days before today.
function spanStart(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime() - (SPAN - 1) * DAY;
}

// The files under `dir` (any depth up to `depth`) ending in `ext` and written since `since`.
async function walk(dir, ext, since, depth, out = []) {
  let ents;
  try {
    ents = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (depth > 0) await walk(p, ext, since, depth - 1, out);
    } else if (e.name.endsWith(ext)) {
      try {
        const st = await fsp.stat(p);
        if (st.mtimeMs >= since) out.push({ file: p, size: st.size, mtime: st.mtimeMs });
      } catch {}
    }
  }
  return out;
}

// A file's new complete lines since `from`, in chunks; `onLine` gets each. Returns where the next read starts.
async function readLines(file, from, size, onLine) {
  let fh;
  try {
    fh = await fsp.open(file, 'r');
  } catch {
    return from;
  }
  let pos = from;
  let rest = '';
  try {
    while (pos < size) {
      const len = Math.min(CHUNK, size - pos);
      const buf = Buffer.alloc(len);
      const { bytesRead } = await fh.read(buf, 0, len, pos);
      if (!bytesRead) break;
      pos += bytesRead;
      const text = rest + buf.toString('utf8', 0, bytesRead);
      const lines = text.split('\n');
      rest = lines.pop();
      for (const line of lines) if (line) onLine(line);
      await tick();
    }
  } finally {
    await fh.close().catch(() => {});
  }
  // An unfinished last line is read again next time, whole.
  return pos - Buffer.byteLength(rest, 'utf8');
}

const emptyTok = () => ({ in: 0, out: 0, cr: 0, cw: 0, cost: 0, calls: 0 });
function addTok(t, i, o, cr, cw, cost) {
  t.in += i;
  t.out += o;
  t.cr += cr;
  t.cw += cw;
  t.cost += cost;
  t.calls += 1;
}

// One tool's counts: by day, and by day and model. Files keep what they added, so a file that shrank (rewritten) is
// taken away and read again.
class Book {
  constructor() {
    this.files = new Map(); // file -> { pos, size, days: Map(day -> {tok, models: Map}) , seen: Set, state }
  }

  entry(file, size) {
    let f = this.files.get(file);
    if (f && size < f.pos) f = null;
    if (!f) this.files.set(file, (f = { pos: 0, days: new Map(), seen: new Set(), state: {} }));
    return f;
  }

  static add(f, ms, model, i, o, cr, cw, cost) {
    const k = dayKey(ms);
    let d = f.days.get(k);
    if (!d) f.days.set(k, (d = { tok: emptyTok(), models: new Map() }));
    addTok(d.tok, i, o, cr, cw, cost);
    const m = model || 'unknown';
    let mt = d.models.get(m);
    if (!mt) d.models.set(m, (mt = emptyTok()));
    addTok(mt, i, o, cr, cw, cost);
  }

  // Drops what's gone out of the 30 days (files not written since), then sums the rest.
  sum(alive, days) {
    for (const k of this.files.keys()) if (!alive.has(k)) this.files.delete(k);
    const want = new Set(days);
    const byDay = new Map(days.map((d) => [d, emptyTok()]));
    const models = new Map();
    for (const f of this.files.values()) {
      for (const [k, d] of f.days) {
        if (!want.has(k)) continue;
        const t = byDay.get(k);
        t.in += d.tok.in; t.out += d.tok.out; t.cr += d.tok.cr; t.cw += d.tok.cw; t.cost += d.tok.cost; t.calls += d.tok.calls;
        for (const [m, mt] of d.models) {
          let a = models.get(m);
          if (!a) models.set(m, (a = { today: emptyTok(), month: emptyTok() }));
          for (const which of k === days[days.length - 1] ? ['today', 'month'] : ['month']) {
            const x = a[which];
            x.in += mt.in; x.out += mt.out; x.cr += mt.cr; x.cw += mt.cw; x.cost += mt.cost; x.calls += mt.calls;
          }
        }
      }
    }
    return { byDay, models };
  }
}

function totalOf(t) {
  return t.in + t.out + t.cr + t.cw;
}

function summarize(book, alive, days, extra) {
  const { byDay, models } = book.sum(alive, days);
  const month = emptyTok();
  for (const t of byDay.values()) {
    month.in += t.in; month.out += t.out; month.cr += t.cr; month.cw += t.cw; month.cost += t.cost; month.calls += t.calls;
  }
  const today = byDay.get(days[days.length - 1]);
  const pack = (t) => ({ in: t.in, out: t.out, cr: t.cr, cw: t.cw, total: totalOf(t), cost: t.cost, calls: t.calls });
  return Object.assign(
    {
      found: alive.size > 0,
      today: pack(today),
      month: pack(month),
      daily: days.map((d) => totalOf(byDay.get(d))),
      models: [...models.entries()]
        .map(([model, a]) => ({ model, today: pack(a.today), month: pack(a.month) }))
        .sort((a, b) => b.month.total - a.month.total)
        .slice(0, 6),
    },
    extra,
  );
}

function createUsage({ claudeDir, limitsFile }) {
  const claude = new Book();
  const codex = new Book();
  const agy = new Book();
  let codexLimits = null; // { at, primary, secondary, plan }
  let busy = null;
  let last = null;

  // ---------- Claude Code ----------
  async function readClaude(since) {
    const root = path.join(claudeDir, 'projects');
    const files = await walk(root, '.jsonl', since, 4);
    const alive = new Set();
    for (const { file, size } of files) {
      alive.add(file);
      const f = claude.entry(file, size);
      if (f.pos >= size) continue;
      f.pos = await readLines(file, f.pos, size, (line) => {
        if (!line.includes('"usage"') || !line.includes('"assistant"')) return;
        let j;
        try {
          j = JSON.parse(line);
        } catch {
          return;
        }
        const m = j.message;
        if (!isObj(m) || m.role !== 'assistant' || !isObj(m.usage)) return;
        if (m.model === '<synthetic>') return;
        const key = `${m.id || ''}:${j.requestId || ''}`;
        if (key !== ':') {
          if (f.seen.has(key)) return;
          f.seen.add(key);
        }
        const ms = Date.parse(j.timestamp) || 0;
        if (ms < since) return;
        const u = m.usage;
        Book.add(f, ms, shortModel(m.model), num(u.input_tokens), num(u.output_tokens), num(u.cache_read_input_tokens), num(u.cache_creation_input_tokens), costOf(m.model, u));
      });
    }
    return alive;
  }

  function claudeLimits() {
    if (!limitsFile) return null;
    try {
      const st = fs.statSync(limitsFile);
      const L = parseLimits(limitsFile, st.mtimeMs);
      if (!L) return null;
      const out = [];
      if (L.fiveHour) out.push({ label: '5-hour window', pct: L.fiveHour.pct, resetsAt: L.fiveHour.resetsAt });
      if (L.week) out.push({ label: 'weekly', pct: L.week.pct, resetsAt: L.week.resetsAt });
      return out.length ? { at: L.at, windows: out } : null;
    } catch {
      return null;
    }
  }

  // ---------- Codex ----------
  async function readCodex(since, now) {
    const root = path.join(process.env.CODEX_HOME || path.join(HOME, '.codex'), 'sessions');
    const files = [];
    for (let back = 0; back < SPAN + 1; back++) {
      const d = new Date(now - back * DAY);
      const dir = path.join(root, String(d.getFullYear()), pad(d.getMonth() + 1), pad(d.getDate()));
      await walk(dir, '.jsonl', since, 0, files);
    }
    const alive = new Set();
    for (const { file, size } of files) {
      alive.add(file);
      const f = codex.entry(file, size);
      if (f.pos >= size) continue;
      f.pos = await readLines(file, f.pos, size, (line) => {
        if (!line.includes('"token_count"') && !line.includes('"model"')) return;
        let j;
        try {
          j = JSON.parse(line);
        } catch {
          return;
        }
        const p = j.payload;
        if (!isObj(p)) return;
        if (j.type === 'turn_context' && typeof p.model === 'string') f.state.model = p.model;
        if (p.type === 'thread_settings_applied' && isObj(p.thread_settings) && p.thread_settings.model) f.state.model = String(p.thread_settings.model);
        if (p.type !== 'token_count') return;
        const ms = Date.parse(j.timestamp) || 0;
        if (isObj(p.rate_limits) && (!codexLimits || ms >= codexLimits.at)) codexLimits = { at: ms, ...p.rate_limits };
        const tot = isObj(p.info) ? p.info.total_token_usage : null;
        if (!isObj(tot)) return;
        // The running total grows with each reply: what it grew by is that reply's (the same event written twice adds
        // nothing). Its input counts the cached part too.
        const prev = f.state.total || { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0 };
        const di = num(tot.input_tokens) - num(prev.input_tokens);
        const dc = num(tot.cached_input_tokens) - num(prev.cached_input_tokens);
        const dout = num(tot.output_tokens) - num(prev.output_tokens);
        f.state.total = tot;
        if (di <= 0 && dout <= 0) return;
        if (ms < since) return;
        Book.add(f, ms, f.state.model || 'codex', Math.max(0, di - Math.max(0, dc)), Math.max(0, dout), Math.max(0, dc), 0, 0);
      });
    }
    return alive;
  }

  function codexLimitsOut() {
    const L = codexLimits;
    if (!L) return null;
    const win = (w, fallback) => {
      if (!isObj(w)) return null;
      const pct = num(w.used_percent ?? w.used_percentage);
      const mins = num(w.window_minutes);
      let resetsAt = 0;
      if (w.resets_at) resetsAt = num(w.resets_at) < 1e12 ? num(w.resets_at) * 1000 : num(w.resets_at);
      else if (w.resets_in_seconds != null) resetsAt = L.at + num(w.resets_in_seconds) * 1000;
      const label = mins ? (mins % 1440 === 0 ? (mins === 10080 ? 'weekly' : `${mins / 1440}-day window`) : `${Math.round(mins / 60)}-hour window`) : fallback;
      return { label, pct, resetsAt };
    };
    const windows = [win(L.primary, 'primary'), win(L.secondary, 'secondary')].filter(Boolean);
    return windows.length ? { at: L.at, windows, plan: L.plan_type || null } : null;
  }

  // ---------- Antigravity ----------
  async function readAgy(since) {
    const brain = path.join(HOME, '.gemini', 'antigravity-cli', 'brain');
    let ids = [];
    try {
      ids = await fsp.readdir(brain);
    } catch {}
    const alive = new Set();
    for (const id of ids) {
      const file = path.join(brain, id, '.system_generated', 'logs', 'transcript.jsonl');
      let st;
      try {
        st = await fsp.stat(file);
      } catch {
        continue;
      }
      if (st.mtimeMs < since) continue;
      alive.add(file);
      const f = agy.entry(file, st.size);
      if (f.pos >= st.size) continue;
      f.pos = await readLines(file, f.pos, st.size, (line) => {
        if (!line.includes('PLANNER_RESPONSE')) return;
        let j;
        try {
          j = JSON.parse(line);
        } catch {
          return;
        }
        if (j.type !== 'PLANNER_RESPONSE') return;
        const ms = Date.parse(j.created_at) || 0;
        if (ms < since) return;
        Book.add(f, ms, j.model ? String(j.model) : 'antigravity', num(j.input_tokens), num(j.output_tokens), num(j.cache_read_tokens), 0, 0);
      });
    }
    return alive;
  }

  async function build() {
    const now = Date.now();
    const since = spanStart(now);
    const days = [];
    for (let i = 0; i < SPAN; i++) days.push(dayKey(since + i * DAY + DAY / 2));
    const safe = (p) => p.catch(() => new Set());
    const [ca, xa, aa] = [await safe(readClaude(since)), await safe(readCodex(since, now)), await safe(readAgy(since))];
    return {
      at: now,
      days,
      providers: [
        summarize(claude, ca, days, { id: 'claude', name: 'Claude Code', priced: true, limits: claudeLimits() }),
        summarize(codex, xa, days, { id: 'codex', name: 'Codex', priced: false, limits: codexLimitsOut() }),
        summarize(agy, aa, days, { id: 'antigravity', name: 'Antigravity', priced: false, limits: null }),
      ],
    };
  }

  // One read at a time; asked again within 5 s, the last answer.
  async function report() {
    if (last && Date.now() - last.at < 5000) return last;
    if (!busy) busy = build().then((r) => (last = r)).finally(() => (busy = null));
    return busy;
  }

  return { report };
}

module.exports = { createUsage };
