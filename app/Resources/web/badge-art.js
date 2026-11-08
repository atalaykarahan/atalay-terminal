'use strict';

// The badges' art (badges.ts in the API decides who has which): drawn here as vectors, sharp at any size, and in fixed
// colours, never the theme's, as CS:GO's collectibles look the same whatever your HUD. Tiered badges are coins struck in
// their tier's metal (bronze, silver, gold, diamond); the Season and Service Medals hang from a ribbon, the Service
// Medal's level in CS:GO's colours (grey, green, blue, purple, pink, red); a few one-offs have colours of their own.
window.BadgeArt = (() => {
  let n = 0;
  const METAL = {
    1: ['#5c2f12', '#c98a55', '#f2c08d', '#7a4019'], // bronze
    2: ['#4f5963', '#c7d0d8', '#ffffff', '#7d8893'], // silver
    3: ['#7a5208', '#f2b93b', '#fff1a8', '#a36f0a'], // gold
    4: ['#0f5f80', '#59d0f5', '#e8fdff', '#1d86ad'], // diamond
    5: ['#3c1460', '#b061f0', '#f3d9ff', '#6a2aa0'], // legend (5 years)
  };
  // The Service Medal's levels, as CS:GO's.
  const SERVICE = ['#8c959e', '#4fb35a', '#3f7fd6', '#8a5cf5', '#e8559c', '#e23b3b'];
  // One-offs: [rim dark, rim, shine, field]
  const SOLO = {
    mac: ['#2c3238', '#aab4bd', '#ffffff', '#11161b'],
    windows: ['#0d3d73', '#3d8fe6', '#cfe6ff', '#071b33'],
    both: ['#3a2a5c', '#9b86e8', '#efe9ff', '#140f22'],
    founder: ['#0b0b0b', '#d4a531', '#fff0b8', '#0d0a05'],
    polyglot: ['#6b2a0f', '#f08a2c', '#ffe1b3', '#1a0d05'],
    night: ['#121a40', '#5c6fe0', '#dfe5ff', '#070a1c'],
    comeback: ['#0d4a44', '#36c2b0', '#d4fff8', '#04201d'],
  };

  // The emblems, on a 24×24 grid (strokes and fills take the badge's metal).
  const P = {
    mac: '<rect x="4" y="5" width="16" height="11" rx="1.6" class="s"/><path class="s" d="M2 18.5h20l-1.5 1.5h-17z"/>',
    windows: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.6" class="s"/><path class="s" d="M3.5 8.5h17"/><circle cx="6" cy="6.5" r=".7" class="f"/><circle cx="8.2" cy="6.5" r=".7" class="f"/>',
    both: '<rect x="2.5" y="5" width="11" height="8" rx="1.2" class="s"/><path class="s" d="M1.5 15h13"/><rect x="11.5" y="9" width="10" height="10" rx="1.2" class="s"/><path class="s" d="M11.5 12h10"/>',
    week: '<rect x="3.5" y="5" width="17" height="15" rx="1.8" class="s"/><path class="s" d="M3.5 9.5h17M8 3v4M16 3v4"/><path class="f" d="M6 17h2v-3H6zM9.5 17h2v-4.5h-2zM13 17h2v-6h-2zM16.5 17h2v-7.5h-2z"/>',
    streak: '<path class="s" d="M3 18l4.5-5 3.5 3 4.5-6 2.5 2.5L21 8"/><path class="s" d="M17 8h4v4"/>',
    fire: '<path class="f" d="M12 2.5c.6 3.2-1.6 4.9-3 6.8C7.6 11.2 6.5 13 6.5 15.2c0 3.3 2.5 6.3 5.5 6.3s5.5-2.6 5.5-6.1c0-2.4-1.2-4.1-2.3-5.4.1 1.6-.4 2.9-1.6 3.6.4-3.8-.6-7.7-1.6-11.1z"/><path d="M12 13.5c1.6 1.4 2.4 2.7 2.4 4.1 0 1.6-1.1 2.8-2.4 2.8s-2.4-1.1-2.4-2.6c0-1.4.9-2.6 2.4-4.3z" fill="rgba(0,0,0,.35)"/>',
    hours: '<path class="s" d="M6.5 3h11M6.5 21h11M7.5 3c0 4.5 4.5 5.5 4.5 9s-4.5 4.5-4.5 9M16.5 3c0 4.5-4.5 5.5-4.5 9s4.5 4.5 4.5 9"/><path class="f" d="M9 19.5c1-1.6 2-2.3 3-2.3s2 .7 3 2.3z"/>',
    claude: '<path class="f" d="M12 2l1.4 6.2L18.4 4l-3.6 5.2 6.4-.4-5.9 2.4 5.9 2.4-6.4-.4 3.6 5.2-5-4.2L12 22l-1.4-6.2L5.6 20l3.6-5.2-6.4.4 5.9-2.4-5.9-2.4 6.4.4L5.6 4l5 4.2z"/>',
    codex: '<path class="s" d="M9 5c-2.5 0-3 1.2-3 3v1.8c0 1.2-.8 2.2-2.2 2.2 1.4 0 2.2 1 2.2 2.2V16c0 1.8.5 3 3 3M15 5c2.5 0 3 1.2 3 3v1.8c0 1.2.8 2.2 2.2 2.2-1.4 0-2.2 1-2.2 2.2V16c0 1.8-.5 3-3 3"/><circle cx="12" cy="12" r="1.3" class="f"/>',
    gemini: '<path class="f" d="M12 2c.7 5.3 4.7 9.3 10 10-5.3.7-9.3 4.7-10 10-.7-5.3-4.7-9.3-10-10 5.3-.7 9.3-4.7 10-10z"/>',
    antigravity: '<path class="s" d="M12 3v11"/><path class="s" d="M8 7l4-4 4 4"/><ellipse class="s" cx="12" cy="17.5" rx="8" ry="2.6"/>',
    polyglot: '<circle cx="9" cy="9.5" r="5" class="s"/><circle cx="15" cy="9.5" r="5" class="s"/><circle cx="12" cy="14.5" r="5" class="s"/>',
    squad: '<circle cx="9" cy="8" r="3" class="s"/><path class="s" d="M3.5 19c.5-3.4 2.7-5.5 5.5-5.5s5 2.1 5.5 5.5"/><circle cx="16.5" cy="9" r="2.5" class="s"/><path class="s" d="M15.5 13.6c2.8.1 4.5 2.1 5 5"/>',
    voice: '<path class="s" d="M12 2.5c3 2 4.5 5.2 4.5 9.2V16h-9v-4.3c0-4 1.5-7.2 4.5-9.2z"/><circle cx="12" cy="9.5" r="1.6" class="f"/><path class="s" d="M7.5 13.5L5 17l2.5 1M16.5 13.5L19 17l-2.5 1M10 19l2 2.5 2-2.5"/>',
    idea: '<path class="s" d="M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2v.5h5V16c0-.8.3-1.6 1.1-2.2A6 6 0 0 0 12 3z"/><path class="s" d="M9.8 19h4.4M10.5 21.5h3"/><path class="f" d="M11.3 9h1.4l-.3 4h-.8z"/>',
    tenure: '<path class="s" d="M12 2.5l7.5 3v6c0 4.5-3.2 8.3-7.5 10-4.3-1.7-7.5-5.5-7.5-10v-6z"/><path class="s" d="M8 11l4 2.5 4-2.5M8 14.5l4 2.5 4-2.5"/>',
    founder: '<path class="f" d="M3 18l1.2-10 4.6 4.5L12 5l3.2 7.5L19.8 8 21 18z"/><path class="s" d="M3 20.5h18"/>',
    night: '<path class="f" d="M15 3a8.5 8.5 0 1 0 6 14.5A7 7 0 0 1 15 3z"/><path class="f" d="M7 4.5l.5 1.3 1.3.5-1.3.5L7 8.1l-.5-1.3-1.3-.5 1.3-.5zM4.5 10l.35.9.9.35-.9.35-.35.9-.35-.9-.9-.35.9-.35z"/>',
    comeback: '<path class="s" d="M19 12a7 7 0 1 1-2.1-5"/><path class="s" d="M17.5 3v4.2h-4.2"/><path class="f" d="M10.5 9l4.5 3-4.5 3z"/>',
  };

  const stops = (m, id) =>
    `<linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m[2]}"/><stop offset=".35" stop-color="${m[1]}"/><stop offset=".7" stop-color="${m[3]}"/><stop offset="1" stop-color="${m[0]}"/></linearGradient>` +
    `<linearGradient id="${id}e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m[2]}"/><stop offset=".55" stop-color="${m[1]}"/><stop offset="1" stop-color="${m[3]}"/></linearGradient>` +
    `<radialGradient id="${id}f" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="${m[4] ? m[4] : '#2a1f16'}" stop-opacity=".9"/><stop offset="1" stop-color="#0a0705"/></radialGradient>`;

  // A coin: a reeded rim in the metal, a dark field, the emblem struck in the metal, a shine across the top.
  function coin(emblem, m, id, sparkle) {
    let reeds = '';
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      reeds += `<line x1="${(50 + 46 * Math.cos(a)).toFixed(2)}" y1="${(50 + 46 * Math.sin(a)).toFixed(2)}" x2="${(50 + 42.5 * Math.cos(a)).toFixed(2)}" y2="${(50 + 42.5 * Math.sin(a)).toFixed(2)}"/>`;
    }
    return (
      `<circle cx="50" cy="50" r="48" fill="url(#${id}r)"/>` +
      `<g stroke="rgba(0,0,0,.28)" stroke-width="1.2">${reeds}</g>` +
      `<circle cx="50" cy="50" r="40" fill="url(#${id}f)" stroke="url(#${id}e)" stroke-width="3"/>` +
      `<circle cx="50" cy="50" r="35.5" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1"/>` +
      `<g transform="translate(26 26) scale(2)" class="em">${emblem}</g>` +
      `<path d="M14 38 A38 38 0 0 1 86 38 A44 30 0 0 0 14 38z" fill="rgba(255,255,255,.12)"/>` +
      (sparkle ? '<path d="M78 16l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff"/><path d="M20 76l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z" fill="#e8fdff"/>' : '')
    );
  }

  // A medal on a ribbon: the season's (bronze, silver, gold, diamond) or the Service Medal (CS:GO's colours by level).
  function medal(label, sub, m, ribbon, id) {
    return (
      `<path d="M30 2h16l6 30-14 6z" fill="${ribbon[0]}"/><path d="M54 2h16L62 38l-14-6z" fill="${ribbon[1]}"/>` +
      `<path d="M30 2h16l2 9H32z" fill="rgba(0,0,0,.25)"/><path d="M54 2h16l-2 9H52z" fill="rgba(0,0,0,.25)"/>` +
      `<circle cx="50" cy="62" r="34" fill="url(#${id}r)"/>` +
      `<circle cx="50" cy="62" r="27" fill="url(#${id}f)" stroke="url(#${id}e)" stroke-width="2.5"/>` +
      `<path d="M50 41l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L50 64.6l-9.3 4.9 1.8-10.3-7.5-7.3 10.4-1.5z" fill="url(#${id}e)" opacity=".22"/>` +
      `<text x="50" y="${sub ? 66 : 70}" text-anchor="middle" font-family="SF Pro Display,-apple-system,Segoe UI,sans-serif" font-weight="800" font-size="${label.length > 2 ? 17 : 22}" fill="url(#${id}e)">${label}</text>` +
      (sub ? `<text x="50" y="80" text-anchor="middle" font-family="SF Mono,Menlo,Consolas,monospace" font-weight="700" font-size="9" fill="url(#${id}e)" opacity=".85">${sub}</text>` : '') +
      `<path d="M24 52 A28 28 0 0 1 76 52 A32 22 0 0 0 24 52z" fill="rgba(255,255,255,.12)"/>`
    );
  }

  // The badges' pictures (badges/<name>-<tier>.webp, made with Gemini, cut from its sheets): how many tiers each has.
  // Every season's medal shares one set; anything without a picture (or a tier past its pictures) is drawn below.
  const IMG = { week: 3, streak: 4, fire: 4, hours: 4, claude: 4, codex: 4, gemini: 4, antigravity: 4, squad: 3, voice: 3, idea: 2, tenure: 5,
    season: 4, service: 6, mac: 1, windows: 1, both: 1, polyglot: 1, founder: 1, night: 1, comeback: 1 };
  // Each year's Service Medal has a design of its own, as CS:GO's (badges/service-<year>-<tier>.webp): the years drawn
  // so far. A year not drawn yet shows the latest design before it.
  const SERVICE_YEARS = [2026, 2027];
  const serviceYear = (y) => [...SERVICE_YEARS].reverse().find((x) => x <= y) ?? SERVICE_YEARS[0];

  /** The badge's picture (badges/…webp), or '' when it's drawn. */
  function src(id, tier) {
    const key = id.startsWith('season-') ? 'season' : id.startsWith('service-') ? 'service' : id;
    if (!IMG[key] || (tier || 1) > IMG[key]) return '';
    const t = Math.max(1, Math.min(IMG[key], tier || 1));
    return `badges/${key === 'service' ? `service-${serviceYear(Number(id.slice(8)))}` : key}-${t}.webp`;
  }

  /** The badge `id` at `tier` (0: not earned, grey), `size` px square: its picture, or drawn when it has none. */
  function svg(id, tier, size = 48) {
    const pic = src(id, tier);
    if (pic) return `<img class="badge-art${tier ? '' : ' locked'}" src="${pic}" width="${size}" height="${size}" alt="" draggable="false">`;
    return draw(id, tier, size);
  }

  /** A gleam crossing the badge in its own shape: a brightened copy of its picture, seen through a moving stripe (the
   *  page's CSS moves it, class `cls` + `gleam`); nothing for a drawn one. */
  function gleam(id, tier, cls) {
    const pic = src(id, tier);
    return pic ? `<img class="gleam ${cls}" src="${pic}" alt="" draggable="false">` : '';
  }

  function draw(id, tier, size) {
    const uid = `bg${++n}`;
    const grey = !tier;
    const m = metal(id, tier);
    let body;
    if (id.startsWith('service-')) {
      body = medal(String(tier || 1), id.slice(8), m, [shade(m[1], -0.15), shade(m[1], -0.4)], uid);
    } else if (id.startsWith('season-')) {
      const [y, q] = id.slice(7).split('-');
      body = medal(`Q${q}`, y, m, ['#c2410c', '#7c2d12'], uid);
    } else {
      body = coin(P[id] || '<circle cx="12" cy="12" r="6" class="s"/>', m, uid, tier >= 4 && !SOLO[id]);
    }
    const style = `<style>#${uid} .s{fill:none;stroke:url(#${uid}e);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}#${uid} .f{fill:url(#${uid}e)}</style>`;
    return (
      `<svg id="${uid}" class="badge-art${grey ? ' locked' : ''}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">` +
      `<defs>${stops(m, uid)}</defs>${style}${body}</svg>`
    );
  }

  // The badge's colours: [rim dark, rim, shine, field].
  function metal(id, tier) {
    if (id.startsWith('service-')) {
      const c = SERVICE[Math.max(0, Math.min(5, (tier || 1) - 1))];
      return [shade(c, -0.55), c, shade(c, 0.55), shade(c, -0.25)];
    }
    if (id.startsWith('season-')) return METAL[Math.min(4, tier || 1)];
    return SOLO[id] || METAL[Math.max(1, Math.min(5, tier || 1))];
  }

  // "r, g, b" of the rim and of the shine: the reveal's glow and sparks (messages.js).
  const rgb = (hex) => { const v = parseInt(hex.slice(1), 16); return `${v >> 16}, ${(v >> 8) & 255}, ${v & 255}`; };
  const glow = (id, tier) => { const m = metal(id, tier); return [rgb(m[1]), rgb(m[2])]; };
  /** A grand reveal: gold and up, a Service Medal, a hidden one, Founder. */
  const grand = (id, tier) => tier >= 3 || id.startsWith('service-') || ['night', 'comeback', 'founder'].includes(id);

  // A colour lighter (amount > 0) or darker.
  function shade(hex, amount) {
    const v = parseInt(hex.slice(1), 16);
    const ch = [v >> 16, (v >> 8) & 255, v & 255].map((c) => Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount)));
    return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  }

  // Names and how many tiers each has (badges.ts says the same; the notices panel only has ids).
  const NAMES = { mac: 'macOS', windows: 'Windows', both: 'Two Worlds', week: 'Week of Work', streak: 'Steady', fire: 'On Fire',
    hours: 'Hundreds', claude: 'Claude', codex: 'Codex', gemini: 'Gemini', antigravity: 'Antigravity', polyglot: 'Polyglot', squad: 'Squad', voice: 'Your Say',
    idea: 'Idea Maker', tenure: 'Veteran', founder: 'Founder', night: 'Night Owl', comeback: 'Comeback' };
  const TIERS = { week: 3, streak: 4, fire: 4, hours: 4, claude: 4, codex: 4, gemini: 4, antigravity: 4, squad: 3, voice: 3, idea: 2, tenure: 5 };
  const TIER = ['', 'Bronze', 'Silver', 'Gold', 'Diamond', 'Legend'];
  const NAMED = { tenure: ['', '1 month', '6 months', '1 year', '2 years', '5 years'], idea: ['', 'Planned', 'Shipped'] };
  const name = (id) => NAMES[id] || (id.startsWith('season-') ? 'Season Medal' : id.startsWith('service-') ? 'Service Medal' : id);
  /** "Gold", a medal's level, a named step ("1 year"), or nothing for a one-off. */
  function tierName(id, tier, tiers) {
    if (id.startsWith('service-')) return `Level ${tier} · ${id.slice(8)}`;
    if (id.startsWith('season-')) return `${TIER[tier] || ''} · ${id.slice(7, 11)} Q${id.slice(12)}`;
    if (NAMED[id]) return NAMED[id][tier] || '';
    if ((TIERS[id] || tiers || 1) <= 1) return '';
    return TIER[tier] || `Tier ${tier}`;
  }

  return { svg, src, gleam, name, tierName, glow, grand };
})();
