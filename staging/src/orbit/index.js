// 3D orbit map: the centre of the dashboard. Every Claude Code session is a hexagon circling the
// activity core like an electron, each on its own tilted orbit, so from afar the middle reads as
// an atom. Tool calls fly as bolts to the tool stations on the outer ring. A session that waits
// for the user (your turn / needs you) leaves its orbit and parks at the edge of the view.
// Sessions can be grabbed and thrown around; released, they fly back home. Plain terminals (a shell, often a dev
// server) are flying cars on their own lane between the sessions and the stations; one with nothing running parks at
// the edge of the view too.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GlowPoints, LineBatch, QUAD, ringMaterial, setRing } from './batch.js';
import { droneTextures, hexGlowTexture, ICON, SessionIcon } from './icons.js';
import { buildCore } from './core.js';
import { buildRoadster, buildStation, CAR_LENGTH, carStudio } from './models.js';
import { buildBackdrop } from './space.js';
import { glowTexture } from './textures.js';
import { clamp, damp, easeInOut, easeOut, el, lerp, setText, TAU } from './util.js';

const R = window.RADAR;
const { CAT, CATS, STATUS } = R;

const K = {
  CORE_R: 60, // the activity gauge in the middle (2D map style), the "nucleus" of the atom
  HEX: 34, // hexagon radius of a session icon in world units
  ATOM_R: 150, // innermost electron orbit
  ATOM_STEP: 15,
  TILT: 1.2, // how far each orbit plane leans out of the screen plane
  STATION_R: 390,
  PARK_HEX_PX: 27, // on-screen hexagon radius of a parked session
  PARK_CAR_PX: 86, // on-screen length of a parked car
  POLAR: 1.08, // default camera angle from straight above
};
const ICON_W = (ICON.size / ICON.hex) * K.HEX;
const DRONE_HEX = 13;
const UP = new THREE.Vector3(0, 1, 0);
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const WHITE = new THREE.Color(1, 1, 1);
const VIOLET = new THREE.Color('#9d6bff');
const tmp = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), p: new THREE.Vector3(), m: new THREE.Matrix4() };
const colorOf = (hex) => new THREE.Color(hex);

// ---------- renderer, camera, controls ----------
const host = document.getElementById('space');
const glowTex = glowTexture();
const hexGlow = hexGlowTexture();
const DRONE_TEX = droneTextures();

// No MSAA: the scene renders into the composer's targets, so antialias only cost memory. Full Retina
// resolution: at 1.5x the thin lines and names of the session hexagons flickered in the glow as they moved.
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.05;
host.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.sortObjects = false; // skips rewriting every label's z-index on every frame
labels.domElement.className = 'labels';
host.appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030201);
const camera = new THREE.PerspectiveCamera(40, 1, 2, 12000);

scene.add(new THREE.AmbientLight(0x8a7766, 0.75));
scene.add(new THREE.PointLight(0xffa04a, 4.2, 0, 0));
const rimLight = new THREE.DirectionalLight(0x7f9fff, 1.2);
rimLight.position.set(-400, 500, -600);
scene.add(rimLight);
const keyLight = new THREE.DirectionalLight(0xffe2c0, 0.55);
keyLight.position.set(300, 600, 500);
scene.add(keyLight);

const backdrop = buildBackdrop(glowTex);
scene.add(backdrop.group);
const core = buildCore(R, glowTex, K.CORE_R);
scene.add(core.group);
const glow = new GlowPoints(8000, glowTex);
const lines = new LineBatch(40000);
scene.add(lines.lines, glow.points);

const controls = new OrbitControls(camera, host);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 1.1;
controls.panSpeed = 0.9;
controls.screenSpacePanning = true;
controls.zoomToCursor = true;
controls.minDistance = 110;
controls.maxDistance = 2600;
controls.minPolarAngle = 0.06;
controls.maxPolarAngle = Math.PI - 0.06;
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.62, 0.45, 0.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const SIZE = { w: 0, h: 0, dpr: 1 };
const CAM = { right: new THREE.Vector3(), up: new THREE.Vector3(), fwd: new THREE.Vector3(), dist: 1, focal: 1, fit: 800 };
let viewReady = false;

function resize() {
  const w = Math.max(200, host.clientWidth), h = Math.max(160, host.clientHeight);
  if (w === SIZE.w && h === SIZE.h) return;
  SIZE.w = w;
  SIZE.h = h;
  SIZE.dpr = renderer.getPixelRatio();
  renderer.setSize(w, h, false);
  composer.setPixelRatio(SIZE.dpr);
  // Also sizes the bloom, which already works at half resolution. Don't shrink it further: its bright
  // pass then skips pixels, and thin moving lines (the session hexagons) flicker in and out of the glow.
  composer.setSize(w, h);
  labels.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  CAM.fit = fitDistance();
  if (!viewReady) {
    viewReady = true;
    intro();
  }
}
new ResizeObserver(resize).observe(host);

function fitDistance() {
  const vf = THREE.MathUtils.degToRad(camera.fov / 2);
  const hf = Math.atan(Math.tan(vf) * camera.aspect);
  const dH = (K.STATION_R + 30) / (Math.tan(hf) * 0.74); // keep the side margins free for parked sessions
  const dV = (K.ATOM_R + 3 * K.ATOM_STEP + K.HEX + 30) / (Math.tan(vf) * 0.86);
  return clamp(Math.max(dH, dV), 320, 2200);
}
const viewAt = (dist, polar = K.POLAR, az = 0) => new THREE.Vector3().setFromSphericalCoords(dist, polar, az);

let camAnim = null;
function flyCamera(target, pos, ms) {
  camAnim = { t0: performance.now(), ms, fromT: controls.target.clone(), toT: target.clone(), fromP: camera.position.clone(), toP: pos.clone() };
  wake();
}
function resetView() {
  follow = null;
  flyCamera(new THREE.Vector3(), viewAt(CAM.fit), 1100);
}
function intro() {
  camera.position.copy(viewAt(CAM.fit * 2.4, 0.5, -0.9));
  controls.target.set(0, 0, 0);
  controls.update();
  flyCamera(new THREE.Vector3(), viewAt(CAM.fit), 2600);
}
controls.addEventListener('start', () => {
  camAnim = null;
  follow = null;
  R.hideTip();
});
controls.addEventListener('change', () => poke());

const _sa = new THREE.Spherical(), _sb = new THREE.Spherical(), _sc = new THREE.Spherical();
function stepCamera(now) {
  if (!camAnim) return;
  const u = clamp((now - camAnim.t0) / camAnim.ms, 0, 1), e = easeInOut(u);
  controls.target.lerpVectors(camAnim.fromT, camAnim.toT, e);
  // swing around in spherical coordinates instead of cutting straight through the scene
  _sa.setFromVector3(tmp.a.copy(camAnim.fromP).sub(camAnim.fromT));
  _sb.setFromVector3(tmp.b.copy(camAnim.toP).sub(camAnim.toT));
  let dTheta = _sb.theta - _sa.theta;
  if (dTheta > Math.PI) dTheta -= TAU;
  if (dTheta < -Math.PI) dTheta += TAU;
  _sc.set(lerp(_sa.radius, _sb.radius, e), lerp(_sa.phi, _sb.phi, e), _sa.theta + dTheta * e);
  camera.position.setFromSpherical(_sc).add(controls.target);
  if (u >= 1) camAnim = null;
}

function updateCamBasis() {
  camera.updateMatrixWorld();
  const e = camera.matrixWorld.elements;
  CAM.right.set(e[0], e[1], e[2]).normalize();
  CAM.up.set(e[4], e[5], e[6]).normalize();
  CAM.fwd.set(-e[8], -e[9], -e[10]).normalize();
  CAM.dist = camera.position.distanceTo(controls.target);
  CAM.focal = SIZE.h / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
}

function clampPan() {
  const t = controls.target, max = 700, l = t.length();
  if (l <= max) return;
  tmp.a.copy(t).multiplyScalar(max / l).sub(t);
  t.add(tmp.a);
  camera.position.add(tmp.a);
}

const _proj = new THREE.Vector3();
function toScreen(p, out) {
  _proj.copy(p).project(camera);
  out.x = (_proj.x * 0.5 + 0.5) * SIZE.w;
  out.y = (-_proj.y * 0.5 + 0.5) * SIZE.h;
  out.z = _proj.z;
  return out;
}
function pxPerUnit(p) {
  const d = tmp.d.copy(p).sub(camera.position).dot(CAM.fwd);
  return d > 1 ? CAM.focal / d : 0;
}

// ---------- atom orbits ----------
// Orbit planes are laid out against the default view, so from there they cross like the classic
// atom symbol: plane k of n is turned k·180°/n in the screen plane and leans TILT out of it.
const VIEW0 = (() => {
  const fwd = new THREE.Vector3().setFromSphericalCoords(1, K.POLAR, 0).negate();
  const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  return { fwd, right, up };
})();
function atomQuat(phi, out) {
  const u = tmp.a.copy(VIEW0.right).multiplyScalar(Math.cos(phi)).addScaledVector(VIEW0.up, Math.sin(phi));
  const w = tmp.b.copy(VIEW0.right).multiplyScalar(-Math.sin(phi)).addScaledVector(VIEW0.up, Math.cos(phi));
  w.multiplyScalar(Math.cos(K.TILT)).addScaledVector(VIEW0.fwd, Math.sin(K.TILT)).normalize();
  const n = tmp.c.crossVectors(u, w).normalize();
  tmp.m.makeBasis(u, w, n);
  return out.setFromRotationMatrix(tmp.m);
}

