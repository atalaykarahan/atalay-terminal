import * as THREE from 'three';

// The theme's colours on the map. The map was drawn in the default theme's orange; that orange now comes from the
// theme the app shows (Themes.swift's tokens on #mapwrap): its accent where it was the accent, its text colours where
// they were the text's, and every warm tint around them (the lights, the dust, the warm stars) turned to the accent's
// hue. The tool, status and session colours stay the map's own (app.js). Where the tokens are the default theme's
// (Windows sets them again on #mapwrap), the map looks as it always did.
const SRGB = THREE.SRGBColorSpace;
const DEFAULT = { accent: '#f88008', 'accent-soft': '#ffb057', txt: '#f5ebe0', txt2: '#d9c3a8', hi: '#fff8f0', 'deep-rgb': '5, 3, 2' };
const BASE = new THREE.Color(DEFAULT.accent).getHSL({}, SRGB);

// rgba() for a canvas or a style, from a THREE.Color.
export function rgba(c, a = 1) {
  const n = c.getHex();
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

export function readTheme() {
  const css = getComputedStyle(document.getElementById('mapwrap') || document.documentElement);
  const tok = (k) => css.getPropertyValue(`--${k}`).trim() || DEFAULT[k];
  const col = (k) => new THREE.Color().setStyle(k.endsWith('-rgb') ? `rgb(${tok(k)})` : tok(k));
  const accent = col('accent');
  const a = accent.getHSL({}, SRGB);
  const turn = a.h - BASE.h, sat = BASE.s ? a.s / BASE.s : 1;
  return {
    key: Object.keys(DEFAULT).map(tok).join('|'),
    accent,
    soft: col('accent-soft'),
    txt: col('txt'),
    txt2: col('txt2'),
    hi: col('hi'),
    // the space behind everything: the theme's deepest shade, darker still
    bg: col('deep-rgb').multiplyScalar(0.6),
    // A warm colour of the default theme's in the accent's hue: turned as far as the accent is from the default one,
    // as saturated as the accent is next to it, and as light as it was. Hex, CSS or a THREE.Color in; a new one out.
    tint(color) {
      const c = new THREE.Color(color);
      const h = c.getHSL({}, SRGB);
      return c.setHSL((((h.h + turn) % 1) + 1) % 1, Math.min(1, h.s * sat), h.l, SRGB);
    },
  };
}
