import * as THREE from 'three';
import { GlowPoints } from './batch.js';
import { rng, TAU } from './util.js';

const ADD = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true };

// Distant twinkling stars on a sphere around everything.
function stars(count, rMin, rMax, seed) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), size = new Float32Array(count), phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const th = r() * TAU, u = r() * 2 - 1;
    const s = Math.sqrt(1 - u * u), d = rMin + r() * (rMax - rMin);
    pos.set([Math.cos(th) * s * d, u * d, Math.sin(th) * s * d], i * 3);
    const t = r();
    const c = t < 0.14 ? [1, 0.72, 0.45] : t < 0.28 ? [0.62, 0.78, 1] : [1, 0.95, 0.88];
    const b = 0.3 + Math.pow(r(), 3) * 1.4;
    col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
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
  return p;
}

export function buildBackdrop(glow) {
  const group = new THREE.Group();
  const far = stars(3200, 3000, 4600, 7);
  group.add(far);

  // Fine dust close to the system: strong parallax when the view rotates.
  const dust = new GlowPoints(700, glow);
  const r = rng(29), c = new THREE.Color(), v = new THREE.Vector3();
  for (let i = 0; i < 700; i++) {
    const rad = 80 + Math.pow(r(), 0.7) * 900, a = r() * TAU;
    v.set(Math.cos(a) * rad, (r() - 0.5) * (60 + rad * 0.6), Math.sin(a) * rad);
    c.setHSL(0.08 + r() * 0.05, 0.5, 0.7 + r() * 0.25);
    dust.add(v, c, 0.12 + r() * 0.3, 1 + r() * 1.8);
  }
  dust.end();
  group.add(dust.points);

  return {
    group,
    update(now, dt, dpr) {
      far.material.uniforms.time.value = now / 1000;
      far.material.uniforms.dpr.value = dpr;
      dust.points.rotation.y += dt * 0.006;
    },
  };
}