// ---------- parking spots at the edges of the view ----------
function slotNDC(i) {
  const mx = clamp(1 - 62 / (SIZE.w / 2), 0.7, 0.92);
  const rows = [0.58, 0.22, -0.14, -0.48];
  if (i < 8) return { x: (i % 2 ? 1 : -1) * mx, y: rows[i >> 1] };
  const j = i - 8, xs = [-0.3, 0.3, 0, -0.6, 0.6];
  return { x: xs[j % xs.length], y: j < xs.length ? 0.8 : -0.62 };
}
const _ray = new THREE.Vector3();
// Puts `out` at parking spot i; returns how many world units a pixel spans there, to size what parks in it.
function parkPoint(i, out) {
  const s = slotNDC(i);
  const D = clamp(CAM.dist * 0.5, 50, 900);
  _ray.set(s.x, s.y, 0.5).unproject(camera).sub(camera.position).normalize();
  out.copy(camera.position).addScaledVector(_ray, D);
  return (D * _ray.dot(CAM.fwd)) / CAM.focal;
}
const slotOwner = []; // the session or car in each spot

// True when p is behind the core and inside its disc on screen (the core hides it like a planet).
const _occ = new THREE.Vector3(), _sp = { x: 0, y: 0, z: 0 }, _sc0 = { x: 0, y: 0, z: 0 };
function hiddenByCore(p) {
  const coreDepth = -camera.position.dot(CAM.fwd);
  if (_occ.copy(p).sub(camera.position).dot(CAM.fwd) <= coreDepth || coreDepth <= 1) return false;
  toScreen(p, _sp);
  toScreen(_occ.set(0, 0, 0), _sc0);
  return Math.hypot(_sp.x - _sc0.x, _sp.y - _sc0.y) < (K.CORE_R * 1.1 * CAM.focal) / coreDepth;
}

// ---------- sessions ----------
const NODES = new Map();
const homeKindOf = (status) => (status === 'idle' || status === 'waiting' ? 'park' : 'orbit');
const statusColor = (st) => colorOf(STATUS[st]?.color || STATUS.busy.color);
const raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();
function rayAt(m) {
  _ndc.set((m.x / SIZE.w) * 2 - 1, -(m.y / SIZE.h) * 2 + 1);
  raycaster.setFromCamera(_ndc, camera);
  return raycaster.ray;
}

class Session {
  constructor(s, now, delay) {
    this.sid = s.id;
    this.owner = this;
    this.s = s;
    this.ci = R.colorIndex(s.id);
    this.hueCss = R.sessColor(s.id);
    this.hue = colorOf(this.hueCss);
    this.status = s.status;
    this.color = statusColor(s.status);

    this.icon = new SessionIcon();
    this.icon.draw(R, s, this.hueCss);
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.icon.texture, transparent: true, depthWrite: false }));
    this.sprite.scale.setScalar(ICON_W);
    this.sprite.renderOrder = 3;
    this.glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: hexGlow, color: this.color.clone(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.glowSprite.scale.setScalar(ICON_W);
    this.glowSprite.renderOrder = 2;
    this.halo = new THREE.Mesh(QUAD, ringMaterial({ glow: 1.2, dashes: 16, dashSpeed: 0.3 }));
    this.halo.renderOrder = 2;
    this.root = new THREE.Group();
    this.root.add(this.glowSprite, this.halo, this.sprite);
    this.root.visible = false;
    scene.add(this.root);

    this.orbitRing = new THREE.Mesh(QUAD, ringMaterial({ glow: 2.2, floor: 0.38 }));
    scene.add(this.orbitRing);
    this.orbitAlpha = 0;
    this.quat = new THREE.Quaternion();

    this.pos = new THREE.Vector3();
    this.prev = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.homePos = new THREE.Vector3();
    this.dragTarget = new THREE.Vector3();
    this.dragOff = new THREE.Vector3();
    this.dragPlane = new THREE.Plane();
    this.theta = (this.ci * 2.39996 + 0.6) % TAU;
    this.r = this.rTarget = K.ATOM_R;
    this.phi = this.phiTarget = 0;
    this.fresh = true;
    this.scale = 0.04;
    this.homeScale = 1;
    this.homeKind = homeKindOf(s.status);
    this.slot = -1;
    this.mode = 'fly';
    this.fly = { from: new THREE.Vector3(), fromScale: 0.04, t0: now + delay, dur: 1500 };
    this.warp = true;
    this.kick = 0;
    this.drones = new Map();
    this.dying = 0;
    this.lastUsageFx = 0;
    this.makeLabels();
  }

  // The chat's title under the hexagon while it orbits. A parked session has none: its hexagon already says
  // your turn / needs you, and the tooltip has the rest.
  makeLabels() {
    this.label = el('div', 'sl');
    this.label.dataset.sid = this.sid;
    this.labelObj = new CSS2DObject(this.label);
    this.labelObj.center.set(0.5, 0);
    this.labelObj.visible = false;
    scene.add(this.labelObj);
    this.fts = el('div', 'fts');
    this.ftObj = new CSS2DObject(this.fts);
    this.ftObj.center.set(0.5, 1);
    this.ftObj.visible = false;
    scene.add(this.ftObj);
  }

  setSession(s, now) {
    this.s = s;
    if (s.status !== this.status) {
      this.status = s.status;
      this.color.copy(statusColor(s.status));
    }
    const kind = homeKindOf(s.status);
    if (kind !== this.homeKind) {
      this.homeKind = kind;
      if (this.mode !== 'drag' && !this.dying) this.startFly(now);
    }
    this.syncDrones(s.agents || [], now);
    this.refreshLabel();
  }

  startFly(now) {
    this.mode = 'fly';
    this.fly.from.copy(this.pos);
    this.fly.fromScale = this.scale;
    this.fly.t0 = now;
    this.fly.dur = 1400;
    this.warp = false;
  }

  syncDrones(agents, now) {
    const seen = new Set();
    agents.forEach((a, j) => {
      let d = this.drones.get(a.id);
      if (!d) {
        d = new Drone(this, a, now);
        this.drones.set(a.id, d);
      }
      d.ag = a;
      d.idx = j;
      d.count = agents.length;
      d.dying = 0;
      seen.add(a.id);
    });
    for (const [id, d] of this.drones) if (!seen.has(id) && !d.dying) d.dying = now;
  }

  home(out, now) {
    if (this.homeKind === 'park' && this.slot >= 0) {
      this.homeScale = (K.PARK_HEX_PX / K.HEX) * parkPoint(this.slot, out);
      return out.addScaledVector(CAM.up, Math.sin(now / 760 + this.ci * 1.7) * 1.2 * this.homeScale);
    }
    this.homeScale = 1;
    return out.set(Math.cos(this.theta) * this.r, Math.sin(this.theta) * this.r, 0).applyQuaternion(this.quat);
  }

  beginDrag(m) {
    this.mode = 'drag';
    this.warp = false;
    this.dragPlane.setFromNormalAndCoplanarPoint(CAM.fwd, this.pos);
    this.dragOff.set(0, 0, 0);
    if (rayAt(m).intersectPlane(this.dragPlane, _hit)) this.dragOff.copy(this.pos).sub(_hit);
    this.dragTarget.copy(this.pos);
    host.classList.add('dragging');
  }
  dragTo(m) {
    if (rayAt(m).intersectPlane(this.dragPlane, _hit)) this.dragTarget.copy(_hit).add(this.dragOff);
  }
  endDrag() {
    this.mode = 'spring';
    this.vel.clampLength(0, 1400);
    host.classList.remove('dragging');
  }

  update(dt, now) {
    this.r += (this.rTarget - this.r) * damp(1.6, dt);
    this.phi += (this.phiTarget - this.phi) * damp(1.4, dt);
    atomQuat(this.phi, this.quat);
    this.kick = Math.max(0, this.kick - dt * 1.6);
    const ended = this.status === 'ended';
    const omega = 0.42 * Math.sqrt(K.ATOM_R / this.r) * (ended ? 0.3 : 1) * (1 + this.kick * 1.2);
    this.theta = (this.theta + omega * dt) % TAU;
    const H = this.home(this.homePos, now);
    this.prev.copy(this.pos);

    if (this.dying) {
      const u = clamp((now - this.dying) / 700, 0, 1);
      this.scale = this.dieScale * (1 - easeOut(u));
      if (u >= 1) return false;
    } else if (this.mode === 'drag') {
      this.pos.lerp(this.dragTarget, damp(18, dt));
    } else if (this.mode === 'spring') {
      const k = 34, c = 2 * 0.68 * Math.sqrt(k);
      tmp.d.copy(H).sub(this.pos).multiplyScalar(k).addScaledVector(this.vel, -c);
      this.vel.addScaledVector(tmp.d, dt);
      this.pos.addScaledVector(this.vel, dt);
      this.scale += (this.homeScale - this.scale) * damp(5, dt);
      if (this.pos.distanceTo(H) < 0.4 * this.homeScale && this.vel.length() < 4) this.mode = 'locked';
    } else if (this.mode === 'fly') {
      const u = clamp((now - this.fly.t0) / this.fly.dur, 0, 1), e = easeInOut(u);
      this.pos.lerpVectors(this.fly.from, H, this.warp ? easeOut(u) : e);
      this.scale = lerp(this.fly.fromScale, this.homeScale, this.warp ? easeOut(u) : e);
      if (u >= 1) {
        this.mode = 'locked';
        this.warp = false;
      }
    } else {
      this.pos.copy(H);
      this.scale = this.homeScale;
    }
    if (dt > 0 && this.mode !== 'spring') this.vel.lerp(tmp.d.copy(this.pos).sub(this.prev).divideScalar(dt), damp(12, dt));

    this.root.visible = !(this.mode === 'fly' && now < this.fly.t0);
    this.root.position.copy(this.pos);
    this.root.scale.setScalar(Math.max(0.001, this.scale));
    this.updateLook(now);
    this.updateOrbitRing(dt);
    for (const [id, d] of this.drones) if (d.update(dt, now) === false) this.drones.delete(id);
    return true;
  }

  updateLook(now) {
    const st = this.status;
    let g = 0.1;
    if (st === 'busy') g = 0.6 + 0.2 * Math.sin(now / 280);
    else if (st === 'waiting') g = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now / 160));
    else if (st === 'idle') g = 0.45;
    g += this.kick * 0.6 + (hover && hover.kind === 'session' && hover.owner === this ? 0.4 : 0);
    this.glowSprite.material.color.copy(this.color).multiplyScalar(1.7 * g);
    this.sprite.material.opacity = st === 'ended' ? 0.5 : 1;
    const u = this.halo.material.uniforms, busy = st === 'busy';
    this.halo.quaternion.copy(camera.quaternion);
    setRing(this.halo, K.HEX * (busy ? 1.62 : 1.8), busy ? 1.1 : 1.3);
    u.color.value.copy(this.color).multiplyScalar(1.4);
    u.time.value = now / 1000;
    u.dashes.value = busy ? 16 : 0;
    u.opacity.value = busy ? 0.5 : st === 'idle' ? 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(now / 900)) : st === 'waiting' ? 0.65 : 0;
  }

  updateOrbitRing(dt) {
    const want = this.homeKind === 'orbit' && !this.dying ? (this.status === 'ended' ? 0.18 : 0.55) : 0;
    this.orbitAlpha += (want - this.orbitAlpha) * damp(3, dt);
    this.orbitRing.visible = this.orbitAlpha > 0.01;
    if (!this.orbitRing.visible) return;
    this.orbitRing.quaternion.copy(this.quat);
    setRing(this.orbitRing, this.r, 0.9, 12);
    const u = this.orbitRing.material.uniforms;
    u.color.value.copy(this.hue);
    u.opacity.value = this.orbitAlpha;
    u.head.value = this.theta;
    u.tail.value = 1.7;
  }

  placeLabel() {
    const visible = this.root.visible && !this.dying && this.homeKind !== 'park' && !hiddenByCore(this.pos);
    this.labelObj.visible = this.ftObj.visible = visible;
    if (!visible) return;
    const r = K.HEX * this.scale;
    this.labelObj.position.copy(this.pos).addScaledVector(CAM.up, -r * 1.28);
    this.ftObj.position.copy(this.pos).addScaledVector(CAM.up, r * 1.32);
  }

  refreshLabel() {
    const s = this.s;
    this.icon.draw(R, s, this.hueCss);
    this.label.classList.toggle('ended', s.status === 'ended');
    setText(this.label, R.clipT(s.title || s.lastPrompt || s.cwd || '', 32));
  }

  die(now) {
    this.dying = now;
    this.dieScale = this.scale;
    sparks(this.pos, this.color, 26, 90);
    for (const d of this.drones.values()) d.dying = d.dying || now;
  }

  dispose() {
    scene.remove(this.root, this.orbitRing, this.labelObj, this.ftObj);
    for (const d of this.drones.values()) d.dispose();
    this.icon.dispose();
    this.sprite.material.dispose();
    this.glowSprite.material.dispose();
    this.halo.material.dispose();
    this.orbitRing.material.dispose();
  }
}

