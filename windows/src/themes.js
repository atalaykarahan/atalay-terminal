'use strict';
// The themes, as the Mac app has them (Themes.swift): the list is the dashboard's themes/themes.json (the default first),
// a theme is a terminal palette and an accent, and every colour token the pages use is made from those; the default
// theme lists its own exact values. The pages get the tokens as a style sheet the preload inserts before they draw and
// replaces when the theme changes; the orbit map keeps the default theme's colours.
const fs = require('fs');
const path = require('path');

// The fonts the interface can take (Settings), as the Mac's ThemeStore.uiFonts: its own monospace, or one some read more
// easily; and how large the dashboard draws, for text too small to read.
const UI_FONTS = [
  { id: 'mono', name: 'mono', css: null },
  { id: 'system', name: 'system', css: '"Segoe UI", -apple-system, system-ui, sans-serif' },
  { id: 'rounded', name: 'rounded', css: '"Segoe UI Variable Display", "Segoe UI", ui-rounded, system-ui, sans-serif' },
];
const UI_SCALES = [1, 1.1, 1.25, 1.4];
const FALLBACK_ANSI = ['#562f18', '#ff4d4d', '#c5e35a', '#ffd23f', '#c16100', '#e0849c', '#ff7345', '#ffb27a',
  '#7d6553', '#ff5c8a', '#ddf08f', '#ffe28a', '#f88008', '#ffa8c4', '#ff9b73', '#fff3e6'];

/**
 * `webDir`: the dashboard's web folder; `settings`: { get(key), set(key, value) }, where the chosen theme is kept;
 * `onChange(css)`: the theme the app shows changed (a preview, a choice, back to the chosen one, the interface's font);
 * `onScale(factor)`: the interface's size changed (the dashboard's zoom).
 */
function createThemes({ webDir, settings, onChange, onScale }) {
  let list = [];
  try {
    list = JSON.parse(fs.readFileSync(path.join(webDir, 'themes', 'themes.json'), 'utf8'));
  } catch (e) {
    console.error('themes: themes.json unreadable, default colours only', e.message);
  }
  if (!list.length) {
    list = [{ id: 'atalay', name: 'Atalay', bg: '#251200', fg: '#f5ebe0', cursor: '#f88008', selection: '#f88008', accent: '#f88008', ansi: FALLBACK_ANSI }];
  }
  const made = new Map();
  const tokens = (spec) => {
    if (!made.has(spec.id)) made.set(spec.id, { ...derive(spec), ...(spec.ui || {}) });
    return made.get(spec.id);
  };
  const chosenId = () => (list.find((t) => t.id === settings.get('theme')) || list[0]).id;
  const uiFont = () => (UI_FONTS.find((f) => f.id === settings.get('uiFont')) || UI_FONTS[0]);
  const uiScale = () => (UI_SCALES.includes(settings.get('uiScale')) ? settings.get('uiScale') : 1);
  const uiJSON = () => ({ font: uiFont().id, scale: uiScale(), fonts: UI_FONTS.map(({ id, name }) => ({ id, name })), scales: UI_SCALES });
  let current = list.find((t) => t.id === chosenId());

  // Every token on the page's root (above style.css's defaults), and the default theme's again on the orbit map: the
  // tokens made from others are made there again from the default ones, its text colour is set again rather than
  // inherited, and the page's background, which shows through it, is painted under it.
  const css = () => {
    const decl = (t) => Object.keys(t).sort().map((k) => `${k}:${t[k]};`).join('');
    return `:root:root{${decl(tokens(current))}}#mapwrap#mapwrap{${decl(tokens(list[0]))}` +
      '--panel:rgba(var(--panel-rgb),var(--glass-a));--line:rgba(var(--accent-rgb),0.32);--line-soft:rgba(var(--accent-rgb),0.13);' +
      'color:var(--txt);background:linear-gradient(rgba(var(--bg-rgb),0.6),rgba(var(--bg-rgb),0.6)),' +
      'radial-gradient(ellipse at 50% 40%,var(--bloom) 0%,var(--bg) 70%) fixed}' +
      // A neon theme's text glows in its own colour (SynthWave '84's "Neon Dreams" in VS Code), as on the Mac; the
      // terminal draws on a canvas, so its text blooms through terminal.html's filter instead.
      (current.glow ? 'body{text-shadow:0 0 1px rgba(255,255,255,0.3),0 0 5px currentColor,0 0 12px rgba(var(--accent-rgb),0.5)}' +
        '.xterm-screen canvas{filter:url(#atl-neon)}' : '') +
      (uiFont().css ? `:root:root{--font:${uiFont().css}}` : '');
  };

  const show = (id) => {
    const spec = list.find((t) => t.id === id);
    if (!spec || spec.id === current.id) return;
    current = spec;
    onChange(css());
  };

  return {
    list,
    chosenId,
    current: () => current,
    tokens,
    css,
    /** A colour the windows' own chrome needs ("#rrggbb"). */
    color: (token) => tokens(current)[token] || '#ff00ff',
    preview: show,
    choose(id) {
      if (!list.some((t) => t.id === id)) return;
      settings.set('theme', id);
      show(id);
    },
    revert: () => show(chosenId()),
    uiScale,
    /** The page's "theme" handler (cloud.js): the list with every theme's colours, a preview, a choice, back. */
    handle(body) {
      switch (body && body.type) {
        case 'list':
          return { themes: list.map((t) => ({ id: t.id, name: t.name, tokens: tokens(t) })), chosen: chosenId(), current: current.id };
        case 'preview': show(body.id); return true;
        case 'choose': this.choose(body.id); return true;
        case 'revert': show(chosenId()); return true;
        // Settings' interface font and text size.
        case 'ui': return uiJSON();
        case 'setUI':
          if (UI_FONTS.some((f) => f.id === body.font)) settings.set('uiFont', body.font);
          if (UI_SCALES.includes(body.scale)) settings.set('uiScale', body.scale);
          onChange(css());
          if (onScale) onScale(uiScale());
          return uiJSON();
        default: return { error: 'unknown request' };
      }
    },
  };
}

