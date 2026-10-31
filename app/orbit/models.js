import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

let G = null;
function geometries() {
  if (G) return G;
  const base = new THREE.CylinderGeometry(13, 15.5, 3, 6);
  G = {
    base,
    baseEdges: new THREE.EdgesGeometry(base),
    core: new THREE.OctahedronGeometry(6.5, 0),
    ring: new THREE.TorusGeometry(11.5, 0.8, 6, 48),
    ring2: new THREE.TorusGeometry(15, 0.35, 4, 64),
    spire: new THREE.CylinderGeometry(0.45, 0.8, 9, 6),
    tip: new THREE.SphereGeometry(0.75, 8, 6),
  };
  return G;
}

// Tool station: hexagonal platform, glowing crystal core, two rings and antennas.
export function buildStation(col) {
  const g = geometries();
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a302a, metalness: 0.72, roughness: 0.36, flatShading: true, emissive: col, emissiveIntensity: 0.05 });
  group.add(new THREE.Mesh(g.base, metal));
  group.add(new THREE.LineSegments(g.baseEdges, new THREE.LineBasicMaterial({ color: col.clone().multiplyScalar(1.4), transparent: true, opacity: 0.55 })));
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x0c0806, emissive: col, emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.3, flatShading: true });
  const core = new THREE.Mesh(g.core, coreMat);
  core.position.y = 11;
  group.add(core);
  const ring = new THREE.Mesh(g.ring, new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(1.3), transparent: true, opacity: 0.85 }));
  ring.position.y = 11;
  group.add(ring);
  const ring2 = new THREE.Mesh(g.ring2, new THREE.MeshBasicMaterial({ color: col.clone(), transparent: true, opacity: 0.35 }));
  ring2.position.y = 11;
  ring2.rotation.x = Math.PI / 2;
  group.add(ring2);
  const tipMat = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2) });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const s = new THREE.Mesh(g.spire, metal);
    s.position.set(Math.cos(a) * 10.5, 5.5, Math.sin(a) * 10.5);
    group.add(s);
    const t = new THREE.Mesh(g.tip, tipMat);
    t.position.set(Math.cos(a) * 10.5, 10.4, Math.sin(a) * 10.5);
    group.add(t);
  }
  return { group, core, coreMat, ring, ring2 };
}

// Terminal car: a plain terminal (a shell, maybe running `npm run dev`) is a flying roadster, so it never reads as a
// Claude session (hexagon). Modelled on the 2026 flying Roadster's look, in a real car's proportions: a long, low body
// with fenders rising over the wheels, a fastback cabin (windshield, side windows and rear window in gold-tinted
// glass, framed by pillars and a painted roof), light strips at the nose and a full-width tail light, spoked wheels, a
// rear wing on fins, and thrusters: twin nozzles at the back, vents along the sides and a fan under the floor. Paint
// and glass reflect a small studio (carStudio). +Z is forward; the wheels stand on y = 0.
export const CAR_LENGTH = 29.5; // nose to nozzles, in model units