// Subagent: a small violet hexagon circling its session like a moon.
class Drone {
  constructor(owner, a, now) {
    this.owner = owner;
    this.ag = a;
    this.born = now;
    this.dying = 0;
    this.idx = 0;
    this.count = 1;
    this.running = null;
    this.pos = owner.pos.clone();
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: DRONE_TEX.running, transparent: true, depthWrite: false }));
    this.sprite.scale.setScalar((128 / 40) * DRONE_HEX);
    this.sprite.renderOrder = 3;
    this.spin = new THREE.Mesh(QUAD, ringMaterial({ glow: 0.8, dashes: 1, dashSpeed: 0.55 }));
    setRing(this.spin, DRONE_HEX * 1.38, 1.3, 4);
    this.spin.renderOrder = 2;
    this.root = new THREE.Group();
    this.root.add(this.spin, this.sprite);
    scene.add(this.root);
    this.labelEl = el('div', 'dl');
    this.labelObj = new CSS2DObject(this.labelEl);
    this.labelObj.center.set(0.5, 0);
    scene.add(this.labelObj);
  }
  update(dt, now) {
    const o = this.owner, s = o.scale;
    const ring = this.count > 7 ? (this.idx % 2) * 14 : 0;
    const ang = (this.idx / Math.max(1, this.count)) * TAU + now / 9000;
    const rx = (K.HEX + 46 + ring) * s, ry = (K.HEX + 24 + ring * 0.6) * s;
    this.pos
      .copy(o.pos)
      .addScaledVector(CAM.right, Math.cos(ang) * rx)
      .addScaledVector(CAM.up, Math.sin(ang) * ry)
      .addScaledVector(CAM.fwd, Math.sin(ang) * 16 * s);
    let sc = easeOut(clamp((now - this.born) / 500, 0, 1));
    if (this.dying) {
      const u = clamp((now - this.dying) / 600, 0, 1);
      sc *= 1 - u;
      if (u >= 1) {
        this.dispose();
        return false;
      }
    }
    const running = !!this.ag.running;
    if (running !== this.running) {
      this.running = running;
      this.sprite.material.map = running ? DRONE_TEX.running : DRONE_TEX.done;
    }
    this.root.visible = o.root.visible;
    this.root.position.copy(this.pos);
    this.root.scale.setScalar(Math.max(0.001, s * sc));
    this.sprite.material.opacity = running ? 1 : 0.7;
    this.spin.quaternion.copy(camera.quaternion);
    const u = this.spin.material.uniforms;
    u.color.value.copy(VIOLET).multiplyScalar(1.6);
    u.opacity.value = running ? 0.85 : 0;
    u.time.value = now / 1000;
    const hovered = hover && hover.kind === 'drone' && hover.drone === this;
    const show = this.root.visible && !this.dying && hovered;
    this.labelObj.visible = show;
    if (show) {
      setText(this.labelEl, R.clipT(this.ag.desc || this.ag.type || 'subagent', 18));
      this.labelObj.position.copy(this.pos).addScaledVector(CAM.up, -DRONE_HEX * 1.2 * s);
    }
    return true;
  }
  dispose() {
    scene.remove(this.root, this.labelObj);
    this.sprite.material.dispose();
    this.spin.material.dispose();
  }
}

let booted = false;
const sunNode = { pos: new THREE.Vector3(), scale: 1 };
function syncSessions(st, now) {
  const seen = new Set();
  const list = [...st.sessions].sort((a, b) => R.colorIndex(a.id) - R.colorIndex(b.id));
  let delay = 0;
  for (const s of list) {
    let n = NODES.get(s.id);
    if (!n) {
      n = new Session(s, now, booted ? 0 : delay);
      delay += 160;
      NODES.set(s.id, n);
      if (booted) ripple(sunNode, '#f88008', 70, 1200, 0, true);
    }
    n.setSession(s, now);
    seen.add(s.id);
  }
  booted = true;
  for (const n of NODES.values()) if (!seen.has(n.sid) && !n.dying) n.die(now);
  assignOrbits();
  assignParking();
}

function assignOrbits() {
  const orb = [...NODES.values()].filter((n) => !n.dying && n.homeKind === 'orbit').sort((a, b) => (a.status === 'ended') - (b.status === 'ended') || a.ci - b.ci);
  const n = orb.length;
  orb.forEach((o, i) => {
    o.phiTarget = (i * Math.PI) / Math.max(1, n);
    o.rTarget = K.ATOM_R + i * K.ATOM_STEP;
    if (o.fresh) {
      o.phi = o.phiTarget;
      o.r = o.rTarget;
    }
  });
  for (const o of NODES.values()) o.fresh = false;
}

// Sessions take the spots from the top down and cars from the bottom up, so the two stay apart. The spot a chat or a
// car takes the first time it parks is its own until it ends, like a tab: it comes back there every time it parks
// again, and nothing else parks there meanwhile.
const CAR_SLOTS = [6, 7, 4, 5, 2, 3, 0, 1, 13, 14, 15, 16, 17];
const homeSlot = new Map(); // 's:<session id>' or 'c:<car id>' -> its spot
const parkKey = (o) => (o.sid ? 's:' + o.sid : 'c:' + o.id);
function assignParking() {
  for (let i = 0; i < slotOwner.length; i++) {
    const o = slotOwner[i];
    if (o && (o.dying || o.homeKind !== 'park')) slotOwner[i] = null;
  }
  const live = new Set([...NODES.values(), ...SHIPS.values()].filter((o) => !o.dying).map(parkKey));
  for (const k of homeSlot.keys()) if (!live.has(k)) homeSlot.delete(k);
  const reserved = new Set(homeSlot.values());
  for (const o of [...NODES.values(), ...SHIPS.values()]) if (o.homeKind !== 'park' || o.dying) o.slot = -1;
  const sessions = [...NODES.values()]
    .filter((n) => !n.dying && n.homeKind === 'park')
    .sort((a, b) => (a.status === 'waiting' ? 0 : 1) - (b.status === 'waiting' ? 0 : 1) || (a.s.statusSince || 0) - (b.s.statusSince || 0));
  const cars = [...SHIPS.values()].filter((s) => !s.dying && s.homeKind === 'park').sort((a, b) => a.parkedAt - b.parkedAt);
  const free = (o, order) => {
    const mine = homeSlot.get(parkKey(o));
    if (mine !== undefined && !slotOwner[mine]) return mine;
    const open = (k) => !slotOwner[k] && !reserved.has(k);
    const i = order.find(open);
    if (i !== undefined) return i;
    for (let k = 0; ; k++) if (open(k)) return k;
  };
  for (const [list, order] of [[sessions, []], [cars, CAR_SLOTS]]) {
    for (const o of list) {
      if (o.slot >= 0 && slotOwner[o.slot] === o) continue;
      o.slot = free(o, order);
      slotOwner[o.slot] = o;
      if (!homeSlot.has(parkKey(o))) {
        homeSlot.set(parkKey(o), o.slot);
        reserved.add(o.slot);
      }
    }
  }
}

