'use strict';

// Hacker name (asked once, on first launch), the main menu (your profile, settings, your status), friends and messages,
// the leaderboard, the themes and the notifications (views of the activity bar, git.js), feedback and app updates. Your level and rank (xp.js) show in the top bar and on your profile. Names can repeat: the API gives every Mac a
// tag (#0427) and name + tag is unique, like Discord. Swift's Cloud talks to the API, pushes its state through
// window.__radar.cloud and answers the page through the "cloud" handler (with replies).
window.Cloud = (() => {
  // The computer and the command key, as this platform names them (the Windows app sets __platform, preload.js).
  const MACHINE = window.__platform === 'win32' ? 'PC' : 'Mac';
  const MOD = window.__platform === 'win32' ? 'Ctrl+' : '⌘';
  const call = (type, payload) => window.webkit.messageHandlers.cloud.postMessage(Object.assign({ type }, payload || {}));
  const MAX = 16;
  const ERRORS = {
    name_full: 'too many hackers use this name · try another',
    offline: "can't reach the server · try again",
    unauthorized: `this ${MACHINE} lost its sign-in · restart the app`,
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
  // A speech bubble: the feedback window's title.
  const BUBBLE = '<svg viewBox="0 0 24 24"><path d="M5 4.5h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-7.5L6.5 21v-4H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z"/><circle cx="8.2" cy="10.8" r="1.1"/><circle cx="12" cy="10.8" r="1.1"/><circle cx="15.8" cy="10.8" r="1.1"/></svg>';
  const ARROW = '<svg viewBox="0 0 16 16"><path class="ar" d="M8 2.5v7.5M4.6 6.8 8 10.2l3.4-3.4"/><path d="M3 13.5h10"/></svg>';

  let S = null; // latest state
  let modal = null; // 'first' | 'menu' | 'update' | 'feedback'
  let tab = 'friends';
  let shownError = null;
  let shownNameError = null;
  let waitFor = null; // { test, then, until }: runs once a state shows the name just sent
  let feedbackDraft = ''; // the feedback window's text, kept until it's sent

  const root = document.createElement('div');
  root.id = 'cloudui';
  document.body.appendChild(root);
  const q = (sel) => root.querySelector(sel);
  const brand = document.querySelector('.brand');
  const stack = brand.querySelector('.stack');
  // The logo shows your status. Unread messages and friend requests count on the friends icon on the left edge.
  brand.insertAdjacentHTML('afterbegin', '<i class="pdot bme" hidden></i>');

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
    // The badge you display, beside your name (badges.js).
    window.Badges?.paintTop();
    brand.title = r
      ? `Level ${x.level} · ${r.name} · ${x.to ? `${Xp.num(x.xp - x.from)} / ${Xp.num(x.to - x.from)} XP` : `${Xp.num(x.xp)} XP`} · today ${Xp.dur(x.today)}`
      : 'Profile and settings';
    if (waitFor && (Date.now() > waitFor.until || waitFor.test(s))) {
      const w = waitFor;
      waitFor = null;
      if (w.test(s)) w.then(s);
    }
    renderUpdate();
    renderUpdateModal();
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
    if (meOpen) renderMe();
    else if (shown === 'friends') meCard();
    // Friends and messages need a signed-in Mac.
    if (s.registered && s.reachable && !Social.state()) Social.load();
    badges();
  }

  // How much of the update has downloaded, " 42%" (nothing when it isn't downloading).
  const pct = () => (S.updateProgress == null ? '' : ` ${Math.round(S.updateProgress * 100)}%`);
  function renderUpdate() {
    const b = $('update');
    const busy = !!S.updating;
    b.hidden = !(S.update || busy);
    b.disabled = busy;
    b.classList.toggle('busy', busy);
    // A day after a newer version came out, an older one earns no XP (the API): the button says so.
    b.classList.toggle('paused', !busy && !!S.xpPaused);
    // Short label so the top bar fits; the version and progress are in the tooltip and in settings.
    setHTML(b, `${ARROW}<span>${busy ? `updating${pct() || '…'}` : S.xpPaused ? 'update · XP paused' : 'update'}</span>`);
    b.title = busy
      ? S.updating + pct()
      : S.update
        ? S.xpPaused
          ? `Version ${S.update.version} is out · XP is paused until you update · click to see what's new`
          : S.updateReady
            ? `Version ${S.update.version} is ready · it installs when you step away, your chats keep running · click to see what's new`
            : `Version ${S.update.version} is out · click to see what's new`
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
  // Release notes and the developer's notifications, escaped, with their links and GitHub names marked: a link opens in
  // the browser (the app sends every web link the page follows there, Mac and Windows), @name is that GitHub user and
  // opens their profile.
  function richText(text) {
    const s = String(text ?? '');
    const re = /(https?:\/\/[^\s<>"'`]+)|(^|[^\w@./-])@([A-Za-z0-9](?:-?[A-Za-z0-9]){0,38})(?![\w-])/g;
    let out = '', last = 0, m;
    while ((m = re.exec(s))) {
      if (m[1]) {
        // The sentence's punctuation isn't part of the link, nor a ")" opened before it.
        let url = m[1];
        for (;;) {
          if (/[.,;:!?'"\]]$/.test(url)) url = url.slice(0, -1);
          else if (url.endsWith(')') && url.split('(').length < url.split(')').length) url = url.slice(0, -1);
          else break;
        }
        try { new URL(url); } catch { continue; }
        out += esc(s.slice(last, m.index)) + `<a class="rt-link" href="${esc(url)}" title="${esc(url)}">${esc(url)}</a>`;
        last = re.lastIndex = m.index + url.length;
      } else {
        const name = m[3];
        out += esc(s.slice(last, m.index) + m[2]) +
          `<a class="rt-user" href="https://github.com/${name}" title="github.com/${name}">@${name}</a>`;
        last = re.lastIndex;
      }
    }
    return out + esc(s.slice(last));
  }
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
          <ul class="up-notes">${(lines.length ? lines : ['fixes and improvements']).map((l) => `<li>${richText(l)}</li>`).join('')}</ul>
          <div class="up-bar" hidden><i></i></div>
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
    st.textContent = busy ? S.updating + pct() : '';
    // The download as a bar, so a long one never looks frozen.
    const bar = q('.up-bar');
    bar.hidden = !(busy && S.updateProgress != null);
    bar.firstElementChild.style.width = `${Math.round((S.updateProgress || 0) * 100)}%`;
  }

  // The name's state reaches the page as a push from the app, before or after the call's reply.
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

  // Sends the name; on success the new state arrives (pushed by the app) and closes the dialog.
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
        toast(`saved on this ${MACHINE} · syncs when you're back online`);
        return close();
      }
      done(name);
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
        <div class="pk-foot"><span class="pk-sel note">no signup · tied to this ${MACHINE}</span><button class="pk-ok" disabled>enter ⏎</button></div>
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
          <button type="button" data-tab="settings">SETTINGS</button>
          ${KEYS ? '<button type="button" data-tab="keys">SHORTCUTS</button>' : ''}
        </div>
        <div class="mn-body">
          <section class="mn-page mn-profile" data-page="profile"></section>
          <section class="mn-page mn-settings" data-page="settings">
            ${window.Account ? '<div class="hk-h">ACCOUNT</div><div class="acct-host"></div>' : ''}
            ${window.Profile ? '<div class="hk-h prof-h" hidden>PROFILE</div><div class="prof-host" hidden></div>' : ''}
            <div class="hk-h">HACKER NAME</div>
            <label class="hk-field"><span class="hk-prompt">$</span><input class="hk-input fit" maxlength="${MAX}" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="hacker name"><span class="hk-tag" title="Your tag: names can repeat, name + tag can't">${tagText(S.tag)}</span><span class="hk-count"></span></label>
            <p class="hk-status"></p>
            <div class="hk-h">ACTIVITY</div>
            <div class="hk-row"><span>show my active time to friends<small>today, this week and in total · your level shows either way</small></span>
              <button type="button" class="hk-sw act" role="switch" aria-checked="true" title="Show my active time to friends"><i></i></button></div>
            <div class="hk-row"><span>show my name on the leaderboard<small>off: you keep your place as Anonymous, and nobody can add you from there</small></span>
              <button type="button" class="hk-sw brd" role="switch" aria-checked="true" title="Show my name on the leaderboard"><i></i></button></div>
            ${UI ? `<div class="hk-h">INTERFACE</div>
            <div class="hk-row"><span>font<small>the dashboard's and the messages' text</small></span><span class="lb-seg ui-seg ui-font"></span></div>
            <div class="hk-row"><span>text size<small>the dashboard, larger for text too small to read</small></span><span class="lb-seg ui-seg ui-scale"></span></div>
            <div class="hk-row"><span>AI tools in the theme's colours<small>Claude Code, Codex and Antigravity draw in the terminal's colours, so a theme recolours their text too · from their next session</small></span>
              <button type="button" class="hk-sw ui-ai" role="switch" aria-checked="true" title="AI tools in the theme's colours"><i></i></button></div>` : ''}
            ${SAVERS ? `<div class="hk-h">TOKEN SAVERS</div>
            <div class="hk-row ts-row"><span>rtk · shorter command output for Claude Code, Codex and Antigravity<small class="ts-note" data-which="rtk">…</small></span>
              <button type="button" class="hk-sw ts" data-which="rtk" role="switch" aria-checked="false" title="Turn rtk on or off"><i></i></button></div>
            <div class="hk-row ts-row"><span>caveman · short answers from Claude Code, Codex and Antigravity<small class="ts-note" data-which="caveman">…</small></span>
              <button type="button" class="hk-sw ts" data-which="caveman" role="switch" aria-checked="false" title="Turn caveman on or off"><i></i></button></div>` : ''}
            ${ARCHIVE() ? `<div class="hk-h">CHATS</div>
            <div class="hk-row"><span>archived chats<small>out of the chats list · they show only when you open them here</small></span>
              <button type="button" class="arc-btn arc-open">manage</button></div>` : ''}
            ${window.__powerSave ? `<div class="hk-h">POWER</div>
            <div class="hk-row"><span>power save on by itself at low battery<small>below ${window.__powerSave.threshold}% on battery, and in ${window.__powerSave.saver || 'Low Power Mode'}, the map draws fewer and smaller frames · the switch on the map turns it off again</small></span>
              <button type="button" class="hk-sw pwr-auto" role="switch" aria-checked="true" title="Power save on by itself at low battery"><i></i></button></div>` : ''}
            ${window.__discord ? `<div class="hk-h">DISCORD</div>
            <div class="hk-row"><span>show what I'm doing on Discord<small class="dc-note">…</small></span>
              <button type="button" class="hk-sw dc-on" role="switch" aria-checked="false" title="Show what I'm doing on Discord"><i></i></button></div>
            <div class="hk-row"><span>show the project's name<small>the folder of the session at work, as atalay-terminal +2 when more are at work · off: only how many sessions run and the AI tools at work</small></span>
              <button type="button" class="hk-sw dc-proj" role="switch" aria-checked="false" title="Show the project's name on Discord"><i></i></button></div>
            <div class="hk-row"><span>show my active time<small>today's, as your XP counts it, as 4h 12m today</small></span>
              <button type="button" class="hk-sw dc-act" role="switch" aria-checked="true" title="Show my active time on Discord"><i></i></button></div>` : ''}
            <div class="hk-h">APP</div>
            <div class="hk-info"></div>
          </section>
          ${KEYS ? '<section class="mn-page mn-keys" data-page="keys"></section>' : ''}
        </div>
        <div class="pk-foot"><span class="pk-sel note">esc to close</span><button class="pk-cancel">close</button><button class="pk-ok mn-save" disabled>save name</button></div>
      </div></div>`;

    // settings: the hacker name
    const settings = q('.mn-settings');
    settings.querySelector('.arc-open')?.addEventListener('click', openArchive);
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

    q('.hk-sw.act').onclick = toggleActivity;
    q('.hk-sw.brd').onclick = toggleBoard;
    window.Account?.mount(q('.acct-host'));
    window.Profile?.mount(q('.prof-host'));
    const pwr = q('.hk-sw.pwr-auto');
    if (pwr) pwr.onclick = () => window.webkit.messageHandlers.radar.postMessage({ type: 'powerSaveAuto', on: !window.__powerSave?.auto });
    const dcOn = q('.hk-sw.dc-on'), dcProj = q('.hk-sw.dc-proj'), dcAct = q('.hk-sw.dc-act');
    if (dcOn) dcOn.onclick = () => window.webkit.messageHandlers.radar.postMessage({ type: 'discordPresence', on: !window.__discord?.on });
    if (dcProj) dcProj.onclick = () => window.webkit.messageHandlers.radar.postMessage({ type: 'discordProject', on: !window.__discord?.project });
    if (dcAct) dcAct.onclick = () => window.webkit.messageHandlers.radar.postMessage({ type: 'discordActive', on: !window.__discord?.active });
    q('.mn-copy').onclick = () => copyHandle();
    q('.mn-status').onclick = (e) => {
      e.stopPropagation();
      statusMenu();
    };
    root.querySelectorAll('.mn-tabs button').forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));
    q('.l-close').onclick = close;
    q('.pk-cancel').onclick = close;
    root.onmousedown = (e) => {
      if (e.target === root) close();
      else if (!e.target.closest('.mn-pick, .mn-status')) q('.mn-pick')?.remove();
    };
    showTab(which || 'profile');
    renderInfo();
    renderProfile();
    renderActivity();
    renderPower();
    renderDiscord();
    renderSocial();
    // Whatever changed while you weren't looking (a missed live event, another device) shows when the menu opens.
    Social.load();
  }

  // ---------- feedback: its own window over the main menu, opened by the speech bubble beside it ----------
  // Goes straight to the developer with who sent it and when, no e-mail; ⌘↩ sends, esc goes back to the menu. Up to
  // 4000 characters (the API and the database hold the same limit); the count shows once it's close.
  const FEEDBACK_MAX = 4000;
  // Feedback (the activity bar's foot): a window of its own that sends straight to the developer.
  function openFeedback() {
    if (modal) return;
    modal = 'feedback';
    tellModal(true);
    root.className = 'on';
    root.innerHTML = `
      <div class="pk hk fbk crt-on">
        <div class="pk-border"></div>
        <div class="pk-title"><span class="lights"><i class="l-close" title="Close"></i><i class="l-min"></i><i class="l-max"></i></span>${BUBBLE}<b>FEEDBACK</b></div>
        <div class="hk-body">
          <label class="hk-field fbk-field"><textarea class="fbk-in" maxlength="${FEEDBACK_MAX}" placeholder="A bug, an idea, something that bothers you…&#10;It goes straight to the developer with your name#tag, no e-mail needed."></textarea></label>
        </div>
        <div class="pk-foot"><span class="pk-sel hk-status fbk-status"></span><button class="pk-ok fbk-send" title="${MOD}↩" disabled>send</button></div>
      </div>`;
    const $ = (sel) => root.querySelector(sel);
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
      close();
      toast('feedback sent · thank you, every one is read');
    };
    send.onclick = submit;
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit();
      }
    });
    $('.l-close').onclick = close;
    root.onmousedown = (e) => {
      if (e.target === root) close();
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
    const focus = which === 'settings' ? q('.mn-settings .hk-input') : null;
    if (focus) setTimeout(() => focus.focus(), 60);
    if (which === 'keys') renderKeys();
    if (which === 'settings') {
      renderSaver();
      renderUI();
    }
  }

  // ---------- archived chats ----------
  // The chats archived from the chats list (the Mac app's Sidebar.swift keeps them) are out of it, and out of Settings
  // too: as in Claude's and ChatGPT's settings, a button there opens them in a window of their own, by folder, where a
  // chat, a whole folder or all of them come back with a click. Settings itself shows nothing of them.
  const ARCHIVE = () => !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.archive);
  const archiveCall = (msg) => window.webkit.messageHandlers.archive.postMessage(msg);
  function openArchive() {
    if (!ARCHIVE()) return;
    let layer = document.getElementById('arcmodal');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'arcmodal';
      document.body.appendChild(layer);
    }
    layer.innerHTML =
      '<div class="pk hk arc-pk crt-on"><div class="pk-border"></div>' +
      '<div class="pk-title"><img class="hk-logo" src="logo.png" alt=""><b>ARCHIVED CHATS</b></div>' +
      '<div class="hk-body"><div class="arc"></div></div>' +
      '<div class="pk-foot"><span class="pk-sel note">esc to close</span><button type="button" class="pk-cancel arc-close">close</button></div></div>';
    layer.onmousedown = (e) => e.target === layer && closeArchive();
    layer.querySelector('.arc-close').onclick = closeArchive;
    addEventListener('keydown', archiveKey, true);
    renderArchive();
  }
  function closeArchive() {
    document.getElementById('arcmodal')?.remove();
    removeEventListener('keydown', archiveKey, true);
  }
  // Esc closes this window only, Settings stays under it.
  function archiveKey(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    closeArchive();
  }
  async function renderArchive(r) {
    const box = document.querySelector('#arcmodal .arc');
    if (!box) return;
    if (!r) r = await archiveCall({ type: 'list' }).catch(() => null);
    const folders = (r && r.folders) || [];
    const total = folders.reduce((n, f) => n + f.chats.length, 0);
    box.innerHTML = !total
      ? '<p class="arc-none">nothing archived · right-click a chat or a folder in the chats list to archive it</p>'
      : `<div class="arc-head"><span>${total} archived chat${total === 1 ? '' : 's'}</span><button type="button" class="arc-btn" data-act="all">unarchive all</button></div>` +
        '<div class="arc-list">' +
        folders.map((f) =>
          `<div class="arc-folder"><div class="arc-f"><span title="${esc(f.cwd)}">${esc(f.label)}<i>${f.chats.length}</i></span>` +
          `<button type="button" class="arc-btn" data-act="folder" data-cwd="${esc(f.cwd)}">unarchive folder</button></div>` +
          f.chats.map((c) => `<div class="arc-c"><span title="${esc(c.title || '')}">${esc(c.title || 'untitled')}</span>` +
            `<button type="button" class="arc-btn" data-act="chat" data-id="${esc(c.id)}">unarchive</button></div>`).join('') +
          '</div>').join('') +
        '</div>';
    box.onclick = async (e) => {
      const b = e.target.closest('.arc-btn');
      if (!b) return;
      const act = b.dataset.act;
      const msg = act === 'all' ? { type: 'restoreAll' } : act === 'folder' ? { type: 'restoreFolder', cwd: b.dataset.cwd } : { type: 'restore', id: b.dataset.id };
      renderArchive(await archiveCall(msg).catch(() => null));
    };
  }

  // ---------- the interface's font and text size ----------
  // Kept by the app (Themes.swift's ThemeStore on the Mac, themes.js on Windows) and set through the theme bridge: the
  // font goes on every page, the size is the dashboard's zoom.
  const UI = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.theme);
  const uiCall = (msg) => window.webkit.messageHandlers.theme.postMessage(msg);
  function showUI(ui) {
    const font = q('.ui-font'), scale = q('.ui-scale');
    if (!ui || !ui.fonts || !font || !scale) return;
    setHTML(font, ui.fonts.map((f) => `<button type="button" data-font="${esc(f.id)}" class="${f.id === ui.font ? 'on' : ''}">${esc(f.name)}</button>`).join(''));
    setHTML(scale, ui.scales.map((x) => `<button type="button" data-scale="${x}" class="${x === ui.scale ? 'on' : ''}">${Math.round(x * 100)}%</button>`).join(''));
    const ai = q('.ui-ai');
    if (ai) {
      ai.setAttribute('aria-checked', ui.aiColors === false ? 'false' : 'true');
      ai.disabled = false;
    }
  }
  async function renderUI() {
    if (!UI || !q('.ui-font')) return;
    showUI(await uiCall({ type: 'ui' }).catch(() => null));
    q('.ui-font').onclick = async (e) => {
      const b = e.target.closest('button[data-font]');
      if (b) showUI(await uiCall({ type: 'setUI', font: b.dataset.font }).catch(() => null));
    };
    q('.ui-scale').onclick = async (e) => {
      const b = e.target.closest('button[data-scale]');
      if (b) showUI(await uiCall({ type: 'setUI', scale: Number(b.dataset.scale) }).catch(() => null));
    };
    const ai = q('.ui-ai');
    if (ai) {
      ai.onclick = async () => {
        ai.disabled = true;
        showUI(await uiCall({ type: 'setUI', aiColors: ai.getAttribute('aria-checked') !== 'true' }).catch(() => null));
        ai.disabled = false;
      };
    }
  }

  // ---------- the token savers ----------
  // rtk and caveman, which the app ships and turns on for Claude Code, Codex and Antigravity (TokenSavers.swift / savers.js):
  // a switch each, and what rtk saved. One the user set up themselves switches the same way.
  const SAVERS = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.savers);
  const saversCall = (msg) => window.webkit.messageHandlers.savers.postMessage(msg);
  const compact = (n) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  const SAVER_OFF = { rtk: "off · Claude Code, Codex and Antigravity read commands' output in full", caveman: 'off · full-length answers' };
  function showSavers(all) {
    if (!all) return;
    for (const which of ['rtk', 'caveman']) {
      const st = all[which], sw = q(`.hk-sw.ts[data-which="${which}"]`), note = q(`.ts-note[data-which="${which}"]`);
      if (!st || !sw || !note) continue;
      sw.setAttribute('aria-checked', st.on ? 'true' : 'false');
      sw.disabled = !st.available;
      sw.title = `Turn ${which} on or off`;
      note.textContent = !st.available ? 'not in this build'
        : st.saved != null ? `saved ${compact(st.saved)} tokens so far, ${Math.round(st.pct)}% of what ${compact(st.commands)} commands printed`
        : st.on ? (which === 'caveman' ? 'on · about two thirds fewer output tokens, from the next chat' : 'on · nothing saved yet') : SAVER_OFF[which];
    }
  }
  async function renderSaver() {
    if (!SAVERS || !q('.hk-sw.ts')) return;
    showSavers(await saversCall({ type: 'state' }).catch(() => null));
    root.querySelectorAll('.hk-sw.ts').forEach((sw) => {
      sw.onclick = async () => {
        const which = sw.dataset.which, on = sw.getAttribute('aria-checked') !== 'true';
        sw.disabled = true;
        q(`.ts-note[data-which="${which}"]`).textContent = on ? `turning ${which} on…` : `turning ${which} off…`;
        showSavers(await saversCall({ type: 'set', which, on }).catch(() => null));
      };
    });
  }

  // ---------- shortcuts ----------
  // The keys of the app's actions, as the user wants them (the Mac app's Shortcuts.swift keeps them and sets the menus):
  // click one, press the new keys. Esc cancels, Delete takes them off; ↺ brings one back to how it came.
  const KEYS = !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.keys);
  const keysCall = (msg) => window.webkit.messageHandlers.keys.postMessage(msg);
  let keysMsg = '';
  // The shortcut wheel, as small as a settings icon: its five slices around the middle, the first one lit.
  const WHEEL_ICON = (() => {
    const C = 32, R0 = 10, R1 = 28, N = 5, GAP = 7;
    const pt = (r, deg) => `${(C + r * Math.cos((deg * Math.PI) / 180)).toFixed(2)} ${(C + r * Math.sin((deg * Math.PI) / 180)).toFixed(2)}`;
    let slices = '';
    for (let i = 0; i < N; i++) {
      const mid = -90 + (i * 360) / N, a = mid - 180 / N + GAP / 2, b = mid + 180 / N - GAP / 2;
      slices += `<path${i ? '' : ' class="on"'} d="M${pt(R0, a)} L${pt(R1, a)} A${R1} ${R1} 0 0 1 ${pt(R1, b)} L${pt(R0, b)} A${R0} ${R0} 0 0 0 ${pt(R0, a)}Z"/>`;
    }
    return `<svg class="ksw-ico" viewBox="0 0 64 64" aria-hidden="true"><circle class="ring" cx="32" cy="32" r="31"/>${slices}<circle class="dot" cx="32" cy="32" r="3"/></svg>`;
  })();
  // How the shortcut wheel opens, on top of the page, as VS Code shows a command's keys: the primary way, the trackpad's
  // four-finger click, and a secondary one you set: keys, or a mouse button with modifiers held (⌃ and the middle
  // button to begin with, as on Windows).
  function wheelCard(k) {
    const label = k?.label || '';
    return (
      `<div class="ks-wheel">${WHEEL_ICON}<div class="ksw-txt"><b>Shortcut wheel</b><span>Your folders around the pointer: pick one and a chat opens there.</span></div>` +
      '<div class="ksw-how">' +
      '<div><small>primary</small><span class="ks-key fixed">4-finger click</span></div>' +
      '<div><small>secondary</small>' +
      (k?.changed ? '<button type="button" class="ks-undo" data-id="shortcutsWheel" title="Back to how it came">↺</button>' : '') +
      `<button type="button" class="ks-key${label ? '' : ' none'}" data-id="shortcutsWheel" data-mouse="1" title="Click, then press keys or a mouse button (hold ⌃ ⌥ ⇧ ⌘ with it if you like). Delete: none">${label ? esc(label) : '—'}</button></div>` +
      '</div></div>'
    );
  }
  async function renderKeys(st) {
    const page = q('.mn-keys');
    if (!page) return;
    if (!st) st = (await keysCall({ type: 'list' }).catch(() => null)) || {};
    const all = st.shortcuts || [];
    const list = all.filter((k) => k.id !== 'shortcutsWheel');
    const groups = [];
    for (const k of list) (groups.find((g) => g.name === k.group) || (groups.push({ name: k.group, items: [] }), groups[groups.length - 1])).items.push(k);
    page.innerHTML =
      wheelCard(all.find((k) => k.id === 'shortcutsWheel')) +
      '<p class="ks-note">Click a shortcut, then press the new keys. Esc cancels, Delete takes them off.</p>' +
      `<p class="ks-msg${keysMsg ? ' on' : ''}">${esc(keysMsg)}</p>` +
      groups.map((g) => `<div class="hk-h">${esc(g.name.toUpperCase())}</div>` + g.items.map((k) =>
        `<div class="ks-row"><span>${esc(k.title)}</span>` +
        (k.changed ? `<button type="button" class="ks-undo" data-id="${esc(k.id)}" title="Back to how it came">↺</button>` : '') +
        `<button type="button" class="ks-key${k.label ? '' : ' none'}" data-id="${esc(k.id)}">${k.label ? esc(k.label) : '—'}</button></div>`).join('')).join('') +
      (list.some((k) => k.changed) ? '<div class="ks-foot"><button type="button" class="ks-all">reset all</button></div>' : '');
    page.onclick = onKeysClick;
  }
  async function onKeysClick(e) {
    const undo = e.target.closest('.ks-undo'), all = e.target.closest('.ks-all'), key = e.target.closest('.ks-key');
    keysMsg = '';
    if (undo || all) return renderKeys(await keysCall({ type: 'reset', id: undo ? undo.dataset.id : '' }));
    if (!key || key.classList.contains('rec') || key.classList.contains('fixed')) return;
    key.classList.add('rec');
    const mouse = !!key.dataset.mouse;
    key.textContent = mouse ? 'keys or a mouse button…' : 'press keys…';
    const r = await keysCall({ type: 'record', mouse }).catch(() => ({ cancel: true }));
    if (r.cancel) return renderKeys();
    const done = await keysCall({ type: 'set', id: key.dataset.id, combo: r.combo });
    if (done.error) keysMsg = done.error;
    renderKeys(done.error ? null : done);
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

  // Your status (the menu), friends and requests (their view), from Social's snapshot.
  function renderSocial() {
    badges();
    const s = Social.state();
    const me = s?.me;
    if (modal === 'menu') {
      setHTML(q('.mn-handle'), S.hackerName ? `${esc(S.hackerName)}<i>${tagText(S.tag)}</i>` : '');
      setHTML(q('.mn-status'), me ? `${Social.dot(me.status)}<span>${Social.PRESENCE[me.status].label}</span>▾` : `${Social.dot('offline')}<span>offline</span>`);
    }
    if (shown !== 'friends') return;
    meCard();
    const unread = Social.unread(), requests = Social.requests();
    const online = s ? s.friends.filter((f) => f.presence && f.presence !== 'offline').length : 0;
    setText(fq('.cv-friends .meta'), s ? `${s.friends.length} friends · ${online} online${unread ? ` · ${unread} unread` : ''}` : '');
    setText(fq('.cv-requests .meta'), requests ? `${requests} waiting for you` : '');
    if (!s) {
      const why = S.reachable ? 'loading…' : "can't reach the server · friends come back with the connection";
      setHTML(fq('.mn-friends'), `<div class="mn-empty">${why}</div>`);
      return;
    }
    // The friend whose card shows on the right: the one picked, else the first.
    pickedFriend = (s.friends.find((f) => f.id === pickedFriend) || s.friends[0])?.id ?? null;
    // A friend's row, as Discord's and Steam's: their picture (GitHub's once they signed in with it, their initial in
    // their rank's colour until then) with their presence on its corner; their name (a nickname you gave them first,
    // their own name#tag beside it, quieter) and the badge they display; under it what they're up to (your last
    // message, or their presence and level); their last 24 hours on the right; the buttons on hover. Online first.
    const friendRow = (f) => {
      const x = f.xp;
      const r = Xp.rank(x ? x.level : 1);
      const line = f.last ? `${f.last.mine ? 'you: ' : ''}${esc(f.last.body)}` : `${esc(Social.PRESENCE[f.presence].label)}${x ? ` · Lv ${x.level} · ${esc(r.name)}` : ''}`;
      // Their last 24 hours, not their today: that ends at their own midnight, wherever they live.
      const last24 = x && x.last24;
      const today = last24 ? `<span class="mn-today" title="Active in the last 24 hours"><b>${Xp.dur(last24)}</b><small>24h</small></span>` : '';
      // The flames, though, are a daily stat as in games: five hours of work in their today, from their own midnight.
      const fire = (x && x.today) >= 5 * 3600;
      const tag = `#${String(f.tag).padStart(4, '0')}`;
      const name = f.nick
        ? `<b class="lb-name">${esc(f.nick)}</b><i class="lb-tag">${esc(f.name)}${tag}</i>`
        : `<b class="lb-name">${esc(f.name)}</b><i class="lb-tag">${tag}</i>`;
      const pic = f.avatar ? `<img alt="" src="${esc(f.avatar)}">` : `<b>${esc((f.nick || f.name || '?').trim().charAt(0).toUpperCase())}</b>`;
      const hover = f.nick ? `${f.name}${tag} · ` : '';
      return `<div class="mn-row fr-row${fire ? ' fire' : ''}${f.id === pickedFriend ? ' sel' : ''}" data-id="${esc(f.id)}"${fire ? ' title="On fire: 5 hours of work today"' : ''}>` +
        `${fire ? '<canvas class="fire-card"></canvas>' : ''}<span class="fr-av" style="--rc:${r.color}">${pic}${Social.dot(f.presence)}</span>` +
        `<div class="mn-main" title="${esc(hover)}Click for their card · double-click to message"><span class="lb-l1">${name}` +
        `${window.Badges && f.badge ? window.Badges.small(f.badge, 24, f.id) : ''}</span><small${f.last && f.unread ? ' class="fr-new"' : ''}>${line}</small></div>` +
        `${today}${f.unread ? `<i class="cnt hot">${f.unread}</i>` : ''}<span class="fr-btns"><button class="mn-btn" type="button" data-act="profile" title="Profile: level and hours">◎</button>` +
        '<button class="mn-btn" type="button" data-act="chat" title="Message (right-click for more)">✉</button></span></div>';
    };
    const on = s.friends.filter((f) => f.presence && f.presence !== 'offline');
    const off = s.friends.filter((f) => !f.presence || f.presence === 'offline');
    const section = (label, list) => (list.length ? `<div class="fr-sec">${label} — ${list.length}</div>${list.map(friendRow).join('')}` : '');
    setHTML(
      fq('.mn-friends'),
      s.friends.length
        ? section('ONLINE', on) + section('OFFLINE', off)
        : `<div class="mn-empty">no friends yet · send them your tag: <b>${esc(S.hackerName || '')}${tagText(S.tag)}</b></div>`,
    );
    lightFires(fq('.mn-friends'));
    friendCard();
    setHTML(
      fq('.mn-in'),
      s.incoming.length
        ? s.incoming
            .map((r) => `<div class="mn-row" data-id="${esc(r.id)}">${Social.dot(r.from.presence)}<div class="mn-main">${tagged(r.from)}<small>wants to be your friend · ${ago(r.at)}</small></div>` +
              `<button class="mn-btn go" type="button" data-act="accept" title="Accept">✓</button><button class="mn-btn mn-del" type="button" data-act="decline" title="Decline">✕</button></div>`)
            .join('')
        : '<div class="mn-empty">no requests</div>',
    );
    setHTML(
      fq('.mn-out'),
      s.outgoing.length
        ? s.outgoing
            .map((r) => `<div class="mn-row" data-id="${esc(r.id)}"><i class="pdot p-offline"></i><div class="mn-main">${tagged(r.to)}<small>waiting · ${ago(r.at)}</small></div>` +
              `<button class="mn-btn mn-del" type="button" data-act="cancel" title="Take back">✕</button></div>`)
            .join('')
        : '<div class="mn-empty">nothing sent</div>',
    );
  }

  // A click on a friend shows their card on the right; a double click opens the chat (openOnDouble).
  async function listAction(e) {
    const row = e.target.closest('.mn-row');
    if (!row) return;
    const id = row.dataset.id;
    const el = e.target.closest('[data-act]');
    if (!el) return row.closest('.mn-friends') && pickFriend(id);
    switch (el.dataset.act) {
      case 'chat':
        return Social.openChat(id);
      case 'profile':
        return pickFriend(id);
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
    fq('.mn-ctx')?.remove();
    if (!row) return;
    e.preventDefault();
    const f = Social.friend(row.dataset.id);
    if (!f) return;
    const box = views.friends.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'mn-ctx';
    menu.innerHTML =
      '<button type="button" data-ctx="chat">✉ message</button><button type="button" data-ctx="profile">◎ view profile</button>' +
      `<button type="button" data-ctx="nick">✎ ${f.nick ? 'change nickname' : 'add nickname'}</button>` +
      (f.nick ? '<button type="button" data-ctx="unnick">⌫ remove nickname</button>' : '') +
      '<button type="button" data-ctx="copy">⧉ copy name#tag</button><hr><button type="button" class="danger" data-ctx="remove">✕ remove friend</button>';
    menu.style.left = `${Math.min(e.clientX - box.left, box.width - 190)}px`;
    menu.style.top = `${Math.min(e.clientY - box.top, box.height - 150)}px`;
    menu.onclick = async (ev) => {
      const b = ev.target.closest('[data-ctx]');
      if (!b) return;
      menu.remove();
      if (b.dataset.ctx === 'chat') return Social.openChat(f.id);
      if (b.dataset.ctx === 'profile') return pickFriend(f.id);
      if (b.dataset.ctx === 'nick') return nickBox(f);
      if (b.dataset.ctx === 'unnick') {
        const r = await Social.setNick(f.id, '');
        return r.error ? toast(errorText(r.error)) : toast(`nickname removed · ${Social.handle(f)} again`);
      }
      if (b.dataset.ctx === 'copy') {
        try {
          await navigator.clipboard.writeText(Social.handle(f));
          toast(`copied ${Social.handle(f)}`);
        } catch {}
        return;
      }
      confirmRemove(f);
    };
    views.friends.appendChild(menu);
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
    views.friends.appendChild(ask);
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
        : x.today >= 8 * 3600
          ? '<b>past 8 hours today</b> · half XP from here · take a break'
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
        (window.Badges ? '<div class="hk-h">BADGES</div><div class="bdg-host"></div>' : '') +
        `<div class="hk-h">RANKS</div><div class="pf-ranks">${ranks}</div>` +
        '<p class="pf-rules">1 XP for every active minute · the first 2 hours a day count double, past 8 hours half · +50 for showing up · ' +
        `${x.goal} days a week keep a streak, +10% XP for every week of it</p>`,
    );
    window.Badges?.mountInventory(q('.mn-profile .bdg-host'));
  }

  // A nickname for a friend, as on Steam: what you call them on your screens only (the friends list, the chat window),
  // on all your computers. Their own name#tag stays on their card and on hover.
  function nickBox(f) {
    fq('.mn-confirm')?.remove();
    const box = document.createElement('div');
    box.className = 'mn-confirm';
    box.innerHTML =
      `<div class="mn-ask nick-ask"><b>${f.nick ? 'Change the nickname' : 'Add a nickname'} for ${tagged(f)}</b>` +
      '<p>What you call them on your screens. Only you see it, on all your computers; their own name stays beside it.</p>' +
      `<label class="hk-field"><span class="hk-prompt">✎</span><input class="hk-input nick-in" maxlength="32" spellcheck="false" autocomplete="off" placeholder="yunus emre öztürk"><span class="hk-count nick-count"></span></label>` +
      '<div class="mn-ask-btns"><button type="button" class="mn-btn" data-ans="close">cancel</button><button type="button" class="mn-btn go" data-ans="save">save</button></div></div>';
    const input = box.querySelector('.nick-in');
    input.value = f.nick || '';
    // As many as 32 characters: a full name fits ("Yunus Emre Öztürk" is 17), the list still does.
    const count = () => (box.querySelector('.nick-count').textContent = `${input.value.length}/32`);
    input.addEventListener('input', count);
    count();
    const save = async () => {
      const nick = input.value.trim();
      box.remove();
      if (nick === (f.nick || '')) return;
      const r = await Social.setNick(f.id, nick);
      if (r.error) return toast(errorText(r.error));
      toast(nick ? `${Social.handle(f)} is ${nick} to you now` : `nickname removed · ${Social.handle(f)} again`);
    };
    box.onclick = (e) => {
      const b = e.target.closest('[data-ans]');
      if (e.target === box || (b && b.dataset.ans === 'close')) return box.remove();
      if (b && b.dataset.ans === 'save') save();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') box.remove();
    });
    views.friends.appendChild(box);
    input.focus();
    input.select();
  }

  // ---------- your profile, where the friends are (the account menu's "Profile & badges", the friends' "my profile") ----------
  // CS:GO's inventory screen across the whole view: you at the top (your picture, name, rank and XP, your hours, the badge
  // you display), your badges under it (badges.js).
  let meOpen = false;
  function setMe(on) {
    meOpen = !!on;
    views.friends.classList.toggle('me', meOpen);
    if (meOpen) return renderMe();
    fq('.me-host').innerHTML = '';
    meCard();
  }
  function openProfile() {
    window.GitView?.view('friends');
    setMe(true);
  }

  // You at the top of your friends, as on Steam: a wide card (your picture, name, status, rank, today's time, the badge
  // you display); a click opens your profile and your badges.
  function meCard() {
    const el = fq('.me-card-host');
    if (!el || !S || !S.hackerName) return el && setHTML(el, '');
    const x = S.xp;
    const r = x ? Xp.rank(x.level) : null;
    const A = window.Account?.state();
    const me = Social.state()?.me;
    const status = me ? me.status : 'offline';
    const B = window.Badges?.mine();
    const shownBadge = B && B.featured && B.badges.find((b) => b.id === B.featured && b.tier);
    const earned = B ? B.badges.filter((b) => b.tier).length : null;
    setHTML(el,
      `<div class="me-card" role="button" tabindex="0" data-me="open" title="Your profile and your badges" style="--rc:${r ? r.color : 'var(--accent-rgb)'}">` +
      (A && A.signedIn && A.avatar ? `<img class="me-card-pic" alt="" src="${esc(A.avatar)}">` : x ? Xp.headband(x.level, 'me-card-band') : '') +
      `<div class="me-card-who"><span class="mn-name"><b>${esc(S.hackerName)}</b><i class="htag">${tagText(S.tag)}</i>` +
      `${shownBadge ? window.Badges.small(shownBadge, 20) : ''}${x ? Xp.badge(x.level) : ''}<em class="lb-you">you</em></span>` +
      `<small>${Social.dot(status)} ${esc(Social.PRESENCE[status]?.label || status)}${r ? ` · ${esc(r.name)}` : ''}</small>` +
      (x ? `<i class="me-card-xp"><i style="width:${Xp.pct(x).toFixed(1)}%"></i></i>` : '') + '</div>' +
      (x ? `<div class="me-card-stat"><b>${Xp.dur(x.today)}</b><small>today</small></div><div class="me-card-stat"><b>${Xp.hours(x.total)}</b><small>total</small></div>` : '') +
      (B && B.prestige && B.prestige.can ? '<span class="me-card-medal" title="Level 60: this year\'s Service Medal is yours to take">★ SERVICE MEDAL</span>' : '') +
      (earned !== null && B.signedIn ? `<div class="me-card-stat"><b>${earned}</b><small>badges</small></div>` : '') +
      '<span class="me-card-go">inventory ›</span></div>');
  }

  function renderMe() {
    const el = fq('.me-host');
    if (!el || !S) return;
    const x = S.xp;
    const r = x ? Xp.rank(x.level) : null;
    const A = window.Account?.state();
    const pic = A && A.signedIn && A.avatar ? `<img class="me-pic" alt="" src="${esc(A.avatar)}">` : '';
    const hero =
      `<div class="me-hero" style="--rc:${r ? r.color : 'var(--accent-rgb)'}"><div class="me-id">${pic}` +
      (x ? Xp.headband(x.level, 'me-band') : '') +
      `<div class="me-who"><b>${esc(S.hackerName || 'hacker')}<i>${tagText(S.tag)}</i></b>` +
      (x
        ? `<span class="me-rank">${esc(r.name)} · Level ${x.level}</span><div class="pf-bar"><i style="width:${Xp.pct(x).toFixed(1)}%"></i></div>` +
          `<small>${x.to ? `${Xp.num(x.to - x.xp)} XP to level ${x.level + 1}` : 'top level'} · ${Xp.num(x.xp)} XP</small>`
        : `<small>${S.reachable ? 'loading…' : "can't reach the server"}</small>`) +
      `<small class="me-acct">${A && A.signedIn ? `✓ signed in${A.github ? ` · GitHub ${esc(A.github)}` : ''}` : 'not signed in · badges need an account'}</small></div></div>` +
      (A && A.signedIn && window.Profile ? window.Profile.links(A) : '') +
      (x
        ? `<div class="me-stats">${stat('TODAY', Xp.dur(x.today))}${stat('THIS WEEK', `${x.week}/${x.goal} days`)}` +
          `${stat('STREAK', `${x.streak} ${x.streak === 1 ? 'week' : 'weeks'}`)}${stat('TOTAL', Xp.hours(x.total))}</div>`
        : '<div class="me-stats"></div>') +
      '<div class="me-show"></div></div>';
    // The hero is redrawn as your XP moves; the badges keep their own place (and their hover) below it.
    let top = el.querySelector(':scope > .me-top');
    if (!top) {
      el.innerHTML = '<div class="me-top"></div><div class="me-inv"></div>';
      top = el.querySelector('.me-top');
      top.innerHTML = hero;
      top.__h = hero;
      window.Badges?.mountShowcase(top.querySelector('.me-show'), el.querySelector('.me-inv'));
      return;
    }
    if (top.__h === hero) return;
    top.__h = hero;
    const show = top.querySelector('.me-show');
    const tmp = document.createElement('div');
    tmp.innerHTML = hero;
    tmp.querySelector('.me-show').replaceWith(show);
    top.replaceChildren(...tmp.childNodes);
  }

  // The friend picked in the list (a click; the first one until then), their card on the right as the leaderboard's:
  // their rank and level, and their active time unless they keep it to themselves.
  let pickedFriend = null;
  function pickFriend(id) {
    if (!Social.friend(id)) return;
    pickedFriend = id;
    views.friends.querySelectorAll('.mn-friends .mn-row').forEach((r) => r.classList.toggle('sel', r.dataset.id === id));
    friendCard();
  }

  function friendCard() {
    const f = pickedFriend && Social.friend(pickedFriend);
    if (!f) return setHTML(fq('.fr-host'), '<div class="mn-empty">your friends\' cards show here</div>');
    const x = f.xp || { level: 1, today: null, days: null, week: null, total: null };
    const r = Xp.rank(x.level);
    setHTML(
      fq('.fr-host'),
      // Their GitHub picture once they signed in with it, as Steam shows a friend's; their rank's headband until then.
      `<div class="pf-card" style="--rc:${r.color}"><div class="pf-head">${f.avatar ? `<img class="pf-pic" alt="" src="${esc(f.avatar)}">` : Xp.headband(x.level, 'pf-band')}` +
        `<div class="pf-rank"><small>${Social.dot(f.presence)} ${esc(Social.PRESENCE[f.presence || 'offline'].label)}</small>` +
        (f.nick ? `<b class="pf-nick">${esc(f.nick)}</b><em class="pf-real">${tagged(f)}</em>` : tagged(f)) +
        `<span>Level ${x.level} · ${esc(r.name)}</span></div></div>` +
        // Their GitHub, Instagram, LinkedIn… once they added them (profile.js).
        (window.Profile ? window.Profile.links(f) : '') +
        (x.total === null
          ? '<p class="pf-note">keeps their active time to themselves</p>'
          : `<div class="pf-stats">${stat('LAST 24H', x.last24 == null ? '—' : Xp.dur(x.last24))}${stat('THIS WEEK', `${x.week}/3 days`)}${stat('TOTAL', Xp.hours(x.total))}</div>` +
            (x.days ? `<div class="hk-h">LAST 7 DAYS</div>${Xp.week(x.days, r.color, x.daysEnd)}` : '')) +
        (window.Badges ? `<div class="hk-h">BADGES</div><div class="bdg-friend" data-id="${esc(f.id)}"></div>` : '') +
        '<div class="mn-ask-btns"><button type="button" class="mn-btn go" data-ans="chat">✉ message</button></div></div>',
    );
    window.Badges?.mountFriend(fq('.fr-host .bdg-friend'), f.id);
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

  // Settings · POWER: power save on by itself at low battery, as the Mac app keeps it (app.js setPowerSave).
  function renderPower() {
    const sw = modal === 'menu' && q('.hk-sw.pwr-auto');
    const s = window.__powerSave;
    if (!sw || !s) return;
    sw.classList.toggle('on', s.auto);
    sw.setAttribute('aria-checked', String(s.auto));
  }

  // Settings · DISCORD: your Discord profile shows what you're doing, as the app keeps it (DiscordPresence.swift, the
  // Windows app's discord.js).
  function renderDiscord() {
    const on = modal === 'menu' && q('.hk-sw.dc-on');
    const s = window.__discord;
    if (!on || !s) return;
    const proj = q('.hk-sw.dc-proj'), act = q('.hk-sw.dc-act');
    for (const [sw, value] of [[on, s.on], [proj, s.project], [act, s.active !== false]]) {
      sw.classList.toggle('on', value);
      sw.setAttribute('aria-checked', String(value));
    }
    on.disabled = !s.available;
    proj.disabled = act.disabled = !s.available || !s.on;
    q('.dc-note').textContent = !s.available
      ? 'this build has no Discord application id'
      : !s.on
        ? 'on your profile as a game: how many sessions run and the AI tools at work · never prompts, code or file names'
        : s.connected
          ? 'on your profile now · how many sessions run and the AI tools at work, never prompts, code or file names'
          : 'waiting for Discord · open the Discord app on this Mac';
  }

  async function toggleBoard() {
    if (!S.xp) return;
    const show = S.xp.board === false;
    const r = await Social.setBoard(show);
    if (r.error) return toast(errorText(r.error));
    S.xp = { ...S.xp, board: show };
    renderActivity();
    board = null;
    if (shown === 'board') loadBoard();
    toast(show ? 'your name shows on the leaderboard again' : "you're Anonymous on the leaderboard · only you see your name there");
  }

  // ---------- the leaderboard: everyone with XP, this week (since Monday), ever or among friends, a friend request one click away ----------
  // At its top everyone's week together (the API's `community`: the hours, day by day, and a goal for all), the first
  // three on a podium, where each one stood yesterday (▲/▼), you pinned to the list's edge with how far the one above
  // you is, and NEAR ME (the two on either side of you): a place among people within reach drives more than a long list.
  let boardBy = 'week';
  let boardNear = false;
  try {
    boardNear = localStorage.getItem('lb-near') === '1';
  } catch {}
  // Their active time this week, as the board counts its XP: from their Monday (the last of their 7 days is their today).
  const weekActive = (u) => {
    if (!u.days) return null;
    const sinceMonday = u.daysEnd ? new Date(u.daysEnd + 'T00:00:00Z').getUTCDay() || 7 : 7;
    return u.days.slice(-sinceMonday).reduce((a, s) => a + (s || 0), 0);
  };
  let board = null; // the API's answer: { by, rows, around, me, working, community }
  let boardSeq = 0;
  let boardTimer = null;
  let counted = false; // the week's hours have counted up since the view opened (once, never on a refresh)
  let fetched = false; // the board came from the API since the view opened (until then the last one shows)
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const score = (u) => (boardBy === 'all' ? u.xp : u.week) || 0;
  const scoreText = (u) => (boardBy === 'all' ? Xp.num(u.xp) : `+${Xp.num(u.week)}`);
  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortH = (s) => (s >= 3600 ? `${Math.round(s / 3600)}h` : `${Math.round(s / 60)}m`);

  // `live`: the minute's refresh while the board shows. It keeps what's shown if it fails, and whoever moved slides.
  async function loadBoard(live) {
    if (live && shown !== 'board') return;
    const seq = ++boardSeq;
    clearTimeout(boardTimer);
    if (!live) renderBoard();
    const r = await Social.leaderboard(boardBy);
    if (seq !== boardSeq) return;
    if (!(live && r.error)) {
      const before = live ? rowTops() : null;
      board = r;
      fetched = true;
      renderBoard();
      if (!r.error) announceMove(r.me);
      if (before) slide(before);
    }
    // It follows everyone's minutes while it's shown: once a minute, as the heartbeat counts them.
    if (shown === 'board') boardTimer = setTimeout(() => loadBoard(true), 60_000);
  }

  // Everyone on the board as it came: the top 100, the ones around you further down, and you.
  const boardAll = () => {
    if (!board || board.error) return [];
    const seen = new Map();
    for (const u of [...board.rows, ...(board.around || []), board.me]) if (u && !seen.has(u.pos)) seen.set(u.pos, u);
    return [...seen.values()].sort((x, y) => x.pos - y.pos);
  };
  const boardUser = (id) => (id && boardAll().find((u) => u.id === id)) || null;

  // What you can do about someone on the board: nothing (you, or someone Anonymous), message (a friend), wait (asked
  // them), or ask.
  function boardButton(u, key) {
    if (u.me || !u.id) return '';
    if (u.friend) return `<button type="button" class="mn-btn" data-${key}="chat" title="Message">✉</button>`;
    if (u.requested) return '<span class="lb-state">request sent</span>';
    return `<button type="button" class="mn-btn go" data-${key}="add" title="${u.asked ? 'They asked you: accept' : 'Send a friend request'}">${u.asked ? '✓ accept' : '+ add'}</button>`;
  }

  // Since yesterday, only on your own row (a list of arrows on every row reads as noise): a small chevron, up or down,
  // the places in its tooltip; the change itself is said once in a notice (announceMove). Nothing on your Monday on the
  // weekly boards, where everyone started again from nothing.
  const weeklyReset = () => boardBy !== 'all' && new Date().getDay() === 1;
  function myMove(u) {
    if (!u.me || u.prev == null || weeklyReset()) return '';
    const d = u.prev - u.pos;
    if (!d) return '';
    return `<svg class="lb-chev ${d > 0 ? 'up' : 'down'}" viewBox="0 0 10 10" aria-label="${d > 0 ? 'up' : 'down'} ${Math.abs(d)} since yesterday"><title>${d > 0 ? 'Up' : 'Down'} ${Math.abs(d)} ${Math.abs(d) === 1 ? 'place' : 'places'} since yesterday</title><path d="${d > 0 ? 'M1.5 7 5 3.2 8.5 7' : 'M1.5 3 5 6.8 8.5 3'}"/></svg>`;
  }
  // Your place changed: said once, in a notice. Since yesterday on the first look of the day (per tab), and at a refresh
  // while the board is open.
  const seenPos = {};
  function announceMove(me) {
    if (!me || !me.pos) return;
    const where = boardBy === 'friends' ? 'among your friends' : boardBy === 'all' ? 'of all time' : 'this week';
    const was = seenPos[boardBy];
    seenPos[boardBy] = me.pos;
    if (was && was !== me.pos) return toast(me.pos < was ? `you climbed to #${me.pos} ${where}` : `you dropped to #${me.pos} ${where}`);
    if (was || me.prev == null || me.prev === me.pos || weeklyReset()) return;
    const key = `lb-told-${boardBy}-${new Date().toLocaleDateString('sv')}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {}
    const d = me.prev - me.pos;
    toast(`${d > 0 ? 'up' : 'down'} ${Math.abs(d)} ${Math.abs(d) === 1 ? 'place' : 'places'} since yesterday · #${me.pos} ${where}`);
  }

  // Yours: how far the one above you is (or, first, how far ahead of the second you are).
  function gapLine(u, all) {
    const above = all.find((x) => x.pos === u.pos - 1);
    if (above) {
      const g = score(above) - score(u);
      return `<b class="lb-gapx">${g > 0 ? `${Xp.num(g)} XP behind #${above.pos}` : `level with #${above.pos}`}</b>`;
    }
    const below = all.find((x) => x.pos === u.pos + 1);
    return u.pos === 1 && below ? `<b class="lb-gapx">${Xp.num(score(u) - score(below))} XP ahead of #2</b>` : '';
  }

  // Five hours of work today, from their own midnight (a daily stat, as in games): the card burns. Their today is the
  // last of their 7 days (null while they're invisible).
  const burning = (u) => !!u.id && !!u.days && u.days[u.days.length - 1] >= 5 * 3600;

  // Someone's picture: GitHub's once they signed in with it, their initial in their rank's colour until then (a question
  // mark for someone Anonymous).
  const avatar = (u, r, cls = '') =>
    `<span class="fr-av ${cls}" style="--rc:${r.color}">${u.avatar ? `<img alt="" src="${esc(u.avatar)}">` : `<b>${u.id ? esc((u.name || '?').trim().charAt(0).toUpperCase()) : '?'}</b>`}</span>`;

  // A row: the place (a medal for the first three when there's no podium), who (name, #tag, the badge they display;
  // under it their level, rank and week), their last 7 days, the score, and what you can do about them (on hover).
  function boardRow(u, all, medals) {
    const r = Xp.rank(u.level);
    const pos = medals && u.pos <= 3 ? `<i class="lb-disc m${u.pos}">${u.pos}</i>` : u.pos;
    // Hid their name, like on Riot's ladders: their place, level and score, nothing that tells who they are.
    if (!u.id) {
      return (
        `<div class="lb-row anon" style="--rc:${r.color}"><span class="lb-pos">${pos}</span>${avatar(u, r, 'lb-av')}` +
        `<div class="lb-who"><span class="lb-l1"><b class="lb-anon">Anonymous</b></span><small>Lv ${u.level} · ${esc(r.name)}</small></div>` +
        `<span class="lb-spark off"></span><span class="lb-score">${scoreText(u)}<i>XP</i></span><span class="lb-act"></span></div>`
      );
    }
    const active = weekActive(u);
    const fire = burning(u);
    const spark = u.days
      ? `<span class="lb-spark" title="Their last 7 days">${u.days.map((s) => `<i style="height:${s ? Math.max(12, Math.min(100, (s / 28_800) * 100)).toFixed(0) : 0}%"></i>`).join('')}</span>`
      : '<span class="lb-spark off" title="keeps their active time to themselves"></span>';
    const meta = [u.me ? gapLine(u, all) : '', `Lv ${u.level} · ${esc(r.name)}`, active === null ? '' : `${Xp.dur(active)} this week`].filter(Boolean).join(' · ');
    return (
      `<div class="lb-row${u.me ? ' me' : ''}${fire ? ' fire' : ''}" data-id="${esc(u.id)}" style="--rc:${r.color}"${fire ? ' title="On fire: 5 hours of work today"' : ''}>` +
      `${fire ? '<canvas class="fire-card"></canvas>' : ''}<span class="lb-pos">${pos}${myMove(u)}</span>${avatar(u, r, 'lb-av')}` +
      `<div class="lb-who"><span class="lb-l1">${u.working ? '<i class="lb-live" title="working now"></i>' : ''}<b class="lb-name">${esc(u.name)}</b><i class="lb-tag">#${String(u.tag).padStart(4, '0')}</i>` +
      `${window.Badges && u.badge ? window.Badges.small(u.badge, 22, u.me ? null : u.id) : ''}${u.me ? '<em class="lb-you">you</em>' : ''}` +
      `${u.me && u.anon ? '<em class="lb-hid" title="Others see you as Anonymous">hidden</em>' : ''}</span>` +
      `<small>${meta}</small></div>${spark}` +
      `<span class="lb-score">${scoreText(u)}<i>XP</i></span><span class="lb-act">${boardButton(u, 'act')}</span></div>`
    );
  }

  // The first three, second · first · third as on a podium (the first one taller): a medal (gold, silver, bronze, its
  // number on it), the badge each one displays big (their headband without one), their name, level and score, and the
  // flames if they're burning.
  function podium(top) {
    const cell = (u, place) => {
      if (!u) return '<div class="lb-pod-c empty"></div>';
      const r = Xp.rank(u.level);
      const fire = burning(u);
      // Their picture with the badge they display on its corner; without a picture the badge big, or their headband.
      const badge = window.Badges && u.badge ? window.Badges.small(u.badge, u.avatar ? 30 : place === 1 ? 56 : 46, u.me ? null : u.id) : '';
      const art = u.avatar ? `<span class="lb-pod-av">${avatar(u, r)}${badge}</span>` : badge || Xp.headband(u.level, 'lb-pod-hb');
      return (
        `<div class="lb-pod-c p${place}${u.me ? ' me' : ''}${u.id ? '' : ' anon'}${fire ? ' fire' : ''}"${u.id ? ` data-id="${esc(u.id)}"` : ''}${fire ? ' title="On fire: 5 hours of work today"' : ''}>` +
        `${fire ? '<canvas class="fire-card"></canvas>' : ''}<i class="lb-disc m${place}">${place}</i>${myMove(u)}<div class="lb-pod-art">${art}</div>` +
        `<span class="lb-l1">${u.working ? '<i class="lb-live" title="working now"></i>' : ''}${u.id ? `<b class="lb-name">${esc(u.name)}</b><i class="lb-tag">#${String(u.tag).padStart(4, '0')}</i>` : '<b class="lb-anon">Anonymous</b>'}</span>` +
        `<small>Lv ${u.level} · ${esc(r.name)}${u.me ? ' · <em class="lb-you">you</em>' : ''}</small><b class="lb-pod-score">${scoreText(u)}<i>XP</i></b></div>`
      );
    };
    return `<div class="lb-pod">${cell(top[1], 2)}${cell(top[0], 1)}${cell(top[2], 3)}</div>`;
  }

  // Everyone's week together, each part named: the hours (counted up when the board opens), how many coded and how
  // many are at it now, against last week at the same moment, the hours of each day, and the goal everyone fills.
  function communityHTML(c) {
    const h = Math.floor(c.seconds / 3600);
    const trend = c.lastWeekSoFar >= 3600 ? Math.round((100 * (c.seconds - c.lastWeekSoFar)) / c.lastWeekSoFar) : null;
    const max = Math.max(3600, ...c.days.map((s) => s || 0));
    const today = c.days.filter((s) => s !== null).length - 1;
    const days = c.days
      .map((s, i) => {
        const tip = `${WEEKDAYS[i]}: ${s === null ? 'still to come' : `${Xp.dur(s)} together`}`;
        return `<div class="lb-cd${i === today ? ' today' : ''}${s === null ? ' later' : ''}" title="${tip}"><em>${s ? shortH(s) : ''}</em>` +
          `<b><i style="height:${s ? Math.max(4, (100 * s) / max).toFixed(1) : 0}%"></i></b><span>${i === today ? 'Today' : WEEKDAYS[i].slice(0, 3)}</span></div>`;
      })
      .join('');
    const goal = Math.round(c.goal / 3600);
    const done = c.seconds >= c.goal;
    const facts = [
      `${Xp.num(c.people)} ${c.people === 1 ? 'hacker' : 'hackers'}`,
      board.working ? `<span class="lb-now"><i class="lb-live"></i>${board.working} working now</span>` : '',
      trend === null ? '' : `<span class="lb-trend ${trend >= 0 ? 'up' : 'down'}">${trend >= 0 ? '+' : '−'}${Xp.num(Math.abs(trend))}% vs last week</span>`,
    ].filter(Boolean).join('<i class="lb-sep">·</i>');
    return (
      `<div class="lb-com-top"><div class="lb-big"><label class="lb-lbl">EVERYONE THIS WEEK</label><div><b>${Xp.num(h)}</b><span>hours coded together</span></div>` +
      `<p class="lb-facts">${facts}</p></div>` +
      `<div class="lb-cwrap"><label class="lb-lbl">HOURS PER DAY</label><div class="lb-cdays">${days}</div></div></div>` +
      `<div class="lb-goal${done ? ' done' : ''}" title="This week's goal for everyone: last week's hours and a fifth more"><label class="lb-lbl">WEEKLY GOAL</label>` +
      `<i><i style="width:${Math.min(100, (100 * c.seconds) / c.goal).toFixed(1)}%"></i></i><span>${Xp.num(Math.min(h, goal))} / ${Xp.num(goal)} h</span>` +
      `<small>${done ? '✓ reached together' : 'last week +20%'}</small></div>`
    );
  }

  // The week's hours count up from nothing when the board opens (0.7 s, slowing at the end), never on a refresh.
  function countUp(el, to) {
    if (!el || counted) return;
    counted = true;
    if (reduced()) return;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 700);
      el.textContent = Xp.num(Math.round(to * (1 - (1 - k) ** 3)));
      if (k < 1 && el.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderBoard() {
    const host = views.board.querySelector('.lb-host');
    if (!host.querySelector('.lb-body')) host.innerHTML = '<div class="lb-head"></div><div class="lb-com"></div><div class="lb-body"></div>';
    const all = boardAll();
    const me = board && !board.error ? board.me : null;
    const tab = (by, label) => `<button type="button" data-by="${by}" class="${boardBy === by ? 'on' : ''}">${label}</button>`;
    const c = board && !board.error ? board.community : null;
    setHTML(host.querySelector('.lb-head'),
      `<div class="lb-seg">${tab('week', 'THIS WEEK')}${tab('all', 'ALL TIME')}${tab('friends', 'FRIENDS')}</div>` +
      `<button type="button" class="lb-near${boardNear ? ' on' : ''}" data-near title="The podium and the two above and below you"${me ? '' : ' disabled'}><i></i>NEAR ME</button>` +
      // What the tab counts, in a word; who's at work right now shows on the strip (an API without one says it here).
      `<span class="lb-note">${!c && board?.working ? `<b class="lb-now"><i class="lb-live"></i>${board.working} working now</b> · ` : ''}` +
      `${boardBy === 'all' ? 'all the XP ever earned' : boardBy === 'friends' ? 'you and your friends, XP since Monday' : 'XP earned since Monday'}</span>`);
    const com = host.querySelector('.lb-com');
    if (c) {
      setHTML(com, communityHTML(c));
      if (fetched) countUp(com.querySelector('.lb-big b'), Math.floor(c.seconds / 3600));
    }
    com.hidden = !c;
    const body = host.querySelector('.lb-body');
    if (!board || board.error) {
      const why = !board ? (S.reachable ? 'loading…' : "can't reach the server · the leaderboard comes back with the connection") : errorText(board.error);
      return setHTML(body, `<div class="mn-empty">${why}</div>`);
    }
    // The podium once there are more than three; NEAR ME keeps it and the two on either side of you.
    const top = all.length > 3 ? all.slice(0, 3) : [];
    let rest = all.slice(top.length);
    if (boardNear && me) rest = rest.filter((u) => Math.abs(u.pos - me.pos) <= 2);
    let list = '';
    let last = top.length;
    for (const u of rest) {
      if (u.pos !== last + 1) list += '<div class="lb-gap">· · ·</div>';
      list += boardRow(u, all, !top.length);
      last = u.pos;
    }
    if (boardNear && me && me.pos <= 3 && !rest.length) list = '';
    // What each column is, once, above the rows.
    const cols = `<div class="lb-cols"><span>#</span><span></span><span>HACKER</span><span>7 DAYS</span><span>${boardBy === 'all' ? 'XP EVER' : 'XP THIS WEEK'}</span><span></span></div>`;
    const empty = !all.length
      ? '<div class="mn-empty">no one on the leaderboard yet</div>'
      : boardBy === 'friends' && all.length === 1
        ? '<p class="lb-foot">add friends to race them here · the leaderboard\'s + add, or name#0427 in Friends</p>'
        : '';
    const absent = me ? '' : `<p class="lb-foot">you'll show up here once you have some XP</p>`;
    setHTML(body, (top.length ? podium(top) : '') + (list ? `<div class="lb-list">${cols}${list}</div>` : '') + empty + absent);
    lightFires(body);
    body.querySelectorAll('[data-id]').forEach((r) => r.classList.toggle('sel', !!picked && r.dataset.id === picked));
    // Someone's card shows from the start: the one picked before, you, or the first with a name; drawn again when their
    // place or score on this board changed (another tab, a refresh).
    const first = boardUser(picked) || me || all.find((u) => u.id);
    if (first && cardKey(first) !== cardShown) boardCard(first);
  }
  let cardShown = null;
  const cardKey = (u) => `${boardBy}:${u.id}:${u.pos}:${score(u)}:${u.friend}:${u.requested}`;

  // Where each one's row was before a refresh, so whoever moved slides from there (FLIP) and lights up once.
  function rowTops() {
    const m = new Map();
    views.board.querySelectorAll('.lb-body .lb-row[data-id]').forEach((r) => m.set(r.dataset.id, r.getBoundingClientRect().top));
    return m;
  }
  function slide(before) {
    if (reduced()) return;
    views.board.querySelectorAll('.lb-body .lb-row[data-id]').forEach((r) => {
      const was = before.get(r.dataset.id);
      if (was == null) return;
      const dy = was - r.getBoundingClientRect().top;
      if (Math.abs(dy) < 2) return;
      r.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
      r.classList.add('moved');
      r.addEventListener('animationend', () => r.classList.remove('moved'), { once: true });
    });
  }

  // Burning cards (five hours of work today, on the leaderboard and among friends): flames burn along their bottom,
  // under the text (now and then a tongue licks up behind it), for as long as they're shown.
  const lit = new WeakSet();
  function lightFires(el) {
    el.querySelectorAll('.fire-card').forEach((c) => {
      if (lit.has(c)) return;
      lit.add(c);
      Fire.burn(c, { reach: [13, 0, 0], scale: 7 });
    });
  }

  async function boardAction(e) {
    const seg = e.target.closest('[data-by]');
    if (seg) {
      if (seg.dataset.by === boardBy) return;
      boardBy = seg.dataset.by;
      board = null;
      return loadBoard();
    }
    if (e.target.closest('[data-near]')) {
      boardNear = !boardNear;
      try {
        localStorage.setItem('lb-near', boardNear ? '1' : '0');
      } catch {}
      return renderBoard();
    }
    const row = e.target.closest('.lb-row, .lb-pod-c');
    const u = row && row.dataset.id && boardUser(row.dataset.id);
    if (!u) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'chat') return Social.openChat(u.id);
    if (act === 'add') return addFromBoard(u, e.target.closest('button'));
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
    if (picked === u.id) boardCard(u);
  }

  // Someone's card from the board, in their own theme (the one they picked in their app; the default before themes
  // existed): their rank and level, their week, a friend request (or a message, a friend), and their theme, yours in one
  // click.
  let picked = null;
  async function boardCard(u) {
    picked = u.id;
    cardShown = cardKey(u);
    views.board.querySelectorAll('.lb-body [data-id]').forEach((r) => r.classList.toggle('sel', r.dataset.id === u.id));
    const list = await themeList();
    if (picked !== u.id) return;
    const t = list && (list.themes.find((x) => x.id === (u.theme || 'atalay')) || list.themes[0]);
    const host = views.board.querySelector('.cv-card');
    host.setAttribute('style', t ? themeStyle(t.tokens) : '');
    host.querySelector('.meta').textContent = t ? `in their theme · ${t.name}` : '';
    const r = Xp.rank(u.level);
    const active = weekActive(u);
    const theirs = !t ? '' : u.me ? '<em>yours</em>' : t.id === list.chosen ? '<em>you use it too</em>'
      : '<button type="button" class="mn-btn go" data-ans="theme" title="Use their theme">use this theme</button>';
    setHTML(host.querySelector('.pf-host'),
      `<div class="pf-card" style="--rc:${r.color}"><div class="pf-head">${u.avatar ? `<img class="pf-pic" alt="" src="${esc(u.avatar)}">` : Xp.headband(u.level, 'pf-band')}` +
      `<div class="pf-rank"><small>#${u.pos} ${boardBy === 'friends' ? 'among friends' : 'on the leaderboard'}${u.me ? ' · you' : ''}</small>${tagged(u)}<span>Level ${u.level} · ${esc(r.name)}</span></div></div>` +
      (window.Profile ? window.Profile.links(u) : '') +
      `<div class="pf-stats">${stat('LAST 24H', u.last24 == null ? '—' : Xp.dur(u.last24))}${stat('THIS WEEK', `+${Xp.num(u.week)} XP`)}${stat('ACTIVE', active === null ? '—' : Xp.dur(active))}${stat('TOTAL', `${Xp.num(u.xp)} XP`)}</div>` +
      (u.days ? `<div class="hk-h">LAST 7 DAYS</div>${Xp.week(u.days, r.color, u.daysEnd)}` : '<p class="pf-note">keeps their active time to themselves</p>') +
      (t ? `<div class="pf-theme"><span><label>THEME</label><b>${esc(t.name)}</b></span>${theirs}</div>` : '') +
      // Their badges: a friend's (and your own) whole inventory, as a Steam inventory; anyone else's displayed one, and
      // the rest for their friends.
      (window.Badges
        ? `<div class="hk-h">BADGES</div>${u.me || u.friend || u.badge ? `<div class="bdg-friend" data-id="${esc(u.id)}"></div>` : '<p class="pf-note">no badge on display</p>'}` +
          (u.me || u.friend ? '' : '<p class="pf-note lb-inv-note">friends see their whole inventory</p>')
        : '') +
      `<div class="mn-ask-btns">${boardButton(u, 'ans')}</div></div>`);
    if (u.me || u.friend || u.badge) window.Badges?.mountFriend(host.querySelector('.pf-host .bdg-friend'), u.id);
    host.querySelector('.pf-host').onclick = async (e) => {
      const b = e.target.closest('[data-ans]');
      if (!b) return;
      if (b.dataset.ans === 'chat') Social.openChat(u.id);
      if (b.dataset.ans === 'add') addFromBoard(u, b);
      if (b.dataset.ans === 'theme' && t) {
        await theme('choose', { id: t.id }).catch(() => {});
        list.chosen = t.id;
        toast(`your theme is ${t.name} now`);
        boardCard(u);
      }
    };
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
    const n = Social.unread() + Social.requests(), notes = Social.unreadNotes();
    const show = (b, k) => {
      if (!b) return;
      b.textContent = k > 99 ? '99+' : k;
      b.hidden = !k;
    };
    show(document.querySelector('#activity [data-view=friends] .vs-badge'), n);
    show(document.querySelector('#activity [data-view=notifications] .vs-badge'), notes);
    const me = brand.querySelector('.bme');
    const st = Social.state()?.me?.status;
    me.hidden = !st;
    if (st) me.className = `pdot bme p-${st}`;
  }
  Social.on(() => renderSocial());

  // Settings: the version and its updates. They download by themselves and go in when you step away (or at once, with
  // the switch); "check for updates" asks now, "update now" shows what's new and restarts into it.
  function renderInfo() {
    const el = q('.hk-info');
    if (!el) return;
    const status = S.updating
      ? `<em>${esc(S.updating + pct())}</em>`
      : S.update
        ? `<em class="${S.xpPaused ? 'bad' : ''}">${esc(S.update.version)} ${S.updateReady ? 'ready · installs when you step away' : `is out · downloading${pct()}`}${S.xpPaused ? ' · XP paused until then' : ''}</em>`
        : S.checking
          ? '<em class="dim">checking…</em>'
          : S.checkedAt
            ? `<em class="dim">up to date · checked ${ago(S.checkedAt)}</em>`
            : '';
    setHTML(
      el,
      `<div class="hk-row"><span>version</span><div class="hk-val"><b>${esc(S.version || '?')}</b>${status}</div></div>` +
        '<div class="hk-row"><span>updates<small>they download by themselves and install when you step away · your chats keep running</small></span><div class="hk-val">' +
        `<button type="button" class="hk-upd hk-check"${S.checking || S.updating ? ' disabled' : ''}>check for updates</button>` +
        `${S.update && !S.updating ? '<button type="button" class="hk-upd hk-now">update now</button>' : ''}</div></div>` +
        `<div class="hk-row"><span>install updates right away<small>off: an update waits until you're away for 10 minutes</small></span>` +
        `<button type="button" class="hk-sw upd${S.updateRightAway ? ' on' : ''}" role="switch" aria-checked="${!!S.updateRightAway}" title="Install updates as soon as they're downloaded"><i></i></button></div>`,
    );
    el.querySelector('.hk-check').onclick = () => call('checkUpdate').then((s) => s && render(s)).catch(() => toast(errorText('offline')));
    const now = el.querySelector('.hk-now');
    if (now) now.onclick = openUpdate;
    el.querySelector('.hk-sw.upd').onclick = () => call('updateRightAway', { on: !S.updateRightAway }).then((s) => s && render(s));
  }


  // ---------- themes ----------
  // Swift makes and applies the colours (Themes.swift, the "theme" handler); the list comes once, with every theme's
  // colours, for the theme view's pictures and for someone's card in their theme.
  const theme = (type, payload) => window.webkit.messageHandlers.theme.postMessage(Object.assign({ type }, payload || {}));
  let themes = null;
  const themeList = async () => themes || (themes = await theme('list').catch(() => null));
  // A theme's colours on one element and what's in it: its tokens, those made from them again (style.css makes them on
  // the root, from the root's), and its text colour.
  const themeStyle = (tokens) =>
    Object.entries(tokens).map(([k, v]) => `${k}:${v}`).join(';') +
    ';--panel:rgba(var(--panel-rgb),var(--glass-a));--line:rgba(var(--accent-rgb),0.32);--line-soft:rgba(var(--accent-rgb),0.13);color:var(--txt)';
  let themeAt = -1; // the card the arrow keys are on

  function themeCard(t, kept) {
    const k = t.tokens, a = (i) => k[`--a${i}`];
    const vars = {
      '--t-bg': k['--bg'], '--t-panel': `rgb(${k['--panel-rgb']})`, '--t-acc': k['--accent'], '--t-soft': k['--accent-soft'], '--t-txt': k['--txt'],
      '--t-dim': k['--dim'], '--t-cyan': k['--cyan'], '--t-warn': k['--warn'], '--t-code': k['--code-bg'], '--t-fg': k['--code-fg'], '--t-cur': k['--code-cursor'],
    };
    const style = Object.entries(vars).map(([n, v]) => `${n}:${v}`).join(';');
    return (
      `<button type="button" class="th-card${t.id === kept ? ' on' : ''}" data-id="${esc(t.id)}" style="${esc(style)}">` +
      '<span class="th-shot"><span class="th-top"><i></i><b>ATALAY\'S</b><em></em></span>' +
      '<span class="th-side"><i class="busy"></i><i class="idle"></i><i class="wait"></i></span>' +
      `<span class="th-term"><span><b style="color:${a(2)}">❯</b> git status</span><span style="color:${a(1)}">  modified: app.js</span>` +
      `<span style="color:${a(2)}">  new file: themes.json</span><span><b style="color:${a(4)}">~/repo</b> <b style="color:${a(5)}">main</b> <i class="cur"></i></span></span>` +
      `<span class="th-pal">${Array.from({ length: 16 }, (_, i) => `<i style="background:${a(i)}"></i>`).join('')}</span></span>` +
      `<span class="th-name">${esc(t.name)}<em>${t.id === kept ? 'ACTIVE' : ''}</em></span></button>`
    );
  }

  // The themes view: each theme as a small picture of the app in its own colours. Pointing at one, or moving to it with
  // the arrow keys, shows the whole app in it at once; a click (or ↩) keeps it; leaving the cards or the view goes back
  // to the kept one.
  async function openThemes() {
    const el = views.themes;
    const list = await themeList();
    if (shown !== 'themes') return;
    if (!list || !list.themes) return setHTML(el, `<section class="panel cv-themes"><header><span class="tag">themes</span></header><div class="mn-empty">themes didn't load</div></section>`);
    el.innerHTML =
      `<section class="panel cv-themes"><header><span class="tag">themes</span><span class="meta">${list.themes.length} themes · point to try · click to keep${MACHINE === 'PC' ? ' · the orbit map keeps its colours' : ''}</span></header>` +
      `<div class="body th-grid">${list.themes.map((t) => themeCard(t, list.chosen)).join('')}</div></section>`;
    const cards = [...el.querySelectorAll('.th-card')];
    let timer = 0;
    themeAt = -1;
    const show = (id) => {
      clearTimeout(timer);
      timer = setTimeout(() => theme(id === list.chosen ? 'revert' : 'preview', { id }), 90);
    };
    const mark = (i) => {
      themeAt = i;
      cards.forEach((c, j) => c.classList.toggle('hot', j === i));
    };
    const keep = (card) => {
      list.chosen = card.dataset.id;
      clearTimeout(timer);
      theme('choose', { id: list.chosen });
      cards.forEach((c) => {
        c.classList.toggle('on', c === card);
        c.querySelector('.th-name em').textContent = c === card ? 'ACTIVE' : '';
      });
    };
    cards.forEach((card, i) => {
      card.onmouseenter = () => {
        mark(i);
        show(card.dataset.id);
      };
      card.onclick = () => keep(card);
    });
    el.querySelector('.th-grid').onmouseleave = () => {
      mark(-1);
      show(list.chosen);
    };
    el.__keys = (e) => {
      const cols = getComputedStyle(el.querySelector('.th-grid')).gridTemplateColumns.split(' ').length;
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
      if (step) {
        e.preventDefault();
        const i = Math.max(0, Math.min(cards.length - 1, themeAt < 0 ? cards.findIndex((c) => c.dataset.id === list.chosen) : themeAt + step));
        mark(i);
        cards[i].scrollIntoView({ block: 'nearest' });
        show(cards[i].dataset.id);
      } else if (e.key === 'Enter' && themeAt >= 0) {
        e.preventDefault();
        keep(cards[themeAt]);
      }
    };
  }

  // ---------- the activity bar's views (git.js): the leaderboard and the themes, where the dashboard's middle is ----------
  const views = {};
  for (const v of ['friends', 'board', 'themes', 'notifications', ...(window.Roadmap ? ['roadmap'] : [])]) {
    const el = document.createElement('section');
    el.id = `${v}-view`;
    el.className = 'cv';
    document.getElementById('app').appendChild(el);
    views[v] = el;
  }
  views.board.innerHTML =
    '<section class="panel cv-list"><header><span class="tag">leaderboard</span><span class="meta">click someone for their card</span></header><div class="body lb-host"></div></section>' +
    '<section class="panel cv-card"><header><span class="tag">hacker</span><span class="meta"></span></header><div class="body pf-host"></div></section>';
  views.board.querySelector('.lb-host').addEventListener('click', boardAction);
  // The Roadmap: what comes next, and the users' votes on it (roadmap.js).
  if (views.roadmap) window.Roadmap.mount(views.roadmap);
  const fq = (sel) => views.friends.querySelector(sel);
  views.friends.innerHTML =
    '<section class="panel cv-friends"><header><span class="tag">friends</span><span class="meta"></span></header><div class="body">' +
    '<div class="me-card-host"></div>' +
    '<label class="hk-field mn-add"><span class="hk-prompt">+</span><input class="mn-handle-in" maxlength="21" spellcheck="false" autocomplete="off" placeholder="add a friend · name#0427"><button class="mn-send" type="button" disabled>send request</button></label>' +
    '<p class="hk-status mn-add-status"></p><div class="mn-list mn-friends"></div></div></section>' +
    '<div class="cv-col"><section class="panel cv-friend"><header><span class="tag">friend</span><span class="meta">double-click a friend to message them</span></header><div class="body fr-host"></div></section>' +
    '<section class="panel cv-requests"><header><span class="tag">requests</span><span class="meta"></span></header><div class="body">' +
    '<div class="hk-h">INCOMING</div><div class="mn-list mn-in"></div><div class="hk-h">SENT</div><div class="mn-list mn-out"></div></div></section></div>' +
    '<section class="panel cv-me"><header><span class="tag">profile</span><span class="meta">your badges · hover one to see what it\'s for, right click to display it</span>' +
    '<button type="button" class="cv-hbtn" data-me="back" title="Back to your friends">← friends</button></header><div class="body me-host"></div></section>';
  views.friends.addEventListener('click', listAction);
  views.friends.addEventListener('click', (e) => {
    const b = e.target.closest('[data-me]');
    if (b) setMe(b.dataset.me === 'open');
  });
  views.friends.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest?.('.me-card')) setMe(true);
  });
  // Your badges came in or changed: your card shows the one you display and how many you have.
  window.Badges?.on(() => shown === 'friends' && !meOpen && meCard());
  // A double click on a friend (not on their buttons) opens the chat.
  views.friends.addEventListener('dblclick', (e) => {
    const row = e.target.closest('.mn-friends .mn-row');
    if (row && !e.target.closest('button')) Social.openChat(row.dataset.id);
  });
  fq('.fr-host').addEventListener('click', (e) => {
    if (e.target.closest('[data-ans=chat]') && pickedFriend) Social.openChat(pickedFriend);
  });
  views.friends.addEventListener('contextmenu', friendMenu);
  views.friends.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.mn-ctx')) fq('.mn-ctx')?.remove();
  });
  // Friends: add one by name#tag.
  {
    const add = fq('.mn-handle-in'), send = fq('.mn-send'), addStatus = fq('.mn-add-status');
    const valid = () => /^[A-Za-z0-9_.-]+( [A-Za-z0-9_.-]+)*#\d{1,4}$/.test(add.value.trim());
    const say = (cls, msg) => {
      addStatus.className = `hk-status mn-add-status ${cls}`;
      addStatus.textContent = msg;
    };
    add.addEventListener('input', () => {
      send.disabled = !valid();
      say('', '');
    });
    const request = async () => {
      if (!valid()) return;
      send.disabled = true;
      const r = await Social.request(add.value.trim());
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
  }
  // Notifications from the developer (the admin page), newest first. The ones you hadn't read when the view opened keep
  // their NEW mark while it stays open; opening it reads them all.
  views.notifications.innerHTML =
    '<section class="panel cv-notes"><header><span class="tag">notifications</span><span class="meta"></span></header><div class="body nt-list"></div></section>';
  let fresh = new Set();
  function renderNotes() {
    const N = Social.notes();
    const el = views.notifications.querySelector('.nt-list');
    setText(views.notifications.querySelector('.meta'), N ? `${N.list.length} from the developer` : '');
    if (!N) return setHTML(el, `<div class="mn-empty">${S && S.reachable ? 'loading…' : "can't reach the server · notifications come back with the connection"}</div>`);
    setHTML(el, N.list.length
      ? N.list.map((n) =>
          `<div class="nt-item${fresh.has(n.id) ? ' new' : ''}"><div class="nt-head"><b>${richText(n.title)}</b>${fresh.has(n.id) ? '<em>NEW</em>' : ''}` +
          `<span class="nt-time" title="${esc(new Date(n.at).toLocaleString())}">${ago(n.at)}</span></div>` +
          `${n.body ? `<div class="nt-body">${richText(n.body)}</div>` : ''}</div>`).join('')
      : '<div class="mn-empty">no notifications yet · news from the developer shows up here</div>');
  }
  function openNotes() {
    const N = Social.notes();
    fresh = new Set(N ? N.list.filter((n) => !n.read).map((n) => n.id) : []);
    renderNotes();
    if (!N) Social.loadNotes();
    else if (N.unread) Social.readNotes();
  }
  Social.on((ev) => {
    if (ev.type === 'notification' && shown === 'notifications') {
      fresh.add(ev.notification.id);
      Social.readNotes();
    }
    if (shown === 'notifications' && (ev.type === 'notes' || ev.type === 'notification' || ev.type === 'notification_gone')) {
      // Loaded while the view was open: whatever was unread is new now.
      if (ev.type === 'notes' && !fresh.size && Social.unreadNotes()) return openNotes();
      renderNotes();
    }
  });

  let shown = null;
  function showView(v) {
    // The friends icon again while your profile shows there: back to the friends.
    if (v === shown) return v === 'friends' && meOpen && setMe(false);
    if (shown === 'friends' && meOpen) setMe(false);
    if (shown === 'themes') theme('revert').catch(() => {});
    shown = v;
    document.getElementById('app').classList.toggle('cloud-mode', !!v);
    for (const [k, el] of Object.entries(views)) el.classList.toggle('on', k === v);
    if (v === 'friends') {
      renderSocial();
      // Whatever changed while you weren't looking (a missed live event, another device) shows when it opens.
      Social.load();
    }
    if (v === 'board') {
      counted = fetched = false;
      loadBoard();
    } else clearTimeout(boardTimer);
    if (v === 'themes') openThemes();
    if (v === 'notifications') openNotes();
    if (v === 'roadmap') window.Roadmap.show();
    else window.Roadmap?.hide();
  }

  function close() {
    if (!modal) return;
    modal = null;
    tellModal(false);
    root.onmousedown = null;
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
  brand.addEventListener('click', () => openMenu('profile'));
  addEventListener('keydown', (e) => {
    if (!modal && shown === 'themes' && e.key !== 'Escape' && !e.target.closest('input, textarea')) return views.themes.__keys?.(e);
    if (e.key !== 'Escape') return;
    // Esc on a view of the activity bar closes what's on top of it first (a card, a small menu), then goes back to the
    // dashboard.
    if (!modal && shown) {
      const top = views[shown].querySelector('.mn-confirm, .mn-ctx');
      return top ? top.remove() : window.GitView?.view('dash');
    }
    if (modal === 'update') {
      if (!S.updating) close();
      return;
    }
    if (modal === 'feedback') return close();
    if (modal !== 'menu') return;
    // Esc closes what's on top first: the confirmation, a small menu, then the main menu.
    const top = q('.mn-confirm') || q('.mn-ctx') || q('.mn-pick');
    if (top) return top.remove();
    close();
  });
  refresh();
  Social.loadNotes();

  return { render, openMenu, openSettings: () => openMenu('settings'), openProfile, openUpdate, openFeedback, showView, renderPower, renderDiscord, close };
})();
