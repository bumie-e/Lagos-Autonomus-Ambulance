// Stylised Lagos: roads, shops, homes, people, danfo buses, kekes, hazards. Everything is seeded.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import D from './data.js';

export const SCALE = 0.6;
export const W = (mx, my) => new THREE.Vector3((mx - 700) * SCALE, 0, (my - 510) * SCALE);
let seed = 7;
export const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];
const range = (a, b) => a + rnd() * (b - a);
export const ROAD_W = 13;

// ---------- geometry helpers: everything is vertex-coloured and merged ----------
const _c = new THREE.Color();
function paint(g, color) {
  g = g.index ? g.toNonIndexed() : g;
  _c.set(color);
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([_c.r, _c.g, _c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  return g;
}
export const box = (w, h, d, c, x = 0, y = 0, z = 0) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c);
export const cyl = (r1, r2, h, c, x = 0, y = 0, z = 0, s = 8) => paint(new THREE.CylinderGeometry(r1, r2, h, s).translate(x, y, z), c);
export const ball = (r, c, x = 0, y = 0, z = 0) => paint(new THREE.IcosahedronGeometry(r, 1).translate(x, y, z), c);
const wheel = (x, z, r = .55, w = .45) => paint(new THREE.CylinderGeometry(r, r, w, 10).rotateX(Math.PI / 2).translate(x, r, z), '#16161a');
export const vmat = new THREE.MeshLambertMaterial({ vertexColors: true });
export function mesh(parts) { const m = new THREE.Mesh(mergeGeometries(parts), vmat); m.castShadow = m.receiveShadow = true; return m; }

// ---------- vehicles (facing +x) ----------
function danfo() {
  const Y = '#f4b400', K = '#141414', G = '#2b3d4f';
  const p = [box(5.4, 1.9, 2.4, Y, 0, 1.55, 0), box(4.6, .35, 2.25, Y, -.25, 2.65, 0),
    box(5.45, .16, 2.46, K, 0, 1.25, 0), box(5.45, .16, 2.46, K, 0, .92, 0),
    box(.12, .8, 2.1, G, 2.7, 2.05, 0), box(.1, .65, 1.9, G, -2.72, 2.05, 0), box(3.6, .1, 1.9, '#5a5a5a', -.3, 2.95, 0),
    box(1.2, .5, 1.4, '#7a4a28', -.9, 3.2, 0), box(.9, .4, .9, '#2c6e49', .5, 3.15, .2), box(.15, .3, .5, '#fff4c2', 2.72, 1.1, .8), box(.15, .3, .5, '#fff4c2', 2.72, 1.1, -.8),
    box(.15, .3, .4, '#b3261e', -2.72, 1.1, .85), box(.15, .3, .4, '#b3261e', -2.72, 1.1, -.85)];
  for (const x of [-1.9, -.65, .6, 1.8]) p.push(box(.95, .7, 2.45, G, x, 2.05, 0));
  for (const x of [-1.7, 1.75]) p.push(wheel(x, 1.15), wheel(x, -1.15));
  // conductor hanging out of the door
  p.push(box(.35, .8, .35, '#1d4e89', .3, 1.7, 1.45), ball(.22, '#5b3a29', .3, 2.35, 1.5), box(.3, .9, .3, '#222', .3, .95, 1.4));
  return mergeGeometries(p);
}
function keke() {
  const Y = '#f2b705';
  return mergeGeometries([box(2.6, .8, 1.5, Y, 0, .9, 0), box(2.2, .15, 1.6, '#222', -.1, 2.35, 0), box(.1, 1.2, .1, '#222', .9, 1.75, .7), box(.1, 1.2, .1, '#222', .9, 1.75, -.7),
    box(.9, 1.2, 1.5, Y, -.85, 1.75, 0), box(.1, .7, 1.3, '#31485c', 1.0, 1.55, 0), box(.4, .8, .4, '#8b1e3f', .25, 1.55, 0), ball(.24, '#4a2f20', .25, 2.1, 0),
    wheel(1.25, 0, .42, .25), wheel(-.9, .75, .42, .25), wheel(-.9, -.75, .42, .25)]);
}
function car(c) {
  const p = [box(4.3, .85, 2.1, c, 0, .95, 0), box(2.3, .75, 1.95, c, -.25, 1.75, 0), box(2.35, .55, 1.98, '#2b3d4f', -.25, 1.75, 0), box(2.0, .06, 1.99, c, -.25, 2.12, 0),
    box(.1, .25, .45, '#fff4c2', 2.16, 1.05, .65), box(.1, .25, .45, '#fff4c2', 2.16, 1.05, -.65), box(.1, .25, .45, '#b3261e', -2.16, 1.05, .65), box(.1, .25, .45, '#b3261e', -2.16, 1.05, -.65)];
  for (const x of [-1.35, 1.4]) p.push(wheel(x, 1.0, .46), wheel(x, -1.0, .46));
  return mergeGeometries(p);
}
function truck() {
  const p = [box(2, 2.2, 2.5, '#c0392b', 2.7, 1.9, 0), box(.1, .9, 2.2, '#2b3d4f', 3.72, 2.4, 0), box(5.2, .4, 2.4, '#333', -1, 1.1, 0),
    paint(new THREE.CylinderGeometry(1.25, 1.25, 5, 12).rotateZ(Math.PI / 2).translate(-1.1, 2.5, 0), '#d9d9d9'), box(.2, 2.55, 2.55, '#e67e22', -1, 2.5, 0)];
  for (const x of [-2.9, -1.5, 2.7]) p.push(wheel(x, 1.2, .65, .5), wheel(x, -1.2, .65, .5));
  return mergeGeometries(p);
}
function okada() { return mergeGeometries([box(1.5, .35, .3, '#8b0000', 0, .75, 0), wheel(.75, 0, .38, .18), wheel(-.75, 0, .38, .18), box(.35, .8, .5, '#0f5132', -.1, 1.35, 0), ball(.27, '#e8e8e8', 0, 2.0, 0), box(.3, .7, .45, '#444', -.65, 1.3, 0), ball(.23, '#4a2f20', -.65, 1.85, 0)]); }
export const VEH = {};
export function vehicle(type) {
  const g = VEH[type] || (VEH[type] = type === 'danfo' ? danfo() : type === 'keke' ? keke() : type === 'truck' ? truck() : type === 'okada' ? okada() : car(type));
  const m = new THREE.Mesh(g, vmat); m.castShadow = true; return m;
}
const randomVehicle = () => { const r = rnd(); return vehicle(r < .34 ? 'danfo' : r < .48 ? 'keke' : r < .56 ? 'okada' : pick(['#c9ced6', '#20252b', '#7d1128', '#1f4e79', '#e9e9e9', '#3d6b4f'])); };

export function ambulance() {
  const g = new THREE.Group();
  const p = [box(5.6, 2.1, 2.6, '#f7f7f5', -.5, 1.85, 0), box(1.5, 1.2, 2.55, '#f7f7f5', 3.0, 1.35, 0), box(.6, .75, 2.4, '#f7f7f5', 2.45, 2.3, 0), box(.12, .85, 2.25, '#24384d', 2.8, 2.35, 0),
    box(5.65, .35, 2.64, '#d62828', -.5, 1.45, 0), box(1.52, .3, 2.58, '#d62828', 3.0, 1.45, 0), box(.1, .3, 1.4, '#d62828', -3.32, 2.1, 0), box(.1, 1.1, .35, '#d62828', -3.33, 2.1, 0),
    box(.1, .3, .5, '#fff4c2', 3.77, 1.05, .8), box(.1, .3, .5, '#fff4c2', 3.77, 1.05, -.8), box(.1, .4, .35, '#b3261e', -3.32, 1.1, 1.0), box(.1, .4, .35, '#b3261e', -3.32, 1.1, -1.0),
    box(.1, .8, .8, '#24384d', -3.31, 2.2, .75), box(.1, .8, .8, '#24384d', -3.31, 2.2, -.75)];
  for (const z of [1.32, -1.32]) p.push(box(1.2, .36, .05, '#1565c0', -.9, 2.25, z), box(.36, 1.2, .05, '#1565c0', -.9, 2.25, z));
  for (const x of [-2.2, 2.5]) p.push(wheel(x, 1.25, .62, .5), wheel(x, -1.25, .62, .5));
  g.add(mesh(p));
  g.lights = [-.75, .75].map((z, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.6, .35, .75), new THREE.MeshBasicMaterial({ color: i ? '#1e66ff' : '#ff2020' })); m.position.set(1.4, 3.1, z); g.add(m); return m; });
  return g;
}