// A shape lofted through cross-sections (each a ring of [x, y] points at a z). `keep(k, i)` picks which panels
// (between sections k and k+1, ring edge i) to build, so one outline can be split between two materials; caps close
// both ends.
function loft(sections, keep = () => true, caps = true) {
  const n = sections[0].pts.length, pos = [];
  const v = (sec, i) => [sec.pts[i % n][0], sec.pts[i % n][1], sec.z];
  for (let k = 0; k < sections.length - 1; k++) {
    for (let i = 0; i < n; i++) {
      if (!keep(k, i)) continue;
      const a = v(sections[k], i), b = v(sections[k], i + 1), c = v(sections[k + 1], i + 1), d = v(sections[k + 1], i);
      pos.push(...a, ...d, ...b, ...b, ...d, ...c);
    }
  }
  for (const sec of caps ? [sections[0], sections[sections.length - 1]] : []) {
    const cy = sec.pts.reduce((t, p) => t + p[1], 0) / n;
    for (let i = 0; i < n; i++) pos.push(0, cy, sec.z, ...v(sec, i), ...v(sec, i + 1));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // Smooth panels, crisp creases.
  return toCreasedNormals(g, 0.6);
}
// Body cross-section: from the middle of the deck down the right side (shoulder: the fender crest; beltline crease;
// chine: the widest line; rocker; floor), then mirrored up the left side.
function hull(z, w, top, shoulder, belt, chine, floor) {
  const right = [[0.45 * w, top - 0.04], [0.8 * w, shoulder], [0.97 * w, belt], [w, chine], [0.93 * w, floor + 0.55], [0.7 * w, floor]];
  return { z, pts: [[0, top], ...right, [0, floor], ...[...right].reverse().map(([x, y]) => [-x, y])] };
}
// Cabin cross-section: a trapezoid with a chamfered roof. Ring edges: 0 and 4 the sides, 1-3 the top, 5 the floor.
const cabin = (z, base, roof, y0, y1) => ({
  z,
  pts: [[-base, y0], [-roof, y1 - 0.35], [-roof * 0.6, y1], [roof * 0.6, y1], [roof, y1 - 0.35], [base, y0]],
});
// A thin rod between two points (pillars, light strips).
function bar(a, b, r, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 6), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

let C = null;
function carGeometries() {
  if (C) return C;
  const body = loft([
    hull(14.2, 2.4, 1.65, 1.75, 1.7, 1.45, 1.05), // the nose
    hull(13.6, 4.1, 2.0, 2.2, 2.1, 1.7, 0.9),
    hull(12.4, 5.3, 2.4, 2.75, 2.6, 2.0, 0.8),
    hull(10.5, 6.0, 2.75, 3.4, 3.2, 2.25, 0.72),
    hull(8.4, 6.3, 2.95, 3.95, 3.7, 2.45, 0.7), // front axle: the fenders rise over the wheels
    hull(5.6, 6.05, 3.3, 3.55, 3.35, 2.35, 0.65), // the cowl, where the windshield starts
    hull(1, 5.95, 3.4, 3.5, 3.3, 2.25, 0.62), // the doors
    hull(-4, 6.2, 3.5, 3.65, 3.45, 2.35, 0.62),
    hull(-8.4, 6.6, 3.6, 4.05, 3.8, 2.55, 0.68), // rear axle, the widest point
    hull(-11.6, 6.35, 3.55, 3.75, 3.55, 2.5, 0.85),
    hull(-13.6, 5.95, 3.35, 3.4, 3.25, 2.35, 1.1),
    hull(-14.2, 5.7, 3.2, 3.25, 3.1, 2.3, 1.2), // a flat, wide tail
  ]);
  const greenhouse = [
    cabin(5.8, 4.1, 3.5, 3.3, 3.42), // the windshield's foot, in the cowl
    cabin(1.6, 4.35, 3.3, 3.35, 5.85), // windshield top, the roof starts
    cabin(-2.6, 4.45, 3.35, 3.45, 5.95),
    cabin(-9.6, 4.7, 2.9, 3.6, 3.68), // the rear window comes down to the deck
  ];
  const isGlass = (k, i) =>
    i !== 5 &&
    (k === 0 || // the windshield, wrapping round to the front of the side windows
      (k === 1 && (i === 0 || i === 4)) || // the side windows (the roof between them is painted)
      (k === 2 && i >= 1 && i <= 3)); // the rear window (painted sail panels beside it)
  const glass = loft(greenhouse, isGlass, false);
  const roof = loft(greenhouse, (k, i) => i !== 5 && !isGlass(k, i), false);
  const tire = new THREE.CylinderGeometry(1.85, 1.85, 1.3, 24);
  tire.rotateZ(Math.PI / 2);
  const rim = new THREE.CylinderGeometry(1.22, 1.22, 1.36, 18);
  rim.rotateZ(Math.PI / 2);
  // Spokes (five bars across the rim) and a hub, one geometry.
  const parts = [];
  for (let k = 0; k < 5; k++) {
    const spoke = new THREE.BoxGeometry(1.42, 0.24, 2.25);
    spoke.rotateX((k / 5) * Math.PI);
    parts.push(spoke);
  }
  const hub = new THREE.CylinderGeometry(0.32, 0.32, 1.46, 10);
  hub.rotateZ(Math.PI / 2);
  parts.push(hub);
  const spokes = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  const nozzle = new THREE.CylinderGeometry(0.65, 0.85, 1.2, 12);
  nozzle.rotateX(Math.PI / 2);
  const fan = new THREE.TorusGeometry(1.9, 0.26, 8, 28);
  fan.rotateX(Math.PI / 2);
  C = {
    body,
    bodyEdges: new THREE.EdgesGeometry(body, 32),
    glass,
    roof,
    roofEdges: new THREE.EdgesGeometry(roof, 25),
    tire,
    rim,
    spokes,
    nozzle,
    fan,
    wing: new THREE.BoxGeometry(9.8, 0.28, 2.3),
    fin: new THREE.BoxGeometry(0.28, 1.6, 2.0),
    vent: new THREE.BoxGeometry(0.2, 0.32, 1.5),
    mirror: new THREE.BoxGeometry(0.9, 0.45, 0.6),
    intake: new THREE.BoxGeometry(4.0, 0.3, 0.2),
    taillight: new THREE.BoxGeometry(10.6, 0.22, 0.2),
  };
  return C;
}

// Materials every car shares (the per-car ones change with what the terminal does).
let M = null;
function carMaterials(envMap) {
  return (M ||= {
    trim: new THREE.MeshStandardMaterial({ color: 0x0b0c0f, metalness: 0.4, roughness: 0.5, envMap, envMapIntensity: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0, roughness: 0.9 }),
    rim: new THREE.MeshStandardMaterial({ color: 0x15181d, metalness: 0.8, roughness: 0.35, envMap, envMapIntensity: 0.8 }),
    spokes: new THREE.MeshStandardMaterial({ color: 0xc0c8d2, metalness: 1, roughness: 0.2, envMap }),
    head: new THREE.MeshBasicMaterial({ color: 0xe6f6ff }),
    tail: new THREE.MeshBasicMaterial({ color: 0xff2238 }),
  });
}

// What the cars' paint and glass reflect: a dark studio with soft lights, warm on one side (like the core), cool on
// the other and white strips overhead, so curves and creases show as highlights instead of one flat tone.
export function carStudio() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080a);
  const panel = (w, h, color, k, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(14, 6, 0xffffff, 2, 0, 10, 0); // overhead softbox
  panel(26, 0.9, 0xffffff, 3, 0, 6, 11); // long strips ahead and behind
  panel(26, 0.9, 0xffffff, 3, 0, 6, -11);
  panel(9, 6, 0xffa04a, 2, -13, 1, 0); // warm side
  panel(9, 6, 0x7f9fff, 1.3, 13, 1, 0); // cool side
  return scene;
}

