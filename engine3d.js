/* =========================================================
   engine3d.js — mini-motor 3D pe canvas 2D
   Fizica distractivă · fără biblioteci externe, fără WebGL
   Proiecție perspectivă + sortare după adâncime + umbrire Lambert
   ========================================================= */

const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
};

const LIGHT = V3.norm([-0.45, -1, -0.38]);   // direcția luminii (de sus-stânga-față)

/* ---------- camera orbitală ---------- */
class Cam {
  constructor(opt = {}) {
    this.yaw = opt.yaw !== undefined ? opt.yaw : -0.62;
    this.pitch = opt.pitch !== undefined ? opt.pitch : 0.42;
    this.dist = opt.dist || 560;
    this.target = opt.target || [0, 0, 0];
    this.f = opt.f || 760;
    this.home = { yaw: this.yaw, pitch: this.pitch, dist: this.dist };
  }
  reset() { this.yaw = this.home.yaw; this.pitch = this.home.pitch; this.dist = this.home.dist; }
  /* punct lume -> spațiu cameră [x, y, adâncime] */
  toCam(p) {
    const dx = p[0] - this.target[0], dy = p[1] - this.target[1], dz = p[2] - this.target[2];
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const y1 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp;
    return [x1, y1, this.dist - z2];
  }
  /* punct lume -> ecran {x, y, z (adâncime), s (scară)} sau null dacă e în spate */
  project(p, W, H) {
    const c = this.toCam(p);
    if (c[2] < 6) return null;
    const s = this.f / c[2];
    return { x: W / 2 + c[0] * s, y: H / 2 - c[1] * s, z: c[2], s };
  }
}

/* ---------- scenă ---------- */
class Scene {
  constructor() { this.objs = []; this.shadows = []; this.sprites = []; }
  clear() { this.objs.length = 0; this.shadows.length = 0; this.sprites.length = 0; }
  add(mesh) { if (mesh) this.objs.push(mesh); return mesh; }
  /* umbră moale pe sol (plan y = 0) */
  shadow(x, z, rx, rz, alpha) { this.shadows.push({ x, z, rx, rz, a: alpha === undefined ? .18 : alpha }); }
  /* bilă luminoasă 2D (puncte de curent, scântei) */
  sprite(p, r, color, glow) { this.sprites.push({ p, r, color, glow }); }
}

/* ---------- construcție de corpuri ----------
   mesh = { v: [[x,y,z]…], f: [{ i:[idx…], c:[r,g,b], flat?:true, line?:"#rrggbb" }] }  */

function mesh(v, f) { return { v, f }; }

function tx(p, t) {                      // aplică {pos, rotY, rotX, rotZ} unui punct
  let [x, y, z] = p;
  if (t.rotZ) { const c = Math.cos(t.rotZ), s = Math.sin(t.rotZ); [x, y] = [x * c - y * s, x * s + y * c]; }
  if (t.rotX) { const c = Math.cos(t.rotX), s = Math.sin(t.rotX); [y, z] = [y * c - z * s, y * s + z * c]; }
  if (t.rotY) { const c = Math.cos(t.rotY), s = Math.sin(t.rotY); [x, z] = [x * c + z * s, -x * s + z * c]; }
  const o = t.pos || [0, 0, 0];
  return [x + o[0], y + o[1], z + o[2]];
}

/* cutie; skip = listă de fețe de omis: "top","bottom","left","right","front","back" */
function box(w, h, d, t = {}, color = [180, 180, 180], skip = []) {
  const x = w / 2, y = h / 2, z = d / 2;
  const v = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
  [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]].map(p => tx(p, t));
  const all = {
    back: [0, 1, 2, 3], front: [5, 4, 7, 6], left: [4, 0, 3, 7],
    right: [1, 5, 6, 2], top: [3, 2, 6, 7], bottom: [4, 5, 1, 0]
  };
  const f = [];
  for (const k in all) if (!skip.includes(k)) f.push({ i: all[k], c: color });
  return mesh(v, f);
}

/* cilindru de-a lungul axei Y (înainte de transformare) */
function cyl(r, h, t = {}, color = [180, 180, 180], segs = 20, capColor) {
  const v = [], f = [];
  for (let i = 0; i < segs; i++) {
    const a = i / segs * Math.PI * 2;
    v.push(tx([Math.cos(a) * r, -h / 2, Math.sin(a) * r], t));
    v.push(tx([Math.cos(a) * r, h / 2, Math.sin(a) * r], t));
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2, b = ((i + 1) % segs) * 2;
    f.push({ i: [a, b, b + 1, a + 1], c: color });
  }
  const topIdx = [], botIdx = [];
  for (let i = 0; i < segs; i++) { topIdx.push(i * 2 + 1); botIdx.push((segs - 1 - i) * 2); }
  f.push({ i: topIdx, c: capColor || color });
  f.push({ i: botIdx, c: capColor || color });
  return mesh(v, f);
}

