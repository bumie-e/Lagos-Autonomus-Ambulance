// Video composer: intro flyover, side-by-side mission replay, results card.
import * as THREE from 'three';
import D from './data.js';
import { W, roads, at, buildWorld, accident, traffic, ambulance, ROAD_W } from './world.js';

const q = new URLSearchParams(location.search), DEMO = q.get('demo') || 'main';
const M = D.demos[DEMO];
const FPS = 30, SPM = 1.7;                 // video seconds per simulated minute
const WIDTH = 1920, HEIGHT = 1080, PW = 957;
const COL = { A: '#c4455a', B: '#00798c' }, ROUTE = { A: '#3b8de0', B: '#3f9457', C: '#eb9a3c' };
const KIND = { A: 'Certainty', B: 'Belief' };
const INK = '#1f2a37', CARD = 'rgba(255,255,255,.9)';

const gl = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
gl.setSize(WIDTH, HEIGHT); gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
const out = document.getElementById('out'); out.width = WIDTH; out.height = HEIGHT; const g = out.getContext('2d');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#bcdcee'); scene.fog = new THREE.Fog('#d9e6ea', 130, 520);
scene.add(new THREE.HemisphereLight('#dcefff', '#8a6f4d', 1.55));
const sun = new THREE.DirectionalLight('#fff0d0', 1.9); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 400 }); sun.shadow.bias = -.0008; scene.add(sun, sun.target);
buildWorld(scene);
const acc = accident(scene);
const cars = traffic(scene, M.cond);
const amb = { A: ambulance(), B: ambulance() }; scene.add(amb.A, amb.B);

// ---------- ambulance path: distance along route as a function of simulated minutes ----------
function track(k) {
  const run = M[k], pts = [], dist = [], knots = []; let total = 0;
  const push = p => { if (pts.length) total += p.distanceTo(pts[pts.length - 1]); pts.push(p); dist.push(total); };
  for (const st of run.steps) {
    const rev = st.edge.endsWith('r'), r = roads[D.edges[st.edge].seg], n = Math.ceil(r.len), start = total;
    const lane = st.cond === 1 ? .35 : st.cond === 2 ? 1.5 : 2.9;
    for (let i = 0; i <= n; i++) {
      const f = i / n, u = rev ? 1 - f : f, ease = Math.min(1, f * r.len / 14, (1 - f) * r.len / 14);
      let off = 1.5 + (lane - 1.5) * ease;
      if (st.cond === 2) { const x = (f - (rev ? .44 : .56)) * r.len; off += 4.6 * Math.exp(-((x / 9) ** 2)); } // swerve round the wreck on the shoulder
      const a = at(r, u * r.len, rev ? -off : off); push(a.p);
    }
    const end = total, L = end - start, dt = st.t1 - st.t0;
    if (st.cond === 2) { const bf = (rev ? .44 : .56), lost = 14; knots.push([st.t0, start], [st.t0 + (dt - lost) * bf, start + L * (bf - .13)], [st.t0 + (dt - lost) * bf + lost * .93, start + L * (bf - .06)], [st.t1, end]); }
    else knots.push([st.t0, start], [st.t1, end]);
  }
  const lerp = (xs, ys, x) => { if (x <= xs[0]) return ys[0]; let lo = 0, hi = xs.length - 1; if (x >= xs[hi]) return ys[hi]; while (hi - lo > 1) { const m = (lo + hi) >> 1; xs[m] <= x ? lo = m : hi = m; } return ys[lo] + (ys[hi] - ys[lo]) * (x - xs[lo]) / ((xs[hi] - xs[lo]) || 1); };
  const kt = knots.map(v => v[0]), kd = knots.map(v => v[1]);
  const point = d => {
    if (d < 0) return pts[0].clone().addScaledVector(pts[1].clone().sub(pts[0]).normalize(), d);
    if (d > total) return pts[pts.length - 1].clone().addScaledVector(pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize(), d - total);
    let lo = 0, hi = dist.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; dist[m] <= d ? lo = m : hi = m; }
    return pts[lo].clone().lerp(pts[hi], (d - dist[lo]) / ((dist[hi] - dist[lo]) || 1));
  };
  const smooth = (d, w) => { const v = new THREE.Vector3(); for (let i = -4; i <= 4; i++) v.add(point(d + i * w / 4)); return v.divideScalar(9); };
  return { run, dAt: t => lerp(kt, kd, t), point, smooth };
}
const tr = { A: track('A'), B: track('B') };

// ---------- timeline: a short pause at dispatch, then one shared sim clock ----------
const END = Math.max(M.A.total, M.B.total);
const START = 1.5, INTRO = 7, MISSION = START + END * SPM + 3, OUTRO = 8;
const simAt = v => Math.min(END, Math.max(0, (v - START) / SPM));
window.TOTAL = Math.ceil((INTRO + MISSION + OUTRO) * FPS); window.FPS = FPS;

