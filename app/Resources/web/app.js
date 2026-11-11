'use strict';

// ---------- constants ----------
// Each kind of tool call's colour: `color` is the orbit map's, which keeps the default theme's colours (orbit.js),
// `css` the theme's, for the rest of the page.
const CAT = {
  web: { color: '#38bdf8', css: 'var(--sky)', label: 'web', station: 'web.research' },
  browser: { color: '#5b8cff', css: 'var(--blue)', label: 'browser', station: 'browser.drive' },
  read: { color: '#3dffa8', css: 'var(--green)', label: 'read', station: 'files.read' },
  search: { color: '#b8ff3d', css: 'var(--lime)', label: 'search', station: 'code.search' },
  edit: { color: '#ffd23f', css: 'var(--amber)', label: 'edit', station: 'files.write' },
  bash: { color: '#ff5c8a', css: 'var(--orange)', label: 'shell', station: 'shell.exec' },
  agent: { color: '#9d6bff', css: 'var(--violet)', label: 'agents', station: 'agents.spawn' },
  mcp: { color: '#e879f9', css: 'var(--magenta)', label: 'mcp', station: 'mcp.call' },
  plan: { color: '#a99bc4', css: 'var(--lavender)', label: 'plan', station: 'plan.skill' },
};
const CATS = Object.keys(CAT);
const STATUS = {
  busy: { color: '#f88008', label: 'WORKING' },
  waiting: { color: '#ff2e63', label: 'NEEDS YOU' },
  idle: { color: '#00e5ff', label: 'YOUR TURN' },
  ended: { color: '#5c4d40', label: 'ENDED' },
};
// A session's colour: the orbit map's (HUES) and the theme's (--hue0…--hue9, sessCss).
const HUES = ['#ffb057', '#00e5ff', '#9d6bff', '#3dffa8', '#ff5c8a', '#5b8cff', '#ffd23f', '#b8ff3d', '#e879f9', '#f5ebe0'];
const LOG_CAT = { prompt: ['you', '#ffffff'], say: ['claude', 'var(--txt2)'], sys: ['system', 'var(--amber)'], state: ['status', 'var(--accent-soft)'] };
const FONT = '"SF Mono", Menlo, Monaco, Consolas, monospace';

// ---------- native app bridge ----------
function native(msg) {
  try {
    window.webkit.messageHandlers.radar.postMessage(msg);
  } catch {}
}
window.addEventListener('error', (e) => native({ type: 'log', msg: `${e.message} @ ${e.filename}:${e.lineno}` }));

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clipT = (s, n) => {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s;
};
function setText(el, v) {
  v = String(v ?? '');
  if (el && el.textContent !== v) el.textContent = v;
}
function setHTML(el, v) {
  if (el && el.__h !== v) {
    el.innerHTML = v;
    el.__h = v;
  }
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function fmtTok(n) {
  n = n || 0;
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e8 ? 0 : 1) + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'k';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(Math.round(n));
}
function fmtUsd(n) {
  n = n || 0;
  if (n >= 1000) return '$' + Math.round(n).toLocaleString('en-US');
  if (n >= 100) return '$' + n.toFixed(0);
  if (n >= 0.01) return '$' + n.toFixed(2);
  return n > 0 ? '$' + n.toFixed(3) : '$0';
}
function fmtDur(ms) {
  if (ms == null) return '';
  if (ms < 1000) return Math.round(ms) + 'ms';
  const s = Math.round(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm' + String(s % 60).padStart(2, '0');
  const h = Math.floor(m / 60);
  return h + 'h' + String(m % 60).padStart(2, '0');
}
function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(x).padStart(2, '0');
}
const ago = (t) => (t ? fmtDur(Math.max(0, Date.now() - t)) : '');
const hhmmss = (t) => new Date(t).toTimeString().slice(0, 8);
const ctxColor = (p) => (p < 0.5 ? '#f88008' : p < 0.8 ? '#ffd23f' : '#ff4d4d');
const ctxCss = (p) => (p < 0.5 ? 'var(--accent)' : p < 0.8 ? 'var(--amber)' : 'var(--red)');

