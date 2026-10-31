'use strict';

// Hacker name (asked once, on first launch), the main menu (your profile, friends, the leaderboard, requests,
// settings, your status) and app updates. Your level and rank (xp.js) show in the top bar and on your profile. Names can repeat: the API gives every Mac a
// tag (#0427) and name + tag is unique, like Discord. In the app, Swift's Cloud talks to the API,
// pushes its state through window.__radar.cloud and answers the page through the "cloud" handler (with replies).
// In staging the server proxies the same calls and the page asks for the state every half minute.
window.Cloud = (() => {
  const h = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.cloud;
  const call = (type, payload) =>
    h
      ? h.postMessage(Object.assign({ type }, payload || {}))
      : fetch(`/api/cloud/${type}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-radar': '1' },
          body: JSON.stringify(payload || {}),
        }).then((r) => r.json());
  const MAX = 16;
  const ERRORS = {
    name_full: 'too many hackers use this name · try another',
    offline: "can't reach the server · try again",
    unauthorized: 'this Mac lost its sign-in · restart the app',
    app_only: 'updates install in the app, not in staging',
  };
  const errorText = (code) => ERRORS[code] || `didn't work (${code})`;
  // The app moves the chat windows pinned above the dashboard out of the way while a menu is open.
  const tellModal = (open) => {
    try {
      window.webkit.messageHandlers.radar.postMessage({ type: 'modal', open });
    } catch {}
  };
  const tagText = (t) => (t ? `#${String(t).padStart(4, '0')}` : '');
  // A download arrow over a tray; while an update downloads, the arrow keeps dropping into the tray.
  // A speech bubble: beside the main menu, it opens the feedback window.
  const BUBBLE = '<svg viewBox="0 0 24 24"><path d="M5 4.5h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-7.5L6.5 21v-4H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z"/><circle cx="8.2" cy="10.8" r="1.1"/><circle cx="12" cy="10.8" r="1.1"/><circle cx="15.8" cy="10.8" r="1.1"/></svg>';
  const ARROW = '<svg viewBox="0 0 16 16"><path class="ar" d="M8 2.5v7.5M4.6 6.8 8 10.2l3.4-3.4"/><path d="M3 13.5h10"/></svg>';

  let S = null; // latest state
  let modal = null; // 'first' | 'menu' | 'update'
  let tab = 'friends';
  let shownError = null;
  let shownNameError = null;
  let waitFor = null; // { test, then, until }: runs once a state shows the name just sent
  let announced = null; // the build the "update available" notice was shown for
  let feedbackDraft = ''; // the feedback window's text, kept until it's sent

  const root = document.createElement('div');
  root.id = 'cloudui';
  document.body.appendChild(root);
  const q = (sel) => root.querySelector(sel);
  const brand = document.querySelector('.brand');
  const stack = brand.querySelector('.stack');
  // The logo shows what waits for you (unread messages, friend requests) and your status.
  brand.insertAdjacentHTML('afterbegin', '<i class="cnt hot bdg" hidden></i><i class="pdot bme" hidden></i>');

  function render(s) {
    if (!s) return;
    S = s;
    // Long names get tighter letters so the top bar still fits. Over the name: your rank and level once the API told
    // them; under it, how far into the level you are.
    const long = s.hackerName && s.hackerName.length > 11 ? ' class="long"' : '';
    const x = s.xp, r = x && Xp.rank(x.level);
    const title = r ? `<small class="rk" style="--rc:${r.color}">${esc(r.name.toUpperCase())} · LV ${x.level}</small>` : '<small>HACKER</small>';
    const bar = r ? `<i class="xpb" style="--rc:${r.color}"><i style="width:${Xp.pct(x).toFixed(1)}%"></i></i>` : '';
    setHTML(stack, s.hackerName ? `${title}<b${long}>${esc(s.hackerName)}<i class="htag">${tagText(s.tag)}</i></b>${bar}` : "<small>ATALAY'S</small><b>TERMINAL</b>");
    brand.title = r
      ? `Level ${x.level} · ${r.name} · ${x.to ? `${Xp.num(x.xp - x.from)} / ${Xp.num(x.to - x.from)} XP` : `${Xp.num(x.xp)} XP`} · today ${Xp.dur(x.today)}`
      : 'Profile, friends and settings';
    if (waitFor && (Date.now() > waitFor.until || waitFor.test(s))) {
      const w = waitFor;
      waitFor = null;
      if (w.test(s)) w.then(s);
    }
    renderUpdate();
    renderUpdateModal();
    // A newer version than the last one announced: the "update available" notice. Staging shows it on this page; in
    // the app Swift tells the notices panel (this page has no Messages there).
    if (s.update && s.update.build !== announced) {
      announced = s.update.build;
      window.Messages?.update?.(s.update);
    }
    if (s.updateError && s.updateError !== shownError) {
      toast(s.updateError === 'not_writable' ? "can't replace the app where it is · move it to Applications" : 'update failed · try again later');
    }
    shownError = s.updateError;
    // A name picked offline that the API refused once it was back.
    if (s.nameError && s.nameError !== shownNameError) {
      toast(s.nameError === 'name_full' ? "couldn't save your new name · too many hackers use it" : "couldn't save your new name");
    }
    shownNameError = s.nameError;
    if (s.reachable && s.registered === false) openFirst();
    else if (modal === 'first' && s.registered) close();
    if (modal === 'menu') {
      renderInfo();
      renderProfile();
      renderActivity();
    }
    // Staging shows level-ups on this page (the app's notices panel gets them from Swift).
    if (!h && x) window.Messages?.progress?.({ xp: x });
    // Friends and messages need a signed-in Mac.
    if (s.registered && s.reachable && !Social.state()) Social.load();
    badges();
  }

  function renderUpdate() {
    const b = $('update');
    const busy = !!S.updating;
    b.hidden = !(S.update || busy);
    b.disabled = busy;
    b.classList.toggle('busy', busy);
    // Short label so the top bar fits; the version and progress are in the tooltip and in settings.
    setHTML(b, `${ARROW}<span>${busy ? 'updating…' : 'update'}</span>`);
    b.title = busy
      ? S.updating
      : S.update
        ? `Version ${S.update.version} is out · click to see what's new`
        : '';
  }

  async function update() {
    if (!S || !S.update || S.updating) return;
    const r = await call('update').catch(() => ({ error: 'offline' }));
    if (r && r.error) toast(errorText(r.error));
  }

  // ---------- what's new, then install ----------
  // The top bar's update button, the settings row and the "update available" notice open this first: the new version
  // and what changed in it (the release notes, a line each), so nobody restarts the app without knowing why.
  const noteLines = (notes) =>
    String(notes || '')
      .split(/\n+/)
      .map((l) => l.replace(/^\s*[-•*]\s*/, '').trim())
      .filter(Boolean);
  function openUpdate() {
    if (!S || !S.update || modal === 'first' || modal === 'update') return;
    const u = S.update, lines = noteLines(u.notes);
    modal = 'update';
    tellModal(true);
    root.className = 'on';
    root.innerHTML = `
      <div class="pk hk upd crt-on">
        <div class="pk-border"></div>
        <div class="pk-title"><img class="hk-logo" src="logo.png" alt=""><b>UPDATE AVAILABLE</b><span class="for">${esc(S.version || '?')} → ${esc(u.version)}</span></div>
        <div class="hk-body">
          <div class="hk-h">WHAT'S NEW IN ${esc(u.version)}</div>
          <ul class="up-notes">${(lines.length ? lines : ['fixes and improvements']).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
          <p class="hk-status up-status"></p>
        </div>
        <div class="pk-foot"><span class="pk-sel note">restarts the app · chats keep running</span><button class="pk-cancel">later</button><button class="pk-ok up-go">update now</button></div>
      </div>`;
    q('.pk-cancel').onclick = close;
    q('.up-go').onclick = update;
    root.onmousedown = (e) => {
      if (e.target === root && !S.updating) close();
    };
    renderUpdateModal();
  }
  // While it downloads and installs: the progress, and no way out (the app restarts at the end).
  function renderUpdateModal() {
    if (modal !== 'update') return;
    const busy = !!S.updating;
    if (!busy && !S.update) return close();
    const go = q('.up-go'), st = q('.up-status');
    go.disabled = q('.pk-cancel').disabled = busy;
    go.textContent = busy ? 'updating…' : 'update now';
    st.className = `hk-status up-status${busy ? ' ok' : ''}`;
    st.textContent = busy ? S.updating : '';
  }

  // The name's state reaches the page as a push (app) or after a fetch (staging), before or after the call's reply.
  function whenState(test, then) {
    if (S && test(S)) then(S);
    else waitFor = { test, then, until: Date.now() + 10_000 };
  }

  // ---------- name field: live counter, allowed characters ----------
  function nameField(box, own, onReady) {
    const $$ = (sel) => box.querySelector(sel);
    const input = $$('.hk-input'), count = $$('.hk-count'), status = $$('.hk-status'), field = $$('.hk-field'), hint = $$('.hk-hint');
    const set = (cls, msg) => {
      status.className = `hk-status ${cls}`;
      status.textContent = msg;
    };
    const nudge = () => {
      field.classList.remove('shake');
      void field.offsetWidth;
      field.classList.add('shake');
      if (hint) {
        hint.classList.add('flash');
        setTimeout(() => hint.classList.remove('flash'), 900);
      }
    };
    function check() {
      const v = input.value, name = v.trim();
      count.textContent = `${v.length}/${MAX}`;
      count.classList.toggle('full', v.length >= MAX);
      // Settings: the input is as wide as the name, so the tag sits right after it.
      input.style.setProperty('--n', v.length || input.placeholder.length);
      set('', '');
      onReady(name.length >= 2 && name !== own);
    }
    // Letters, digits, _ . - and single spaces between words (a trailing one is fine while typing; it's trimmed).
    input.addEventListener('input', () => {
      const v = input.value;
      const clean = v.replace(/[^A-Za-z0-9_. -]/g, '').replace(/ {2,}/g, ' ').replace(/^ /, '').slice(0, MAX);
      if (clean !== v) {
        const at = Math.max(0, (input.selectionStart || 0) - (v.length - clean.length));
        input.value = clean;
        input.setSelectionRange(at, at);
        nudge();
      }
      check();
    });
    check();
    setTimeout(() => {
      input.focus();
      input.select();
    }, 80);
    return { input, set, nudge };
  }

  // Sends the name; on success the new state arrives (pushed by the app, fetched in staging) and closes the dialog.
  // Offline, the app keeps the name and sends it when the API answers again ("queued").
  function submitter(type, f, ok, done) {
    return async () => {
      if (ok.disabled) return f.nudge();
      const name = f.input.value.trim();
      ok.disabled = true;
      f.set('wait', type === 'register' ? 'registering' : 'saving');
      const r = await call(type, { name }).catch(() => ({ error: 'offline' }));
      if (r.error) {
        f.set('bad', errorText(r.error));
        ok.disabled = r.error !== 'offline';
        return f.nudge();
      }
      if (r.queued) {
        toast("saved on this Mac · syncs when you're back online");
        return close();
      }
      done(name);
      if (!h) refresh();
    };
  }

  // ---------- first launch ----------
  function openFirst() {
    if (modal === 'first') return;
    modal = 'first';
    tellModal(true);
    root.className = 'on first';
    root.innerHTML = `
      <div class="pk hk crt-on">
        <div class="pk-border"></div>
        <div class="pk-title"><img class="hk-logo" src="logo.png" alt=""><b>NEW OPERATOR</b><span class="for">first launch</span></div>
        <div class="hk-body">
          <p class="hk-line dim" style="--n:18;--d:0.25s"><span>&gt; link established</span></p>
          <p class="hk-line" style="--n:29;--d:0.95s"><span>&gt; identify yourself, hacker_</span></p>
          <label class="hk-field"><span class="hk-prompt">$</span><input class="hk-input" maxlength="${MAX}" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="hacker name"><span class="hk-count"></span></label>
          <p class="hk-status"></p>
          <p class="hk-hint">2–${MAX} characters · letters, digits, spaces, _ . - · plus a #tag</p>
        </div>
        <div class="pk-foot"><span class="pk-sel note">no signup · tied to this Mac</span><button class="pk-ok" disabled>enter ⏎</button></div>
      </div>`;
    const ok = q('.pk-ok');
    const f = nameField(root, null, (ready) => (ok.disabled = !ready));
    const submit = submitter('register', f, ok, (name) =>
      whenState((s) => s.registered && s.hackerName === name, (s) => toast(`welcome, ${s.hackerName}${tagText(s.tag)}`)),
    );
    ok.onclick = submit;
    f.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
  }

  // ---------- main menu: friends, requests, settings ----------
  // Opened by the logo (top left) or the gear. The title bar carries your name#tag and your status.
  function openMenu(which) {
    if (!S) return;
    if (modal === 'menu') return showTab(which || tab);
    if (modal) return;
    modal = 'menu';
    tellModal(true);
    root.className = 'on';
    root.innerHTML = `
      <div class="mn-wrap"><div class="pk hk menu crt-on">
        <div class="pk-border"></div>
        <div class="pk-title"><span class="lights"><i class="l-close" title="Close"></i><i class="l-min"></i><i class="l-max"></i></span><img class="hk-logo" src="logo.png" alt=""><b>MAIN MENU</b>
          <span class="mn-me"><span class="mn-handle"></span><button class="mn-copy" type="button" title="Copy your name#tag, so friends can add you">⧉</button><button class="mn-status" type="button" title="Your status"></button></span></div>
        <div class="mn-tabs">
          <button type="button" data-tab="profile">PROFILE</button>
          <button type="button" data-tab="friends">FRIENDS <i class="cnt hot" data-count="unread"></i></button>
          <button type="button" data-tab="board">LEADERBOARD</button>
          <button type="button" data-tab="requests">REQUESTS <i class="cnt hot" data-count="requests"></i></button>
          <button type="button" data-tab="settings">SETTINGS</button>
        </div>
        <div class="mn-body">
          <section class="mn-page mn-profile" data-page="profile"></section>
          <section class="mn-page" data-page="friends">
            <label class="hk-field mn-add"><span class="hk-prompt">+</span><input class="mn-handle-in" maxlength="21" spellcheck="false" autocomplete="off" placeholder="add a friend · name#0427"><button class="mn-send" type="button" disabled>send request</button></label>
            <p class="hk-status mn-add-status"></p>
            <div class="mn-list mn-friends"></div>
          </section>
          <section class="mn-page mn-board" data-page="board"></section>
          <section class="mn-page" data-page="requests">
            <div class="hk-h">INCOMING</div><div class="mn-list mn-in"></div>
            <div class="hk-h">SENT</div><div class="mn-list mn-out"></div>
          </section>
          <section class="mn-page mn-settings" data-page="settings">
            <div class="hk-h">HACKER NAME</div>
            <label class="hk-field"><span class="hk-prompt">$</span><input class="hk-input fit" maxlength="${MAX}" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="hacker name"><span class="hk-tag" title="Your tag: names can repeat, name + tag can't">${tagText(S.tag)}</span><span class="hk-count"></span></label>
            <p class="hk-status"></p>
            <div class="hk-h">ACTIVITY</div>
            <div class="hk-row"><span>show my active time to friends<small>today, this week and in total · your level shows either way</small></span>
              <button type="button" class="hk-sw act" role="switch" aria-checked="true" title="Show my active time to friends"><i></i></button></div>
            <div class="hk-row"><span>show my name on the leaderboard<small>off: you keep your place as Anonymous, and nobody can add you from there</small></span>
              <button type="button" class="hk-sw brd" role="switch" aria-checked="true" title="Show my name on the leaderboard"><i></i></button></div>
            <div class="hk-h">APP</div>
            <div class="hk-info"></div>
          </section>
        </div>
        <div class="pk-foot"><span class="pk-sel note">esc to close</span><button class="pk-cancel">close</button><button class="pk-ok mn-save" disabled>save name</button></div>
      </div>
      <button class="mn-fbk" type="button" title="Send feedback to the developer"><i>${BUBBLE}</i><span>feedback</span></button></div>`;

    // settings: the hacker name
    const settings = q('.mn-settings');
    const own = S.hackerName || '';
    settings.querySelector('.hk-input').value = own;
    const ok = q('.mn-save');
    const f = nameField(settings, own, (ready) => (ok.disabled = !ready));
    const submit = submitter('rename', f, ok, (name) => {
      whenState((s) => s.hackerName === name, (s) => toast(`you are ${s.hackerName}${tagText(s.tag)} now`));
      close();
    });
    ok.onclick = submit;
    f.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });

    // friends: add by name#tag
    const add = q('.mn-handle-in'), send = q('.mn-send'), addStatus = q('.mn-add-status');
    const valid = () => /^[A-Za-z0-9_.-]+( [A-Za-z0-9_.-]+)*#\d{1,4}$/.test(add.value.trim());
    add.addEventListener('input', () => {
      send.disabled = !valid();
      addStatus.className = 'hk-status mn-add-status';
      addStatus.textContent = '';
    });
    const request = async () => {
      if (!valid()) return;
      send.disabled = true;
      const r = await Social.request(add.value.trim());
      const say = (cls, msg) => {
        addStatus.className = `hk-status mn-add-status ${cls}`;
        addStatus.textContent = msg;
      };
      if (r.error) {
        send.disabled = false;
        return say('bad', REQUEST_ERRORS[r.error] || errorText(r.error));
      }
      add.value = '';
      say('ok', r.friend ? `you and ${Social.handle(r.friend)} are friends now` : `request sent to ${Social.handle(r.request.to)}`);
    };
    send.onclick = request;
    add.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') request();
    });

    q('.mn-fbk').onclick = openFeedback;
    q('.hk-sw.act').onclick = toggleActivity;
    q('.hk-sw.brd').onclick = toggleBoard;
    q('.mn-board').addEventListener('click', boardAction);
    q('.mn-copy').onclick = () => copyHandle();
    q('.mn-status').onclick = (e) => {
      e.stopPropagation();
      statusMenu();
    };
    root.querySelectorAll('.mn-tabs button').forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));
    q('.mn-body').addEventListener('click', listAction);
    q('.mn-body').addEventListener('contextmenu', friendMenu);
    q('.l-close').onclick = close;
    q('.pk-cancel').onclick = close;
    root.onmousedown = (e) => {
      if (e.target === root) close();
      else if (!e.target.closest('.mn-pick, .mn-status')) q('.mn-pick')?.remove();
      if (!e.target.closest('.mn-ctx')) q('.mn-ctx')?.remove();
    };
    showTab(which || 'friends');
    renderInfo();
    renderProfile();
    renderActivity();
    renderSocial();
    // Whatever changed while you weren't looking (a missed live event, another device) shows when the menu opens.
    Social.load();
  }

  // ---------- feedback: its own window over the main menu, opened by the speech bubble beside it ----------
  // Goes straight to the developer with who sent it and when, no e-mail; ⌘↩ sends, esc goes back to the menu. Up to
  // 4000 characters (the API and the database hold the same limit); the count shows once it's close.
  const FEEDBACK_MAX = 4000;
  function openFeedback() {
    if (modal !== 'menu' || q('.fbk-layer')) return;
    const layer = document.createElement('div');
    layer.className = 'fbk-layer';
    layer.innerHTML = `
      <div class="pk hk fbk crt-on">
        <div class="pk-border"></div>
        <div class="pk-title"><span class="lights"><i class="l-close" title="Back to the menu"></i><i class="l-min"></i><i class="l-max"></i></span>${BUBBLE}<b>FEEDBACK</b></div>
        <div class="hk-body">
          <label class="hk-field fbk-field"><textarea class="fbk-in" maxlength="${FEEDBACK_MAX}" placeholder="A bug, an idea, something that bothers you…&#10;It goes straight to the developer with your name#tag, no e-mail needed."></textarea></label>
        </div>
        <div class="pk-foot"><span class="pk-sel hk-status fbk-status"></span><button class="pk-ok fbk-send" title="⌘↩" disabled>send</button></div>
      </div>`;
    root.appendChild(layer);
    const $ = (sel) => layer.querySelector(sel);
    const box = $('.fbk-in'), send = $('.fbk-send'), status = $('.fbk-status');
    const say = (cls, msg) => {
      status.className = `pk-sel hk-status fbk-status ${cls}`;
      status.textContent = msg;
    };
    const update = () => {
      const n = box.value.length;
      send.disabled = !box.value.trim();
      say(n >= FEEDBACK_MAX ? 'full' : '', n > FEEDBACK_MAX - 400 ? `${n} / ${FEEDBACK_MAX}` : '');
    };
    box.value = feedbackDraft;
    update();
    box.addEventListener('input', () => {
      feedbackDraft = box.value;
      update();
    });
    const submit = async () => {
      const text = box.value.trim();
      if (!text || send.disabled) return;
      send.disabled = true;
      say('wait', 'sending');
      const r = await Social.feedback(text);
      if (r.error) {
        send.disabled = false;
        return say('bad', errorText(r.error));
      }
      feedbackDraft = '';
      layer.remove();
      toast('feedback sent · thank you, every one is read');
    };
    send.onclick = submit;
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.metaKey) {
        e.preventDefault();
        submit();
      }
    });
    $('.l-close').onclick = () => layer.remove();
    layer.onmousedown = (e) => {
      if (e.target === layer) layer.remove();
    };
    setTimeout(() => box.focus(), 60);
  }

  const REQUEST_ERRORS = {
    not_found: 'no hacker with that name#tag',
    self: "that's you",
    already_friends: 'you are friends already',
    already_requested: 'request already sent',
    bad_handle: 'write it as name#0427',
    too_many_requests: 'too many requests waiting · cancel some first',
    signed_out: 'pick a hacker name first',
  };

  function showTab(which) {
    tab = which;
    root.querySelectorAll('.mn-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === which));
    root.querySelectorAll('.mn-page').forEach((p) => (p.hidden = p.dataset.page !== which));
    const save = q('.mn-save');
    if (save) save.hidden = which !== 'settings';
    const focus = which === 'friends' ? q('.mn-handle-in') : which === 'settings' ? q('.mn-settings .hk-input') : null;
    if (focus) setTimeout(() => focus.focus(), 60);
    if (which === 'board') loadBoard();
  }

  async function copyHandle() {
    const text = S.hackerName ? `${S.hackerName}${tagText(S.tag)}` : '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast(`copied ${text} · send it to a friend`);
    } catch {
      toast(text);
    }
  }

  // Your status, like Discord's: online, away, do not disturb, invisible.
  function statusMenu() {
    if (q('.mn-pick')) return q('.mn-pick').remove();
    const me = Social.state()?.me;
    const pick = document.createElement('div');
    pick.className = 'mn-pick';
    pick.innerHTML = ['online', 'idle', 'dnd', 'invisible']
      .map((st) => `<button type="button" data-status="${st}" class="${me && me.status === st ? 'on' : ''}">${Social.dot(st)}<span><b>${Social.PRESENCE[st].label}</b><small>${Social.PRESENCE[st].hint}</small></span></button>`)
      .join('');
    pick.onclick = async (e) => {
      const b = e.target.closest('[data-status]');
      if (!b) return;
      pick.remove();
      const r = await Social.setStatus(b.dataset.status);
      if (r.error) return toast(errorText(r.error));
    };
    q('.mn-me').appendChild(pick);
  }

  const ago = (at) => {
    const s = Math.max(0, (Date.now() - new Date(at)) / 1000);
    return s < 60 ? 'now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`;
  };
  const tagged = (p) => `<b>${esc(p.name)}<i>#${String(p.tag).padStart(4, '0')}</i></b>`;

  // Friends, requests and your status, from Social's snapshot.
  function renderSocial() {
    badges();
    if (modal !== 'menu') return;
    const s = Social.state();
    const me = s?.me;
    setHTML(q('.mn-handle'), S.hackerName ? `${esc(S.hackerName)}<i>${tagText(S.tag)}</i>` : '');
    setHTML(q('.mn-status'), me ? `${Social.dot(me.status)}<span>${Social.PRESENCE[me.status].label}</span>▾` : `${Social.dot('offline')}<span>offline</span>`);
    const unread = Social.unread(), requests = Social.requests();
    const cUnread = q('[data-count="unread"]'), cReq = q('[data-count="requests"]');
    cUnread.textContent = unread;
    cUnread.hidden = !unread;
    cReq.textContent = requests;
    cReq.hidden = !requests;
    if (!s) {
      const why = S.reachable ? 'loading…' : "can't reach the server · friends come back with the connection";
      setHTML(q('.mn-friends'), `<div class="mn-empty">${why}</div>`);
      return;
    }
    setHTML(
      q('.mn-friends'),
      s.friends.length
        ? s.friends
            .map((f) => {
              const line = f.last ? `${f.last.mine ? 'you: ' : ''}${esc(f.last.body)}` : esc(Social.PRESENCE[f.presence].label);
              // Their level (a click shows their profile) and how long they've worked today, if they share it.
              const lv = f.xp ? Xp.badge(f.xp.level, 'profile') : '';
              const today = f.xp && f.xp.today ? `<span class="mn-today" title="Active today">today ${Xp.dur(f.xp.today)}</span>` : '';
              return `<div class="mn-row" data-id="${esc(f.id)}">${Social.dot(f.presence)}<div class="mn-main" data-act="chat"><span class="mn-name">${tagged(f)}${lv}</span><small>${line}</small></div>` +
                `${today}${f.unread ? `<i class="cnt hot">${f.unread}</i>` : ''}<button class="mn-btn" type="button" data-act="profile" title="Profile: level and hours">◎</button>` +
                '<button class="mn-btn" type="button" data-act="chat" title="Message (right-click for more)">✉</button></div>';
            })
            .join('')
        : `<div class="mn-empty">no friends yet · send them your tag: <b>${esc(S.hackerName || '')}${tagText(S.tag)}</b></div>`,
    );
    setHTML(
      q('.mn-in'),
      s.incoming.length
        ? s.incoming
            .map((r) => `<div class="mn-row" data-id="${esc(r.id)}">${Social.dot(r.from.presence)}<div class="mn-main">${tagged(r.from)}<small>wants to be your friend · ${ago(r.at)}</small></div>` +
              `<button class="mn-btn go" type="button" data-act="accept" title="Accept">✓</button><button class="mn-btn mn-del" type="button" data-act="decline" title="Decline">✕</button></div>`)
            .join('')
        : '<div class="mn-empty">no requests</div>',
    );
    setHTML(
      q('.mn-out'),
      s.outgoing.length
        ? s.outgoing
            .map((r) => `<div class="mn-row" data-id="${esc(r.id)}"><i class="pdot p-offline"></i><div class="mn-main">${tagged(r.to)}<small>waiting · ${ago(r.at)}</small></div>` +
              `<button class="mn-btn mn-del" type="button" data-act="cancel" title="Take back">✕</button></div>`)
            .join('')
        : '<div class="mn-empty">nothing sent</div>',
    );
  }

  async function listAction(e) {
    const el = e.target.closest('[data-act]');
    const row = el && el.closest('.mn-row');
    if (!row) return;
    const id = row.dataset.id;
    switch (el.dataset.act) {
      case 'chat':
        close();
        return Social.openChat(id);
      case 'profile':
        return Social.friend(id) && friendProfile(Social.friend(id));
      case 'accept':
        el.disabled = true;
        return done(await Social.accept(id));
      case 'decline':
      case 'cancel':
        el.disabled = true;
        return done(await Social.dismiss(id));
    }
    function done(r) {
      if (r.error) {
        el.disabled = false;
        toast(errorText(r.error));
      } else Sfx.play(el.dataset.act === 'accept' ? 'accept' : 'decline');
    }
  }

  // Right-click on a friend: message, copy their name#tag, or remove them (after a yes).
  function friendMenu(e) {
    const row = e.target.closest('.mn-friends .mn-row');
    q('.mn-ctx')?.remove();
    if (!row) return;
    e.preventDefault();
    const f = Social.friend(row.dataset.id);
    if (!f) return;
    const box = q('.pk.menu').getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'mn-ctx';
    menu.innerHTML =
      '<button type="button" data-ctx="chat">✉ message</button><button type="button" data-ctx="profile">◎ view profile</button>' +
      '<button type="button" data-ctx="copy">⧉ copy name#tag</button><hr><button type="button" class="danger" data-ctx="remove">✕ remove friend</button>';
    menu.style.left = `${Math.min(e.clientX - box.left, box.width - 190)}px`;
    menu.style.top = `${Math.min(e.clientY - box.top, box.height - 150)}px`;
    menu.onclick = async (ev) => {
      const b = ev.target.closest('[data-ctx]');
      if (!b) return;
      menu.remove();
      if (b.dataset.ctx === 'chat') {
        close();
        return Social.openChat(f.id);
      }
      if (b.dataset.ctx === 'profile') return friendProfile(f);
      if (b.dataset.ctx === 'copy') {
        try {
          await navigator.clipboard.writeText(Social.handle(f));
          toast(`copied ${Social.handle(f)}`);
        } catch {}
        return;
      }
      confirmRemove(f);
    };
    q('.pk.menu').appendChild(menu);
  }

  function confirmRemove(f) {
    const ask = document.createElement('div');
    ask.className = 'mn-confirm';
    ask.innerHTML =
      `<div class="mn-ask"><b>remove ${esc(Social.handle(f))}?</b>` +
      "<p>you'll stop seeing each other's status and can't message each other, until one of you sends a new request.</p>" +
      '<div class="mn-ask-btns"><button type="button" class="mn-btn" data-ans="no">cancel</button><button type="button" class="mn-btn danger" data-ans="yes">remove</button></div></div>';
    ask.onclick = async (e) => {
      const b = e.target.closest('[data-ans]');
      if (e.target === ask || (b && b.dataset.ans === 'no')) return ask.remove();
      if (!b) return;
      b.disabled = true;
      const r = await Social.unfriend(f.id);
      ask.remove();
      if (r.error) return toast(errorText(r.error));
      Sfx.play('decline');
      toast(`removed ${Social.handle(f)}`);
    };
    q('.pk.menu').appendChild(ask);
    ask.querySelector('[data-ans="no"]').focus();
  }

  // ---------- levels: your profile, a friend's card, sharing your active time ----------
  const stat = (label, value, note) => `<div><label>${label}</label><b>${value}</b>${note ? `<small>${note}</small>` : ''}</div>`;

  // Your rank's headband, level and XP, today's time and the rested bonus, the week, the streak, and the ranks ahead.
  function renderProfile() {
    const el = q('.mn-profile');
    if (!el) return;
    const x = S.xp;
    if (!x) {
      const why = S.reachable ? 'loading…' : "can't reach the server · your level comes back with the connection";
      return setHTML(el, `<div class="mn-empty">${why}</div>`);
    }
    const r = Xp.rank(x.level);
    const rested =
      x.rested > 0
        ? `<b>rested</b> · the next ${Xp.dur(x.rested)} today earn double XP`
        : x.today >= 10 * 3600
          ? '<b>10 hours today</b> · no more XP until tomorrow · take a break'
          : x.today >= 8 * 3600
            ? '<b>past 8 hours today</b> · half XP up to 10 hours · take a break'
            : 'rested again tomorrow · the first 2 hours each day earn double XP';
    const ranks = Xp.RANKS.map((k) => {
      const state = x.level > k.to ? 'done' : x.level >= k.from ? 'now' : 'next';
      return `<div class="pf-rk ${state}" style="--rc:${k.color}"><i></i><b>${k.name}</b><span>level ${k.from}–${k.to}</span><em>${state === 'done' ? '✓' : state === 'now' ? 'you' : ''}</em></div>`;
    }).join('');
    setHTML(
      el,
      `<div class="pf-head" style="--rc:${r.color}">${Xp.headband(x.level, 'pf-band')}` +
        `<div class="pf-rank"><small>RANK</small><b>${esc(r.name)}</b><span>Level ${x.level}</span></div></div>` +
        `<div class="pf-xp" style="--rc:${r.color}"><div class="pf-bar"><i style="width:${Xp.pct(x).toFixed(1)}%"></i></div><div class="pf-xpline">` +
        (x.to
          ? `<span>${Xp.num(x.xp - x.from)} / ${Xp.num(x.to - x.from)} XP</span><span>${Xp.num(x.to - x.xp)} XP to level ${x.level + 1}</span>`
          : `<span>${Xp.num(x.xp)} XP</span><span>top level</span>`) +
        `</div></div><p class="pf-rested">${rested}</p>` +
        `<div class="pf-stats">${stat('TODAY', Xp.dur(x.today))}${stat('THIS WEEK', `${x.week}/${x.goal} days`, x.week >= x.goal ? 'goal reached' : '30+ min a day')}` +
        `${stat('STREAK', `${x.streak} ${x.streak === 1 ? 'week' : 'weeks'}`, x.bonus ? `+${x.bonus}% XP` : `${x.goal} days a week`)}${stat('TOTAL', Xp.hours(x.total))}</div>` +
        (x.days ? `<div class="hk-h">LAST 7 DAYS</div>${Xp.week(x.days, r.color)}` : '') +
        `<div class="hk-h">RANKS</div><div class="pf-ranks">${ranks}</div>` +
        '<p class="pf-rules">1 XP for every active minute, up to 10 hours a day · the first 2 hours count double · +50 for showing up · ' +
        `${x.goal} days a week keep a streak, +10% XP for every week of it</p>`,
    );
  }

  // A friend's card: their rank and level, and their active time unless they keep it to themselves.
  function friendProfile(f) {
    q('.mn-confirm')?.remove();
    const x = f.xp || { level: 1, today: null, days: null, week: null, total: null };
    const r = Xp.rank(x.level);
    const card = document.createElement('div');
    card.className = 'mn-confirm';
    card.innerHTML =
      `<div class="mn-ask pf-card" style="--rc:${r.color}"><div class="pf-head">${Xp.headband(x.level, 'pf-band')}` +
      `<div class="pf-rank"><small>${Social.dot(f.presence)} ${esc(Social.PRESENCE[f.presence || 'offline'].label)}</small>${tagged(f)}` +
      `<span>Level ${x.level} · ${esc(r.name)}</span></div></div>` +
      (x.total === null
        ? '<p>keeps their active time to themselves</p>'
        : `<div class="pf-stats">${stat('TODAY', x.today === null ? '—' : Xp.dur(x.today))}${stat('THIS WEEK', `${x.week}/3 days`)}${stat('TOTAL', Xp.hours(x.total))}</div>` +
          (x.days ? `<div class="hk-h">LAST 7 DAYS</div>${Xp.week(x.days, r.color)}` : '')) +
      '<div class="mn-ask-btns"><button type="button" class="mn-btn" data-ans="close">close</button><button type="button" class="mn-btn go" data-ans="chat">✉ message</button></div></div>';
    card.onclick = (e) => {
      const b = e.target.closest('[data-ans]');
      if (e.target === card || (b && b.dataset.ans === 'close')) return card.remove();
      if (b && b.dataset.ans === 'chat') {
        close();
        Social.openChat(f.id);
      }
    };
    q('.pk.menu').appendChild(card);
  }

  function renderActivity() {
    for (const [cls, on] of [['act', S.xp ? S.xp.show !== false : true], ['brd', S.xp ? S.xp.board !== false : true]]) {
      const sw = q(`.hk-sw.${cls}`);
      if (!sw) continue;
      sw.classList.toggle('on', on);
      sw.setAttribute('aria-checked', String(on));
      sw.disabled = !S.xp;
    }
  }

  async function toggleBoard() {
    if (!S.xp) return;
    const show = S.xp.board === false;
    const r = await Social.setBoard(show);
    if (r.error) return toast(errorText(r.error));
    S.xp = { ...S.xp, board: show };
    renderActivity();
    board = null;
    toast(show ? 'your name shows on the leaderboard again' : "you're Anonymous on the leaderboard · only you see your name there");
  }

  // ---------- the leaderboard: everyone with XP, the last 7 days or ever, and a friend request one click away ----------
  let boardBy = 'week';
  let board = null; // the API's answer: { by, rows, me }
  let boardSeq = 0;

  async function loadBoard() {
    const seq = ++boardSeq;
    renderBoard();
    const r = await Social.leaderboard(boardBy);
    if (seq !== boardSeq) return;
    board = r;
    renderBoard();
  }

  const boardUser = (id) => (board && !board.error ? [...board.rows, board.me].find((u) => u && u.id === id) : null);

  // What you can do about someone on the board: nothing (you, or someone Anonymous), message (a friend), wait (asked
  // them), or ask.
  function boardButton(u, key) {
    if (u.me || !u.id) return '';
    if (u.friend) return `<button type="button" class="mn-btn" data-${key}="chat" title="Message">✉</button>`;
    if (u.requested) return '<span class="lb-state">request sent</span>';
    return `<button type="button" class="mn-btn go" data-${key}="add" title="${u.asked ? 'They asked you: accept' : 'Send a friend request'}">${u.asked ? '✓ accept' : '+ add'}</button>`;
  }

  function boardRow(u) {
    const r = Xp.rank(u.level);
    // Hid their name, like on Riot's ladders: their place, level and score, nothing that tells who they are.
    if (!u.id) {
      return (
        `<div class="lb-row anon${u.pos <= 3 ? ' top' : ''}" style="--rc:${r.color}"><span class="lb-pos">${u.pos}</span>` +
        `<div class="lb-who"><span class="mn-name"><b class="lb-anon">Anonymous</b>${Xp.badge(u.level)}</span><small>${esc(r.name)}</small></div>` +
        `<span class="lb-spark off"></span><span class="lb-score">${boardBy === 'week' ? `+${Xp.num(u.week)}` : Xp.num(u.xp)} XP</span><span class="lb-act"></span></div>`
      );
    }
    const active = u.days ? u.days.reduce((a, s) => a + (s || 0), 0) : null;
    const spark = u.days
      ? `<span class="lb-spark">${u.days.map((s) => `<i style="height:${s ? Math.max(12, Math.min(100, (s / 28_800) * 100)).toFixed(0) : 0}%"></i>`).join('')}</span>`
      : '<span class="lb-spark off" title="keeps their active time to themselves"></span>';
    return (
      `<div class="lb-row${u.me ? ' me' : ''}${u.pos <= 3 ? ' top' : ''}" data-id="${esc(u.id)}" style="--rc:${r.color}">` +
      `<span class="lb-pos">${u.pos}</span><div class="lb-who"><span class="mn-name">${tagged(u)}${Xp.badge(u.level)}${u.me ? '<em class="lb-you">you</em>' : ''}` +
      `${u.me && u.anon ? '<em class="lb-hid" title="Others see you as Anonymous">hidden</em>' : ''}</span>` +
      `<small>${esc(r.name)}${active === null ? '' : ` · ${Xp.dur(active)} this week`}</small></div>${spark}` +
      `<span class="lb-score">${boardBy === 'week' ? `+${Xp.num(u.week)}` : Xp.num(u.xp)} XP</span><span class="lb-act">${boardButton(u, 'act')}</span></div>`
    );
  }

  function renderBoard() {
    const el = q('.mn-board');
    if (!el) return;
    const head =
      `<div class="lb-head"><div class="lb-seg"><button type="button" data-by="week" class="${boardBy === 'week' ? 'on' : ''}">THIS WEEK</button>` +
      `<button type="button" data-by="all" class="${boardBy === 'all' ? 'on' : ''}">ALL TIME</button></div>` +
      `<span class="lb-note">${boardBy === 'week' ? 'XP earned over the last 7 days' : 'XP ever'} · click someone for their week</span></div>`;
    if (!board || board.error) {
      const why = !board ? (S.reachable ? 'loading…' : "can't reach the server · the leaderboard comes back with the connection") : errorText(board.error);
      return setHTML(el, `${head}<div class="mn-empty">${why}</div>`);
    }
    const rows = board.rows.map(boardRow).join('');
    const mine = board.me && board.me.pos > board.rows.length ? `<div class="lb-gap">· · ·</div>${boardRow(board.me)}` : '';
    const absent = board.me ? '' : `<p class="lb-foot">you'll show up here once you have some XP</p>`;
    setHTML(el, head + (rows ? `<div class="lb-list">${rows}${mine}</div>` : '<div class="mn-empty">no one on the leaderboard yet</div>') + absent);
  }

  async function boardAction(e) {
    const seg = e.target.closest('[data-by]');
    if (seg) {
      if (seg.dataset.by === boardBy) return;
      boardBy = seg.dataset.by;
      board = null;
      return loadBoard();
    }
    const row = e.target.closest('.lb-row');
    const u = row && row.dataset.id && boardUser(row.dataset.id);
    if (!u) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'chat') {
      close();
      return Social.openChat(u.id);
    }
    if (act === 'add') return addFromBoard(u, e.target.closest('button'));
    if (u.me) return showTab('profile');
    boardCard(u);
  }

  async function addFromBoard(u, button) {
    if (button) button.disabled = true;
    const r = await Social.request(Social.handle(u));
    if (r.error && r.error !== 'already_requested' && r.error !== 'already_friends') {
      if (button) button.disabled = false;
      return toast(REQUEST_ERRORS[r.error] || errorText(r.error));
    }
    Sfx.play('accept');
    if (r.friend || r.error === 'already_friends') u.friend = true;
    else u.requested = true;
    toast(u.friend ? `you and ${Social.handle(u)} are friends now` : `request sent to ${Social.handle(u)}`);
    renderBoard();
    if (q('.mn-confirm')) boardCard(u);
  }

  // Someone's card from the board: their rank and level, their week, and a friend request (or a message, a friend).
  function boardCard(u) {
    q('.mn-confirm')?.remove();
    const r = Xp.rank(u.level);
    const active = u.days ? u.days.reduce((a, s) => a + (s || 0), 0) : null;
    const card = document.createElement('div');
    card.className = 'mn-confirm';
    card.innerHTML =
      `<div class="mn-ask pf-card" style="--rc:${r.color}"><div class="pf-head">${Xp.headband(u.level, 'pf-band')}` +
      `<div class="pf-rank"><small>#${u.pos} on the leaderboard</small>${tagged(u)}<span>Level ${u.level} · ${esc(r.name)}</span></div></div>` +
      `<div class="pf-stats">${stat('THIS WEEK', `+${Xp.num(u.week)} XP`)}${stat('ACTIVE', active === null ? '—' : Xp.dur(active))}${stat('TOTAL', `${Xp.num(u.xp)} XP`)}</div>` +
      (u.days ? `<div class="hk-h">LAST 7 DAYS</div>${Xp.week(u.days, r.color)}` : '<p>keeps their active time to themselves</p>') +
      `<div class="mn-ask-btns"><button type="button" class="mn-btn" data-ans="close">close</button>${boardButton(u, 'ans')}</div></div>`;
    card.onclick = (e) => {
      const b = e.target.closest('[data-ans]');
      if (e.target === card || (b && b.dataset.ans === 'close')) return card.remove();
      if (b && b.dataset.ans === 'chat') {
        close();
        Social.openChat(u.id);
      }
      if (b && b.dataset.ans === 'add') addFromBoard(u, b);
    };
    q('.pk.menu').appendChild(card);
  }

  async function toggleActivity() {
    if (!S.xp) return;
    const show = S.xp.show === false;
    const r = await Social.setActivity(show);
    if (r.error) return toast(errorText(r.error));
    S.xp = { ...S.xp, show };
    renderActivity();
    toast(show ? 'friends see your active time again' : 'your active time is hidden from friends · your level still shows');
  }

  // Your XP changed (the daily bonus, a new level): show it now rather than at the next heartbeat.
  Social.on((ev) => {
    if (ev.type === 'xp' && ev.xp && S) render({ ...S, xp: ev.xp });
  });

  function badges() {
    const n = Social.unread() + Social.requests();
    const b = brand.querySelector('.bdg'), me = brand.querySelector('.bme');
    b.textContent = n > 99 ? '99+' : n;
    b.hidden = !n;
    const st = Social.state()?.me?.status;
    me.hidden = !st;
    if (st) me.className = `pdot bme p-${st}`;
  }
  Social.on(() => renderSocial());

  // Settings stay plain: the version, and an update button only when there is one.
  function renderInfo() {
    const el = q('.hk-info');
    if (!el) return;
    const extra = S.updating
      ? `<em>${esc(S.updating)}</em>`
      : S.update
        ? `<button type="button" class="hk-upd">update to ${esc(S.update.version)}</button>`
        : '';
    setHTML(el, `<div class="hk-row"><span>version</span><div class="hk-val"><b>${esc(S.version || '?')}</b>${extra}</div></div>`);
    const b = el.querySelector('.hk-upd');
    if (b) b.onclick = openUpdate;
  }


  function close() {
    if (!modal) return;
    modal = null;
    tellModal(false);
    root.onmousedown = null;
    q('.fbk-layer')?.remove();
    const pk = q('.pk');
    if (pk) pk.classList.replace('crt-on', 'crt-off');
    setTimeout(() => {
      if (modal) return;
      root.className = '';
      root.innerHTML = '';
    }, 450);
  }

  const refresh = () => call('state').then(render).catch(() => {});

  $('update').addEventListener('click', openUpdate);
  $('settings').addEventListener('click', () => openMenu('settings'));
  brand.addEventListener('click', () => openMenu('friends'));
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modal === 'update') {
      if (!S.updating) close();
      return;
    }
    if (modal !== 'menu') return;
    // Esc closes what's on top first: the feedback window, the confirmation, a small menu, then the main menu.
    const top = q('.fbk-layer') || q('.mn-confirm') || q('.mn-ctx') || q('.mn-pick');
    if (top) return top.remove();
    close();
  });
  refresh();
  if (!h) setInterval(refresh, 30_000);

  return { render, openMenu, openSettings: () => openMenu('settings'), openUpdate };
})();