// ---------- drawing helpers ----------
const cam = new THREE.PerspectiveCamera(62, PW / HEIGHT, .4, 3000);
const rr = (x, y, w, h, r, fill) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); };
const text = (s, x, y, size, color = '#fff', weight = 'bold', align = 'left') => { g.font = `${weight} ${size}px Helvetica, Arial`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); };
const clock = m => `${String(Math.floor(m)).padStart(2, '0')}:${String(Math.floor((m % 1) * 60)).padStart(2, '0')}`;

function render(camera, x, y, w, h) {
  camera.aspect = w / h; camera.updateProjectionMatrix();
  gl.setViewport(0, 0, w, h); gl.setScissor(0, 0, w, h); gl.setScissorTest(true); gl.render(scene, camera);
  g.drawImage(gl.domElement, 0, HEIGHT - h, w, h, x, y, w, h);
}

function minimap(x, y, w, h, k, s) {
  rr(x, y, w, h, 16, CARD);
  const sc = Math.min(w / 1400, h / 640), P = ([mx, my]) => [x + w / 2 + (mx - 690) * sc, y + h / 2 + (my - 510) * sc];
  const M2 = p => P([p.x / .6 + 700, p.z / .6 + 510]);
  g.lineCap = g.lineJoin = 'round';
  const line = (pts, color, width) => { g.strokeStyle = color; g.lineWidth = width; g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](...M2(p))); g.stroke(); };
  for (const [id, r] of Object.entries(roads)) { const c = ROUTE[D.edges[id].cls]; line(r.pts, c || '#c3c8ce', c ? 5 : 3); }
  for (const st of tr[k].run.steps.filter(st => st.t0 <= s)) { // road driven so far
    const r = roads[D.edges[st.edge].seg], pts = st.edge.endsWith('r') ? [...r.pts].reverse() : r.pts, f = Math.min(1, (s - st.t0) / (st.t1 - st.t0));
    line(pts.slice(0, Math.max(2, Math.round(f * pts.length))), INK, 4);
  }
  const full = !M.h1_open && s >= M[k].response;
  for (const [n, name, dx, dy, al] of [['IKJ', 'Ikeja', 4, -17, 'center'], ['OSH', 'Oshodi', 0, -19, 'center'], ['H1', full ? 'Mercy Point (full)' : 'Mercy Point', -8, -17, 'left'], ['H2', 'Lagoon View', -8, 18, 'left']]) {
    const [px, py] = P(D.nodes[n]);
    if (n[0] === 'H') { rr(px - 8, py - 8, 16, 16, 3, '#d64545'); text('+', px, py + 1, 17, '#fff', 'bold', 'center'); } else rr(px - 6, py - 6, 12, 12, 6, INK);
    text(name, px + dx, py + dy, 15, INK, 'bold', al);
  }
  for (const [l, mx, my] of [['A', 760, 285], ['B', 880, 485], ['C', 930, 695]]) { const [a, b] = P([mx, my]); text(l, a, b, 17, ROUTE[l], 'bold', 'center'); }
  const [ax, ay] = M2(tr[k].point(tr[k].dAt(s)));
  g.beginPath(); g.arc(ax, ay, 10, 0, 7); g.fillStyle = COL[k]; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
}

function status(k, s) {
  const r = M[k];
  if (s >= r.total - .01) return ['At hospital', '#1b7f4b'];
  if (s >= r.response - .01 && s < r.response + D.scene_min) return ['Loading patient', '#6a4c93'];
  return ['En route', INK];
}

function panel(k, x, s, vt) {
  const r = M[k], t = tr[k], d = t.dAt(s);
  const pos = t.point(d), dir = t.smooth(d + 3, 4).sub(t.smooth(d - 3, 4)).normalize(), yaw = Math.atan2(-dir.z, dir.x);
  amb.A.visible = k === 'A'; amb.B.visible = k === 'B';
  const me = amb[k]; me.position.copy(pos); me.rotation.y = yaw;
  const flash = Math.floor(vt * 3) % 2; me.lights[0].material.color.set(flash ? '#ff2020' : '#4a0a0a'); me.lights[1].material.color.set(flash ? '#0a1a4a' : '#2f7bff');
  acc.victim.visible = s < r.response + D.scene_min * .7;
  cars.update(vt, pos);
  sun.position.set(pos.x + 60, 110, pos.z + 40); sun.target.position.copy(pos);
  // forward-facing chase camera that trails along the driven path
  const fwd = t.smooth(d + 8, 8).sub(t.smooth(d - 8, 8)).normalize();
  cam.fov = 60; const back = t.smooth(d - 13, 7); const behind = pos.clone().sub(back).setY(0).normalize().lerp(fwd, .35).normalize();
  cam.position.copy(pos).addScaledVector(behind, -17).setY(8); cam.lookAt(pos.clone().addScaledVector(fwd, 14).setY(2.8));
  render(cam, x, 0, PW, HEIGHT);

  rr(x + 22, 22, 250, 58, 14, CARD);
  text(`Agent ${k}`, x + 42, 52, 28, INK);
  text(KIND[k], x + 254, 52, 21, COL[k], 'bold', 'right');
  rr(x + 22, 92, 150, 58, 14, CARD);
  text(clock(Math.min(s, r.total)), x + 97, 122, 34, INK, 'bold', 'center');
  minimap(x + PW - 462, 22, 440, 230, k, s);
  const [msg, c] = status(k, s); g.font = 'bold 26px Helvetica'; const mw = g.measureText(msg).width + 44;
  rr(x + (PW - mw) / 2, HEIGHT - 82, mw, 54, 27, CARD); text(msg, x + PW / 2, HEIGHT - 54, 26, c, 'bold', 'center');
}