const colorIdx = new Map();
function colorIndex(sid) {
  if (!colorIdx.has(sid)) colorIdx.set(sid, colorIdx.size);
  return colorIdx.get(sid);
}
const sessColor = (sid) => HUES[colorIndex(sid || '?') % HUES.length];
const sessCss = (sid) => `var(--hue${colorIndex(sid || '?') % HUES.length})`;
// ---------- streamer mode (the switch at the map's top right) ----------
// For a screen that's recorded or shared: every project, chat, file, command, search and reply the dashboard shows is
// swapped for a made-up one (streamer-names.js), the same one whenever the same real one comes back, on the map, in the
// panels and in the log; the app does the same in its chats list and its chat windows. The sessions, their state, the
// agents, the numbers and the animations stay as they are. Off whenever the app starts; a reload of the page keeps it.
const Streamer = (() => {
  const LISTS = window.STREAMER_NAMES || {};
  let on = false;
  // FNV-1a over the text's UTF-16 units: the app (Streamer.swift) picks the same made-up one for the same real one.
  const hash = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
    return h >>> 0;
  };
  const fake = (kind, real) => {
    if (real == null || real === '') return real;
    const s = String(real);
    const list = LISTS[kind] || LISTS.title || [s];
    return list[hash(s) % list.length];
  };
  // The texts the log's status lines are made of (a session's folder, what it waits for), with their made-up ones.
  const parts = new Map();
  const KEEP = new Set(['Claude', 'Claude Code', 'Codex', 'Antigravity', 'Gemini', 'OpenCode', 'Aider', 'Cursor', 'Copilot']);
  const base = (p) => String(p).replace(/[\\/]+$/, '').split(/[\\/]/).pop() || String(p);
  const project = (p) => (p ? fake('project', base(p)) : p);
  const folder = (p) => {
    if (!p) return p;
    const f = '~/code/' + project(p);
    parts.set(String(p), f);
    return f;
  };
  const name = (n) => (!n || KEEP.has(n) ? n : fake('project', n));
  const branch = (b) => (!b || /^(main|master|develop|dev|trunk)$/.test(b) ? b : fake('branch', b));
  const wait = (w) => {
    if (!w) return w;
    const f = fake('wait', w);
    parts.set(String(w), f);
    return f;
  };
  // A tool call's text, as its kind of call has them: a search, a page, a file, a pattern, a command…
  const KINDS = { web: 'search', browser: 'url', read: 'file', edit: 'file', search: 'grep', bash: 'cmd', agent: 'agent', mcp: 'mcp', plan: 'plan' };
  const label = (c, n, l) => (l == null || l === '' ? l : fake(c === 'web' && n && n !== 'WebSearch' ? 'url' : KINDS[c] || 'title', l));
  // A result's few words (200, exit 1) stay; anything longer, an error with a path in it, is made up too.
  const meta = (m) => (!m || (/^[\w .:%()#-]{0,16}$/.test(String(m)) && !/[\\/]/.test(String(m))) ? m : fake('meta', m));
  const call = (p) => (p ? { ...p, l: label(p.c, p.n, p.l) } : p);
  const agent = (a) => ({ ...a, desc: a.desc ? fake('agent', a.desc) : a.desc, pending: (a.pending || []).map(call), last: call(a.last) });
  const session = (s) => ({
    ...s,
    name: name(s.name),
    title: s.title ? fake('title', s.title) : s.title,
    lastPrompt: s.lastPrompt ? fake('title', s.lastPrompt) : s.lastPrompt,
    cwd: folder(s.cwd),
    branch: branch(s.branch),
    waitingFor: wait(s.waitingFor),
    pending: (s.pending || []).map(call),
    last: call(s.last),
    agents: (s.agents || []).map(agent),
  });
  // Every state is read for what its status lines will say, streaming or not: a line logged before the mode came on
  // is made up too.
  function learn(S) {
    for (const s of S?.sessions || []) {
      folder(s.cwd);
      wait(s.waitingFor);
    }
  }
  function state(S) {
    if (!on || !S) return S;
    const lastByCat = {};
    for (const [c, v] of Object.entries(S.lastByCat || {})) lastByCat[c] = v ? { ...v, l: label(c, v.n, v.l) } : v;
    return {
      ...S,
      sessions: S.sessions.map(session),
      research: (S.research || []).map((r) => ({ ...r, l: fake(r.kind === 'search' ? 'search' : 'url', r.l), hosts: (r.hosts || []).map((h) => fake('host', h)), m: meta(r.m) })),
      // A file keeps its own path as its key (rows, collisions, a cleared panel's counts): only what's shown changes.
      files: (S.files || []).map((f) => ({ ...f, short: fake('file', f.p), shown: '~/code/' + fake('file', f.p) })),
      lastByCat,
    };
  }
  function told(text) {
    let out = String(text ?? '');
    for (const [real, f] of [...parts].sort((a, b) => b[0].length - a[0].length)) if (out.includes(real)) out = out.split(real).join(f);
    return out;
  }
  function event(ev) {
    // Party mode's own are made up already.
    if (!on || !ev || ev.fake) return ev;
    switch (ev.k) {
      case 'tool':
        return { ...ev, l: label(ev.c, ev.n, ev.l), m: meta(ev.m) };
      case 'result':
        return { ...ev, m: meta(ev.m) };
      case 'prompt':
        return { ...ev, l: fake('title', ev.l) };
      case 'say':
      case 'sys':
        return { ...ev, l: fake('reply', ev.l) };
      case 'state':
        return { ...ev, l: told(ev.l) };
      default:
        return ev.l ? { ...ev, l: fake('title', ev.l) } : ev;
    }
  }
  const terminals = (list) => (!on || !Array.isArray(list) ? list : list.map((t) => ({ ...t, cmd: t.cmd ? fake('cmd', t.cmd) : t.cmd, dir: project(t.dir), cwd: folder(t.cwd) })));
  const runaways = (list) => (!on || !Array.isArray(list) ? list : list.map((r) => ({ ...r, name: r.name ? fake('proc', r.name) : r.name, cmd: r.cmd ? fake('cmd', r.cmd) : r.cmd })));
  const spend = (d) => (!on || !d || !Array.isArray(d.projects) ? d : { ...d, projects: d.projects.map((p) => (p.id === '*' ? p : { ...p, label: project(p.path || p.label), path: folder(p.path) })) });
  function set(v) {
    on = !!v;
    document.documentElement.classList.toggle('streamer', on);
  }
  return {
    get on() {
      return on;
    },
    set,
    learn,
    state,
    event,
    terminals,
    runaways,
    spend,
    name: (n) => (on ? name(n) : n),
  };
})();

// ---------- party mode (the switch next to power save) ----------
// A show for a screen that's recorded: streamer mode's made-up names, and five made-up sessions among the real ones.
// Three keep their subagents going (5, 12 and 6 of them), each subagent done 1 to 30 seconds after it started and
// another taking its place; two make their calls fast, three at a time, and go after a few turns, a new one coming in
// their place. Each turn is a prompt, the calls flying to the stations and back (now and then failed), now and then a
// question for the user on the way (needs you) answered a few seconds later, the answer, and the user's turn for a
// moment: the cards change places as the real ones do, the planets park and come back. None of it reaches the app or
// the real sessions: it's only drawn here, and goes (blown up) when the switch is off.
const Party = (() => {
  const L = window.STREAMER_NAMES || {};
  const pick = (kind) => {
    const l = L[kind] || ['…'];
    return l[Math.floor(Math.random() * l.length)];
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  // How often each kind of call comes, its tool and the kind of made-up text it has.
  const CALLS = [['read', 26, 'Read', 'file'], ['edit', 18, 'Edit', 'file'], ['bash', 16, 'Bash', 'cmd'], ['search', 14, 'Grep', 'grep'],
    ['web', 10, 'WebSearch', 'search'], ['mcp', 6, 'mcp__party__call', 'mcp'], ['plan', 4, 'TodoWrite', 'plan'], ['browser', 3, 'mcp__browser__navigate', 'url']];
  // The five: their AI tool, how many subagents each keeps going, and how many calls at once.
  const CAST = [['Claude Code', 5, 1], ['Claude Code', 12, 1], ['Codex', 6, 1], ['Claude Code', 0, 3], ['Antigravity', 0, 3]];
  // The cards' order, as the engine gives it (RadarEngine's statusOrder): needs you, your turn, working, ended; the
  // latest first.
  const ORDER = { waiting: 0, idle: 1, busy: 2, ended: 3 };
  let on = false, seq = 0;
  const timers = new Set();
  const sessions = new Map();
  let x = null; // what the show adds to the day: its sessions, calls, searches, files, squares
  const reset = () => (x = { made: 0, tools: 0, web: 0, errors: 0, cost: 0, agents: 0, calls: [], research: [], files: new Map(), ticker: [], byCat: {}, pending: {} });
  reset();
  const later = (ms, fn) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (on) fn();
    }, ms);
    timers.add(t);
  };
  const here = (s) => sessions.get(s.id) === s;

  // One of the five; the first ones as if they had been at it for a while.
  function make(i, old) {
    const [tool, crew, lanes] = CAST[i], now = Date.now(), proj = pick('project');
    return {
      id: `party:${++seq}`, cast: i, name: tool === 'Claude Code' ? proj : tool, tool, title: pick('title'), lastPrompt: '', cwd: '~/code/' + proj,
      branch: pick('branch'), model: tool === 'Codex' ? 'gpt-5.5' : tool === 'Antigravity' ? 'gemini-3' : 'opus', effort: 'high', status: 'busy', live: true,
      statusSince: now, rank: now, cpu: rand(8, 70), mem: Math.round(rand(180, 900)), kind: 'interactive', entry: '',
      firstTs: old ? now - rand(5, 90) * 60_000 : now, lastTs: now, ctx: Math.round((old ? rand(30, 150) : rand(8, 30)) * 1000), ctxMax: 200_000,
      turnMs: 0, turnAt: now, tok: { in: 0, out: 0, cr: 0, cw: 0 }, cost: old ? rand(0.4, 7) : 0, tools: old ? Math.round(rand(20, 260)) : 0, errors: 0,
      web: 0, prompts: old ? Math.round(rand(2, 14)) : 0, byCat: {}, pending: [], last: null,
      spark: Array.from({ length: 30 }, () => (old ? Math.round(rand(2, 16)) : 0)), flags: [], agents: [], agentsRunning: 0,
      waitingFor: null, tty: '', pid: 0, host: 'term', tab: null, convId: null, crew, lanes,
      // The two fast ones are done after a few turns.
      until: crew ? 0 : now + rand(40, 90) * 1000,
    };
  }
  const say = (ev) => {
    map('event', ev);
    logLine(ev, true);
    marqueePush(ev);
  };
  // Its new state: a ripple on its planet, and the line the engine's own changes write in the log.
  function status(s, st, line, cls) {
    const prev = s.status;
    if (prev === st) return;
    s.status = st;
    s.statusSince = s.rank = Date.now();
    if (st !== 'waiting') s.waitingFor = null;
    map('status', s.id, st, prev);
    if (line) logLine({ k: 'state', t: Date.now(), s: s.id, l: line, cls, fake: true }, true);
  }
  // A call: to its station and back, done after a moment, now and then failed.
  function call(s, a, kind) {
    const now = Date.now(), id = `pe${++seq}`;
    let r = Math.random() * 100, c = CALLS[0];
    for (const k of CALLS) if ((r -= k[1]) < 0) {
      c = k;
      break;
    }
    if (kind) c = [kind, 0, kind === 'agent' ? 'Agent' : c[2], kind === 'agent' ? 'agent' : c[3]];
    const [cat, , n, text] = c, l = kind === 'agent' ? a.desc : pick(text);
    const p = { n, c: cat, l, t: now };
    if (kind !== 'agent') (a || s).pending = [p];
    x.pending[cat] = (x.pending[cat] || 0) + 1;
    x.ticker.push({ id, c: cat, n, st: 'run' });
    if (x.ticker.length > 160) x.ticker.shift();
    const ev = { k: 'tool', id, t: now, s: s.id, n, c: cat, l, fake: true };
    if (a && kind !== 'agent') ev.a = a.id;
    say(ev);
    later(rand(cat === 'web' || cat === 'bash' ? 900 : 250, cat === 'web' || cat === 'bash' ? 4500 : 2200), () => {
      const ok = Math.random() > 0.06, d = Date.now() - now, owner = a || s;
      x.pending[cat] = Math.max(0, x.pending[cat] - 1);
      if (owner.pending[0] === p) owner.pending = [];
      owner.last = p;
      owner.tools++;
      owner.lastTs = Date.now();
      if (!ok) owner.errors++;
      if (a) {
        a.cost += rand(0.002, 0.02);
        s.tools++;
      }
      s.lastTs = Date.now();
      s.cost += rand(0.003, 0.04);
      s.ctx = Math.min(s.ctxMax - 2000, s.ctx + Math.round(rand(200, 2600)));
      s.spark = [...s.spark.slice(1), s.spark[29] + 1];
      x.tools++;
      x.calls.push(Date.now());
      x.cost += rand(0.003, 0.04);
      x.byCat[cat] = (x.byCat[cat] || 0) + 1;
      if (!ok) x.errors++;
      if (cat === 'web') {
        x.web++;
        s.web++;
        x.research.unshift({ id, s: s.id, a: ev.a, kind: 'search', l, hosts: [pick('host')], m: ok ? '200' : '503', d, ok, t: now });
        if (x.research.length > 20) x.research.pop();
      }
      if (cat === 'read' || cat === 'edit') {
        const f = x.files.get(l) || { p: '~/code/' + l, short: l, r: 0, w: 0, last: 0, collision: false, clash: [], editors: [] };
        if (cat === 'read') f.r++;
        else f.w++;
        f.last = Date.now();
        if (!f.editors.some((e) => e.s === s.id)) f.editors.push({ s: s.id, a: null });
        x.files.set(l, f);
      }
      const sq = x.ticker.find((q) => q.id === id);
      if (sq) sq.st = ok ? 'ok' : 'err';
      const res = { k: 'result', id, t: Date.now(), s: s.id, ok, d, fake: true };
      if (ev.a) res.a = ev.a;
      map('event', res);
      logResult(res);
    });
  }
  // A session's calls in its turn, one after the other; a subagent's as long as it runs.
  function lane(s, a, fast) {
    later(fast ? rand(250, 1400) : rand(600, 3200), () => {
      if (!here(s) || s.status === 'ended' || (a && !a.running)) return;
      if (a || s.status === 'busy') call(s, a);
      lane(s, a, fast);
    });
  }
  function spawn(s) {
    if (!here(s) || s.status === 'ended') return;
    // A new subagent comes in the session's turn.
    if (s.status !== 'busy') return later(rand(800, 2000), () => spawn(s));
    const now = Date.now();
    const a = { id: `pa${++seq}`, sid: s.id, desc: pick('agent'), type: 'general-purpose', model: 'sonnet', running: true, pending: [], last: null,
      tools: 0, cost: 0, errors: 0, firstTs: now, lastTs: now, bg: false };
    s.agents.push(a);
    x.agents++;
    call(s, a, 'agent');
    lane(s, a, true);
    // Done 1 to 30 seconds after it started; another takes its place a little later.
    later(rand(1, 30) * 1000, () => {
      a.running = false;
      a.pending = [];
      a.lastTs = Date.now();
      later(rand(3, 9) * 1000, () => {
        s.agents = s.agents.filter((b) => b !== a);
        spawn(s);
      });
    });
  }
  // A turn: the prompt, the work, now and then a question for the user on the way, the answer, then the user's turn.
  function turn(s) {
    if (!here(s) || s.status === 'ended') return;
    s.title = s.lastPrompt = pick('title');
    s.prompts++;
    s.turnAt = Date.now();
    say({ k: 'prompt', t: Date.now(), s: s.id, l: s.lastPrompt, fake: true });
    status(s, 'busy');
    s.rank = Date.now();
    const long = (s.crew ? rand(35, 80) : rand(12, 30)) * 1000;
    if (Math.random() < (s.crew ? 0.5 : 0.3)) later(long * rand(0.25, 0.7), () => ask(s));
    later(long, () => finish(s));
  }
  function ask(s) {
    if (!here(s) || s.status !== 'busy') return;
    s.waitingFor = pick('wait');
    s.pending = [];
    status(s, 'waiting', `⚠ needs you · ${s.waitingFor}`, 'err');
    later(rand(3, 8) * 1000, () => here(s) && s.status === 'waiting' && status(s, 'busy', '▶ unblocked · working again'));
  }
  function finish(s) {
    if (!here(s) || s.status === 'ended') return;
    if (s.status === 'waiting') return later(1000, () => finish(s));
    s.turnMs = Date.now() - s.turnAt;
    s.pending = [];
    say({ k: 'say', t: Date.now(), s: s.id, l: pick('reply'), fake: true });
    status(s, 'idle', '◆ turn finished · your move');
    if (s.until && Date.now() > s.until) later(rand(3, 6) * 1000, () => leave(s));
    else later((s.crew ? rand(3, 7) : rand(4, 11)) * 1000, () => turn(s));
  }
  // Done: ended for a moment (its card last, its planet dim), then gone (blown up), a new one coming meanwhile.
  function leave(s) {
    if (!here(s)) return;
    status(s, 'ended', 'session ended');
    later(rand(2, 5) * 1000, () => arrive(s.cast));
    later(rand(5, 9) * 1000, () => here(s) && sessions.delete(s.id));
  }
  // A busy one's card goes up now and then, as a real one's does with its calls.
  function stir(s) {
    later(rand(6, 15) * 1000, () => {
      if (!here(s)) return;
      if (s.status === 'busy') s.rank = Date.now();
      stir(s);
    });
  }
  function arrive(i, old) {
    const s = make(i, old);
    sessions.set(s.id, s);
    NAMES.set(s.id, s.name);
    x.made++;
    logLine({ k: 'state', t: Date.now(), s: s.id, l: `● session online · ${s.cwd}`, fake: true }, true);
    for (let k = 0; k < s.lanes; k++) lane(s, null, s.lanes > 1);
    for (let k = 0; k < s.crew; k++) later(rand(300, 6000), () => spawn(s));
    turn(s);
    stir(s);
  }
  function refresh() {
    if (!RAW) return;
    STATE = view(RAW);
    renderAll();
  }
  function tick() {
    refresh();
    later(500, tick);
  }

  function set(v) {
    if (!!v === on) return;
    on = !!v;
    if (on) {
      reset();
      // They come one after the other.
      CAST.forEach((_, i) => later(i * rand(250, 700), () => arrive(i, true)));
      tick();
      return;
    }
    for (const t of timers) clearTimeout(t);
    timers.clear();
    sessions.clear();
    reset();
    // Its lines in the log and the marquee go with it.
    for (const el of [...$('log').querySelectorAll('.ln.fake')]) {
      if (el.__id) LOGEL.delete(el.__id);
      el.remove();
    }
    for (let i = MARQ.length - 1; i >= 0; i--) if (MARQ[i].fake) MARQ.splice(i, 1);
    flushMarquee(true);
    for (const id of [...NAMES.keys()]) if (String(id).startsWith('party:')) NAMES.delete(id);
  }

  // The day as the page shows it, with the show in it.
  function add(V) {
    if (!on || !V) return V;
    const now = Date.now();
    const fake = [...sessions.values()].map((s) => {
      const agents = s.agents.map((a) => ({ ...a, pending: [...a.pending] }));
      return { ...s, pending: [...s.pending], agents, agentsRunning: agents.filter((a) => a.running).length };
    });
    const live = fake.filter((s) => s.status !== 'ended');
    const T = V.totals, perMin = x.calls.filter((t) => now - t < 60_000).length;
    x.calls = x.calls.filter((t) => now - t < 60_000);
    const sum = (a, b) => {
      const o = { ...a };
      for (const [k, n] of Object.entries(b)) o[k] = (o[k] || 0) + n;
      return o;
    };
    const at = (s) => (s.rank === undefined ? s.lastTs : s.rank) || 0;
    return {
      ...V,
      sessions: [...V.sessions, ...fake].sort((a, b) => (ORDER[a.status] ?? 3) - (ORDER[b.status] ?? 3) || at(b) - at(a)),
      totals: {
        ...T, live: T.live + live.length, sessionsToday: T.sessionsToday + x.made, runningAgents: T.runningAgents + live.reduce((n, s) => n + s.agentsRunning, 0),
        agentsToday: T.agentsToday + x.agents, tools: T.tools + x.tools, web: T.web + x.web, errors: T.errors + x.errors, cost: T.cost + x.cost,
        toolsPerMin: T.toolsPerMin + perMin, tokPerMin: T.tokPerMin + perMin * 2600, costPerHour: T.costPerHour + perMin * 0.6,
      },
      byCat: sum(V.byCat || {}, x.byCat),
      pendingByCat: sum(V.pendingByCat || {}, x.pending),
      research: [...x.research, ...(V.research || [])].sort((a, b) => b.t - a.t).slice(0, 30),
      files: [...(V.files || []), ...x.files.values()].sort((a, b) => b.collision - a.collision || b.w * 3 + b.r - (a.w * 3 + a.r)).slice(0, 14),
      ticker: [...(V.ticker || []), ...x.ticker].slice(-200),
    };
  }
  return {
    get on() {
      return on;
    },
    set,
    add,
    has: (id) => sessions.has(id),
    // A card's red button on one of the show's sessions: it just goes, and a fast one's place is taken again.
    end: (id) => {
      const s = sessions.get(id);
      if (!s) return;
      sessions.delete(id);
      if (!s.crew && s.status !== 'ended') later(rand(2, 5) * 1000, () => arrive(s.cast));
      refresh();
    },
  };
})();
// What the panels and the map show: the engine's day, made up in streamer mode, with party mode's show in it.
const view = (raw) => Party.add(Streamer.state(raw));

