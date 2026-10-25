'use strict';

// Staging stand-in for the app's native chat windows: one floating window per conversation over
// the dashboard. Closing a window only hides it; the session keeps running and stays on the radar.
(() => {
  const WINS = new Map(); // sid -> window state
  const SPIN = ['✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳'];
  let zTop = 10;
  let opened = 0;

  const catColor = (c) => CAT[c]?.color || '#a99bc4';
  const rgbOf = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return `${n >> 16}, ${(n >> 8) & 255}, ${n & 255}`;
  };
  const sessionOf = (sid) => STATE?.sessions.find((s) => s.id === sid);

  function build(sid, fresh) {
    const el = document.createElement('div');
    el.className = 'cw st-starting';
    el.hidden = true;
    el.innerHTML = `
      <div class="cw-frame">
        <div class="cw-border"></div>
        <div class="cw-title">
          <span class="lights"><i class="l-close" title="Close — Claude keeps working in the background"></i><i class="l-min" title="Hide"></i><i class="l-max" title="Zoom"></i></span>
          <span class="hex">⬡</span><b class="nm"></b><span class="sep">·</span><span class="ttl"></span>
          <span class="pill">STARTING</span>
        </div>
        <div class="cw-hud">
          <div class="scan"></div>
          <div class="h-ctx"><span>ctx</span><div class="bar"><i></i></div><em class="cv"></em></div>
          <span class="h-model"></span>
          <span class="h-cost"></span>
          <span class="h-counts"></span>
          <span class="h-action"></span>
          <canvas class="h-spark" width="192" height="36"></canvas>
          <span class="h-btns">
            <button class="b-pin on" title="Keep above the dashboard / make it a free window">⇱</button>
            <button class="b-radar" title="Back to the dashboard (the chat keeps running)">◎</button>
            <button class="b-end" title="End session">⏻</button>
          </span>
        </div>
        <div class="cw-body">
          <div class="term"><div class="items"></div><div class="thinking"><span class="spin">✻</span> <span class="txt">Thinking…</span></div><div class="permit"></div></div>
          <div class="inputbox"><span>❯</span><em>staging preview · typing is off here — in the app this is the real Claude terminal</em></div>
          <div class="modeline">▸▸ auto mode · <span class="mdl"></span></div>
        </div>
        <div class="cw-ticker"><span class="tk-status"></span><div class="tk-chips"></div></div>
        <div class="cw-resize"></div>
      </div>
      <div class="cw-dot"></div>`;
    $('windows').appendChild(el);

    const w = {
      sid, el, fresh: fresh || null, visible: false, max: false, prev: null, loaded: false, queue: [], lastT: 0, items: new Map(),
      q: (sel) => el.querySelector(sel),
    };
    place(w);
    wire(w);
    return w;
  }

  function place(w) {
    const vw = innerWidth, vh = innerHeight;
    const width = Math.min(1040, Math.max(620, vw * 0.62)), height = Math.min(720, Math.max(420, vh * 0.72));
    const k = opened++ % 6;
    Object.assign(w.el.style, {
      width: width + 'px',
      height: height + 'px',
      left: Math.max(10, (vw - width) / 2 + (k - 2.5) * 28) + 'px',
      top: Math.max(10, (vh - height) / 2 + (k - 2.5) * 22) + 'px',
    });
  }

  function wire(w) {
    const { el, q } = w;
    el.addEventListener('pointerdown', () => front(w));
    q('.l-close').addEventListener('click', (e) => (e.stopPropagation(), hide(w)));
    q('.l-min').addEventListener('click', (e) => (e.stopPropagation(), hide(w)));
    q('.l-max').addEventListener('click', (e) => (e.stopPropagation(), toggleMax(w)));
    q('.b-radar').addEventListener('click', () => hide(w));
    q('.b-pin').addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('on');
      toast(e.currentTarget.classList.contains('on') ? 'the window stays above the dashboard' : 'free window: in the app you can move it to another desktop or display');
    });
    q('.b-end').addEventListener('click', () => toast('staging: ending a session works in the app (it asks first)'));
    q('.cw-title').addEventListener('dblclick', () => toggleMax(w));
    drag(w, q('.cw-title'), (dx, dy, start) => {
      el.style.left = start.left + dx + 'px';
      el.style.top = Math.max(0, start.top + dy) + 'px';
    });
    drag(w, q('.cw-resize'), (dx, dy, start) => {
      el.style.width = Math.max(560, start.width + dx) + 'px';
      el.style.height = Math.max(360, start.height + dy) + 'px';
    });
  }

  function drag(w, handle, move) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.lights, button')) return;
      e.preventDefault();
      const r = w.el.getBoundingClientRect();
      const start = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, width: r.width, height: r.height };
      w.max = false;
      handle.setPointerCapture(e.pointerId);
      const onMove = (ev) => move(ev.clientX - start.x, ev.clientY - start.y, start);
      const onUp = () => {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
      };
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
    });
  }

  function toggleMax(w) {
    const s = w.el.style;
    if (w.max && w.prev) {
      Object.assign(s, w.prev);
      w.max = false;
    } else {
      w.prev = { left: s.left, top: s.top, width: s.width, height: s.height };
      Object.assign(s, { left: '14px', top: '14px', width: innerWidth - 28 + 'px', height: innerHeight - 28 + 'px' });
      w.max = true;
    }
  }

  function front(w) {
    if (w.el.style.zIndex == zTop) return;
    for (const o of WINS.values()) o.el.classList.remove('front');
    w.el.style.zIndex = ++zTop;
    w.el.classList.add('front');
  }

  function crt(w, cls, done) {
    w.el.classList.remove('crt-on', 'crt-off');
    void w.el.offsetWidth;
    w.el.classList.add(cls);
    const frame = w.q('.cw-frame');
    const end = () => {
      frame.removeEventListener('animationend', onEnd);
      clearTimeout(timer);
      w.el.classList.remove(cls);
      done && done();
    };
    const onEnd = (e) => e.animationName.startsWith('crt') && end();
    frame.addEventListener('animationend', onEnd);
    const timer = setTimeout(end, 1500);
  }

  function show(w) {
    front(w);
    if (w.visible) {
      crt(w, 'crt-on');
      return;
    }
    w.visible = true;
    w.el.hidden = false;
    crt(w, 'crt-on', () => scrollBottom(w, true));
    update(w);
    renderCards();
  }

  function hide(w) {
    if (!w.visible) return;
    crt(w, 'crt-off', () => {
      w.el.hidden = true;
      w.visible = false;
      renderCards();
      toast(`${sessName(w.sid)} keeps running in the background`);
    });
  }

  function renderCards() {
    if (typeof renderAll === 'function' && STATE) renderAll();
  }

  // ---------- body: Claude-Code-like transcript ----------
  function itemEl(it) {
    const d = document.createElement('div');
    if (it.k === 'prompt') {
      d.className = 'it prompt';
      d.innerHTML = `<span class="bul">&gt;</span><pre>${esc(it.x || it.l)}</pre>`;
    } else if (it.k === 'say') {
      d.className = 'it say';
      d.innerHTML = `<span class="bul">●</span><pre>${esc(it.x || it.l)}</pre>`;
    } else if (it.k === 'tool') {
      const col = catColor(it.c);
      const args = it.x || it.l || '';
      d.className = 'it tool' + (it.ok === undefined || it.ok === null ? ' run' : '');
      d.dataset.id = it.id;
      d.innerHTML = `<span class="bul" style="color:${col}">●</span><div><div class="call"><b style="color:${col}">${esc(it.n)}</b>(<span class="args">${esc(clipT(args.split('\n')[0], 160))}</span>)</div><div class="res"></div></div>`;
      fillResult(d, it);
    } else {
      d.className = 'it sys';
      d.innerHTML = `<span class="bul">·</span><pre>${esc(it.x || it.l)}</pre>`;
    }
    return d;
  }

  function fillResult(d, it) {
    const res = d.querySelector('.res');
    if (!res) return;
    if (it.ok === undefined || it.ok === null) {
      res.textContent = '⎿  running…';
      return;
    }
    d.classList.remove('run');
    const bits = [it.d != null ? fmtDur(it.d) : '', it.m || ''].filter(Boolean).join(' · ');
    res.innerHTML = `⎿  <span class="${it.ok ? 'ok' : 'bad'}">${it.ok ? '✓' : '✗'}</span> ${esc(bits)}${it.o ? `<pre>${esc(it.o)}</pre>` : ''}`;
  }

  function append(w, it) {
    if (it.k === 'result') {
      const d = w.q(`.it.tool[data-id="${CSS.escape(it.id || '')}"]`);
      if (d) fillResult(d, it);
      return;
    }
    if (it.k === 'tool' && it.id && w.q(`.it.tool[data-id="${CSS.escape(it.id)}"]`)) return;
    const box = w.q('.items');
    const stick = nearBottom(w);
    box.appendChild(itemEl(it));
    while (box.childElementCount > 260) box.firstElementChild.remove();
    if (stick) scrollBottom(w);
  }

  const nearBottom = (w) => {
    const t = w.q('.term');
    return t.scrollTop + t.clientHeight >= t.scrollHeight - 40;
  };
  function scrollBottom(w, force) {
    const t = w.q('.term');
    if (force || nearBottom(w)) t.scrollTop = t.scrollHeight;
  }

  async function load(w) {
    try {
      const r = await fetch(`/api/transcript?sid=${encodeURIComponent(w.sid)}`);
      const { items } = await r.json();
      for (const it of items) append(w, it);
      w.lastT = items.length ? items[items.length - 1].t : 0;
    } catch {}
    w.loaded = true;
    for (const ev of w.queue) if (!ev.t || ev.t >= w.lastT) append(w, ev);
    w.queue = [];
    scrollBottom(w, true);
  }

  // ---------- HUD + ticker ----------
  function update(w) {
    const s = sessionOf(w.sid);
    const { el, q } = w;
    if (w.fresh && !s) {
      for (const st of ['busy', 'idle', 'waiting', 'ended', 'starting']) el.classList.toggle('st-' + st, st === 'idle');
      setText(q('.nm'), w.fresh.name);
      setText(q('.ttl'), w.fresh.dir);
      setText(q('.pill'), 'TERMINAL');
      setText(q('.mdl'), w.fresh.dir);
      setHTML(q('.tk-status'), '▸ terminal · claude to start · claude -r to resume');
      return;
    }
    const status = s ? s.status : 'ended';
    for (const st of ['busy', 'idle', 'waiting', 'ended', 'starting']) el.classList.toggle('st-' + st, st === status);
    if (!s) {
      setText(q('.pill'), 'ENDED');
      return;
    }
    setText(q('.nm'), s.name);
    setText(q('.ttl'), s.title || s.lastPrompt || s.cwd);
    setText(q('.pill'), `${STATUS[status].label}${status === 'ended' ? '' : ' ' + clock(Date.now() - (s.statusSince || s.lastTs))}`);
    const pct = s.ctxMax ? Math.min(1, s.ctx / s.ctxMax) : 0;
    q('.h-ctx .bar > i').style.width = (pct * 100).toFixed(1) + '%';
    setText(q('.h-ctx .cv'), `${fmtTok(s.ctx)}${s.ctxMax ? ' / ' + fmtTok(s.ctxMax) : ''}`);
    setText(q('.h-model'), [s.model, s.effort].filter(Boolean).join(' · '));
    setText(q('.h-cost'), fmtUsd(s.cost));
    setHTML(q('.h-counts'), `<b>${s.tools}</b> tools · <b>${s.web}</b> web · <b class="${s.errors ? 'red' : ''}">${s.errors}</b> err${s.agentsRunning ? ` · <b style="color:#9d6bff">⤷${s.agentsRunning}</b>` : ''}`);
    const p = s.pending[0];
    setHTML(q('.h-action'), p ? `<span class="nm" style="color:${catColor(p.c)}">▸ ${esc(p.n)}</span> <span class="shim">${esc(clipT(p.l, 60))}</span> <i class="dim">${fmtDur(Date.now() - p.t)}</i>` : '');
    setText(q('.mdl'), `${s.model || ''} · ${s.cwd}`);
    q('.thinking').classList.toggle('on', status === 'busy' && !p);
    const permit = q('.permit');
    permit.classList.toggle('on', status === 'waiting');
    setText(permit, status === 'waiting' ? `⚠ Claude is waiting for your approval: ${s.waitingFor || 'permission'} — answer it right here in the app` : '');
    setHTML(q('.tk-status'), status === 'busy' ? '● working' : status === 'idle' ? '◆ your turn' : status === 'waiting' ? '⚠ NEEDS YOU' : '○ ended');
    w.spark = s.spark;
  }

  function chip(w, ev) {
    const box = w.q('.tk-chips');
    const c = document.createElement('span');
    const col = ev.k === 'prompt' ? '#ffb057' : ev.k === 'say' ? '#d9c3a8' : catColor(ev.c);
    c.className = 'chip fresh';
    c.style.setProperty('--cc', col);
    const k = ev.k === 'tool' ? CAT[ev.c]?.label || ev.c : ev.k === 'prompt' ? 'you' : ev.k === 'say' ? 'claude' : ev.k;
    c.innerHTML = `<span class="k">${esc(k)}</span>${ev.a ? '⤷ ' : ''}${esc(clipT(ev.l || ev.x || '', 40))}`;
    box.appendChild(c);
    setTimeout(() => c.classList.remove('fresh'), 1400);
    while (box.childElementCount > 9) box.firstElementChild.remove();
  }

  function flash(w, ev) {
    const hud = w.q('.cw-hud');
    hud.style.setProperty('--fc', rgbOf(ev.k === 'tool' || ev.k === 'result' ? catColor(ev.c) : '#f88008'));
    hud.classList.remove('flash');
    void hud.offsetWidth;
    hud.classList.add('flash');
  }

  function drawSpark(w, t) {
    const cv = w.q('.h-spark');
    const g = cv.getContext('2d');
    const arr = w.spark || [];
    g.clearRect(0, 0, cv.width, cv.height);
    if (!arr.length) return;
    const max = Math.max(1, ...arr), bw = cv.width / arr.length;
    const col = getComputedStyle(w.el).getPropertyValue('--b1').trim() || '#f88008';
    arr.forEach((v, i) => {
      const h = v ? Math.max(3, (v / max) * (cv.height - 4)) : 2;
      const live = i === arr.length - 1 ? 0.6 + 0.4 * Math.sin(t / 180) : 1;
      g.globalAlpha = (v ? 0.85 : 0.18) * live;
      g.fillStyle = col;
      g.fillRect(i * bw + 1, cv.height - h, bw - 2, h);
    });
    g.globalAlpha = 1;
  }

  function tick(t) {
    for (const w of WINS.values()) {
      if (!w.visible) continue;
      drawSpark(w, t);
      const th = w.q('.thinking.on .spin');
      if (th) th.textContent = SPIN[Math.floor(t / 110) % SPIN.length];
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const top = [...WINS.values()].filter((w) => w.visible).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0];
    if (top) hide(top);
  });

  window.Chat = {
    open(sid) {
      let w = WINS.get(sid);
      if (!w) {
        w = build(sid);
        WINS.set(sid, w);
        load(w);
      }
      show(w);
    },
    openNew(dir, name) {
      const id = `new:${Date.now()}`;
      const w = build(id, { dir, name });
      WINS.set(id, w);
      w.loaded = true;
      w.q('.items').innerHTML = `<div class="welcome"><div class="wl-box"><b>▸ Terminal</b><span>cwd: ${esc(dir)}</span></div><div class="wl-note">staging preview — in the app this window is a terminal in ${esc(dir)}: <code>claude</code> starts a chat, <code>claude -r</code> resumes one</div></div>`;
      show(w);
    },
    isOpen: (sid) => !!WINS.get(sid)?.visible,
    onEvent(ev) {
      if (!ev.s) return;
      const w = WINS.get(ev.s);
      if (!w) return;
      if (['tool', 'prompt', 'say', 'sys'].includes(ev.k)) {
        chip(w, ev);
        flash(w, ev);
      }
      if (ev.a) return;
      if (!['tool', 'result', 'prompt', 'say', 'sys'].includes(ev.k)) return;
      if (!w.loaded) w.queue.push(ev);
      else append(w, ev);
    },
    onState() {
      for (const w of WINS.values()) update(w);
    },
  };
})();
