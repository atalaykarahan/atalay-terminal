import * as THREE from 'three';
import { TAU } from './util.js';

// The session hexagon of the dashboard (same look as the old 2D map), drawn into canvas
// textures that are shown as camera-facing sprites.
export const ICON = { size: 256, hex: 82 };

function hexPath(x, cx, cy, r) {
  x.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 3;
    const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
    if (k) x.lineTo(px, py);
    else x.moveTo(px, py);
  }
  x.closePath();
}

function texture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class SessionIcon {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = ICON.size;
    this.x = this.canvas.getContext('2d');
    this.texture = texture(this.canvas);
    this.key = '';
  }
  // R: shared helpers from app.js; s: session; hue: session colour (css string)
  draw(R, s, hue) {
    const st = R.STATUS[s.status] || R.STATUS.busy;
    const pct = s.ctxMax ? Math.min(1, s.ctx / s.ctxMax) : 0;
    const name = R.clipT(s.name, 11);
    const label = s.status === 'waiting' ? '! ' + st.label : st.label;
    const key = [name, label, st.color, pct.toFixed(3), hue].join('|');
    if (key === this.key) return;
    this.key = key;
    const x = this.x, c = ICON.size / 2, r = ICON.hex;
    x.clearRect(0, 0, ICON.size, ICON.size);
    // context window usage ring
    x.lineWidth = 8;
    x.strokeStyle = 'rgba(255,255,255,0.08)';
    x.beginPath();
    x.arc(c, c, r + 25, 0, TAU);
    x.stroke();
    if (pct > 0) {
      x.strokeStyle = R.ctxColor(pct);
      x.beginPath();
      x.arc(c, c, r + 25, -Math.PI / 2, -Math.PI / 2 + pct * TAU);
      x.stroke();
    }
    hexPath(x, c, c, r);
    x.fillStyle = 'rgba(18,10,4,0.96)';
    x.fill();
    x.lineWidth = 7;
    x.strokeStyle = st.color;
    x.stroke();
    hexPath(x, c, c, r * 0.74);
    x.lineWidth = 3.5;
    x.strokeStyle = R.hexA(hue, 0.6);
    x.stroke();
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    let fs = 31;
    x.font = `700 ${fs}px ${R.FONT}`;
    while (fs > 16 && x.measureText(name).width > r * 1.62) x.font = `700 ${--fs}px ${R.FONT}`;
    x.fillStyle = '#fff8f0';
    x.fillText(name, c, c - r * 0.13);
    let ls = 21;
    x.font = `${ls}px ${R.FONT}`;
    while (ls > 12 && x.measureText(label).width > r * 1.62) x.font = `${--ls}px ${R.FONT}`;
    x.fillStyle = st.color;
    x.fillText(label, c, c + r * 0.31);
    this.texture.needsUpdate = true;
  }
  dispose() {
    this.texture.dispose();
  }
}

// Soft white hexagon outline; tinted and drawn additively behind an icon as its glow.
export function hexGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = ICON.size;
  const x = c.getContext('2d'), m = ICON.size / 2;
  x.strokeStyle = '#fff';
  x.shadowColor = '#fff';
  x.lineWidth = 10;
  for (const blur of [34, 18, 8]) {
    x.shadowBlur = blur;
    hexPath(x, m, m, ICON.hex);
    x.stroke();
  }
  return texture(c);
}

// Subagent hexagons (small, violet): running and finished variants.
export function droneTextures() {
  const make = (running) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d'), m = 64, r = 40;
    hexPath(x, m, m, r);
    x.fillStyle = running ? 'rgba(12,7,26,0.95)' : 'rgba(12,8,6,0.9)';
    x.fill();
    x.lineWidth = 6;
    x.strokeStyle = running ? '#9d6bff' : '#5c4d40';
    x.stroke();
    if (!running) {
      x.fillStyle = '#3dffa8';
      x.font = '700 40px "SF Mono", Menlo, monospace';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('✓', m, m + 2);
    } else {
      hexPath(x, m, m, r * 0.55);
      x.fillStyle = 'rgba(157,107,255,0.55)';
      x.fill();
    }
    return texture(c);
  };
  return { running: make(true), done: make(false) };
}