const NAMES = new Map();
// Party mode's sessions have made-up names already, the same as on their cards.
const sessName = (sid) => (String(sid).startsWith('party:') ? NAMES.get(sid) || '…' : Streamer.name(NAMES.get(sid) || String(sid || '?').slice(0, 6)));

// ---------- live data ----------
// STATE is what the panels and the map show (made up in streamer mode); RAW, the engine's own, for the status lines and
// for the mode going on or off.
let STATE = null;
let RAW = null;
let TERMS = null;
let RUNS = null;
const lastStatus = new Map();
const lastPrompts = new Map();

function handleInit(d) {
    RAW = d.state;
    Streamer.learn(RAW);
    STATE = view(RAW);
    for (const s of RAW.sessions) {
      NAMES.set(s.id, s.name);
      colorIndex(s.id);
      lastStatus.set(s.id, s.status);
      lastPrompts.set(s.id, s.prompts || 0);
    }
    $('log').innerHTML = '';
    LOGEL.clear();
    for (const ev of d.log) {
      logLine(ev, false);
      marqueePush(ev);
    }
    map('seed', d.log.map(Streamer.event));
    setStreak({ n: Hooks.logic.streakOf(STATE.ticker) });
    flushMarquee(true);
    renderAll();
    $('boot').classList.add('gone');
}
function handleState(next) {
    for (const s of next.sessions) NAMES.set(s.id, s.name);
    Streamer.learn(next);
    transitions(next);
    RAW = next;
    STATE = view(next);
    renderAll();
}

// The map's two switches: streamer mode (made-up names) and party mode (the names, and a show of made-up sessions).
// Either one on, everything shown is named again from the engine's own data; nothing else changes. The app names its
// chats list and chat windows the same way. Kept while the page lives (a reload keeps them), off whenever the app starts.
const MODES = { streamer: false, party: false };
try {
  MODES.streamer = sessionStorage.getItem('radar.streamer') === '1';
  MODES.party = sessionStorage.getItem('radar.party') === '1';
} catch {}
function setMode(which, on) {
  MODES[which] = !!on;
  try {
    if (MODES[which]) sessionStorage.setItem('radar.' + which, '1');
    else sessionStorage.removeItem('radar.' + which);
  } catch {}
  applyModes();
}
function applyModes() {
  const renamed = Streamer.on !== (MODES.streamer || MODES.party);
  Streamer.set(MODES.streamer || MODES.party);
  Party.set(MODES.party);
  for (const [id, which] of [['strm', 'streamer'], ['party', 'party']]) {
    $(id).classList.toggle('on', MODES[which]);
    $(id).setAttribute('aria-checked', String(MODES[which]));
  }
  native({ type: 'streamer', on: Streamer.on });
  if (!RAW) return;
  STATE = view(RAW);
  if (renamed) {
    for (const el of $('log').children) if (el.__ev) paintLine(el);
    flushMarquee(true);
    if (TERMS) map('terminals', Streamer.terminals(TERMS));
    if (RUNS) {
      const runs = Streamer.runaways(RUNS);
      window.Danger?.update(runs);
      map('runaways', runs);
    }
    if (window.Orbit?.relabel) window.Orbit.relabel();
  }
  renderAll();
  hideTip();
}
// What the user can see decides the work: the app reports whether the dashboard is visible and in front;
// a hidden page pauses CSS animations and the 3D view.
function setVisibility(visible, focused) {
  document.documentElement.classList.toggle('paused', !visible);
  document.documentElement.classList.toggle('behind', visible && !focused);
  map('activity', visible, focused);
}
// Power save (the app decides and keeps it: PowerSaver.swift, the Windows app's power.js): the switch at the map's top
// right, on when the map draws fewer and smaller frames, with why when it came on by itself (a low battery, the
// system's own saver: the Mac's Low Power Mode, or `saver`, what the app calls it, Windows' Energy Saver). Not shown
// until the app says.
const saverName = (s) => s.saver || 'Low Power Mode';
function setPowerSave(s) {
  window.__powerSave = s;
  const b = $('pwr');
  b.hidden = false;
  b.classList.toggle('on', s.on);
  b.setAttribute('aria-checked', String(s.on));
  setText(b.querySelector('em'), s.automatic ? (s.lowPower ? `auto · ${saverName(s).toLowerCase()}` : `auto · ${s.battery}%`) : '');
  if ($('pwr-tip').classList.contains('show')) powerTip();
  window.Cloud?.renderPower?.();
}
// Hovered, the switch says what power save changes, in the map's own numbers (QUALITY in orbit/index.js).
function powerTip() {
  const s = window.__powerSave, Q = window.Orbit?.quality;
  if (!s || !Q) return;
  const full = Math.min(Q.front.dpr, devicePixelRatio || 1), saved = Math.min(Q.saver.dpr, full);
  const row = (what, off, on) => `<div class="r"><span>${what}</span>${off} → <b>${on}</b></div>`;
  const why = s.automatic ? (s.lowPower ? `on by itself · ${saverName(s)}` : `on by itself · battery ${s.battery}%`) : '';
  setHTML(
    $('pwr-tip'),
    `<div class="h">power save · ${s.on ? 'on' : 'off'}${why ? ` <i>${why}</i>` : ''}</div>` +
      '<div class="d">on, the map in front draws:</div>' +
      row('frame rate', `${Q.front.fps} fps`, `${Q.saver.fps} fps`) +
      (saved < full ? row('resolution', `${full}×`, `${saved}× · ${Math.round(100 * (1 - (saved / full) ** 2))}% fewer pixels`) : '') +
      row('camera tour', 'when you\'re away', 'never') +
      `<div class="d gap">the same either way: ${Q.behind.fps} fps at ${Q.behind.dpr}× behind another window, ${Q.front.fps} fps while you drag or the camera flies, nothing drawn while the dashboard is hidden</div>` +
      `<div class="d">${s.auto ? `on by itself below ${s.threshold}% on battery and in ${saverName(s)}` : 'never on by itself'} · Settings · POWER</div>` +
      `<div class="d">click to turn it ${s.on ? 'off' : 'on'}</div>`,
  );
}
$('pwr').addEventListener('click', () => native({ type: 'powerSave', on: !window.__powerSave?.on }));
for (const [ev, show] of [['mouseenter', true], ['focus', true], ['mouseleave', false], ['blur', false]]) {
  $('pwr').addEventListener(ev, () => {
    if (show) powerTip();
    $('pwr-tip').classList.toggle('show', show);
  });
}
// Discord presence (DiscordPresence.swift, the Windows app's discord.js): Settings · DISCORD's switches and whether
// Discord answers.
function setDiscord(s) {
  window.__discord = s;
  window.Cloud?.renderDiscord?.();
}
// The top bar is every AI's, whichever chat is in front: the Windows app still reports that chat, and nothing here
// follows it.
function connect() {
  window.__radar = { init: handleInit, state: handleState, events: (list) => list.forEach(onEvent), visibility: setVisibility, power: (on) => map('power', on), powerSave: setPowerSave, discord: setDiscord, activeSession: () => {}, cloud: (c) => window.Cloud?.render(c), social: (ev) => window.Social?.event(ev), terminals: (list) => { TERMS = list; map('terminals', Streamer.terminals(list)); }, terminalGone: (id) => map('terminalGone', id), idle: (s) => { map('idle', s); setIdle(Number(s)); }, openUpdate: () => window.Cloud?.openUpdate(), openProfile: () => window.Cloud?.openMenu('profile'), openView: (v) => window.GitView?.view(v), runaways: (list) => { RUNS = list; const runs = Streamer.runaways(list); window.Danger?.update(runs); map('runaways', runs); }, openDanger: () => window.Danger?.open() };
  native({ type: 'ready' });
  // A reloaded page in streamer mode: the app's chats list and windows stay in it too.
  native({ type: 'streamer', on: Streamer.on });
}

function onEvent(ev) {
  map('event', Streamer.event(ev));
  switch (ev.k) {
    case 'tool':
    case 'prompt':
      logLine(ev, true);
      marqueePush(ev);
      break;
    case 'result':
      logResult(ev);
      setStreak(Hooks.logic.streak(streak, !!ev.ok));
      break;
    case 'say':
    case 'sys':
      logLine(ev, true);
      break;
  }
}

function transitions(next) {
  for (const s of next.sessions) {
    const prev = lastStatus.get(s.id);
    const prevPrompts = lastPrompts.get(s.id);
    if (prev === undefined) {
      logState(s, `● session online · ${s.cwd}`, 'state');
    } else if (prev !== s.status) {
      map('status', s.id, s.status, prev);
      if (s.status === 'waiting') {
        flashEdge();
        ping('waiting');
        Hooks.pulse('session-status', { value: s.status, sid: s.id });
        logState(s, `⚠ needs you · ${s.waitingFor || 'waiting'}`, 'err');
      } else if (s.status === 'idle') {
        if (prev === 'busy' || prev === 'waiting') ping('done');
        Hooks.pulse('session-status', { value: s.status, sid: s.id });
        logState(s, '◆ turn finished · your move', 'state');
      } else if (s.status === 'ended') {
        logState(s, 'session ended', 'state');
      } else if (s.status === 'busy' && prev === 'waiting') {
        logState(s, '▶ unblocked · working again', 'state');
      }
    } else if (s.status === 'idle' && prevPrompts !== undefined && (s.prompts || 0) > prevPrompts) {
      // A fast turn that started and finished between two state snapshots still announces its completion.
      ping('done');
      logState(s, '◆ turn finished · your move', 'state');
    }
    lastStatus.set(s.id, s.status);
    lastPrompts.set(s.id, s.prompts || 0);
  }
  // A chat that left the list (Claude quit, or it was ended from its window) says so here, as its "ended" card did.
  const here = new Set(next.sessions.map((s) => s.id));
  for (const [id, prev] of lastStatus) {
    if (here.has(id)) continue;
    if (prev !== 'ended') logState({ id }, 'session ended', 'state');
    lastStatus.delete(id);
    lastPrompts.delete(id);
  }
}

