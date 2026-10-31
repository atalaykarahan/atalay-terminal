import * as THREE from 'three';
import { TAU } from './util.js';

// Everything that glows is drawn additively with premultiplied colour, so overlaps brighten
// and the bloom pass picks them up.
const ADD = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true };

// Soft round points whose size is given in world units (shrinks with distance).
// Rebuilt every frame: begin(), add()…, end().
export class GlowPoints {
  constructor(capacity, map) {
    this.cap = capacity;
    this.n = 0;
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rgb', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.material = new THREE.ShaderMaterial({
      ...ADD,
      uniforms: { map: { value: map }, focal: { value: 600 } },
      vertexShader: /* glsl */ `
        attribute vec3 rgb;
        attribute float size;
        uniform float focal;
        varying vec3 vC;
        void main() {
          vC = rgb;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(size * focal / max(1.0, -mv.z), 0.0, 220.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        varying vec3 vC;
        void main() {
          float a = texture2D(map, gl_PointCoord).a;
          gl_FragColor = vec4(vC * a, a);
        }`,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
  }
  begin() {
    this.n = 0;
  }
  // colour as a THREE.Color (linear) times brightness.
  add(p, color, bright, size) {
    if (this.n >= this.cap || bright <= 0.002 || size <= 0) return;
    const i = this.n++;
    this.pos[i * 3] = p.x;
    this.pos[i * 3 + 1] = p.y;
    this.pos[i * 3 + 2] = p.z;
    this.col[i * 3] = color.r * bright;
    this.col[i * 3 + 1] = color.g * bright;
    this.col[i * 3 + 2] = color.b * bright;
    this.size[i] = size;
  }
  end() {
    const g = this.points.geometry;
    g.setDrawRange(0, this.n);
    for (const k of ['position', 'rgb', 'size']) {
      const a = g.attributes[k];
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.n * a.itemSize);
      a.needsUpdate = true;
    }
  }
}

// Thin additive line segments with per-vertex alpha and optional flowing dashes.
export class LineBatch {
  constructor(capacity) {
    this.cap = capacity;
    this.n = 0;
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 4);
    this.dist = new Float32Array(capacity);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('rgba', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('dist', new THREE.BufferAttribute(this.dist, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.material = new THREE.ShaderMaterial({
      ...ADD,
      uniforms: { time: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute vec4 rgba;
        attribute float dist;
        varying vec4 vC;
        varying float vD;
        void main() {
          vC = rgba;
          vD = dist;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float time;
        varying vec4 vC;
        varying float vD;
        void main() {
          if (vD >= 0.0 && fract((vD - time * 34.0) / 15.0) > 0.5) discard;
          gl_FragColor = vec4(vC.rgb * vC.a, vC.a);
        }`,
    });
    this.lines = new THREE.LineSegments(g, this.material);
    this.lines.frustumCulled = false;
  }
  begin() {
    this.n = 0;
  }
  vert(p, c, a, d) {
    const i = this.n++;
    this.pos[i * 3] = p.x;
    this.pos[i * 3 + 1] = p.y;
    this.pos[i * 3 + 2] = p.z;
    this.col[i * 4] = c.r;
    this.col[i * 4 + 1] = c.g;
    this.col[i * 4 + 2] = c.b;
    this.col[i * 4 + 3] = a;
    this.dist[i] = d;
  }
  // Polyline through pts; alpha(t) gives the alpha at fraction t; dashed lines flow from start to end.
  path(pts, color, alpha, dashed) {
    if (this.n + (pts.length - 1) * 2 > this.cap) return;
    let d = 0;
    const af = typeof alpha === 'function' ? alpha : () => alpha;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
      this.vert(a, color, af(i / (pts.length - 1)), dashed ? d : -1);
      this.vert(b, color, af((i + 1) / (pts.length - 1)), dashed ? d + len : -1);
      d += len;
    }
  }
  // Circle around c in the plane spanned by axes u, v (unit vectors).
  circle(c, radius, u, v, color, alpha, segments = 48) {
    if (this.n + segments * 2 > this.cap || alpha <= 0.002) return;
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * TAU, a1 = ((i + 1) / segments) * TAU;
      _p.copy(c).addScaledVector(u, Math.cos(a0) * radius).addScaledVector(v, Math.sin(a0) * radius);
      this.vert(_p, color, alpha, -1);
      _p.copy(c).addScaledVector(u, Math.cos(a1) * radius).addScaledVector(v, Math.sin(a1) * radius);
      this.vert(_p, color, alpha, -1);
    }
  }
  end() {
    const g = this.lines.geometry;
    g.setDrawRange(0, this.n);
    for (const k of ['position', 'rgba', 'dist']) {
      const a = g.attributes[k];
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.n * a.itemSize);
      a.needsUpdate = true;
    }
  }
}
const _p = new THREE.Vector3();

// A ring drawn analytically on a quad: crisp at any zoom, with an optional bright "head"
// that fades behind it (the ship's position on its orbit) and optional moving dashes.
export const QUAD = new THREE.PlaneGeometry(2, 2);
export function ringMaterial(opts = {}) {
  return new THREE.ShaderMaterial({
    ...ADD,
    side: THREE.DoubleSide,
    uniforms: {
      color: { value: new THREE.Color(opts.color ?? 0xffffff) },
      opacity: { value: opts.opacity ?? 1 },
      scale: { value: 1 },
      rIn: { value: 0.9 },
      rOut: { value: 1 },
      glow: { value: opts.glow ?? 0 },
      head: { value: -100 },
      tail: { value: 1.4 },
      tailFloor: { value: opts.floor ?? 0.14 },
      dashes: { value: opts.dashes ?? 0 },
      dashSpeed: { value: opts.dashSpeed ?? 0 },
      time: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float scale;
      varying vec2 vP;
      void main() {
        vP = position.xy * scale;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float opacity, rIn, rOut, glow, head, tail, tailFloor, dashes, dashSpeed, time;
      varying vec2 vP;
      void main() {
        float r = length(vP);
        float aa = fwidth(r) * 1.25;
        float m = smoothstep(rIn - aa, rIn + aa, r) * (1.0 - smoothstep(rOut - aa, rOut + aa, r));
        if (glow > 0.0) {
          float mid = 0.5 * (rIn + rOut), hw = 0.5 * (rOut - rIn);
          m = max(m, exp(-max(abs(r - mid) - hw, 0.0) / glow) * 0.32);
        }
        float ang = atan(vP.y, vP.x);
        float k = 1.0;
        if (head > -50.0) {
          float d = mod(head - ang, 6.2831853);
          k = mix(tailFloor, 1.0, exp(-d / tail));
        }
        if (dashes > 0.0) k *= step(fract(ang / 6.2831853 * dashes - time * dashSpeed), 0.5);
        float a = m * k * opacity;
        if (a < 0.002) discard;
        gl_FragColor = vec4(color * a, a);
      }`,
  });
}

// Sets a ring material's geometry: radius r (world units), width w, on a quad of half-size s.
export function setRing(mesh, r, w, pad = 6) {
  const s = r + w + pad;
  mesh.scale.setScalar(s);
  const u = mesh.material.uniforms;
  u.scale.value = s;
  u.rIn.value = r - w / 2;
  u.rOut.value = r + w / 2;
}
