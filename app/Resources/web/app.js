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
const NAMES = new Map();
const sessName = (sid) => NAMES.get(sid) || String(sid || '?').slice(0, 6);

// ---------- live data ----------
let STATE = null;
let ACTIVE_SID = null;
const lastStatus = new Map();
const lastPrompts = new Map();

function handleInit(d) {
    STATE = d.state;
    for (const s of STATE.sessions) {
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
    map('seed', d.log);
    flushMarquee(true);
    renderAll();
    $('boot').classList.add('gone');
}
function handleState(next) {
    for (const s of next.sessions) NAMES.set(s.id, s.name);
    transitions(next);
    STATE = next;
    renderAll();
}
// What the user can see decides the work: the app reports whether the dashboard is visible and in front;
// a hidden page pauses CSS animations and the 3D view.
function setVisibility(visible, focused) {
  document.documentElement.classList.toggle('paused', !visible);
  document.documentElement.classList.toggle('behind', visible && !focused);
  map('activity', visible, focused);
}
function setActiveSession(sid) {
  ACTIVE_SID = sid || null;
  if (STATE) renderTop();
}
function connect() {
  window.__radar = { init: handleInit, state: handleState, events: (list) => list.forEach(onEvent), visibility: setVisibility, power: (on) => map('power', on), activeSession: setActiveSession, cloud: (c) => window.Cloud?.render(c), social: (ev) => window.Social?.event(ev), terminals: (list) => map('terminals', list), terminalGone: (id) => map('terminalGone', id), idle: (s) => map('idle', s), openUpdate: () => window.Cloud?.openUpdate(), openProfile: () => window.Cloud?.openMenu('profile'), openView: (v) => window.GitView?.view(v), runaways: (list) => { window.Danger?.update(list); map('runaways', list); }, openDanger: () => window.Danger?.open() };
  native({ type: 'ready' });
}

function onEvent(ev) {
  map('event', ev);
  switch (ev.k) {
    case 'tool':
    case 'prompt':
      logLine(ev, true);
      marqueePush(ev);
      break;
    case 'result':
      logResult(ev);
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
        logState(s, `⚠ needs you · ${s.waitingFor || 'waiting'}`, 'err');
      } else if (s.status === 'idle') {
        if (prev === 'busy' || prev === 'waiting') ping('done');
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
}

// ---------- sound ----------
let soundOn = false;
try {
  soundOn = localStorage.getItem('radar.sound') === '1';
} catch {}
let audio = null;
let audioOut = null;
function ping(kind) {
  if (!soundOn) return;
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
  if (sid) native({ type: 'open', sid });
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
function logLine(ev, live) {
  const box = $('log');
  const stick = box.scrollTop + box.clientHeight >= box.scrollHeight - 14;
  let cat, col, text;
  if (ev.k === 'tool') {
    cat = CAT[ev.c]?.label || ev.c;
    col = CAT[ev.c]?.css || 'var(--lavender)';
    text = toolText(ev);
  } else {
    [cat, col] = LOG_CAT[ev.k] || ['·', 'var(--lavender)'];
    // Another AI tool's answer (Codex's, Antigravity's: their sessions are "ai:…") is its own, not Claude's.
    if (ev.k === 'say' && String(ev.s || '').startsWith('ai:')) cat = 'reply';
    text = ev.k === 'prompt' ? `› ${ev.l}` : ev.l;
  }
  const el = document.createElement('div');
  el.className = `ln ${ev.k}${ev.err || ev.cls === 'err' ? ' err' : ''}${live ? ' enter' : ''}`;
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
  while (box.childElementCount > 220) {
    const x = box.firstElementChild;
    if (x.__id) LOGEL.delete(x.__id);
    x.remove();
  }
  if (stick) box.scrollTop = box.scrollHeight;
}
function logResult(ev) {
  const el = LOGEL.get(ev.id);
  if (el) markResult(el, ev);
}
function logState(s, text, cls) {
  logLine({ k: 'state', t: Date.now(), s: s.id, l: text, cls }, true);
}

// ---------- marquee ----------
const MARQ = [];
let marqDirty = false;
function marqueePush(ev) {
  let s = null;
  if (ev.k === 'prompt' && !ev.cmd) s = `${sessName(ev.s)} › ${clipT(ev.l, 90)}`;
  else if (ev.k === 'tool' && ev.c === 'web') s = `${sessName(ev.s)} ${ev.n === 'WebSearch' ? '⌕' : '↓'} ${ev.l}`;
  else if (ev.k === 'tool' && ev.c === 'edit') s = `${sessName(ev.s)} ✎ ${ev.l}`;
  else if (ev.k === 'tool' && (ev.n === 'Agent' || ev.n === 'Task')) s = `${sessName(ev.s)} ◆ ${ev.l}`;
  if (!s) return;
  MARQ.push(s);
  if (MARQ.length > 16) MARQ.shift();
  marqDirty = true;
}
function flushMarquee(force) {
  if (!marqDirty && !force) return;
  marqDirty = false;
  if (MARQ.length) setText($('marquee'), MARQ.join('      ◇      '));
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
  map('state', STATE);
  const T = STATE.totals;
  const lc = clearedOf('p-log');
  setText($('m-log'), lc ? `live tool stream · ${since(lc)}` : 'live tool stream');
  setText($('m-map'), `${T.live} live · ${T.runningAgents} agents running · ${T.sessionsToday} sessions today`);
}

function renderTop() {
  const active = activeTopSession();
  if (active) {
    renderActiveTop(active);
    return;
  }
  const T = STATE.totals;
  setTopLabels(['sessions live', 'agents running', 'tools/min', 'tokens/min', 'today · api-eq', 'cache hit', 'web calls', 'tool ok']);
  setNum('k-sessions', T.live, (v) => String(Math.round(v)));
  setText($('k-sessions-sub'), `${T.sessionsToday} today`);
  setNum('k-agents', T.runningAgents, (v) => String(Math.round(v)));
  setText($('k-agents-sub'), `${T.agentsToday} today`);
  setNum('k-tpm', T.toolsPerMin, (v) => v.toFixed(1));
  setText($('k-tpm-sub'), 'last 5 min');
  setNum('k-tokm', T.tokPerMin, fmtTok);
  setText($('k-tokm-sub'), 'incl. cache');
  setNum('k-cost', T.cost, fmtUsd);
  setText($('k-burn'), `${fmtUsd(T.costPerHour)}/h burn`);
  setNum('k-cache', T.cacheHit * 100, (v) => v.toFixed(1) + '%');
  setText($('k-saved'), `saved ${fmtUsd(T.saved)}`);
  setNum('k-web', T.web, (v) => String(Math.round(v)));
  setText($('k-web-sub'), 'today');
  setNum('k-ok', T.okRate * 100, (v) => v.toFixed(1) + '%');
  setText($('k-err'), `${T.errors} failed`);
  renderLimits();
}

function activeTopSession() {
  return STATE?.sessions.find((s) => s.id === ACTIVE_SID && s.live) || null;
}

function setTopLabels(labels) {
  ['sessions', 'agents', 'tpm', 'tokm', 'cost', 'cache', 'web', 'ok'].forEach((id, i) => setText($(`kl-${id}`), labels[i]));
}
function setKpiText(id, value) {
  nums.delete(id);
  setText($(id), value);
}
function renderActiveTop(s) {
  const tool = s.tool || s.name || 'AI';
  const tok = s.tok || {};
  const cache = (tok.cr || 0) + (tok.cw || 0);
  const total = (tok.in || 0) + (tok.out || 0) + cache;
  const cacheBase = (tok.in || 0) + cache;
  const running = s.agentsRunning || 0;
  const okRate = s.tools ? Math.max(0, (s.tools - s.errors) / s.tools) : 1;
  const ctxPct = s.ctxMax ? Math.min(100, (s.ctx / s.ctxMax) * 100) : 0;
  setTopLabels(['active ai', 'model', 'context', 'session tokens', 'session · api-eq', 'cache hit', 'web calls', 'tool ok']);
  setKpiText('k-sessions', tool);
  setText($('k-sessions-sub'), `${STATUS[s.status]?.label || s.status || 'LIVE'} · ${clipT(s.title || s.cwd, 28)}`);
  setKpiText('k-agents', s.model || '—');
  setText($('k-agents-sub'), running ? `${running} agents running` : (s.effort || 'no subagents'));
  setNum('k-tpm', ctxPct, (v) => s.ctxMax ? `${v.toFixed(1)}%` : '—');
  setText($('k-tpm-sub'), `${fmtTok(s.ctx)} / ${s.ctxMax ? fmtTok(s.ctxMax) : '—'}`);
  setNum('k-tokm', total, fmtTok);
  setText($('k-tokm-sub'), `${fmtTok(tok.out)} out · ${fmtTok(cache)} cache`);
  if (tool === 'Claude Code') setNum('k-cost', s.cost || 0, fmtUsd);
  else setKpiText('k-cost', '—'); // No price estimate is available for the other CLIs.
  setText($('k-burn'), `${s.prompts || 0} prompts`);
  setNum('k-cache', cacheBase ? cache / cacheBase * 100 : 0, (v) => v.toFixed(1) + '%');
  setText($('k-saved'), `${fmtTok(cache)} cached`);
  setNum('k-web', s.web || 0, (v) => String(Math.round(v)));
  setText($('k-web-sub'), 'this session');
  setNum('k-ok', okRate * 100, (v) => v.toFixed(1) + '%');
  setText($('k-err'), `${s.errors || 0} failed · ${s.tools || 0} calls`);
  renderLimits(s);
}

// Usage limits from Claude Code's status line: used % of the 5-hour and the weekly window, and when each resets. Until
// the status line has reported them (a new install), they stay out of the top bar.
function renderLimits(active = activeTopSession()) {
  const L = active ? (active.tool === 'Codex' ? active.limits : active.tool === 'Claude Code' ? STATE?.limits : null) : STATE?.limits;
  const source = active?.tool || 'Claude Code';
  for (const [id, w, long] of [['lim-5h', L?.fiveHour, false], ['lim-week', L?.week, true]]) {
    const el = $(id);
    if (!el) continue;
    const minutes = w?.windowMinutes;
    const duration = minutes > 0 ? (minutes === 10080 ? 'week' : minutes % 60 === 0 ? `${minutes / 60}h` : `${minutes}m`) : long ? 'week' : '5h';
    setText(el.querySelector('label'), `${source.toLowerCase()} · ${duration} left`);
    el.title = `${source} remaining limit for the ${long ? 'weekly' : 'current 5-hour'} window`;
    el.style.display = w ? '' : 'none';
    // Both CLIs report percentage used. A passed reset only invalidates that measurement: usage elsewhere may already
    // have consumed the next window, so never invent 100% remaining without a fresh report from the CLI.
    const resetPassed = !!(w?.resetsAt && w.resetsAt <= Date.now());
    const used = w && !resetPassed && Number.isFinite(w.pct) ? Math.max(0, Math.min(100, w.pct)) : null;
    const left = used === null ? null : 100 - used;
    el.classList.toggle('ok', left !== null && left >= 50);
    el.classList.toggle('warn', left !== null && left >= 20 && left < 50);
    el.classList.toggle('hot', left !== null && left < 20);
    setText(el.querySelector('b'), left === null ? '—' : `${Math.round(left)}%`);
    setText(el.querySelector('small'), !w ? 'no data yet' : resetPassed ? 'awaiting update' : w.resetsAt ? `resets ${resetLabel(w.resetsAt, long)}` : '');
    el.querySelector('.lim-bar i').style.width = `${left ?? 0}%`;
  }
}
function resetLabel(at, long) {
  const ms = at - Date.now();
  if (ms <= 0) return 'now';
  if (!long || ms < 24 * 3600_000) {
    const m = Math.round(ms / 60_000);
    return m < 60 ? `in ${m}m` : `in ${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
  }
  return new Date(at).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).toLowerCase();
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
  setText(q('.cost'), fmtUsd(s.cost));
  setHTML(q('.spark'), sparkBars(s.spark, col));
  setText(q('.ag'), s.agents.length ? `⤷ ${s.agentsRunning} running · ${s.agents.length} subagents (15 min)` : '');
  setHTML(q('.flags'), s.flags.map((f) => `<span class="flag">${esc(f)}</span>`).join(''));
}
function renderSessions() {
  const box = $('sessions');
  if (!STATE.sessions.length) return placeholder(box, 'no Claude Code session in the last 30 min');
  keyed(box, STATE.sessions, (s) => s.id, createCard, updateCard);
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
      el.title = f.p;
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

function renderSpend() {
  const box = $('spend');
  if (!box.dataset.ready) {
    box.innerHTML =
      '<div class="spend-big" id="spend-big">$0</div><div class="spend-sub" id="spend-sub"></div>' +
      '<svg class="chart" id="spend-chart" viewBox="0 0 300 34" preserveAspectRatio="none"></svg>' +
      '<div class="spend-rows" id="spend-rows"></div><div class="spend-kv" id="spend-kv"></div>';
    box.dataset.ready = '1';
  }
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
  setHTML(
    $('spend-rows'),
    models
      .slice(0, 3)
      .map((m) => `<div class="sr"><span><b>${esc(m.model)}</b> · ${m.calls} calls</span><span>${fmtTok(m.tok.out)} out</span><span class="c">${m.priced ? fmtUsd(m.cost) : 'no price'}</span></div>`)
      .join(''),
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
  const title = nW ? `⚠ ${nW} needs you · Atalay's Terminal` : need.length ? `◆ ${need.length} your turn · Atalay's Terminal` : "Atalay's Terminal";
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
    `<div class="r">ctx ${fmtTok(s.ctx)}${pct} · ${fmtUsd(s.cost)} · ${s.tools} tools · ${s.web} web · ${s.errors} err · ${s.prompts} prompts</div>` +
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
  if (STATE) renderLimits(); // Refresh the selected AI's countdown, including when only Codex has limits.
}, 1000);
connect();

// Narrow windows: the top bar's numbers give way so its buttons always fit; the ones cut off fade at the edge.
(() => {
  const kpis = document.querySelector('#top .kpis');
  if (kpis) new ResizeObserver(() => kpis.classList.toggle('clip', kpis.scrollWidth > kpis.clientWidth + 1)).observe(kpis);
})();