/**
 * Every token from the palette, as Warp makes its whole look from a few colours: the surfaces are the terminal's
 * background darkened, the text's shades lie between its text and background, the meaning colours (red, green, amber,
 * cyan…) are its ANSI colours, and the lines, highlights and buttons are the accent.
 */
function derive(s) {
  const black = rgb(0, 0, 0), white = rgb(1, 1, 1);
  const T = parse(s.bg) || black, F = parse(s.fg) || white, A = parse(s.accent) || white;
  const N = Array.from({ length: 16 }, (_, i) => (i < (s.ansi || []).length && parse(s.ansi[i])) || F);
  const same = (a, b) => distance(lab(a), lab(b)) < 0.04;
  // A bright colour that is only a grey (Solarized's are its greys), or the same as the normal one, is the normal one
  // lightened.
  const bright = (i) => {
    const n = N[i], b = N[i + 8];
    return chroma(lab(b)) < chroma(lab(n)) * 0.5 || same(n, b) ? mix(n, white, 0.18) : b;
  };
  const t = {};
  t.bg = mix(T, black, 0.45);
  t.deep = mix(T, black, 0.8);
  t.surface = mix(T, black, 0.32);
  t.panel = mix(T, black, 0.18);
  t['glass-top'] = mix(T, A, 0.12);
  t.bloom = mix(T, black, 0.12);
  t.accent = A;
  t['accent-soft'] = mix(A, white, 0.35);
  t['accent-pale'] = mix(A, white, 0.65);
  t.txt = F;
  t.hi = mix(F, white, 0.5);
  t.title = mix(F, white, 0.25);
  t.txt2 = mix(F, T, 0.15);
  t.txt3 = mix(F, T, 0.3);
  t.dim = mix(F, T, 0.45);
  t.faint = mix(F, T, 0.58);
  t.dim2 = mix(F, T, 0.72);
  const dark = mix(T, black, 0.6), light = mix(F, white, 0.6);
  t.ink = contrast(A, dark) >= contrast(A, light) ? dark : light;
  t.red = N[1];
  t['red-soft'] = mix(N[1], white, 0.35);
  t.warn = same(N[1], bright(1)) ? mix(N[1], N[5], 0.3) : bright(1);
  t.green = N[2];
  t.amber = N[3];
  t.blue = N[4];
  t.violet = N[5];
  // "Your turn" must not look like "working" (the accent): with an accent of the cyan's hue it goes green.
  t.cyan = hueDistance(lab(A), lab(N[6])) < 30 ? N[2] : N[6];
  t.lime = same(N[2], bright(2)) ? mix(N[2], N[3], 0.4) : bright(2);
  t.sky = same(N[4], bright(4)) ? mix(N[4], N[6], 0.5) : bright(4);
  t.magenta = same(N[5], bright(5)) ? mix(N[5], N[1], 0.3) : bright(5);
  t.orange = mix(N[1], N[3], 0.5);
  t.lavender = mix(N[5], F, 0.5);
  t['idle-deep'] = mix(t.bg, t.cyan, 0.08);
  t.ended = mix(F, T, 0.62);
  t['ended-deep'] = mix(t.dim2, t.bg, 0.6);
  ['accent-soft', 'cyan', 'violet', 'green', 'orange', 'blue', 'amber', 'lime', 'magenta', 'txt'].forEach((k, i) => (t[`hue${i}`] = t[k]));
  t['code-bg'] = T;
  t['code-fg'] = F;
  t['code-cursor'] = parse(s.cursor) || F;
  const sel = parse(s.selection) || A;
  t.selection = sel;
  t['selection-text'] = luminance(sel) > 0.4 ? T : F;
  t['caret-text'] = T;
  for (let i = 0; i < 16; i++) t[`a${i}`] = N[i];

  const onlyRGB = new Set(['deep', 'surface', 'panel', 'glass-top']);
  const alsoRGB = new Set(['bg', 'accent', 'accent-soft', 'violet', 'cyan', 'warn', 'amber', 'red', 'green', 'dim2', 'ink']);
  const out = {};
  for (const [k, c] of Object.entries(t)) {
    if (!onlyRGB.has(k)) out[`--${k}`] = hex(c);
    if (onlyRGB.has(k) || alsoRGB.has(k)) out[`--${k}-rgb`] = triplet(c);
  }
  return out;
}

