'use strict';

// Messages, like instant-message windows popping up on a HUD. Two parts:
//  · notices: a new message, friend request or new friend pops up at the screen's bottom-right corner for a while,
//    with a quick reply or accept/decline; clicking it opens the chat. Closed, it's gone. A friend coming online
//    shows there for a moment too, like on Steam, and so does a new version of the app (a click shows what's new).
//    Your own progress shows there as well: the daily bonus as a strip, a new level or rank as a takeover of the whole
//    screen for a few seconds, and five hours of work in a day as flames along the screen's edges. A chat that needs
//    you (an approval) while the app is behind other windows shows there too, and stays until the chat moves on.
//  · chat: the conversation in its own window, opened mid-screen the first time and dragged anywhere by its header.
// Each part is its own panel (Swift injects __MESSAGES_ROLE__ "notices" or "chat", places and moves the panels), and
// every friend's chat has a panel of its own (__MESSAGES_FRIEND__), so several stay on screen side by side.
window.Messages = (() => {
  const ROLE = window.__MESSAGES_ROLE__;
  const FRIEND = window.__MESSAGES_FRIEND__ || null; // the one friend a chat panel is for
  const NOTICES = ROLE === 'notices', CHAT = ROLE === 'chat';
  const post = (msg) => window.webkit.messageHandlers.messages.postMessage(msg);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const time = (at) => new Date(at).toTimeString().slice(0, 5);
  // A friend's level shows next to their name (from the friends list; live events carry only the name).
  const who = (p) => {
    if (!p) return '';
    const xp = p.xp || Social.friend(p.id)?.xp;
    // A nickname you gave them shows instead of their name, as on Steam; their own name#tag on hover.
    const nick = p.id && Social.nick(p.id);
    return `${Social.dot(p.presence)}<span${nick ? ` title="${esc(Social.handle(p))}"` : ''}>${esc(nick || Social.handle(p))}</span>${xp ? Xp.badge(xp.level) : ''}`;
  };
  const PEEK_MS = 12_000;
  const STRIP_MS = 6000; // a strip (the daily bonus, a friend online) goes sooner
  const NOTE_MS = 30_000; // a notification from the developer stays longer: it's rare, and it's for reading
  // A friend back after less than this offline isn't news: a dropped connection, a short sleep, the app restarting for
  // an update (each of which said "is now online" again when this was a minute).
  const BACK_MS = 10 * 60_000;
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
  // The danger alarm (below): a runaway process, in the middle of the screen while it's up.
  const alertBox = NOTICES ? mount('dangerbox') : null;
  let alertOn = null;
  const queue = []; // notices waiting for the one on screen (an update, the daily bonus)
  const waits = new Map(); // chats that need you (below), session id -> { sid, title, folder, what }, the newest last
  const clashes = new Map(); // files two chats are writing (below), path -> { key, file, path, chats }, the newest last
  const clashShut = new Set(); // collisions put away with ×: they don't pop up again until they're over

  function sizeNotes() {
    if (ROLE !== 'notices') return;
    const box = notes.firstElementChild;
    // Layout size, not the on-screen one: the slide-in animation scales the box while it starts. The level-up takeover
    // has the whole screen (a notice can wait under it).
    if (takeover) return post({ type: 'layout', w: 1, h: 1, place: 'screen' });
    // The flames have the screen's edges, every click passing through (the notice sits in its corner meanwhile).
    if (fire) return post({ type: 'layout', w: 1, h: 1, place: 'fire' });
    // The danger alarm has the middle of the screen (the corner's notices wait under it).
    const alarm = alertOn && alertBox.firstElementChild;
    if (alarm) return post({ type: 'layout', w: alarm.offsetWidth + 16, h: alarm.offsetHeight + 16, place: 'center' });
    post(box ? { type: 'layout', w: box.offsetWidth + 16, h: box.offsetHeight + 16, place: 'corner' } : { type: 'layout', w: 0, h: 0 });
  }

  // A reply being written in the notice: it stays, and what else comes in waits behind it.
  const replying = () => {
    const ta = notes && notes.querySelector('textarea');
    return !!ta && (ta.value.trim() !== '' || (document.hasFocus() && document.activeElement === ta));
  };
  // Goes once its time is up, unless you're writing a reply in it: then it waits for you.
  const autoHide = () => (replying() ? (peekTimer = setTimeout(autoHide, 3000)) : hidePeek());

  function showPeek(p) {
    // A chat that needs you stays on top: the other notices wait behind it.
    if ((peek && p !== peek && replying()) || alertOn || (peek && peek.kind === 'wait' && p.kind !== 'wait')) return void queue.push(p);
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
    // A chat that needs you, or two writing the same file, has no time: it goes when that's over or it's put away.
    if (p.kind !== 'wait' && p.kind !== 'clash') peekTimer = setTimeout(autoHide, p.kind === 'xp' || p.kind === 'online' ? STRIP_MS : p.kind === 'fire' ? FIRE_MS + 3000 : p.kind === 'note' ? NOTE_MS : PEEK_MS);
  }

  // What comes after a notice: a chat that needs you first, then two chats writing the same file, then the queue.
  const nextPeek = () => (waits.size ? showWait() : clashes.size ? showClash() : queue.length && showPeek(queue.shift()));

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
      if (!takeover) nextPeek();
    }, 190);
  }

  function peekHTML(p) {
    // A message's notice also opens its chat (⤢), not only through the profile: easier on a touchpad.
    const head = (tag, person, at, expand) =>
      `<div class="mb-head"><span class="mb-tag">${tag}</span><span class="mb-who">${who(person)}</span>` +
      `<span class="mb-time">${at ? time(at) : ''}</span>` +
      `${expand ? '<button class="mb-x mb-expand" data-act="open" title="Open the chat">⤢</button>' : ''}` +
      `<button class="mb-x" data-act="close" title="Close">×</button></div>`;
    let body;
    if (p.kind === 'message') {
      body = head('INCOMING', p.from, p.at, true) + `<div class="mb-text" data-act="open" title="Open the chat">${esc(p.body)}</div>` + inputHTML('reply…', '⏎');
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
    } else if (p.kind === 'updated') {
      // The app updated itself since it last ran (maybe while you were away).
      return (
        `<div class="mb peek update in" data-act="close" title="Close"><div class="mb-border"></div>` +
        `<div class="mb-head"><span class="mb-tag">UPDATED</span><span class="mb-who"><span>You're on version ${esc(p.version)}</span>` +
        `<small>updated by itself · your chats kept running</small></span></div></div>`
      );
    } else if (p.kind === 'note') {
      // A notification from the developer (the admin page): a click opens the notifications on the dashboard.
      return (
        `<div class="mb peek note in" data-act="notes" title="See your notifications"><div class="mb-border"></div>` +
        `<div class="mb-head"><span class="mb-tag">NOTICE</span><span class="mb-who"><span>${esc(p.title)}</span>` +
        `<small>${p.body ? esc(p.body.length > 110 ? `${p.body.slice(0, 110)}…` : p.body) : 'from the developer ›'}</small></span></div></div>`
      );
    } else if (p.kind === 'xp') {
      return (
        `<div class="mb peek xp in" data-act="profile" title="See your profile"><div class="mb-border"></div>` +
        `<div class="mb-head"><span class="mb-tag">+${p.gained} XP</span><span class="mb-who"><span>Daily bonus</span>` +
        `<small>welcome back${p.level ? ` · level ${p.level}` : ''}</small></span></div></div>`
      );
    } else if (p.kind === 'fire') {
      return (
        `<div class="mb peek fire in" data-act="profile" title="See your profile"><div class="mb-border"></div>` +
        `<div class="mb-head"><span class="mb-tag"><i class="mb-flame"></i>ON FIRE</span><span class="mb-who">` +
        `<span>You passed 5 hours today</span><small>you're on fire · keep it burning</small></span></div></div>`
      );
    } else if (p.kind === 'online') {
      // As on Steam: one thin strip, no buttons, a click opens the chat. Friends coming online together share it.
      const more = p.friends.length - 1;
      return (
        `<div class="mb peek online in" data-act="open" title="Open the chat"><div class="mb-border"></div>` +
        `<div class="mb-head"><span class="mb-tag">ONLINE</span><span class="mb-who">${who(p.friends[more])}` +
        `<small>${more ? `and ${more} more are` : 'is'} now online</small></span></div></div>`
      );
    } else if (p.kind === 'wait') {
      // A chat that needs you: which one, where, what it asks for, how many more wait. A click opens it.
      const w = p.item;
      return (
        `<div class="mb peek wait in" data-act="wait" title="Open the chat"><div class="mb-border"></div>` +
        `<div class="mb-head"><span class="mb-tag">NEEDS YOU</span><span class="mb-who"><span>${esc(w.title)}</span>` +
        `<small>${esc(w.folder)}${p.more ? ` · ${p.more} more waiting` : ''}</small></span>` +
        `<button class="mb-x" data-act="close" title="Close">×</button></div>` +
        `<div class="mb-text">${esc(w.what)}</div></div>`
      );
    } else if (p.kind === 'clash') {
      // Two chats writing the same file (files.heat's collision): which file, which chats, how many more. A click shows
      // the dashboard.
      const c = p.item;
      return (
        `<div class="mb peek wait clash in" data-act="clash" title="Show it on the dashboard"><div class="mb-border"></div>` +
        `<div class="mb-head"><span class="mb-tag">⚠ SAME FILE</span><span class="mb-who"><span>${esc(c.file)}</span>` +
        `<small>${esc((c.chats || []).join(' and '))} are both writing it${p.more ? ` · ${p.more} more` : ''}</small></span>` +
        `<button class="mb-x" data-act="close" title="Close">×</button></div>` +
        `<div class="mb-text">${esc(c.path)}</div></div>`
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
      if (act === 'close') {
        // Put away: the chats waiting now don't pop up again (another question in one of them does).
        if (peek.kind === 'wait') waits.clear();
        // The same for the collisions now: one pops up again only once it was over and began again.
        if (peek.kind === 'clash') shutClashes();
        return hidePeek();
      }
      if (act === 'clash') {
        shutClashes();
        hidePeek();
        // Swift brings the dashboard to the front, on its panels (files.heat names the file).
        return post({ type: 'openClash' });
      }
      if (act === 'wait') {
        const sid = peek.item.sid;
        waits.delete(sid);
        hidePeek();
        // Swift brings that chat to the front (its terminal, for one running outside the app).
        return post({ type: 'openWait', sid });
      }
      if (act === 'update') {
        hidePeek();
        // The dashboard shows what's new (Swift brings its window to the front).
        return post({ type: 'openUpdate' });
      }
      if (act === 'profile') {
        hidePeek();
        return post({ type: 'openProfile' });
      }
      if (act === 'notes') {
        hidePeek();
        return post({ type: 'openNotifications' });
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

  // A quick reply goes out from here and the notice goes, leaving you where you were (no chat window, the app stays
  // behind whatever you're in).
  async function replyFromPeek(ta) {
    const to = peekFriend();
    const text = ta && ta.value.trim();
    if (!to || !text) return;
    ta.value = '';
    ta.blur();
    hidePeek();
    Sfx.play('send');
    // Answering it means it was read: the unread count (the friends badge) goes with it, here and on the server.
    if (Social.friend(to)?.unread) Social.read(to);
    const r = await Social.send(to, text);
    if (r.error) say(r.error === 'offline' ? "not sent · you're offline" : "not sent · you're not friends anymore");
  }

  // A new version of the app (from Swift): after whatever is on screen, and not on do-not-disturb.
  function updateNotice(u) {
    if (!NOTICES || !u || Social.dnd()) return;
    const p = { kind: 'update', version: u.version };
    if (takeover || (peek && peek.kind !== 'update')) queue.push(p);
    else showPeek(p);
  }

  // ======================= a chat needs you =======================
  // A chat waiting for you (an approval, a question) while the app is behind other windows (Swift's WaitNotifier
  // decides when): it goes over whatever is in the corner (that comes back after it) and stays until the chat moves
  // on, the newest on top with how many more wait. Not held back on do-not-disturb: it's your own work, stuck.
  function showWait() {
    if (!waits.size || takeover || alertOn) return;
    if (peek && peek.kind !== 'wait') {
      // A reply being written stays; this comes right after it (hidePeek).
      if (replying()) return;
      // A collision's notice comes back from its own list (nextPeek), as it stands then.
      if (peek.kind !== 'clash') queue.unshift(peek);
    }
    const all = [...waits.values()];
    showPeek({ kind: 'wait', item: all[all.length - 1], more: all.length - 1 });
  }

  function addWait(w) {
    if (!NOTICES || !w || !w.sid) return;
    waits.delete(w.sid);
    waits.set(w.sid, w);
    Sfx.play('wait');
    showWait();
  }

  function waitOver(sid) {
    if (!NOTICES || !waits.delete(sid) || !peek || peek.kind !== 'wait') return;
    if (waits.size) showWait();
    else hidePeek();
  }

  // ======================= two chats writing the same file =======================
  // files.heat's collision (the dashboard page tells Swift, Swift tells this page): it pops up as a chat that needs you
  // does, after those, and stays until the collision is over or it's put away. Not held back on do-not-disturb either.
  function showClash() {
    if (!clashes.size || takeover || alertOn) return;
    // A chat that needs you goes first; this comes after it (nextPeek).
    if (peek && peek.kind === 'wait') return;
    if (peek && peek.kind !== 'clash') {
      if (replying()) return;
      queue.unshift(peek);
    }
    const all = [...clashes.values()];
    showPeek({ kind: 'clash', item: all[all.length - 1], more: all.length - 1 });
  }

  function addClash(c) {
    if (!NOTICES || !c || !c.key || clashShut.has(c.key)) return;
    clashes.delete(c.key);
    clashes.set(c.key, c);
    Hooks.set('sameFile', clashes.size);
    Hooks.pulse('clash', { value: c.file, path: c.path, chats: c.chats });
    Sfx.play('clash');
    showClash();
  }

  function clashOver(key) {
    clashShut.delete(key);
    if (!NOTICES || !clashes.delete(key)) return;
    Hooks.set('sameFile', clashes.size);
    if (!peek || peek.kind !== 'clash') return;
    if (clashes.size) showClash();
    else hidePeek();
  }

  function shutClashes() {
    for (const k of clashes.keys()) clashShut.add(k);
    clashes.clear();
    Hooks.set('sameFile', 0);
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
  // Five hours of work in one day: you're on fire. The first time the day's active time reaches them, flames burn along
  // the screen's edges for a few seconds, over the windows but taking no clicks, with a notice and a sound; once a day
  // (the leaderboard keeps a flame on your card until the day ends).
  const FIRE_SECONDS = 5 * 3600;
  const FIRE_MS = 7000;
  const localDay = () => new Date().toLocaleDateString('sv');
  let fireDay = ''; // the day the flames last burned
  let firePending = false;
  let fire = null; // the flames on screen
  try {
    seenLevel = Number(localStorage.getItem('xpLevel')) || 0;
    fireDay = localStorage.getItem('fireDay') || '';
  } catch {}
  // In front: the app tells (focus).
  let focused = false;
  let pending = null; // the level-up waiting to play: the highest level, the one before, whether a rank changed
  let badgesWaiting = null; // new badges waiting for their reveal: { badges: [{ id, tier }], quiet, seen }, the highest tier each
  let takeover = null; // the one on screen

  function progress(ev) {
    if (!NOTICES) return;
    const x = ev.xp;
    if (x && x.level) {
      Hooks.set('level', x.level);
      Hooks.set('rank', Xp.rank(x.level).name);
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
    if (x && x.today >= FIRE_SECONDS && fireDay !== localDay()) {
      fireDay = localDay();
      try {
        localStorage.setItem('fireDay', fireDay);
      } catch {}
      firePending = true;
      ignite();
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

  // The flames wait for a level-up's takeover and for do not disturb to end, and for the app to have opened (3 s).
  const bornAt = performance.now();
  function ignite() {
    if (!firePending || fire || takeover || Social.dnd()) return;
    if (performance.now() - bornAt < 3000) return setTimeout(ignite, 3000 - (performance.now() - bornAt));
    firePending = false;
    const canvas = document.createElement('canvas');
    canvas.className = 'fire-edges';
    document.body.appendChild(canvas);
    // Flames up from the bottom and along the sides (the panel grows to the screen as they start, so their reach
    // follows its size).
    fire = Fire.burn(canvas, { reach: () => [innerHeight * 0.11, innerWidth * 0.028, 0], scale: 34, life: FIRE_MS, res: 1 });
    // A message or a request on screen keeps its place; the notice comes right after it.
    const p = { kind: 'fire' };
    if (peek && !['online', 'xp', 'update'].includes(peek.kind)) queue.unshift(p);
    else showPeek(p);
    sizeNotes();
    Sfx.play('fire');
    setTimeout(() => {
      fire();
      canvas.remove();
      fire = null;
      sizeNotes();
      setTimeout(play, 600);
    }, FIRE_MS);
  }

  // A level-up first, then the badges it may have brought.
  function play() {
    if ((!pending && !badgesWaiting) || takeover || fire || !focused || Social.dnd()) return;
    if (pending) {
      const c = pending;
      pending = null;
      // A theme may play its own (hooks.js): cancelled, the takeover stays out and the badges come next.
      if (!Hooks.pulse('levelup', { value: c.level, from: c.from, rankUp: c.rankUp }, { cancelable: true })) return play();
      takeover = showTakeover(c);
    } else {
      revealNext(false);
    }
    // Only now, with the takeover set, does the panel ask for the whole screen (in the app).
    sizeNotes();
  }

  // Keys do nothing while it plays: Swift drops them (never longer than 4 s). After the lock a key ends the takeover
  // (Swift catches it and calls skip).
  function lockKeys(ms) {
    post({ type: 'lock', ms });
  }
  function unlockKeys() {
    post({ type: 'lock', ms: 0 });
  }

  // A key or a click once the lock is over: out now instead of waiting.
  function skip() {
    if (!takeover) return;
    if (takeover.skip) return takeover.skip();
    if (takeover.free) takeover.out();
  }
  // How long keys wait at a badge's reveal (and after a key brought its burst forward) before they count again.
  const KEY_GUARD = 250;

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
    takeover = null;
    sizeNotes();
    // Another level-up or badge waiting plays first; notices (a chat that needs you, the daily bonus) come after the last.
    if (!peek && !pending && !badgesWaiting) nextPeek();
    setTimeout(play, badgesWaiting ? 250 : 600);
    setTimeout(ignite, 700);
  }

  // The next badge waiting, one at a time, each with its own reveal (a key or a click after it lands brings the next),
  // the grandest last; the count (3 of 9) runs across the ones that came together. `cont`: straight on from the one
  // before, the screen staying dark.
  function revealNext(cont) {
    const c = badgesWaiting;
    const order = [...c.badges].sort((a, b) => badgeScore(a) - badgeScore(b));
    const seen = (c.seen || 0) + 1;
    badgesWaiting = order.length > 1 ? { badges: order.slice(1), quiet: c.quiet, seen } : null;
    takeover = showReveal({ badge: order[0], quiet: c.quiet, n: seen, of: seen + order.length - 1, cont });
  }

  // How grand a badge is, for the order of several (the grandest revealed last): a Service Medal, then gold and up, a
  // hidden one or Founder, then the tier.
  const badgeScore = (b) => (b.id.startsWith('service-') ? 20 : 0) + (window.BadgeArt.grand(b.id, b.tier) ? 10 : 0) + b.tier;

  // A new badge, as CS:GO reveals an item: the screen darkens while the impact's sound builds, light is pulled in to the
  // middle and only the badge's shadow shows there, the screen's edges glowing in its colour and a HUD's corners closing
  // in; on the sound's burst the badge itself appears with a flash, a shockwave and a burst of sparks in its own colours,
  // under turning rays, a shine crossing it; its name and tier rise under it. A gold one and up (a medal, a hidden one)
  // gets more of everything. Several that came together (a sign-in counting what was done before) come one by one,
  // `c.n` of `c.of`.
  function showReveal(c) {
    const Art = window.BadgeArt;
    const main = c.badge;
    const grand = Art.grand(main.id, main.tier);
    const [rc, rs] = Art.glow(main.id, main.tier);
    const tier = Art.tierName(main.id, main.tier);
    const kicker = (main.id.startsWith('service-') ? 'MEDAL EARNED' : main.tier > 1 ? 'BADGE UPGRADED' : 'BADGE UNLOCKED') +
      (c.of > 1 ? ` · ${c.n} OF ${c.of}` : '');
    // The moment the badge shows: the impact's burst.
    const IMPACT = Sfx.hit('badge-impact');
    const readMs = IMPACT + (grand ? 6000 : 5000);
    const timers = [];
    const at = (ms, f) => timers.push(setTimeout(f, ms));
    const el = document.createElement('div');
    el.id = 'takeover';
    el.className = `tk rv${grand ? ' grand' : ''}${c.cont ? ' cont' : ''}`;
    el.style.setProperty('--rc', rc);
    el.style.setProperty('--rs', rs);
    el.style.setProperty('--build', `${IMPACT}ms`);
    el.innerHTML =
      '<div class="rv-veil"></div><div class="rv-edge"></div><div class="rv-frame"><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i></div>' +
      '<canvas class="rv-sparks"></canvas><div class="rv-flash"></div>' +
      '<div class="rv-center"><div class="rv-stage"><div class="rv-rays"></div><div class="rv-rays b"></div><div class="rv-glow"></div>' +
      `<div class="rv-ring"></div><div class="rv-ring b"></div><div class="rv-art">${Art.svg(main.id, main.tier, 320)}${Art.gleam(main.id, main.tier, 'rv-shine')}</div></div>` +
      `<div class="rv-kicker">${esc(kicker)}</div><div class="rv-name">${esc(Art.name(main.id))}</div>` +
      (tier ? `<div class="rv-tier">${esc(tier)}</div>` : '') +
      (c.quiet ? '<div class="rv-note">from what you\'ve done so far · right click one in your profile to display it</div>' : '') +
      `</div><div class="tk-hint">${c.n < c.of ? 'press any key for the next one' : 'press any key to continue'}</div>`;
    Hooks.pulse('badge-reveal', { value: main.id, tier: main.tier, n: c.n, of: c.of });
    // Straight on from the one before: under it, already dark, while it fades away on top.
    const prev = c.cont && takeover && takeover.el.isConnected ? takeover.el : null;
    if (prev) document.body.insertBefore(el, prev);
    else document.body.appendChild(el);
    const t = { el, timers, free: false, stop: () => {} };
    // Keys only wait a moment (one pressed for the badge before can't skip this one); from then on a key or a click
    // before the burst jumps to it, and one after it brings the next.
    lockKeys(KEY_GUARD);
    const SOUNDS = [['badge-impact', 1], ['badge-shine', 0.8]];
    // The sounds, each started so that its moment falls on IMPACT.
    for (const [name, vol] of SOUNDS) {
      Sfx.preload(name);
      at(Math.max(0, IMPACT - Sfx.hit(name)), () => Sfx.sample(name, vol));
    }
    const light = sparks(el.querySelector('.rv-sparks'), el.querySelector('.rv-art'), rc, rs, grand, IMPACT);
    t.stop = light.stop;

    let leaving = false;
    t.out = () => {
      if (leaving) return;
      leaving = true;
      timers.forEach(clearTimeout);
      el.classList.add('out');
      // Another badge waiting: it starts at once under this one, the screen never going back to the dashboard.
      if (badgesWaiting && focused && !Social.dnd()) {
        revealNext(true);
        return setTimeout(() => {
          t.stop();
          el.remove();
        }, 450);
      }
      at(450, () => endTakeover(t));
    };
    // The burst: the badge shows, the flash and the shake; the text after. `fast`: a key brought it forward, so the
    // sounds jump to their moments, the sparks burst now and the text is there at once.
    let landed = false;
    const land = (fast) => {
      if (landed) return;
      landed = true;
      el.classList.add('hit');
      const lines = ['.rv-kicker', '.rv-name', '.rv-tier', '.rv-note'];
      if (fast) {
        timers.forEach(clearTimeout);
        timers.length = 0;
        el.classList.add('fast');
        for (const [name, vol] of SOUNDS) Sfx.sample(name, vol, Sfx.hit(name) / 1000);
        light.hit();
        lines.forEach((q) => el.querySelector(q)?.classList.add('on'));
      } else {
        lines.forEach((q, i) => at([220, 340, 460, 700][i], () => el.querySelector(q)?.classList.add('on')));
      }
      at(readMs - IMPACT, t.out);
      at(fast ? KEY_GUARD : 250, () => {
        t.free = true;
        el.classList.add('free');
      });
    };
    at(IMPACT, () => land(false));
    t.skip = () => (landed ? t.free && t.out() : land(true));
    el.addEventListener('mousedown', () => skip());
    return t;
  }

  // The reveal's light: sparks pulled in from all around to the middle until `impact` ms, then a burst out from it
  // (a second one for a grand badge), then embers rising around the badge until the reveal ends (stop).
  function sparks(canvas, art, rc, rs, grand, impactAt) {
    let impact = impactAt; // brought forward by hit()
    const dpr = Math.min(2, devicePixelRatio || 1);
    const g = canvas.getContext('2d');
    const colors = [`rgb(${rc})`, `rgb(${rs})`, `rgb(${rs})`, '#ffffff'];
    const bits = [];
    const start = performance.now();
    let last = start, raf = 0, burst = 0, inward = 0, ember = 0;
    // Its middle on screen, and its radius as laid out (not as scaled while it falls).
    const centre = () => {
      const r = art.getBoundingClientRect();
      return [(r.left + r.width / 2) * dpr, (r.top + r.height / 2) * dpr, (art.offsetWidth / 2) * dpr];
    };
    const spawnBurst = (n, power) => {
      const [x, y, r] = centre();
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = (3 + Math.random() * 13) * power * dpr;
        bits.push({ x: x + Math.cos(a) * r * 0.5, y: y + Math.sin(a) * r * 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 0.94 + Math.random() * 0.03,
          grav: 0.12 * dpr, life: 0, max: 50 + Math.random() * 70, size: (1 + Math.random() * 2.4) * dpr, c: colors[(Math.random() * colors.length) | 0], streak: true });
      }
    };
    const frame = (now) => {
      if (canvas.width !== Math.round(innerWidth * dpr) || canvas.height !== Math.round(innerHeight * dpr)) {
        canvas.width = Math.round(innerWidth * dpr);
        canvas.height = Math.round(innerHeight * dpr);
      }
      const dt = Math.min(3, (now - last) / 16.7);
      last = now;
      const age = now - start;
      const [cx, cy, cr] = centre();
      // Pulled in: from a ring around the middle, faster as they near it.
      if (age < impact - 60 && age > impact * 0.15) {
        inward += dt * (grand ? 4 : 2.6) * (0.3 + 1.4 * (age / impact));
        for (; inward >= 1; inward--) {
          const a = Math.random() * Math.PI * 2;
          const d = (0.35 + Math.random() * 0.35) * Math.min(canvas.width, canvas.height);
          bits.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, tx: cx, ty: cy, pull: 0, life: 0, max: 60, size: (1 + Math.random() * 1.6) * dpr, c: colors[(Math.random() * colors.length) | 0], streak: true });
        }
      }
      if (burst === 0 && age >= impact) burst = 1, spawnBurst(grand ? 260 : 150, 1);
      if (grand && burst === 1 && age >= impact + 260) burst = 2, spawnBurst(140, 0.7);
      // Embers: slow, from around the badge, upwards, twinkling.
      if (age >= impact) {
        ember += dt * (grand ? 0.9 : 0.5);
        for (; ember >= 1; ember--) {
          const a = Math.random() * Math.PI * 2;
          const d = cr * (0.6 + Math.random() * 0.9);
          bits.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, vx: (Math.random() - 0.5) * 0.5 * dpr, vy: -(0.4 + Math.random() * 1.1) * dpr, drag: 1, grav: 0,
            life: 0, max: 90 + Math.random() * 90, size: (0.8 + Math.random() * 1.8) * dpr, c: colors[(Math.random() * colors.length) | 0], twinkle: Math.random() * 6.28 });
        }
      }
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.globalCompositeOperation = 'lighter';
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.life += dt;
        const px = b.x, py = b.y;
        if (b.tx !== undefined) {
          b.pull += 0.012 * dt;
          b.x += (b.tx - b.x) * Math.min(1, b.pull * b.pull * 3 * dt);
          b.y += (b.ty - b.y) * Math.min(1, b.pull * b.pull * 3 * dt);
          if (Math.hypot(b.tx - b.x, b.ty - b.y) < cr * 0.3 || age >= impact) {
            bits.splice(i, 1);
            continue;
          }
        } else {
          b.vx *= b.drag ** dt;
          b.vy = b.vy * b.drag ** dt + b.grav * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.life >= b.max) {
            bits.splice(i, 1);
            continue;
          }
        }
        const fade = b.tx !== undefined ? Math.min(1, b.life / 10) : 1 - b.life / b.max;
        const tw = b.twinkle !== undefined ? 0.5 + 0.5 * Math.sin(b.twinkle + b.life * 0.25) : 1;
        g.globalAlpha = Math.max(0, fade * tw);
        if (b.streak) {
          g.strokeStyle = b.c;
          g.lineWidth = b.size;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(px, py);
          g.lineTo(b.x + (b.x - px) * 0.6, b.y + (b.y - py) * 0.6);
          g.stroke();
        } else {
          g.fillStyle = b.c;
          g.beginPath();
          g.arc(b.x, b.y, b.size, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop: () => cancelAnimationFrame(raf), hit: () => (impact = Math.min(impact, performance.now() - start)) };
  }

  // Confetti raining from the top of the screen, in the rank's colour and the app's: a few waves, then it falls out
  // until the takeover ends (stop).
  function confetti(canvas, rc) {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const g = canvas.getContext('2d');
    const css = getComputedStyle(document.documentElement), t = (k) => css.getPropertyValue(k).trim();
    const colors = [`rgb(${rc})`, `rgb(${rc})`, t('--accent'), t('--accent-soft'), t('--amber'), '#ffffff', t('--red')];
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

  function say(msg) {
    if (typeof window.toast === 'function') return window.toast(msg);
    post({ type: 'log', msg });
  }

  function notice(ev) {
    switch (ev.type) {
      case 'message':
        if (ev.message.mine || showing.has(ev.with)) return;
        Sfx.play('message');
        if (Social.dnd()) return;
        // The friend you're answering wrote again: their newest message shows above your reply, which stays.
        if (peek && peek.kind === 'message' && peek.from && peek.from.id === ev.with && replying()) {
          peek.body = ev.message.body;
          peek.at = ev.message.at;
          notes.querySelector('.mb-text').textContent = ev.message.body;
          notes.querySelector('.mb-time').textContent = time(ev.message.at);
          return sizeNotes();
        }
        showPeek({ kind: 'message', from: ev.from || Social.friend(ev.with), body: ev.message.body, at: ev.message.at });
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
      case 'notification':
        Sfx.play('request');
        if (!Social.dnd()) showPeek({ kind: 'note', title: ev.notification.title, body: ev.notification.body });
        return;
      case 'request_gone':
        if (peek && peek.kind === 'request' && peek.request.id === ev.id) hidePeek();
        return;
      case 'xp':
        return progress(ev);
      case 'badge': {
        // Its reveal waits for the app in front and do not disturb's end, as a level-up; what comes meanwhile joins it.
        if (!ev.badges || !ev.badges.length) return;
        const all = new Map((badgesWaiting ? badgesWaiting.badges : []).map((b) => [b.id, b]));
        for (const b of ev.badges) if (!all.has(b.id) || all.get(b.id).tier < b.tier) all.set(b.id, b);
        badgesWaiting = { badges: [...all.values()], quiet: (!badgesWaiting || badgesWaiting.quiet) && !!ev.quiet, seen: badgesWaiting?.seen || 0 };
        play();
        return;
      }
      case 'status':
        // Do not disturb ended: a level-up or the flames it held play now.
        if (ev.status !== 'dnd') play(), ignite();
        return;
      case 'presence': {
        if (ev.presence === 'offline') return void offlineAt.set(ev.id, Date.now());
        // Only offline -> online counts, not away/busy changes, after ten minutes away at least; not while their chat
        // is open, nor over a message or request on screen.
        const f = Social.friend(ev.id);
        if (!f || ev.was !== 'offline' || Date.now() - (offlineAt.get(ev.id) || 0) < BACK_MS || showing.has(ev.id)) return;
        if (peek && peek.kind !== 'online') return;
        if (Social.dnd()) return;
        Sfx.play('online');
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
    if (f) c.name = Social.label(f);
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
      // A nickname set or taken off: the open chat's title follows.
      case 'nickname':
        if (ev.id === current) paint();
        break;
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

  // Dragging by the header, like a window: Swift moves the panel.
  if (CHAT) {
    win.addEventListener('mousedown', (e) => {
      const head = e.target.closest('.mb-head');
      if (!head || e.button !== 0 || e.target.closest('button')) return;
      e.preventDefault();
      let x = e.screenX, y = e.screenY;
      const move = (ev) => {
        const dx = ev.screenX - x, dy = ev.screenY - y;
        x = ev.screenX;
        y = ev.screenY;
        if (dx || dy) post({ type: 'drag', dx, dy });
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
    if (CHAT && isOpen) close();
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

  // ======================= danger: a runaway process =======================
  // A process left burning a CPU core where nobody sees it (the app's Runaways): a big DANGER in the middle of the
  // screen, over whatever is in front, with the alarm sounding and a shake. One line says how much it burns; Details
  // opens the dashboard's card (what it is, END IT) and flies the camera to it, Ignore puts it away until another one
  // starts. It stays until one is pressed or the processes are gone; the corner's notices wait under it.
  let runaways = [];
  const alarmed = new Set(), quiet = new Set();
  const rkey = (r) => `${r.pid}:${r.started}`;
  const loud = () => runaways.filter((r) => !quiet.has(rkey(r)));

  function setRunaways(list) {
    if (!NOTICES) return;
    runaways = Array.isArray(list) ? list : [];
    const now = new Set(runaways.map(rkey));
    for (const k of [...alarmed]) if (!now.has(k)) alarmed.delete(k);
    const fresh = loud().filter((r) => !alarmed.has(rkey(r)));
    for (const r of runaways) alarmed.add(rkey(r));
    if (fresh.length) return showAlert(true);
    if (alertOn) return loud().length ? showAlert(false) : hideAlert();
  }

  function showAlert(sound) {
    const list = loud();
    alertOn = list[0];
    const top = Math.round(Math.max(...list.map((r) => r.cpu)));
    const line = list.length === 1 ? `1 process is using ${top}% CPU` : `${list.length} processes are burning the CPU, up to ${top}%`;
    alertBox.innerHTML =
      `<div class="dg${sound ? ' in' : ''}"><b class="dg-big"><i>⚠</i> DANGER</b><div class="dg-line">${esc(line)}</div>` +
      '<div class="dg-acts"><button data-act="dg-ignore">Ignore</button><button class="go" data-act="dg-show">Details</button></div></div>';
    document.body.classList.add('danger-on');
    sizeNotes();
    if (sound) Sfx.play('alarm');
  }

  function hideAlert() {
    alertOn = null;
    alertBox.innerHTML = '';
    document.body.classList.remove('danger-on');
    sizeNotes();
    if (!takeover && !peek) nextPeek();
  }

  if (NOTICES) {
    alertBox.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || !alertOn) return;
      if (el.dataset.act === 'dg-ignore') for (const r of runaways) quiet.add(rkey(r));
      else if (el.dataset.act === 'dg-show') post({ type: 'openDanger' });
      else return;
      hideAlert();
    });
  }

  // ======================= the app's panels =======================
  window.__messages = {
    event: (ev) => Social.event(ev),
    open: (id) => open(id),
    close: () => close(),
    showing: (ids) => (showing = new Set(ids || [])),
    paste: (text) => pasteText(text),
    copy: (cut) => copyText(cut),
    selectAll: () => selectAll(),
    update: (u) => updateNotice(u),
    updated: (version) => NOTICES && showPeek({ kind: 'updated', version }),
    xp: (x) => progress({ xp: x }),
    focus: (on) => setFocus(on),
    skip: () => skip(),
    runaways: (list) => setRunaways(list),
    wait: (w) => addWait(w),
    waitOver: (sid) => waitOver(sid),
    clash: (c) => addClash(c),
    clashOver: (key) => clashOver(key),
  };
  Social.load();
  post({ type: 'ready' });

  return { open, close, canChat: CHAT, peek: () => peek, isOpen: () => isOpen, update: updateNotice, progress, focus: setFocus };
})();