// ---------- sound ----------
let soundOn = false;
try {
  soundOn = localStorage.getItem('radar.sound') === '1';
} catch {}
let audio = null;
let audioOut = null;
let audioIdle = 0;
function ping(kind) {
  if (!soundOn || Hooks.sound('ping-' + kind)) return;
  try {
    if (!audio) {
      audio = new AudioContext();
      const delay = audio.createDelay(1), fb = audio.createGain(), wet = audio.createGain();
      audioOut = audio.createGain();
      delay.delayTime.value = 0.11;
      fb.gain.value = 0.18;
      wet.gain.value = 0.2;
      audioOut.gain.value = 0.81;
      audioOut.connect(audio.destination);
      audioOut.connect(delay);
      delay.connect(fb).connect(delay);
      delay.connect(wet).connect(audio.destination);
    }
    const play = (delaySec) => {
      const t0 = audio.currentTime + delaySec;
      if (kind === 'done') {
        // Turn finished (your move): crisp mechanical switch (450 -> 900 Hz) into a C6 bell chime at 85% level.
        const sw = audio.createOscillator(), sg = audio.createGain();
        sw.type = 'triangle';
        sw.frequency.setValueAtTime(450, t0);
        sw.frequency.exponentialRampToValueAtTime(900, t0 + 0.03 * 0.6);
        sg.gain.setValueAtTime(0.0001, t0);
        sg.gain.exponentialRampToValueAtTime(0.11, t0 + 0.004);
        sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
        sw.connect(sg).connect(audioOut);
        sw.start(t0);
        sw.stop(t0 + 0.05);
        const tb = t0 + 0.038, dur = 0.32;
        for (const [mult, level] of [[1, 1], [2, 0.35]]) {
          const o = audio.createOscillator(), gn = audio.createGain();
          o.type = 'sine';
          o.frequency.value = 1046.5 * mult;
          gn.gain.setValueAtTime(0.0001, tb);
          gn.gain.exponentialRampToValueAtTime(0.125 * level, tb + 0.003);
          gn.gain.exponentialRampToValueAtTime(0.0001, tb + dur * (mult === 1 ? 1 : 0.55));
          o.connect(gn).connect(audioOut);
          o.start(tb);
          o.stop(tb + dur + 0.04);
        }
      } else {
        const tones = kind === 'waiting' ? [880, 660, 880] : [523, 784];
        tones.forEach((f, i) => {
          const o = audio.createOscillator(), gn = audio.createGain(), t = t0 + i * 0.16;
          o.type = 'sine';
          o.frequency.value = f;
          gn.gain.setValueAtTime(0.0001, t);
          gn.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
          gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
          o.connect(gn).connect(audio.destination);
          o.start(t);
          o.stop(t + 0.16);
        });
      }
    };
    // A running context keeps a real-time audio thread busy (the battery): it rests 1.5 s after the last ping, and a ping
    // waits for it to wake before it starts (Windows' audio swallowed the start of a note otherwise).
    clearTimeout(audioIdle);
    audioIdle = setTimeout(() => audio.state === 'running' && audio.suspend(), 1500);
    if (audio.state === 'suspended') audio.resume().then(() => play(0.06)).catch(() => {});
    else play(0.01);
  } catch {}
}
function paintSound() {
  $('sound').textContent = soundOn ? 'sound on' : 'sound off';
  $('sound').classList.toggle('on', soundOn);
}
$('sound').addEventListener('click', () => {
  soundOn = !soundOn;
  try {
    localStorage.setItem('radar.sound', soundOn ? '1' : '0');
  } catch {}
  paintSound();
  if (soundOn) ping('idle');
});
paintSound();
// Settings sync (sync.js): the sound as set here, or as another of the user's computers set it.
window.__sound = {
  on: () => soundOn,
  set(on) {
    soundOn = !!on;
    try {
      localStorage.setItem('radar.sound', soundOn ? '1' : '0');
    } catch {}
    paintSound();
  },
};

// ---------- theme hooks (hooks.js) ----------
// The run of good tool results (data-streak), with a moment at each mark and when a run of 3 or more ends; and how long
// the computer has had no input, in steps (data-idle), with a moment on the return.
let streak = 0;
function setStreak({ n, mark = 0, broke = 0 }) {
  streak = n;
  Hooks.set('streak', n);
  if (mark) {
    Hooks.pulse('streak-milestone', { value: mark }, { ms: 3000 });
    window.Sfx?.play('streak');
  }
  if (broke) {
    Hooks.pulse('streak-break', { value: broke });
    window.Sfx?.play('streak-break');
  }
}
let idleFor = '';
function setIdle(seconds) {
  const { level, back } = Hooks.logic.idleStep(idleFor, seconds);
  idleFor = level;
  if (back) {
    Hooks.pulse('back', { value: back });
    window.Sfx?.play('back');
  }
  Hooks.set('idle', level || null);
}

// ---------- small UI bits ----------
function flashEdge() {
  const f = $('flash');
  f.classList.remove('on');
  void f.offsetWidth;
  f.classList.add('on');
}
let toastTimer = 0;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2400);
}
function focusSession(sid) {
  // Party mode's sessions are only drawn here: nothing to open.
  if (sid && !Party.has(sid)) native({ type: 'open', sid });
}

const nums = new Map();
function setNum(id, value, fmt) {
  const el = $(id);
  if (!el) return;
  let n = nums.get(id);
  if (!n || n.el !== el) {
    nums.set(id, { el, cur: value, from: value, to: value, t0: 0, fmt });
    el.textContent = fmt(value);
    return;
  }
  n.fmt = fmt;
  if (n.to === value) {
    el.textContent = fmt(n.cur);
    return;
  }
  n.from = n.cur;
  n.to = value;
  n.t0 = performance.now();
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  if (!numFrame) numFrame = requestAnimationFrame(tickNums);
}
// Runs only while some number is still rolling to its new value.
let numFrame = 0;
function tickNums(now) {
  numFrame = 0;
  let moving = false;
  for (const n of nums.values()) {
    if (n.cur === n.to) continue;
    const u = Math.min(1, (now - n.t0) / 800);
    n.cur = u >= 1 ? n.to : n.from + (n.to - n.from) * (1 - Math.pow(1 - u, 3));
    n.el.textContent = n.fmt(n.cur);
    if (n.cur !== n.to) moving = true;
  }
  if (moving) numFrame = requestAnimationFrame(tickNums);
}