// ---------- stations ----------
const STATIONS = {};
CATS.forEach((c, i) => {
  const col = colorOf(CAT[c].color);
  const m = buildStation(col);
  const a = -Math.PI / 2 + (i / CATS.length) * TAU;
  m.group.position.set(Math.cos(a) * K.STATION_R, 0, Math.sin(a) * K.STATION_R);
  m.group.rotation.y = -a;
  scene.add(m.group);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col.clone().multiplyScalar(1.4), transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(50);
  halo.position.y = 11;
  m.group.add(halo);
  const e = el('div', 'stl', '<div class="h"><b></b><span class="n"></span><span class="live"></span></div><div class="l"></div>');
  e.style.setProperty('--c', CAT[c].color);
  e.querySelector('b').textContent = CAT[c].station;
  const obj = new CSS2DObject(e);
  obj.center.set(0.5, 0);
  scene.add(obj);
  STATIONS[c] = { c, i, col, m, halo, pos: m.group.position.clone().setY(11), hitAt: 0, last: '', live: 0, el: e, obj, scale: 1 };
});

function updateStations(dt, now) {
  for (const c of CATS) {
    const st = STATIONS[c];
    const flash = Math.max(0, 1 - (now - st.hitAt) / 700);
    const live = st.live ? 0.5 + 0.5 * Math.sin(now / 160) : 0;
    st.m.coreMat.emissiveIntensity = 0.75 + flash * 3.2 + live * 1.2;
    st.m.core.rotation.y += dt * (0.6 + flash * 4);
    st.m.core.position.y = 11 + Math.sin(now / 900 + st.i) * 1.3;
    st.m.ring.rotation.y += dt * (0.5 + (st.live ? 1.6 : 0));
    st.m.ring.rotation.x = 1.15 + 0.25 * Math.sin(now / 2100 + st.i);
    st.m.ring2.rotation.z += dt * 0.22;
    st.halo.material.opacity = 0.2 + flash * 0.8 + live * 0.3;
    st.halo.scale.setScalar(50 + flash * 30);
    st.obj.position.copy(st.pos).addScaledVector(CAM.up, -26);
  }
}

function refreshStations(state) {
  for (const c of CATS) {
    const st = STATIONS[c];
    st.live = state.pendingByCat?.[c] || 0;
    setText(st.el.querySelector('.n'), String(state.byCat?.[c] ?? 0));
    setText(st.el.querySelector('.live'), st.live ? `● ${st.live} live` : '');
    setText(st.el.querySelector('.l'), R.clipT(st.last || state.lastByCat?.[c]?.l || '', 26));
  }
}

// ---------- terminal cars ----------
// Shape and place tell them apart from Claude sessions at a glance: a flying car, not a hexagon, on its own lane.
// Something running in the shell (its foreground job, e.g. `npm run dev`) lights the thrusters: the car lifts off and
// cruises, faster when the job is busy. When nothing runs, the car leaves the lane and parks at the edge of the view
// like a session waiting for you, always the same size on screen and within reach; a new job takes it back to the
// lane. Click: the app shows that terminal's window. (The code calls them ships.)
const LANE = { R: 305, Y: 18, LIFT: 12, SIZE: 1.7 }; // SIZE: the car's scale, so its shape reads at the default zoom
const ICE = colorOf('#8fd3ff');
const SHIPS = new Map();
const SHIP_FLY_MS = 1400; // between the lane and a parking spot
// What the cars' paint and glass reflect, made once when the first car appears.
let carEnv = null;
function reflections() {
  if (!carEnv) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    carEnv = pmrem.fromScene(carStudio(), 0.02).texture;
    pmrem.dispose();
  }
  return carEnv;
}
let shipSeq = 0;

function syncShips(list) {
  const seen = new Set(), now = performance.now();
  for (const t of list || []) {
    seen.add(t.id);
    let s = SHIPS.get(t.id);
    if (!s || s.dying) {
      if (s) disposeShip(s);
      s = makeShip(t);
      SHIPS.set(t.id, s);
    }
    s.t = t;
    const kind = t.running ? 'lane' : 'park';
    if (kind !== s.homeKind) {
      // A car that was already somewhere flies over; a new one appears in place.
      if (s.homeKind) s.fly = { t0: now, from: s.pos.clone(), fromQ: s.m.group.quaternion.clone(), fromScale: s.base };
      if (kind === 'lane') {
        s.theta = freeAngle();
        s.speed = s.lift = 0;
      } else s.parkedAt = now;
      s.homeKind = kind;
    }
    setText(s.el.querySelector('b'), t.running ? R.clipT(t.cmd || 'running', 30) : t.dir || 'terminal');
    setText(s.el.querySelector('span'), t.running ? `${t.dir}${t.cpu >= 1 ? ` · ${Math.round(t.cpu)}% cpu` : ''}` : 'idle shell');
    s.el.classList.toggle('idle', !t.running);
    s.el.classList.toggle('parked', kind === 'park');
  }
  for (const s of SHIPS.values()) if (!seen.has(s.id) && !s.dying) explode(s, now);
  assignParking();
  if (hover?.kind === 'ship') refreshTip();
  if (!followedOnce && location.hash === '#car' && SHIPS.size) followedOnce = followShip();
  poke();
}

// A terminal ended: the car blows up where it is (sparks in its colours, a shockwave) and is gone in a blink.
function explode(s, now) {
  s.dying = now;
  sparks(s.pos, ICE, 44, 260);
  sparks(s.pos, colorOf('#ffb057'), 30, 170);
  sparks(s.pos, WHITE, 18, 110);
  ripple({ pos: s.pos.clone(), scale: s.size / LANE.SIZE }, '#8fd3ff', 70, 650);
  poke();
}
// The app says so the moment End is pressed, before the terminals list catches up.
function shipGone(id) {
  const s = SHIPS.get(id);
  if (s && !s.dying) explode(s, performance.now());
}

// A ship joins the lane in the middle of the widest gap, never on top of another.
function freeAngle() {
  const angles = [...SHIPS.values()].filter((s) => !s.dying && s.homeKind === 'lane').map((s) => ((s.theta % TAU) + TAU) % TAU).sort((a, b) => a - b);
  if (!angles.length) return TAU * 0.12;
  let gap = 0, at = 0;
  angles.forEach((a, i) => {
    const b = i + 1 < angles.length ? angles[i + 1] : angles[0] + TAU;
    if (b - a > gap) {
      gap = b - a;
      at = a + gap / 2;
    }
  });
  return at;
}

