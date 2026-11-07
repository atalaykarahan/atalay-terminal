'use strict';

// The Roadmap (the activity bar's rocket): what to build next, as the poll everyone already knows from their messaging
// apps (WhatsApp's, iMessage's): a circle beside each feature, a tap votes, a tap again takes the vote back. 3 votes, no
// down votes. With your 3 in, the results come in where the features are, a bar and a percentage in each row, and
// nothing moves (Apple: "keep content and controls in consistent, predictable positions"); they stay while you move your
// votes, until the round closes. Before that the counts are hidden (a count seen first draws votes to whatever is
// ahead), and everyone gets the features in an order of their own (the first place draws votes too). Under the poll,
// what the votes made: coming next, and shipped (its voters hear when it ships). The rocket's badge counts the votes you
// haven't cast. Votes are the device's, as everything in the app: no account. The API: src/roadmap.ts.
window.Roadmap = (() => {
  // The Windows app doesn't reach the Roadmap yet.
  if (window.__platform === 'win32') return null;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const api = (method, path, body) =>
    window.webkit.messageHandlers.cloud.postMessage({ type: 'social', method, path, body }).catch(() => ({ error: 'offline' }));
  const say = (msg) => (typeof window.toast === 'function' ? window.toast(msg) : console.warn(msg));
  const handle = (p) => `${p.name}#${String(p.tag).padStart(4, '0')}`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const stored = (k, d) => {
    try {
      return localStorage.getItem(k) ?? d;
    } catch {
      return d;
    }
  };
  const store = (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  };
  const CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 8.5 6.5 11.6 12.8 4.8"/></svg>';

  let R = null; // the API's answer: { round: { n, endsAt, top }, votes, left, revealed, voters, ballot, moved }
  let failed = false;
  let missing = false; // a server without the Roadmap yet (an app out before its API): no rocket at all
  let el = null;
  let shown = false;
  let timer = 0;
  let celebrate = false; // the results come in for the first time: their bars grow
  let nudge = false; // a 4th tap: the line on top says what to do
  const busy = new Set();

  const need = () => (R ? Math.min(R.votes, R.ballot.length) : 0);
  const used = () => (R ? R.ballot.filter((i) => i.mine).length : 0);
  const left = () => Math.max(0, need() - used());

  async function load() {
    const r = await api('GET', 'v1/roadmap');
    failed = !r || !!r.error;
    missing = r?.error === 'Not Found';
    if (!failed) R = r;
    badge();
    if (shown) render();
  }

  // The rocket: a badge with the votes you haven't cast, and a beacon until you've looked at a new round.
  function badge() {
    const ab = document.querySelector('#activity [data-view=roadmap]');
    const b = ab?.querySelector('.vs-badge');
    if (!b) return;
    ab.hidden = missing;
    const n = R ? left() : 0;
    b.hidden = !n;
    b.textContent = String(n);
    ab.classList.toggle('rm-fresh', !!n && String(R.round.n) !== stored('roadmap.seen', ''));
  }

  const day = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(+d) ? '' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // ---------- the poll ----------
  function pollHTML() {
    const n = need();
    const k = used();
    const dots = Array.from({ length: n }, (_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('');
    const status = nudge
      ? `<p class="rm-status warn"><span class="rm-dots">${dots}</span>Tap one of yours first to free a vote</p>`
      : R.revealed && k === n
        ? `<p class="rm-status done">${CHECK}<b>Thanks for voting</b><span>· tap to change your votes</span></p>`
        : `<p class="rm-status"><span class="rm-dots">${dots}</span><b>${k ? `${n - k} more` : `Choose ${n}`}</b><span>${R.revealed ? 'to use all your votes' : 'to see the results'}</span></p>`;
    const caption = [`The ${R.round.top} most voted get built next`, R.round.endsAt ? `closes ${day(R.round.endsAt)}` : '', R.voters ? `${plural(R.voters, 'person', 'people')} voted` : '']
      .filter(Boolean)
      .join(' · ');
    const total = R.ballot.reduce((a, i) => a + (i.votes || 0), 0);
    // Equal votes, equal place (1, 2, 2, 4): a tie on the line is on it for both.
    const rank = (it) => 1 + R.ballot.filter((o) => o.votes > it.votes).length;
    const rows = R.ballot
      .map((it) => {
        const r = R.revealed ? rank(it) : 0;
        const top = r && r <= R.round.top && it.votes > 0;
        const pct = total ? Math.round((100 * it.votes) / total) : 0;
        return (
          `<button type="button" class="rm-opt${it.mine ? ' on' : ''}${top ? ' top' : ''}" data-id="${it.id}" aria-pressed="${it.mine}" title="${it.mine ? 'Your vote · tap to take it back' : 'Tap to vote'}">` +
          `<span class="rm-check">${it.mine ? CHECK : ''}</span>` +
          `<span class="rm-opt-main"><span class="rm-opt-title">${esc(it.title)}</span>` +
          `${it.why || it.by ? `<span class="rm-opt-why">${esc(it.why)}${it.by ? ` <i class="rm-by">· idea by ${esc(handle(it.by))}</i>` : ''}</span>` : ''}` +
          `${R.revealed ? `<span class="rm-meter"><i style="--w:${pct}%"></i></span>` : ''}</span>` +
          `${R.revealed ? `<span class="rm-opt-num"><b>${pct}%</b>${top ? `<em class="rm-rank">#${r}</em>` : `<small>${plural(it.votes, 'vote', 'votes')}</small>`}</span>` : ''}` +
          '</button>'
        );
      })
      .join('');
    return (
      `<div class="rm-head"><h2>What should we build next?</h2>${status}<p class="rm-caption">${esc(caption)}</p></div>` +
      `<div class="rm-poll${R.revealed ? ' revealed' : ''}${celebrate ? ' grow' : ''}">${rows}</div>`
    );
  }

  // ---------- what the votes made ----------
  function madeHTML() {
    const line = (it, pill, cls) =>
      `<div class="rm-line"><span class="rm-state ${cls}">${esc(pill)}</span><b>${esc(it.title)}</b>` +
      `<small>${plural(it.votes, 'vote', 'votes')}${it.mine ? ' · <span class="rm-also">yours too</span>' : ''}</small></div>`;
    const next = R.moved.filter((i) => i.status === 'progress' || i.status === 'planned');
    const shipped = R.moved.filter((i) => i.status === 'shipped');
    if (!next.length && !shipped.length) return '';
    return (
      '<div class="rm-made">' +
      (next.length ? `<h3>Coming next</h3>${next.map((it) => line(it, it.status === 'progress' ? 'In progress' : 'Planned', it.status)).join('')}` : '') +
      (shipped.length ? `<h3>Shipped</h3>${shipped.map((it) => line(it, it.version || 'Shipped', 'shipped')).join('')}` : '') +
      '</div>'
    );
  }

  function render() {
    if (!el) return;
    const body = el.querySelector('.rm-body');
    let html;
    if (!R) html = `<div class="mn-empty">${failed ? "can't reach the server · the Roadmap comes back with the connection" : 'loading…'}</div>`;
    else if (!R.ballot.length) html = '<div class="rm-head"><h2>No vote right now</h2><p class="rm-caption">The next round opens soon.</p></div>' + madeHTML();
    else html = pollHTML() + madeHTML();
    html +=
      '<div class="rm-idea"><span><b>Have an idea?</b> The good ones come up for a vote, with your name on them.</span>' +
      '<button type="button" class="rm-ghost" data-act="idea">Send an idea</button></div>';
    const top = body.scrollTop;
    body.innerHTML = html;
    body.scrollTop = top;
    celebrate = false;
  }

  async function vote(id) {
    const it = R?.ballot.find((i) => i.id === id);
    if (!it || busy.has(id)) return;
    if (!it.mine && left() <= 0) {
      // A 4th: the line on top says what to do, and shakes a little.
      nudge = true;
      render();
      const s = el.querySelector('.rm-status');
      s?.classList.add('shake');
      clearTimeout(vote.t);
      vote.t = setTimeout(() => {
        nudge = false;
        if (shown) render();
      }, 2600);
      return;
    }
    nudge = false;
    busy.add(id);
    const add = !it.mine;
    // At once on screen; the answer brings the counts (and puts it right if it failed).
    it.mine = add;
    render();
    badge();
    if (add) window.Sfx?.play('accept', true);
    const was = R.revealed;
    const r = await api(add ? 'POST' : 'DELETE', `v1/roadmap/${id}/vote`, add ? {} : undefined);
    busy.delete(id);
    if (!r || r.error) {
      say(r?.error === 'closed' ? 'that one just left the vote' : "couldn't save your vote · try again");
      return load();
    }
    R = r;
    celebrate = !was && R.revealed;
    render();
    badge();
  }

  function onClick(e) {
    const opt = e.target.closest('.rm-opt');
    if (opt) return vote(Number(opt.dataset.id));
    if (e.target.closest('[data-act=idea]')) return window.Cloud?.openFeedback();
  }

  // cloud.js makes the view (with the others of the activity bar) and opens it.
  function mount(view) {
    el = view;
    el.innerHTML =
      '<section class="panel cv-rm"><header><span class="tag">roadmap</span><span class="meta">vote for what comes next</span></header>' +
      '<div class="body rm-body"></div></section>';
    el.addEventListener('click', onClick);
  }

  function show() {
    shown = true;
    if (R) store('roadmap.seen', String(R.round.n));
    render();
    badge();
    load().then(() => {
      if (R) store('roadmap.seen', String(R.round.n));
      badge();
    });
    clearInterval(timer);
    timer = setInterval(load, 30_000);
  }

  function hide() {
    if (!shown) return;
    shown = false;
    clearInterval(timer);
    timer = setInterval(load, 600_000);
  }

  // A new round, an item moved on (the admin page), or the line back after it was down: the Roadmap again.
  window.Social?.on((ev) => (ev.type === 'roadmap' || ev.type === 'hello') && load());
  setTimeout(load, 1500);
  timer = setInterval(load, 600_000);

  return { mount, show, hide, load };
})();