// Reuses child elements by key so CSS animations and transitions survive the 1 Hz refresh.
function keyed(box, items, keyOf, create, update) {
  for (const el of [...box.children]) if (el.dataset.key === undefined) el.remove();
  delete box.dataset.empty;
  const old = new Map();
  for (const el of box.children) old.set(el.dataset.key, el);
  let ref = box.firstElementChild;
  for (const it of items) {
    const k = String(keyOf(it));
    let el = old.get(k);
    if (el) old.delete(k);
    else {
      el = create(it);
      el.dataset.key = k;
      el.classList.add('enter');
    }
    update(el, it);
    if (el === ref) ref = ref.nextElementSibling;
    else box.insertBefore(el, ref);
  }
  for (const el of old.values()) el.remove();
}
function placeholder(box, html, cls = 'empty') {
  const key = cls + html;
  if (box.dataset.empty === key) return;
  box.innerHTML = `<div class="${cls}">${html}</div>`;
  box.dataset.empty = key;
}
function sparkBars(arr, col) {
  const max = Math.max(1, ...arr);
  const w = 120 / arr.length;
  return arr
    .map((v, i) => {
      const h = v ? Math.max(1.5, (v / max) * 19) : 0.7;
      return `<rect x="${(i * w + 0.4).toFixed(1)}" y="${(20 - h).toFixed(1)}" width="${(w - 1.1).toFixed(1)}" height="${h.toFixed(1)}" style="fill:${v ? col : 'rgba(255,255,255,.09)'}"/>`;
    })
    .join('');
}
function areaChart(arr, color, w, h) {
  const max = Math.max(...arr, 1e-9);
  const step = w / Math.max(1, arr.length - 1);
  const pts = arr.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)} ${(h - 2 - (v / max) * (h - 5)).toFixed(1)}`).join(' ');
  return `<path d="${pts} L${w} ${h} L0 ${h} Z" style="fill:${color};fill-opacity:0.14"/><path d="${pts}" fill="none" style="stroke:${color}" stroke-width="1.4" vector-effect="non-scaling-stroke"/>`;
}

// ---------- log ----------
const LOGEL = new Map();
function toolText(ev) {
  const n = ev.n || '';
  if (n.startsWith('mcp__') || n === 'Bash') return ev.l || n;
  return ev.l ? `${n} · ${ev.l}` : n;
}
function markResult(el, ev) {
  const st = el.querySelector('.st');
  if (ev.ok === undefined || ev.ok === null) {
    const stale = Date.now() - (ev.t || Date.now()) > 15 * 60_000;
    st.className = stale ? 'st' : 'st run';
    st.textContent = stale ? '·' : '◌';
  } else {
    st.className = 'st ' + (ev.ok ? 'ok' : 'bad');
    st.textContent = (ev.ok ? '✓' : '✗') + (ev.d != null ? ' ' + fmtDur(ev.d) : '') + (ev.m ? ' · ' + ev.m : '');
  }
}
// A log line's kind, its colour and its text (made up in streamer mode).
function lineParts(ev) {
  if (ev.k === 'tool') return [CAT[ev.c]?.label || ev.c, CAT[ev.c]?.css || 'var(--lavender)', toolText(ev)];
  let [cat, col] = LOG_CAT[ev.k] || ['·', 'var(--lavender)'];
  // Another AI tool's answer (Codex's, Antigravity's: their sessions are "ai:…") is its own, not Claude's.
  if (ev.k === 'say' && String(ev.s || '').startsWith('ai:')) cat = 'reply';
  return [cat, col, ev.k === 'prompt' ? `› ${ev.l}` : ev.l];
}
// A line written again from its event (streamer mode on or off).
function paintLine(el) {
  const ev = Streamer.event(el.__ev);
  setText(el.querySelector('.who'), sessName(ev.s) + (ev.a ? ' ⤷' : ''));
  setText(el.querySelector('.txt'), lineParts(ev)[2]);
  if (ev.k === 'tool') markResult(el, ev);
}
function logLine(raw, live) {
  const box = $('log');
  const stick = box.scrollTop + box.clientHeight >= box.scrollHeight - 14;
  const ev = Streamer.event(raw);
  const [cat, col, text] = lineParts(ev);
  const el = document.createElement('div');
  el.__ev = raw;
  el.className = `ln ${ev.k}${ev.err || ev.cls === 'err' ? ' err' : ''}${live ? ' enter' : ''}${raw.fake ? ' fake' : ''}`;
  el.innerHTML = `<span class="tm">${hhmmss(ev.t || Date.now())}</span><span class="who" style="color:${sessCss(ev.s)}">${esc(sessName(ev.s))}${ev.a ? ' ⤷' : ''}</span><span class="cat" style="color:${col}">${esc(cat)}</span><span class="txt">${esc(text)}</span><span class="st"></span>`;
  el.dataset.sid = ev.s || '';
  // session.log cleared (its right-click menu): what came before stays out of sight.
  const lc = clearedOf('p-log');
  if (lc && (ev.t || Date.now()) < lc.t) el.classList.add('gone');
  if (ev.k === 'tool') {
    el.__id = ev.id;
    LOGEL.set(ev.id, el);
    markResult(el, ev);
  }
  box.appendChild(el);
  // Party mode's lines (made up) take room of their own, and go first: the real ones stay.
  while (box.childElementCount > (Party.on ? 380 : 220)) {
    const x = box.querySelector('.ln.fake') || box.firstElementChild;
    if (x.__id) LOGEL.delete(x.__id);
    x.remove();
  }
  if (stick) box.scrollTop = box.scrollHeight;
}
function logResult(ev) {
  const el = LOGEL.get(ev.id);
  if (!el) return;
  // Kept with the call, so the line written again (streamer mode) keeps its result.
  if (el.__ev) Object.assign(el.__ev, { ok: ev.ok, d: ev.d, m: ev.m });
  markResult(el, Streamer.event(ev));
}
function logState(s, text, cls) {
  logLine({ k: 'state', t: Date.now(), s: s.id, l: text, cls }, true);
}

// ---------- marquee ----------
// The prompts, searches, edits and agents going by, kept as they came (and written made up in streamer mode).
const MARQ = [];
let marqDirty = false;
function marqText(raw) {
  const ev = Streamer.event(raw);
  if (ev.k === 'prompt' && !ev.cmd) return `${sessName(ev.s)} › ${clipT(ev.l, 90)}`;
  if (ev.k === 'tool' && ev.c === 'web') return `${sessName(ev.s)} ${ev.n === 'WebSearch' ? '⌕' : '↓'} ${ev.l}`;
  if (ev.k === 'tool' && ev.c === 'edit') return `${sessName(ev.s)} ✎ ${ev.l}`;
  if (ev.k === 'tool' && (ev.n === 'Agent' || ev.n === 'Task')) return `${sessName(ev.s)} ◆ ${ev.l}`;
  return null;
}
function marqueePush(ev) {
  if (!((ev.k === 'prompt' && !ev.cmd) || (ev.k === 'tool' && (ev.c === 'web' || ev.c === 'edit' || ev.n === 'Agent' || ev.n === 'Task')))) return;
  MARQ.push(ev);
  if (MARQ.length > 16) MARQ.shift();
  marqDirty = true;
}
function flushMarquee(force) {
  if (!marqDirty && !force) return;
  marqDirty = false;
  if (MARQ.length) setText($('marquee'), MARQ.map(marqText).filter(Boolean).join('      ◇      '));
}
$('marquee').addEventListener('animationiteration', () => flushMarquee(false));

// ---------- panels ----------
function renderAll() {
  if (!STATE) return;
  renderTop();
  renderSessions();
  // A panel hidden from the layout (layout.js) isn't drawn; it catches up when it shows again. your.call always is:
  // it also sets the window's title.
  const shown = (id) => !window.PanelLayout || PanelLayout.visible(id);
  if (shown('p-research')) renderResearch();
  if (shown('p-files')) renderFiles();
  if (shown('p-mix')) renderMix();
  if (shown('p-workers')) renderWorkers();
  if (shown('p-spend')) renderSpend();
  renderCall();
  renderTicker();
  Hooks.set('waiting', STATE.sessions.filter((s) => s.status === 'waiting').length);
  Hooks.set('working', STATE.sessions.filter((s) => s.status === 'busy').length);
  map('state', STATE);
  const T = STATE.totals;
  const lc = clearedOf('p-log');
  setText($('m-log'), lc ? `live tool stream · ${since(lc)}` : 'live tool stream');
  setText($('m-map'), `${T.live} live · ${T.runningAgents} agents running · ${T.sessionsToday} sessions today`);
}

function renderTop() {
  const T = STATE.totals;
  setNum('k-sessions', T.live, (v) => String(Math.round(v)));
  setText($('k-sessions-sub'), `${T.sessionsToday} today`);
  setNum('k-agents', T.runningAgents, (v) => String(Math.round(v)));
  setText($('k-agents-sub'), `${T.agentsToday} today`);
  setNum('k-tpm', T.toolsPerMin, (v) => v.toFixed(1));
  setNum('k-tokm', T.tokPerMin, fmtTok);
  setNum('k-cost', T.cost, fmtUsd);
  setText($('k-burn'), `${fmtUsd(T.costPerHour)}/h burn`);
  setNum('k-cache', T.cacheHit * 100, (v) => v.toFixed(1) + '%');
  setText($('k-saved'), `saved ${fmtUsd(T.saved)}`);
  setNum('k-web', T.web, (v) => String(Math.round(v)));
  setNum('k-ok', T.okRate * 100, (v) => v.toFixed(1) + '%');
  setText($('k-err'), `${T.errors} failed`);
  renderLimits();
}

// ---------- usage limits ----------
// What is left of every AI's usage limits, all at once: a column per AI in a fixed order (Claude, Codex, Antigravity),
// its 5-hour window over its weekly one, each a bar and the % left (and when it fills again, once under half), as each
// tool reports them; Antigravity a column per group of models it draws on (agy argon, agy claude…). The same whichever
// chat is in front. A window a column doesn't have (Argon's 5 hours) or no number yet draws no bar: an empty bar reads as
// used up.
const LIMIT_ROWS = [['fiveHour', '5h', '5-hour'], ['week', 'week', 'weekly']];
// The engine's list. The Windows app's engine still sends Claude's limits apart and Codex's on its chats.
function limitsByAI() {
  if (STATE.limitsByAI) return STATE.limitsByAI;
  const list = [];
  if (STATE.limits) list.push({ id: 'claude', name: 'claude', tool: 'Claude Code', ...STATE.limits });
  const codex = STATE.sessions.find((s) => s.tool === 'Codex' && s.limits)?.limits;
  if (codex) list.push({ id: 'codex', name: 'codex', tool: 'Codex', ...codex });
  return list;
}
function limitLeft(w) {
  // A passed reset only voids the measurement (usage elsewhere may already be eating the next window): no number until
  // the tool reports again.
  if (!w || !Number.isFinite(w.pct) || (w.resetsAt && w.resetsAt <= Date.now())) return null;
  return 100 - Math.max(0, Math.min(100, w.pct));
}
const limitClass = (left) => (left === null ? 'na' : left >= 50 ? 'ok' : left >= 20 ? 'warn' : 'hot');
// When a window fills again, as a clock time, as the tools themselves show it (and it doesn't tick): "19:42" within the
// day, a weekday after that ("fri"; "fri 18:00" in full).
function resetAt(at, full) {
  if (!at) return '';
  if (at - Date.now() < 20 * 3600_000) return new Date(at).toTimeString().slice(0, 5);
  return new Date(at).toLocaleString('en-GB', full ? { weekday: 'short', hour: '2-digit', minute: '2-digit' } : { weekday: 'short' }).toLowerCase();
}
let limitMinute = 0;
function renderLimits() {
  limitMinute = Math.floor(Date.now() / 60_000);
  const box = $('limits');
  const list = limitsByAI();
  box.hidden = !list.length;
  if (!list.length) return;
  let html = '<span class="lim-h"></span>' + LIMIT_ROWS.map(([, short]) => `<span class="lim-h">${short}</span>`).join('');
  for (const a of list) {
    const wins = LIMIT_ROWS.map(([key, , long]) => ({ w: a[key], left: limitLeft(a[key]), long, none: !!a.windows && !a.windows.includes(key) }));
    const tip = [
      `${a.tool}${a.group ? ` · ${a.group}` : ''}`,
      ...wins.map(({ w, left, long, none }) =>
        none ? `no ${long} limit` : !w ? `${long}: no data yet` : left === null ? `${long}: waiting for ${a.tool} to report again` : `${long}: ${Math.round(left)}% left, fills again ${resetAt(w.resetsAt, true)}`,
      ),
    ];
    if (a.at) tip.push(`as of ${hhmmss(a.at).slice(0, 5)}`);
    const title = esc(tip.join('\n'));
    html +=
      `<span class="lim-n" title="${title}">${esc(a.name)}</span>` +
      wins
        .map(
          ({ w, left }) =>
            `<span class="lim-c ${limitClass(left)}" title="${title}">${left === null ? '<i></i>' : `<i class="lim-b"><i style="width:${left}%"></i></i>`}<b>${left === null ? '—' : Math.round(left) + '%'}</b>${left !== null && left < 50 && w.resetsAt ? `<small>↻${resetAt(w.resetsAt)}</small>` : ''}</span>`,
        )
        .join('');
  }
  setHTML(box, html);
}

function actionHTML(s) {
  if (s.status === 'waiting') return `<span class="red">⚠ ${esc(s.waitingFor || 'waiting for you')}</span>`;
  const p = s.pending[0] || s.agents.find((a) => a.pending.length)?.pending[0];
  if (p) return `<span style="color:${CAT[p.c]?.css}">▸ ${esc(p.n)}</span> ${esc(p.l)} <i class="dim">${fmtDur(Date.now() - p.t)}</i>`;
  if (s.status === 'busy') return `<span class="teal">◌ thinking…</span>${s.last ? ` <i class="dim">last ${esc(s.last.n)} ${esc(clipT(s.last.l, 36))}</i>` : ''}`;
  if (s.status === 'idle') return `<span class="amber">◆ finished · your turn</span>${s.turnMs ? ` <i class="dim">last turn ${fmtDur(s.turnMs)}</i>` : ''}`;
  return `<span class="dim">ended ${ago(s.lastTs)} ago</span>`;
}

// Cards folded to one line with their yellow button, by session id, kept across reloads.
const collapsed = new Set(
  (() => {
    try {
      return JSON.parse(localStorage.getItem('radar.collapsed') || '[]');
    } catch {
      return [];
    }
  })(),
);
function toggleCollapsed(id) {
  if (collapsed.has(id)) collapsed.delete(id);
  else collapsed.add(id);
  try {
    localStorage.setItem('radar.collapsed', JSON.stringify([...collapsed]));
  } catch {}
  renderSessions();
}

// A question in the dashboard's style (the app moves the chat windows above the dashboard aside meanwhile): resolves
// true for the action, false for Cancel, Escape or a click outside.
function askBox({ title, text, ok }) {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'askbox';
    root.innerHTML = `<div class="ab"><b>${esc(title)}</b><p>${esc(text)}</p><div class="btns"><button type="button" class="cancel">Cancel</button><button type="button" class="ok">${esc(ok)}</button></div></div>`;
    const key = (e) => {
      if (e.key !== 'Escape' && e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      done(e.key === 'Enter');
    };
    const done = (v) => {
      root.remove();
      removeEventListener('keydown', key, true);
      native({ type: 'modal', open: false });
      resolve(v);
    };
    root.querySelector('.cancel').onclick = () => done(false);
    root.querySelector('.ok').onclick = () => done(true);
    root.addEventListener('mousedown', (e) => e.target === root && done(false));
    addEventListener('keydown', key, true);
    native({ type: 'modal', open: true });
    document.body.appendChild(root);
    root.querySelector('.ok').focus();
  });
}

// A card's red button: Claude stops wherever it runs (after a question), and the card goes. An ended session's card
// just goes.
async function endSession(id) {
  if (Party.has(id)) return Party.end(id);
  const s = STATE.sessions.find((x) => x.id === id);
  if (!s) return;
  if (s.status !== 'ended') {
    const winOpen = !!(window.__winOpen && window.__winOpen[s.id]);
    const where = s.host === 'term' && !winOpen
      ? `Claude stops in the terminal it runs in${s.tty ? ` (${String(s.tty).replace('/dev/', '')})` : ''}.`
      : 'Claude stops and its window closes.';
    const busy = s.status === 'busy' ? " It's working right now." : s.status === 'waiting' ? ' It is waiting for you.' : '';
    const yes = await askBox({
      title: `End “${clipT(s.title || s.name, 60)}”?`,
      text: `${where}${busy} The conversation stays saved and you can resume it later.`,
      ok: 'End Session',
    });
    if (!yes) return;
  }
  document.querySelector(`#sessions .card[data-key="${CSS.escape(id)}"]`)?.classList.add('ending');
  native({ type: 'endSession', sid: id });
}

