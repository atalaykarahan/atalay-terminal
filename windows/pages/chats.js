'use strict';
// The chats list beside the dashboard (the Mac's SidebarView, Sidebar.swift): the saved conversations by project, newest
// first, the starred ones on top. A click opens a chat, a right-click has the rest; a star or the archive box shows on
// hover. The app sends the list (src/chatlist.js) and does what's asked of it; the search, the folders opened past their
// first five chats and the folders picked (a click on a folder's header) for archiving several at once are this page's.
(() => {
  const post = (msg) => window.webkit.messageHandlers.chats.postMessage(msg);
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const svg = (body) => `<svg viewBox="0 0 16 16" aria-hidden="true">${body}</svg>`;
  const ICON = {
    lens: svg('<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/>'),
    x: svg('<path d="M4 4l8 8M12 4l-8 8"/>'),
    star: svg('<path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z"/>'),
    archive: svg('<rect x="1.5" y="2.5" width="13" height="3.5" rx=".8"/><path d="M2.8 6v6.7c0 .5.4.8.8.8h8.8c.4 0 .8-.3.8-.8V6M6.3 8.8h3.4"/>'),
    folder: svg('<path d="M1.5 4.2c0-.6.5-1.2 1.1-1.2h3.3l1.5 1.6h6c.6 0 1.1.5 1.1 1.1v6.6c0 .6-.5 1.2-1.1 1.2H2.6c-.6 0-1.1-.6-1.1-1.2z"/>'),
    plus: svg('<path d="M8 3v10M3 8h10"/>'),
  };
  $('lens').innerHTML = ICON.lens;
  $('close').innerHTML = ICON.x;
  $('bulkClear').innerHTML = ICON.x;

  let data = { rows: [], saved: 0, live: 0, folders: {} };
  let activeId = null;
  let query = '';
  const expanded = new Set();
  const picked = new Set();
  // The chat being renamed in place: ↩ keeps the name, Esc (or a click elsewhere) leaves it.
  let renaming = null;

  function relative(ms) {
    // A live chat with nothing saved yet comes without a time: it's happening now.
    if (ms == null) return 'now';
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86_400) return `${Math.floor(s / 3600)}h`;
    if (s < 86_400 * 30) return `${Math.floor(s / 86_400)}d`;
    return `${Math.floor(s / (86_400 * 30))}mo`;
  }
  const fmtBytes = (n) => (n >= 1 << 20 ? `${(n / (1 << 20)).toFixed(1)}MB` : n >= 1024 ? `${Math.floor(n / 1024)}KB` : `${n}B`);

  function meta(r) {
    const bits = [relative(r.mtime)];
    if (r.size > 0) bits.push(fmtBytes(r.size));
    const isActive = r.active || r.id === activeId;
    if (isActive) bits.push('active window');
    else if (r.open) bits.push('in a window');
    else if (r.status) bits.push(r.host === 'term' ? 'in another terminal' : 'live');
    if (r.status === 'waiting') bits.push('NEEDS YOU');
    else if (r.status === 'idle') bits.push('your turn');
    return bits.join(' · ');
  }

  function row(r) {
    const st = r.status || 'ended';
    const isActive = r.active || r.id === activeId;
    return `<div class="row${r.open ? ' open' : ''}${isActive ? ' active is-active' : ''}" data-id="${esc(r.id)}" title="${esc(r.lastPrompt || r.title)}">` +
      `<span class="dot s-${esc(st)}${r.status ? '' : ' hollow'}"></span>` +
      (r.id === renaming
        ? `<span class="txt"><input class="ren" value="${esc(r.title || r.lastPrompt)}" spellcheck="false" maxlength="120">`
        : `<span class="txt"><span class="t${r.status ? ' live' : ''}">${esc(r.title || r.lastPrompt)}</span>`) +
      `<span class="m${st === 'waiting' ? ' warn' : ''}">${esc(meta(r))}</span></span>` +
      `<button type="button" class="star${r.fav ? ' on' : ''}" data-act="star" title="${r.fav ? 'Remove from favorites' : 'Add to favorites: it stays at the top'}">${ICON.star}</button>` +
      `<button type="button" data-act="archive" title="Archive: out of the list (Settings lists it)">${ICON.archive}</button></div>`;
  }

  function head(g) {
    const f = data.folders[g.key] || { label: g.cwd, path: g.cwd };
    const sel = picked.has(g.key);
    const tip = sel ? 'Selected · click again to leave it out' : `${f.path} · click to select, for archiving several at once`;
    return `<div class="head${sel ? ' sel' : ''}" data-key="${esc(g.key)}" data-cwd="${esc(g.cwd)}" title="${esc(tip)}">${ICON.folder}` +
      `<span class="lbl"><bdi>${esc(f.label)}</bdi></span><span class="n">${g.items.length}</span><span class="fill"></span>` +
      `<button type="button" class="farc" data-act="archive" title="Archive the folder: all its chats out of the list">${ICON.archive}</button>` +
      `<button type="button" class="plus" data-act="new" title="New terminal in this folder">${ICON.plus}</button></div>`;
  }

  function render() {
    $('count').textContent = `${data.saved} saved · ${data.live} live`;
    const q = query.trim().toLowerCase();
    const rows = q ? data.rows.filter((r) => `${r.title} ${r.lastPrompt} ${r.cwd}`.toLowerCase().includes(q)) : data.rows;
    const favs = rows.filter((r) => r.fav);
    const groups = [];
    const byKey = new Map();
    for (const r of rows) {
      if (r.fav) continue;
      let g = byKey.get(r.key);
      if (!g) {
        byKey.set(r.key, (g = { key: r.key, cwd: r.cwd, items: [] }));
        groups.push(g);
      }
      g.items.push(r);
    }
    let html = favs.length ? `<div class="sec">${ICON.star}<b>FAVORITES</b><span class="n">${favs.length}</span></div>${favs.map(row).join('')}` : '';
    for (const g of groups) {
      const all = expanded.has(g.key) || query !== '';
      html += head(g) + (all ? g.items : g.items.slice(0, 5)).map(row).join('');
      if (!all && g.items.length > 5) html += `<button type="button" class="more" data-key="${esc(g.key)}">+${g.items.length - 5} more</button>`;
    }
    $('list').innerHTML = html;
    const ren = renaming && $('list').querySelector('.ren');
    if (ren) {
      ren.focus();
      ren.select();
      ren.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          renaming = null;
          post({ type: 'rename', id: e.target.closest('.row').dataset.id, name: ren.value });
        } else if (e.key === 'Escape') {
          renaming = null;
          render();
        }
      });
      ren.addEventListener('blur', () => {
        if (!renaming) return;
        renaming = null;
        render();
      });
    }
    $('bulk').hidden = !picked.size;
    $('picked').textContent = `${picked.size} selected`;
  }

  const pick = (key) => {
    if (!picked.delete(key)) picked.add(key);
    render();
  };
  const archiveFolders = (keys, on) => {
    picked.clear();
    post({ type: 'folders', keys, on });
    render();
  };

  $('list').addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button && button.classList.contains('more')) {
      expanded.add(button.dataset.key);
      return render();
    }
    const r = e.target.closest('.row');
    if (r && e.target.classList.contains('ren')) return;
    if (r) {
      const act = button && button.dataset.act;
      return post({ type: act === 'star' ? 'favorite' : act === 'archive' ? 'archive' : 'open', id: r.dataset.id });
    }
    const h = e.target.closest('.head');
    if (!h) return;
    const act = button && button.dataset.act;
    if (act === 'archive') return post({ type: 'folders', keys: [h.dataset.key], on: true });
    if (act === 'new') return post({ type: 'newTerminal', cwd: h.dataset.cwd });
    pick(h.dataset.key);
  });

  // A chat's or a folder's menu, as on the Mac (a native one, from the app).
  document.addEventListener('contextmenu', async (e) => {
    e.preventDefault();
    const at = { x: Math.round(e.clientX), y: Math.round(e.clientY) };
    const r = e.target.closest('.row');
    const h = !r && e.target.closest('.head');
    if (r) {
      const item = data.rows.find((x) => x.id === r.dataset.id);
      if (!item) return;
      const choice = await post({
        type: 'menu', at, items: [
          { id: 'rename', title: 'Rename…' },
          { id: 'favorite', title: item.fav ? 'Remove from Favorites' : 'Add to Favorites' },
          { id: 'archive', title: 'Archive' },
          { separator: true },
          { id: 'open', title: 'Open in a Window' },
          { id: 'fork', title: 'Open a Copy (fork)' },
          { id: 'new', title: 'New Terminal in This Folder' },
          { separator: true },
          { id: 'reveal', title: 'Show Folder in Explorer' },
          { id: 'copyId', title: 'Copy Session ID' },
        ],
      });
      if (choice === 'rename') {
        renaming = item.id;
        render();
      } else if (choice === 'new' || choice === 'reveal') post({ type: choice === 'new' ? 'newTerminal' : 'reveal', cwd: item.cwd });
      else if (choice) post({ type: choice, id: item.id });
    } else if (h) {
      const key = h.dataset.key, sel = picked.has(key), n = picked.size;
      const items = [];
      if (n > 1 && sel) {
        items.push({ id: 'bulkOn', title: `Archive the ${n} Selected Folders` }, { id: 'bulkOff', title: `Unarchive the ${n} Selected Folders` }, { separator: true });
      }
      items.push({ id: 'archive', title: 'Archive Folder' }, { id: 'select', title: sel ? 'Deselect' : 'Select' }, { id: 'new', title: 'New Terminal in This Folder' });
      const choice = await post({ type: 'menu', at, items });
      if (choice === 'bulkOn' || choice === 'bulkOff') archiveFolders([...picked], choice === 'bulkOn');
      else if (choice === 'archive') post({ type: 'folders', keys: [key], on: true });
      else if (choice === 'select') pick(key);
      else if (choice === 'new') post({ type: 'newTerminal', cwd: h.dataset.cwd });
    }
  });

  $('q').addEventListener('input', (e) => {
    query = e.target.value;
    render();
  });
  $('close').addEventListener('click', () => post({ type: 'close' }));
  $('bulkArchive').addEventListener('click', () => archiveFolders([...picked], true));
  $('bulkClear').addEventListener('click', () => {
    picked.clear();
    render();
  });

  // Its right edge: drag to make the list wider or narrower (the app keeps it between its narrowest and widest).
  const grip = $('grip');
  grip.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    const x0 = e.screenX, w0 = window.innerWidth;
    let w = w0, frame = 0;
    const move = (ev) => {
      w = w0 + ev.screenX - x0;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        post({ type: 'width', w });
      });
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      cancelAnimationFrame(frame);
      post({ type: 'width', w, done: true });
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  });

  window.__chats = {
    update(d) {
      data = d && Array.isArray(d.rows) ? d : data;
      if (d && 'active' in d) activeId = d.active || null;
      // A folder that left the list (archived) isn't picked any more.
      const keys = new Set(data.rows.map((r) => r.key));
      for (const k of picked) if (!keys.has(k)) picked.delete(k);
      render();
    },
    active(id) {
      const next = id || null;
      if (next === activeId) return;
      activeId = next;
      render();
    },
    // Sliding open, it comes in from nothing; sliding shut, it fades out.
    fade(on) {
      const b = document.body;
      if (on) {
        b.style.transition = 'none';
        b.classList.add('hidden');
        void b.offsetWidth;
        b.style.transition = '';
      }
      b.classList.toggle('hidden', !on);
    },
  };
  // "5m", "2h": the times move on.
  setInterval(render, 30_000);
  render();
  post({ type: 'ready' });
})();