/* disc plat orizontal */
function disc(r, t = {}, color = [180, 180, 180], segs = 24) {
  const v = [], idx = [];
  for (let i = 0; i < segs; i++) {
    const a = i / segs * Math.PI * 2;
    v.push(tx([Math.cos(a) * r, 0, Math.sin(a) * r], t)); idx.push(i);
  }
  return mesh(v, [{ i: idx, c: color }]);
}

/* plan dreptunghiular orizontal */
function plane(w, d, t = {}, color = [200, 200, 200]) {
  const x = w / 2, z = d / 2;
  const v = [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z]].map(p => tx(p, t));
  return mesh(v, [{ i: [0, 1, 2, 3], c: color, flat: true }]);
}

/* plan orizontal împărțit în celule — suprafețele mari trebuie subdivizate,
   altfel sortarea după adâncime le desenează peste obiectele mici de deasupra */
function quadGrid(w, d, nx, nz, t = {}, color = [200, 200, 200], flat) {
  const v = [], f = [];
  for (let i = 0; i <= nx; i++)
    for (let k = 0; k <= nz; k++)
      v.push(tx([-w / 2 + i * w / nx, 0, -d / 2 + k * d / nz], t));
  const id = (i, k) => i * (nz + 1) + k;
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++)
      f.push({ i: [id(i, k), id(i + 1, k), id(i + 1, k + 1), id(i, k + 1)], c: color, flat: !!flat });
  return mesh(v, f);
}

/* tub de-a lungul unei polilinii 3D (sârme, bobine, spire) */
function tube(points, r, color = [193, 116, 58], segs = 7) {
  const v = [], f = [];
  if (points.length < 2) return mesh(v, f);
  let prevUp = [0, 1, 0];
  const rings = [];
  for (let k = 0; k < points.length; k++) {
    const p = points[k];
    const dir = V3.norm(k === 0 ? V3.sub(points[1], points[0])
      : k === points.length - 1 ? V3.sub(points[k], points[k - 1])
        : V3.sub(points[k + 1], points[k - 1]));
    let up = Math.abs(V3.dot(dir, prevUp)) > 0.95 ? [1, 0, 0] : prevUp;
    const right = V3.norm(V3.cross(dir, up));
    up = V3.norm(V3.cross(right, dir));
    prevUp = up;
    const ring = [];
    for (let i = 0; i < segs; i++) {
      const a = i / segs * Math.PI * 2;
      ring.push(v.length);
      v.push(V3.add(p, V3.add(V3.mul(right, Math.cos(a) * r), V3.mul(up, Math.sin(a) * r))));
    }
    rings.push(ring);
  }
  for (let k = 0; k < rings.length - 1; k++)
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % segs;
      f.push({ i: [rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]], c: color });
    }
  return mesh(v, f);
}

/* polilinie circulară (pentru spire, inele de câmp) */
function circlePath(cx, cy, cz, r, axis, segs = 26, closed = true) {
  const p = [];
  for (let i = 0; i <= segs; i++) {
    if (!closed && i === segs) break;
    const a = i / segs * Math.PI * 2;
    if (axis === "y") p.push([cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r]);
    else if (axis === "x") p.push([cx, cy + Math.cos(a) * r, cz + Math.sin(a) * r]);
    else p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz]);
  }
  return p;
}

/* ---------- desenare ---------- */
function shadeColor(c, n) {
  const i = 0.42 + 0.58 * Math.max(0, -V3.dot(n, LIGHT));
  return `rgb(${Math.round(c[0] * i)},${Math.round(c[1] * i)},${Math.round(c[2] * i)})`;
}