function createCard() {
  const el = document.createElement('div');
  el.className = 'card';
  el.__born = Date.now();
  el.innerHTML = `<div class="ch"><span class="lights"><i class="l-close"></i><i class="l-min"></i></span><b class="nm"></b><span class="kind"></span><span class="pill"></span></div>
<div class="title"></div><div class="path"></div><div class="act"></div>
<div class="ctx"><span>ctx</span><div class="bar"><i></i></div><span class="cv"></span></div>
<div class="kv"><span class="md"></span><span>tools <b class="tl"></b></span><span>web <b class="wb"></b></span><span>err <b class="er"></b></span><span class="cost"></span></div>
<svg class="spark" viewBox="0 0 120 20" preserveAspectRatio="none"></svg><div class="ag"></div><div class="flags"></div>`;
  el.addEventListener('click', () => focusSession(el.dataset.key));
  el.querySelector('.l-close').addEventListener('click', (e) => {
    e.stopPropagation();
    endSession(el.dataset.key);
  });
  el.querySelector('.l-min').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCollapsed(el.dataset.key);
  });
  return el;
}
function updateCard(el, s) {
  const q = (sel) => el.querySelector(sel);
  for (const st of Object.keys(STATUS)) el.classList.toggle('st-' + st, s.status === st);
  const col = sessCss(s.id);
  // Folded: one line, the name Claude gave it and its status.
  const folded = collapsed.has(s.id);
  el.classList.toggle('collapsed', folded);
  q('.l-close').title = s.status === 'ended' ? 'Remove from the list' : 'End session';
  q('.l-min').title = folded ? 'Expand' : 'Collapse';
  setText(q('.nm'), s.name);
  const winOpen = !!(window.__winOpen && window.__winOpen[s.id]);
  el.classList.toggle('winopen', winOpen);
  const host = winOpen ? 'window' : s.host === 'app' ? 'in app' : s.host === 'term' ? `ext ${String(s.tty || 'terminal').replace('/dev/', '')}` : '';
  setText(q('.kind'), [s.kind && s.kind !== 'interactive' ? s.kind : '', host].filter(Boolean).join(' · '));
  const pill = q('.pill');
  pill.className = `pill ${s.status}`;
  setText(pill, `${STATUS[s.status].label} ${s.status === 'ended' ? '' : clock(Date.now() - (s.statusSince || s.lastTs))}`);
  setText(q('.title'), s.title || s.lastPrompt || '—');
  q('.title').title = s.lastPrompt || '';
  setText(q('.path'), s.cwd + (s.branch ? `  ⎇ ${s.branch}` : ''));
  setHTML(q('.act'), actionHTML(s));
  const pct = s.ctxMax ? Math.min(1, s.ctx / s.ctxMax) : 0;
  const bar = q('.bar > i');
  bar.style.width = (pct * 100).toFixed(1) + '%';
  bar.style.background = ctxCss(pct);
  setText(q('.cv'), `${fmtTok(s.ctx)}${s.ctxMax ? ' / ' + fmtTok(s.ctxMax) : ''}`);
  setText(q('.md'), [s.model, s.effort].filter(Boolean).join(' · '));
  setText(q('.tl'), s.tools);
  setText(q('.wb'), s.web);
  setText(q('.er'), s.errors);
  q('.er').classList.toggle('red', s.errors > 0);
  setText(q('.cost'), s.tool && s.tool !== 'Claude Code' ? '' : fmtUsd(s.cost)); // the others have no price list
  setHTML(q('.spark'), sparkBars(s.spark, col));
  setText(q('.ag'), s.agents.length ? `⤷ ${s.agentsRunning} running · ${s.agents.length} subagents (15 min)` : '');
  const clash = CLASH.get(s.id);
  setHTML(
    q('.flags'),
    s.flags.map((f) => `<span class="flag">${esc(f)}</span>`).join('') +
      (clash ? `<span class="flag clash" title="${esc(`Another chat is writing the same file: ${clash.join(' · ')}`)}">⚠ same file</span>` : ''),
  );
}
// Files two chats wrote in the last 20 minutes (the engine's `collision`; a chat and its own subagents are one chat), by
// chat: each one's card says so (⚠ same file), with the file and the other chat. The Windows engine names no `clash` yet:
// its file's editors then.
let CLASH = new Map();
function clashFiles() {
  return (STATE.files || [])
    .filter((f) => f.collision)
    .map((f) => ({ f, sids: f.clash && f.clash.length ? f.clash : [...new Set((f.editors || []).map((e) => e.s))] }));
}
function clashes() {
  const m = new Map();
  for (const { f, sids } of clashFiles()) {
    for (const s of sids) {
      const others = sids.filter((x) => x !== s).map(sessName);
      if (!m.has(s)) m.set(s, []);
      m.get(s).push(`${f.short} (also ${others.join(', ')})`);
    }
  }
  return m;
}

// A collision that begins pops up in the screen's corner as a chat that needs you does (messages.js), and its notice goes
// when it's over. What collides when the page starts was there before: no notice for that.
let clashSeen = null;
function tellClashes() {
  const now = new Map();
  for (const { f, sids } of clashFiles()) now.set(f.p, { key: f.p, file: f.short, path: f.p, chats: sids.map(sessName) });
  if (clashSeen) {
    for (const [k, c] of now) {
      if (clashSeen.has(k)) continue;
      native({ type: 'clash', ...c });
      Hooks.pulse('clash', { value: c.file, path: c.path, chats: c.chats });
    }
    for (const k of clashSeen.keys()) if (!now.has(k)) native({ type: 'clashOver', key: k });
  }
  clashSeen = now;
  Hooks.set('sameFile', now.size);
}

function renderSessions() {
  CLASH = clashes();
  tellClashes();
  const box = $('sessions');
  if (!STATE.sessions.length) return placeholder(box, 'no Claude Code session in the last 30 min');
  // Party mode's cards change places often: each one glides to its new place, without its entrance again.
  const glide = Party.on && !document.documentElement.classList.contains('paused');
  const was = new Map();
  if (glide) {
    for (const el of box.children) {
      was.set(el, el.getBoundingClientRect().top);
      if (Date.now() - (el.__born || 0) > 600) el.classList.remove('enter');
    }
  }
  keyed(box, STATE.sessions, (s) => s.id, createCard, updateCard);
  if (!glide) return;
  // A glide on its way goes on from where the card is now.
  const cards = [...box.children];
  for (const el of cards) el.__glide?.cancel();
  for (const el of cards) {
    const top = was.get(el);
    const dy = top === undefined ? 0 : top - el.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) el.__glide = el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 450, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  }
}

// ---------- clearing a panel (its right-click menu) ----------
// What a panel shows can be cleared, for a stream or what nobody else should see: its list keeps only what comes after,
// its counters start again from that moment. Only this page's view: the engine's day stays whole. Kept for the day in
// the page's storage (radar.cleared), so a reload doesn't bring it back; "show what was cleared" undoes it.
const CLEARABLE = ['p-research', 'p-files', 'p-mix', 'p-log', 'p-workers', 'p-spend'];
const CLEAR_KEY = 'radar.cleared';
const today = () => new Date().toDateString();
let CLEARED = (() => {
  try {
    const c = JSON.parse(localStorage.getItem(CLEAR_KEY) || 'null');
    if (c && c.day === today() && c.panels && typeof c.panels === 'object') return c;
  } catch {}
  return { day: today(), panels: {} };
})();
function clearedOf(id) {
  // The engine's counters start from nothing at midnight anyway.
  if (CLEARED.day !== today()) CLEARED = { day: today(), panels: {} };
  return CLEARED.panels[id] || null;
}
// Where a panel's counters stood when it was cleared, to count on from there.
function clearBase(id) {
  const T = STATE.totals;
  if (id === 'p-research') return { web: T.web };
  if (id === 'p-files') return { files: Object.fromEntries(STATE.files.map((f) => [f.p, [f.r, f.w]])) };
  if (id === 'p-mix') return { tools: T.tools, cats: { ...STATE.byCat } };
  if (id === 'p-spend')
    return {
      cost: T.cost, out: T.tok.out, cr: T.tok.cr, cw: T.tok.cw, saved: T.saved,
      models: Object.fromEntries(STATE.byModel.map((m) => [m.model, [m.calls, m.tok.out, m.cost]])),
    };
  return {};
}
function setCleared(id, on) {
  if (!STATE) return;
  clearedOf(id);
  if (on) CLEARED.panels[id] = { t: Date.now(), ...clearBase(id) };
  else delete CLEARED.panels[id];
  try {
    localStorage.setItem(CLEAR_KEY, JSON.stringify(CLEARED));
  } catch {}
  if (id === 'p-log') for (const el of $('log').children) el.classList.toggle('gone', on);
  renderAll();
}
const since = (c) => `since ${hhmmss(c.t).slice(0, 5)}`;
// The minute buckets (oldest first, the last one this minute's) up to the clearing minute go blank.
function sparkSince(spark, c) {
  if (!c) return spark;
  const m0 = Math.floor(Date.now() / 60_000), mc = Math.floor(c.t / 60_000);
  return spark.map((v, i) => (m0 - (spark.length - 1 - i) <= mc ? 0 : v));
}

function panelMenu(e) {
  document.querySelector('.pn-ctx')?.remove();
  const p = e.target.closest('section.panel[id^="p-"]');
  if (!p || !(CLEARABLE.includes(p.id) || window.PanelLayout?.hide)) return;
  e.preventDefault();
  const menu = document.createElement('div');
  menu.className = 'pn-ctx';
  const can = CLEARABLE.includes(p.id) && STATE;
  menu.innerHTML =
    (can ? `<button type="button" data-ctx="clear">⌫ clear this panel</button>` : '') +
    (can && clearedOf(p.id) ? `<button type="button" data-ctx="restore">↺ show what was cleared</button>` : '') +
    (window.PanelLayout?.hide ? `${can ? '<hr>' : ''}<button type="button" data-ctx="hide">– hide this panel</button>` : '');
  document.body.appendChild(menu);
  menu.style.left = `${Math.max(4, Math.min(e.clientX, innerWidth - menu.offsetWidth - 4))}px`;
  menu.style.top = `${Math.max(4, Math.min(e.clientY, innerHeight - menu.offsetHeight - 4))}px`;
  menu.onclick = (ev) => {
    const b = ev.target.closest('[data-ctx]');
    if (!b) return;
    menu.remove();
    if (b.dataset.ctx === 'hide') return PanelLayout.hide(p.id);
    setCleared(p.id, b.dataset.ctx === 'clear');
  };
}
document.addEventListener('contextmenu', panelMenu);
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.pn-ctx')) document.querySelector('.pn-ctx')?.remove();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelector('.pn-ctx')?.remove();
});

// The map's switches: party next to power save, streamer under it.
$('strm').addEventListener('click', () => setMode('streamer', !MODES.streamer));
$('party').addEventListener('click', () => setMode('party', !MODES.party));
applyModes();

function renderResearch() {
  const box = $('research');
  const c = clearedOf('p-research');
  const items = c ? STATE.research.filter((r) => r.t >= c.t) : STATE.research;
  setText($('m-research'), c ? `${Math.max(0, STATE.totals.web - c.web)} web calls ${since(c)}` : `${STATE.totals.web} web calls today`);
  if (!items.length) return placeholder(box, c ? `cleared · no web search or fetch ${since(c)}` : 'no web search or fetch yet today');
  keyed(
    box,
    items,
    (r) => r.id,
    () => {
      const el = document.createElement('div');
      el.className = 'rf';
      el.innerHTML = '<span class="k"></span><div class="tx"><div class="q"></div><div class="m"></div></div>';
      el.addEventListener('click', () => focusSession(el.__sid));
      return el;
    },
    (el, r) => {
      el.__sid = r.s;
      const k = el.querySelector('.k');
      k.className = 'k ' + r.kind;
      setText(k, r.kind === 'search' ? 'SRCH' : 'FTCH');
      setText(el.querySelector('.q'), r.kind === 'search' ? `“${r.l}”` : r.l);
      const bits = [sessName(r.s) + (r.a ? ' ⤷' : '')];
      if (r.hosts?.length) bits.push('→ ' + r.hosts.join(', '));
      if (r.m) bits.push(r.m);
      if (r.d != null) bits.push(fmtDur(r.d));
      bits.push(ago(r.t) + ' ago');
      setHTML(el.querySelector('.m'), `<i class="dot" style="background:${sessCss(r.s)}"></i>${esc(bits.join(' · '))}`);
      // A call whose result never shows up (interrupted turn) must not blink forever.
      el.classList.toggle('pending', r.ok === null && Date.now() - r.t < 120_000);
      el.classList.toggle('bad', r.ok === false || /^[45]\d\d/.test(r.m || ''));
    },
  );
}