// ---------- people ----------
const SKIN = ['#3b2418', '#4e3020', '#6b432c', '#7d5236'];
const CLOTH = ['#e63946', '#f4a261', '#2a9d8f', '#264653', '#8338ec', '#ffbe0b', '#3a86ff', '#fb5607', '#ffffff', '#06d6a0', '#ef476f', '#7b2d26'];
export function personParts(load = rnd() < .18) {
  const skin = pick(SKIN), top = pick(CLOTH), bottom = pick(['#222831', '#1d3557', '#5c4033', top]), wrap = rnd() < .5;
  const p = [wrap ? cyl(.2, .42, 1.0, bottom, 0, .5, 0) : box(.22, .95, .2, bottom, 0, .48, .15), box(.45, .85, .65, top, 0, 1.4, 0), ball(.27, skin, 0, 2.12, 0), box(.14, .75, .14, skin, 0, 1.4, .42), box(.14, .75, .14, skin, 0, 1.4, -.42)];
  if (!wrap) p.push(box(.22, .95, .2, bottom, 0, .48, -.15));
  if (load) p.push(cyl(.55, .38, .3, '#c68642', 0, 2.5, 0), ball(.22, pick(['#ffb703', '#d00000', '#70e000']), .15, 2.72, .05), ball(.2, pick(['#ffb703', '#70e000']), -.18, 2.7, -.1));
  else if (wrap) p.push(ball(.25, pick(CLOTH), 0, 2.33, 0));
  return p;
}

