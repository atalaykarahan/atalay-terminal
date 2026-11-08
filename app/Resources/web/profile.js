'use strict';

// Your profile beyond the name: a picture of your own in place of GitHub's, and links to your other pages (GitHub,
// Instagram, LinkedIn, X, YouTube, a website) on your card where friends and the leaderboard see it. And anyone's picture
// big: a click on the one on a card (a friend's, the leaderboard's, your own) opens it across the view, as Steam and
// Discord do.
//
// The picture and the links live on the server (src/account.ts): Settings → PROFILE shows once `GET v1/account` says
// it takes them (`methods.profile`), and a card shows someone's links once the API sends them (`links` on a friend in
// v1/social and on a leaderboard row). Until then only the big picture is here. The API it expects:
//   GET    v1/account   → { …, methods: { …, profile: true }, links: { github: url, … }, avatarCustom: bool }
//   PUT    v1/me/profile  { links: { github?, instagram?, linkedin?, x?, youtube?, website? } } → { links }
//   PUT    v1/me/avatar   { image: "data:image/jpeg;base64,…" }  (512×512, ≤ 300 KB)            → { avatar }
//   DELETE v1/me/avatar   → { avatar }  (GitHub's again once signed in with it, none otherwise)
// The links go as full https addresses, the ones normalize() makes; the server should check them the same way (only
// these sites, https, no user:password@) and serve its pictures with a new address each time one changes.
window.Profile = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const say = (m) => (typeof window.toast === 'function' ? window.toast(m) : console.warn(m));
  const h = window.webkit && window.webkit.messageHandlers;
  const api = (method, path, body) =>
    h && h.cloud ? h.cloud.postMessage({ type: 'social', method, path, body }).catch(() => ({ error: 'offline' })) : Promise.resolve({ error: 'offline' });

  // ---------- links ----------
  // Each site: the hosts it answers on, the page address it takes from a name (`handle`) and how a page of it looks.
  // Anything else isn't a link here: a card never links somewhere these didn't make.
  const GH = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';
  const SITES = [
    { id: 'github', label: 'GitHub', glyph: GH, hosts: ['github.com'], handle: /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, page: (n) => `/${n}`, path: /^\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/?$/, hint: 'name or github.com/name' },
    { id: 'instagram', label: 'Instagram', glyph: 'IG', hosts: ['instagram.com'], handle: /^[A-Za-z0-9._]{1,30}$/, page: (n) => `/${n}`, path: /^\/([A-Za-z0-9._]{1,30})\/?$/, hint: 'name or instagram.com/name' },
    { id: 'linkedin', label: 'LinkedIn', glyph: 'in', hosts: ['linkedin.com'], handle: /^[A-Za-z0-9_-]{3,100}$/, page: (n) => `/in/${n}`, path: /^\/in\/([A-Za-z0-9_-]{3,100})\/?$/, hint: 'linkedin.com/in/name' },
    { id: 'x', label: 'X', glyph: 'X', hosts: ['x.com', 'twitter.com'], handle: /^[A-Za-z0-9_]{1,15}$/, page: (n) => `/${n}`, path: /^\/([A-Za-z0-9_]{1,15})\/?$/, hint: 'name or x.com/name' },
    { id: 'youtube', label: 'YouTube', glyph: '▶', hosts: ['youtube.com'], handle: /^@?[A-Za-z0-9._-]{3,30}$/, page: (n) => `/@${n.replace(/^@/, '')}`, path: /^\/(@[A-Za-z0-9._-]{3,30})\/?$/, hint: '@channel or youtube.com/@channel' },
    { id: 'website', label: 'Website', glyph: '⌂', hint: 'https://…' },
  ];
  const site = (id) => SITES.find((s) => s.id === id);
  const MAX_URL = 200;
  // The site's own host, as a page of it shows it (www. and m. too, LinkedIn's country ones as tr.), x.com for
  // twitter.com.
  const canonHost = (s, host) => {
    const bare = host.toLowerCase().replace(s.id === 'linkedin' ? /^(www|m|mobile|[a-z]{2})\./ : /^(www|m|mobile)\./, '');
    return s.hosts.includes(bare) ? s.hosts[0] : null;
  };

  // What was typed (a name, @name, an address with or without https://) as the page's full https address, '' for
  // nothing, null for something that isn't a page of that site.
  function normalize(id, raw) {
    const s = site(id);
    const v = String(raw ?? '').trim();
    if (!s || !v) return s ? '' : null;
    if (v.length > MAX_URL) return null;
    if (s.id === 'website') {
      let u;
      try {
        u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`);
      } catch {
        return null;
      }
      if (u.protocol !== 'https:' || u.username || u.password || !/\.[a-z]{2,}$/i.test(u.hostname)) return null;
      return u.href.length <= MAX_URL ? u.href : null;
    }
    const name = v.replace(/^@(?=.)/, s.id === 'youtube' ? '@' : '');
    if (s.handle.test(name) && !name.includes('/')) return `https://${s.hosts[0]}${s.page(name)}`;
    let u;
    try {
      u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    } catch {
      return null;
    }
    if (u.username || u.password || (u.port && u.port !== '443')) return null;
    const host = canonHost(s, u.hostname);
    const m = host && u.pathname.match(s.path);
    return m ? `https://${host}${s.page(m[1])}` : null;
  }

  // Someone's link as the card shows it: made again by normalize(), so a card only ever links to an address of these
  // sites as this page builds it, whatever the server sent.
  const safe = (id, url) => (typeof url === 'string' && site(id) ? normalize(id, url) || null : null);
  const shortText = (id, url) => {
    const u = new URL(url);
    return id === 'website' ? u.hostname.replace(/^www\./, '') : decodeURIComponent(u.pathname.replace(/^\/(in\/)?/, '').replace(/\/$/, ''));
  };

  // The row of links on a card: a plain link each, which the app opens in the browser (RadarView on the Mac,
  // will-navigate in Electron), never in the app.
  function links(u) {
    const L = u && u.links;
    if (!L || typeof L !== 'object') return '';
    const chips = SITES.map((s) => {
      const url = safe(s.id, L[s.id]);
      if (!url) return '';
      const text = shortText(s.id, url);
      return `<a class="pf-link pf-link-${s.id}" href="${esc(url)}" rel="noopener noreferrer" title="${esc(`${s.label} · ${url}`)}">` +
        `<i>${s.glyph}</i><span>${esc(text)}</span></a>`;
    }).join('');
    return chips ? `<div class="pf-links">${chips}</div>` : '';
  }

  // ---------- the big picture ----------
  // GitHub's pictures come in any size (?s=); ask for one the size it shows at. The server's own come as they are.
  function bigger(src) {
    try {
      const u = new URL(src);
      if (u.hostname === 'avatars.githubusercontent.com') {
        u.searchParams.set('s', '480');
        return u.href;
      }
    } catch {}
    return src;
  }

  let zoomEl = null;
  function zoom(img) {
    closeZoom();
    const card = img.closest('[style*="--rc"]');
    const rc = card ? getComputedStyle(card).getPropertyValue('--rc').trim() : '';
    zoomEl = document.createElement('div');
    zoomEl.className = 'pic-zoom';
    zoomEl.setAttribute('role', 'dialog');
    zoomEl.setAttribute('aria-label', 'Profile picture');
    if (rc) zoomEl.style.setProperty('--rc', rc);
    const big = document.createElement('img');
    big.alt = '';
    // The small one at once (it's in the cache), the big one over it once it's here.
    big.src = img.currentSrc || img.src;
    const want = bigger(big.src);
    if (want !== big.src) {
      const pre = new Image();
      pre.onload = () => zoomEl && (big.src = want);
      pre.src = want;
    }
    zoomEl.append(big);
    zoomEl.addEventListener('click', closeZoom);
    document.body.append(zoomEl);
    requestAnimationFrame(() => zoomEl && zoomEl.classList.add('on'));
  }
  function closeZoom() {
    if (!zoomEl) return;
    zoomEl.remove();
    zoomEl = null;
  }
  // The big pictures on cards and on your profile; the small ones in lists keep picking their row.
  const ZOOMS = 'img.pf-pic, img.me-pic';
  document.addEventListener('click', (e) => {
    const img = e.target.closest && e.target.closest(ZOOMS);
    if (!img || !img.src) return;
    e.preventDefault();
    e.stopPropagation();
    zoom(img);
  }, 'bad');
  document.addEventListener('keydown', (e) => {
    if (zoomEl && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeZoom();
    }
  }, 'bad');

  // ---------- Settings → PROFILE ----------
  let host = null;
  let busy = false;
  let msg = { text: '', kind: '' }; // kind: ok, bad or wait (hk-status's ✓, ✕ and dots)
  let draft = null; // what's typed and not saved yet, by site
  const A = () => window.Account?.state();
  const takes = () => {
    const a = A();
    return !!(a && a.signedIn && a.methods && a.methods.profile);
  };
  const ERRORS = {
    bad_link: "one of the links isn't a page of that site",
    too_large: 'that picture is too big',
    bad_image: "that file isn't a picture",
    offline: "can't reach the server",
  };
  const errText = (e) => ERRORS[e] || String(e || 'something went wrong');

  function render() {
    if (!host || !host.isConnected) return;
    // The heading over it (cloud.js's .prof-h) shows with it.
    const head = host.previousElementSibling && host.previousElementSibling.classList.contains('prof-h') ? host.previousElementSibling : null;
    host.hidden = !takes();
    if (head) head.hidden = host.hidden;
    if (host.hidden) return;
    const a = A();
    const saved = (a.links && typeof a.links === 'object') ? a.links : {};
    if (!draft) draft = Object.fromEntries(SITES.map((s) => [s.id, saved[s.id] || '']));
    const pic = a.avatar ? `<img class="prof-pic" alt="" src="${esc(a.avatar)}">` : '<span class="prof-pic none">?</span>';
    const rows = SITES.map((s) => {
      const v = draft[s.id] || '';
      const bad = v && normalize(s.id, v) === null;
      return `<label class="hk-field prof-link${bad ? ' bad' : ''}"><span class="hk-prompt prof-glyph" title="${esc(s.label)}">${s.glyph}</span>` +
        `<input data-site="${s.id}" maxlength="${MAX_URL}" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="${esc(`${s.label} · ${s.hint}`)}" value="${esc(v)}"></label>`;
    }).join('');
    host.innerHTML =
      `<div class="prof-picrow">${pic}<span class="prof-picwhy">Your picture on your card, the leaderboard and your friends' lists.` +
      `<small>${a.avatarCustom ? 'your own picture' : a.github ? "GitHub's picture" : 'no picture yet'} · PNG, JPEG, WebP or GIF, cropped square</small></span>` +
      `<span class="prof-picbtns"><button type="button" class="mn-btn go" data-prof="pick"${busy ? ' disabled' : ''}>change picture…</button>` +
      (a.avatarCustom ? `<button type="button" class="mn-btn" data-prof="unpick"${busy ? ' disabled' : ''}>${a.github ? "use GitHub's" : 'remove'}</button>` : '') +
      '</span><input class="prof-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></div>' +
      `<div class="prof-links">${rows}</div>` +
      `<div class="prof-end"><p class="hk-status ${msg.text ? msg.kind : ''}">${esc(msg.text)}</p>` +
      `<button type="button" class="mn-btn go" data-prof="save"${busy ? ' disabled' : ''}>save links</button></div>`;
  }

  function status(text, kind = 'ok') {
    msg = { text, kind };
    const p = host && host.querySelector('.prof-end .hk-status');
    if (!p) return render();
    p.textContent = text;
    p.className = `hk-status ${text ? kind : ''}`;
  }

  async function saveLinks() {
    const out = {};
    for (const s of SITES) {
      const n = normalize(s.id, draft[s.id]);
      if (n === null) return status(`that ${s.label} link isn't a page of ${s.id === 'website' ? 'a site (https only)' : s.label}`, 'bad');
      if (n) out[s.id] = n;
    }
    busy = true;
    status('saving', 'wait');
    const r = await api('PUT', 'v1/me/profile', { links: out });
    busy = false;
    if (!r || r.error) {
      render();
      return status(errText(r?.error), 'bad');
    }
    draft = null;
    msg = { text: 'links saved · your card shows them', kind: 'ok' };
    await window.Account?.load();
    render();
  }

  // The picture cropped to its middle square and sent at 512×512, small enough for the API to take as it is (a GIF's
  // first frame: a picture moving on every card is too much).
  const SIZE = 512;
  const MAX_FILE = 15 * 1024 * 1024;
  async function square(file) {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('bad_image');
    if (file.size > MAX_FILE) throw new Error('too_large');
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, no) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => no(new Error('bad_image'));
        i.src = url;
      });
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      if (!side) throw new Error('bad_image');
      const c = document.createElement('canvas');
      c.width = c.height = Math.min(SIZE, side);
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, c.width, c.height);
      for (const q of [0.88, 0.78, 0.65]) {
        const data = c.toDataURL('image/jpeg', q);
        if (data.length * 0.75 <= 300 * 1024) return data;
      }
      throw new Error('too_large');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function setPicture(file) {
    let image;
    try {
      image = await square(file);
    } catch (e) {
      return status(errText(e.message), 'bad');
    }
    busy = true;
    status('uploading your picture', 'wait');
    const r = await api('PUT', 'v1/me/avatar', { image });
    busy = false;
    if (!r || r.error) {
      render();
      return status(errText(r?.error), 'bad');
    }
    msg = { text: 'picture changed · friends see it on their next refresh', kind: 'ok' };
    await window.Account?.load();
    render();
  }

  async function unsetPicture() {
    busy = true;
    status('a moment', 'wait');
    const r = await api('DELETE', 'v1/me/avatar');
    busy = false;
    if (!r || r.error) {
      render();
      return status(errText(r?.error), 'bad');
    }
    msg = { text: A()?.github ? "GitHub's picture again" : 'picture removed', kind: 'ok' };
    await window.Account?.load();
    render();
  }

  function onClick(e) {
    const b = e.target.closest('[data-prof]');
    if (!b || busy) return;
    const act = b.dataset.prof;
    if (act === 'pick') host.querySelector('.prof-file').click();
    if (act === 'unpick') unsetPicture();
    if (act === 'save') saveLinks();
  }
  function onInput(e) {
    const i = e.target.closest('input[data-site]');
    if (!i || !draft) return;
    draft[i.dataset.site] = i.value;
    i.closest('.prof-link').classList.toggle('bad', !!i.value.trim() && normalize(i.dataset.site, i.value) === null);
  }
  function onChange(e) {
    const f = e.target.closest('.prof-file');
    if (!f || !f.files || !f.files[0]) return;
    const file = f.files[0];
    f.value = '';
    setPicture(file);
  }
  function onKey(e) {
    if (e.key === 'Enter' && e.target.closest('input[data-site]')) saveLinks();
  }

  // cloud.js's Settings page gives the section while the menu is open; account.js says when the account changed.
  function mount(el) {
    host = el;
    draft = null;
    msg = { text: '', kind: '' };
    if (!host) return;
    host.addEventListener('click', onClick);
    host.addEventListener('input', onInput);
    host.addEventListener('change', onChange);
    host.addEventListener('keydown', onKey);
    render();
  }
  // Not while a link is being typed: drawing the section again would take the cursor out of it.
  window.addEventListener('account', () => {
    if (busy || (host && host.contains(document.activeElement) && document.activeElement.matches('input[data-site]'))) return;
    render();
  });

  return { mount, links, normalize, zoom };
})();
