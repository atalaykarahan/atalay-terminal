import * as THREE from 'three';
import { GlowPoints } from './batch.js';
import { rng, TAU } from './util.js';

const ADD = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true };

// Distant twinkling stars on a sphere around everything: warm ones, white ones and a few blue ones. The warm and the
// white take the theme's hue (paint()); the blue stay blue.
const STAR = { warm: [1, 0.72, 0.45], blue: [0.62, 0.78, 1], white: [1, 0.95, 0.88] };
function stars(count, rMin, rMax, seed) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count), phase = new Float32Array(count);
  const kind = [], bright = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const th = r() * TAU, u = r() * 2 - 1;
    const s = Math.sqrt(1 - u * u), d = rMin + r() * (rMax - rMin);
    pos.set([Math.cos(th) * s * d, u * d, Math.sin(th) * s * d], i * 3);
    const t = r();
    kind[i] = t < 0.14 ? 'warm' : t < 0.28 ? 'blue' : 'white';
    bright[i] = 0.3 + Math.pow(r(), 3) * 1.4;
    size[i] = 0.8 + Math.pow(r(), 5) * 2.2;
    phase[i] = r() * TAU;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('rgb', new THREE.BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  const m = new THREE.ShaderMaterial({
    ...ADD,
    uniforms: { time: { value: 0 }, dpr: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 rgb;
      attribute float size;
      attribute float phase;
      uniform float time, dpr;
      varying vec3 vC;
      void main() {
        vC = rgb * (0.72 + 0.28 * sin(time * 1.6 + phase * 9.0));
        gl_PointSize = size * dpr;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vC;
      void main() {
        float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(vC * a, a);
      }`,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  const c = new THREE.Color();
  p.paint = (theme) => {
    const of = {};
    for (const k in STAR) of[k] = k === 'blue' ? STAR[k] : theme.tint(c.setRGB(...STAR[k])).toArray();
    for (let i = 0; i < count; i++) {
      const o = of[kind[i]], b = bright[i];
      col.set([o[0] * b, o[1] * b, o[2] * b], i * 3);
    }
    g.attributes.rgb.needsUpdate = true;
  };
  return p;
}

export function buildBackdrop(glow, theme) {
  const group = new THREE.Group();
  const far = stars(3200, 3000, 4600, 7);
  group.add(far);

  // Fine dust close to the system: strong parallax when the view rotates. Warm, in the theme's hue (paint()).
  const dust = new GlowPoints(700, glow);
  const grains = [], r = rng(29);
  for (let i = 0; i < 700; i++) {
    const rad = 80 + Math.pow(r(), 0.7) * 900, a = r() * TAU;
    const v = new THREE.Vector3(Math.cos(a) * rad, (r() - 0.5) * (60 + rad * 0.6), Math.sin(a) * rad);
    const c = new THREE.Color().setHSL(0.08 + r() * 0.05, 0.5, 0.7 + r() * 0.25);
    grains.push({ v, c, bright: 0.12 + r() * 0.3, size: 1 + r() * 1.8 });
  }
  group.add(dust.points);

  function paint(theme) {
    far.paint(theme);
    dust.begin();
    for (const d of grains) dust.add(d.v, theme.tint(d.c), d.bright, d.size);
    dust.end();
  }
  paint(theme);

  return {
    group,
    paint,
    update(now, dt, dpr) {
      far.material.uniforms.time.value = now / 1000;
      far.material.uniforms.dpr.value = dpr;
      dust.points.rotation.y += dt * 0.006;
    },
  };
}