// ---------- signs ----------
const SIGNS = ['MAMA PUT KITCHEN', 'PROVISIONS STORE', 'PHONE REPAIRS', 'GOD IS GOOD VENTURES', 'RECHARGE CARDS', 'UNISEX SALON', 'CHEMIST', 'COLD DRINKS HERE', 'TAILOR & FASHION', 'BUKA SPOT', 'POS CASH POINT', 'BUILDING MATERIALS', 'BARBING SALOON', 'FRESH BREAD', 'SPARE PARTS', 'SUYA JOINT'];
function atlas() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d');
  const bg = ['#0b5394', '#b71c1c', '#1b5e20', '#f9a825', '#4a148c', '#ffffff', '#e65100', '#006064'];
  SIGNS.forEach((s, i) => { const x = (i % 2) * 512, y = Math.floor(i / 2) * 128, b = bg[i % bg.length];
    g.fillStyle = b; g.fillRect(x, y, 512, 128); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(x + 8, y + 8, 496, 112);
    g.fillStyle = (b === '#ffffff' || b === '#f9a825') ? '#111' : '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let f = 52; do { g.font = `bold ${f--}px Arial`; } while (g.measureText(s).width > 470); g.fillText(s, x + 256, y + 66); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function signGeo(i, w, h) {
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, ((i % 2) + uv.getX(k)) / 2, 1 - (Math.floor(i / 2) + 1 - uv.getY(k)) / 8);
  return g;
}
export function billboard(text, w, h, bg = '#10314f', fg = '#fff') {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w); const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(14, 14, c.width - 28, c.height - 28);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; let f = c.height * .55; do { g.font = `bold ${f--}px Arial`; } while (g.measureText(text).width > 940); g.fillText(text, 512, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
}

// ---------- roads ----------
export const roads = {};
for (const [id, e] of Object.entries(D.edges)) {
  if (id.endsWith('r')) continue;
  const pts = [D.nodes[e.a], ...e.via, D.nodes[e.b]].map(p => W(...p));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const n = Math.ceil(curve.getLength() / 2);
  roads[id] = { curve, pts: curve.getSpacedPoints(n), len: curve.getLength(), cls: e.cls };
}
const samples = Object.values(roads).flatMap(r => r.pts);
export const roadDist = p => { let m = 1e9; for (const q of samples) { const d = (p.x - q.x) ** 2 + (p.z - q.z) ** 2; if (d < m) m = d; } return Math.sqrt(m); };
export const at = (r, s, off = 0) => { const u = Math.min(1, Math.max(0, s / r.len)), p = r.curve.getPointAt(u), t = r.curve.getTangentAt(u); return { p: p.add(new THREE.Vector3(-t.z * off, 0, t.x * off)), t, yaw: Math.atan2(-t.z, t.x) }; };