function makeShip(t) {
  const m = buildRoadster(ICE, reflections());
  m.group.scale.setScalar(0.01);
  scene.add(m.group);
  // One shared material, so every thruster of a car glows together.
  const flameMat = new THREE.SpriteMaterial({ map: glowTex, color: ICE.clone().multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const flames = m.jetKinds.map((j) => {
    const f = new THREE.Sprite(flameMat);
    f.position.copy(j.at);
    f.userData.main = j.main;
    f.userData.fan = !!j.fan;
    m.group.add(f);
    return f;
  });
  const flame = { material: flameMat, flames };
  const e = el('div', 'shl', '<b></b><span></span>');
  const obj = new CSS2DObject(e);
  obj.center.set(0.5, 0);
  scene.add(obj);
  // homeKind: 'lane' or 'park'; base: the size for where it is; grow: 0..1 as it appears and goes.
  return { id: t.id, t, m, flame, el: e, obj, homeKind: null, slot: -1, fly: null, parkedAt: 0, theta: 0, speed: 0, lift: 0, base: LANE.SIZE, grow: 0.01, size: 0.01, pos: new THREE.Vector3(), dying: 0, i: shipSeq++ };
}

function disposeShip(s) {
  scene.remove(s.m.group, s.obj);
  s.obj.element.remove();
  for (const mat of s.m.own) mat.dispose();
  s.flame.material.dispose();
  SHIPS.delete(s.id);
  if (hover?.ship === s) setHover(null);
}

const _tan = new THREE.Vector3(), _look = new THREE.Vector3(), _trail = new THREE.Vector3(), _home = new THREE.Vector3();
const _homeQ = new THREE.Quaternion(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _rot = new THREE.Matrix4();
// Where a ship belongs right now (_home, _homeQ); returns its size there.
function shipHome(s, dt, now) {
  if (s.homeKind === 'park' && s.slot >= 0) {
    // Its nose toward the middle of the view, turned to show the front and a little of the roof (more of the roof
    // catches the lights and glares), hovering a little.
    const upp = parkPoint(s.slot, _home);
    _home.addScaledVector(CAM.up, Math.sin(now / 900 + s.i * 1.7) * 2 * upp);
    const side = slotNDC(s.slot).x > 0 ? -1 : 1;
    _homeQ.copy(camera.quaternion)
      .multiply(_qa.setFromAxisAngle(AXIS_X, 0.24))
      .multiply(_qb.setFromAxisAngle(UP, side * (1.05 + 0.08 * Math.sin(now / 2600 + s.i))));
    return (K.PARK_CAR_PX / CAR_LENGTH) * upp;
  }
  const run = s.t.running;
  const cruise = run ? 0.09 + Math.min(1, (s.t.cpu || 0) / 60) * 0.16 : 0;
  s.speed += (cruise - s.speed) * damp(1.2, dt);
  s.theta += s.speed * dt;
  s.lift += ((run ? LANE.LIFT : 0) - s.lift) * damp(1.5, dt);
  const bob = Math.sin(now / 900 + s.i * 1.7) * 1.4;
  _home.set(Math.cos(s.theta) * LANE.R, LANE.Y + s.lift + bob, Math.sin(s.theta) * LANE.R);
  _tan.set(-Math.sin(s.theta), 0, Math.cos(s.theta));
  _homeQ.setFromRotationMatrix(_rot.lookAt(_look.copy(_home).add(_tan), _home, UP))
    .multiply(_qa.setFromAxisAngle(AXIS_Z, -0.35 * Math.min(1, s.speed / 0.12))); // banks into the curve
  return LANE.SIZE;
}

function updateShips(dt, now) {
  for (const s of [...SHIPS.values()]) {
    const run = s.t.running && !s.dying;
    // A going car shrinks where it is.
    if (!s.dying) {
      const size = shipHome(s, dt, now);
      if (s.fly) {
        const u = clamp((now - s.fly.t0) / SHIP_FLY_MS, 0, 1), e = easeInOut(u);
        s.pos.lerpVectors(s.fly.from, _home, e);
        s.m.group.quaternion.slerpQuaternions(s.fly.fromQ, _homeQ, e);
        s.base = lerp(s.fly.fromScale, size, e);
        if (u >= 1) s.fly = null;
      } else {
        s.pos.copy(_home);
        s.m.group.quaternion.copy(_homeQ);
        s.base = size;
      }
    }
    s.grow += ((s.dying ? 0 : 1) - s.grow) * damp(s.dying ? 24 : 3.5, dt);
    s.size = Math.max(0.01, s.base * s.grow);
    s.m.group.position.copy(s.pos);
    s.m.group.scale.setScalar(s.size);
    const thrust = s.fly && !s.dying ? 0.6 : run ? 0.55 + 0.2 * Math.sin(now / 80 + s.i) + Math.min(0.3, (s.t.cpu || 0) / 200) : 0.04;
    s.flame.material.opacity += (thrust - s.flame.material.opacity) * damp(6, dt);
    for (const f of s.flame.flames) {
      const [base, gain] = f.userData.main ? [4, 7] : f.userData.fan ? [3, 5] : [1, 1.4];
      f.scale.setScalar(base + thrust * gain);
    }
    s.m.glassMat.emissiveIntensity = run ? 0.16 : 0.06;
    s.obj.visible = !s.dying;
    s.obj.position.copy(s.pos).addScaledVector(CAM.up, -10.6 * s.size);
    if (s.dying && s.grow < 0.02) disposeShip(s);
  }
}

const onLane = (s) => !s.dying && s.homeKind === 'lane';
// The lane, faint, while a car is on it, and a short trail behind every car cruising there.
function drawShips() {
  let lane = false;
  for (const s of SHIPS.values()) lane ||= onLane(s);
  if (!lane) return;
  lines.circle(tmp.p.set(0, LANE.Y, 0), LANE.R, AXIS_X, AXIS_Z, ICE, 0.09, 128);
  for (const s of SHIPS.values()) {
    if (!onLane(s) || s.fly || !s.t.running) continue;
    const step = 0.006 + s.speed * 0.05;
    for (let k = 1; k <= 14; k++) {
      const a = s.theta - k * step;
      _trail.set(Math.cos(a) * LANE.R, s.pos.y, Math.sin(a) * LANE.R);
      glow.add(_trail, ICE, 0.45 * (1 - k / 15) * s.flame.material.opacity, 5.5 * (1 - k / 18));
    }
  }
}

// Following a car: staging can't open a terminal window, so a click on a car (or #car in the address) brings the
// camera close and rides along behind it, to look at the model. Dragging, a double-click or Esc lets go.
let follow = null, followedOnce = false;
const _chase = new THREE.Vector3();
function followShip(id) {
  const lane = [...SHIPS.values()].filter(onLane);
  const s = id ? lane.find((x) => x.id === id) : lane[0];
  if (!s) return false;
  follow = s.id;
  camAnim = null;
  poke(5000);
  return true;
}
function stepFollow(dt) {
  if (!follow) return;
  const s = SHIPS.get(follow);
  if (!s || !onLane(s)) return resetView();
  // ahead of it, outside the lane and a little above: a three-quarter front view that shows the shape
  _chase.copy(s.pos)
    .addScaledVector(tmp.d.set(-Math.sin(s.theta), 0, Math.cos(s.theta)), 52)
    .addScaledVector(tmp.c.set(Math.cos(s.theta), 0, Math.sin(s.theta)), 90)
    .add(tmp.b.set(0, 40, 0));
  const k = damp(3, dt);
  controls.target.lerp(s.pos, k);
  camera.position.lerp(_chase, k);
  poke(600);
}
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && follow) resetView();
});

// ---------- cinematic camera ----------
// Like a game's idle camera (GTA's): after five minutes away from the keyboard, the camera goes from shot to shot on
// its own, following or circling whatever moves (sessions on their orbits, terminal cars) and now and then circling
// the core. Away means no input anywhere on the Mac (the app reports it; typing in a terminal window counts), not
// just on the dashboard. Any input hands the camera back and the view flies home. The ◉ button turns it off.
const CINE = { IDLE_MS: 300_000, SHOT_MS: 9000, SHOT_JITTER: 4000 };
let lastInput = performance.now(), cine = null;
let cineOn = (() => {
  try {
    return localStorage.getItem('cinematic') !== 'off';
  } catch {
    return true;
  }
})();
const cineTag = el('div', 'cine-tag', '◉ cinematic · move the mouse to take over');
host.parentElement.appendChild(cineTag);
const _cam = new THREE.Vector3(), _dir = new THREE.Vector3(), _side = new THREE.Vector3();

function noteInput() {
  lastInput = performance.now();
  if (!cine) return;
  cine = null;
  cineTag.classList.remove('on');
  resetView();
}
for (const type of ['pointerdown', 'pointermove', 'wheel', 'keydown']) addEventListener(type, noteInput, { passive: true, capture: true });
// The app's word on the last input anywhere on the Mac (seconds ago).
function systemIdle(sec) {
  const at = performance.now() - sec * 1000;
  if (at > lastInput) lastInput = at;
  if (cine && sec < 3) noteInput();
}
function setCinematic(on) {
  cineOn = on;
  try {
    localStorage.setItem('cinematic', on ? 'on' : 'off');
  } catch {}
  const b = document.querySelector('#viewctl [data-v="cine"]');
  if (b) {
    b.classList.toggle('off', !on);
    b.title = on ? 'Cinematic camera when you are away (5 min): on · click to turn off' : 'Cinematic camera: off · click to turn on';
  }
  if (!on && cine) noteInput();
}

function subjects() {
  const out = [{ kind: 'core', key: 'core' }];
  for (const n of NODES.values()) if (!n.dying && n.root.visible && n.homeKind === 'orbit') out.push({ kind: 'session', key: n.sid, n });
  for (const s of SHIPS.values()) if (onLane(s) && !s.fly) out.push({ kind: 'car', key: s.id, s });
  return out;
}
function nextShot(now) {
  const all = subjects();
  // something that moves, more often than the core; never the same subject twice in a row
  const pool = all.filter((x) => x.key !== cine?.key);
  const moving = pool.filter((x) => x.kind !== 'core');
  const pick = moving.length && Math.random() < 0.8 ? moving[Math.floor(Math.random() * moving.length)] : pool[Math.floor(Math.random() * pool.length)] || all[0];
  return { ...pick, style: pick.kind === 'core' || Math.random() < 0.4 ? 'orbit' : 'chase', t0: now, until: now + CINE.SHOT_MS + Math.random() * CINE.SHOT_JITTER, ang: Math.random() * TAU, prev: null };
}
function subjectPos(c) {
  if (c.kind === 'core') return tmp.p.set(0, 0, 0);
  if (c.kind === 'session') return NODES.get(c.key) === c.n && !c.n.dying ? c.n.pos : null;
  return SHIPS.get(c.key) === c.s && onLane(c.s) ? c.s.pos : null;
}
function startCinematic() {
  if (!cineOn || follow || press || !viewReady) return false;
  cine = nextShot(performance.now());
  camAnim = null;
  R.hideTip();
  cineTag.classList.add('on');
  return true;
}
function stepCinematic(dt, now) {
  if (!cine) {
    if (now - lastInput > CINE.IDLE_MS) startCinematic();
    return;
  }
  if (now > cine.until) cine = nextShot(now);
  let p = subjectPos(cine);
  if (!p) {
    cine = nextShot(now);
    p = subjectPos(cine);
    if (!p) return;
  }
  // Framing: far enough that the subject stays well inside the picture (it was so close a hexagon overflowed it), and
  // from outside its orbit, so the other sessions pass behind it rather than between it and the camera.
  const far = cine.kind === 'core' ? 620 : cine.kind === 'car' ? 260 : 360;
  if (cine.style === 'chase') {
    // behind it along the way it moves, out from the core and above
    if (cine.prev) _dir.subVectors(p, cine.prev);
    if (!cine.prev || _dir.lengthSq() < 1e-6) _dir.set(-p.z, 0, p.x);
    _dir.y = 0;
    _dir.normalize();
    _side.set(p.x, 0, p.z);
    if (_side.lengthSq() < 1) _side.set(1, 0, 0);
    _side.normalize();
    _cam.copy(p).addScaledVector(_dir, -far * 0.75).addScaledVector(_side, far * 0.5).add(tmp.b.set(0, far * 0.4, 0));
    cine.prev = (cine.prev || new THREE.Vector3()).copy(p);
  } else {
    cine.ang += dt * 0.12;
    _cam.set(p.x + Math.cos(cine.ang) * far, p.y + far * 0.42, p.z + Math.sin(cine.ang) * far);
  }
  // The aim follows quickly (a fast subject never slips out of the picture), the camera glides.
  controls.target.lerp(p, damp(3, dt));
  camera.position.lerp(_cam, damp(1.1, dt));
  poke(600);
}