function drawScene(ctx, scene, cam, W, H) {
  // umbre pe sol
  scene.shadows.forEach(s => {
    const p = cam.project([s.x, 0.5, s.z], W, H);
    if (!p) return;
    ctx.save();
    ctx.globalAlpha = s.a;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(s.rx, s.rz) * p.s);
    g.addColorStop(0, "rgba(0,0,0,.75)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s.rx * p.s, s.rz * p.s * Math.max(0.25, Math.sin(cam.pitch)), 0, 0, 7);
    ctx.fill(); ctx.restore();
  });

  // fețe + bile, sortate împreună de la depărtare spre apropiere
  const items = [];
  scene.objs.forEach(o => {
    const proj = o.v.map(p => cam.project(p, W, H));
    o.f.forEach(face => {
      let z = 0, ok = true;
      for (const idx of face.i) { const q = proj[idx]; if (!q) { ok = false; break; } z += q.z; }
      if (!ok) return;
      const a = o.v[face.i[0]], b = o.v[face.i[1]], c = o.v[face.i[2]];
      const n = V3.norm(V3.cross(V3.sub(b, a), V3.sub(c, a)));
      items.push({ t: 0, pts: face.i.map(i => proj[i]), z: z / face.i.length, c: face.c, n, line: face.line, flat: face.flat });
    });
  });
  scene.sprites.forEach(s2 => {
    const q = cam.project(s2.p, W, H);
    if (q) items.push({ t: 1, q, z: q.z - 4, r: Math.max(1.5, s2.r * q.s), color: s2.color, glow: s2.glow });
  });
  items.sort((p, q) => q.z - p.z);
  items.forEach(f => {
    if (f.t === 1) {
      ctx.save();
      if (f.glow) { ctx.shadowColor = f.color; ctx.shadowBlur = 9; }
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.q.x, f.q.y, f.r, 0, 7); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(f.pts[0].x, f.pts[0].y);
    for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i].x, f.pts[i].y);
    ctx.closePath();
    const fill = f.flat ? `rgb(${f.c[0]},${f.c[1]},${f.c[2]})` : shadeColor(f.c, f.n);
    ctx.fillStyle = fill;
    ctx.fill();
    // contur de aceeași culoare: acoperă cusăturile dintre poligoane vecine
    ctx.strokeStyle = f.line || fill; ctx.lineWidth = f.line ? 1 : 1.1; ctx.stroke();
  });
}

/* etichetă 2D ancorată într-un punct 3D */
function label3d(ctx, cam, p, text, W, H, color, dy, size) {
  const q = cam.project(p, W, H);
  if (!q) return;
  ctx.save();
  ctx.fillStyle = color || "#5b6b7c";
  ctx.font = (size || 13) + "px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, q.x, q.y + (dy || 0));
  ctx.restore();
}

/* săgeată 3D desenată în 2D, de la p la q */
function arrow3d(ctx, cam, p, q, W, H, color, width) {
  const a = cam.project(p, W, H), b = cam.project(q, W, H);
  if (!a || !b) return;
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width || 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  const h = 11;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - Math.cos(ang - 0.4) * h, b.y - Math.sin(ang - 0.4) * h);
  ctx.lineTo(b.x - Math.cos(ang + 0.4) * h, b.y - Math.sin(ang + 0.4) * h);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* puncte de curent care aleargă pe un traseu 3D */
function flow3d(scene, path, phase, count, color) {
  let total = 0; const segs = [];
  for (let i = 0; i < path.length - 1; i++) { const l = V3.len(V3.sub(path[i + 1], path[i])); segs.push(l); total += l; }
  if (!total) return;
  for (let k = 0; k < count; k++) {
    let d = ((phase + k / count) % 1) * total;
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i]) {
        const u = segs[i] ? d / segs[i] : 0;
        scene.sprite(V3.add(path[i], V3.mul(V3.sub(path[i + 1], path[i]), u)), 4.5, color || "#ffd400", true);
        break;
      }
      d -= segs[i];
    }
  }
}

/* control orbital: trage = rotește, rotița = zoom */
function orbit(canvas, cam, onChange) {
  let drag = false, lx = 0, ly = 0;
  canvas.addEventListener("pointerdown", e => {
    drag = true; lx = e.clientX; ly = e.clientY;
    canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", e => {
    if (!drag) return;
    cam.yaw -= (e.clientX - lx) * 0.009;
    cam.pitch = Math.max(0.06, Math.min(1.25, cam.pitch + (e.clientY - ly) * 0.007));
    lx = e.clientX; ly = e.clientY;
    if (onChange) onChange();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(ev =>
    canvas.addEventListener(ev, () => { drag = false; canvas.style.cursor = "grab"; }));
  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    cam.dist = Math.max(260, Math.min(1100, cam.dist + Math.sign(e.deltaY) * 36));
    if (onChange) onChange();
  }, { passive: false });
  canvas.style.cursor = "grab";
}
