'use strict';

// Levels and ranks as they look (the API decides them: api/src/xp.ts). Shared by the dashboard (top bar, profile,
// friends) and the message panels (badges, the level-up fanfare).
window.Xp = (() => {
  // Naruto's ninja ranks: the levels each one spans, and its colour (r, g, b, for CSS's rgb(var(--rc))). All in the
  // app's warm tones, heating up rank by rank: sand, light orange, the app's orange, amber, red-orange, red, white-gold.
  const RANKS = [
    { name: 'Academy Student', from: 1, to: 4, color: '196, 168, 140' },
    { name: 'Genin', from: 5, to: 14, color: '255, 176, 87' },
    { name: 'Chunin', from: 15, to: 24, color: '248, 128, 8' },
    { name: 'Jonin', from: 25, to: 34, color: '255, 210, 63' },
    { name: 'ANBU', from: 35, to: 44, color: '255, 99, 56' },
    { name: 'Sannin', from: 45, to: 54, color: '255, 77, 77' },
    { name: 'Kage', from: 55, to: 60, color: '255, 236, 179' },
  ];
  const rank = (level) => [...RANKS].reverse().find((r) => level >= r.from) || RANKS[0];

  // 2h 40m · 2h · 45m
  const dur = (s) => {
    const m = Math.floor((s || 0) / 60);
    if (m < 60) return `${m}m`;
    return m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`;
  };
  // Time ever: whole hours once there are many.
  const hours = (s) => (s >= 36_000 ? `${Math.floor(s / 3600).toLocaleString('en-US')}h` : dur(s));
  const num = (n) => Number(n || 0).toLocaleString('en-US');
  // How far into the current level, 0–100 (full at the last level).
  const pct = (x) => (x.to ? Math.max(0, Math.min(100, ((x.xp - x.from) / (x.to - x.from)) * 100)) : 100);

  // The last 7 days' active time as bars, today last (a hidden day, null, stays empty), in the rank's colour.
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const week = (days, color) => {
    if (!days || !days.length) return '';
    const max = Math.max(4 * 3600, ...days.filter((s) => s != null));
    const today = new Date().getDay();
    return (
      `<div class="xw" style="--rc:${color}">` +
      days
        .map((s, i) => {
          const last = i === days.length - 1;
          const name = last ? 'today' : DAYS[(today - (days.length - 1 - i) + 70) % 7];
          const h = s ? Math.max(3, (s / max) * 100) : 0;
          return `<div class="xw-d${last ? ' today' : ''}" title="${name}: ${s == null ? 'hidden' : dur(s)}"><em>${s ? dur(s) : ''}</em>` +
            `<b><i style="height:${h.toFixed(1)}%"></i></b><span>${name}</span></div>`;
        })
        .join('') +
      '</div>'
    );
  };

  // "Lv 23" in the rank's colour, next to a name.
  const badge = (level, act) => {
    const r = rank(level);
    return `<span class="lvb" style="--rc:${r.color}" title="Level ${level} · ${r.name}"${act ? ` data-act="${act}"` : ''}>Lv ${level}</span>`;
  };

  // A ninja headband in the rank's colour: a polished metal plate with the app's logo engraved, on a stitched cloth
  // band with its tails trailing. The engraving is the logo's shape in dark metal over a light edge; each headband has
  // its own filters, since one with the same id inside a hidden page wouldn't apply.
  let seq = 0;
  const headband = (level, cls = '') => {
    const id = `hb${++seq}`;
    const logo = (filter, shift) => `<image href="logo.png" x="61" y="16" width="38" height="30" filter="url(#${id}${filter})"${shift ? ' transform="translate(0.8 0.9)"' : ''}/>`;
    return (
      `<svg class="hb ${cls}" viewBox="0 0 160 64" style="--rc:${rank(level).color}" aria-hidden="true"><defs>` +
      `<filter id="${id}d" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 0.22 0 0 0 0 0.25 0 0 0 0 0.29 0 0 0 1 0"/></filter>` +
      `<filter id="${id}l" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.7 0"/></filter></defs>` +
      '<path class="hb-tail" d="M146 26c8 4 12 12 11 24h-6c0-10-3-16-9-19z"/>' +
      '<path class="hb-tail" d="M144 31c6 7 7 16 4 27l-6-2c3-9 2-16-3-21z"/>' +
      '<path class="hb-cloth" d="M4 22Q80 14 156 22v20Q80 34 4 42z"/>' +
      '<path class="hb-fold" d="M4 34Q80 26 156 34v8Q80 34 4 42z"/>' +
      '<path class="hb-seam" d="M6 25.5Q80 17.5 154 25.5M6 39Q80 31 154 39"/>' +
      '<rect class="hb-plate" x="36" y="10" width="88" height="42" rx="5"/>' +
      '<rect class="hb-hi" x="38" y="12" width="84" height="17" rx="4"/>' +
      '<rect class="hb-lo" x="38" y="36" width="84" height="14" rx="4"/>' +
      '<path class="hb-sheen" d="M60 12h15L55 50H40z"/>' +
      '<rect class="hb-bevel" x="39.5" y="13.5" width="81" height="35" rx="3.5"/>' +
      '<g class="hb-rivets"><circle cx="42" cy="16" r="1.8"/><circle cx="118" cy="16" r="1.8"/><circle cx="42" cy="46" r="1.8"/><circle cx="118" cy="46" r="1.8"/></g>' +
      `${logo('l', true)}${logo('d', false)}</svg>`
    );
  };

  return { RANKS, rank, dur, hours, num, pct, badge, headband, week };
})();
