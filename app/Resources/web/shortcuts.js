'use strict';

// Radial shortcuts: a pie menu that opens at the pointer. Each of the 5 slices holds a folder the
// user saved; picking one starts a new Claude chat (terminal) in that folder, it does not open Finder.
// Empty slices open the folder picker. Right-click a filled slice to change or remove it.
// App trigger: three-finger click on the trackpad. Staging trigger: ⌥-click (browsers can't count fingers).
(() => {
  const SLOT_COUNT = 5;
  const C = 150, R0 = 46, R1 = 132, GAP = 2.2, POP = 8;
  const NS = 'http://www.w3.org/2000/svg';
  const FOLDER = 'M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4.6l2 2.2h8.4a1.5 1.5 0 0 1 1.5 1.5v8.3a1.5 1.5 0 0 1-1.5 1.5h-15a1.5 1.5 0 0 1-1.5-1.5z';

  let SLOTS = Array(SLOT_COUNT).fill(null);
  const root = document.createElement('div');
  root.id = 'shortcuts';
  document.body.appendChild(root);
  let pie = null, closing = false, at = { x: innerWidth / 2, y: innerHeight / 2 };

  const rad = (deg) => (deg * Math.PI) / 180;
  const pt = (r, deg) => [C + r * Math.cos(rad(deg)), C + r * Math.sin(rad(deg))];
  const midOf = (i) => -90 + i * (360 / SLOT_COUNT);
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const baseName = (p) => p.replace(/\/+$/, '').split('/').pop() || p;

  async function loadSlots() {
    try {
      const r = await API.getSlots();
      if (Array.isArray(r.slots)) SLOTS = r.slots;
    } catch {}
  }

  async function saveSlots(next) {
    const r = await API.saveSlots(next).catch(() => ({ error: 'network' }));
    if (r.error) {
      toast(`could not save shortcut: ${r.error}`);
      return false;
    }
    SLOTS = r.slots;
    return true;
  }

  function slicePath(a0, a1) {
    const [x0, y0] = pt(R1, a0), [x1, y1] = pt(R1, a1), [x2, y2] = pt(R0, a1), [x3, y3] = pt(R0, a0);
    return `M${x0} ${y0} A${R1} ${R1} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${R0} ${R0} 0 0 0 ${x3} ${y3} Z`;
  }

  function open(x, y, flashSlot = -1) {
    close(true);
    closing = false;
    at = { x, y };
    x = Math.max(160, Math.min(innerWidth - 160, x));
    y = Math.max(160, Math.min(innerHeight - 190, y));
    root.style.setProperty('--x', x + 'px');
    root.style.setProperty('--y', y + 'px');
    root.innerHTML = '<div class="veil"></div>';
    pie = document.createElement('div');
    pie.className = 'pie';
    pie.style.left = x + 'px';
    pie.style.top = y + 'px';
    const svg = el('svg', { viewBox: '0 0 300 300' }, pie);
    el('circle', { class: 'ring', cx: C, cy: C, r: R1 + 12 }, svg);

    const step = 360 / SLOT_COUNT;
    SLOTS.forEach((s, i) => {
      const mid = midOf(i);
      const g = el('g', { class: `slice slice-in${s ? '' : ' empty'}${i === flashSlot ? ' filled' : ''}` }, svg);
      g.style.setProperty('--dx', `${-Math.cos(rad(mid)) * 30}px`);
      g.style.setProperty('--dy', `${-Math.sin(rad(mid)) * 30}px`);
      g.style.animationDelay = `${60 + i * 45}ms`;
      el('path', { class: 'bg', d: slicePath(mid - step / 2 + GAP, mid + step / 2 - GAP) }, g);
      const [ix, iy] = pt((R0 + R1) / 2 - 4, mid);
      if (s) {
        const icon = el('g', { transform: `translate(${ix - 14} ${iy - 20}) scale(1.17)` }, g);
        el('path', { class: 'ico-fill', d: FOLDER }, icon);
        el('path', { class: 'ico', d: FOLDER }, icon);
        el('text', { x: 12, y: 16.2, style: 'font-size:6px;fill:#ffb057' }, icon).textContent = '>_';
        el('text', { x: ix, y: iy + 18 }, g).textContent = s.name.length > 13 ? s.name.slice(0, 12) + '…' : s.name;
      } else {
        el('circle', { class: 'plus-ring', cx: ix, cy: iy - 6, r: 11 }, g);
        el('path', { class: 'plus', d: `M${ix - 5} ${iy - 6}h10M${ix} ${iy - 11}v10` }, g);
        el('text', { class: 'add', x: ix, y: iy + 18 }, g).textContent = 'add folder';
      }
      const [nx, ny] = pt(R1 - 11, mid);
      el('text', { class: 'num', x: nx, y: ny + 3 }, g).textContent = String(i + 1);
      g.addEventListener('pointerenter', () => setHot(i));
      g.addEventListener('pointerleave', () => setHot(-1));
      g.addEventListener('click', (e) => (e.stopPropagation(), pick(i)));
      g.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (SLOTS[i]) slotMenu(i, e.clientX, e.clientY);
      });
    });

    const hub = el('g', { class: 'hub' }, svg);
    el('circle', { class: 'pulse', cx: C, cy: C, r: R0 - 6 }, hub);
    el('circle', { class: 'core', cx: C, cy: C, r: R0 - 6 }, hub);
    el('text', { class: 'brand', x: C, y: C - 12 }, hub).textContent = "ATALAY'S";
    el('text', { class: 'title', x: C, y: C + 3 }, hub).textContent = 'SHORTCUTS';
    el('text', { class: 'sub', x: C, y: C + 16 }, hub).textContent = SLOTS.some(Boolean) ? 'pick a folder' : 'add your folders';
    hub.addEventListener('click', (e) => (e.stopPropagation(), close()));

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = API.inApp
      ? '3-finger click · keys 1–5 · right-click a folder to change it · esc'
      : 'app: 3-finger click · staging: ⌥-click · 1–5 · right-click a folder to change it · esc';
    pie.appendChild(hint);
    root.appendChild(pie);
    root.classList.add('on');
  }

  function setHot(i) {
    if (!pie) return;
    pie.querySelectorAll('.slice').forEach((g, k) => {
      const mid = midOf(k);
      g.classList.toggle('hot', k === i);
      g.style.transform = k === i ? `translate(${Math.cos(rad(mid)) * POP}px, ${Math.sin(rad(mid)) * POP}px)` : '';
    });
    const s = SLOTS[i];
    const [title, sub] = pie.querySelectorAll('.hub .title, .hub .sub');
    if (i < 0) {
      title.textContent = 'SHORTCUTS';
      sub.textContent = SLOTS.some(Boolean) ? 'pick a folder' : 'add your folders';
    } else {
      title.textContent = s ? s.name.slice(0, 12) : `SLOT ${i + 1}`;
      sub.textContent = s ? 'terminal here' : 'choose a folder';
    }
  }

  function pick(i) {
    if (!pie) return;
    const s = SLOTS[i];
    pie.querySelectorAll('.slice')[i].classList.add('pick');
    setTimeout(() => {
      close(false, true);
      if (s) {
        API.newTerminal(s.dir, s.name);
        API.done();
      } else choose(i);
    }, 140);
  }

  function choose(i, start) {
    if (!window.Picker) return;
    window.Picker.open({
      forLabel: `for shortcut ${i + 1}`,
      start: start || '~/Documents/Repos',
      onPick: async (dir) => {
        const next = SLOTS.slice();
        next[i] = { name: baseName(dir), dir };
        if (await saveSlots(next)) {
          toast(`shortcut ${i + 1} → ${baseName(dir)}`);
          open(at.x, at.y, i);
        }
      },
      onCancel: () => open(at.x, at.y),
    });
  }

  function slotMenu(i, x, y) {
    pie.querySelector('.sc-ctx')?.remove();
    const m = document.createElement('div');
    m.className = 'sc-ctx';
    const r = pie.getBoundingClientRect();
    m.style.left = x - r.left + 'px';
    m.style.top = y - r.top + 'px';
    m.innerHTML = `<div class="t">${esc(SLOTS[i].display || SLOTS[i].dir)}</div><button data-a="change">Change folder…</button><button data-a="remove">Remove from slot ${i + 1}</button>`;
    m.addEventListener('click', async (e) => {
      e.stopPropagation();
      const a = e.target.dataset.a;
      if (a === 'change') {
        close(false, true);
        choose(i, SLOTS[i].dir);
      } else if (a === 'remove') {
        const next = SLOTS.slice();
        next[i] = null;
        if (await saveSlots(next)) open(at.x, at.y);
      }
    });
    pie.appendChild(m);
  }

  // keepOverlay: the picker or a chat window follows, so the app's overlay panel must stay up.
  function close(instant, keepOverlay) {
    if (!pie || closing) return;
    if (instant) {
      root.classList.remove('on');
      root.innerHTML = '';
      pie = null;
      return;
    }
    closing = true;
    pie.classList.add('closing');
    const p = pie;
    setTimeout(() => {
      if (pie === p) {
        root.classList.remove('on');
        root.innerHTML = '';
        pie = null;
      }
      closing = false;
      if (!keepOverlay) API.done();
    }, 210);
  }

  // Staging only: ⌥-click opens the menu at the pointer (the app uses a three-finger click instead).
  const staging = !window.__RADAR_APP__ && !API.inApp;
  if (staging) addEventListener('mousedown', (e) => {
    if (!e.altKey || e.button !== 0 || window.Picker?.isOpen()) return;
    e.preventDefault();
    e.stopPropagation();
    const before = JSON.stringify(SLOTS);
    open(e.clientX, e.clientY);
    loadSlots().then(() => pie && JSON.stringify(SLOTS) !== before && open(at.x, at.y));
  }, true);
  if (staging) addEventListener('click', (e) => {
    if (e.altKey) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
  root.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('veil')) close();
  });
  addEventListener('keydown', (e) => {
    if (!pie || window.Picker?.isOpen()) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= SLOT_COUNT) {
      pick(Number(e.key) - 1);
    }
  }, true);

  loadSlots();
  window.Shortcuts = { open, close, slots: () => SLOTS };
})();