function ribbon(r, o0, o1, y, color, dash = 0) {
  const v = []; const n = Math.ceil(r.len / (dash ? 2.5 : 2));
  for (let i = 0; i < n; i++) {
    if (dash && i % 3 === 2) continue;
    const s0 = i / n * r.len, s1 = (i + (dash ? .8 : 1)) / n * r.len;
    const a = at(r, s0, o0).p, b = at(r, s0, o1).p, c = at(r, s1, o0).p, d = at(r, s1, o1).p;
    for (const q of [a, b, c, b, d, c]) v.push(q.x, y, q.z);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
  const nrm = g.attributes.normal; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
  return paint(g, color);
}

// ---------- scene ----------
export function buildWorld(scene) {
  const cells = new Map(), signCells = new Map();
  const add = (map, p, g) => { const k = `${Math.floor(p.x / 90)},${Math.floor(p.z / 90)}`; (map.get(k) || map.set(k, []).get(k)).push(g); };
  const place = (parts, p, yaw = 0) => { const g = mergeGeometries(parts); g.rotateY(yaw).translate(p.x, p.y, p.z); add(cells, p, g); };

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#b89a72' }));
  ground.position.y = -.08; ground.receiveShadow = true; scene.add(ground);
  // lagoon to the south-east
  const lg = new THREE.Shape([[700, 905], [900, 830], [1080, 800], [1260, 740], [1420, 560], [1500, 330], [1750, 330], [1750, 1200], [600, 1200], [600, 960]].map(([x, y]) => { const q = W(x, y); return new THREE.Vector2(q.x, -q.z); }));
  const lagoon = new THREE.Mesh(new THREE.ShapeGeometry(lg).rotateX(-Math.PI / 2), new THREE.MeshPhongMaterial({ color: '#3f86a8', shininess: 90 })); lagoon.position.y = -.03; scene.add(lagoon);
  const inLagoon = p => { const x = p.x / SCALE + 700, y = p.z / SCALE + 510; return (x > 1420 && y > 330) || (x > 700 && y > 905 - (x - 700) * .5 && y > 760) || (x > 1260 && y > 740 - (x - 1260)); };

  Object.values(roads).forEach((r, i) => {
    const y = .02 + (i % 12) * .003, w = r.cls === 'link' ? 5.5 : ROAD_W / 2;
    add(cells, r.pts[0], ribbon(r, -w - 2.6, w + 2.6, y - .015, '#a8825a'));
    add(cells, r.pts[0], ribbon(r, -w, w, y + .04, '#3b3d42'));
    add(cells, r.pts[0], ribbon(r, -.18, .18, y + .09, '#f2c230', 1));
    for (const s of [-1, 1]) add(cells, r.pts[0], ribbon(r, s * (w - .5) - .12, s * (w - .5) + .12, y + .085, '#dcdcdc'));
  });
  for (const [x, y] of Object.values(D.nodes)) { const p = W(x, y); add(cells, p, paint(new THREE.CircleGeometry(7.6, 28).rotateX(-Math.PI / 2).translate(p.x, .105, p.z), '#3b3d42')); }

  // ---- occupancy grid so buildings never overlap ----
  const taken = [];
  const free = (p, r) => !inLagoon(p) && roadDist(p) > ROAD_W / 2 + 2.2 + r && taken.every(t => (t.p.x - p.x) ** 2 + (t.p.z - p.z) ** 2 > (t.r + r) ** 2 * .8);
  const claim = (p, r) => taken.push({ p, r });
  // reserved plots for landmarks
  for (const [x, y, r] of [[1385, 235, 34], [262, 480, 22], [280, 600, 20], [80, 275, 36], [30, 805, 36], [330, 440, 12]]) claim(W(x, y), r);

  const WALL = ['#e8d5b5', '#d98e73', '#9cc3d5', '#f1e3a4', '#c7d6a2', '#e6a5a1', '#f4f1ea', '#b9a6c9'];
  const ROOF = ['#8c4a32', '#7b8794', '#a33b2a', '#5e6b73', '#946b47'];
  function shop(p, yaw) {
    const w = range(5.5, 8), h = range(3.2, 4), c = pick(WALL), aw = pick(CLOTH);
    const parts = [box(w, h, 4.6, c, 0, h / 2, -.4), box(w + .6, .35, 5.6, pick(ROOF), 0, h + .15, -.2), box(w * .32, 2.3, .15, '#3a2a1f', -w * .22, 1.15, 1.93), box(w * .34, 1.2, .15, '#24384d', w * .2, 1.7, 1.93),
      box(w, .14, 2.0, aw, 0, 2.85, 2.8), box(.14, 2.8, .14, '#555', -w / 2 + .2, 1.4, 3.7), box(.14, 2.8, .14, '#555', w / 2 - .2, 1.4, 3.7), box(w * .45, .8, .8, '#8d6e4f', w * .18, .4, 3.0)];
    for (let i = 0; i < 6; i++) parts.push(ball(.24, pick(CLOTH), w * .0 + i * .45, 1.0, 3.0));
    place(parts, p, yaw);
    const s = signGeo(Math.floor(rnd() * SIGNS.length), w * .92, w * .92 / 4); s.translate(0, h + 1.05, 2.2).rotateY(yaw).translate(p.x, 0, p.z); add(signCells, p, s);
  }
  function house(p, yaw) {
    const w = range(6, 10), floors = 1 + Math.floor(rnd() * rnd() * 4), h = floors * 3, c = pick(WALL);
    const parts = [box(w, h, 6, c, 0, h / 2, 0), rnd() < .5 ? paint(new THREE.ConeGeometry(w * .75, 2.2, 4).rotateY(Math.PI / 4).scale(1, 1, 6 / w).translate(0, h + 1.1, 0), pick(ROOF)) : box(w + .4, .4, 6.4, '#8d8d8d', 0, h + .2, 0)];
    if (parts.length && rnd() < .5) parts.push(cyl(.8, .8, 1.4, '#222', w * .25, h + 1.4, 0));
    for (let f = 0; f < floors; f++) for (let x = -w / 2 + 1.2; x < w / 2 - .8; x += 2.1) parts.push(box(1.1, 1.2, .15, '#2e4256', x, f * 3 + 1.7, 3.02), box(1.1, 1.2, .15, '#2e4256', x, f * 3 + 1.7, -3.02));
    place(parts, p, yaw);
  }
  function kiosk(p, yaw) {
    const c = pick(CLOTH);
    place([cyl(.08, .08, 2.8, '#666', 0, 1.4, 0), paint(new THREE.ConeGeometry(2.0, .8, 8).translate(0, 3.0, 0), c), box(2.2, .9, 1.1, '#9c7a55', 0, .45, .5), ...[-.7, -.2, .3, .8].map(x => ball(.25, pick(['#ffb703', '#d00000', '#70e000', '#fb8500']), x, 1.1, .5)), ...personParts(false).map(g => g.translate(0, 0, -.8).rotateY(0))], p, yaw);
  }
  function palm(p) {
    const h = range(5, 8.5), parts = [cyl(.18, .35, h, '#7a5c3e', 0, h / 2, 0)];
    for (let i = 0; i < 6; i++) parts.push(paint(new THREE.ConeGeometry(.55, 3.6, 4).rotateZ(-Math.PI / 2 - .35).translate(1.65, h - .2, 0).rotateY(i * 1.047), '#2f7d32'));
    place(parts, p);
  }
  function tree(p) { const h = range(2, 3.2); place([cyl(.25, .35, h, '#6d4c33', 0, h / 2, 0), ball(range(1.6, 2.6), pick(['#3f7d3a', '#528f3f', '#2e6b35']), 0, h + 1.2, 0)], p); }

  // roadside frontage
  for (const r of Object.values(roads)) {
    for (const side of [-1, 1]) {
      for (let s = 6; s < r.len - 4; s += range(6.5, 9)) {
        const k = rnd();
        const off = side * (ROAD_W / 2 + (k < .5 ? 8.2 : k < .75 ? 6 : 8));
        const q = at(r, s, off), yaw = Math.atan2(r.curve.getPointAt(s / r.len).x - q.p.x, r.curve.getPointAt(s / r.len).z - q.p.z);
        const rad = k < .5 ? 4.2 : k < .75 ? 2 : 5;
        if (!free(q.p, rad)) continue;
        claim(q.p, rad);
        (k < .5 ? shop : k < .65 ? kiosk : k < .75 ? palm : house)(q.p, yaw);
        if (rnd() < .65) { // people at the frontage
          const n = 1 + Math.floor(rnd() * 3);
          for (let i = 0; i < n; i++) { const a = at(r, s + range(-3, 3), side * (ROAD_W / 2 + range(.9, 2.4))); if (roadDist(a.p) > ROAD_W / 2 + .5) place(personParts(), a.p, rnd() * 6.28); }
        }
      }
      for (let s = 20; s < r.len - 10; s += 34) { // power poles and wires
        const a = at(r, s, side > 0 ? ROAD_W / 2 + 3 : 999); if (side < 0 || roadDist(a.p) < ROAD_W / 2 + 2) continue;
        place([cyl(.14, .2, 9, '#6b5b4b', 0, 4.5, 0), box(.15, .15, 2.4, '#4b3f35', 0, 8.6, 0)], a.p, a.yaw);
        if (s + 34 < r.len - 10) { const b = at(r, s + 34, ROAD_W / 2 + 3).p, m = a.p.clone().add(b).multiplyScalar(.5), len = a.p.distanceTo(b); add(cells, m, box(len, .04, .04, '#222').rotateY(Math.atan2(-(b.z - a.p.z), b.x - a.p.x)).translate(m.x, 8.55, m.z)); }
      }
    }
  }
  // dense city fill behind the frontage
  for (let i = 0; i < 9000; i++) {
    const p = W(range(-80, 1560), range(80, 940)), k = rnd(), rad = k < .72 ? 5.2 : 2.4;
    if (!free(p, rad)) continue;
    claim(p, rad);
    if (k < .72) house(p, Math.floor(rnd() * 4) * 1.5708 + range(-.2, .2)); else if (k < .86) tree(p); else palm(p);
  }

  // ---- landmarks ----
  const sign = (text, mx, my, w, h, y, yaw, bg, fg) => { const b = billboard(text, w, h, bg, fg); const p = W(mx, my); b.position.set(p.x, y, p.z); b.rotation.y = yaw; scene.add(b); return b; };
  const post = (mx, my, h) => place([cyl(.25, .25, h, '#555', 0, h / 2, 0)], W(mx, my));
  // Ikeja base
  place([box(24, 8, 14, '#f4f1ea', 0, 4, 0), box(25, .6, 15, '#1565c0', 0, 8.2, 0), box(5, 4, .3, '#333', -6, 2, 7.1), box(5, 4, .3, '#333', 2, 2, 7.1)], W(1390, 225), -1.2);
  sign('IKEJA EMS BASE', 1362, 238, 16, 3.2, 10.5, -1.2);
  post(1215, 215, 6); sign('IKEJA', 1215, 215, 8, 2.2, 7, Math.PI / 2, '#1b5e20');
  post(1000, 468, 6); sign('MUSHIN', 1000, 468, 9, 2.2, 7, Math.PI / 2, '#1b5e20');
  // Oshodi: flyover and sign
  const op = W(335, 520);
  place([box(7, 1.2, 150, '#9a9a9a', 0, 11, 0), box(.4, 1.2, 150, '#c4c4c4', 3.4, 12, 0), box(.4, 1.2, 150, '#c4c4c4', -3.4, 12, 0), ...[-68, -45, 45, 68].map(z => box(2.5, 11, 2.5, '#8d8d8d', 0, 5.5, z))], new THREE.Vector3(op.x, 0, op.z), 0);
  sign('OSHODI', 338, 520, 14, 3, 12.2, Math.PI / 2, '#1b5e20');
  // hospitals
  for (const [id, mx, my, name] of [['H1', 80, 278, 'MERCY POINT HOSPITAL'], ['H2', 22, 800, 'LAGOON VIEW HOSPITAL']]) {
    const p = W(mx, my), n = W(...D.nodes[id]), yaw = Math.atan2(n.x - p.x, n.z - p.z);
    place([box(30, 13, 12, '#fbfbf8', 0, 6.5, -3), box(31, .6, 13, '#2a9d8f', 0, 13.3, -3), box(10, 5, 4, '#e8eef0', 0, 2.5, 4.5), box(1.4, 5, .3, '#d62828', 0, 9.5, 3.1), box(5, 1.4, .3, '#d62828', 0, 9.5, 3.1),
      ...[-12, -8.5, -5, 5, 8.5, 12].flatMap(x => [2.5, 6, 9.5].map(y => box(2, 1.8, .2, '#3b6a8a', x, y, 3.05)))], p, yaw);
    const b = billboard(name, 24, 3.2, '#ffffff', '#b71c1c'); b.position.set(p.x + Math.sin(yaw) * 3.6, 15.8, p.z + Math.cos(yaw) * 3.6); b.rotation.y = yaw; scene.add(b);
  }
  // roadside billboards
  for (const [id, f, text, c] of [['A1', .5, 'DRIVE SAFE, ARRIVE ALIVE', '#b71c1c'], ['A2', .45, 'EKO ONI BAJE', '#006064'], ['B2', .5, 'KEEP LAGOS CLEAN', '#1b5e20'], ['C2', .4, 'GIVE WAY TO AMBULANCES', '#4a148c']]) {
    const a = at(roads[id], roads[id].len * f, ROAD_W / 2 + 4); const b = billboard(text, 15, 3.6, c); b.position.set(a.p.x, 8, a.p.z); b.rotation.y = a.yaw - Math.PI / 2; scene.add(b);
    place([cyl(.2, .2, 7, '#555', 0, 3.5, 5), cyl(.2, .2, 7, '#555', 0, 3.5, -5)], a.p, a.yaw - Math.PI / 2);
  }

  for (const list of cells.values()) scene.add(mesh(list));
  const sm = new THREE.MeshBasicMaterial({ map: atlas(), side: THREE.DoubleSide });
  for (const list of signCells.values()) scene.add(new THREE.Mesh(mergeGeometries(list), sm));
}

// ---------- accident scene ----------
export function accident(scene) {
  const n = W(...D.nodes.OSH), g = new THREE.Group(); g.position.set(n.x - 5, 0, n.z - 17); scene.add(g);
  const a = vehicle('#7d1128'); a.position.set(-2.5, 0, 0); a.rotation.y = .5; const b = vehicle('danfo'); b.position.set(2.8, .2, -2.2); b.rotation.set(.12, 2.4, 0); g.add(a, b);
  const victim = mesh([box(1.1, .35, .65, '#3a86ff', 0, .3, 0), ball(.28, '#4e3020', .9, .3, 0), box(1, .25, .5, '#222', -1.1, .25, 0), box(2.8, .08, 1.4, '#ffffff', 0, .1, 0)]); victim.position.set(1, 0, 4); g.add(victim);
  for (let i = 0; i < 16; i++) { const p = mesh(personParts(false)); const ang = -2.6 + i * .34; p.position.set(1 + Math.cos(ang) * range(5, 7.5), 0, 3 - Math.abs(Math.sin(ang)) * range(4, 7)); p.rotation.y = rnd() * 6; g.add(p); }
  for (let i = 0; i < 5; i++) { const c = mesh([paint(new THREE.ConeGeometry(.4, 1.1, 8).translate(0, .55, 0), '#ff6d00')]); c.position.set(-6 + i * 3, 0, 7); g.add(c); }
  return { group: g, victim };
}

// ---------- traffic and hazards for one mission ----------
export function traffic(scene, cond) {
  const group = new THREE.Group(); scene.add(group); const movers = [], smoke = [];
  seed = 99;
  for (const [id, r] of Object.entries(roads)) {
    const c = cond[id], w = r.cls === 'link' ? 5.5 : ROAD_W / 2, margin = r.len < 90 ? 12 : 22;
    const put = (m, s, off, flip) => { const a = at(r, s, off); m.position.copy(a.p); m.rotation.y = a.yaw + (flip ? Math.PI : 0); group.add(m); return m; };
    if (c === 1) { // jam: both outer lanes packed, an emergency corridor stays open near the centre
      for (const side of [1, -1]) for (let s = margin; s < r.len - margin; s += range(6.2, 8)) { const m = put(randomVehicle(), s, side * Math.min(w - 1.2, 4.9), side < 0); movers.push({ m, r, s, off: side * Math.min(w - 1.2, 4.9), v: .35 * side, creep: true }); }
      for (let s = margin; s < r.len - margin; s += range(11, 20)) { const a = at(r, s, (rnd() < .5 ? 1 : -1) * (w + .7)); const p = mesh(personParts(true)); p.position.copy(a.p); p.rotation.y = rnd() * 6; group.add(p); }
    } else {
      for (let s = margin; s < r.len - margin; s += range(30, 55)) { const m = randomVehicle(); group.add(m); movers.push({ m, r, s, off: -3.3, v: -range(5, 9), lo: margin, hi: r.len - margin }); }
      for (let s = margin + 10; s < r.len - margin; s += range(38, 70)) put(randomVehicle(), s, w + .9, false);
    }
    if (c === 2) { // blockage: overturned tanker, debris, cones, crowd and smoke
      const s = r.len * .56, t = vehicle('truck'), a = at(r, s, .8); t.position.copy(a.p); t.position.y = 1.2; t.rotation.set(1.45, a.yaw + 1.15, 0, 'YXZ'); group.add(t);
      put(vehicle('#20252b'), s + 5, -3, true).rotation.y += .7;
      for (let i = 0; i < 9; i++) { const q = put(mesh([paint(new THREE.ConeGeometry(.45, 1.2, 8).translate(0, .6, 0), '#ff6d00')]), s - 7 - Math.abs(i - 4) * .8, (i - 4) * 1.25, false); q.rotation.y = 0; }
      for (let i = 0; i < 26; i++) { const m = mesh([box(range(.3, 1), range(.2, .5), range(.3, 1), pick(['#444', '#8a5a2b', '#999']), 0, .2, 0)]); put(m, s + range(-6, 6), range(-w, w), rnd() < .5); }
      for (let i = 0; i < 22; i++) put(mesh(personParts()), s + range(-9, 9), (rnd() < .5 ? 1 : -1) * (w + range(.5, 2)), rnd() < .5);
      for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: '#4a4a4a', transparent: true, opacity: .5, depthWrite: false })); group.add(m); smoke.push({ m, p: at(r, s, .8).p, k: i / 12 }); }
    }
  }
  // pedestrians walking the verges
  const walkers = [];
  for (const r of Object.values(roads)) for (let s = 8; s < r.len - 8; s += range(9, 17)) { const side = rnd() < .5 ? 1 : -1, off = side * ((r.cls === 'link' ? 5.5 : ROAD_W / 2) + range(.8, 2.2)); const m = mesh(personParts()); m.castShadow = false; group.add(m); walkers.push({ m, r, s, off, v: range(-1.6, 1.6) }); }
  return {
    group,
    update(t, ambPos) {
      for (const o of movers) {
        const s = o.creep ? o.s + o.v * Math.sin(t * .8 + o.s) : o.lo + ((((o.s - o.lo + o.v * t) % (o.hi - o.lo)) + (o.hi - o.lo)) % (o.hi - o.lo));
        const a = at(o.r, s, o.off); o.m.position.copy(a.p); o.m.rotation.y = a.yaw + (o.off < 0 ? Math.PI : 0);
        o.m.visible = !(ambPos && o.m.position.distanceTo(ambPos) < 4.2);
      }
      for (const o of walkers) { const s = ((o.s + o.v * t) % o.r.len + o.r.len) % o.r.len, a = at(o.r, s, o.off); o.m.position.set(a.p.x, Math.abs(Math.sin(t * 6 + o.s)) * .1, a.p.z); o.m.rotation.y = a.yaw + (o.v < 0 ? Math.PI : 0); o.m.visible = roadDist(a.p) > 5; }
      for (const o of smoke) { const k = (o.k + t * .13) % 1; o.m.position.set(o.p.x + k * 5, 2 + k * 15, o.p.z + Math.sin(o.k * 20) * 1.5); o.m.scale.setScalar(.7 + k * 3); o.m.material.opacity = .55 * (1 - k); }
    },
  };
}