function missionFrame(v) {
  const s = simAt(v);
  g.fillStyle = '#f2efe9'; g.fillRect(0, 0, WIDTH, HEIGHT);
  panel('A', 0, s, v); panel('B', WIDTH - PW, s, v);
}

const proj = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 1, 4000);
function label(mx, my, s, color, camera, y = 14) { const p = W(mx, my).setY(y).project(camera); if (p.z > 1) return; const x = (p.x + 1) / 2 * WIDTH, yy = (1 - p.y) / 2 * HEIGHT; g.font = 'bold 26px Helvetica'; const w = g.measureText(s).width + 32; rr(x - w / 2, yy - 22, w, 44, 22, CARD); text(s, x, yy + 1, 26, color, 'bold', 'center'); }
const ribbons = new THREE.Group();
for (const [id, r] of Object.entries(roads)) { if (!/^[ABC]\d/.test(id)) continue; const m = new THREE.Mesh(new THREE.TubeGeometry(r.curve, 80, 3.2, 6), new THREE.MeshBasicMaterial({ color: ROUTE[id[0]], transparent: true, opacity: .85, fog: false })); m.position.y = 1.5; m.scale.y = .35; ribbons.add(m); }
scene.add(ribbons);

function introFrame(v) {
  const f = v / INTRO, e = f * f * (3 - 2 * f);
  amb.A.visible = true; amb.B.visible = false; amb.A.position.copy(tr.A.point(0)); const dd = tr.A.point(5).sub(tr.A.point(0)); amb.A.rotation.y = Math.atan2(-dd.z, dd.x);
  acc.victim.visible = true; cars.update(v, null); ribbons.visible = true;
  scene.fog.near = 800; scene.fog.far = 2200; sun.castShadow = false;
  proj.position.set(150 - 170 * e, 640 - 90 * e, 500 - 40 * e); proj.lookAt(-25 - 15 * e, 0, 5);
  render(proj, 0, 0, WIDTH, HEIGHT);
  label(...D.nodes.IKJ, 'Ikeja', INK, proj, 22); label(...D.nodes.OSH, 'Oshodi', '#b71c1c', proj, 24);
  label(...D.nodes.H1, 'Mercy Point', '#2a6f6a', proj, 22); label(...D.nodes.H2, 'Lagoon View', '#2a6f6a', proj, 22);
  if (v > 1.5) { label(760, 330, 'Route A', ROUTE.A, proj, 18); label(900, 535, 'Route B', ROUTE.B, proj, 18); label(930, 645, 'Route C', ROUTE.C, proj, 18); }
  rr(40, 36, 700, 88, 20, CARD);
  text(DEMO === 'main' ? 'Emergency call from Oshodi' : 'A second emergency call', 76, 81, 40, INK);
  text('Simulation', 44, HEIGHT - 34, 22, INK, 'normal');
  scene.fog.near = 130; scene.fog.far = 520; sun.castShadow = true; ribbons.visible = false;
}

function outroFrame(v) {
  g.fillStyle = '#f2efe9'; g.fillRect(0, 0, WIDTH, HEIGHT);
  const R = D.results;
  text(`Results over ${R.n.toLocaleString('en-US')} simulated missions`, 960, 220, 46, INK, 'bold', 'center');
  const cols = [1070, 1440];
  ['Agent A', 'Agent B'].forEach((s, i) => text(s, cols[i], 360, 34, [COL.A, COL.B][i], 'bold', 'center'));
  [['Mean time to victim (min)', a => a.response_mean.toFixed(1)], ['Mean time to hospital (min)', a => a.total_mean.toFixed(1)], ['Victim wait over 25 min', a => (a.late_25 * 100).toFixed(1) + '%']].forEach(([n, fn], r) => {
    const y = 450 + r * 110; rr(310, y - 46, 1300, 92, 18, '#fff'); text(n, 360, y, 32, INK, 'normal');
    ['certainty', 'belief'].forEach((a, i) => text(fn(R.agents[a]), cols[i], y, 40, INK, 'bold', 'center'));
  });
}

window.frame = i => {
  const v = i / FPS;
  g.clearRect(0, 0, WIDTH, HEIGHT);
  if (v < INTRO) introFrame(v); else if (v < INTRO + MISSION) { ribbons.visible = false; missionFrame(v - INTRO); } else outroFrame(v - INTRO - MISSION);
  return out.toDataURL('image/jpeg', .93);
};
ribbons.visible = false;
window.READY = true;
