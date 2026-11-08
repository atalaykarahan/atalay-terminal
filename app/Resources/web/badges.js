'use strict';

// Badges on the dashboard (the API: badges.ts; the art: badge-art.js), as CS:GO's collectibles. Your inventory is in
// the main menu's PROFILE tab: every badge, grey until earned, the next tier's progress under it, how rare it is; right
// click one to display it. The displayed one shows beside your name wherever it's shown (the top bar, friends' lists,
// the leaderboard), as CS:GO shows its one display item; a friend's card opens their whole inventory, as looking into a
// Steam inventory. Signed-in accounts only: a guest sees the badges grey and a way to sign in. At level 60 a button
// resets the level for that year's Service Medal (CS:GO's prestige): the medal is the year's it's taken in.
window.Badges = (() => {
  if (window.__platform === 'win32' || !window.BadgeArt) return null;
  const h = window.webkit && window.webkit.messageHandlers;
  if (!h || !h.cloud) return null;
  const api = (method, path, body) => h.cloud.postMessage({ type: 'social', method, path, body }).catch(() => ({ error: 'offline' }));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const say = (m) => (typeof window.toast === 'function' ? window.toast(m) : console.warn(m));
  const Art = window.BadgeArt;

  let mine = null; // GET v1/badges
  let host = null; // the PROFILE tab's inventory while the menu is open
  let showEl = null, invEl = null; // your profile where the friends are: the displayed badge's slot, the inventory
  const subs = new Set(); // told when your badges load or the displayed one changes (your card on the friends list)
  // A badge just put on display lands in its slot (and beside your name) for a moment: drawn with the landing until then.
  let landing = null, landingUntil = 0;
  const lands = (id) => landing === id && Date.now() < landingUntil;
  const changed = () => subs.forEach((f) => f());
  const friends = new Map(); // id -> { at, data }

  const tierLine = (b) => Art.tierName(b.id, b.tier, b.tiers);
  const title = (b) => `${b.name}${b.tier ? ` · ${tierLine(b) || 'earned'}` : ''}`;
  const amount = (p) => {
    if (!p) return '';
    const hours = p.unit === 'h';
    const v = hours ? Math.floor(p.value / 3600) : p.value;
    const next = hours ? p.next / 3600 : p.next;
    // Service counts its days in seconds (badges.ts), On Fire counts days.
    if (p.unit === 'days' && p.next >= 86400) return `${Math.floor(p.value / 86400)} / ${Math.round(p.next / 86400)} days`;
    return `${Math.min(v, next)} / ${next}${p.unit ? ` ${hours ? 'h' : p.unit}` : ''}`;
  };

  /** A displayed badge beside a name, its card on hover (`owner`: whose it is, an account id, or none for yours). */
  function small(b, size = 18, owner) {
    if (!b) return '';
    const t = Art.tierName(b.id, b.tier);
    // An empty title keeps a row's own tooltip off the badge, where its card shows instead.
    return `<span class="bdg-mini" title="" aria-label="${esc(Art.name(b.id))}${t ? ` · ${esc(t)}` : ''}" data-bid="${esc(b.id)}" data-bt="${b.tier}"${owner ? ` data-owner="${esc(owner)}"` : ''}>${Art.svg(b.id, b.tier, size)}</span>`;
  }

  // ---------- a badge beside a name, on hover: its card, big ----------
  // The badge large in its metal, its name in its colour, its tier and the steps to the top one, what it's for, how many
  // players have it and when its owner got it: from your inventory for yours, else from the owner's (GET v1/badges/:id,
  // which shows anyone their displayed one), what's known drawn at once and the rest when it comes.
  let card = null, cardFor = null;
  function hoverCard(el) {
    const id = el.dataset.bid, tier = +el.dataset.bt, owner = el.dataset.owner || null;
    cardFor = el;
    const theirs = owner ? friends.get(owner)?.data : null;
    const known = (theirs && !theirs.error && theirs.badges?.find((x) => x.id === id)) || (!owner && mine?.badges.find((x) => x.id === id)) || null;
    const general = mine?.badges.find((x) => x.id === id) || null; // what it's for and how rare: the same for everyone
    drawCard(el, { id, tier, tiers: known?.tiers ?? general?.tiers ?? 1, how: known?.how ?? general?.how ?? '', rare: known?.rare ?? general?.rare ?? null, earnedAt: known?.earnedAt ?? null });
    if (owner && !known) {
      api('GET', `v1/badges/${owner}`).then((d) => {
        friends.set(owner, { at: Date.now(), data: d });
        const b = d && !d.error && d.badges?.find((x) => x.id === id);
        if (b && cardFor === el && el.isConnected) drawCard(el, { ...b, tier });
      });
    }
  }
  function drawCard(el, b) {
    if (!card) {
      card = document.createElement('div');
      card.className = 'bdg-hover';
      document.body.appendChild(card);
    }
    const tierText = Art.tierName(b.id, b.tier, b.tiers);
    const steps = b.tiers > 1 && !b.id.startsWith('service-')
      ? `<span class="steps">${Array.from({ length: b.tiers }, (_, i) => `<i class="${i < b.tier ? 'on' : ''}"></i>`).join('')}</span>` : '';
    card.style.setProperty('--q', Art.glow(b.id, b.tier)[0]);
    card.innerHTML =
      `<div class="bh-top"><div class="bh-art">${Art.svg(b.id, b.tier, 96)}</div><div class="bh-name"><b>${esc(Art.name(b.id))}</b>` +
      `<span class="q">${esc(tierText || 'Earned')}${b.tiers > 1 && !b.id.startsWith('service-') ? ` · tier ${b.tier} of ${b.tiers}` : ''}</span>${steps}</div></div>` +
      (b.how ? `<p>${esc(b.how)}</p>` : '') +
      (b.rare != null ? `<small class="tp-rare${b.rare <= 9 ? ' rare' : ''}">${b.rare <= 9 ? 'Rare · ' : ''}${b.rare}% of players have it</small>` : '') +
      (b.earnedAt ? `<small>Earned ${esc(new Date(b.earnedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }))}</small>` : '');
    const r = el.getBoundingClientRect();
    card.classList.add('on');
    const w = card.offsetWidth, h = card.offsetHeight;
    const left = r.right + 12 + w < innerWidth ? r.right + 12 : Math.max(8, r.left - 12 - w);
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(Math.max(8, Math.min(innerHeight - h - 8, r.top + r.height / 2 - h / 2)))}px`;
  }
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest?.('.bdg-mini[data-bid]');
    if (el && el !== cardFor) hoverCard(el);
    else if (!el && cardFor) {
      cardFor = null;
      card?.classList.remove('on');
    }
  });
  document.addEventListener('scroll', () => {
    cardFor = null;
    card?.classList.remove('on');
  }, { capture: true, passive: true });

  function tile(b, own) {
    const p = b.progress;
    const pct = p ? Math.max(0, Math.min(100, (100 * p.value) / p.next)) : 0;
    return (
      `<div class="bdg${b.tier ? '' : ' locked'}${own && mine && mine.featured === b.id ? ' shown' : ''}${own && lands(b.id) ? ' just' : ''}" data-badge="${esc(b.id)}" title="${esc(b.how)}">` +
      `${Art.svg(b.id, b.tier, own ? 64 : 48)}<b>${esc(b.name)}</b><small>${esc(b.tier ? tierLine(b) || 'earned' : 'locked')}</small>` +
      (own && p && b.tier < b.tiers && !(b.tiers === 1 && p.next === 1) ? `<i class="bdg-bar"><i style="width:${pct.toFixed(0)}%"></i></i><em>${esc(amount(p))}</em>` : '') +
      (b.tier ? `<span class="bdg-rare${b.rare && b.rare <= 9 ? ' rare' : ''}">${b.rare <= 9 ? 'rare · ' : ''}${b.rare}% have it</span>` : '') +
      (own && mine && mine.featured === b.id ? '<span class="bdg-flag">displayed</span>' : '') +
      '</div>'
    );
  }

  async function load() {
    const r = await api('GET', 'v1/badges');
    if (!r || r.error) return mine;
    mine = r;
    render();
    renderShowcase();
    paintTop();
    changed();
    return mine;
  }

  // Your displayed badge beside your name in the top bar (after the name's own markup, which cloud.js redraws).
  function paintTop() {
    const name = document.querySelector('.brand b .htag')?.parentElement;
    if (!name) return;
    name.querySelector(':scope > .bdg-mini')?.remove();
    const b = mine && mine.featured && mine.badges.find((x) => x.id === mine.featured);
    if (b && b.tier) name.insertAdjacentHTML('beforeend', small(b, 18));
    if (b && lands(b.id)) name.querySelector(':scope > .bdg-mini')?.classList.add('pop');
  }

  function render() {
    if (!host || !host.isConnected) return;
    if (!mine) return setHTML(host, '<div class="mn-empty">loading…</div>');
    const earned = mine.badges.filter((b) => b.tier);
    const head = mine.signedIn
      ? `<p class="bdg-sum">${earned.length ? `<b>${earned.length}</b> ${earned.length === 1 ? 'badge' : 'badges'} · right click one to display it beside your name` : 'no badges yet · they come as you work'}</p>`
      : '<p class="bdg-sum bdg-guest"><b>Badges are for signed-in accounts.</b> Sign in (GitHub or e-mail) and what you\'ve done so far counts at once. <button type="button" class="mn-btn go" data-b="signin">sign in</button></p>';
    const prestige = medalBanner();
    // Only the ones you have, as CS:GO's inventory (what's left to earn isn't shown), the rarest first.
    const order = earned.sort((a, b) => a.rare - b.rare);
    setHTML(host, head + prestige + (order.length ? `<div class="bdg-grid">${order.map((b) => tile(b, true)).join('')}</div>` : ''));
  }

  // Right click on one of yours: display it, or stop.
  function contextMenu(e) {
    const t = e.target.closest('.bdg[data-badge], .sc-item[data-badge]');
    hideTip();
    document.querySelector('.bdg-ctx')?.remove();
    if (!t || !mine) return;
    e.preventDefault();
    const b = mine.badges.find((x) => x.id === t.dataset.badge);
    if (!b) return;
    const m = document.createElement('div');
    m.className = 'mn-ctx bdg-ctx';
    m.style.position = 'fixed';
    m.style.left = `${Math.min(e.clientX, innerWidth - 220)}px`;
    m.style.top = `${Math.min(e.clientY, innerHeight - 90)}px`;
    m.innerHTML = !b.tier
      ? `<button type="button" disabled>🔒 not earned yet · ${esc(b.how)}</button>`
      : mine.featured === b.id
        ? '<button type="button" data-c="off">✕ stop displaying</button>'
        : '<button type="button" data-c="on">★ display beside my name</button>';
    m.onclick = async (ev) => {
      const c = ev.target.closest('[data-c]');
      m.remove();
      if (!c) return;
      const r = await api('PUT', 'v1/badges/featured', { badge: c.dataset.c === 'on' ? b.id : null });
      if (r.error) return say(r.error === 'not_yours' ? 'not earned yet' : "couldn't change it · try again");
      // Put on display, as CS:GO's collectibles: a chain's hard landing that rings on (sounds/badge-equip, its hit
      // 0.36 s in), the badge dropping into its slot to land on that hit.
      if (r.featured) {
        landing = r.featured;
        landingUntil = Date.now() + 1300;
        window.Sfx?.sample('badge-equip');
      }
      mine.featured = r.featured;
      render();
      renderShowcase();
      paintTop();
      changed();
      say(r.featured ? `${b.name} shows beside your name now` : 'no badge beside your name now');
    };
    document.body.appendChild(m);
    setTimeout(() => document.addEventListener('mousedown', function off(ev) {
      if (!m.contains(ev.target)) m.remove();
      document.removeEventListener('mousedown', off, true);
    }, true));
  }

  // Level 60: this year's Service Medal waits, as CS:GO's "Get Service Medal": a wide banner in gold with light running
  // round its edge, the next medal big and gleaming, this year's six levels under it (a year's medal can't be had after
  // 1 January), and a button that asks once more before the level goes back to 1.
  let asking = false;
  function medalBanner() {
    if (!mine || !mine.prestige || !mine.prestige.can) return '';
    const year = new Date().getFullYear();
    const id = `service-${year}`;
    const have = mine.badges.find((b) => b.id === id)?.tier || 0;
    if (have >= 6) return '';
    const next = have + 1;
    const pips = Array.from({ length: 6 }, (_, i) => `<i class="${i < have ? 'on' : i === have ? 'next' : ''}" style="--p:${Art.glow(id, i + 1)[0]}"></i>`).join('');
    return (
      `<div class="sm-banner" style="--rc:${Art.glow(id, next)[0]}"><div class="sm-art"><span class="sm-medal">${Art.svg(id, next, 132)}${Art.gleam(id, next, 'sm-shine')}</span></div>` +
      `<div class="sm-text"><small>LEVEL 60 · MAX LEVEL</small><b>${year} SERVICE MEDAL</b>` +
      `<span>${have ? `Level ${next} of this year's medal` : "This year's medal"} is yours to take: start again at level 1 for it. Your XP total, your badges and your place on the leaderboard stay.</span>` +
      `<span class="sm-pips">${pips}<em>${have} of 6 this year · gone on 1 January</em></span></div>` +
      (asking
        ? '<div class="sm-ask"><span>back to level 1?</span><button type="button" class="sm-btn" data-b="prestige-go">✓ yes, get it</button><button type="button" class="sm-no" data-b="prestige-no">cancel</button></div>'
        : '<button type="button" class="sm-btn" data-b="prestige">GET SERVICE MEDAL</button>') +
      '</div>'
    );
  }

  async function onClick(e) {
    const b = e.target.closest('[data-b]');
    if (!b) return;
    if (b.dataset.b === 'signin') return window.Cloud?.openSettings();
    if (b.dataset.b === 'prestige' || b.dataset.b === 'prestige-no') {
      asking = b.dataset.b === 'prestige';
      render();
      return renderShowcase();
    }
    if (b.dataset.b === 'prestige-go') {
      asking = false;
      b.disabled = true;
      const r = await api('POST', 'v1/badges/prestige', {});
      if (r.error) {
        b.disabled = false;
        return say(r.error === 'not_yet' ? 'not yet · level 60 first (6 medals a year at most)' : "couldn't do it · try again");
      }
      say(`Service Medal ${r.badge.slice(8)}, level ${r.tier} · back to level 1`);
      window.webkit.messageHandlers.cloud.postMessage({ type: 'refresh' }).then((s) => s && window.Cloud?.render(s)).catch(() => {});
      load();
    }
  }

  /** The PROFILE tab gives its inventory section while the menu is open. */
  function mountInventory(el) {
    host = el;
    if (!host) return;
    host.addEventListener('contextmenu', contextMenu);
    host.addEventListener('click', onClick);
    render();
    load();
  }

  // ---------- your profile where the friends are (cloud.js renderMe): CS:GO's inventory screen ----------
  // The badge you display in a slot at the top right, your badges under it as CS:GO's inventory: only the ones you have
  // (what's left to earn isn't shown), dark tiles of fixed colours with the badge's own colour along the bottom, a card on
  // hover that says what each one is for and how far the next tier is.
  const ORDER = (a, b) => a.rare - b.rare;
  const colour = (b) => (b.tier ? Art.glow(b.id, b.tier)[0] : '90, 95, 102');

  function renderShowcase() {
    if (showEl && showEl.isConnected) {
      const b = mine && mine.featured && mine.badges.find((x) => x.id === mine.featured && x.tier);
      setHTML(showEl, b
        ? `<div class="sc-slot on${lands(b.id) ? ' land' : ''}" style="--q:${colour(b)}" data-badge="${esc(b.id)}"><small>DISPLAYED</small>${Art.svg(b.id, b.tier, 112)}<b>${esc(b.name)}</b><span>${esc(tierLine(b) || 'earned')}</span></div>`
        : `<div class="sc-slot"><small>DISPLAYED</small><i>◆</i><span>${mine && !mine.signedIn ? 'sign in to earn badges' : 'right click a badge below to display it beside your name'}</span></div>`);
    }
    if (!invEl || !invEl.isConnected) return;
    if (!mine) return setHTML(invEl, '<div class="mn-empty">loading…</div>');
    const list = mine.badges.filter((b) => b.tier).sort(ORDER);
    const prestige = medalBanner();
    const guest = mine.signedIn ? '' : '<p class="bdg-sum bdg-guest"><b>Badges are for signed-in accounts.</b> Sign in (GitHub or e-mail) and what you\'ve done so far counts at once. <button type="button" class="mn-btn go" data-b="signin">sign in</button></p>';
    setHTML(invEl,
      guest + prestige +
      `<div class="sc-bar"><span class="sc-title">INVENTORY</span><span class="sc-count"><b>${list.length}</b> ${list.length === 1 ? 'badge' : 'badges'}</span></div>` +
      (list.length
        ? `<div class="sc-grid">${list.map(item).join('')}</div>`
        : mine.signedIn ? '<div class="mn-empty">no badges yet · they come as you work, one at a time</div>' : ''));
  }

  function item(b) {
    const shown = mine.featured === b.id;
    return (
      `<div class="sc-item${shown ? ' shown' : ''}${lands(b.id) ? ' just' : ''}" data-badge="${esc(b.id)}" style="--q:${colour(b)}">` +
      `<div class="sc-art">${Art.svg(b.id, b.tier, 84)}</div><b>${esc(b.name)}</b><span>${esc(tierLine(b) || 'earned')}</span>` +
      (shown ? '<em class="sc-flag">★</em>' : '') + (b.tier && b.rare <= 9 ? '<em class="sc-rare">RARE</em>' : '') +
      '<i class="sc-q"></i></div>'
    );
  }

  // The card on hover, as CS:GO's: the name in the badge's colour, its tier, what it's for, how far to the next tier,
  // how many have it, when you got it.
  let tip = null;
  function showTip(t) {
    const id = t.dataset.badge;
    const b = id && mine && mine.badges.find((x) => x.id === id);
    if (!b) return hideTip();
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'sc-tip';
      document.body.appendChild(tip);
    }
    const p = b.progress;
    const next = b.tier < b.tiers ? Art.tierName(b.id, b.tier + 1, b.tiers) : '';
    const steps = b.tiers > 1 && !b.id.startsWith('service-') ? `<span class="steps">${Array.from({ length: b.tiers }, (_, i) => `<i class="${i < b.tier ? 'on' : ''}"></i>`).join('')}</span>` : '';
    tip.style.setProperty('--q', colour(b));
    tip.innerHTML =
      `<b>${esc(b.name)}</b><span class="q">${esc(tierLine(b) || 'Earned')}${b.tiers > 1 && !b.id.startsWith('service-') ? ` · tier ${b.tier} of ${b.tiers}` : ''}</span>${steps}` +
      `<p>${esc(b.how)}</p>` +
      (p && b.tier < b.tiers && !(b.tiers === 1 && p.next === 1)
        ? `<div class="tp-prog"><label>${next ? `to ${esc(next)}` : 'progress'}</label><i><i style="width:${Math.max(0, Math.min(100, (100 * p.value) / p.next)).toFixed(0)}%"></i></i><small>${esc(amount(p))}</small></div>`
        : '') +
      `<small class="tp-rare${b.rare <= 9 ? ' rare' : ''}">${b.rare <= 9 ? 'Rare · ' : ''}${b.rare}% of players have it</small>` +
      (b.earnedAt ? `<small>Earned ${esc(new Date(b.earnedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }))}</small>` : '') +
      (mine.signedIn ? `<em>${mine.featured === b.id ? '★ displayed beside your name · right click to stop' : 'right click to display it beside your name'}</em>` : '');
    const r = t.getBoundingClientRect();
    tip.classList.add('on');
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const left = r.right + 10 + w < innerWidth ? r.right + 10 : Math.max(8, r.left - 10 - w);
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(Math.max(8, Math.min(innerHeight - h - 8, r.top)))}px`;
  }
  function hideTip() {
    tip?.classList.remove('on');
  }

  /** Your profile where the friends are: the displayed badge's slot and the inventory. */
  function mountShowcase(slot, inv) {
    showEl = slot;
    invEl = inv;
    if (!invEl) return;
    invEl.addEventListener('contextmenu', contextMenu);
    showEl?.addEventListener('contextmenu', contextMenu);
    invEl.addEventListener('click', onClick);
    invEl.addEventListener('mouseover', (e) => {
      const t = e.target.closest('.sc-item');
      if (t) showTip(t);
    });
    invEl.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget?.closest?.('.sc-item')) hideTip();
    });
    invEl.closest('.body')?.addEventListener('scroll', hideTip, { passive: true });
    renderShowcase();
    load();
  }

  /** A friend's card: their whole inventory (their displayed one first). */
  async function mountFriend(el, id) {
    if (!el) return;
    const cached = friends.get(id);
    const show = (d) => {
      if (!el.isConnected) return;
      if (!d || d.error) return setHTML(el, '');
      if (!d.badges.length) return setHTML(el, '<p class="bdg-none">no badges yet</p>');
      const list = [...d.badges].sort((a, b) => (b.id === d.featured) - (a.id === d.featured));
      setHTML(el, `<div class="bdg-grid small">${list.map((b) => tile(b, false)).join('')}</div>`);
    };
    if (cached) show(cached.data);
    if (cached && Date.now() - cached.at < 60_000) return;
    const d = await api('GET', `v1/badges/${id}`);
    friends.set(id, { at: Date.now(), data: d });
    show(d);
  }

  window.Social?.on((ev) => {
    if (ev.type === 'badge' || ev.type === 'badge_featured' || (ev.type === 'account' && ev.event !== 'devices') || ev.type === 'hello') load();
  });
  setTimeout(load, 3000);

  return { small, mountInventory, mountShowcase, mountFriend, load, paintTop, mine: () => mine, on: (f) => subs.add(f) };
})();