// ---------- core ----------
const coreEl = el('div', 'corel');
const coreObj = new CSS2DObject(coreEl);
coreObj.center.set(0.5, 0);
scene.add(coreObj);
let coreNum = 0, heat = 0.2;

// ---------- effects ----------
const BOLTS = [], SPARKS = [], RIPPLES = [], WIRES = new Map();
const nodeOf = (ev) => {
  const n = NODES.get(ev.s);
  if (!n || n.dying) return null;
  const d = ev.a && n.drones.get(ev.a);
  return d && !d.dying ? d : n;
};
const gone = (n) => !n || n.dying || (n.owner && n.owner.dying);
const nodeScale = (n) => (n.owner ? n.owner.scale : n.scale || 1);

function sparks(p, color, n, speed = 70) {
  const now = performance.now(), col = color.isColor ? color.clone() : colorOf(color);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.3 + Math.random()));
    SPARKS.push({ p: p.clone(), v, t0: now, life: 380 + Math.random() * 480, col });
  }
  if (SPARKS.length > 1500) SPARKS.splice(0, SPARKS.length - 1500);
}
function ripple(node, color, maxR, life, delay = 0, face = true) {
  RIPPLES.push({ node, col: colorOf(color), maxR, life, t0: performance.now() + delay, face });
  if (RIPPLES.length > 160) RIPPLES.shift();
}
function floatText(n, text, color, life, bold) {
  const box = n.fts;
  while (box.childElementCount >= 3) box.firstElementChild.remove();
  const t = el('div', 'ft' + (bold ? ' b' : ''));
  t.textContent = text;
  t.style.color = color;
  t.style.animationDuration = life + 'ms';
  box.appendChild(t);
  setTimeout(() => t.remove(), life);
}
function partLabel(ev) {
  const l = R.clipT(ev.l || '', 34);
  switch (ev.c) {
    case 'web': return (ev.n === 'WebSearch' ? '⌕ ' : '↓ ') + l;
    case 'edit': return '✎ ' + l;
    case 'read': return '▤ ' + l;
    case 'bash': return '$ ' + l;
    case 'agent': return '◆ ' + l;
    case 'plan': return ev.n + (l ? ' ' + l : '');
    default: return l || ev.n;
  }
}
function boltLabel(text, color) {
  const e = el('div', 'bl');
  e.textContent = text;
  e.style.color = color;
  const obj = new CSS2DObject(e);
  obj.center.set(0, 1);
  scene.add(obj);
  return { e, obj };
}
function wireHit(ev, t) {
  const k = `${ev.s}|${ev.a || ''}|${ev.c}`;
  const w = WIRES.get(k) || { t: 0, n: 0 };
  w.t = Math.max(w.t, t);
  w.n++;
  WIRES.set(k, w);
}

function onEvent(ev) {
  const now = performance.now();
  const node = nodeOf(ev);
  switch (ev.k) {
    case 'tool': {
      wireHit(ev, now);
      const st = STATIONS[ev.c];
      if (!node || !st) break;
      const labelled = BOLTS.filter((b) => b.label).length < 6;
      BOLTS.push({ a: node, b: st, col: colorOf(CAT[ev.c].color), t0: now, dur: 1100 + Math.random() * 450, size: 4.4, dir: 1, text: partLabel(ev), label: labelled ? boltLabel(partLabel(ev), CAT[ev.c].color) : null });
      node.owner.kick = Math.min(1.5, node.owner.kick + 0.6);
      if (ev.n === 'Agent' || ev.n === 'Task') {
        ripple(node, CAT.agent.color, 70, 1400);
        floatText(node.owner, `◆ spawn · ${R.clipT(ev.l, 40)}`, CAT.agent.color, 3400, true);
      }
      break;
    }
    case 'result': {
      const st = STATIONS[ev.c];
      if (!node || !st) break;
      BOLTS.push({ a: st, b: node, col: colorOf(ev.ok ? '#3dffa8' : '#ff4d4d'), t0: now, dur: 780 + Math.random() * 300, size: 3.2, dir: -1, ok: ev.ok, label: ev.ok ? null : boltLabel('✗ failed', '#ff4d4d') });
      break;
    }
    case 'prompt':
      if (!node) break;
      ripple(node, '#fff0e0', 110, 1700);
      ripple(node, '#f88008', 80, 1400, 200);
      sparks(node.pos, '#fff0e0', 18);
      floatText(node.owner, `› ${R.clipT(ev.l, 70)}`, '#ffffff', 5600, true);
      break;
    case 'say':
      if (node) floatText(node.owner, `“${R.clipT(ev.l, 60)}”`, '#d9c3a8', 3800);
      break;
    case 'think':
      if (node) ripple(node, '#9d6bff', 34, 900);
      break;
    case 'usage':
      if (!node || now - node.owner.lastUsageFx < 700) break;
      node.owner.lastUsageFx = now;
      floatText(node.owner, `+${R.fmtTok(ev.out)} out · ${R.fmtUsd(ev.c)}`, '#ffb057', 2200);
      break;
    case 'sys':
      if (!node) break;
      floatText(node.owner, `${ev.err ? '⚠ ' : ''}${R.clipT(ev.l, 48)}`, ev.err ? '#ff4d4d' : '#ffd23f', 4400, true);
      if (ev.err) sparks(node.pos, '#ff4d4d', 16);
      break;
  }
}

const _ctl = new THREE.Vector3(), _bz = new THREE.Vector3();
function arcCtrl(A, B, out) {
  const d = A.distanceTo(B);
  out.addVectors(A, B).multiplyScalar(0.5 * 0.8);
  out.y += 14 + d * 0.2;
  return out;
}
function bezier(A, C, B, t, out) {
  const u = 1 - t;
  return out.set(u * u * A.x + 2 * u * t * C.x + t * t * B.x, u * u * A.y + 2 * u * t * C.y + t * t * B.y, u * u * A.z + 2 * u * t * C.z + t * t * B.z);
}

function drawBolts(now) {
  for (let i = BOLTS.length - 1; i >= 0; i--) {
    const b = BOLTS[i];
    const u = (now - b.t0) / b.dur;
    if (gone(b.a) || gone(b.b) || u >= 1) {
      if (u >= 1 && !gone(b.a) && !gone(b.b)) arrive(b, now);
      if (b.label) scene.remove(b.label.obj);
      BOLTS.splice(i, 1);
      continue;
    }
    if (u < 0) continue;
    const A = b.a.pos, B = b.b.pos;
    arcCtrl(A, B, _ctl);
    const e = easeInOut(u);
    for (let k = 12; k >= 1; k--) {
      const uu = e - k * 0.016;
      if (uu > 0) glow.add(bezier(A, _ctl, B, uu, _bz), b.col, (1 - k / 13) * 1.2, b.size * (1 - k / 16));
    }
    bezier(A, _ctl, B, e, _bz);
    glow.add(_bz, b.col, 1.6, b.size * 2.6);
    glow.add(_bz, WHITE, 2.6, b.size * 0.85);
    if (b.label) {
      b.label.obj.position.copy(_bz);
      b.label.e.style.opacity = Math.min(1, Math.sin(u * Math.PI) * 1.5).toFixed(2);
    }
  }
}
function arrive(b, now) {
  if (b.dir > 0) {
    b.b.hitAt = now;
    if (b.text) b.b.last = b.text.replace(/^[⌕↓✎▤$◆]\s/, '');
    sparks(b.b.pos, b.col, 12, 60);
    setText(b.b.el.querySelector('.l'), R.clipT(b.b.last, 26));
  } else {
    ripple(b.b, b.col, b.ok === false ? 40 : 16, 650);
    if (b.ok === false) sparks(b.b.pos, '#ff4d4d', 12);
  }
}

function drawSparks(dt, now) {
  for (let i = SPARKS.length - 1; i >= 0; i--) {
    const s = SPARKS[i];
    const u = (now - s.t0) / s.life;
    if (u >= 1) {
      SPARKS.splice(i, 1);
      continue;
    }
    s.p.addScaledVector(s.v, dt);
    s.v.multiplyScalar(Math.pow(0.04, dt));
    glow.add(s.p, s.col, (1 - u) * 1.8, 2.4);
  }
}