// ---------- colour arithmetic (sRGB, mixed in Oklab so the steps look even) ----------
const rgb = (r, g, b) => ({ r, g, b });
const byte = (v) => Math.round(Math.min(1, Math.max(0, Number.isNaN(v) ? 0 : v)) * 255);
const hex = (c) => `#${[c.r, c.g, c.b].map((v) => byte(v).toString(16).padStart(2, '0')).join('')}`;
const triplet = (c) => `${byte(c.r)}, ${byte(c.g)}, ${byte(c.b)}`;
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const luminance = (c) => 0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
const contrast = (x, y) => {
  const [a, b] = [luminance(x), luminance(y)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

function lab(c) {
  const [lr, lg, lb] = [linear(c.r), linear(c.g), linear(c.b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function fromLab({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return rgb(gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s));
}

/** `k` of the way from colour `x` to `y`. */
function mix(x, y, k) {
  const [p, q] = [lab(x), lab(y)];
  return fromLab({ L: p.L + (q.L - p.L) * k, a: p.a + (q.a - p.a) * k, b: p.b + (q.b - p.b) * k });
}

const chroma = (p) => Math.hypot(p.a, p.b);
const distance = (p, q) => Math.sqrt((p.L - q.L) ** 2 + (p.a - q.a) ** 2 + (p.b - q.b) ** 2);
/** Degrees between two hues, 180 when either is a grey. */
function hueDistance(p, q) {
  if (chroma(p) <= 0.03 || chroma(q) <= 0.03) return 180;
  const d = (Math.abs(Math.atan2(p.b, p.a) - Math.atan2(q.b, q.a)) * 180) / Math.PI;
  return d > 180 ? 360 - d : d;
}

/** "#rrggbb" or "r, g, b". */
function parse(v) {
  const s = String(v || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) {
    const n = parseInt(s.slice(1), 16);
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  }
  const parts = s.split(',').map((x) => Number(x.trim()));
  return parts.length === 3 && parts.every((x) => Number.isFinite(x)) ? rgb(parts[0] / 255, parts[1] / 255, parts[2] / 255) : null;
}

module.exports = { createThemes, derive };
