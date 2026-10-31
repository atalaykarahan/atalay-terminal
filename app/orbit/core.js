import * as THREE from 'three';
import { TAU } from './util.js';

// The activity core of the old 2D map (tools/min with tool-mix, ok-rate and cache rings), drawn
// into canvas textures and shown face-on at the centre of the atom. A solid disc behind it writes
// depth, so sessions and orbits passing behind the core are hidden like behind a planet.
const S = 512, C = S / 2, RC = 118; // canvas size, core radius in canvas px
const k = RC / 55; // the 2D core radius was about 55 px

function canvas(size = S) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}
function texture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function buildCore(R, glowTex, radius) {
  const world = (S / RC) * radius;
  const group = new THREE.Group();
  const sprite = (map, opts = {}) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, ...opts }));
    s.scale.setScalar(world);
    group.add(s);
    return s;
  };

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0xf88008).multiplyScalar(1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.45 }));
  halo.scale.setScalar(radius * 3.4);
  group.add(halo);

  const oc = canvas(256), ox = oc.getContext('2d');
  ox.fillStyle = '#0d0805';
  ox.beginPath();
  ox.arc(128, 128, ((RC + 12 * k) / S) * 256, 0, TAU);
  ox.fill();
  const occluder = sprite(texture(oc), { transparent: false, depthWrite: true, alphaTest: 0.5 });

  const tc = canvas(), tx = tc.getContext('2d');
  tx.lineWidth = 2.4;
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * TAU, big = i % 5 === 0;
    tx.strokeStyle = big ? 'rgba(255,176,87,0.6)' : 'rgba(255,176,87,0.25)';
    tx.beginPath();
    tx.moveTo(C + Math.cos(a) * (RC + 13 * k), C + Math.sin(a) * (RC + 13 * k));
    tx.lineTo(C + Math.cos(a) * (RC + (big ? 21 : 16) * k), C + Math.sin(a) * (RC + (big ? 21 : 16) * k));
    tx.stroke();
  }
  const ticks = sprite(texture(tc), { blending: THREE.AdditiveBlending });

  const ac = canvas(), ax = ac.getContext('2d');
  ax.strokeStyle = 'rgba(157,107,255,0.7)';
  ax.lineWidth = 2.8;
  for (let j = 0; j < 3; j++) {
    ax.beginPath();
    ax.arc(C, C, RC + 27 * k, (j * TAU) / 3, (j * TAU) / 3 + 0.9);
    ax.stroke();
  }
  const arcs = sprite(texture(ac), { blending: THREE.AdditiveBlending });

  const bc = canvas(), bx = bc.getContext('2d');
  const bodyTex = texture(bc);
  sprite(bodyTex);

  const ring = (r, frac, col, rest, w, from = -Math.PI / 2) => {
    bx.lineWidth = w;
    bx.strokeStyle = rest;
    bx.beginPath();
    bx.arc(C, C, r, 0, TAU);
    bx.stroke();
    if (frac > 0) {
      bx.strokeStyle = col;
      bx.beginPath();
      bx.arc(C, C, r, from, from + Math.min(1, frac) * TAU);
      bx.stroke();
    }
  };
  let key = '';
  function draw(T, byCat, num) {
    const next = [T.tools, num.toFixed(1), T.okRate.toFixed(3), T.cacheHit.toFixed(2), R.CATS.map((c) => byCat[c] || 0)].join('|');
    if (next === key) return;
    key = next;
    bx.clearRect(0, 0, S, S);
    const g = bx.createRadialGradient(C, C, 0, C, C, RC - 16 * k);
    g.addColorStop(0, 'rgba(248,128,8,0.2)');
    g.addColorStop(1, 'rgba(248,128,8,0)');
    bx.fillStyle = g;
    bx.beginPath();
    bx.arc(C, C, RC - 16 * k, 0, TAU);
    bx.fill();

    const total = R.CATS.reduce((a, c) => a + (byCat[c] || 0), 0);
    bx.lineWidth = 6 * k;
    if (total) {
      let a0 = -Math.PI / 2;
      for (const c of R.CATS) {
        const v = byCat[c] || 0;
        if (!v) continue;
        const a1 = a0 + (v / total) * TAU;
        bx.strokeStyle = R.CAT[c].color;
        bx.beginPath();
        bx.arc(C, C, RC + 4 * k, a0 + 0.012, Math.max(a0 + 0.013, a1 - 0.012));
        bx.stroke();
        a0 = a1;
      }
    } else ring(RC + 4 * k, 0, '#000', 'rgba(255,255,255,0.06)', 6 * k);
    ring(RC - 6 * k, T.okRate, '#3dffa8', 'rgba(255,77,77,0.55)', 3 * k);
    ring(RC - 13 * k, T.cacheHit, '#f88008', 'rgba(255,255,255,0.08)', 3 * k);

    const small = Math.round(RC * 0.13);
    bx.textAlign = 'center';
    bx.textBaseline = 'alphabetic';
    bx.fillStyle = 'rgba(245,235,224,0.62)';
    bx.font = `${small}px ${R.FONT}`;
    bx.fillText(`${T.tools} calls today`, C, C - RC * 0.36);
    bx.fillStyle = '#fff8f0';
    bx.font = `700 ${Math.round(RC * 0.42)}px ${R.FONT}`;
    bx.fillText(num.toFixed(1), C, C + RC * 0.1);
    bx.fillStyle = 'rgba(255,176,87,0.92)';
    bx.font = `${small}px ${R.FONT}`;
    bx.fillText('TOOLS / MIN', C, C + RC * 0.3);
    bx.fillStyle = 'rgba(245,235,224,0.62)';
    bx.fillText(`ok ${(T.okRate * 100).toFixed(1)}% · cache ${(T.cacheHit * 100).toFixed(0)}%`, C, C + RC * 0.48);
    bodyTex.needsUpdate = true;
  }

  return {
    group,
    occluder,
    draw,
    update(now, heat) {
      ticks.material.rotation = -now / 14000;
      arcs.material.rotation = now / 6000;
      halo.material.opacity = 0.14 + 0.08 * (0.5 + 0.5 * Math.sin(now / 700)) + 0.12 * heat;
    },
  };
}