function drawRipples(now) {
  for (let i = RIPPLES.length - 1; i >= 0; i--) {
    const r = RIPPLES[i];
    const u = (now - r.t0) / r.life;
    if (u < 0) continue;
    if (u >= 1 || (r.node !== sunNode && gone(r.node))) {
      RIPPLES.splice(i, 1);
      continue;
    }
    const base = r.node === sunNode ? K.CORE_R : r.node.owner === r.node ? K.HEX : DRONE_HEX;
    const rad = (base + easeOut(u) * r.maxR) * nodeScale(r.node);
    const a = 0.85 * (1 - u);
    const [ax, ay] = r.face ? [CAM.right, CAM.up] : [AXIS_X, AXIS_Z];
    lines.circle(r.node.pos, rad, ax, ay, r.col, a, 56);
    lines.circle(r.node.pos, rad * 0.985, ax, ay, r.col, a * 0.6, 56);
  }
}

// Busy sessions: three dots run around the dashed ring. Parked ones keep sending out rings.
function drawStatusFx(now) {
  for (const n of NODES.values()) {
    if (n.dying || !n.root.visible) continue;
    if (n.status === 'busy') {
      const rad = K.HEX * 1.62 * n.scale;
      for (let i = 0; i < 3; i++) {
        const a = now / 520 + (i * TAU) / 3;
        tmp.p.copy(n.pos).addScaledVector(CAM.right, Math.cos(a) * rad).addScaledVector(CAM.up, Math.sin(a) * rad);
        glow.add(tmp.p, n.color, 1.5, 5 * n.scale);
      }
    } else if (n.homeKind === 'park') {
      const period = n.status === 'waiting' ? 1300 : 2200;
      const count = n.status === 'waiting' ? 3 : 2;
      for (let k = 0; k < count; k++) {
        const u = ((now + (k * period) / count + n.ci * 300) % period) / period;
        const rad = K.HEX * (1.3 + easeOut(u) * (n.status === 'waiting' ? 1.6 : 1.1)) * n.scale;
        lines.circle(n.pos, rad, CAM.right, CAM.up, n.color, (1 - u) * (n.status === 'waiting' ? 0.95 : 0.55), 56);
      }
    }
  }
}

const _pts = Array.from({ length: 17 }, () => new THREE.Vector3());
function drawWires(now) {
  for (const [k, w] of WIRES) {
    const age = now - w.t;
    if (age > 600_000) {
      WIRES.delete(k);
      continue;
    }
    const [sid, aid, c] = k.split('|');
    const n = NODES.get(sid), st = STATIONS[c];
    if (!n || n.dying || !st || !n.root.visible) continue;
    const node = (aid && n.drones.get(aid)) || n;
    const hot = age < 25_000;
    arcCtrl(node.pos, st.pos, _ctl);
    for (let i = 0; i <= 16; i++) bezier(node.pos, _ctl, st.pos, i / 16, _pts[i]);
    const base = hot ? 0.42 : 0.05 + 0.16 * (1 - age / 600_000);
    lines.path(_pts, st.col, (t) => base * Math.min(1, t * 6, (1 - t) * 6 + 0.25), hot);
  }
}

function drawTethers() {
  for (const n of NODES.values()) {
    if (n.dying || !n.root.visible) continue;
    for (const d of n.drones.values()) {
      if (d.dying) continue;
      _pts[0].copy(n.pos);
      _pts[1].copy(d.pos);
      lines.path([_pts[0], _pts[1]], VIOLET, d.ag.running ? 0.45 : 0.12, !!d.ag.running);
    }
    if (n.mode === 'drag' || n.mode === 'spring') {
      _pts[0].copy(n.pos);
      _pts[1].copy(n.homePos);
      lines.path([_pts[0], _pts[1]], n.color, 0.4, true);
      lines.circle(n.homePos, K.HEX * 0.5 * n.homeScale, CAM.right, CAM.up, n.color, 0.45, 32);
    }
  }
}

// ---------- picking, hover, drag ----------
let hover = null, press = null, mouse = null;
const _s = { x: 0, y: 0, z: 0 };
function pick(mx, my, target) {
  const lab = target && target.closest && target.closest('.sl');
  if (lab) {
    const n = NODES.get(lab.dataset.sid);
    if (n && !n.dying) return { kind: 'session', owner: n };
  }
  let best = null, bd = 1;
  const consider = (h, pos, radius, bias = 1) => {
    toScreen(pos, _s);
    if (_s.z > 1 || _s.z < -1) return;
    const rp = Math.max(9, radius * pxPerUnit(pos) + 3);
    const d = (Math.hypot(_s.x - mx, _s.y - my) / rp) * bias;
    if (d < bd) {
      bd = d;
      best = h;
    }
  };
  for (const n of NODES.values()) {
    if (n.dying || !n.root.visible) continue;
    consider({ kind: 'session', owner: n }, n.pos, K.HEX * n.scale);
    for (const d of n.drones.values()) if (!d.dying) consider({ kind: 'drone', owner: n, drone: d }, d.pos, DRONE_HEX * 1.2 * n.scale, 0.7);
  }
  for (const c of CATS) consider({ kind: 'station', cat: c }, STATIONS[c].pos, 20, 1.2);
  for (const s of SHIPS.values()) if (!s.dying) consider({ kind: 'ship', ship: s }, s.pos, 12 * s.size, 0.9);
  return best;
}
function setHover(h) {
  hover = h;
  host.style.cursor = h ? (h.kind === 'session' ? 'grab' : 'pointer') : '';
  refreshTip();
}
function refreshTip() {
  if (!hover || !mouse || press) return R.hideTip();
  if (hover.kind === 'session') R.showTip(R.sessionTip(hover.owner.s), mouse.x, mouse.y);
  else if (hover.kind === 'drone') R.showTip(R.agentTip(hover.drone.ag, hover.owner.s), mouse.x, mouse.y);
  else if (hover.kind === 'ship') R.showTip(R.terminalTip(hover.ship.t), mouse.x, mouse.y);
  else R.showTip(R.stationTip(hover.cat), mouse.x, mouse.y);
}
function localXY(e) {
  const r = host.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

host.addEventListener(
  'pointerdown',
  (e) => {
    if (e.button !== 0 || e.altKey) return;
    const m = localXY(e);
    const h = pick(m.x, m.y, e.target);
    if (!h) return;
    e.stopPropagation();
    e.preventDefault();
    host.setPointerCapture(e.pointerId);
    press = { h, id: e.pointerId, x: m.x, y: m.y, moved: false };
    camAnim = null;
    R.hideTip();
    poke();
  },
  true,
);
host.addEventListener(
  'pointermove',
  (e) => {
    const m = localXY(e);
    mouse = m;
    poke(600);
    if (press && e.pointerId === press.id) {
      e.stopPropagation();
      if (!press.moved && Math.hypot(m.x - press.x, m.y - press.y) > 4) {
        press.moved = true;
        if (press.h.kind === 'session') press.h.owner.beginDrag(m);
      }
      if (press.moved && press.h.kind === 'session' && press.h.owner.mode === 'drag') press.h.owner.dragTo(m);
      return;
    }
    if (e.buttons) return;
    setHover(pick(m.x, m.y, e.target));
  },
  true,
);
function endPress(e, cancel) {
  if (!press || e.pointerId !== press.id) return;
  e.stopPropagation();
  const { h, moved } = press;
  press = null;
  if (h.kind === 'session' && h.owner.mode === 'drag') h.owner.endDrag();
  if (moved || cancel) return;
  if (h.kind === 'session' || h.kind === 'drone') {
    ripple(h.drone || h.owner, '#ffffff', 36, 600);
    R.focusSession(h.owner.sid);
  } else if (h.kind === 'station') STATIONS[h.cat].hitAt = performance.now();
  else if (h.kind === 'ship') {
    sparks(h.ship.pos, ICE, 12, 55);
    R.openTerminal(h.ship.id);
  }
}
host.addEventListener('pointerup', (e) => endPress(e, false), true);
host.addEventListener('pointercancel', (e) => endPress(e, true), true);
host.addEventListener('pointerleave', () => {
  mouse = null;
  if (!press) setHover(null);
});
host.addEventListener('dblclick', (e) => {
  const m = localXY(e);
  if (!pick(m.x, m.y, e.target)) resetView();
});
// Safari / WKWebView trackpad pinch.
let pinchFrom = 0;
host.addEventListener('wheel', () => poke(), { passive: true, capture: true });
host.addEventListener('gesturestart', (e) => {
  e.preventDefault();
  poke();
  pinchFrom = camera.position.distanceTo(controls.target);
  camAnim = null;
});
host.addEventListener('gesturechange', (e) => {
  e.preventDefault();
  const d = clamp(pinchFrom / e.scale, controls.minDistance, controls.maxDistance);
  camera.position.sub(controls.target).setLength(d).add(controls.target);
});
host.addEventListener('gestureend', (e) => e.preventDefault());

// ---------- minimap (top-down) & view buttons ----------
const mm = document.getElementById('minimap');
const mmx = mm.getContext('2d');
// Sizes come from a ResizeObserver: reading clientWidth in the frame loop forced a layout every frame.
const MM = { w: 0, h: 0 };
new ResizeObserver(([e]) => {
  MM.w = e.contentRect.width;
  MM.h = e.contentRect.height;
}).observe(mm);
const mmScale = () => (Math.min(MM.w, MM.h) * 0.5 - 5) / (K.STATION_R + 24);
const _corner = new THREE.Vector3(), _op = new THREE.Vector3();
function groundPoint(nx, ny, out) {
  const ray = rayAt({ x: ((nx + 1) / 2) * SIZE.w, y: ((1 - ny) / 2) * SIZE.h });
  const t = ray.direction.y < -0.02 ? -ray.origin.y / ray.direction.y : 3000;
  out.copy(ray.origin).addScaledVector(ray.direction, Math.min(t, 3000));
  out.y = 0;
  return out;
}
function drawMinimap() {
  const w = MM.w, h = MM.h, dpr = SIZE.dpr;
  if (!w || !h) return;
  if (mm.width !== Math.round(w * dpr)) {
    mm.width = Math.round(w * dpr);
    mm.height = Math.round(h * dpr);
  }
  const x = mmx, S = mmScale(), cx = w / 2, cy = h / 2;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, w, h);
  x.lineWidth = 1;
  for (const n of NODES.values()) {
    if (n.dying || n.homeKind !== 'orbit') continue;
    x.strokeStyle = R.hexA(n.hueCss, 0.35);
    x.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * TAU;
      _op.set(Math.cos(t) * n.r, Math.sin(t) * n.r, 0).applyQuaternion(n.quat);
      if (i) x.lineTo(cx + _op.x * S, cy + _op.z * S);
      else x.moveTo(cx + _op.x * S, cy + _op.z * S);
    }
    x.stroke();
  }
  for (const c of CATS) {
    const p = STATIONS[c].pos;
    x.fillStyle = CAT[c].color;
    x.fillRect(cx + p.x * S - 2, cy + p.z * S - 2, 4, 4);
  }
  const lane = [...SHIPS.values()].filter(onLane);
  if (lane.length) {
    x.strokeStyle = 'rgba(143, 211, 255, 0.22)';
    x.beginPath();
    x.arc(cx, cy, LANE.R * S, 0, TAU);
    x.stroke();
    for (const s of lane) {
      // a small arrowhead along the lane
      const px = cx + s.pos.x * S, py = cy + s.pos.z * S, dx = -Math.sin(s.theta), dy = Math.cos(s.theta);
      x.fillStyle = s.t.running ? '#8fd3ff' : 'rgba(143, 211, 255, 0.45)';
      x.beginPath();
      x.moveTo(px + dx * 4, py + dy * 4);
      x.lineTo(px - dx * 3 - dy * 2.6, py - dy * 3 + dx * 2.6);
      x.lineTo(px - dx * 3 + dy * 2.6, py - dy * 3 - dx * 2.6);
      x.closePath();
      x.fill();
    }
  }
  x.fillStyle = '#f88008';
  x.beginPath();
  x.arc(cx, cy, 3.2, 0, TAU);
  x.fill();
  for (const n of NODES.values()) {
    if (n.dying || n.homeKind !== 'orbit' || !n.root.visible) continue;
    x.fillStyle = STATUS[n.status]?.color || '#f88008';
    x.beginPath();
    x.arc(cx + n.pos.x * S, cy + n.pos.z * S, n.mode === 'drag' ? 3.4 : 2.4, 0, TAU);
    x.fill();
  }
  x.strokeStyle = 'rgba(255,176,87,0.85)';
  x.beginPath();
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([nx, ny], i) => {
    groundPoint(nx, ny, _corner);
    const px = clamp(cx + _corner.x * S, -4, w + 4), py = clamp(cy + _corner.z * S, -4, h + 4);
    if (i) x.lineTo(px, py);
    else x.moveTo(px, py);
  });
  x.closePath();
  x.stroke();
  const parked = [...NODES.values()].filter((n) => !n.dying && n.homeKind === 'park');
  const cars = SHIPS.size - lane.length - [...SHIPS.values()].filter((s) => s.dying).length;
  if (parked.length + cars) {
    x.font = `8px ${R.FONT}`;
    x.fillStyle = parked.some((n) => n.status === 'waiting') ? '#ff2e63' : '#00e5ff';
    x.fillText(`${parked.length + cars} parked`, 4, h - 4);
  }
}
function minimapGo(e) {
  poke();
  const r = mm.getBoundingClientRect(), S = mmScale();
  const wx = (e.clientX - r.left - r.width / 2) / S, wz = (e.clientY - r.top - r.height / 2) / S;
  const len = Math.hypot(wx, wz), k = len > 700 ? 700 / len : 1;
  tmp.a.set(wx * k, 0, wz * k).sub(controls.target);
  controls.target.add(tmp.a);
  camera.position.add(tmp.a);
  camAnim = null;
}
mm.addEventListener('pointerdown', (e) => {
  mm.setPointerCapture(e.pointerId);
  minimapGo(e);
});
mm.addEventListener('pointermove', (e) => {
  if (e.buttons) minimapGo(e);
});
for (const b of document.querySelectorAll('#viewctl button')) {
  b.addEventListener('click', () => {
    if (b.dataset.v === 'reset') return resetView();
    if (b.dataset.v === 'cine') return setCinematic(!cineOn);
    const off = camera.position.clone().sub(controls.target);
    off.setLength(clamp(off.length() * (b.dataset.v === 'in' ? 0.7 : 1.4), controls.minDistance, controls.maxDistance));
    flyCamera(controls.target, controls.target.clone().add(off), 420);
  });
}