function renderFiles() {
  const box = $('files');
  const c = clearedOf('p-files');
  let items = STATE.files;
  if (c) {
    items = items
      .filter((f) => f.last >= c.t)
      .map((f) => {
        const b = c.files[f.p] || [0, 0];
        return { ...f, r: Math.max(0, f.r - b[0]), w: Math.max(0, f.w - b[1]) };
      })
      .filter((f) => f.r + f.w > 0)
      .sort((a, b) => b.r + b.w - (a.r + a.w));
  }
  const collisions = items.filter((f) => f.collision).length;
  // A collision stays marked on the panel's strip, not only in its line (a ⚠ blinked three times and was gone).
  $('p-files').classList.toggle('clash', collisions > 0);
  setText($('m-files'), collisions ? `⚠ ${collisions} file edited by 2+ agents` : c ? `${items.length} touched ${since(c)}` : `${items.length} most-touched today`);
  if (!items.length) return placeholder(box, c ? `cleared · no file reads or edits ${since(c)}` : 'no file reads or edits yet today');
  const max = Math.max(1, ...items.map((f) => f.r + f.w));
  keyed(
    box,
    items,
    (f) => f.p,
    () => {
      const el = document.createElement('div');
      el.className = 'fh';
      el.innerHTML = '<span class="nm"></span><div class="bars"><i class="r"></i><i class="w"></i></div><span class="n"></span>';
      return el;
    },
    (el, f) => {
      setText(el.querySelector('.nm'), f.short);
      el.title = f.shown || f.p;
      el.querySelector('.r').style.width = ((f.r / max) * 100).toFixed(1) + '%';
      el.querySelector('.w').style.width = ((f.w / max) * 100).toFixed(1) + '%';
      const dots = [...new Set(f.editors.map((e) => e.s))].map((s) => `<i style="background:${sessCss(s)}"></i>`).join('');
      setHTML(el.querySelector('.n'), `r${f.r} w${f.w}${dots}`);
      el.classList.toggle('collide', f.collision);
    },
  );
}

function renderMix() {
  const cl = clearedOf('p-mix');
  const by = Object.fromEntries(CATS.map((c) => [c, Math.max(0, (STATE.byCat[c] || 0) - (cl?.cats[c] || 0))]));
  const total = CATS.reduce((a, c) => a + by[c], 0);
  setText($('m-mix'), cl ? `${Math.max(0, STATE.totals.tools - cl.tools)} calls ${since(cl)} · 30 min trend` : `${STATE.totals.tools} calls today · 30 min trend`);
  setHTML(
    $('mix'),
    `<div class="mixbar">${CATS.map((c) => `<i style="width:${total ? ((by[c] / total) * 100).toFixed(2) : 0}%;background:${CAT[c].css}"></i>`).join('')}</div>` +
      `<div class="mixlegend">${CATS.map((c) => `<span><i style="background:${CAT[c].css}"></i>${CAT[c].label} <b>${by[c]}</b></span>`).join('')}</div>` +
      `<svg class="chart" viewBox="0 0 300 34" preserveAspectRatio="none">${areaChart(sparkSince(STATE.toolSpark, cl), 'var(--accent)', 300, 34)}</svg>`,
  );
}

function renderWorkers() {
  const list = [];
  const c = clearedOf('p-workers');
  for (const s of STATE.sessions) for (const a of s.agents) if (!c || a.lastTs >= c.t) list.push({ ...a, sname: s.name });
  list.sort((a, b) => b.running - a.running || b.lastTs - a.lastTs);
  const running = list.filter((a) => a.running).length;
  setText($('m-workers'), list.length ? `${running} running · ${list.length} ${c ? since(c) : 'in last 15 min'}` : 'subagents & forks');
  const box = $('workers');
  if (!list.length) return placeholder(box, c ? `cleared · no subagents ${since(c)}` : 'no subagents in the last 15 min');
  keyed(
    box,
    list.slice(0, 12),
    (a) => `${a.sid}:${a.id}`,
    () => {
      const el = document.createElement('div');
      el.className = 'wk';
      el.innerHTML = '<div class="l1"><b></b><span class="ty"></span><span class="tm"></span></div><div class="l2"></div><div class="prog"><i></i></div>';
      el.addEventListener('click', () => focusSession(el.__sid));
      return el;
    },
    (el, a) => {
      el.__sid = a.sid;
      el.classList.toggle('done', !a.running);
      setText(el.querySelector('b'), a.desc);
      setText(el.querySelector('.ty'), [a.type, a.sname].filter(Boolean).join(' · '));
      setText(el.querySelector('.tm'), a.running ? clock(Date.now() - a.firstTs) : `✓ ${ago(a.lastTs)} ago`);
      const p = a.pending[0] || a.last;
      setHTML(
        el.querySelector('.l2'),
        `${p ? `<span style="color:${CAT[p.c]?.css}">▸ ${esc(p.n)}</span> ${esc(clipT(p.l, 50))} · ` : ''}${a.tools} tools · ${fmtUsd(a.cost)}${a.errors ? ` · <span class="red">${a.errors} err</span>` : ''}`,
      );
    },
  );
}

// ---------- spend ----------
// Today: the live figures. 7d, 30d, 12w, 12m: spend by project (a git repo, else the folder) from the app's ledger
// (Ledger.swift), asked of the app when the tab changes and once a minute while it shows; its last bar is today, live.
const SPEND_RANGES = ['today', '7d', '30d', '12w', '12m'];
const SPEND_SPAN = { '7d': '7 days', '30d': '30 days', '12w': '12 weeks', '12m': '12 months' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let spendRange = 'today';
try {
  const r = localStorage.getItem('spend.range');
  if (SPEND_RANGES.includes(r)) spendRange = r;
} catch {}
let spendHist = null;
let spendAsked = 0;
let spendAsking = false;

function askSpend(force) {
  const handler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.spend;
  if (spendRange === 'today' || spendAsking || !handler) return;
  // While the app reads the transcripts the first time, again every few seconds.
  const every = spendHist && spendHist.reading ? 4000 : 60_000;
  if (!force && Date.now() - spendAsked < every) return;
  spendAsking = true;
  spendAsked = Date.now();
  const range = spendRange;
  Promise.resolve(handler.postMessage({ type: 'history', range }))
    .then((d) => {
      if (range !== spendRange || !d) return;
      spendHist = d;
      if (STATE) renderSpend();
    })
    .catch(() => {})
    .finally(() => {
      spendAsking = false;
    });
}

function setSpendRange(r) {
  if (!SPEND_RANGES.includes(r) || r === spendRange) return;
  spendRange = r;
  spendHist = null;
  try {
    localStorage.setItem('spend.range', r);
  } catch {}
  askSpend(true);
  if (STATE) renderSpend();
}

// "2026-11-05" in the panel's words: "5 Nov"; a month by its name ("Nov 2026" in full).
function spendLabel(key, unit, full) {
  const [y, m, d] = String(key).split('-').map(Number);
  if (unit === 'month') return full || m === 1 ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1];
  return `${d} ${MONTHS[m - 1]}`;
}

// The AIs in spend.ledger's rows, in this order; Claude Code's limits and spend are the Claude account's.
const AI_ORDER = ['Claude Code', 'Codex', 'Antigravity'];
const aiName = (tool) => (tool === 'Claude Code' ? 'claude' : String(tool).toLowerCase());

// The rows' and the bars' colour: the sessions' hues, "other" dim.
const spendColor = (p, i) => (p.id === '*' ? 'var(--dim2)' : `var(--hue${i % 10})`);

// A bar a day (week, month), stacked by project; hovering one tells its date and total.
function stackBars(d, w, h) {
  const n = d.totals.length;
  const max = Math.max(...d.totals, 1e-9);
  const bw = w / n;
  const gap = Math.min(2, bw * 0.25);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = (i * bw + gap / 2).toFixed(2);
    const width = (bw - gap).toFixed(2);
    let y = h;
    let rects = '';
    d.projects.forEach((p, j) => {
      const v = p.series[i];
      if (!v) return;
      const bh = (v / max) * (h - 2);
      y -= bh;
      rects += `<rect x="${x}" y="${y.toFixed(2)}" width="${width}" height="${bh.toFixed(2)}" style="fill:${spendColor(p, j)}"/>`;
    });
    const when = d.unit === 'week' ? `week of ${spendLabel(d.starts[i], 'day')}` : spendLabel(d.starts[i], d.unit, true);
    out += `<g><title>${esc(when)} · ${fmtUsd(d.totals[i])}</title><rect x="${x}" y="0" width="${width}" height="${h}" style="fill:transparent"/>${rects}</g>`;
  }
  return out;
}

function renderSpendHistory() {
  // Cleared (its right-click menu, for a stream or what nobody else should see): the days before it don't show either.
  const c = clearedOf('p-spend');
  if (c) {
    setNum('spend-big', Math.max(0, STATE.totals.cost - c.cost), fmtUsd);
    setText($('spend-sub'), `${since(c)} · history hidden while cleared`);
    for (const id of ['spend-chart', 'spend-rows', 'spend-models', 'spend-kv']) setHTML($(id), '');
    return;
  }
  askSpend(false);
  const d = Streamer.spend(spendHist);
  if (!d || !d.totals) {
    setText($('spend-sub'), `last ${SPEND_SPAN[spendRange]} · loading…`);
    for (const id of ['spend-chart', 'spend-rows', 'spend-models', 'spend-kv']) setHTML($(id), '');
    return;
  }
  setNum('spend-big', d.total, fmtUsd);
  // The average over the bars since the history starts (Claude keeps transcripts for 30 days; the app keeps the ledger
  // from then on), not over the empty months before it.
  let first = 0;
  if (d.since) d.starts.forEach((s, i) => s <= d.since && (first = i));
  const bars = d.starts.length - first;
  setText($('spend-sub'), `last ${SPEND_SPAN[spendRange]} · ${fmtUsd(d.total / Math.max(1, bars))}/${d.unit} avg · api-eq`);
  setHTML($('spend-chart'), stackBars(d, 300, 34));
  setHTML(
    $('spend-rows'),
    d.projects.length
      ? d.projects
          .map(
            (p, j) =>
              `<div class="sr"><span title="${esc(p.path)}"><i class="sw" style="background:${spendColor(p, j)}"></i><b>${esc(p.label)}</b>${p.model ? ` · ${esc(p.model)}` : ''}</span><span>${Math.round(p.share * 100)}%</span><span class="c">${fmtUsd(p.cost)}</span></div>`,
          )
          .join('')
      : `<div class="sr"><span>${d.reading ? 'reading your transcripts…' : 'no spend in this period'}</span></div>`,
  );
  // Every project's spend by model, in one line: the three costliest, the rest counted.
  const models = d.models || [];
  setHTML(
    $('spend-models'),
    models.length
      ? '<span class="lbl">models</span>' +
          models
            .slice(0, 3)
            .map(
              (m) =>
                `<span title="${m.calls} calls · ${fmtTok(m.out)} out"><b>${esc(m.model)}</b> ${m.cost > 0 ? `${fmtUsd(m.cost)} <i>${Math.round(m.share * 100)}%</i>` : 'no price'}</span>`,
            )
            .join('') +
          (models.length > 3 ? `<span title="${esc(models.slice(3).map((m) => `${m.model} ${fmtUsd(m.cost)}`).join(' · '))}">+${models.length - 3} more</span>` : '')
      : '',
  );
  let top = 0;
  d.totals.forEach((v, i) => v > d.totals[top] && (top = i));
  const kv = [];
  const busiest = (d.unit === 'week' ? 'week of ' : '') + spendLabel(d.starts[top], d.unit);
  if (d.total > 0) kv.push(`<span>busiest <b>${esc(busiest)}</b> ${fmtUsd(d.totals[top])}</span>`);
  if (d.since) kv.push(`<span>history from <b>${esc(spendLabel(d.since, 'day'))}</b></span>`);
  if (d.reading) kv.push('<span>reading transcripts…</span>');
  setHTML($('spend-kv'), kv.join(''));
}

