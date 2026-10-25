'use strict';

// In-app folder picker (Finder-like) used to fill a shortcut slot. Lists folders only.
(() => {
  const FOLDER = 'M3 7.5a1.5 1.5 0 0 1 1.5-1.5h4.6l2 2.2h8.4a1.5 1.5 0 0 1 1.5 1.5v8.3a1.5 1.5 0 0 1-1.5 1.5h-15a1.5 1.5 0 0 1-1.5-1.5z';
  const GLYPH = { home: '⌂', desktop: '▭', doc: '▤', down: '⇣', code: '⌥', recent: '✻' };

  const root = document.createElement('div');
  root.id = 'picker';
  document.body.appendChild(root);

  let st = null; // { cwd, list, sel, back, fwd, onPick, places, showHidden, filter }

  const rel = (t) => {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
    return `${Math.floor(s / (86400 * 30))}mo ago`;
  };
  const tild = (p) => (st && st.home && p.startsWith(st.home) ? '~' + p.slice(st.home.length) : p);

  async function open({ title = 'CHOOSE A FOLDER', forLabel = '', start = '~/Documents/Repos', onPick, onCancel } = {}) {
    st = { cwd: null, list: null, sel: -1, back: [], fwd: [], onPick, onCancel, places: null, showHidden: false, filter: '', home: '' };
    root.innerHTML = `
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
    q('.l-close').onclick = cancel;
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
    root.onmousedown = (e) => e.target === root && cancel();
    setTimeout(() => q('.pk')?.classList.remove('crt-on'), 700);

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
    root.querySelector('.pk-sel').innerHTML = `<b>terminal opens in </b>${esc(tild(target()))}`;
  }

  function choose() {
    if (!st?.cwd) return;
    const dir = target(), cb = st.onPick;
    close(() => cb && cb(dir));
  }

  function cancel() {
    const cb = st?.onCancel;
    close(() => cb && cb());
  }

  function close(done) {
    const pk = root.querySelector('.pk');
    if (!pk) return;
    pk.classList.remove('crt-on');
    void pk.offsetWidth;
    pk.classList.add('crt-off');
    setTimeout(() => {
      root.classList.remove('on');
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
      cancel();
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