// ---------- state from app.js ----------
let STATE = null, lastText = 0;
function onState(st) {
  STATE = st;
  syncSessions(st, performance.now());
  refreshStations(st);
  refreshCore();
  if (hover) refreshTip();
}
function onStatus(sid, status) {
  const n = NODES.get(sid);
  if (!n) return;
  if (status === 'waiting') for (let i = 0; i < 3; i++) ripple(n, STATUS.waiting.color, 90, 1400, i * 260);
  else if (status === 'idle') ripple(n, STATUS.idle.color, 80, 1500);
}
function seed(events) {
  const now = performance.now(), wall = Date.now();
  for (const ev of events) if (ev.k === 'tool' && wall - ev.t < 600_000) wireHit(ev, now - (wall - ev.t));
}
function refreshCore() {
  const T = STATE?.totals;
  if (!T) return;
  core.draw(T, STATE.byCat || {}, coreNum);
  setText(coreEl, STATE.sessions.length ? '' : 'no Claude Code session in the last 30 min');
}

// ---------- loop ----------
// Frames are drawn only as often as they're needed: 60 fps while the dashboard is in front (and while you
// drag, rotate or zoom), 30 behind a chat window, and none at all when it can't be seen. Below 60 the glow
// on moving hexagons visibly flickers, so the front view keeps full rate. The app reports visibility
// through activity(); a hidden page also stops on its own.
const ACT = { visible: true, focused: true, until: 0 };
let rafId = 0, lastFrame = performance.now(), lastMinimap = 0;
function poke(ms = 1500) {
  ACT.until = performance.now() + ms;
  wake();
}
function wake() {
  if (rafId || !ACT.visible || document.hidden) return;
  lastFrame = performance.now();
  rafId = requestAnimationFrame(frame);
}
function targetFps(now) {
  return ACT.focused || press || camAnim || now < ACT.until ? 60 : 30;
}
document.addEventListener('visibilitychange', wake);
function frame(now) {
  rafId = 0;
  if (!ACT.visible || document.hidden) return;
  rafId = requestAnimationFrame(frame);
  if (now - lastFrame < 1000 / targetFps(now) - 2) return;
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (!SIZE.w) return;
  stepCamera(now);
  stepFollow(dt);
  stepCinematic(dt, now);
  controls.update();
  clampPan();
  updateCamBasis();
  host.classList.toggle('far', CAM.dist > CAM.fit * 1.5);
  glow.material.uniforms.focal.value = CAM.focal * SIZE.dpr;
  lines.material.uniforms.time.value = now / 1000;

  const T = STATE?.totals;
  if (T) {
    coreNum += (T.toolsPerMin - coreNum) * damp(3, dt);
    heat = clamp(T.toolsPerMin / 18, 0, 1);
  }
  backdrop.update(now, dt, SIZE.dpr);
  core.update(now, heat);
  for (const [id, n] of NODES) {
    if (n.update(dt, now) === false) {
      n.dispose();
      NODES.delete(id);
      if (hover?.owner === n) setHover(null);
      assignOrbits();
      assignParking();
    }
  }
  updateStations(dt, now);
  updateShips(dt, now);
  coreObj.position.set(0, 0, 0).addScaledVector(CAM.up, -K.CORE_R * 1.7);

  glow.begin();
  lines.begin();
  drawWires(now);
  drawTethers();
  drawBolts(now);
  drawRipples(now);
  drawStatusFx(now);
  drawSparks(dt, now);
  drawShips();
  glow.end();
  lines.end();

  const textTick = now - lastText > 250;
  if (textTick) lastText = now;
  for (const n of NODES.values()) {
    n.placeLabel();
    if (textTick && !n.dying) n.refreshLabel();
  }
  if (textTick) refreshCore();

  composer.render();
  labels.render(scene, camera);
  if (now - lastMinimap > 120) {
    lastMinimap = now;
    drawMinimap();
  }
}
wake();

// ---------- API for app.js ----------
function activity(visible, focused) {
  ACT.visible = visible;
  ACT.focused = focused;
  wake();
}
setCinematic(cineOn);
window.Orbit = { state: onState, event: onEvent, status: onStatus, seed, activity, terminals: syncShips, terminalGone: shipGone, follow: followShip, cinematic: startCinematic, idle: systemIdle };
for (const [fn, args] of R.MAPQ.splice(0)) window.Orbit[fn](...args);