export function buildRoadster(accent, envMap) {
  const g = carGeometries(), mat = carMaterials(envMap);
  const group = new THREE.Group();
  // Dark paint under a clear coat; glass like a helmet visor, gold and mirror-like.
  const metal = new THREE.MeshPhysicalMaterial({
    color: 0x1b1f26, metalness: 0.55, roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.24,
    envMap, emissive: accent, emissiveIntensity: 0.02, side: THREE.DoubleSide,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x5a3e10, metalness: 1, roughness: 0.08, envMap, envMapIntensity: 1.2,
    emissive: 0xc98a28, emissiveIntensity: 0.1, side: THREE.DoubleSide,
  });
  const edge = new THREE.LineBasicMaterial({ color: accent.clone().multiplyScalar(1.2), transparent: true, opacity: 0.26 });
  const fanMat = new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(1.4), transparent: true, opacity: 0.85 });
  const add = (geo, m, x, y, z) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    group.add(o);
    return o;
  };
  group.add(
    new THREE.Mesh(g.body, metal),
    new THREE.LineSegments(g.bodyEdges, edge),
    new THREE.Mesh(g.glass, glassMat),
    new THREE.Mesh(g.roof, metal),
    new THREE.LineSegments(g.roofEdges, edge),
  );

  for (const x of [-1, 1]) {
    // Pillars: A between the windshield and the side window, B behind the door.
    group.add(bar(V(x * 4.1, 3.3, 5.8), V(x * 3.3, 5.5, 1.6), 0.17, mat.trim), bar(V(x * 4.4, 3.4, -0.6), V(x * 3.33, 5.55, -0.6), 0.15, mat.trim));
    add(g.mirror, metal, x * 4.85, 3.85, 4.3);
    // Light strips along the nose's upper edges.
    group.add(bar(V(x * 2.6, 1.92, 13.95), V(x * 4.95, 2.56, 12.55), 0.13, mat.head));
  }
  add(g.intake, mat.trim, 0, 1.35, 14.22);
  add(g.taillight, mat.tail, 0, 2.95, -14.25);

  // Wheels: tire, dark rim, bright spokes; their outer faces flush with the fenders.
  for (const [wx, z] of [[5.75, 8.4], [6.05, -8.4]]) {
    for (const x of [-1, 1]) {
      add(g.tire, mat.rubber, x * wx, 1.85, z);
      add(g.rim, mat.rim, x * wx, 1.85, z);
      add(g.spokes, mat.spokes, x * wx, 1.85, z);
    }
  }

  // The rear wing on two fins, in dark carbon.
  add(g.wing, mat.trim, 0, 5.0, -12.7).rotation.x = -0.1;
  for (const x of [-1, 1]) add(g.fin, mat.trim, x * 3.3, 4.2, -12.5);

  // Thrusters: twin nozzles at the back, vents along the chines, a lift fan under the floor.
  const jets = [];
  for (const x of [-1, 1]) {
    add(g.nozzle, mat.trim, x * 2.7, 2.15, -14.5);
    jets.push({ at: V(x * 2.7, 2.15, -15.5), main: true });
    for (const [vx, y, z] of [[6.02, 2.3, 4.0], [6.27, 2.37, -4.6]]) {
      add(g.vent, mat.trim, x * vx, y, z);
      jets.push({ at: V(x * (vx + 0.5), y - 0.25, z), main: false });
    }
  }
  add(g.fan, fanMat, 0, 0.5, -1);
  jets.push({ at: V(0, -0.8, -1), main: false, fan: true });
  return { group, metal, glassMat, own: [metal, glassMat, edge, fanMat], jets: jets.map((j) => j.at), jetKinds: jets };
}
