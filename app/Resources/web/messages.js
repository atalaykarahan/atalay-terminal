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
    ta.style.height = Math.min(CHAT && draft.code ? 220 : 84, ta.scrollHeight) + 'px';
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
    if (!['wait', 'clash', 'sas', 'device'].includes(p.kind)) peekTimer = setTimeout(autoHide, p.kind === 'xp' || p.kind === 'online' ? STRIP_MS : p.kind === 'fire' ? FIRE_MS + 3000 : p.kind === 'note' ? NOTE_MS : PEEK_MS);
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
    } else if (p.kind === 'device') {
      // A computer that joined your account asks for your messages' key (E2EE.swift).
      const d = p.device;
      const what = [d.os, d.app ? `app ${d.app}` : ''].filter(Boolean).join(' · ') || 'another computer';
      return (
        `<div class="mb peek in"><div class="mb-border"></div><div class="mb-head"><span class="mb-tag">NEW COMPUTER</span>` +
        `<span class="mb-who"><span>Show your messages there too?</span><small>${esc(what)}</small></span>` +
        `<button class="mb-x" data-act="close" title="Later">×</button></div>` +
        `<div class="mb-text">A computer that joined your account asks for your end-to-end encrypted messages. Approve it only if it's yours: both screens will show a code to compare.</div>` +
        `<div class="mb-actions"><button class="go" data-act="dev-approve">approve…</button><button data-act="close">later</button></div></div>`
      );
    } else if (p.kind === 'sas') {
      // The two computers compare a code; it stays until that's over.
      const s = p.sas;
      const other = s.giver ? 'the new computer' : 'your other computer';
      const tag = s.step === 'compare' ? 'COMPARE' : s.step === 'done' ? 'APPROVED' : s.step === 'failed' ? 'STOPPED' : 'APPROVING';
      const text =
        s.step === 'compare'
          ? `<div class="mb-text">Does ${other} show the same code?<b class="mb-sas">${esc(s.code)}</b>${s.note ? `<small>${esc(s.note)}</small>` : ''}</div>` +
            '<div class="mb-actions"><button class="go" data-act="sas-yes">they match</button><button data-act="sas-no">they don\'t</button></div>'
          : `<div class="mb-text">${esc(s.step === 'waiting' ? (s.giver ? 'Waiting for the new computer · keep Orbiterm open on it' : 'Your other computer is approving this one…') : s.note)}</div>`;
      return (
        `<div class="mb peek sas ${s.step} in"><div class="mb-border"></div><div class="mb-head"><span class="mb-tag">${tag}</span>` +
        `<span class="mb-who"><span>Messages on another computer</span><small>end-to-end encryption</small></span>` +
        `<button class="mb-x" data-act="close" title="${s.step === 'compare' ? 'Stop' : 'Close'}">×</button></div>${text}</div>`
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
      let act2 = act;
      if (act === 'close' && peek.kind === 'sas' && peek.sas.step === 'compare') act2 = 'sas-no';
      if (act2 === 'sas-yes' || act2 === 'sas-no') {
        const sid = peek.sas.sid;
        notes.querySelectorAll('.mb-actions button').forEach((b) => (b.disabled = true));
        return void Social.keys('confirm', { sid, match: act2 === 'sas-yes' });
      }
      if (act === 'dev-approve') {
        const id = peek.device.id;
        hidePeek();
        const r = await Social.keys('approve', { device: id });
        if (r && r.error) say(r.error === 'locked' ? 'this computer has no key to give yet' : "couldn't start approving");
        return;
      }
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

  // ======================= approving another computer =======================
  // A computer new to your account asks for your messages' key: a notice offers to approve it; then both computers show
  // a code to compare (E2EE.swift), on top of the other notices until it's over.
  const devicesShown = new Set();
  function e2eeNotice(st) {
    if (!NOTICES) return;
    const s = st.sas;
    if (s) {
      if (peek && peek.kind === 'sas' && peek.sas.sid === s.sid) {
        peek.sas = s;
        notes.innerHTML = peekHTML(peek);
        notes.firstElementChild.classList.remove('in');
        sizeNotes();
        clearTimeout(peekTimer);
        if (s.step === 'done' || s.step === 'failed') peekTimer = setTimeout(hidePeek, 6000);
        return;
      }
      if (peek && peek.kind !== 'sas' && peek.kind !== 'wait' && peek.kind !== 'device') queue.unshift(peek);
      peek = null;
      Sfx.play('request');
      return showPeek({ kind: 'sas', sas: s });
    }
    if (peek && peek.kind === 'sas') return hidePeek();
    if (Social.dnd()) return;
    for (const d of st.waiting || []) {
      if (devicesShown.has(d.id)) continue;
      devicesShown.add(d.id);
      Sfx.play('request');
      return showPeek({ kind: 'device', device: d });
    }
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
          peek.body = Social.preview(ev.message);
          peek.at = ev.message.at;
          notes.querySelector('.mb-text').textContent = peek.body;
          notes.querySelector('.mb-time').textContent = time(ev.message.at);
          return sizeNotes();
        }
        showPeek({ kind: 'message', from: ev.from || Social.friend(ev.with), body: Social.preview(ev.message), at: ev.message.at });
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
      case 'e2ee_state':
        return e2eeNotice(ev);
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
  // The conversation is drawn a message at a time: each message's row is made once and only what changes on it (sent,
  // failed) is touched afterwards, so nothing on screen blinks or jumps when one is sent or arrives; only a new message
  // slides in. A message is known by the app's own id for it (uuid), so a message coming back from the server or from
  // another computer of yours finds its row.
  const win = CHAT ? mount('chatwin') : null;
  const q = (sel) => win.querySelector(sel);
  let current = null;
  let isOpen = false;
  const convs = new Map(); // friend id -> { list, more, loaded, loading, name }
  const conv = (id) => {
    if (!convs.has(id)) convs.set(id, { list: [], more: false, loaded: false, loading: null, name: '' });
    return convs.get(id);
  };
  const keyOf = (m) => m.uuid || `id:${m.id}`;
  // What's being written: the message it answers, whether it's code (and in which language).
  const draft = { reply: null, code: false, lang: '' };
  const TEXT_MAX = 2000;
  const CODE_MAX = 7990; // with its ``` fence, 8000

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

  // The box's two tools, drawn (a smiley, code brackets); their names are in the tooltips.
  const ICON_EMOJI = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M5.4 9.5c.7 1 1.6 1.5 2.6 1.5s1.9-.5 2.6-1.5"/><circle class="f" cx="5.9" cy="6.5" r=".9"/><circle class="f" cx="10.1" cy="6.5" r=".9"/></svg>';
  const ICON_CODE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.2 4.3 1.6 8l3.6 3.7M10.8 4.3 14.4 8l-3.6 3.7M9.2 2.8 6.8 13.2"/></svg>';

  function frameHTML() {
    return `<div class="mb open chat in"><div class="mb-border"></div>` +
      `<div class="mb-head" title="Drag to move"><span class="mb-tag">CHAT</span><span class="mb-who"></span><span class="mb-time mb-sub"></span>` +
      `<button class="mb-x" data-act="close" title="Close (esc)">×</button></div>` +
      `<div class="mb-switch"></div><div class="mb-note" hidden></div><div class="mb-list"></div>` +
      `<div class="mb-gone" hidden>you're not friends anymore · messages won't be delivered</div>` +
      `<div class="mb-reply" hidden><span class="mb-reply-t"><b></b><small></small></span><button class="mb-x" data-act="unreply" title="Don't reply (esc)">×</button></div>` +
      `<div class="mb-codebar" hidden><span class="mb-codebar-t">&lt;/&gt; code</span><select class="mb-lang" title="The code's language"></select>` +
      `<span class="mb-codebar-k">⌘↩ send · ↩ new line</span><button data-act="astext" title="Send it as plain text">send as text</button></div>` +
      `<div class="mb-suggest" hidden></div><div class="mb-emoji" hidden></div>` +
      `<div class="mb-input"><span class="pr">$</span><textarea rows="1" maxlength="${TEXT_MAX}" spellcheck="false"></textarea>` +
      `<button class="mb-tool" data-act="emoji" title="Emoji (type : and a name, too)" aria-label="Emoji">${ICON_EMOJI}</button>` +
      `<button class="mb-tool" data-act="code" title="Code: kept as it is, coloured, with a Copy button" aria-label="Code">${ICON_CODE}</button>` +
      `<button class="send" data-act="send" disabled>send</button></div>` +
      `<div class="mb-menu" hidden></div><div class="mb-sc" hidden></div><div class="mb-toast" hidden></div></div>`;
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
    if (current !== id) clearDraft();
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
    paintList({ stick: true });
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

  // ---------- end-to-end encryption, as this chat shows it ----------
  const myKeys = () => Social.e2ee() || {};
  // Whether a message to this friend goes sealed: they have a key, and so does this computer.
  const sealing = (f) => !!(f && f.e2ee && myKeys().phase === 'ready');
  const changedCode = (f) => !!(f && (myKeys().friends?.[f.id]?.changed ?? f.sc?.changed));

  // The line above the conversation: their security code changed, messages locked here, or not encrypted yet.
  function paintNote(f) {
    const note = q('.mb-note');
    let html = '', cls = '';
    if (f && changedCode(f)) {
      cls = 'warn';
      html = `<span>⚠ ${esc(f.nick || f.name)}'s security code changed</span><button data-act="sc">check it</button><button data-act="scok">ok</button>`;
    } else if (f && f.e2ee && myKeys().phase === 'locked') {
      cls = 'lock';
      html = '<span>🔒 Messages are locked on this computer · approve it from your other computer, or enter your recovery key in Settings · Account</span>';
    } else if (f && !f.e2ee) {
      cls = 'open';
      html = `<span>🔓 ${esc(f.nick || f.name)} hasn't updated Orbiterm yet · messages to them aren't end-to-end encrypted</span>`;
    }
    note.hidden = !html;
    note.className = `mb-note ${cls}`;
    if (note.__html !== html) note.innerHTML = note.__html = html;
  }

  // A friend's security code: the same 60 digits on both screens means nobody reads along.
  async function showCode() {
    const f = Social.friend(current);
    const box = q('.mb-sc');
    if (!f || !box) return;
    const r = await Social.keys('code', { id: f.id });
    if (!isOpen || current !== f.id) return;
    if (!r || r.error) {
      box.innerHTML = `<div class="mb-sc-in"><b>Security code</b><p>${r && r.error === 'no_key' ? `${esc(f.name)} has no key yet.` : "Couldn't get it right now."}</p>` +
        '<div class="mb-actions"><button data-act="scclose">close</button></div></div>';
      box.hidden = false;
      return;
    }
    const groups = r.code.match(/.{5}/g) || [];
    const rows = [0, 4, 8].map((i) => `<div>${groups.slice(i, i + 4).join(' ')}</div>`).join('');
    box.innerHTML =
      `<div class="mb-sc-in"><b>Security code with ${esc(f.nick || f.name)}</b>` +
      `<div class="mb-sc-code">${rows}</div>` +
      `<p>Compare it with ${esc(f.name)}'s screen, side by side or on a call. If it's the same, your messages go only to the two of you; nobody in between, the server included, can read them.</p>` +
      `<div class="mb-actions">${r.verified ? '<span class="mb-sc-ok">✓ checked</span><button data-act="scun">not checked</button>' : '<button class="go" data-act="scyes">it\'s the same</button>'}` +
      '<button data-act="scclose">close</button></div></div>';
    box.hidden = false;
    if (changedCode(f)) Social.keys('seen', { id: f.id });
  }

  function paint(stick) {
    if (!isOpen) return;
    const f = Social.friend(current);
    const c = conv(current);
    if (f) c.name = Social.label(f);
    q('.mb-who').innerHTML = f ? who(f) : `<span>${esc(c.name)}</span>`;
    const sub = q('.mb-time');
    const subHTML = f
      ? `${esc(Social.PRESENCE[f.presence || 'offline'].label)}${sealing(f) ? ' · <button class="mb-lock" data-act="sc" title="End-to-end encrypted: only the two of you can read these messages. Click to see the security code.">🔒 encrypted</button>' : ''}`
      : '';
    if (sub.__html !== subHTML) sub.innerHTML = sub.__html = subHTML;
    // Removed from friends: the conversation stays on screen, but nothing more goes out.
    q('.mb-gone').hidden = !!f;
    paintNote(f);
    const ta = q('.mb-input textarea');
    ta.disabled = !f;
    ta.placeholder = !f ? 'not friends anymore' : draft.code ? 'paste or write code…' : `message ${f.name}…`;
    grow(ta);
    // Other conversations with unread messages, one click away.
    const others = (Social.state()?.friends || []).filter((x) => x.id !== current && x.unread);
    const sw = others
      .map((x) => `<button data-act="switch" data-id="${esc(x.id)}">${Social.dot(x.presence)}${esc(x.name)} <i class="cnt hot">${x.unread}</i></button>`)
      .join('');
    const switcher = q('.mb-switch');
    if (switcher.__html !== sw) switcher.innerHTML = switcher.__html = sw;
    paintList({ stick });
  }

  // ---------- a message's text: code blocks, `inline code`, quoted lines ----------
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const LANGS = ['bash', 'c', 'cpp', 'csharp', 'css', 'diff', 'go', 'java', 'javascript', 'json', 'kotlin', 'markdown', 'php', 'python', 'ruby', 'rust', 'sql', 'swift', 'typescript', 'xml', 'yaml'];
  const LANG_NAMES = { cpp: 'C++', csharp: 'C#', javascript: 'JavaScript', typescript: 'TypeScript', xml: 'HTML / XML', bash: 'Shell', json: 'JSON', sql: 'SQL', css: 'CSS', php: 'PHP', yaml: 'YAML', go: 'Go', c: 'C', diff: 'diff' };
  const langName = (l) => LANG_NAMES[l] || (l ? l[0].toUpperCase() + l.slice(1) : '');
  const hl = () => window.hljs;
  // The language of some code: telltale lines first (short snippets fool a statistical guess), then highlight.js's guess
  // when it's sure enough. Nothing rather than a wrong name.
  const TELLS = [
    ['go', /^\s*package \w+|\w+ := |^\s*func \(\w+ \*?\w+\) /m],
    ['swift', /^\s*(import (Foundation|SwiftUI|AppKit|UIKit|Combine)\b|guard let |@MainActor|@State |func \w+\(.*\)\s*(->|async|throws))/m],
    ['python', /^\s*(def \w+\(|from [\w.]+ import |import \w+$|elif |print\()/m],
    ['rust', /^\s*(fn \w+|let mut |impl |use \w+::|pub fn )/m],
    ['typescript', /^\s*(interface \w+|type \w+ = |.*: (string|number|boolean)\b[;,)=])/m],
    ['javascript', /^\s*(const |let |var |function |import .* from |export |module\.exports|.*=> )/m],
    ['java', /^\s*(public (static )?(class|void)|System\.out\.)/m],
    ['kotlin', /^\s*(fun \w+|val \w+ =)/m],
    ['php', /<\?php/],
    ['cpp', /^\s*#include\s*<\w+(\.h)?>|std::/m],
    ['sql', /^\s*(select .+ from |insert into |update \w+ set |create table |delete from )/im],
    ['xml', /^\s*<(\w+|!doctype)[^>]*>/im],
    ['bash', /^\s*(\$ |sudo |npm |npx |git |cd |ls |echo |brew |curl |docker |export \w+=)/m],
    ['yaml', /^[\w-]+:( |$)[^{]*\n[\w-]+:( |$)/m],
  ];
  const guessLang = (code) => {
    const t = code.trim();
    if (!t || t.length > 20000) return '';
    if (/^[[{]/.test(t)) {
      try {
        JSON.parse(t);
        return 'json';
      } catch {}
    }
    const tell = TELLS.find(([, re]) => re.test(t));
    if (tell) return tell[0];
    if (!hl()) return '';
    const r = hl().highlightAuto(t, LANGS);
    return r.relevance >= 6 ? r.language || '' : '';
  };
  // Pasted text that is code: most of its lines look like code, not like sentences.
  const looksLikeCode = (t) => {
    const lines = t.replace(/\s+$/, '').split('\n').filter((l) => l.trim());
    if (lines.length < 2) return false;
    const codey = lines.filter((l) => /[{}();=<>[\]]|^\s{2,}\S|^\t|^\s*(def|class|import|from|function|const|let|var|return|if|for|while|#include|public|private|fn|func|package|select|insert|update|echo|export)\b/i.test(l)).length;
    return codey / lines.length >= 0.5;
  };

  function codeBlock(code, lang) {
    const known = lang && hl() && hl().getLanguage(lang) ? lang : '';
    const shown = known || guessLang(code);
    const box = el('div', 'mb-code');
    box.__code = code;
    const head = el('div', 'mb-code-h');
    head.append(el('span', '', langName(shown) || 'code'));
    const copy = el('button', 'mb-copy', 'Copy');
    copy.dataset.act = 'copy';
    copy.title = 'Copy the code';
    head.append(copy);
    const pre = el('pre');
    const codeEl = el('code', 'hljs');
    // highlight.js gives the code back escaped, in coloured spans.
    if (shown && hl()) codeEl.innerHTML = hl().highlight(code, { language: shown, ignoreIllegals: true }).value;
    else codeEl.textContent = code;
    pre.append(codeEl);
    box.append(head, pre);
    const lines = code.split('\n').length;
    if (lines > 15) {
      box.classList.add('long');
      const more = el('button', 'mb-code-more', `Show all (${lines} lines)`);
      more.dataset.act = 'expand';
      box.append(more);
    }
    return box;
  }

  function inline(parent, text) {
    const parts = text.split(/(`[^`\n]+`)/);
    for (const p of parts) {
      if (!p) continue;
      if (p.length > 2 && p[0] === '`' && p[p.length - 1] === '`') parent.append(el('code', 'mb-ic', p.slice(1, -1)));
      else parent.append(document.createTextNode(p));
    }
  }

  function textPart(parent, text) {
    const lines = text.split('\n');
    let quote = null;
    lines.forEach((line, i) => {
      if (/^> /.test(line)) {
        if (!quote) parent.append((quote = el('div', 'mb-q')));
        else quote.append(document.createTextNode('\n'));
        inline(quote, line.slice(2));
        return;
      }
      quote = null;
      inline(parent, line);
      if (i < lines.length - 1) parent.append(document.createTextNode('\n'));
    });
  }

  function renderBody(parent, text) {
    const re = /```([A-Za-z0-9_+#.-]*)[ \t]*\n?([\s\S]*?)```/g;
    let at = 0;
    let m;
    while ((m = re.exec(text))) {
      const before = text.slice(at, m.index).replace(/\n$/, '');
      if (before) textPart(parent, before);
      parent.append(codeBlock(m[2].replace(/\n$/, ''), m[1].toLowerCase()));
      at = re.lastIndex;
      if (text[at] === '\n') at++;
    }
    const rest = text.slice(at);
    if (rest) textPart(parent, rest);
  }

  // One to three emoji and nothing else: shown big, as WhatsApp and Discord do.
  const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const onlyEmoji = (t) => {
    const s = (t || '').replace(/\s+/g, '');
    if (!s || !seg || s.length > 40) return false;
    const g = [...seg.segment(s)].map((x) => x.segment);
    return g.length <= 3 && g.every((x) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(x));
  };

  // What a message is, in one line: for the reply strip and the quote above a reply.
  const preview = (m) => {
    const body = m.body || '';
    const code = /```([A-Za-z0-9_+#.-]*)/.exec(body);
    const text = body.replace(/```[\s\S]*?(```|$)/g, ' ').replace(/^> .*$/gm, '').replace(/\s+/g, ' ').trim();
    if (code && !text) return `</> ${langName(code[1].toLowerCase()) || 'code'}`;
    return (text || (code ? '</> code' : '')).slice(0, 100);
  };

  // ---------- the list ----------
  const DAYS = { today: 'TODAY', yesterday: 'YESTERDAY' };
  const dayLabel = (at) => {
    const d = new Date(at).toDateString();
    if (d === new Date().toDateString()) return DAYS.today;
    if (d === new Date(Date.now() - 864e5).toDateString()) return DAYS.yesterday;
    return new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
  };
  const NOTES = {
    not_friends: "not delivered · you're not friends",
    locked: 'not sent · approve this computer first (Settings · Account)',
    key_missing: "not sent · their key is missing · click to retry",
    too_long: 'not sent · too long',
  };
  const stateNote = (m) => (m.state === 'failed' ? NOTES[m.error] || 'not sent · click to retry' : time(m.at));
  const canRetry = (m) => m.state === 'failed' && m.error !== 'not_friends' && m.error !== 'too_long';

  // A message's row. Its content is made once; `stateOf` and its classes change in place.
  function messageRow(m) {
    const row = el('div', `mb-msg${m.mine ? ' mine' : ''}`);
    const b = el('div', 'b');
    if (m.reply) {
      const who = m.reply.who === 'me' ? 'You' : Social.friend(current)?.name || 'them';
      const qb = el('button', 'mb-quote');
      qb.dataset.act = 'jump';
      qb.dataset.key = m.reply.uuid;
      qb.title = 'Show that message';
      qb.append(el('b', '', who), el('span', '', m.reply.text || '…'));
      b.append(qb);
    }
    if (m.enc === 'locked') {
      row.classList.add('locked');
      b.append(el('span', 'mb-lockmsg', "🔒 can't open this on this computer yet · approve it from your other computer, or enter your recovery key in Settings · Account"));
    } else if (m.enc === 'bad') {
      row.classList.add('bad');
      b.append(el('span', 'mb-lockmsg', "⚠ this message didn't open · it may have been changed on the way"));
    } else {
      renderBody(b, m.body || '');
      if (!m.reply && onlyEmoji(m.body)) row.classList.add('jumbo');
    }
    const t = el('div', 't');
    t.append(el('span', 'mb-when'));
    const rep = el('button', 'mb-rep', '↩ reply');
    rep.dataset.act = 'reply';
    rep.title = 'Reply to this message';
    t.append(rep);
    row.append(b, t);
    return row;
  }

  function stateRow(row, m) {
    row.classList.toggle('sending', m.state === 'sending');
    row.classList.toggle('failed', m.state === 'failed');
    row.classList.toggle('canreply', !m.state && m.enc !== 'locked' && m.enc !== 'bad');
    const b = row.firstElementChild;
    if (canRetry(m)) {
      b.dataset.act = 'retry';
      b.dataset.key = keyOf(m);
    } else {
      delete b.dataset.act;
      delete b.dataset.key;
    }
    const when = row.querySelector('.mb-when');
    const note = stateNote(m);
    if (when.textContent !== note) when.textContent = note;
  }

  // What a row shows: a different one (opened now, edited by the server's answer) means a new row.
  const contentOf = (m) => `${m.mine ? 1 : 0}|${m.enc}|${m.body}|${m.reply ? `${m.reply.uuid}|${m.reply.who}|${m.reply.text}` : ''}`;

  /**
   * Draws the conversation: rows already on screen stay, new ones go in, gone ones go out. `stick` keeps the newest in
   * view; `fresh` names the messages that just arrived (they slide in).
   */
  function paintList({ stick = false, fresh = null } = {}) {
    const list = q('.mb-list');
    if (!list) return;
    const c = conv(current);
    if (list.__for !== current) {
      list.textContent = '';
      list.__for = current;
      list.__rows = new Map();
    }
    const rows = list.__rows;
    const near = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
    const items = [];
    if (c.more) items.push({ key: 'more', make: () => Object.assign(el('button', 'mb-more', 'earlier messages'), { title: 'Show earlier messages' }), sig: 'more' });
    if (c.loaded && !c.list.length) {
      const name = Social.friend(current)?.name || '';
      items.push({ key: 'empty', make: () => el('div', 'mb-empty', `no messages yet · say hi to ${name}`), sig: name });
    }
    let day = '';
    let sealedSeen = false;
    for (const m of c.list) {
      const d = dayLabel(m.at);
      if (d !== day) {
        day = d;
        items.push({ key: `day:${new Date(m.at).toDateString()}`, make: () => el('div', 'mb-day', d), sig: d });
      }
      if (!sealedSeen && m.enc === true) {
        sealedSeen = true;
        items.push({ key: 'sealed', make: () => el('div', 'mb-sealed', '🔒 Messages from here on are end-to-end encrypted: only the two of you can read them'), sig: 's' });
      }
      items.push({ key: keyOf(m), make: () => messageRow(m), sig: contentOf(m), m });
    }
    const want = new Set(items.map((i) => i.key));
    for (const [k, n] of rows) {
      if (want.has(k)) continue;
      n.remove();
      rows.delete(k);
    }
    let prev = null;
    for (const it of items) {
      let n = rows.get(it.key);
      if (!n || n.__sig !== it.sig) {
        const made = it.make();
        made.__sig = it.sig;
        made.dataset.key = it.key;
        if (it.key === 'more') made.dataset.act = 'more';
        if (n) n.replaceWith(made);
        else if (it.m && fresh && fresh.has(it.key)) {
          made.classList.add('new');
          made.addEventListener('animationend', () => made.classList.remove('new'), { once: true });
        }
        rows.set(it.key, made);
        n = made;
      }
      if (it.m) stateRow(n, it.m);
      const at = prev ? prev.nextSibling : list.firstChild;
      if (at !== n) list.insertBefore(n, at);
      prev = n;
    }
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
    c.list = [...r.messages, ...pending.filter((p) => !r.messages.some((m) => keyOf(m) === keyOf(p)))];
    c.more = r.more;
    c.loaded = true;
  }

  async function loadMore() {
    const c = conv(current);
    const first = c.list.find((m) => typeof m.id === 'number');
    if (!first) return false;
    const list = q('.mb-list');
    const from = list.scrollHeight - list.scrollTop;
    const r = await Social.history(current, first.id);
    if (r.error) return false;
    const have = new Set(c.list.map(keyOf));
    c.list = [...r.messages.filter((m) => !have.has(keyOf(m))), ...c.list];
    c.more = r.more;
    paintList();
    list.scrollTop = list.scrollHeight - from;
    return true;
  }

  // A quote was clicked: its message, brought into view for a moment (earlier pages loaded if it's further back).
  async function jump(key) {
    const list = q('.mb-list');
    for (let i = 0; i < 6; i++) {
      const row = list.__rows && list.__rows.get(key);
      if (row) {
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        row.classList.remove('flash');
        void row.offsetWidth;
        row.classList.add('flash');
        return;
      }
      if (!conv(current).more || !(await loadMore())) break;
    }
    flash("that message is further back than the chat goes");
  }

  // ---------- writing ----------
  function setReply(m) {
    const f = Social.friend(current);
    draft.reply = { uuid: keyOf(m), mine: !!m.mine, text: preview(m) };
    const strip = q('.mb-reply');
    strip.querySelector('b').textContent = m.mine ? 'Replying to yourself' : `Replying to ${f ? f.nick || f.name : 'them'}`;
    strip.querySelector('small').textContent = draft.reply.text || '…';
    strip.hidden = false;
    q('.mb-input textarea').focus();
  }

  function clearReply() {
    draft.reply = null;
    const strip = win && q('.mb-reply');
    if (strip) strip.hidden = true;
  }

  function setCode(on, text) {
    draft.code = on;
    const ta = q('.mb-input textarea');
    const bar = q('.mb-codebar');
    if (!ta || !bar) return;
    win.firstElementChild.classList.toggle('coding', on);
    ta.maxLength = on ? CODE_MAX : TEXT_MAX;
    if (text != null) ta.value = text;
    if (on) {
      const sel = q('.mb-lang');
      if (!sel.options.length) {
        sel.innerHTML = '<option value="">guess the language</option>' + LANGS.map((l) => `<option value="${l}">${esc(langName(l))}</option>`).join('');
      }
      draft.lang = text ? guessLang(text) : draft.lang;
      sel.value = draft.lang;
    } else draft.lang = '';
    bar.hidden = !on;
    q('[data-act=code]').classList.toggle('on', on);
    const f = Social.friend(current);
    ta.placeholder = !f ? 'not friends anymore' : on ? 'paste or write code…' : `message ${f.name}…`;
    grow(ta);
    ta.focus();
  }

  function clearDraft() {
    if (!win || !q('.mb-input')) return;
    clearReply();
    if (draft.code) setCode(false);
    hideEmoji();
    hideSuggest();
  }

  function send() {
    const ta = q('.mb-input textarea');
    if (!ta || !current || ta.disabled) return;
    let text = ta.value;
    if (!text.trim()) return;
    if (draft.code) {
      const code = text.replace(/\s+$/, '').replace(/^\n+/, '');
      text = '```' + (draft.lang || guessLang(code)) + '\n' + code + '\n```';
    } else text = text.trim();
    const out = draft.reply ? { ...draft.reply } : null;
    const temp = {
      uuid: Social.uuid(), mine: true, body: text, at: new Date().toISOString(), state: 'sending',
      enc: sealing(Social.friend(current)), reply: out && { uuid: out.uuid, who: out.mine ? 'me' : 'them', text: out.text }, out,
    };
    ta.value = '';
    clearReply();
    if (draft.code) setCode(false);
    hideSuggest();
    grow(ta);
    conv(current).list.push(temp);
    paintList({ stick: true, fresh: new Set([keyOf(temp)]) });
    Sfx.play('send');
    deliver(temp, current);
  }

  async function deliver(temp, to) {
    temp.state = 'sending';
    if (isOpen && current === to) paintList();
    const r = await Social.send(to, temp.body, { uuid: temp.uuid, reply: temp.out });
    const c = conv(to);
    if (r.error) {
      temp.state = 'failed';
      temp.error = r.error;
    } else {
      // The live echo of this message may already be in the list (the same uuid): keep this one.
      c.list = c.list.filter((m) => m === temp || keyOf(m) !== keyOf(r.message));
      Object.assign(temp, r.message, { state: null, error: null });
    }
    if (isOpen && current === to) paintList();
  }

  // Messages that failed while offline (or before this computer had its key) go out again once that's over.
  function retryFailed(keys) {
    const again = (e) => e === 'offline' || e === 'e2ee_starting' || (keys && e === 'locked');
    for (const [id, c] of convs) for (const m of c.list) if (m.state === 'failed' && again(m.error)) deliver(m, id);
  }

  // ---------- emoji: the picker, and :name: while typing ----------
  const RECENT_KEY = 'msgEmojiRecent';
  const recent = () => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch {
      return [];
    }
  };
  const remember = (e) => {
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify([e, ...recent().filter((x) => x !== e)].slice(0, 24)));
    } catch {}
  };
  const EMO = () => (window.EMOJI ? window.EMOJI.list : []);

  function insertAtCaret(text, from, to) {
    const ta = q('.mb-input textarea');
    const s = from ?? ta.selectionStart, e = to ?? ta.selectionEnd;
    ta.setRangeText(text, s, e, 'end');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
  }

  function pickEmoji(e) {
    remember(e);
    insertAtCaret(e);
  }

  function emojiCells(list) {
    return list.map((x) => `<button class="mb-e" data-act="pick" data-e="${esc(x[1])}" title="${esc(x[2])}">${x[1]}</button>`).join('');
  }

  function showEmoji() {
    const box = q('.mb-emoji');
    if (!box || !window.EMOJI) return;
    hideSuggest();
    const groups = window.EMOJI.groups;
    const firsts = groups.map((_, i) => EMO().find((x) => x[0] === i)?.[1] || '·');
    const rec = recent();
    box.innerHTML =
      '<div class="mb-e-top"><input class="mb-e-find" type="text" spellcheck="false" placeholder="find an emoji (fire, heart, laugh…)">' +
      '<button class="mb-x" data-act="emojiclose" title="Close (esc)">×</button></div>' +
      `<div class="mb-e-tabs">${rec.length ? '<button data-act="etab" data-g="r" title="Recent">🕘</button>' : ''}${firsts.map((f, i) => `<button data-act="etab" data-g="${i}" title="${esc(groups[i])}">${f}</button>`).join('')}</div>` +
      '<div class="mb-e-grid">' +
      (rec.length ? `<div class="mb-e-h" data-g="r">Recent</div><div class="mb-e-cells">${rec.map((e) => `<button class="mb-e" data-act="pick" data-e="${esc(e)}">${e}</button>`).join('')}</div>` : '') +
      groups.map((g, i) => `<div class="mb-e-h" data-g="${i}">${esc(g)}</div><div class="mb-e-cells">${emojiCells(EMO().filter((x) => x[0] === i))}</div>`).join('') +
      '</div>';
    box.hidden = false;
    q('[data-act=emoji]').classList.add('on');
    box.querySelector('.mb-e-find').focus();
  }

  function hideEmoji() {
    const box = win && q('.mb-emoji');
    if (!box || box.hidden) return false;
    box.hidden = true;
    box.innerHTML = '';
    q('[data-act=emoji]')?.classList.remove('on');
    return true;
  }

  const matches = (x, words) => {
    const hay = `${x[2]} ${x[3]} ${x[4]}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  };

  function findEmoji(text) {
    const box = q('.mb-emoji');
    const grid = box.querySelector('.mb-e-grid');
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return showEmoji();
    const hits = EMO().filter((x) => matches(x, words)).slice(0, 160);
    grid.innerHTML = hits.length ? `<div class="mb-e-cells">${emojiCells(hits)}</div>` : '<div class="mb-e-none">no emoji by that name</div>';
  }

  // `:fi` → the emoji whose short name or name starts with it, the best first.
  let suggested = [];
  let suggestAt = 0;
  function suggest() {
    const ta = q('.mb-input textarea');
    const box = q('.mb-suggest');
    if (!ta || !box || draft.code) return hideSuggest();
    const before = ta.value.slice(0, ta.selectionStart);
    const m = /(^|\s):([a-z0-9_+-]{2,})$/i.exec(before);
    if (!m) return hideSuggest();
    const w = m[2].toLowerCase();
    // An exact short name first, then names starting with it, the shortest (the closest) first.
    const score = (x) => {
      const codes = x[4].split(' ').filter(Boolean);
      const best = (words) => Math.min(...words.filter((p) => p.startsWith(w)).map((p) => p.length), 99);
      if (codes.includes(w)) return 0;
      const c = best(codes);
      if (c < 99) return 100 + c;
      const n = best(x[2].toLowerCase().split(/\s+/));
      if (n < 99) return 200 + n;
      const k = best(x[3].toLowerCase().split(/\s+/));
      return k < 99 ? 300 + k : 999;
    };
    suggested = EMO().map((x) => [score(x), x]).filter((s) => s[0] < 999).sort((a, b) => a[0] - b[0]).slice(0, 6).map((s) => s[1]);
    if (!suggested.length) return hideSuggest();
    suggestAt = Math.min(suggestAt, suggested.length - 1);
    box.__from = before.length - m[2].length - 1;
    box.innerHTML = suggested
      .map((x, i) => `<button class="${i === suggestAt ? 'on' : ''}" data-act="sugg" data-i="${i}"><span>${x[1]}</span>${esc(x[4].split(' ')[0] || x[2])}</button>`)
      .join('') + '<small>↩ or tab to pick</small>';
    box.hidden = false;
  }

  function hideSuggest() {
    const box = win && q('.mb-suggest');
    suggested = [];
    suggestAt = 0;
    if (!box || box.hidden) return false;
    box.hidden = true;
    return true;
  }

  function takeSuggest(i) {
    const x = suggested[i];
    const box = q('.mb-suggest');
    if (!x || !box) return;
    const ta = q('.mb-input textarea');
    remember(x[1]);
    insertAtCaret(x[1] + ' ', box.__from, ta.selectionStart);
    hideSuggest();
  }

  // ---------- the right-click menu on a message ----------
  function showMenu(x, y, row) {
    const menu = q('.mb-menu');
    const m = conv(current).list.find((v) => keyOf(v) === row.dataset.key);
    if (!menu || !m) return;
    const code = row.querySelector('.mb-code');
    menu.innerHTML =
      (row.classList.contains('canreply') ? '<button data-act="mreply">↩ Reply</button>' : '') +
      (m.body && m.enc !== 'locked' && m.enc !== 'bad' ? '<button data-act="mcopy">Copy text</button>' : '') +
      (code ? '<button data-act="mcode">Copy code</button>' : '');
    if (!menu.innerHTML) return;
    menu.__key = row.dataset.key;
    menu.hidden = false;
    const box = win.firstElementChild.getBoundingClientRect();
    menu.style.left = `${Math.min(x - box.left, box.width - menu.offsetWidth - 8)}px`;
    menu.style.top = `${Math.min(y - box.top, box.height - menu.offsetHeight - 8)}px`;
  }

  function hideMenu() {
    const menu = win && q('.mb-menu');
    if (!menu || menu.hidden) return false;
    menu.hidden = true;
    return true;
  }

  // A word in the chat for a moment (copied, …).
  let flashTimer = 0;
  function flash(text) {
    const t = q('.mb-toast');
    if (!t) return;
    t.textContent = text;
    t.hidden = false;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (t.hidden = true), 1600);
  }

  function copied(btn) {
    if (!btn) return;
    btn.textContent = 'Copied ✓';
    btn.classList.add('done');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('done');
    }, 1500);
  }

  function chatEvent(ev) {
    switch (ev.type) {
      // A nickname set or taken off: the open chat's title follows.
      case 'nickname':
        if (ev.id === current) paint();
        break;
      case 'message': {
        const c = convs.get(ev.with);
        const m = ev.message;
        let fresh = null;
        if (c && c.loaded) {
          const had = c.list.find((x) => keyOf(x) === keyOf(m) || (m.id && x.id === m.id));
          // Your own message on its way: its send fills it in. Otherwise the server's copy is the one.
          if (had) {
            if (!had.state) Object.assign(had, m);
          } else {
            c.list.push(m);
            fresh = new Set([keyOf(m)]);
          }
        }
        if (!isOpen) return;
        if (current === ev.with) {
          paintList({ fresh });
          if (!m.mine) {
            Sfx.play('message');
            Social.read(ev.with);
          }
        } else paint();
        return;
      }
      case 'e2ee_state':
        if (ev.phase === 'ready') {
          // This computer got its key (approved, recovered): what couldn't open is asked for again, what couldn't go goes.
          for (const c of convs.values()) if (c.list.some((m) => m.enc === 'locked')) c.loaded = false;
          if (isOpen && current && !conv(current).loaded) load(current).then(() => isOpen && paintList());
          retryFailed(true);
        }
        if (isOpen) paint();
        return;
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
      if (!e.target.closest('.mb-menu')) hideMenu();
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
    win.addEventListener('contextmenu', (e) => {
      const row = e.target.closest('.mb-msg');
      e.preventDefault();
      if (row) showMenu(e.clientX, e.clientY, row);
    });
    win.addEventListener('click', (e) => {
      const el2 = e.target.closest('[data-act]');
      if (!el2) return;
      const act = el2.dataset.act;
      const ta = q('.mb-input textarea');
      switch (act) {
        case 'close':
          return close();
        case 'switch':
          return open(el2.dataset.id);
        case 'more':
          return loadMore();
        case 'send':
          return send();
        case 'retry': {
          const m = conv(current).list.find((x) => keyOf(x) === el2.dataset.key);
          if (m) deliver(m, current);
          return;
        }
        case 'reply': {
          const row = el2.closest('.mb-msg');
          const m = row && conv(current).list.find((x) => keyOf(x) === row.dataset.key);
          return m && setReply(m);
        }
        case 'unreply':
          return clearReply();
        case 'jump':
          return jump(el2.dataset.key);
        case 'copy': {
          const box = el2.closest('.mb-code');
          if (!box) return;
          post({ type: 'copyText', text: box.__code });
          return copied(el2);
        }
        case 'expand':
          el2.closest('.mb-code')?.classList.remove('long');
          return el2.remove();
        case 'code':
          return setCode(!draft.code, draft.code ? null : ta.value.trim() ? ta.value : null);
        case 'astext':
          return setCode(false);
        case 'emoji':
          return hideEmoji() || showEmoji();
        case 'emojiclose':
          hideEmoji();
          return ta.focus();
        case 'pick':
          return pickEmoji(el2.dataset.e);
        case 'etab': {
          const h = q(`.mb-e-h[data-g="${el2.dataset.g}"]`);
          if (!h) {
            q('.mb-e-find').value = '';
            showEmoji();
            q(`.mb-e-h[data-g="${el2.dataset.g}"]`)?.scrollIntoView({ block: 'start' });
          } else h.scrollIntoView({ block: 'start' });
          return;
        }
        case 'sugg':
          return takeSuggest(Number(el2.dataset.i));
        case 'mreply': {
          const m = conv(current).list.find((x) => keyOf(x) === q('.mb-menu').__key);
          hideMenu();
          return m && setReply(m);
        }
        case 'mcopy': {
          const m = conv(current).list.find((x) => keyOf(x) === q('.mb-menu').__key);
          hideMenu();
          if (m) post({ type: 'copyText', text: m.body });
          return flash('copied');
        }
        case 'mcode': {
          const row = q(`.mb-msg[data-key="${CSS.escape(q('.mb-menu').__key)}"]`);
          hideMenu();
          const codes = row ? [...row.querySelectorAll('.mb-code')].map((b) => b.__code) : [];
          if (codes.length) post({ type: 'copyText', text: codes.join('\n\n') });
          return flash('code copied');
        }
        case 'sc':
          return showCode();
        case 'scok':
          return Social.keys('seen', { id: current });
        case 'scyes':
        case 'scun':
          return Social.keys('verify', { id: current, on: act === 'scyes' }).then(showCode);
        case 'scclose':
          q('.mb-sc').hidden = true;
          return ta.focus();
      }
    });
    win.addEventListener('input', (e) => {
      if (e.target.matches('.mb-e-find')) return findEmoji(e.target.value);
      if (!e.target.matches('textarea')) return;
      grow(e.target);
      suggest();
    });
    win.addEventListener('change', (e) => {
      if (e.target.matches('.mb-lang')) draft.lang = e.target.value;
    });
    win.addEventListener('keydown', (e) => {
      if (e.target.matches('.mb-e-find')) {
        if (e.key === 'Enter') {
          const first = q('.mb-emoji .mb-e');
          if (first) pickEmoji(first.dataset.e);
          e.preventDefault();
        }
        return;
      }
      if (!e.target.matches('textarea')) return;
      if (suggested.length) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          suggestAt = (suggestAt + (e.key === 'ArrowDown' ? 1 : suggested.length - 1)) % suggested.length;
          e.preventDefault();
          return suggest();
        }
        if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          return takeSuggest(suggestAt);
        }
      }
      if (draft.code) {
        // Code: Tab indents, Enter is a new line, ⌘↩ sends.
        if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          return insertAtCaret('  ');
        }
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.isComposing) {
          e.preventDefault();
          return send();
        }
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        send();
      }
    });
    win.addEventListener('keyup', (e) => {
      if (e.target.matches('textarea') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) suggest();
    });
  }

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (CHAT && isOpen) {
      // The nearest thing first: a menu, the emoji, a suggestion, the security code, code mode, the reply; then the chat.
      if (hideMenu() || hideEmoji() || hideSuggest()) return;
      const sc = q('.mb-sc');
      if (sc && !sc.hidden) return void (sc.hidden = true);
      if (draft.code) return setCode(false);
      if (draft.reply) return clearReply();
      close();
    } else if (NOTICES && peek) hidePeek();
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
    // Code pasted into an empty chat box: it goes as code (send as text undoes it).
    if (CHAT && ta.closest('#chatwin') && !draft.code && !ta.value.trim() && looksLikeCode(text)) {
      setCode(true, text.replace(/\s+$/, ''));
      return true;
    }
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
