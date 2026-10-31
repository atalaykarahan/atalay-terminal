'use strict';

// Messages, like instant-message windows popping up on a HUD. Two parts:
//  · notices: a new message, friend request or new friend pops up at the screen's bottom-right corner for a while,
//    with a quick reply or accept/decline; clicking it opens the chat. Closed, it's gone. A friend coming online
//    shows there for a moment too, like on Steam, and so does a new version of the app (a click shows what's new).
//    Your own progress shows there as well: the daily bonus as a strip, a new level or rank as a takeover of the whole
//    screen for a few seconds.
//  · chat: the conversation in its own window, opened mid-screen the first time and dragged anywhere by its header.
// In the app each part is its own panel (Swift injects __MESSAGES_ROLE__ "notices" or "chat", places and moves the
// panels), and every friend's chat has a panel of its own (__MESSAGES_FRIEND__), so several stay on screen side by
// side; in staging both live in the dashboard page, with one chat window that switches between friends.
window.Messages = (() => {
  const APP_ROLE = window.__MESSAGES_ROLE__;
  const FRIEND = window.__MESSAGES_FRIEND__ || null; // the one friend an app chat panel is for
  // The app's dashboard leaves messages to the panels.
  if (window.__RADAR_APP__ && !APP_ROLE) return null;
  const ROLE = APP_ROLE || 'both';
  const NOTICES = ROLE !== 'chat', CHAT = ROLE !== 'notices';
  const native = APP_ROLE && window.webkit.messageHandlers.messages;
  const post = (msg) => native && native.postMessage(msg);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const time = (at) => new Date(at).toTimeString().slice(0, 5);
  // A friend's level shows next to their name (from the friends list; live events carry only the name).
  const who = (p) => {
    if (!p) return '';
    const xp = p.xp || Social.friend(p.id)?.xp;
    return `${Social.dot(p.presence)}<span>${esc(Social.handle(p))}</span>${xp ? Xp.badge(xp.level) : ''}`;
  };
  const PEEK_MS = 12_000;
  const ONLINE_MS = 6000; // "is now online" goes sooner
  // A friend back after less than this offline (a dropped connection, a short sleep) isn't news.
  const BACK_MS = 60_000;
  const offlineAt = new Map(); // friend id -> when they went offline

  const mount = (id) => {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
    return el;
  };
  const inputHTML = (placeholder, label) =>
    `<div class="mb-input"><span class="pr">$</span><textarea rows="1" maxlength="2000" spellcheck="false" placeholder="${esc(placeholder)}"></textarea>` +
    `<button class="send" data-act="send" disabled>${label}</button></div>`;
  function grow(ta) {
    ta.style.height = '20px';
    ta.style.height = Math.min(84, ta.scrollHeight) + 'px';
    const btn = ta.parentElement.querySelector('.send');
    if (btn) btn.disabled = !ta.value.trim() || ta.disabled;
  }

  // Friends whose chat window is open: no pop-ups for them, their chat shows their messages.
  let showing = new Set();

  // ======================= notices =======================
  const notes = NOTICES ? mount('msgbox') : null;
  let peek = null;
  let peekTimer = 0;
  const queue = []; // notices waiting for the one on screen (an update, the daily bonus)

  function sizeNotes() {
    if (ROLE !== 'notices') return;
    const box = notes.firstElementChild;
    // Layout size, not the on-screen one: the slide-in animation scales the box while it starts. The level-up takeover
    // has the whole screen (a notice can wait under it).
    if (takeover) return post({ type: 'layout', w: 1, h: 1, place: 'screen' });
    post(box ? { type: 'layout', w: box.offsetWidth + 16, h: box.offsetHeight + 16, place: 'corner' } : { type: 'layout', w: 0, h: 0 });
  }

  function showPeek(p) {
    clearTimeout(peekTimer);
    const again = !!peek;
    peek = p;
    notes.innerHTML = peekHTML(p);
    if (again) notes.firstElementChild.classList.remove('in');
    sizeNotes();
    if (p.kind === 'xp' && !p.heard) {
      p.heard = true;
      Sfx.play('xp');
    }
    peekTimer = setTimeout(hidePeek, p.kind === 'online' || p.kind === 'xp' ? ONLINE_MS : PEEK_MS);
  }

  function hidePeek() {
    clearTimeout(peekTimer);
    peek = null;
    const box = notes && notes.firstElementChild;
    if (!box) return sizeNotes();
    box.classList.add('out');
    post({ type: 'leaving' });
    setTimeout(() => {
      if (peek) return;
      notes.innerHTML = '';
      sizeNotes();
      if (queue.length && !takeover) showPeek(queue.shift());
    }, 190);
  }

  function peekHTML(p) {
    const head = (tag, person, at) =>
      `<div class="mb-head"><span class="mb-tag">${tag}</span><span class="mb-who">${who(person)}</span>` +
      `<span class="mb-time">${at ? time(at) : ''}</span><button class="mb-x" data-act="close" title="Close">×</button></div>`;
    let body;
    if (p.kind === 'message') {
      body = head('INCOMING', p.from, p.at) + `<div class="mb-text" data-act="open" title="Open the chat">${esc(p.body)}</div>` + inputHTML('reply…', '⏎');
    } else if (p.kind === 'request') {
      body =
        head('FRIEND REQUEST', p.request.from, p.request.at) +
        `<div class="mb-text"><em>${esc(Social.handle(p.request.from))}</em> wants to be your friend</div>` +
        `<div class="mb-actions"><button class="go" data-act="accept">accept</button><button data-act="decline">decline</button></div>`;
    } else if (p.kind === 'update') {
      return (
        `<div class="mb peek update in" data-act="update" title="See what's new"><div class="mb-border"></div>` +
        `<div class="mb-head"><span class="mb-tag">UPDATE</span><span class="mb-who"><span>Version ${esc(p.version)} is out</span>` +
        `<small>see what's new ›</small></span></div></div>`
      );
    } else if (p.kind === 'xp') {
      return (
        `<div class="mb peek xp in" data-act="profile" title="See your profile"><div class="mb-border"></div>` +
        `<div class="mb-head"><span class="mb-tag">+${p.gained} XP</span><span class="mb-who"><span>Daily bonus</span>` +
        `<small>welcome back${p.level ? ` · level ${p.level}` : ''}</small></span></div></div>`
      );
    } else if (p.kind === 'online') {
      // One thin strip, no buttons: a click opens the chat. Friends coming online together share it.
      const more = p.friends.length - 1;
      return (
        `<div class="mb peek online in" data-act="open" title="Open the chat"><div class="mb-border"></div>` +
        `<div class="mb-head"><span class="mb-tag">ONLINE</span><span class="mb-who">${who(p.friends[more])}` +
        `<small>${more ? `and ${more} more are` : 'is'} now online</small></span></div></div>`
      );
    } else {
      body =
        head('NEW FRIEND', p.friend, null) +
        `<div class="mb-text"><em>${esc(Social.handle(p.friend))}</em> accepted your request</div>` +
        `<div class="mb-actions"><button class="go" data-act="open">say hi</button><button data-act="close">later</button></div>`;
    }
    return `<div class="mb peek in"><div class="mb-border"></div>${body}</div>`;
  }

  const peekFriend = () => {
    if (!peek) return null;
    if (peek.kind === 'message') return peek.from && peek.from.id;
    if (peek.kind === 'friend') return peek.friend.id;
    if (peek.kind === 'online') return peek.friends[peek.friends.length - 1].id;
    return null;
  };

  if (NOTICES) {
    notes.addEventListener('click', async (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || !peek) return;
      const act = el.dataset.act;
      if (act === 'close') return hidePeek();
      if (act === 'update') {
        hidePeek();
        // The dashboard shows what's new (in the app, Swift brings its window to the front).
        return APP_ROLE ? post({ type: 'openUpdate' }) : window.Cloud?.openUpdate();
      }
      if (act === 'profile') {
        hidePeek();
        return APP_ROLE ? post({ type: 'openProfile' }) : window.Cloud?.openMenu('profile');
      }
      if (act === 'open') {
        const id = peekFriend();
        hidePeek();
        return id && Social.openChat(id);
      }
      if (act === 'send') return replyFromPeek(notes.querySelector('textarea'));
      if (act === 'accept' || act === 'decline') {
        const id = peek.request.id;
        el.disabled = true;
        const r = act === 'accept' ? await Social.accept(id) : await Social.dismiss(id);
        if (r.error) return void (el.disabled = false);
        Sfx.play(act === 'accept' ? 'accept' : 'decline');
        hidePeek();
        if (act === 'accept') Social.openChat(r.friend.id);
      }
    });
    notes.addEventListener('input', (e) => e.target.matches('textarea') && grow(e.target));
    notes.addEventListener('keydown', (e) => {
      if (!e.target.matches('textarea')) return;
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        replyFromPeek(e.target);
      }
    });
  }

  // A quick reply goes out from here; the conversation then opens in the chat window.
  async function replyFromPeek(ta) {
    const to = peekFriend();
    const text = ta && ta.value.trim();
    if (!to || !text) return;
    ta.value = '';
    hidePeek();
    Sfx.play('send');
    const r = await Social.send(to, text);
    if (r.error) say(r.error === 'offline' ? "not sent · you're offline" : "not sent · you're not friends anymore");
    Social.openChat(to);
  }

  // A new version of the app (from Swift in the app, from the dashboard's state in staging): after whatever is on
  // screen, and not on do-not-disturb.
  function updateNotice(u) {
    if (!NOTICES || !u || Social.dnd()) return;
    const p = { kind: 'update', version: u.version };
    if (takeover || (peek && peek.kind !== 'update')) queue.push(p);
    else showPeek(p);
  }

  // ======================= your progress =======================
  // Yours alone, like in an MMO: the daily bonus slides in as a strip. A new level or rank takes the whole screen over,
  // as if the app were hacked: the screen glitches, a console types the breach, LEVEL UP decrypts across it and
  // confetti rains from the top. Keys do nothing for the first moments (in the app, clicks neither); then any key or
  // click ends it, else it stays long enough to read everything on it: 3 s plus 60 ms a character, at most 10 s
  // (reading-time rules for notices, e.g. WebAIM's 3 s + 60 ms, Dynatrace's 50 ms a character). Friends aren't told;
  // they see the new level on your profile. It plays only while the app is in front and not on do not disturb: a level
  // gained while you look elsewhere waits until you're back.
  let seenLevel = 0; // the level last seen, so a level-up shows once (and never for the level you start with)
  try {
    seenLevel = Number(localStorage.getItem('xpLevel')) || 0;
  } catch {}
  // In front: the app tells (focus), staging asks the page.
  let focused = !APP_ROLE && document.hasFocus() && !document.hidden;
  let pending = null; // the level-up waiting to play: the highest level, the one before, whether a rank changed
  let takeover = null; // the one on screen

  function progress(ev) {
    if (!NOTICES) return;
    const x = ev.xp;
    if (x && x.level) {
      if (seenLevel && x.level > seenLevel) {
        const from = pending ? pending.from : seenLevel;
        pending = { level: x.level, from, rankUp: Xp.rank(x.level).name !== Xp.rank(from).name };
        play();
      }
      if (x.level !== seenLevel) {
        seenLevel = x.level;
        try {
          localStorage.setItem('xpLevel', String(seenLevel));
        } catch {}
      }
    }
    if (ev.reason === 'daily' && ev.gained > 0 && !Social.dnd()) {
      const p = { kind: 'xp', gained: ev.gained, level: x ? x.level : 0 };
      if (takeover || (peek && peek.kind !== 'online')) queue.push(p);
      else showPeek(p);
    }
  }

  function setFocus(on) {
    focused = !!on;
    if (focused) setTimeout(play, 350);
  }

  function play() {
    if (!pending || takeover || !focused || Social.dnd()) return;
    const c = pending;
    pending = null;
    takeover = showTakeover(c);
    // Only now, with the takeover set, does the panel ask for the whole screen (in the app).
    sizeNotes();
  }

  // Keys do nothing while it plays: in the app Swift drops them (never longer than 4 s), here the page does.
  const swallow = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  // After the lock a key ends the takeover (here; in the app Swift catches the key and calls skip).
  const skipKey = (e) => {
    swallow(e);
    if (e.type === 'keydown') skip();
  };
  function lockKeys(ms) {
    if (APP_ROLE) return post({ type: 'lock', ms });
    for (const t of ['keydown', 'keypress', 'keyup']) addEventListener(t, swallow, true);
  }
  function unlockKeys() {
    if (APP_ROLE) return post({ type: 'lock', ms: 0 });
    for (const t of ['keydown', 'keypress', 'keyup']) {
      removeEventListener(t, swallow, true);
      if (takeover) addEventListener(t, skipKey, true);
    }
  }
  function freeKeys() {
    if (!APP_ROLE) for (const t of ['keydown', 'keypress', 'keyup']) removeEventListener(t, swallow, true), removeEventListener(t, skipKey, true);
  }

  // A key or a click once the lock is over: out now instead of waiting.
  function skip() {
    if (takeover && takeover.free) takeover.out();
  }

  const GLYPHS = '!<>-_\\/[]{}=+*^?#$%&@01ABCDEFXZ';
  // The glitch and the confetti in the app's warm colours (orange, light orange, amber, red, white).
  const BAR_COLORS = ['248, 128, 8', '255, 176, 87', '255, 210, 63', '255, 77, 77', '255, 255, 255'];

  function showTakeover(c) {
    const r = Xp.rank(c.level);
    const word = c.rankUp ? 'RANK UP' : 'LEVEL UP';
    const article = /^[AEIOU]/.test(r.name) ? 'AN' : 'A';
    const sub = c.rankUp ? `YOU ARE NOW ${article} ${r.name.toUpperCase()}` : `LEVEL ${c.level}`;
    const lv = c.rankUp ? `LEVEL ${c.level}` : r.name.toUpperCase();
    const me = Social.state()?.me;
    const lines = [
      '[!] INTRUSION DETECTED',
      `> operator ${me ? Social.handle(me).toLowerCase() : 'unknown'}`,
      '> injecting experience ......... OK',
      c.rankUp ? `> rank ${Xp.rank(c.from).name.toUpperCase()} → ${r.name.toUpperCase()} .... OK` : `> level ${c.from} → ${c.level} .................. OK`,
      '> ACCESS GRANTED',
    ];
    // Time to read it all once it's on screen: every character but the dot leaders.
    const chars = [word, sub, lv, ...lines].join('').replace(/\.{2,}/g, '').length;
    const readMs = Math.min(10_000, 3000 + 60 * chars);
    const lockMs = c.rankUp ? 3500 : 2500;
    const timers = [];
    const at = (ms, f) => timers.push(setTimeout(f, ms));
    const bars = Array.from({ length: 14 }, () => {
      const color = Math.random() < 0.4 ? r.color : BAR_COLORS[(Math.random() * BAR_COLORS.length) | 0];
      return `<i style="--l:${(Math.random() * 70 - 10).toFixed(1)}vw;--t:${(Math.random() * 100).toFixed(1)}vh;--w:${(30 + Math.random() * 80).toFixed(1)}vw;` +
        `--h:${(0.3 + Math.random() * 5).toFixed(2)}vh;--c:rgb(${color})"></i>`;
    }).join('');
    const el = document.createElement('div');
    el.id = 'takeover';
    el.className = `tk ${c.rankUp ? 'rank' : 'level'} glitch`;
    el.style.setProperty('--rc', r.color);
    el.innerHTML =
      `<div class="tk-veil"></div><div class="tk-noise"></div><canvas class="tk-confetti"></canvas><div class="tk-bars">${bars}</div>` +
      '<pre class="tk-log"></pre><div class="tk-center">' +
      (c.rankUp ? Xp.headband(c.level, 'tk-band') : '') +
      '<div class="tk-title" data-text=""><span></span></div>' +
      `<div class="tk-sub">${c.rankUp ? `YOU ARE NOW ${article} <b>${esc(r.name.toUpperCase())}</b>` : `LEVEL <b>${c.level}</b>`}</div>` +
      `<div class="tk-lv">${esc(lv)}</div></div><div class="tk-hint">press any key to continue</div><div class="tk-scan"></div>`;
    document.body.appendChild(el);
    const t = { el, timers, free: false, stop: () => {} };
    lockKeys(lockMs);
    Sfx.play('glitch');

    // The breach, typed line by line at the top left.
    const log = el.querySelector('.tk-log');
    const shown = lines.map((l, i) => (i === 0 ? `<span class="warn">${esc(l)}</span>` : esc(l)));
    shown.forEach((_, i) => at(90 + i * 120, () => (log.innerHTML = shown.slice(0, i + 1).join('\n') + '<i></i>')));

    // Out: it glitches away, then it's gone (a key or a click after the lock brings this forward).
    let leaving = false;
    t.out = () => {
      if (leaving) return;
      leaving = true;
      timers.forEach(clearTimeout);
      el.classList.add('out');
      at(500, () => endTakeover(t));
    };

    // LEVEL UP decrypts from noise and lands; from then on it stays for the reading time.
    const title = el.querySelector('.tk-title');
    const span = title.firstElementChild;
    const t0 = performance.now() + 380;
    const decrypt = () => {
      const p = Math.max(0, Math.min(1, (performance.now() - t0) / 560));
      const fixed = Math.floor(p * word.length);
      const text = [...word].map((ch, i) => (i < fixed || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      span.textContent = text;
      title.dataset.text = text;
      if (p < 1) return at(40, decrypt);
      title.classList.add('on');
      el.classList.remove('glitch');
      Sfx.play(c.rankUp ? 'rankup' : 'levelup');
      el.querySelector('.tk-band')?.classList.add('on');
      at(160, () => el.querySelector('.tk-sub').classList.add('on'));
      at(300, () => el.querySelector('.tk-lv').classList.add('on'));
      // An aftershock halfway through, then out once it could be read.
      at(readMs / 2, () => el.classList.add('glitch'));
      at(readMs / 2 + 130, () => el.classList.remove('glitch'));
      at(readMs, t.out);
    };
    at(260, decrypt);
    at(900, () => (t.stop = confetti(el.querySelector('.tk-confetti'), r.color)));
    // The lock ends: keys and clicks are back, and any of them ends it.
    at(lockMs, () => {
      t.free = true;
      el.classList.add('free');
      unlockKeys();
    });
    el.addEventListener('mousedown', () => skip());
    return t;
  }

  function endTakeover(t) {
    t.timers.forEach(clearTimeout);
    t.stop();
    t.el.remove();
    unlockKeys();
    freeKeys();
    takeover = null;
    sizeNotes();
    // Another level-up waiting plays first; notices (the daily bonus) come after the last one.
    if (queue.length && !peek && !pending) showPeek(queue.shift());
    setTimeout(play, 600);
  }

  // Confetti raining from the top of the screen, in the rank's colour and the app's: a few waves, then it falls out
  // until the takeover ends (stop).
  function confetti(canvas, rc) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const g = canvas.getContext('2d');
    const colors = [`rgb(${rc})`, `rgb(${rc})`, '#f88008', '#ffb057', '#ffd23f', '#ffffff', '#ff4d4d'];
    const bits = [];
    const spawn = (n) => {
      for (let i = 0; i < n; i++) {
        bits.push({
          x: Math.random() * innerWidth * dpr, y: -(10 + Math.random() * innerHeight * 0.3) * dpr,
          vx: (Math.random() - 0.5) * 2.2 * dpr, vy: (2 + Math.random() * 3) * dpr,
          w: (5 + Math.random() * 6) * dpr, h: (8 + Math.random() * 9) * dpr,
          a: Math.random() * 6.28, va: (Math.random() - 0.5) * 0.3, sway: Math.random() * 6.28,
          c: colors[(Math.random() * colors.length) | 0],
        });
      }
    };
    const waves = [[0, 8], [600, 12], [1700, 16], [3000, 22]]; // when, and one piece per this many pixels of width
    const start = performance.now();
    let last = start, wave = 0, raf = 0;
    const frame = (now) => {
      // The app's panel grows to the whole screen just as this starts: follow its size.
      if (canvas.width !== Math.round(innerWidth * dpr) || canvas.height !== Math.round(innerHeight * dpr)) {
        canvas.width = Math.round(innerWidth * dpr);
        canvas.height = Math.round(innerHeight * dpr);
      }
      const dt = Math.min(3, (now - last) / 16.7);
      last = now;
      while (wave < waves.length && now - start >= waves[wave][0]) spawn(Math.round(innerWidth / waves[wave++][1]));
      g.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.vy = Math.min(b.vy + 0.05 * dpr * dt, 7 * dpr);
        b.sway += 0.08 * dt;
        b.x += (b.vx + Math.sin(b.sway) * 0.9 * dpr) * dt;
        b.y += b.vy * dt;
        b.a += b.va * dt;
        if (b.y > canvas.height + 20 * dpr) {
          bits.splice(i, 1);
          continue;
        }
        g.save();
        g.translate(b.x, b.y);
        g.rotate(b.a);
        g.fillStyle = b.c;
        g.fillRect(-b.w / 2, -b.h / 2, b.w, Math.max(1, b.h * Math.abs(Math.cos(b.a * 1.7))));
        g.restore();
      }
      if (bits.length || wave < waves.length) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }

  if (NOTICES && !APP_ROLE) {
    addEventListener('focus', () => setFocus(!document.hidden));
    addEventListener('blur', () => setFocus(false));
    document.addEventListener('visibilitychange', () => setFocus(!document.hidden && document.hasFocus()));
  }

  function say(msg) {
    if (typeof window.toast === 'function') return window.toast(msg);
    post({ type: 'log', msg });
  }

  function notice(ev) {
    switch (ev.type) {
      case 'message':
        if (ev.message.mine || showing.has(ev.with)) return;
        Sfx.play('message');
        if (!Social.dnd()) showPeek({ kind: 'message', from: ev.from || Social.friend(ev.with), body: ev.message.body, at: ev.message.at });
        return;
      case 'request':
        Sfx.play('request');
        if (!Social.dnd()) showPeek({ kind: 'request', request: ev.request });
        return;
      case 'friend':
        if (!ev.accepted) return;
        Sfx.play('friend');
        if (!Social.dnd()) showPeek({ kind: 'friend', friend: ev.friend });
        return;
      case 'request_gone':
        if (peek && peek.kind === 'request' && peek.request.id === ev.id) hidePeek();
        return;
      case 'xp':
        return progress(ev);
      case 'status':
        // Do not disturb ended: a level-up it held plays now.
        if (ev.status !== 'dnd') play();
        return;
      case 'presence': {
        if (ev.presence === 'offline') return void offlineAt.set(ev.id, Date.now());
        // Only offline -> online counts, not away/busy changes; and not while their chat is open, or over a message
        // or request on screen.
        const f = Social.friend(ev.id);
        if (!f || ev.was !== 'offline' || Date.now() - (offlineAt.get(ev.id) || 0) < BACK_MS || showing.has(ev.id)) return;
        if (peek && peek.kind !== 'online') return;
        Sfx.play('online');
        if (Social.dnd()) return;
        const others = peek ? peek.friends.filter((x) => x.id !== f.id) : [];
        showPeek({ kind: 'online', friends: [...others, f], at: Date.now() });
        return;
      }
    }
  }

  // ======================= chat window =======================
  const win = CHAT ? mount('chatwin') : null;
  const q = (sel) => win.querySelector(sel);
  let current = null;
  let isOpen = false;
  let pendingSeq = 0;
  const convs = new Map(); // friend id -> { list, more, loaded, loading, name }
  const conv = (id) => {
    if (!convs.has(id)) convs.set(id, { list: [], more: false, loaded: false, loading: null, name: '' });
    return convs.get(id);
  };

  function tellShowing() {
    const id = isOpen ? current : null;
    if (ROLE === 'chat') post({ type: 'showing', id });
    else showing = new Set(id ? [id] : []);
  }

  function sizeChat(focus) {
    if (ROLE !== 'chat') return;
    const box = win.firstElementChild;
    post(box ? { type: 'layout', w: box.offsetWidth + 16, h: box.offsetHeight + 16, focus: !!focus } : { type: 'layout', w: 0, h: 0 });
  }

  function frameHTML() {
    return `<div class="mb open chat in"><div class="mb-border"></div>` +
      `<div class="mb-head" title="Drag to move"><span class="mb-tag">CHAT</span><span class="mb-who"></span><span class="mb-time mb-sub"></span>` +
      `<button class="mb-x" data-act="close" title="Close (esc)">×</button></div>` +
      `<div class="mb-switch"></div><div class="mb-list"></div><div class="mb-gone" hidden>you're not friends anymore · messages won't be delivered</div>` +
      `${inputHTML('message…', 'send')}</div>`;
  }

  async function open(id) {
    // An app chat panel holds one friend; another friend's chat opens in a panel of its own, next to this one.
    if (FRIEND && id && id !== FRIEND) return post({ type: 'openChat', id });
    // A panel opened just now may not have the friends list yet.
    if (!Social.state()) await Social.load();
    const s = Social.state();
    id = id || FRIEND || current || (s && (s.friends.find((f) => f.unread) || s.friends[0])?.id);
    if (!id || !Social.friend(id)) return;
    const fresh = !isOpen;
    current = id;
    isOpen = true;
    if (fresh || !q('.mb.open')) {
      win.innerHTML = frameHTML();
      if (ROLE === 'both') centerOnce();
    } else win.firstElementChild.classList.remove('in');
    paint(true);
    tellShowing();
    sizeChat(true);
    await load(id);
    if (!isOpen || current !== id) return;
    paintList(true);
    if (Social.friend(id)?.unread) Social.read(id);
    const ta = q('.mb-input textarea');
    if (ta && !ta.disabled) setTimeout(() => ta.focus(), 30);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    tellShowing();
    const box = win.firstElementChild;
    if (!box) return sizeChat();
    box.classList.add('out');
    post({ type: 'leaving' });
    setTimeout(() => {
      if (isOpen) return;
      win.innerHTML = '';
      sizeChat();
    }, 190);
  }

  function paint(stick) {
    if (!isOpen) return;
    const f = Social.friend(current);
    const c = conv(current);
    if (f) c.name = Social.handle(f);
    q('.mb-who').innerHTML = f ? who(f) : `<span>${esc(c.name)}</span>`;
    q('.mb-time').textContent = f ? Social.PRESENCE[f.presence || 'offline'].label : '';
    // Removed from friends: the conversation stays on screen, but nothing more goes out.
    q('.mb-gone').hidden = !!f;
    const ta = q('.mb-input textarea');
    ta.disabled = !f;
    ta.placeholder = f ? `message ${f.name}…` : 'not friends anymore';
    grow(ta);
    // Other conversations with unread messages, one click away.
    const others = (Social.state()?.friends || []).filter((x) => x.id !== current && x.unread);
    q('.mb-switch').innerHTML = others
      .map((x) => `<button data-act="switch" data-id="${esc(x.id)}">${Social.dot(x.presence)}${esc(x.name)} <i class="cnt hot">${x.unread}</i></button>`)
      .join('');
    paintList(stick);
  }

  function paintList(stick) {
    const list = q('.mb-list');
    if (!list) return;
    const c = conv(current);
    const near = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
    let html = c.more ? '<button class="mb-more" data-act="more">earlier messages</button>' : '';
    if (c.loaded && !c.list.length) html += `<div class="mb-empty">no messages yet · say hi to ${esc(Social.friend(current)?.name || '')}</div>`;
    let day = '';
    for (const m of c.list) {
      const d = new Date(m.at).toDateString();
      if (d !== day) {
        day = d;
        const today = new Date().toDateString(), yesterday = new Date(Date.now() - 864e5).toDateString();
        const label = d === today ? 'TODAY' : d === yesterday ? 'YESTERDAY' : new Date(m.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
        html += `<div class="mb-day">${label}</div>`;
      }
      const state = m.state === 'failed' ? ' failed' : m.state === 'sending' ? ' sending' : '';
      const note =
        m.state === 'failed'
          ? m.error === 'not_friends' ? "not delivered · you're not friends" : 'not sent · click to retry'
          : m.state === 'sending' ? 'sending…' : time(m.at);
      const retry = m.state === 'failed' && m.error !== 'not_friends';
      html += `<div class="mb-msg${m.mine ? ' mine' : ''}${state}"${retry ? ` data-act="retry" data-id="${m.id}"` : ''}>` +
        `<div class="b">${esc(m.body)}</div><div class="t">${note}</div></div>`;
    }
    list.innerHTML = html;
    if (stick || near) list.scrollTop = list.scrollHeight;
  }

  async function load(id) {
    const c = conv(id);
    if (c.loaded) return;
    c.loading = c.loading || Social.history(id);
    const r = await c.loading;
    c.loading = null;
    if (r.error) return;
    const pending = c.list.filter((m) => m.state);
    c.list = [...r.messages, ...pending.filter((p) => !r.messages.some((m) => m.id === p.id))];
    c.more = r.more;
    c.loaded = true;
  }

  async function loadMore() {
    const c = conv(current);
    const first = c.list.find((m) => typeof m.id === 'number');
    if (!first) return;
    const list = q('.mb-list');
    const from = list.scrollHeight - list.scrollTop;
    const r = await Social.history(current, first.id);
    if (r.error) return;
    c.list = [...r.messages, ...c.list];
    c.more = r.more;
    paintList();
    list.scrollTop = list.scrollHeight - from;
  }

  function send(ta) {
    const text = ta && ta.value.trim();
    if (!text || !current || ta.disabled) return;
    ta.value = '';
    grow(ta);
    const temp = { id: `p${++pendingSeq}`, mine: true, body: text, at: new Date().toISOString(), state: 'sending' };
    conv(current).list.push(temp);
    paintList(true);
    Sfx.play('send');
    deliver(temp, current);
  }

  async function deliver(temp, to) {
    temp.state = 'sending';
    const r = await Social.send(to, temp.body);
    const c = conv(to);
    if (r.error) {
      temp.state = 'failed';
      temp.error = r.error;
    } else {
      // The live echo of this message may already be in the list; keep one.
      c.list = c.list.filter((m) => m === temp || m.id !== r.message.id);
      Object.assign(temp, r.message, { state: null });
    }
    if (isOpen && current === to) paintList(true);
  }

  // Messages that failed while offline go out again once the line is back.
  function retryFailed() {
    for (const [id, c] of convs) for (const m of c.list) if (m.state === 'failed' && m.error === 'offline') deliver(m, id);
  }

  function chatEvent(ev) {
    switch (ev.type) {
      case 'message': {
        const c = convs.get(ev.with);
        if (c && c.loaded && !c.list.some((m) => m.id === ev.message.id)) {
          // My own message echoed back while its send is still in flight: the send fills it in.
          const inFlight = ev.message.mine && c.list.some((m) => m.state === 'sending' && m.body === ev.message.body);
          if (!inFlight) c.list.push(ev.message);
        }
        if (!isOpen) return;
        if (current === ev.with) {
          paintList();
          if (!ev.message.mine) {
            Sfx.play('message');
            Social.read(ev.with);
          }
        } else paint();
        return;
      }
      case 'hello':
        retryFailed();
        // Back from a drop: anything missed is in a fresh copy of the conversation.
        if (isOpen && current && Social.friend(current)) {
          conv(current).loaded = false;
          load(current).then(() => isOpen && paintList());
        }
        if (isOpen) paint();
        return;
      default:
        if (isOpen) paint();
    }
  }

  // Dragging by the header, like a window. In the app Swift moves the panel; here the box moves on the page.
  let placed = false;
  function centerOnce() {
    if (placed) return;
    placed = true;
    win.style.left = `${Math.max(8, (innerWidth - 420) / 2)}px`;
    win.style.top = `${Math.max(8, (innerHeight - 560) / 2)}px`;
  }

  if (CHAT) {
    if (ROLE === 'both') win.classList.add('floating');
    win.addEventListener('mousedown', (e) => {
      const head = e.target.closest('.mb-head');
      if (!head || e.button !== 0 || e.target.closest('button')) return;
      e.preventDefault();
      let x = e.screenX, y = e.screenY;
      const move = (ev) => {
        const dx = ev.screenX - x, dy = ev.screenY - y;
        x = ev.screenX;
        y = ev.screenY;
        if (!dx && !dy) return;
        if (ROLE === 'chat') return post({ type: 'drag', dx, dy });
        win.style.left = `${Math.min(innerWidth - 60, Math.max(-360, win.offsetLeft + dx))}px`;
        win.style.top = `${Math.min(innerHeight - 40, Math.max(0, win.offsetTop + dy))}px`;
      };
      const up = () => {
        removeEventListener('mousemove', move);
        removeEventListener('mouseup', up);
        win.classList.remove('dragging');
        post({ type: 'dragEnd' });
      };
      win.classList.add('dragging');
      addEventListener('mousemove', move);
      addEventListener('mouseup', up);
    });
    win.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      switch (el.dataset.act) {
        case 'close':
          return close();
        case 'switch':
          return open(el.dataset.id);
        case 'more':
          return loadMore();
        case 'send':
          return send(q('.mb-input textarea'));
        case 'retry': {
          const m = conv(current).list.find((x) => x.id === el.dataset.id);
          if (m) deliver(m, current);
          return paintList();
        }
      }
    });
    win.addEventListener('input', (e) => e.target.matches('textarea') && grow(e.target));
    win.addEventListener('keydown', (e) => {
      if (!e.target.matches('textarea')) return;
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        send(e.target);
      }
    });
  }

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (CHAT && isOpen && (ROLE === 'chat' || win.contains(document.activeElement))) close();
    else if (NOTICES && peek) hidePeek();
  });

  Social.on((ev) => {
    if (NOTICES) notice(ev);
    if (CHAT) chatEvent(ev);
  });

  // ======================= copy and paste =======================
  // In the app Swift catches ⌘V, ⌘C, ⌘X and ⌘A in these panels (they sit outside the menu's usual path, and the
  // notices don't even bring the app forward) and does the clipboard; the text editing happens here.
  const typing = () => {
    const el = document.activeElement;
    return el && el.tagName === 'TEXTAREA' && !el.disabled ? el : null;
  };
  function pasteText(text) {
    const ta = typing();
    if (!ta || !text) return false;
    ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  // The selected text: in the reply box, else on the page (a message); `cut` takes it out of the reply box.
  function copyText(cut) {
    const ta = typing();
    if (ta && ta.selectionEnd > ta.selectionStart) {
      const text = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      if (cut) {
        ta.setRangeText('', ta.selectionStart, ta.selectionEnd, 'end');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return text;
    }
    return String(getSelection() || '');
  }
  function selectAll() {
    const ta = typing();
    if (ta) return ta.select();
    const list = document.querySelector('.mb-list');
    if (!list) return;
    const r = document.createRange();
    r.selectNodeContents(list);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
  }

  // ======================= the app's panels =======================
  if (APP_ROLE) {
    window.__messages = {
      event: (ev) => Social.event(ev),
      open: (id) => open(id),
      showing: (ids) => (showing = new Set(ids || [])),
      paste: (text) => pasteText(text),
      copy: (cut) => copyText(cut),
      selectAll: () => selectAll(),
      update: (u) => updateNotice(u),
      xp: (x) => progress({ xp: x }),
      focus: (on) => setFocus(on),
      skip: () => skip(),
    };
    Social.load();
    post({ type: 'ready' });
  }

  return { open, close, canChat: CHAT, peek: () => peek, isOpen: () => isOpen, update: updateNotice, progress, focus: setFocus };
})();
