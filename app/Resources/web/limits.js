'use strict';

// The activity bar's limit panel (its gauge button, git.js): a small panel beside the bar with every AI tool the app
// reads (Claude Code, Codex, Antigravity): its usage limits as the tool reports them, the tokens it used today and over
// the last 30 days, a bar per day, and its models. The app reads the tools' own logs for it (the "radar" handler's
// `usage`, windows/src/usage.js); where the app can't answer (an older Mac build), Claude's limits and today's tokens
// come from the dashboard's state, as the top bar has them. It keeps itself current every 15 s while it's open.
window.Limits = (() => {
  const REFRESH_MS = 15_000;
  let root = null;
  let anchor = null;
  let timer = 0;
  let data = null;
  let loading = false;

  const compact = (n) => {
    n = n || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return String(Math.round(n));
  };
  const fmtT = (n) => (typeof fmtTok === 'function' ? fmtTok(n) : compact(n));
  const fmtU = (n) => (typeof fmtUsd === 'function' ? fmtUsd(n) : '$' + (n || 0).toFixed(2));
  const e = (s) => (typeof esc === 'function' ? esc(s) : String(s ?? ''));
  const stateNow = () => (typeof STATE !== 'undefined' ? STATE : null);

  function ask() {
    try {
      const h = window.webkit?.messageHandlers?.radar;
      const p = h && h.postMessage({ type: 'usage' });
      if (!p || typeof p.then !== 'function') return Promise.resolve(null);
      return Promise.race([p, new Promise((r) => setTimeout(() => r(null), 60_000))]).catch(() => null);
    } catch {
      return Promise.resolve(null);
    }
  }

  // Without the app's answer: what the dashboard knows (Claude, today).
  function fromState() {
    const S = stateNow();
    const L = S?.limits;
    const windows = [];
    if (L?.fiveHour) windows.push({ label: '5-hour window', pct: L.fiveHour.pct, resetsAt: L.fiveHour.resetsAt });
    if (L?.week) windows.push({ label: 'weekly', pct: L.week.pct, resetsAt: L.week.resetsAt });
    const t = S?.totals?.tok || { in: 0, out: 0, cr: 0, cw: 0 };
    const total = (t.in || 0) + (t.out || 0) + (t.cr || 0) + (t.cw || 0);
    return {
      partial: true,
      at: Date.now(),
      days: [],
      providers: [{
        id: 'claude', name: 'Claude Code', priced: true, found: !!S,
        limits: windows.length ? { windows } : null,
        today: { ...t, total, cost: S?.totals?.cost || 0 },
        month: null, daily: [], models: [],
      }],
    };
  }

  async function load() {
    if (loading) return;
    loading = true;
    if (!data) paint();
    const r = await ask();
    loading = false;
    data = r && Array.isArray(r.providers) ? r : fromState();
    paint();
  }

  function resetIn(at) {
    if (!at) return '';
    const ms = at - Date.now();
    if (ms <= 0) return 'resets now';
    const m = Math.round(ms / 60_000);
    if (m < 60) return `resets in ${m}m`;
    if (m < 24 * 60) return `resets in ${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
    return 'resets ' + new Date(at).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).toLowerCase();
  }

  function gauge(w) {
    const pct = Math.max(0, Math.min(100, Number(w.pct) || 0));
    const cls = pct >= 80 ? 'hot' : pct >= 50 ? 'warn' : 'ok';
    return `<div class="lp-gauge ${cls}"><span class="lp-gl">${e(w.label)}</span><i class="lp-bar"><i style="width:${pct}%"></i></i>` +
      `<b>${Math.round(pct)}%</b><small>${e(resetIn(w.resetsAt))}</small></div>`;
  }

  function bars(daily, days) {
    if (!daily || !daily.length) return '';
    const max = Math.max(1, ...daily);
    const n = daily.length;
    const w = 300 / n;
    const rects = daily.map((v, i) => {
      const h = v ? Math.max(1.5, (v / max) * 30) : 0;
      const d = days[i] || '';
      return `<rect class="${i === n - 1 ? 'now' : ''}" x="${(i * w + 0.6).toFixed(2)}" y="${(32 - h).toFixed(2)}" width="${(w - 1.2).toFixed(2)}" height="${h.toFixed(2)}"><title>${e(d)} · ${fmtT(v)} tokens</title></rect>`;
    }).join('');
    return `<svg class="lp-chart" viewBox="0 0 300 32" preserveAspectRatio="none">${rects}</svg>` +
      `<div class="lp-axis"><span>${e(days[0] ? days[0].slice(5) : '')}</span><span>30 days</span><span>today</span></div>`;
  }

  function line(label, t, priced) {
    if (!t) return `<div class="lp-row"><span class="lp-k">${label}</span><span class="lp-v dim">not available in this build</span></div>`;
    return `<div class="lp-row"><span class="lp-k">${label}</span><span class="lp-v"><b>${fmtT(t.total)}</b> tokens</span>` +
      `${priced ? `<span class="lp-c">${fmtU(t.cost)}</span>` : ''}</div>` +
      `<div class="lp-sub">in ${fmtT(t.in)} · out ${fmtT(t.out)} · cache read ${fmtT(t.cr)}${t.cw ? ` · cache write ${fmtT(t.cw)}` : ''}${t.calls ? ` · ${t.calls.toLocaleString('en-US')} replies` : ''}</div>`;
  }

  const LIMIT_HINT = {
    claude: "no report yet · Claude Code's status line sends them with its next reply",
    codex: 'no report yet · Codex sends them with its next reply',
    antigravity: "Antigravity doesn't report its limits",
  };

  function card(p, days) {
    if (!p.found) {
      return `<div class="lp-ai off" data-ai="${e(p.id)}"><div class="lp-ai-h"><b>${e(p.name)}</b><em>not found</em></div>` +
        `<div class="lp-sub">no logs from the last 30 days on this computer</div></div>`;
    }
    const lim = p.limits && p.limits.windows && p.limits.windows.length
      ? p.limits.windows.map(gauge).join('')
      : `<div class="lp-sub lp-nolim">limits: ${e(LIMIT_HINT[p.id] || 'not reported')}</div>`;
    const models = (p.models || []).filter((m) => m.month.total > 0).slice(0, 4)
      .map((m) => `<span title="today ${fmtT(m.today.total)} · 30 days ${fmtT(m.month.total)}"><b>${e(m.model)}</b> ${fmtT(m.month.total)}</span>`).join('');
    return `<div class="lp-ai" data-ai="${e(p.id)}"><div class="lp-ai-h"><b>${e(p.name)}</b>${p.limits?.plan ? `<em>${e(p.limits.plan)}</em>` : ''}</div>` +
      lim + line('today', p.today, p.priced) + line('30 days', p.month, p.priced) + bars(p.daily, days) +
      (models ? `<div class="lp-models">${models}</div>` : '') + '</div>';
  }

  function paint() {
    if (!root) return;
    const body = root.querySelector('.lp-body');
    const meta = root.querySelector('.meta');
    if (!data) {
      meta.textContent = 'reading logs…';
      body.innerHTML = '<div class="lp-empty">reading the AI tools\' logs · the first time takes a few seconds</div>';
      return;
    }
    meta.textContent = loading ? 'refreshing…' : `updated ${new Date(data.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    const found = data.providers.filter((p) => p.found);
    const rest = data.providers.filter((p) => !p.found);
    const priced = found.filter((p) => p.priced && p.month);
    const sum = priced.length
      ? `<div class="lp-total">${priced.map((p) => `<span>${e(p.name)} · 30 days <b>${fmtU(p.month.cost)}</b> <small>api list price</small></span>`).join('')}</div>`
      : '';
    body.innerHTML = sum + [...found, ...rest].map((p) => card(p, data.days || [])).join('') +
      (data.partial ? '<div class="lp-sub lp-note">30-day history comes with the app\'s next update</div>' : '');
  }

  function place() {
    if (!root || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const bar = anchor.parentElement.getBoundingClientRect();
    const top = Math.max(8, Math.min(r.top - 6, innerHeight - root.offsetHeight - 8));
    root.style.left = `${Math.round(bar.right + 8)}px`;
    root.style.top = `${Math.round(top)}px`;
    root.style.maxHeight = `${innerHeight - 16}px`;
  }

  function onDown(ev) {
    if (!root) return;
    if (root.contains(ev.target) || (anchor && anchor.contains(ev.target))) return;
    close();
  }
  function onKey(ev) {
    if (ev.key !== 'Escape' || !root) return;
    ev.stopImmediatePropagation();
    ev.preventDefault();
    close();
  }

  function open(btn) {
    anchor = btn || document.querySelector('#activity [data-view=limits]');
    if (!root) {
      root = document.createElement('section');
      root.id = 'limits-pop';
      root.className = 'panel';
      root.innerHTML = '<header><span class="tag">ai.limits</span><span class="meta"></span>' +
        '<button type="button" class="lp-x" title="Close (Esc)">×</button></header><div class="body lp-body"></div>';
      root.querySelector('.lp-x').addEventListener('click', close);
      document.body.appendChild(root);
    }
    anchor?.classList.add('lim-open');
    // The terminals' panel (Windows) would cover it: it steps aside while this is open.
    window.TermPanel?.modal(true);
    paint();
    place();
    requestAnimationFrame(place);
    load().then(place);
    clearInterval(timer);
    timer = setInterval(() => document.visibilityState === 'visible' && load(), REFRESH_MS);
    addEventListener('mousedown', onDown, true);
    addEventListener('keydown', onKey, true);
    addEventListener('resize', place);
  }

  function close() {
    clearInterval(timer);
    timer = 0;
    removeEventListener('mousedown', onDown, true);
    removeEventListener('keydown', onKey, true);
    removeEventListener('resize', place);
    anchor?.classList.remove('lim-open');
    if (root) window.TermPanel?.modal(false);
    root?.remove();
    root = null;
  }

  return { toggle: (btn) => (root ? close() : open(btn)), open, close };
})();
