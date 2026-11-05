'use strict';

// The dashboard's small panels, laid out as you like: the right column's (research.feed, files.heat, tool.mix) and the
// bottom row's (session.log, workers, spend.ledger, your.call).
//   move     drag a panel by its strip: to another place in its column or row, or over to the other one
//   hide     the "–" on its strip; the top bar's panels menu brings it back (and resets the whole layout)
//   size     drag the lines between panels, and between the map and the right column, the bottom row and the sessions
//            list; a double-click on a line gives it its own size back
// The layout is kept in this page's storage (radar.layout) and set again on every load. A hidden panel isn't drawn
// (app.js asks `visible`), so hiding one also saves its work. Narrow windows (one column) keep the page's own layout.
window.PanelLayout = (() => {
  const KEY = 'radar.layout';
  const AREAS = {
    right: { el: () => document.getElementById('right'), axis: 'y', ids: ['p-research', 'p-files', 'p-mix'] },
    bottom: { el: () => document.getElementById('bottom'), axis: 'x', ids: ['p-log', 'p-workers', 'p-spend', 'p-call'] },
  };
  // Each panel's share of its column or row as the page has it (style.css); tool.mix takes what it needs.
  const DEFAULT_GROW = { 'p-research': 1.35, 'p-files': 1, 'p-mix': 0, 'p-log': 1.6, 'p-workers': 1, 'p-spend': 0.95, 'p-call': 1 };
  const ALL = [...AREAS.right.ids, ...AREAS.bottom.ids];
  const MIN_PANEL = 60;
  const app = document.getElementById('app');
  const panel = (id) => document.getElementById(id);
  const nameOf = (id) => panel(id)?.querySelector(':scope > header .tag')?.textContent.trim() || id;

  // ---------- the layout kept ----------
  const fresh = () => ({ v: 1, right: [...AREAS.right.ids], bottom: [...AREAS.bottom.ids], hidden: [], grow: {}, rightW: null, bottomH: null, sessW: null });
  function load() {
    let s = null;
    try {
      s = JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {}
    const L = fresh();
    if (!s || s.v !== 1) return L;
    // Every known panel once, where it was put; a panel this build doesn't know is dropped, a new one goes home.
    const seen = new Set();
    for (const a of ['right', 'bottom']) {
      L[a] = (Array.isArray(s[a]) ? s[a] : []).filter((id) => ALL.includes(id) && !seen.has(id) && seen.add(id));
    }
    for (const a of ['right', 'bottom']) for (const id of AREAS[a].ids) if (!seen.has(id)) L[a].push(id);
    L.hidden = (Array.isArray(s.hidden) ? s.hidden : []).filter((id) => ALL.includes(id));
    if (s.grow && typeof s.grow === 'object') for (const [id, g] of Object.entries(s.grow)) if (ALL.includes(id) && g > 0) L.grow[id] = g;
    for (const k of ['rightW', 'bottomH', 'sessW']) L[k] = Number(s[k]) > 0 ? Number(s[k]) : null;
    return L;
  }
  let L = load();
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(L));
      } catch {}
    }, 150);
  }
  const areaOf = (id) => (L.right.includes(id) ? 'right' : 'bottom');
  const isHidden = (id) => L.hidden.includes(id);

  // ---------- applying it ----------
  function flexOf(id, area) {
    const g = L.grow[id];
    if (g > 0) return `${g} 1 0px`;
    const d = DEFAULT_GROW[id];
    // tool.mix's own height only makes sense in the column; in the row it takes a share like the rest.
    if (!d) return area === 'right' ? '0 0 auto' : '1 1 0px';
    return `${d} 1 0px`;
  }

  function apply() {
    for (const a of ['right', 'bottom']) {
      const box = AREAS[a].el();
      if (!box) continue;
      box.querySelectorAll(':scope > .pl-sash').forEach((s) => s.remove());
      // Only a panel out of its place moves: moving one loses where its list was scrolled to.
      let cursor = box.firstElementChild;
      for (const id of L[a]) {
        const p = panel(id);
        if (!p) continue;
        if (p === cursor) cursor = cursor.nextElementSibling;
        else box.insertBefore(p, cursor);
      }
      let prev = null;
      for (const id of L[a]) {
        const p = panel(id);
        if (!p) continue;
        p.classList.add('pl-panel');
        const hide = isHidden(id);
        p.classList.toggle('pl-hidden', hide);
        p.style.flex = flexOf(id, a);
        if (hide) continue;
        if (prev) {
          const s = document.createElement('div');
          s.className = `pl-sash ${AREAS[a].axis}`;
          s.dataset.a = prev;
          s.dataset.b = id;
          s.title = 'Drag to size · double-click: back to their own sizes';
          box.insertBefore(s, p);
        }
        prev = id;
      }
      app.classList.toggle(`no-${a}`, !prev);
    }
    applyGrid();
    menuPaint();
  }

  // The page's parts' sizes only (while a line between them is dragged).
  function applyGrid() {
    app.classList.toggle('lay-w', !!(L.rightW || L.sessW));
    app.classList.toggle('lay-h', !!L.bottomH);
    app.style.setProperty('--lay-right', L.rightW ? `${Math.round(L.rightW)}px` : '');
    app.style.setProperty('--lay-sess', L.sessW ? `${Math.round(L.sessW)}px` : '');
    app.style.setProperty('--lay-bottom', L.bottomH ? `${Math.round(L.bottomH)}px` : '');
    if (!L.rightW) app.style.removeProperty('--lay-right');
    if (!L.sessW) app.style.removeProperty('--lay-sess');
    if (!L.bottomH) app.style.removeProperty('--lay-bottom');
    placeGridSashes();
  }

  // ---------- the strip's hide button ----------
  for (const id of ALL) {
    const h = panel(id)?.querySelector(':scope > header');
    if (!h || h.querySelector('.pl-btn')) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pl-btn';
    b.title = 'Hide this panel (the panels menu in the top bar brings it back)';
    b.textContent = '–';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      setHidden(id, true);
    });
    h.appendChild(b);
    h.title = 'Drag to move this panel';
  }

  function setHidden(id, hide) {
    L.hidden = L.hidden.filter((x) => x !== id);
    if (hide) L.hidden.push(id);
    apply();
    save();
    // What it missed while hidden.
    if (!hide && typeof renderAll === 'function') renderAll();
  }

  // ---------- sizing: the lines between panels ----------
  const narrow = () => matchMedia('(max-width: 920px)').matches;
  let drag = null;

  function onSashDown(e) {
    const s = e.target.closest('.pl-sash');
    if (!s || e.button !== 0) return;
    e.preventDefault();
    const box = s.parentElement;
    const a = box.id === 'right' ? 'right' : 'bottom';
    const axis = AREAS[a].axis;
    const size = (el) => (axis === 'y' ? el.getBoundingClientRect().height : el.getBoundingClientRect().width);
    // Every panel there takes its share as it is now, so moving this line moves nothing else.
    const shown = L[a].filter((id) => !isHidden(id) && panel(id));
    for (const id of shown) L.grow[id] = Math.max(1, size(panel(id)));
    for (const id of shown) panel(id).style.flex = flexOf(id, a);
    drag = { kind: 'sash', axis, A: s.dataset.a, B: s.dataset.b, start: axis === 'y' ? e.clientY : e.clientX, a0: L.grow[s.dataset.a], b0: L.grow[s.dataset.b], a };
    s.setPointerCapture(e.pointerId);
    s.classList.add('on');
    app.classList.add('pl-sizing', axis === 'y' ? 'pl-rows' : 'pl-cols');
  }

  function onSashMove(e) {
    if (!drag || drag.kind !== 'sash') return;
    const now = drag.axis === 'y' ? e.clientY : e.clientX;
    const total = drag.a0 + drag.b0;
    const a = Math.max(MIN_PANEL, Math.min(total - MIN_PANEL, drag.a0 + (now - drag.start)));
    L.grow[drag.A] = a;
    L.grow[drag.B] = total - a;
    panel(drag.A).style.flex = flexOf(drag.A, drag.a);
    panel(drag.B).style.flex = flexOf(drag.B, drag.a);
  }

  function endDrag() {
    if (!drag) return;
    document.querySelectorAll('.pl-sash.on, .pl-gsash.on').forEach((s) => s.classList.remove('on'));
    app.classList.remove('pl-sizing', 'pl-rows', 'pl-cols');
    drag = null;
    placeGridSashes();
    save();
  }

  app.addEventListener('pointerdown', onSashDown);
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (drag.kind === 'sash') onSashMove(e);
    else if (drag.kind === 'grid') onGridMove(e);
    else if (drag.kind === 'move') onMoveMove(e);
  });
  addEventListener('pointerup', (e) => {
    if (drag && drag.kind === 'move') return onMoveEnd(e, false);
    endDrag();
  });
  addEventListener('pointercancel', () => (drag && drag.kind === 'move' ? onMoveEnd(null, true) : endDrag()));
  app.addEventListener('dblclick', (e) => {
    const s = e.target.closest('.pl-sash');
    if (!s) return;
    const a = s.parentElement.id === 'right' ? 'right' : 'bottom';
    // Back to their own shares: every panel there, as the page has them.
    for (const id of L[a]) delete L.grow[id];
    apply();
    save();
  });

  // ---------- sizing: the right column's width, the bottom row's height, the sessions list's width ----------
  // Lines over the gaps between the page's parts, placed from where those parts are.
  const grid = {};
  for (const [k, title] of [['right', 'Drag: the right column’s width'], ['bottom', 'Drag: the bottom row’s height'], ['sess', 'Drag: the sessions list’s width']]) {
    const g = document.createElement('div');
    g.className = `pl-gsash ${k === 'bottom' ? 'y' : 'x'}`;
    g.dataset.k = k;
    g.title = `${title} · double-click: back to its own`;
    document.body.appendChild(g);
    grid[k] = g;
    g.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      g.setPointerCapture(e.pointerId);
      g.classList.add('on');
      drag = { kind: 'grid', k };
      app.classList.add('pl-sizing', k === 'bottom' ? 'pl-rows' : 'pl-cols');
    });
    g.addEventListener('dblclick', () => {
      L[k === 'right' ? 'rightW' : k === 'bottom' ? 'bottomH' : 'sessW'] = null;
      apply();
      save();
    });
  }

  function onGridMove(e) {
    const r = app.getBoundingClientRect();
    const pad = 8; // #app's padding
    if (drag.k === 'right') {
      const left = document.getElementById('sessions').getBoundingClientRect();
      L.rightW = Math.max(200, Math.min(r.right - pad - e.clientX - 4, r.right - left.right - 320));
    } else if (drag.k === 'bottom') {
      const top = document.getElementById('mapwrap').getBoundingClientRect();
      L.bottomH = Math.max(90, Math.min(r.bottom - pad - 22 - 8 - e.clientY - 4, r.bottom - top.top - 22 - 8 - 160));
    } else {
      const s = document.getElementById('sessions').getBoundingClientRect();
      L.sessW = Math.max(180, Math.min(e.clientX - s.left - 4, r.width * 0.45));
    }
    applyGrid();
  }

  function placeGridSashes() {
    const off = narrow() || app.classList.contains('cloud-mode') || app.classList.contains('git-mode');
    const rect = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? r : null;
    };
    const ses = rect('sessions'), map = rect('mapwrap'), right = rect('right'), bottom = rect('bottom');
    const put = (g, box) => {
      g.hidden = off || !box;
      if (g.hidden) return;
      Object.assign(g.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });
    };
    put(grid.right, map && right ? { x: map.right, y: right.top, w: right.left - map.right, h: right.height } : null);
    put(grid.bottom, map && bottom ? { x: bottom.left, y: map.bottom, w: bottom.width, h: bottom.top - map.bottom } : null);
    put(grid.sess, ses && map ? { x: ses.right, y: ses.top, w: map.left - ses.right, h: ses.height } : null);
  }
  const ro = new ResizeObserver(() => placeGridSashes());
  for (const id of ['sessions', 'mapwrap', 'right', 'bottom']) {
    const el = document.getElementById(id);
    if (el) ro.observe(el);
  }
  addEventListener('resize', placeGridSashes);
  // The activity bar's views hide the dashboard's parts: the lines go with them.
  new MutationObserver(placeGridSashes).observe(app, { attributes: true, attributeFilter: ['class'] });

  // ---------- moving: a panel by its strip ----------
  let pending = null;
  app.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || narrow()) return;
    const h = e.target.closest('.pl-panel > header');
    if (!h || e.target.closest('button, a, input, select, .pl-btn')) return;
    pending = { id: h.parentElement.id, x: e.clientX, y: e.clientY, pointer: e.pointerId };
  });
  addEventListener('pointermove', (e) => {
    if (!pending || drag) return;
    if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) < 6) return;
    startMove(pending.id, e);
    pending = null;
  });
  addEventListener('pointerup', () => (pending = null));

  function startMove(id, e) {
    const p = panel(id);
    const r = p.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'pl-ghost';
    ghost.innerHTML = `<span class="tag"></span>`;
    ghost.querySelector('.tag').textContent = nameOf(id);
    Object.assign(ghost.style, { width: `${Math.min(r.width, 320)}px`, height: `${Math.min(r.height, 160)}px` });
    document.body.appendChild(ghost);
    const ph = document.createElement('div');
    ph.className = 'pl-ph';
    ph.style.flex = p.style.flex;
    p.parentElement.insertBefore(ph, p);
    p.classList.add('pl-dragging');
    drag = { kind: 'move', id, ghost, ph, dx: Math.min(e.clientX - r.left, 300), dy: Math.min(e.clientY - r.top, 12) };
    app.classList.add('pl-moving');
    // An empty column or row takes a panel again while one moves.
    app.classList.remove('no-right', 'no-bottom');
    onMoveMove(e);
  }

  function onMoveMove(e) {
    const { ghost, ph } = drag;
    ghost.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px)`;
    // The column or row under the pointer, else the nearer one.
    let best = null, dist = Infinity;
    for (const a of ['right', 'bottom']) {
      const box = AREAS[a].el();
      const r = box.getBoundingClientRect();
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
      const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      const d = Math.hypot(dx, dy);
      if (d < dist) (dist = d), (best = a);
    }
    const box = AREAS[best].el();
    const axis = AREAS[best].axis;
    const others = [...box.children].filter((c) => c.classList.contains('pl-panel') && !c.classList.contains('pl-hidden') && !c.classList.contains('pl-dragging'));
    let before = null;
    for (const c of others) {
      const r = c.getBoundingClientRect();
      if ((axis === 'y' ? e.clientY < r.top + r.height / 2 : e.clientX < r.left + r.width / 2)) {
        before = c;
        break;
      }
    }
    if (before) {
      if (ph.nextSibling !== before || ph.parentElement !== box) box.insertBefore(ph, before);
    } else if (ph.parentElement !== box || ph !== box.lastElementChild) box.appendChild(ph);
    ph.style.flex = '1 1 0px';
    document.querySelectorAll('.pl-drop').forEach((x) => x.classList.toggle('pl-drop', x === box));
    box.classList.add('pl-drop');
  }

  function onMoveEnd(_e, cancel) {
    const { id, ghost, ph } = drag;
    const p = panel(id);
    ghost.remove();
    if (!cancel) {
      const box = ph.parentElement;
      const to = box.id === 'right' ? 'right' : 'bottom';
      const from = areaOf(id);
      box.insertBefore(p, ph);
      // The new order, from where the panels are now (hidden ones keep their places).
      for (const a of ['right', 'bottom']) {
        L[a] = [...AREAS[a].el().children].filter((c) => c.classList.contains('pl-panel')).map((c) => c.id);
      }
      // Over to the other one: it takes an even share there (the others' average, when they were sized).
      if (from !== to) {
        delete L.grow[id];
        const gs = L[to].filter((x) => x !== id && L.grow[x] > 0).map((x) => L.grow[x]);
        if (gs.length) L.grow[id] = gs.reduce((t, g) => t + g, 0) / gs.length;
      }
    }
    ph.remove();
    p.classList.remove('pl-dragging');
    document.querySelectorAll('.pl-drop').forEach((x) => x.classList.remove('pl-drop'));
    app.classList.remove('pl-moving');
    drag = null;
    apply();
    if (!cancel) save();
  }
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (drag && drag.kind === 'move') {
      e.stopImmediatePropagation();
      onMoveEnd(null, true);
    } else if (menu) {
      e.stopImmediatePropagation();
      closeMenu();
    }
  }, true);

  // ---------- the panels menu, in the top bar ----------
  let menu = null;
  const btn = document.createElement('button');
  btn.id = 'panels';
  btn.type = 'button';
  btn.className = 'topbtn icon';
  btn.title = 'Panels: show, hide, reset the layout';
  btn.innerHTML = '<svg viewBox="0 0 16 16"><rect x="1.8" y="2.2" width="12.4" height="11.6" rx="1.2"/><path d="M1.8 10h12.4M10 2.2V10M6 10v3.8"/></svg>';
  const settingsBtn = document.getElementById('settings');
  settingsBtn?.parentElement.insertBefore(btn, settingsBtn);
  btn.addEventListener('click', () => (menu ? closeMenu() : openMenu()));

  function menuPaint() {
    if (!menu) return;
    const row = (id) =>
      `<button type="button" class="pl-row${isHidden(id) ? '' : ' on'}" data-id="${id}"><i class="pl-sw"><i></i></i><span>${nameOf(id)}</span></button>`;
    menu.innerHTML =
      '<div class="pl-h">RIGHT COLUMN</div>' + L.right.map(row).join('') +
      '<div class="pl-h">BOTTOM ROW</div>' + L.bottom.map(row).join('') +
      '<div class="pl-foot"><button type="button" class="pl-reset">reset layout</button></div>' +
      '<div class="pl-tip">drag a strip to move · drag the lines to size</div>';
  }
  function openMenu() {
    menu = document.createElement('div');
    menu.className = 'pl-menu panel';
    document.body.appendChild(menu);
    menuPaint();
    const r = btn.getBoundingClientRect();
    menu.style.top = `${Math.round(r.bottom + 6)}px`;
    menu.style.right = `${Math.round(innerWidth - r.right)}px`;
    btn.classList.add('on');
    menu.addEventListener('click', (e) => {
      const row = e.target.closest('.pl-row');
      if (row) return setHidden(row.dataset.id, !isHidden(row.dataset.id));
      if (e.target.closest('.pl-reset')) {
        L = fresh();
        apply();
        save();
        if (typeof renderAll === 'function') renderAll();
      }
    });
    addEventListener('mousedown', outside, true);
    // The terminals' panel (Windows) would cover it.
    window.TermPanel?.modal(true);
  }
  function outside(e) {
    if (menu && !menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
  }
  function closeMenu() {
    if (!menu) return;
    menu.remove();
    menu = null;
    btn.classList.remove('on');
    removeEventListener('mousedown', outside, true);
    window.TermPanel?.modal(false);
  }

  apply();
  requestAnimationFrame(placeGridSashes);

  return {
    // app.js: whether a panel is drawn at all.
    visible: (id) => !isHidden(id),
    // app.js: a panel's right-click menu hides it, as its strip's "–" does.
    hide: (id) => ALL.includes(id) && setHidden(id, true),
    reset() {
      L = fresh();
      apply();
      save();
    },
  };
})();
