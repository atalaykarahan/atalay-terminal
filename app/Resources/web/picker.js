'use strict';

// In-app folder picker (Finder-like) used to fill a shortcut slot. Lists folders only.
// Opened for a new terminal (around: 'picker'), it has 14 shortcut places around it, like the pie's slices: a filled
// one opens a terminal in its folder at once, an empty one is filled by picking a folder in the picker.
(() => {
  const FOLDER = 'M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4.6l2 2.2h8.4a1.5 1.5 0 0 1 1.5 1.5v8.3a1.5 1.5 0 0 1-1.5 1.5h-15a1.5 1.5 0 0 1-1.5-1.5z';
  const GLYPH = { home: '⌂', desktop: '▭', doc: '▤', down: '⇣', code: '⌥', recent: '✻' };
  // 4 above, 3 to the right, 4 below, 3 to the left; numbered along each side, left to right and top to bottom.
  const SIDES = [['top', 4], ['right', 3], ['bottom', 4], ['left', 3]];
  const baseName = (p) => p.replace(/\/+$/, '').split('/').pop() || p;
  const note = (msg) => typeof toast === 'function' && toast(msg);

  const root = document.createElement('div');
  root.id = 'picker';
  document.body.appendChild(root);

  let st = null; // { cwd, list, sel, back, fwd, onPick, places, showHidden, filter, around, slots, assign }

  const rel = (t) => {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
    return `${Math.floor(s / (86400 * 30))}mo ago`;
  };
  const tild = (p) => (st && st.home && p.startsWith(st.home) ? '~' + p.slice(st.home.length) : p);

  async function open({ title = 'CHOOSE A FOLDER', forLabel = '', start = '~/Documents/Repos', around = null, onPick, onCancel } = {}) {
    st = { cwd: null, list: null, sel: -1, back: [], fwd: [], onPick, onCancel, places: null, showHidden: false, filter: '', home: '',
      forLabel, around, slots: [], assign: -1 };
    root.classList.remove('closing', 'assigning');
    root.classList.toggle('around', !!around);
    root.innerHTML = (around ? SIDES.map(([side]) => `<div class="pk-around ${side}"></div>`).join('') : '') + `
      <div class="pk crt-on">
        <div class="pk-border"></div>
        <div class="pk-title"><span class="lights"><i class="l-close" title="Cancel"></i><i class="l-min"></i><i class="l-max"></i></span><span class="hex">⬡</span><b>${esc(title)}</b><span class="for">${esc(forLabel)}</span></div>
        <div class="pk-bar">
          <button class="pk-back" title="Back">‹</button><button class="pk-fwd" title="Forward">›</button><button class="pk-up" title="Enclosing folder (⌘↑)">↑</button>
          <div class="pk-crumbs"></div>
          <input class="pk-filter" placeholder="filter folders" spellcheck="false">
          <label class="pk-hid"><input type="checkbox"> hidden</label>
        </div>
        <div class="pk-main">
          <aside class="pk-side"><div class="pk-h">FAVORITES</div><div class="pk-skel"></div><div class="pk-skel"></div></aside>
          <div class="pk-list"><div class="pk-skel"></div><div class="pk-skel"></div><div class="pk-skel"></div></div>
        </div>
        <div class="pk-foot"><span class="pk-sel"></span><button class="pk-cancel">Cancel</button><button class="pk-ok">Use this folder</button></div>
      </div>`;
    root.classList.add('on');
    const q = (s) => root.querySelector(s);
    q('.l-close').onclick = () => cancel(true);
    q('.pk-cancel').onclick = cancel;
    q('.pk-ok').onclick = choose;
    q('.pk-back').onclick = () => go(st.back.pop(), 'back');
    q('.pk-fwd').onclick = () => go(st.fwd.pop(), 'fwd');
    q('.pk-up').onclick = up;
    q('.pk-filter').oninput = (e) => {
      st.filter = e.target.value.trim().toLowerCase();
      st.sel = -1;
      renderList();
    };
    q('.pk-hid input').onchange = (e) => {
      st.showHidden = e.target.checked;
      st.sel = -1;
      renderList();
    };
    root.onmousedown = (e) => {
      const menu = root.querySelector('.pk-ctx');
      if (menu) {
        menu.remove();
        if (e.target === root) return;
      }
      if (e.target === root) cancel();
    };
    setTimeout(() => q('.pk')?.classList.remove('crt-on'), 700);
    if (around) {
      API.getSlots(around)
        .then((r) => {
          if (!st || st.around !== around) return;
          st.slots = Array.isArray(r.slots) ? r.slots : [];
          renderAround();
        })
        .catch(() => {});
    }

    API.places().then((p) => {
      if (!st) return;
      st.places = p;
      st.home = p.home;
      renderSide();
      renderCrumbs();
    });
    await go(start, null);
  }

  async function go(target, how) {
    if (!st || !target) return;
    const prev = st.cwd;
    root.querySelector('.pk-list').innerHTML = '<div class="pk-skel"></div><div class="pk-skel"></div><div class="pk-skel"></div>';
    const r = await API.listDir(target).catch(() => null);
    if (!st || !r) return;
    if (prev && how !== 'back' && how !== 'fwd') {
      st.back.push(prev);
      st.fwd = [];
    } else if (prev && how === 'back') st.fwd.push(prev);
    else if (prev && how === 'fwd') st.back.push(prev);
    st.cwd = r.path;
    st.list = r;
    st.sel = -1;
    st.filter = '';
    root.querySelector('.pk-filter').value = '';
    renderCrumbs();
    renderSide();
    renderList();
  }

  function up() {
    if (st?.list?.parent) go(st.list.parent, null);
  }

  function visible() {
    if (!st?.list) return [];
    return st.list.entries.filter((e) => (st.showHidden || !e.hidden) && (!st.filter || e.name.toLowerCase().includes(st.filter)));
  }

  function renderCrumbs() {
    if (!st?.cwd) return;
    const box = root.querySelector('.pk-crumbs');
    const shown = tild(st.cwd);
    const parts = shown.split('/').filter((x, i) => x || i === 0);
    let acc = shown.startsWith('~') ? st.home : '';
    box.innerHTML = '';
    parts.forEach((part, i) => {
      if (i === 0 && part === '~') acc = st.home;
      else acc = (acc === '/' ? '' : acc) + '/' + part;
      if (i) box.insertAdjacentHTML('beforeend', '<i>›</i>');
      const span = document.createElement('span');
      span.textContent = part || '/';
      const target = i === 0 && !part ? '/' : acc;
      span.onclick = () => go(target, null);
      box.appendChild(span);
    });
    root.querySelector('.pk-back').disabled = !st.back.length;
    root.querySelector('.pk-fwd').disabled = !st.fwd.length;
    root.querySelector('.pk-up').disabled = !st.list?.parent;
    updateFoot();
  }

  function renderSide() {
    if (!st?.places) return;
    const side = root.querySelector('.pk-side');
    const row = (p, glyph, sub) => `<div class="pk-place${p.path === st.cwd ? ' on' : ''}" data-path="${esc(p.path)}" title="${esc(tild(p.path))}"><span class="gl">${glyph}</span><span>${esc(p.name)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></div>`;
    side.innerHTML =
      '<div class="pk-h">FAVORITES</div>' + st.places.favorites.map((f) => row(f, GLYPH[f.icon] || '▸')).join('') +
      (st.places.recents.length ? '<div class="pk-h">RECENT · CLAUDE</div>' + st.places.recents.map((r) => row(r, GLYPH.recent, `${tild(r.path).split('/').slice(0, -1).join('/') || '~'} · ${rel(r.t)}`)).join('') : '');
    side.querySelectorAll('.pk-place').forEach((n) => (n.onclick = () => go(n.dataset.path, null)));
  }

  function renderList() {
    const box = root.querySelector('.pk-list');
    if (!st?.list) return;
    if (st.list.error) {
      box.innerHTML = `<div class="pk-empty err">⚠ ${esc(st.list.error)}: ${esc(tild(st.cwd))}</div>`;
      return updateFoot();
    }
    const items = visible();
    if (!items.length) {
      box.innerHTML = `<div class="pk-empty">${st.filter ? 'no folder matches “' + esc(st.filter) + '”' : 'no folders here — you can use this folder itself'}</div>`;
      return updateFoot();
    }
    box.innerHTML = items
      .map((e, i) => `<div class="pk-row${i === st.sel ? ' sel' : ''}${e.hidden ? ' hidden-dir' : ''}" data-i="${i}" style="animation-delay:${Math.min(i, 18) * 14}ms">
        <svg viewBox="0 0 24 24"><path class="fd-fill" d="${FOLDER}"/><path class="fd" d="${FOLDER}"/></svg>
        <span class="nm">${esc(e.name)}</span>
        <span class="badges">${e.git ? '<span class="badge git">⎇ git</span>' : ''}${e.claude ? '<span class="badge claude">✻ claude</span>' : ''}</span>
        <span class="dt">${e.modified ? rel(e.modified) : ''}</span></div>`)
      .join('');
    box.querySelectorAll('.pk-row').forEach((n) => {
      n.onclick = () => select(Number(n.dataset.i));
      n.ondblclick = () => go(items[Number(n.dataset.i)].path, null);
    });
    updateFoot();
  }

  function select(i) {
    st.sel = i;
    root.querySelectorAll('.pk-row').forEach((n) => n.classList.toggle('sel', Number(n.dataset.i) === i));
    root.querySelector(`.pk-row[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' });
    updateFoot();
  }

  const target = () => (st.sel >= 0 ? visible()[st.sel]?.path : null) || st.cwd;

  function updateFoot() {
    if (!st?.cwd) return;
    const label = st.assign >= 0 ? `shortcut ${st.assign + 1} → ` : 'terminal opens in ';
    root.querySelector('.pk-sel').innerHTML = `<b>${label}</b>${esc(tild(target()))}`;
  }

  function choose() {
    if (!st?.cwd) return;
    if (st.assign >= 0) return saveAssign();
    pickDir(target());
  }

  function pickDir(dir) {
    const cb = st.onPick;
    close(() => cb && cb(dir));
  }

  // force: the window's close light, which leaves even while a shortcut is being filled.
  function cancel(force) {
    if (!force && st?.assign >= 0) return endAssign();
    const cb = st?.onCancel;
    close(() => cb && cb());
  }

  // ---------- the shortcuts around the picker ----------

  function tile(s, i, side, delay) {
    const cls = `sc-tile ${side}${s ? '' : ' empty'}${delay == null ? '' : ' in'}`;
    const anim = delay == null ? '' : ` style="animation-delay:${delay}ms"`;
    const shown = s ? s.display || tild(s.dir) : '';
    const tip = s ? esc(shown) : `Shortcut ${i + 1}: choose a folder`;
    // Under the name, the folder it's in (the name is the path's end).
    const body = s
      ? `<svg class="fold" viewBox="0 0 24 24"><path class="fd-fill" d="${FOLDER}"/><path class="fd" d="${FOLDER}"/><text x="12" y="16.4">&gt;_</text></svg>
         <span class="nm">${esc(s.name)}</span><span class="sub">${esc(shown.replace(/\/[^/]*$/, '') || '/')}</span>`
      : `<svg class="plus" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M7.5 12h9M12 7.5v9"/></svg>
         <span class="nm">${st.assign === i ? 'pick a folder' : 'add folder'}</span>`;
    return `<div class="${cls}${st.assign === i ? ' assigning' : ''}" data-i="${i}" data-side="${side}" title="${tip}"${anim}><span class="n">${i + 1}</span>${body}</div>`;
  }

  function bind(n) {
    const i = Number(n.dataset.i);
    n.onclick = (e) => {
      e.stopPropagation();
      tileClick(i);
    };
    n.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (st.slots[i]) tileMenu(i, e.clientX, e.clientY);
    };
  }

  // The first time with the window's opening (each flies in from the picker); later, one place at a time (paint).
  function renderAround() {
    let i = 0;
    for (const [side, n] of SIDES) {
      const box = root.querySelector(`.pk-around.${side}`);
      if (!box) return;
      let html = '';
      for (let k = 0; k < n; k++, i++) html += tile(st.slots[i], i, side, 160 + i * 32);
      box.innerHTML = html;
    }
    root.querySelectorAll('.sc-tile').forEach(bind);
  }

  function paint(i, flash) {
    const old = root.querySelector(`.sc-tile[data-i="${i}"]`);
    if (!old) return;
    old.insertAdjacentHTML('afterend', tile(st.slots[i], i, old.dataset.side));
    old.remove();
    const n = root.querySelector(`.sc-tile[data-i="${i}"]`);
    bind(n);
    if (flash) n.classList.add('flash');
  }

  function tileClick(i) {
    const s = st.slots[i];
    if (s) return pickDir(s.dir);
    if (st.assign === i) return endAssign();
    startAssign(i);
  }

  // Filling place i: the picker's own choice (the button, Enter, a double-click's folder) goes into the place.
  function startAssign(i, dir) {
    const was = st.assign;
    st.assign = i;
    if (was >= 0 && was !== i) paint(was);
    paint(i);
    root.classList.add('assigning');
    root.querySelector('.pk-title .for').textContent = `pick a folder for shortcut ${i + 1}`;
    root.querySelector('.pk-ok').textContent = `Save as shortcut ${i + 1}`;
    root.querySelector('.pk-cancel').textContent = 'Back';
    if (dir) go(dir, null);
    else updateFoot();
  }

  function endAssign() {
    const i = st.assign;
    st.assign = -1;
    if (i >= 0) paint(i);
    root.classList.remove('assigning');
    root.querySelector('.pk-title .for').textContent = st.forLabel;
    root.querySelector('.pk-ok').textContent = 'Use this folder';
    root.querySelector('.pk-cancel').textContent = 'Cancel';
    updateFoot();
  }

  async function saveSlot(i, slot) {
    const next = st.slots.slice();
    while (next.length <= i) next.push(null);
    next[i] = slot;
    const around = st.around;
    const r = await API.saveSlots(next, around).catch(() => ({ error: 'network' }));
    if (!st || st.around !== around) return false;
    if (r.error) {
      note(`could not save shortcut: ${r.error}`);
      return false;
    }
    st.slots = r.slots;
    return true;
  }

  async function saveAssign() {
    const i = st.assign, dir = target();
    if (!(await saveSlot(i, { name: baseName(dir), dir }))) return;
    endAssign();
    paint(i, true);
    note(`shortcut ${i + 1} → ${st.slots[i].name}`);
  }

  function tileMenu(i, x, y) {
    root.querySelector('.pk-ctx')?.remove();
    const s = st.slots[i];
    const m = document.createElement('div');
    m.className = 'pk-ctx';
    m.style.left = Math.min(x, innerWidth - 230) + 'px';
    m.style.top = Math.min(y, innerHeight - 130) + 'px';
    m.innerHTML = `<div class="t">${esc(s.display || tild(s.dir))}</div><button data-a="open">New terminal here</button><button data-a="change">Change folder…</button><button data-a="remove">Remove shortcut ${i + 1}</button>`;
    m.onmousedown = (e) => e.stopPropagation();
    m.onclick = async (e) => {
      const a = e.target.dataset.a;
      if (!a) return;
      m.remove();
      if (a === 'open') pickDir(s.dir);
      else if (a === 'change') startAssign(i, s.dir);
      else if (a === 'remove' && (await saveSlot(i, null))) paint(i);
    };
    root.appendChild(m);
  }

  function close(done) {
    const pk = root.querySelector('.pk');
    if (!pk) return;
    pk.classList.remove('crt-on');
    void pk.offsetWidth;
    pk.classList.add('crt-off');
    root.querySelector('.pk-ctx')?.remove();
    root.classList.add('closing');
    setTimeout(() => {
      root.classList.remove('on', 'around', 'assigning', 'closing');
      root.innerHTML = '';
      st = null;
      done && done();
    }, 430);
  }

  addEventListener('keydown', (e) => {
    if (!st || !root.classList.contains('on')) return;
    const n = visible().length;
    if (e.key === 'Escape') {
      e.stopPropagation();
      const menu = root.querySelector('.pk-ctx');
      if (menu) menu.remove();
      else cancel();
    } else if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      select(Math.min(n - 1, st.sel + 1));
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      if (e.metaKey) up();
      else select(Math.max(0, st.sel - 1));
    } else if ((e.key === 'ArrowRight' || (e.key === 'ArrowDown' && e.metaKey)) && st.sel >= 0) {
      e.preventDefault();
      go(visible()[st.sel].path, null);
    } else if (e.key === 'ArrowLeft' && document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault();
      up();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose();
    }
  }, true);

  window.Picker = { open, isOpen: () => !!st };
})();
