'use strict';

// Accounts, optional (the API: src/account.ts; the plan: atalay-terminal-hesaplar-plani.md). Settings → ACCOUNT signs in
// with GitHub (in the browser) or a 6-digit code sent by e-mail. A computer whose sign-in another computer already uses
// joins that account once its user picks which name to keep: XP and hours add up, friends and messages come together,
// the other name is freed. From then on the settings follow the account from computer to computer, the way VS Code's
// Settings Sync does it: on the first sync a setting changed on one side only goes to the other, one never changed
// here takes the account's, and one that differs is asked once. The Mac and Windows apps alike.
window.Account = (() => {
  const h = window.webkit && window.webkit.messageHandlers;
  if (!h || !h.cloud) return null;
  const cloud = (msg) => h.cloud.postMessage(msg).catch(() => null);
  const api = (method, path, body) => h.cloud.postMessage({ type: 'social', method, path, body }).catch(() => ({ error: 'offline' }));
  const themeCall = (msg) => (h.theme ? h.theme.postMessage(msg).catch(() => null) : Promise.resolve(null));
  const saversCall = (msg) => (h.savers ? h.savers.postMessage(msg).catch(() => null) : Promise.resolve(null));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const tagText = (t) => `#${String(t ?? 0).padStart(4, '0')}`;
  const say = (m) => (typeof window.toast === 'function' ? window.toast(m) : console.warn(m));
  const stored = (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  const store = (k, v) => {
    try {
      v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
    } catch {}
  };
  const ERRORS = {
    bad_email: "that doesn't look like an e-mail address",
    too_many_codes: 'too many codes for now · try again in an hour',
    email_failed: "the e-mail didn't go out · try again",
    email_unavailable: 'e-mail sign-in is off on this server',
    github_unavailable: 'GitHub sign-in is off on this server',
    code_expired: 'that code expired · send a new one',
    wrong_code: "that code isn't right",
    too_many_attempts: 'too many tries · send a new code',
    other_github: 'this account already uses another GitHub account',
    other_email: 'this account already uses another address',
    merge_expired: 'that took too long · sign in again',
    offline: "can't reach the server",
  };
  const errText = (e) => ERRORS[e] || String(e || 'something went wrong');

  let A = null; // GET v1/account
  let host = null; // Settings' ACCOUNT section while the menu is open
  const form = { mode: '', email: '', msg: '', bad: false, busy: false };
  let waiting = 0;

  const refreshCloud = () => cloud({ type: 'refresh' }).then((s) => s && window.Cloud?.render(s));

  async function load() {
    const r = await api('GET', 'v1/account');
    if (!r || r.error) return A;
    const was = A;
    A = r;
    render();
    paintIcon();
    if (A.pending && (!was || !was.pending || was.pending.id !== A.pending.id)) mergeDialog();
    if (A.signedIn) Sync.start(A);
    else Sync.stop();
    return A;
  }

  // ---------- Settings → ACCOUNT ----------
  const ago = (at) => {
    const s = Math.max(0, (Date.now() - new Date(at)) / 1000);
    return s < 120 ? 'now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} d ago`;
  };
  const isWin = (os) => /windows/i.test(os || '');
  const GH = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';

  function render() {
    if (!host || !host.isConnected) return;
    if (!A) return setHTML(host, '<p class="acct-why">loading…</p>');
    const status = form.msg ? `<p class="hk-status acct-status ${form.bad ? 'bad' : 'ok'}">${esc(form.msg)}</p>` : '';
    const mail =
        form.mode === 'email'
          ? '<div class="acct-form"><label class="hk-field"><span class="hk-prompt">@</span><input class="acct-email" type="email" maxlength="254" spellcheck="false" autocomplete="email" placeholder="you@example.com"></label>' +
            `<button type="button" class="mn-btn go" data-acct="send"${form.busy ? ' disabled' : ''}>send code</button></div>`
          : form.mode === 'code'
            ? `<div class="acct-form"><label class="hk-field"><span class="hk-prompt">#</span><input class="acct-code" inputmode="numeric" maxlength="6" spellcheck="false" autocomplete="one-time-code" placeholder="6-digit code sent to ${esc(form.email)}"></label>` +
              `<button type="button" class="mn-btn go" data-acct="verify"${form.busy ? ' disabled' : ''}>sign in</button></div>`
            : '';
    if (!A.signedIn) {
      setHTML(
        host,
        '<p class="acct-why">One name, XP, friends and settings on all your computers, Mac and Windows. Optional: everything works without it.</p>' +
          '<div class="acct-btns">' +
          (A.methods.github ? `<button type="button" class="acct-btn" data-acct="github">${GH}Sign in with GitHub</button>` : '') +
          (A.methods.email ? '<button type="button" class="acct-btn" data-acct="email">✉ Sign in with e-mail</button>' : '') +
          '</div>' +
          mail +
          status +
          '<div class="acct-end"><button type="button" class="mn-btn acct-del" data-acct="delete">delete my data…</button></div>',
      );
      const input = host.querySelector('.acct-email, .acct-code');
      if (input && document.activeElement !== input) {
        if (form.mode === 'email') input.value = form.email;
        input.focus();
      }
      return;
    }
    const who = [A.github ? `${GH}<b>${esc(A.github)}</b>` : '', A.email ? `✉ <b>${esc(A.email)}</b>` : ''].filter(Boolean).join('<i>·</i>');
    // This computer first, then the others, the most recently seen first.
    const devices = [...A.devices.filter((d) => d.current), ...A.devices.filter((d) => !d.current)]
      .map(
        (d) =>
          `<div class="acct-dev${d.current ? ' me' : ''}"><span class="acct-os">${isWin(d.os) ? '⊞' : ''}</span>` +
          `<span class="acct-dev-main"><b>${d.current ? 'this computer' : isWin(d.os) ? 'Windows PC' : 'Mac'}</b><small>${esc(d.os || 'unknown system')}${d.app ? ` · app ${esc(d.app)}` : ''}</small></span>` +
          `<small class="acct-seen">${d.current ? 'in use' : ago(d.lastSeen)}</small>` +
          (d.current ? '' : `<button type="button" class="mn-btn mn-del" data-acct="remove" data-id="${esc(d.id)}" title="Take this computer off your account (lost or sold): it starts over as someone new">remove</button>`) +
          '</div>',
      )
      .join('');
    const on = Sync.enabled();
    // GitHub says an address of theirs, verified, is another account's: join it once a code to that address proves it
    // (never on the address alone).
    const hint = A.emailHint && !form.mode
      ? `<div class="acct-hint"><span><b>${esc(A.emailHint)}</b> already has an account of yours. Send a code to it to join the two?</span>` +
        '<button type="button" class="mn-btn go" data-acct="hintsend">send code</button><button type="button" class="mn-btn" data-acct="hintno">not mine</button></div>'
      : '';
    // The other way in, added to this account.
    const add = (!A.email && !A.emailHint ? '<button type="button" class="mn-btn" data-acct="email">✉ add e-mail</button>' : '') +
      (!A.github && A.methods.github ? `<button type="button" class="mn-btn acct-addgh" data-acct="github">${GH}add GitHub</button>` : '');
    setHTML(
      host,
      `<div class="acct-who"><span class="acct-ok">✓ signed in</span>${who}</div>` +
        hint +
        (add || mail ? `<div class="acct-add">${add}</div>${mail}` : '') +
        `<div class="acct-devs">${devices}</div>` +
        '<div class="hk-row"><span>sync settings across your computers<small>theme, interface font and size, terminal text size, sound, token savers, AI colours, updates · as VS Code\'s Settings Sync</small></span>' +
        `<button type="button" class="hk-sw acct-sync${on ? ' on' : ''}" role="switch" aria-checked="${on}" title="Sync settings across your computers"><i></i></button></div>` +
        status +
        '<div class="acct-end"><button type="button" class="mn-btn" data-acct="signout">sign out on this computer</button>' +
        '<button type="button" class="mn-btn acct-del" data-acct="delete">delete account…</button></div>',
    );
  }

  // GitHub's picture can change on github.com. Its server says how long a copy is good for (cache-control: max-age=300,
  // with an ETag), so it's asked for again at most every 5 minutes: on ⌘R, when the dashboard comes back into sight
  // and when the menu opens, never while hidden. The same address each time: the web view keeps the copy meanwhile and,
  // once it's older, checks it with GitHub (an unchanged picture costs a 304), and GitHub's cache stays whole.
  let picAt = 0;
  function refreshPic(force) {
    if (!A || !A.avatar || document.hidden || (!force && Date.now() - picAt < 300_000)) return;
    picAt = Date.now();
    const url = A.avatar;
    const fresh = new Image();
    fresh.onload = () => document.querySelectorAll('img.acct-avatar').forEach((i) => {
      if (i.getAttribute('src') !== url) return;
      i.src = '';
      i.src = url;
    });
    fresh.src = url;
  }
  document.addEventListener('visibilitychange', () => refreshPic(false));
  window.addEventListener('focus', () => refreshPic(false));

  // The activity bar's icon: their GitHub picture once signed in with GitHub (the person icon otherwise, e-mail too),
  // a green dot while signed in, who they are in its tooltip.
  function paintIcon() {
    const ab = document.querySelector('#activity [data-view=account]');
    if (!ab || !A) return;
    ab.querySelector('.acct-dot').hidden = !A.signedIn;
    ab.title = A.signedIn ? `Account · ${A.github || A.email}` : 'Account · not signed in';
    const pic = A.signedIn && A.avatar;
    let img = ab.querySelector('img.acct-avatar');
    const glyph = ab.querySelector('.vs-ci');
    if (pic) {
      if (!img) {
        img = document.createElement('img');
        img.className = 'acct-avatar';
        img.alt = '';
        // Offline, or no picture to load: the icon again.
        img.onerror = () => {
          img.remove();
          if (glyph) glyph.hidden = false;
        };
        ab.insertBefore(img, ab.firstChild);
      }
      if (img.getAttribute('src') !== pic) {
        img.src = pic;
        picAt = Date.now();
      }
      if (glyph) glyph.hidden = true;
    } else {
      img?.remove();
      if (glyph) glyph.hidden = false;
    }
  }

  function say2(msg, bad = false) {
    form.msg = msg;
    form.bad = bad;
    render();
  }

  async function github() {
    say2('opening GitHub in your browser…');
    const r = await api('POST', 'v1/auth/github', {});
    if (!r || r.error) return say2(errText(r?.error), true);
    await cloud({ type: 'openSignIn', url: r.url });
    say2('finish signing in in your browser · this page follows');
    clearInterval(waiting);
    const until = Date.now() + 10 * 60_000;
    const was = A && A.signedIn;
    waiting = setInterval(async () => {
      if (Date.now() > until) {
        clearInterval(waiting);
        return say2('');
      }
      await load();
      if ((A && A.signedIn !== was) || (A && A.pending)) {
        clearInterval(waiting);
        signedIn();
      }
    }, 2000);
  }

  function signedIn() {
    if (!A) return;
    // The activity bar's icon too (an e-mail code's sign-in brings no live event that would load it again).
    paintIcon();
    form.mode = '';
    if (A.pending) return say2('');
    say2('');
    say(`signed in${A.github ? ` as ${A.github}` : A.email ? ` as ${A.email}` : ''}`);
    refreshCloud();
  }

  async function sendCode() {
    const input = host && host.querySelector('.acct-email');
    form.email = (input ? input.value : form.email).trim();
    if (!form.email) return;
    form.busy = true;
    say2('sending the code…');
    const r = await api('POST', 'v1/auth/email', { email: form.email });
    form.busy = false;
    if (!r || r.error) return say2(errText(r?.error), true);
    form.mode = 'code';
    say2(`a 6-digit code is on its way to ${form.email}`);
  }

  async function verify() {
    const input = host && host.querySelector('.acct-code');
    const code = (input ? input.value : '').replace(/\D/g, '');
    if (code.length !== 6) return;
    form.busy = true;
    say2('checking…');
    const r = await api('POST', 'v1/auth/email/verify', { email: form.email, code });
    form.busy = false;
    if (!r || r.error) return say2(errText(r?.error), true);
    A = r.account;
    render();
    if (r.result === 'merge') {
      form.mode = '';
      say2('');
      return mergeDialog();
    }
    signedIn();
    Sync.start(A);
  }

  async function remove(id) {
    const d = A && A.devices.find((x) => x.id === id);
    if (!d) return;
    const r = await api('DELETE', `v1/account/devices/${id}`);
    if (!r || r.error) return say(errText(r?.error));
    A = r.account;
    render();
    say(`${isWin(d.os) ? 'Windows PC' : 'Mac'} taken off your account`);
  }

  function onClick(e) {
    const b = e.target.closest('[data-acct]');
    if (b) {
      const act = b.dataset.acct;
      if (act === 'github') return github();
      if (act === 'email') {
        form.mode = form.mode === 'email' ? '' : 'email';
        return say2('');
      }
      if (act === 'send') return sendCode();
      if (act === 'verify') return verify();
      if (act === 'remove') return remove(b.dataset.id);
      if (act === 'hintsend') {
        form.email = A.emailHint;
        form.mode = 'email';
        return sendCode();
      }
      if (act === 'hintno') {
        return api('DELETE', 'v1/account/hint').then((r) => {
          if (r && r.account) A = r.account;
          render();
        });
      }
      if (act === 'signout') return signOut();
      if (act === 'delete') return deleteData();
    }
    if (e.target.closest('.acct-sync')) {
      Sync.enable(!Sync.enabled());
      render();
    }
  }

  function onKey(e) {
    if (e.key !== 'Enter') return;
    if (e.target.closest('.acct-email')) sendCode();
    if (e.target.closest('.acct-code')) verify();
  }

  // cloud.js's Settings page gives the section to fill while the menu is open.
  function mount(el) {
    host = el;
    if (!host) return;
    host.addEventListener('click', onClick);
    host.addEventListener('keydown', onKey);
    render();
    load();
  }

  // ---------- the activity bar's menu ----------
  const icon = (cp) => `<i class="vs-ci">${String.fromCodePoint(cp)}</i>`;
  let menuEl = null;
  function closeMenu() {
    menuEl?.remove();
    menuEl = null;
    document.removeEventListener('mousedown', outside, true);
    document.removeEventListener('keydown', escape, true);
  }
  const outside = (e) => {
    if (menuEl && !menuEl.contains(e.target) && !e.target.closest('#activity [data-view=account]')) closeMenu();
  };
  const escape = (e) => e.key === 'Escape' && closeMenu();

  async function menu() {
    if (menuEl) return closeMenu();
    if (!A) await load();
    refreshPic(false);
    if (!A) return say(errText('offline'));
    const ab = document.querySelector('#activity [data-view=account]');
    const who = A.signedIn
      ? `<span class="acct-ok">✓ signed in</span><b>${esc(A.name)}<i>${tagText(A.tag)}</i></b><small>${esc(A.github ? `GitHub · ${A.github}` : A.email)}${A.devices.length > 1 ? ` · ${A.devices.length} computers` : ''}</small>`
      : `<b>${esc(A.name)}<i>${tagText(A.tag)}</i></b><small>not signed in · this computer only</small>`;
    const profile = `<button type="button" data-m="profile">${icon(0xea67)}Profile &amp; badges</button>`;
    const items = A.signedIn
      ? profile + `<button type="button" data-m="settings">${icon(0xeb99)}Account settings…</button>` +
        `<button type="button" data-m="sync">${icon(0xea77)}Settings sync<em>${Sync.enabled() ? 'on' : 'off'}</em></button>` +
        `<button type="button" data-m="signout">${icon(0xea6e)}Sign out on this computer</button>` +
        `<hr><button type="button" class="danger" data-m="delete">${icon(0xea81)}Delete account…</button>`
      : profile + (A.methods.github ? `<button type="button" data-m="github">${GH}Sign in with GitHub</button>` : '') +
        (A.methods.email ? `<button type="button" data-m="email">${icon(0xeb1c)}Sign in with e-mail…</button>` : '') +
        `<hr><button type="button" class="danger" data-m="delete">${icon(0xea81)}Delete my data…</button>`;
    menuEl = document.createElement('div');
    menuEl.className = 'acct-menu';
    const pic = A.signedIn && A.avatar ? `<img class="acct-avatar" alt="" src="${esc(A.avatar)}">` : '';
    menuEl.innerHTML = `<div class="acct-menu-who">${pic}${who}</div>${items}`;
    document.body.appendChild(menuEl);
    // Beside the icon, its bottom level with the icon's (VS Code's accounts menu opens the same way).
    const r = ab ? ab.getBoundingClientRect() : { right: 60, bottom: innerHeight - 80 };
    menuEl.style.left = `${Math.round(r.right + 8)}px`;
    menuEl.style.top = `${Math.round(Math.max(8, Math.min(innerHeight - menuEl.offsetHeight - 8, r.bottom - menuEl.offsetHeight)))}px`;
    menuEl.onclick = (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      const m = b.dataset.m;
      closeMenu();
      if (m === 'github') return github();
      if (m === 'profile') return window.Cloud?.openProfile();
      if (m === 'email' || m === 'settings') {
        if (m === 'email') form.mode = 'email';
        return window.Cloud?.openSettings();
      }
      if (m === 'sync') return Sync.enable(!Sync.enabled());
      if (m === 'signout') return signOut();
      if (m === 'delete') return deleteData();
    };
    setTimeout(() => {
      document.addEventListener('mousedown', outside, true);
      document.addEventListener('keydown', escape, true);
    });
  }

  // A question over everything, with the way out first.
  function confirmBox(cls, html, yes) {
    return new Promise((resolve) => {
      document.querySelector('.acct-confirm')?.remove();
      const el = document.createElement('div');
      el.className = `mn-confirm acct-merge acct-confirm`;
      el.innerHTML = `<div class="mn-ask acct-ask ${cls}">${html}<div class="mn-ask-btns"><button type="button" class="mn-btn" data-ans="no">cancel</button><button type="button" class="mn-btn ${cls === 'danger' ? 'mn-del' : 'go'}" data-ans="yes">${yes}</button></div></div>`;
      const done = (v) => {
        el.remove();
        document.removeEventListener('keydown', key, true);
        resolve(v);
      };
      const key = (e) => e.key === 'Escape' && done(false);
      el.onclick = (e) => {
        if (e.target === el) return done(false);
        const b = e.target.closest('[data-ans]');
        if (b) done(b.dataset.ans === 'yes');
      };
      document.addEventListener('keydown', key, true);
      document.body.appendChild(el);
      el.querySelector('[data-ans=no]').focus();
    });
  }

  async function signOut() {
    if (!A || !A.signedIn) return;
    const ok = await confirmBox(
      '',
      '<b>Sign out on this computer?</b>' +
        `<p>Your account stays as it is${A.devices.length > 1 ? ', on your other computers too' : ''}: name, XP, friends, messages and settings. ` +
        `This computer goes on as a guest, ${esc(A.name)} with a new tag; sign in again any time to bring it back.</p>`,
      'sign out',
    );
    if (!ok) return;
    const r = await cloud({ type: 'signOut' });
    if (!r || r.error) return say(errText(r?.error || 'offline'));
    if (r.state) window.Cloud?.render(r.state);
    Sync.stop();
    await load();
    say(`signed out · this computer is ${A ? A.name + tagText(A.tag) : 'a guest'} now`);
  }

  async function deleteData() {
    if (!A) return;
    const all = A.signedIn;
    const ok = await confirmBox(
      'danger',
      `<b>${all ? 'Delete your account?' : 'Delete your data?'}</b>` +
        `<div class="acct-warn">${all ? `All your data will be deleted, here and on the server, on all your computers${A.devices.length > 1 ? ` (${A.devices.length})` : ''}` : 'All your data will be deleted, here and on the server'}: ` +
        'your name, XP and hours, friends and messages, Roadmap votes, notifications, feedback and synced settings. <b>This can\'t be undone.</b></div>' +
        `<p>${all ? 'Your computers' : 'This computer'} start${all ? '' : 's'} over as on the first launch. Chats and terminals on this computer stay; they were never on the server.</p>`,
      'delete everything',
    );
    if (!ok) return;
    const r = await cloud({ type: 'deleteAccount' });
    if (!r || r.error) return say(errText(r?.error || 'offline'));
    Sync.stop();
    A = null;
    say(all ? 'your account is deleted' : 'your data is deleted');
    window.Cloud?.close?.();
    if (r.state) window.Cloud?.render(r.state);
  }

  // ---------- merging: which name stays ----------
  function mergeDialog() {
    const p = A && A.pending;
    if (!p || !p.mine || !p.theirs) return;
    document.querySelector('.acct-merge')?.remove();
    const side = (who, keep, label) =>
      `<button type="button" class="acct-side" data-keep="${keep}"><small>${label}</small><b>${esc(who.name)}<i>${tagText(who.tag)}</i></b>` +
      `<span>Level ${who.level} · ${esc(who.rank)}</span><em>${who.hours} h · ${who.friends} ${who.friends === 1 ? 'friend' : 'friends'} · ${who.devices} ${who.devices === 1 ? 'computer' : 'computers'}</em></button>`;
    const el = document.createElement('div');
    el.className = 'mn-confirm acct-merge';
    el.innerHTML =
      '<div class="mn-ask acct-ask"><b>Join your other computer\'s account</b>' +
      `<p>${p.kind === 'github' ? 'This GitHub account' : 'This e-mail address'} is already used by another of your computers. Pick the name to keep: the two become one account.</p>` +
      `<div class="acct-sides">${side(p.mine, 'mine', 'this computer')}${side(p.theirs, 'theirs', 'your other computer')}</div>` +
      '<ul class="acct-fine"><li>hours and XP add up (time on both at once counts once)</li><li>friends and messages come together</li><li>the other name is freed</li></ul>' +
      '<div class="mn-ask-btns"><button type="button" class="mn-btn" data-ans="cancel">not now</button><button type="button" class="mn-btn go" data-ans="merge" disabled>merge</button></div></div>';
    let keep = '';
    el.onclick = async (e) => {
      const s = e.target.closest('.acct-side');
      if (s) {
        keep = s.dataset.keep;
        el.querySelectorAll('.acct-side').forEach((x) => x.classList.toggle('on', x === s));
        el.querySelector('[data-ans=merge]').disabled = false;
        return;
      }
      const b = e.target.closest('[data-ans]');
      if (!b) return;
      if (b.dataset.ans === 'cancel') {
        el.remove();
        A = (await api('DELETE', `v1/account/merge/${encodeURIComponent(p.id)}`))?.account || A;
        return render();
      }
      b.disabled = true;
      b.textContent = 'merging…';
      const r = await api('POST', 'v1/account/merge', { id: p.id, keep });
      el.remove();
      if (!r || r.error) return say(errText(r?.error));
      A = r.account;
      render();
      paintIcon();
      say(`one account now: ${A.name}${tagText(A.tag)}`);
      refreshCloud();
      window.Social?.load();
      Sync.restart(A);
    };
    document.body.appendChild(el);
  }

  // ---------- settings sync ----------
  // Each synced setting: how to read it here (undefined: not set here, the account's comes in), how to set one from
  // another computer, how to show it in the question, and its default (a value never changed here counts as not set).
  let themeNames = {};
  const ITEMS = [
    { key: 'theme', label: 'theme', def: 'atalay', show: (v) => themeNames[v] || v, set: (v) => themeCall({ type: 'choose', id: v }) },
    { key: 'uiFont', label: 'interface font', def: 'mono', set: (v) => themeCall({ type: 'setUI', font: v }) },
    { key: 'uiScale', label: 'text size', def: 1, show: (v) => `${Math.round(v * 100)}%`, set: (v) => themeCall({ type: 'setUI', scale: v }) },
    { key: 'aiColors', label: "AI tools in the theme's colours", def: true, set: (v) => themeCall({ type: 'setUI', aiColors: v }) },
    { key: 'rtk', label: 'rtk', def: true, set: (v) => saversCall({ type: 'set', which: 'rtk', on: v }) },
    { key: 'caveman', label: 'caveman', def: true, set: (v) => saversCall({ type: 'set', which: 'caveman', on: v }) },
    { key: 'updateRightAway', label: 'install updates right away', def: false, set: (v) => cloud({ type: 'updateRightAway', on: v }).then((s) => s && window.Cloud?.render(s)) },
    { key: 'terminalFontSize', label: 'terminal text size', def: undefined, show: (v) => `${v} pt`, set: (v) => cloud({ type: 'terminalFont', size: v }) },
    { key: 'sound', label: 'sound', def: false, set: (v) => window.__sound?.set(v) },
  ];
  const show = (it, v) => (typeof v === 'boolean' ? (v ? 'on' : 'off') : it.show ? it.show(v) : String(v));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  async function collect() {
    const [ui, list, sav, font, st] = await Promise.all([
      themeCall({ type: 'ui' }),
      themeCall({ type: 'list' }),
      saversCall({ type: 'state' }),
      cloud({ type: 'terminalFont' }),
      cloud({ type: 'state' }),
    ]);
    if (list && list.themes) themeNames = Object.fromEntries(list.themes.map((t) => [t.id, t.name]));
    return {
      theme: list ? list.chosen : undefined,
      uiFont: ui ? ui.font : undefined,
      uiScale: ui ? ui.scale : undefined,
      aiColors: ui ? ui.aiColors !== false : undefined,
      rtk: sav && sav.rtk && sav.rtk.available ? !!sav.rtk.on : undefined,
      caveman: sav && sav.caveman && sav.caveman.available ? !!sav.caveman.on : undefined,
      updateRightAway: st ? !!st.updateRightAway : undefined,
      terminalFontSize: font && font.chosen ? font.size : undefined,
      sound: window.__sound ? window.__sound.on() : undefined,
    };
  }

  const Sync = {
    acct: null,
    base: null, // what was last in step with the account, per key
    timer: 0,
    quietUntil: 0,
    enabled: () => stored('sync.on') !== '0',
    enable(on) {
      store('sync.on', on ? null : '0');
      if (on && A && A.signedIn) this.start(A);
      else this.stop();
      say(on ? 'settings sync on' : 'settings sync off · settings stay as they are on this computer');
    },
    me: () => (A && A.devices.find((d) => d.current)?.id) || null,
    async start(a) {
      if (!this.enabled() || !a || !a.signedIn) return this.stop();
      if (this.acct === a.id && this.timer) return;
      this.stop();
      this.acct = a.id;
      try {
        this.base = JSON.parse(stored(`sync.base.${a.id}`) || 'null');
      } catch {
        this.base = null;
      }
      if (!this.base) await this.first();
      this.timer = setInterval(() => this.tick(), 5000);
    },
    restart(a) {
      this.stop();
      this.start(a);
    },
    stop() {
      clearInterval(this.timer);
      this.timer = 0;
      this.acct = null;
    },
    save() {
      store(`sync.base.${this.acct}`, JSON.stringify(this.base));
    },
    // The first time on this computer, as VS Code: a setting on one side only goes to the other; one never changed here
    // takes the account's; one that differs is asked once.
    async first() {
      const remote = await api('GET', 'v1/settings');
      if (!remote || remote.error) return;
      const r = remote.settings || {};
      const local = await collect();
      const up = {}, conflicts = [];
      const merged = { ...r };
      for (const it of ITEMS) {
        const lv = local[it.key], rv = r[it.key];
        const unset = lv === undefined || same(lv, it.def);
        if (rv === undefined) {
          if (!unset) up[it.key] = merged[it.key] = lv;
        } else if (lv !== undefined && same(lv, rv)) {
          // in step already
        } else if (unset) {
          await it.set(rv);
        } else {
          conflicts.push({ it, lv, rv });
        }
      }
      if (conflicts.length) {
        const pick = await ask(conflicts);
        for (const c of conflicts) {
          if (pick === 'account') await c.it.set(c.rv);
          else up[c.it.key] = merged[c.it.key] = c.lv;
        }
      }
      if (Object.keys(up).length) await api('PUT', 'v1/settings', { set: up });
      this.quietUntil = Date.now() + 4000;
      this.base = merged;
      this.save();
    },
    // Every few seconds: what changed here since goes to the account.
    async tick() {
      if (!this.acct || !this.base || Date.now() < this.quietUntil) return;
      const cur = await collect();
      const set = {};
      for (const it of ITEMS) if (cur[it.key] !== undefined && !same(cur[it.key], this.base[it.key])) set[it.key] = cur[it.key];
      if (!Object.keys(set).length) return;
      const r = await api('PUT', 'v1/settings', { set });
      if (!r || r.error) return;
      Object.assign(this.base, set);
      this.save();
    },
    // Another computer changed some: they apply here.
    async apply(set, from) {
      if (!this.acct || !this.base || from === this.me()) return;
      this.quietUntil = Date.now() + 4000;
      for (const it of ITEMS) {
        if (!(it.key in set)) continue;
        await it.set(set[it.key]);
        this.base[it.key] = set[it.key];
      }
      this.save();
    },
  };

  // The settings that differ, once: the account's or this computer's.
  function ask(conflicts) {
    return new Promise((resolve) => {
      document.querySelector('.acct-conflict')?.remove();
      const el = document.createElement('div');
      el.className = 'mn-confirm acct-conflict';
      el.innerHTML =
        '<div class="mn-ask acct-ask"><b>Your settings differ</b><p>This computer and your account have different settings. Which should both use?</p>' +
        '<div class="acct-diff"><span></span><small>your account</small><small>this computer</small>' +
        conflicts.map((c) => `<span>${esc(c.it.label)}</span><b>${esc(show(c.it, c.rv))}</b><b>${esc(show(c.it, c.lv))}</b>`).join('') +
        '</div><div class="mn-ask-btns"><button type="button" class="mn-btn" data-ans="device">use this computer\'s</button><button type="button" class="mn-btn go" data-ans="account">use the account\'s</button></div></div>';
      el.onclick = (e) => {
        const b = e.target.closest('[data-ans]');
        if (!b) return;
        el.remove();
        resolve(b.dataset.ans);
      };
      document.body.appendChild(el);
    });
  }

  // Live: a sign-in finished in the browser, a merge, a computer removed; settings from another computer.
  window.Social?.on((ev) => {
    if (ev.type === 'account' || ev.type === 'hello') load();
    if (ev.type === 'settings' && ev.set) Sync.apply(ev.set, ev.from);
  });
  setTimeout(load, 2500);

  return { mount, load, menu, state: () => A };
})();