function renderSpend() {
  const box = $('spend');
  const tabs = document.querySelectorAll('#spend-tabs button');
  if (!box.dataset.ready) {
    box.innerHTML =
      '<div class="spend-big" id="spend-big">$0</div><div class="spend-sub" id="spend-sub"></div>' +
      '<svg class="chart" id="spend-chart" viewBox="0 0 300 34" preserveAspectRatio="none"></svg>' +
      '<div class="spend-rows" id="spend-rows"></div><div class="spend-models" id="spend-models"></div><div class="spend-kv" id="spend-kv"></div>';
    for (const b of tabs) b.addEventListener('click', () => setSpendRange(b.dataset.r));
    box.dataset.ready = '1';
  }
  for (const b of tabs) b.classList.toggle('on', b.dataset.r === spendRange);
  box.classList.toggle('hist', spendRange !== 'today');
  if (spendRange !== 'today') return renderSpendHistory();
  const c = clearedOf('p-spend');
  let T = STATE.totals, models = STATE.byModel;
  const spark = sparkSince(STATE.costSpark, c);
  if (c) {
    // Counted on from the clearing; the burn is the last 15 minutes' again, without what came before it.
    const less = (a, b) => Math.max(0, a - b);
    T = {
      ...T, cost: less(T.cost, c.cost), saved: less(T.saved, c.saved), costPerHour: spark.slice(-15).reduce((a, b) => a + b, 0) * 4,
      tok: { ...T.tok, out: less(T.tok.out, c.out), cr: less(T.tok.cr, c.cr), cw: less(T.tok.cw, c.cw) },
    };
    models = models
      .map((m) => {
        const b = c.models[m.model] || [0, 0, 0];
        return { ...m, calls: less(m.calls, b[0]), tok: { ...m.tok, out: less(m.tok.out, b[1]) }, cost: less(m.cost, b[2]) };
      })
      .filter((m) => m.calls > 0)
      .sort((a, b) => b.cost - a.cost);
  }
  setNum('spend-big', T.cost, fmtUsd);
  setText($('spend-sub'), `${c ? since(c) : 'today'} · ${fmtTok(T.tok.out)} out · ${fmtTok(T.tok.cr)} cache read · ${fmtTok(T.tok.cw)} cache write`);
  setHTML($('spend-chart'), areaChart(spark, 'var(--amber)', 300, 34));
  // A row per AI, always in the same order; the Windows app's engine doesn't name the AI of a model yet.
  const byAI = new Map();
  for (const m of models) {
    const tool = m.tool || (m.priced ? 'Claude Code' : 'other');
    const a = byAI.get(tool) || { tool, calls: 0, out: 0, cost: 0, priced: false };
    a.calls += m.calls;
    a.out += m.tok.out;
    a.cost += m.cost;
    a.priced = a.priced || m.priced;
    byAI.set(tool, a);
  }
  const rank = (t) => (AI_ORDER.includes(t) ? AI_ORDER.indexOf(t) : AI_ORDER.length);
  setHTML(
    $('spend-rows'),
    [...byAI.values()]
      .sort((a, b) => rank(a.tool) - rank(b.tool) || a.tool.localeCompare(b.tool))
      .map(
        (a) =>
          `<div class="sr"><span><b>${esc(aiName(a.tool))}</b> · ${a.calls} calls</span><span>${fmtTok(a.out)} out</span>${a.priced ? `<span class="c">${fmtUsd(a.cost)}</span>` : '<span class="c na" title="No price list for this AI">no price</span>'}</div>`,
      )
      .join(''),
  );
  const total = models.reduce((x, m) => x + m.cost, 0) || 1;
  setHTML(
    $('spend-models'),
    models.length
      ? '<span class="lbl">models</span>' +
          models
            .slice(0, 4)
            .map((m) => `<span title="${m.calls} calls · ${fmtTok(m.tok.out)} out"><b>${esc(m.model)}</b> ${m.cost > 0 ? `${fmtUsd(m.cost)} <i>${Math.round((m.cost / total) * 100)}%</i>` : `${fmtTok(m.tok.out)} out`}</span>`)
            .join('') +
          (models.length > 4 ? `<span title="${esc(models.slice(4).map((m) => `${m.model} ${m.cost > 0 ? fmtUsd(m.cost) : fmtTok(m.tok.out) + ' out'}`).join(' · '))}">+${models.length - 4} more</span>` : '')
      : '',
  );
  setHTML(
    $('spend-kv'),
    `<span>cache saved <b class="g">${fmtUsd(T.saved)}</b></span><span>burn <b>${fmtUsd(T.costPerHour)}/h</b></span><span>subagents <b>${Math.round(T.agentShare * 100)}%</b></span><span>avg turn <b>${fmtDur(T.avgTurn)}</b></span>`,
  );
}

function renderCall() {
  const need = STATE.sessions
    .filter((s) => s.status === 'waiting' || s.status === 'idle')
    .sort((a, b) => (a.status === 'waiting' ? 0 : 1) - (b.status === 'waiting' ? 0 : 1) || a.statusSince - b.statusSince);
  const nW = need.filter((s) => s.status === 'waiting').length;
  $('p-call').classList.toggle('hot', nW > 0);
  const title = nW ? `⚠ ${nW} needs you · Orbiterm` : need.length ? `◆ ${need.length} your turn · Orbiterm` : 'Orbiterm';
  if (document.title !== title) document.title = title;
  setText($('m-call'), nW ? `${nW} blocked on you` : need.length ? `${need.length} waiting for your next prompt` : 'nothing needs you');
  const box = $('call');
  if (!need.length)
    return placeholder(box, STATE.totals.live ? 'all quiet · every live session is working<small>you will hear a ping if sound is on</small>' : 'no live Claude Code session', 'quiet');
  keyed(
    box,
    need,
    (s) => s.id,
    () => {
      const el = document.createElement('div');
      el.className = 'yc';
      el.innerHTML = '<span class="b"></span><span class="nm"></span><span class="tm"></span><span class="why"></span>';
      el.addEventListener('click', () => focusSession(el.dataset.key));
      return el;
    },
    (el, s) => {
      el.classList.toggle('waiting', s.status === 'waiting');
      el.classList.toggle('idle', s.status === 'idle');
      setText(el.querySelector('.b'), s.status === 'waiting' ? 'NEEDS YOU' : 'YOUR TURN');
      setText(el.querySelector('.nm'), s.name);
      setText(el.querySelector('.tm'), clock(Date.now() - (s.statusSince || s.lastTs)));
      setText(el.querySelector('.why'), s.status === 'waiting' ? `${s.waitingFor || 'waiting'} · click to jump` : s.title || s.lastPrompt || '');
    },
  );
}

function renderTicker() {
  const items = STATE.ticker;
  keyed(
    $('squares'),
    items,
    (t) => t.id,
    () => {
      const el = document.createElement('i');
      el.className = 'sq';
      return el;
    },
    (el, t) => {
      const col = CAT[t.c]?.css || 'var(--lavender)';
      if (el.__c !== col) {
        el.style.background = col;
        el.style.color = col;
        el.__c = col;
      }
      el.classList.toggle('run', t.st === 'run');
      el.classList.toggle('err', t.st === 'err');
      el.title = `${t.n} · ${t.st}`;
    },
  );
  const run = items.filter((t) => t.st === 'run').length, err = items.filter((t) => t.st === 'err').length;
  setText($('ticker-meta'), `${run} running · ${err} failed`);
}

// ---------- 3D orbit map (orbit.js) ----------
// orbit.js renders the centre of the dashboard; calls made before it has loaded are queued.
const MAPQ = [];
function map(fn, ...args) {
  if (window.Orbit) window.Orbit[fn](...args);
  else MAPQ.push([fn, args]);
}

// ---------- tooltip ----------
function sessionTip(s) {
  const pct = s.ctxMax ? ` (${Math.round((s.ctx / s.ctxMax) * 100)}%)` : '';
  const p = s.pending[0];
  const sys = [s.model, s.effort, s.tty && s.tty.replace('/dev/', ''), s.cpu ? s.cpu.toFixed(0) + '% cpu' : '', s.mem ? s.mem + ' MB' : ''].filter(Boolean).join(' · ');
  return (
    `<div class="h" style="color:${STATUS[s.status].color}">${esc(s.name)} · ${STATUS[s.status].label}${s.waitingFor ? ' · ' + esc(s.waitingFor) : ''}</div>` +
    (s.title ? `<div class="r">${esc(s.title)}</div>` : '') +
    (s.lastPrompt ? `<div class="d">› ${esc(clipT(s.lastPrompt, 170))}</div>` : '') +
    `<div class="d">${esc(s.cwd)}${s.branch ? ' ⎇ ' + esc(s.branch) : ''}</div>` +
    (sys ? `<div class="d">${esc(sys)}</div>` : '') +
    `<div class="r">ctx ${fmtTok(s.ctx)}${pct}${s.tool && s.tool !== 'Claude Code' ? '' : ` · ${fmtUsd(s.cost)}`} · ${s.tools} tools · ${s.web} web · ${s.errors} err · ${s.prompts} prompts</div>` +
    (p ? `<div class="r" style="color:${CAT[p.c]?.color}">▸ ${esc(p.n)} ${esc(p.l)} · ${fmtDur(Date.now() - p.t)}</div>` : '') +
    '<div class="d">click → open its chat window · drag to move it</div>'
  );
}
function agentTip(a, parent) {
  const p = a.pending[0] || a.last;
  return (
    `<div class="h" style="color:#9d6bff">◆ ${esc(a.desc)}</div>` +
    `<div class="d">${esc([a.type, a.model, a.bg ? 'background' : '', parent ? 'from ' + parent.name : ''].filter(Boolean).join(' · '))}</div>` +
    `<div class="r">${a.running ? 'running ' + clock(Date.now() - a.firstTs) : 'finished ' + ago(a.lastTs) + ' ago'} · ${a.tools} tools · ${fmtUsd(a.cost)} · ${a.errors} err</div>` +
    (p ? `<div class="r" style="color:${CAT[p.c]?.color}">▸ ${esc(p.n)} ${esc(p.l)}</div>` : '')
  );
}
function stationTip(c) {
  const last = STATE?.lastByCat?.[c];
  return (
    `<div class="h" style="color:${CAT[c].color}">${CAT[c].station}</div>` +
    `<div class="r">${STATE?.byCat?.[c] ?? 0} calls today · ${STATE?.pendingByCat?.[c] || 0} running now</div>` +
    (last ? `<div class="d">last: ${esc(last.l)} · ${esc(sessName(last.s))} · ${ago(last.t)} ago</div>` : '')
  );
}
function terminalTip(t) {
  if (t.left) {
    return (
      `<div class="h" style="color:#ffa040">▸ ${esc(t.cmd)}</div>` +
      `<div class="r">${esc(t.cwd)}</div>` +
      `<div class="d">its terminal closed, it kept running · click to end it</div>`
    );
  }
  return (
    `<div class="h" style="color:#8fd3ff">▸ ${esc(t.running ? t.cmd : 'terminal')}</div>` +
    `<div class="r">${esc(t.cwd)}</div>` +
    `<div class="d">${t.running ? `running${t.cpu >= 1 ? ` · ${Math.round(t.cpu)}% cpu` : ''}` : 'idle shell'} · click to open</div>`
  );
}
// A terminal car was clicked: the app shows that terminal's window (hidden or behind others).
function openTerminal(id) {
  native({ type: 'openTerminal', id });
}
function showTip(html, x, y) {
  const t = $('tip');
  t.innerHTML = html;
  t.style.display = 'block';
  const W = $('mapwrap').clientWidth, H = $('mapwrap').clientHeight;
  const tw = t.offsetWidth, th = t.offsetHeight;
  let lx = x + 16, ly = y + 14;
  if (lx + tw > W - 6) lx = x - tw - 16;
  if (ly + th > H - 6) ly = y - th - 14;
  t.style.left = Math.max(6, lx) + 'px';
  t.style.top = Math.max(22, ly) + 'px';
}
function hideTip() {
  $('tip').style.display = 'none';
}

$('log').addEventListener('click', (e) => {
  const ln = e.target.closest('.ln');
  if (ln && ln.dataset.sid) focusSession(ln.dataset.sid);
});
$('newchat').addEventListener('click', () => native({ type: 'newTerminal' }));

// Shared with orbit.js.
window.RADAR = { CAT, CATS, STATUS, FONT, MAPQ, sessColor, colorIndex, sessName, hexA, fmtTok, fmtUsd, fmtDur, clock, ago, clipT, esc, ctxColor, focusSession, sessionTip, agentTip, stationTip, terminalTip, openTerminal, showTip, hideTip };

// ---------- start ----------
setInterval(() => {
  setText($('clock'), new Date().toTimeString().slice(0, 8));
  if (STATE && Math.floor(Date.now() / 60_000) !== limitMinute) renderLimits(); // a reset that has passed voids its number
}, 1000);
connect();

// Narrow windows: the top bar's numbers give way so its buttons always fit; the ones cut off fade at the edge.
(() => {
  const kpis = document.querySelector('#top .kpis');
  if (kpis) new ResizeObserver(() => kpis.classList.toggle('clip', kpis.scrollWidth > kpis.clientWidth + 1)).observe(kpis);
})();
