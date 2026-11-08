'use strict';
// The spend ledger, as the Mac app's Ledger.swift keeps it: what Claude Code cost (at API list prices, as the rest of the
// dashboard counts it) by day, project and model. Claude Code deletes transcripts after 30 days (its
// `cleanupPeriodDays`), so anything older lives only here. The days before today are read from the transcripts once and
// then frozen: never read again, so a transcript Claude deletes later takes nothing away, and a day it has half deleted
// isn't counted short. Today comes live from the engine. Kept on this PC only, like everything else the dashboard reads,
// in %LOCALAPPDATA%\atalay-terminal\ledger.json, in the Mac's own layout.
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');

const WIN = process.platform === 'win32';
const HOME = os.homedir();
const SEP = WIN ? '\\' : '/';
const SPLIT = /[\\/]+/;
const MIN = 60_000;
const ASSISTANT = Buffer.from('"type":"assistant"');

// A model's totals for a day and project, with the Mac's short keys (its Codable names), so the file reads the same.
const agg = () => ({ c: 0, i: 0, o: 0, r: 0, w: 0, n: 0 });
function addCall(a, cost, i, o, r, w) {
  a.c += cost;
  a.i += i;
  a.o += o;
  a.r += r;
  a.w += w;
  a.n += 1;
}
function addAgg(a, b) {
  a.c += +b.c || 0;
  a.i += +b.i || 0;
  a.o += +b.o || 0;
  a.r += +b.r || 0;
  a.w += +b.w || 0;
  a.n += +b.n || 0;
}
const int = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : 0);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// ---------- days ----------
// The local day's key ("2026-11-05"), Gregorian as JavaScript's dates are; weeks start on Monday, as the leaderboard's do.
const pad = (n, w = 2) => String(n).padStart(w, '0');
const keyOf = (d) => `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const key = (ms) => keyOf(new Date(ms));
function dateOfKey(k) {
  const p = String(k || '').split('-').map(Number);
  return p.length === 3 && p.every(Number.isFinite) ? new Date(p[0], p[1] - 1, p[2]) : null;
}
const dayAfter = (d, n = 1) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// The start of the day, week (Monday) or month a date is in, and that many of them later (or earlier).
function unitStart(unit, d) {
  if (unit === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
  if (unit === 'week') return dayAfter(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -((d.getDay() + 6) % 7));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addUnits(unit, d, n) {
  if (unit === 'month') return new Date(d.getFullYear(), d.getMonth() + n, 1);
  return dayAfter(d, unit === 'week' ? n * 7 : n);
}

/** A timestamp's day key, the last day remembered (records come in order, so it rarely changes). */
function dayKeys() {
  let lo = 0, hi = -1, last = '';
  return (ms) => {
    if (ms >= lo && ms < hi) return last;
    const start = new Date(ms);
    start.setHours(0, 0, 0, 0);
    lo = start.getTime();
    hi = dayAfter(start).getTime();
    last = keyOf(start);
    return last;
  };
}

// ---------- names ----------
function tildify(p) {
  const s = String(p || '');
  const head = s.slice(0, HOME.length);
  return s && (WIN ? head.toLowerCase() === HOME.toLowerCase() : head === HOME) ? '~' + s.slice(HOME.length) : s;
}
const partsOf = (cwd) => tildify(cwd).split(SPLIT).filter(Boolean);
const projectLabel = (cwd) => partsOf(cwd).slice(-2).join(SEP);

/** The shortest end of each path that tells them apart, at least `least` of its parts ("05_AI" twice becomes
 *  "F1Reels\…\05_AI" and "SecondReels\…\05_AI"), as the Mac's distinctLabels. */
function distinctLabels(cwds, least = 2) {
  const split = new Map(cwds.map((c) => [c, partsOf(c)]));
  const out = new Map();
  const pending = new Set(cwds);
  for (let k = Math.max(1, least); pending.size; k++) {
    const seen = new Map();
    for (const cwd of pending) {
      const tail = split.get(cwd).slice(-k);
      const label = tail.length <= 2 ? tail.join(SEP) : `${tail[0]}${SEP}…${SEP}${tail[tail.length - 1]}`;
      if (!seen.has(label)) seen.set(label, []);
      seen.get(label).push(cwd);
    }
    for (const [label, owners] of seen) {
      if (owners.length > 1 && !owners.every((c) => split.get(c).length <= k)) continue;
      for (const c of owners) {
        out.set(c, owners.length === 1 ? label : tildify(c));
        pending.delete(c);
      }
    }
  }
  return out;
}

/** The git repo a folder is in, by its `.git`; a worktree's is its main repo's (Claude's own worktrees too), a
 *  submodule is a project of its own. Not the home folder (a dotfiles repo there would swallow every folder), nor a
 *  drive's root, else the folder itself. No git process: only a few file checks per folder. */
function repoRoot(cwd) {
  if (!cwd || !path.isAbsolute(cwd)) return cwd;
  const same = (a, b) => (WIN ? a.toLowerCase() === b.toLowerCase() : a === b);
  let dir = path.resolve(cwd);
  while (!same(dir, HOME) && path.dirname(dir) !== dir) {
    const git = path.join(dir, '.git');
    let st = null;
    try {
      st = fs.statSync(git);
    } catch {}
    if (st) {
      if (st.isDirectory()) return dir;
      // "gitdir: C:/path/repo/.git/worktrees/name"
      try {
        const m = /gitdir:\s*(.+)/.exec(fs.readFileSync(git, 'utf8'));
        const gitdir = m ? m[1].trim().replace(/\\/g, '/') : '';
        const w = gitdir.toLowerCase().indexOf('/.git/worktrees/');
        if (w >= 0) return path.normalize(gitdir.slice(0, w));
      } catch {}
      return dir;
    }
    dir = path.dirname(dir);
  }
  return cwd;
}

/**
 * `file`: where the ledger is kept. `costOf`, `shortModel`, `parseISO`, `withoutImages` and `seekTime` are the engine's
 * own (engine.js), so a reply counts here exactly as on the dashboard. Used from the engine; `scan` reads the transcripts
 * a piece at a time, so the app goes on meanwhile.
 */
function createLedger({ file, costOf, shortModel, parseISO, withoutImages, seekTime }) {
  let book = { version: 1, frozenThrough: null, days: {} };
  // The day that just ended, from the engine's own counters, until the transcripts are read for it a few minutes later.
  let provisional = {};
  // The transcripts are being read for the days not frozen yet (the first time: all of them).
  let reading = false;
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (saved && saved.version === 1 && isObj(saved.days)) book = { version: 1, frozenThrough: saved.frozenThrough || null, days: saved.days };
  } catch {}

  function save() {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(book));
      fs.renameSync(tmp, file);
    } catch (e) {
      console.error('ledger:', e.message);
    }
  }

  // ---------- reading the transcripts ----------
  /** Spend in [from, to) from every transcript changed since `from`, by day, project and model. Each API reply counts
   *  once, however many records or transcripts repeat it (a reply streamed over several records, forks and resumed chats
   *  that copy the history), as the engine counts it. */
  async function scan(projects, from, to) {
    const files = [];
    async function walk(dir, rel) {
      let names = [];
      try {
        names = await fsp.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const d of names) {
        const n = d.name, p = path.join(dir, n);
        if (n.endsWith('.jsonl')) {
          let st;
          try {
            st = await fsp.stat(p);
          } catch {
            continue;
          }
          if (st.mtimeMs < from - 1000) continue;
          const born = st.birthtimeMs || st.ctimeMs;
          // <project>\<session>.jsonl, or a subagent's under <project>\<session>\…
          if (rel.length === 1) files.push({ path: p, sid: n.slice(0, -6), agent: false, born, size: st.size });
          else if (rel.length >= 2) files.push({ path: p, sid: rel[1], agent: true, born, size: st.size });
        } else if (rel.length < 6 && n !== 'memory' && !n.includes('.') && d.isDirectory()) {
          await walk(p, [...rel, n]);
        }
      }
    }
    await walk(projects, []);
    // The chats before their subagents (whose project is their chat's), each oldest first, so copied history is credited
    // where it was made.
    files.sort((a, b) => (a.agent !== b.agent ? (a.agent ? 1 : -1) : a.born - b.born));

    const days = {}, seen = new Set(), cwdOf = new Map(), dayKey = dayKeys();
    for (const f of files) {
      let cwd = f.agent ? cwdOf.get(f.sid) : undefined;
      await eachLine(f.path, f.size, from, (data, off, end) => {
        if (data.subarray(off, end).indexOf(ASSISTANT) < 0) return;
        const text = end - off > 32 << 10 ? withoutImages(data.subarray(off, end)).toString('utf8') : data.toString('utf8', off, end);
        let rec;
        try {
          rec = JSON.parse(text);
        } catch {
          return;
        }
        if (!isObj(rec) || rec.type !== 'assistant') return;
        if (cwd === undefined && typeof rec.cwd === 'string') cwd = rec.cwd;
        const ts = parseISO(rec.timestamp);
        const m = rec.message;
        if (!(ts >= from && ts < to) || rec.isApiErrorMessage === true || !isObj(m) || !isObj(m.usage) || typeof m.id !== 'string') return;
        const model = typeof m.model === 'string' ? m.model : undefined;
        if (model === '<synthetic>' || seen.has(m.id)) return;
        seen.add(m.id);
        const u = m.usage, mk = shortModel(model) || '?';
        const day = (days[dayKey(ts)] ||= {});
        const project = (day[cwd ?? ''] ||= {});
        addCall((project[mk] ||= agg()), costOf(model, u), int(u.input_tokens), int(u.output_tokens),
          int(u.cache_read_input_tokens), int(u.cache_creation_input_tokens));
      });
      if (!f.agent && f.sid && cwd !== undefined) cwdOf.set(f.sid, cwd);
    }
    return days;
  }

  /** Each line of a transcript, in 4 MB pieces with the app's turn between them; a big one starts near `from` (found by
   *  its timestamps). */
  async function eachLine(fp, size, from, body) {
    let fh;
    try {
      fh = await fsp.open(fp, 'r');
    } catch {
      return;
    }
    try {
      let pos = 0, skipLine = false, rest = null;
      if (from > 0 && size > 8 << 20) {
        pos = await seekTime(fp, size, from - 10 * MIN);
        skipLine = pos > 0;
      }
      while (pos < size) {
        const len = Math.min(4 << 20, size - pos);
        const chunk = Buffer.allocUnsafe(len);
        const { bytesRead } = await fh.read(chunk, 0, len, pos);
        if (!bytesRead) break;
        pos += bytesRead;
        let data = rest ? Buffer.concat([rest, chunk.subarray(0, bytesRead)]) : chunk.subarray(0, bytesRead);
        rest = null;
        if (skipLine) {
          const nl = data.indexOf(10);
          if (nl < 0) continue;
          data = data.subarray(nl + 1);
          skipLine = false;
        }
        const last = data.lastIndexOf(10);
        if (last < 0) {
          rest = Buffer.from(data);
          continue;
        }
        rest = Buffer.from(data.subarray(last + 1));
        for (let off = 0; off < last; ) {
          let nl = data.indexOf(10, off);
          if (nl < 0 || nl > last) nl = last;
          if (nl > off) body(data, off, nl);
          off = nl + 1;
        }
        await new Promise((r) => setImmediate(r));
      }
    } finally {
      await fh.close().catch(() => {});
    }
  }

  return {
    /** The span the transcripts are to be read for: the days not frozen yet, up to today's start ({ from, to }). Null
     *  when every day before today is frozen, or a reading is under way. */
    beginReading(day0) {
      if (reading) return null;
      // The first time, everything the transcripts still have.
      const last = book.frozenThrough && dateOfKey(book.frozenThrough);
      const from = last ? dayAfter(last).getTime() : 0;
      if (!(from < day0)) return null;
      reading = true;
      return { from, to: day0 };
    },
    scan,
    /** The days read for `beginReading`'s span, frozen: a day frozen already stays as it was. */
    freeze(days, to) {
      reading = false;
      for (const [k, day] of Object.entries(days || {})) if (!book.days[k]) book.days[k] = day;
      const last = key(to - 1);
      if (!book.frozenThrough || last > book.frozenThrough) book.frozenThrough = last;
      for (const k of Object.keys(provisional)) if (k <= last) delete provisional[k];
      save();
    },
    /** The day that just ended, as the engine counted it, shown until the transcripts are read for it. */
    holdProvisional(day, dayStart) {
      if (day && Object.keys(day).length) provisional[key(dayStart)] = day;
    },

    /**
     * The spend panel's history (web/app.js), as the Mac's summary(range:) has it: the last 7 or 30 days, 12 weeks or 12
     * months up to today (today's figures live, `today`), by project: a project is a git repo (a chat in one of its
     * folders or worktrees counts there), else the folder. The `top` projects that cost most, the rest as one.
     */
    summary(range, day0, today, top = 4) {
      const todayDate = new Date(day0);
      const [unit, count] = range === '7d' ? ['day', 7] : range === '12w' ? ['week', 12] : range === '12m' ? ['month', 12] : ['day', 30];
      const current = unitStart(unit, todayDate);
      const starts = [];
      for (let k = count - 1; k >= 0; k--) starts.push(addUnits(unit, current, -k));
      const all = { ...book.days };
      for (const [k, v] of Object.entries(provisional)) if (!all[k]) all[k] = v;
      all[keyOf(todayDate)] = today || {};

      // Project folders the same however they're spelled (Windows' paths take any case).
      const projects = new Map(), byModel = new Map(), roots = new Map();
      const totals = new Array(starts.length).fill(0);
      let b = 0;
      for (let day = starts[0]; day <= todayDate; day = dayAfter(day)) {
        while (b + 1 < starts.length && day >= starts[b + 1]) b++;
        for (const [cwd, models] of Object.entries(all[keyOf(day)] || {})) {
          let root = roots.get(cwd);
          if (root === undefined) roots.set(cwd, (root = repoRoot(cwd)));
          const id = WIN ? root.toLowerCase() : root;
          let p = projects.get(id);
          if (!p) projects.set(id, (p = { root, cost: 0, byModel: new Map(), series: new Array(starts.length).fill(0) }));
          for (const [model, a] of Object.entries(models || {})) {
            const c = +a.c || 0;
            p.cost += c;
            p.byModel.set(model, (p.byModel.get(model) || 0) + c);
            let m = byModel.get(model);
            if (!m) byModel.set(model, (m = agg()));
            addAgg(m, a);
            p.series[b] += c;
            totals[b] += c;
          }
        }
      }

      const total = totals.reduce((x, y) => x + y, 0);
      let ranked = [...projects.values()].filter((p) => p.cost > 0).sort((x, y) => y.cost - x.cost);
      let rest = null;
      if (ranked.length > top + 1) {
        rest = { cost: 0, series: new Array(starts.length).fill(0) };
        for (const p of ranked.slice(top)) {
          rest.cost += p.cost;
          p.series.forEach((v, i) => (rest.series[i] += v));
        }
        ranked = ranked.slice(0, top);
      }
      const names = distinctLabels(ranked.map((p) => p.root).filter(Boolean), 1);
      const round = (v) => Math.round(v * 10_000) / 10_000;
      const list = ranked.map((p) => {
        let model = '', most = -Infinity;
        for (const [k, v] of p.byModel) if (v > most) [model, most] = [k, v];
        return {
          id: p.root, label: p.root ? names.get(p.root) || projectLabel(p.root) : 'unknown folder', path: tildify(p.root),
          cost: round(p.cost), share: total > 0 ? p.cost / total : 0, model, series: p.series.map(round),
        };
      });
      if (rest) {
        list.push({ id: '*', label: 'other', path: '', cost: round(rest.cost), share: total > 0 ? rest.cost / total : 0, model: '', series: rest.series.map(round) });
      }
      // Every model's total over the span, the costliest first (one without a list price costs 0 and says so).
      const models = [...byModel.entries()]
        .filter(([, a]) => a.n > 0)
        .sort(([, x], [, y]) => (x.c !== y.c ? y.c - x.c : y.n - x.n))
        .map(([model, a]) => ({ model, cost: round(a.c), share: total > 0 ? a.c / total : 0, calls: a.n, out: a.o }));
      const spent = Object.keys(all).filter((k) => Object.values(all[k] || {}).some((ms) => Object.values(ms || {}).some((a) => (+a.c || 0) > 0)));
      const since = spent.length ? spent.sort()[0] : null;
      return {
        range, unit, starts: starts.map(keyOf), totals: totals.map(round), total: round(total),
        projects: list, models, since, reading,
      };
    },
  };
}

module.exports = { createLedger, agg, addCall };
