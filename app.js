/* =========================================================
   Primul motor electric — logica aplicației (simulări 3D)
   Fizica distractivă 06 · fără biblioteci externe
   ========================================================= */

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DPR = Math.min(window.devicePixelRatio || 1, 2);

function fitCanvas(cv) {
  const w = cv.width, h = cv.height, ctx = cv.getContext("2d");
  cv.style.aspectRatio = w + " / " + h;
  cv.width = w * DPR; cv.height = h * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  cv.__w = w; cv.__h = h;
  return ctx;
}
function say(el, txt, cls) { el.textContent = txt; el.className = "say" + (cls ? " " + cls : ""); }

/* culori comune */
const C = {
  table: [214, 199, 172], tableDark: [196, 180, 152],
  carton: [205, 170, 118], cartonDark: [178, 144, 96],
  copper: [193, 116, 58], copperHot: [255, 122, 70],
  steel: [168, 176, 186], steelLight: [205, 212, 220],
  dark: [59, 74, 92], battery: [48, 60, 76], batteryTop: [230, 162, 60],
  red: [214, 55, 55], blue: [52, 112, 208], white: [245, 248, 250],
  glass: [226, 240, 248], brass: [218, 170, 72]
};

/* taburi, temă, limbă */
const TABS = [["tab-oersted", "p-oersted"], ["tab-sine", "p-sine"], ["tab-motor", "p-motor"], ["tab-quiz", "p-quiz"]];
TABS.forEach(([tb, pn]) => $(tb).addEventListener("click", () => {
  TABS.forEach(([t2, p2]) => { $(t2).setAttribute("aria-selected", t2 === tb); $(p2).classList.toggle("hidden", p2 !== pn); });
}));
$("themeBtn").addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next); localStorage_set("fd06-theme", next);
});
(function () { const s = localStorage_get("fd06-theme"); if (s) document.documentElement.setAttribute("data-theme", s); })();
$("langRo").addEventListener("click", () => setLang("ro"));
$("langEn").addEventListener("click", () => setLang("en"));

/* =========================================================
   1. BUSOLA LUI OERSTED — scenă 3D
   ========================================================= */
const cvO = $("cvOe"), ctxO = fitCanvas(cvO);
const camO = new Cam({ yaw: -0.58, pitch: 0.30, dist: 560, target: [0, 58, 0] });
const sceneO = new Scene();
orbit(cvO, camO);
const O = { on: false, rev: false, turns: 5, batt: 1, ang: 0, w: 0, phase: 0 };

/* colacul de sârmă (50–60 spire în carte), vertical, cu busola în centru — ca în fig. 187 */
const RING = { r: 74, cy: 76 }, NEEDLE_Y = 18;

function oeStrength() { return O.on ? O.turns * O.batt : 0; }
function oeTarget() {
  const deg = 85 * (1 - Math.exp(-oeStrength() / 14));
  return (O.rev ? -1 : 1) * deg * Math.PI / 180;
}
function turnZ(i, shown) { return shown > 1 ? -13 + i * 26 / (shown - 1) : 0; }

/* traseul curentului: bornă → spirele colacului → bornă */
function coilPath() {
  const shown = Math.min(O.turns, 12), p = [[250, 30, -60], [120, 40, -40]];
  for (let i = 0; i < shown; i++) {
    const z = turnZ(i, shown);
    circlePath(0, RING.cy, z, RING.r, "z", 16).forEach(q => p.push(q));
  }
  p.push([120, 40, 40], [250, 30, 60]);
  return p;
}

function buildOe() {
  const S = sceneO; S.clear();
  S.add(quadGrid(700, 480, 9, 7, {}, C.table, true));
  S.shadow(0, 0, 90, 46, .22);
  S.shadow(250, 0, 58, 40, .16);

  // suportul de lemn și dopul pe care stă busola
  S.add(box(150, 8, 120, { pos: [0, 4, 0] }, C.carton));
  S.add(cyl(26, 10, { pos: [0, 12, 0] }, C.cartonDark, 18));

  // busola, în centrul colacului
  S.add(cyl(44, 14, { pos: [0, 17, 0] }, C.steel, 28, C.steelLight));
  S.add(disc(40, { pos: [0, 24.4, 0] }, C.white, 30));
  const a = O.ang;
  S.add(box(40, 3.4, 6.5, { rotY: a, pos: [Math.cos(a) * 20, 26, -Math.sin(a) * 20] }, C.red));
  S.add(box(40, 3.4, 6.5, { rotY: a, pos: [-Math.cos(a) * 20, 26, Math.sin(a) * 20] }, C.blue));
  S.add(cyl(4, 5, { pos: [0, 26, 0] }, C.steel, 10));

  // colacul de sârmă: spirele, strânse în mănunchi
  const shown = Math.min(O.turns, 12);
  for (let i = 0; i < shown; i++)
    S.add(tube(circlePath(0, RING.cy, turnZ(i, shown), RING.r, "z", 30), 2.3, C.copper, 6));

  // firele spre baterie
  S.add(tube([[RING.r - 4, RING.cy, turnZ(0, shown)], [120, 40, -40], [228, 30, -46]], 2.6, C.copper, 6));
  S.add(tube([[RING.r - 4, RING.cy, turnZ(shown - 1, shown)], [120, 40, 40], [228, 30, 46]], 2.6, C.copper, 6));

  // bateria, culcată pe masă
  S.add(cyl(23, 96, { rotX: Math.PI / 2, pos: [250, 26, 0] }, C.battery, 22, C.steel));
  S.add(cyl(23, 26, { rotX: Math.PI / 2, pos: [250, 26, O.rev ? 34 : -34] }, C.batteryTop, 22, C.batteryTop));
  S.add(cyl(8, 8, { rotX: Math.PI / 2, pos: [250, 26, O.rev ? -52 : 52] }, C.steelLight, 12));

  // câmpul magnetic din jurul firului de deasupra acului
  if (O.on && O.turns > 0) {
    [14, 23].forEach(r => S.add(tube(circlePath(0, RING.cy + RING.r, 0, r, "x", 20), 1, [118, 176, 240], 5)));
    flow3d(S, coilPath(), O.rev ? 1 - O.phase : O.phase, 26);
  }
}

function drawOe() {
  const ctx = ctxO, W = cvO.__w, H = cvO.__h;
  ctx.clearRect(0, 0, W, H);
  buildOe();
  drawScene(ctx, sceneO, camO, W, H);
  const dirs = LANG === "ro" ? ["N", "E", "S", "V"] : ["N", "E", "S", "W"];
  label3d(ctx, camO, [58, NEEDLE_Y + 10, 0], dirs[0], W, H, "#d63737", 0, 15);
  label3d(ctx, camO, [0, NEEDLE_Y + 10, -58], dirs[1], W, H, "#55657a", 0, 13);
  label3d(ctx, camO, [-58, NEEDLE_Y + 10, 0], dirs[2], W, H, "#55657a", 0, 13);
  label3d(ctx, camO, [0, NEEDLE_Y + 10, 58], dirs[3], W, H, "#55657a", 0, 13);
  label3d(ctx, camO, [0, 0, 88], LANG === "ro" ? "busola, în centrul colacului de sârmă" : "the compass, inside the coil", W, H, "#7b6a4e", 16);
  label3d(ctx, camO, [250, 56, 0], LANG === "ro" ? (O.batt > 1 ? O.batt + " baterii" : "1 baterie") : (O.batt > 1 ? O.batt + " batteries" : "1 battery"), W, H, "#55657a", -10);
  label3d(ctx, camO, [-RING.r - 24, RING.cy + 26, 0], LANG === "ro" ? O.turns + " spire" : O.turns + " turns", W, H, "#a9742f", 0, 13);
}

function oeStep() {
  const target = oeTarget();
  O.w += (target - O.ang) * 0.055; O.w *= 0.87; O.ang += O.w;
  if (O.on) O.phase = (O.phase + 0.004 + O.batt * 0.002) % 1;
  const deg = Math.abs(O.ang * 180 / Math.PI);
  $("vDev").textContent = Math.round(deg) + "°";
  const s = oeStrength();
  $("vField").textContent = s;
  $("barField").style.width = clamp(s / 120 * 100, 0, 100) + "%";
  $("vDir").textContent = s < 1 ? t("oe.north") : Math.round(deg) + "° " + (O.rev ? "←" : "→");
  drawOe();
  requestAnimationFrame(oeStep);
}

function oeMsg(extra) {
  if (!O.on) { say($("sayOe"), t("oe.offMsg")); return; }
  if (O.turns === 0) { say($("sayOe"), t("oe.noTurns"), "warn"); return; }
  const s = oeStrength();
  if (extra === "flip") say($("sayOe"), t("oe.flipped"), "good");
  else if (s >= 85) say($("sayOe"), t("oe.max"), "good");
  else if (s >= 25) say($("sayOe"), t("oe.more", { n: O.turns }), "good");
  else say($("sayOe"), t("oe.onMsg"), "good");
}
$("oeSwitch").addEventListener("click", () => {
  O.on = !O.on; $("oeSwitch").textContent = t(O.on ? "oe.off" : "oe.on"); oeMsg();
});
$("oeFlip").addEventListener("click", () => { O.rev = !O.rev; oeMsg("flip"); });
$("turns").addEventListener("input", e => { O.turns = +e.target.value; $("vTurns").textContent = O.turns; oeMsg(); });
$("batt").addEventListener("input", e => { O.batt = +e.target.value; $("vBatt").textContent = O.batt; oeMsg(); });

/* =========================================================
   2. ȘINELE — scenă 3D
   ========================================================= */
const cvR = $("cvRa"), ctxR = fitCanvas(cvR);
const camR = new Cam({ yaw: -0.74, pitch: 0.40, dist: 820, target: [0, 34, 0] });
const sceneR = new Scene();
orbit(cvR, camR);
const R = { on: false, batt: 1, mag: 1, x: 0, v: 0, phase: 0, found: {} };
const RAILZ = 46, RAIL_X0 = -260, RAIL_X1 = 260, RAIL_Y = 54;

function raDir() { return R.on ? R.batt * R.mag : 0; }
function raPath() {
  return [[-340, 26, -26], [-310, RAIL_Y, -RAILZ], [R.x, RAIL_Y, -RAILZ],
  [R.x, RAIL_Y, RAILZ], [-310, RAIL_Y, RAILZ], [-340, 26, 26]];
}

function buildRa() {
  const S = sceneR; S.clear();
  S.add(quadGrid(900, 560, 11, 8, {}, C.table, true));
  S.shadow(0, 0, 130, 90, .22); S.shadow(-340, 0, 60, 40, .18);

  // magnetul
  const magCol = R.mag > 0 ? C.red : C.blue;
  S.add(box(210, 26, 150, { pos: [0, 13, 0] }, magCol, ["top"]));
  S.add(quadGrid(210, 150, 6, 5, { pos: [0, 26, 0] }, R.mag > 0 ? [240, 96, 96] : [98, 154, 236]));

  // șinele
  [-RAILZ, RAILZ].forEach(z => S.add(cyl(7, RAIL_X1 - RAIL_X0 + 80, { rotZ: Math.PI / 2, pos: [0, RAIL_Y, z] }, C.copper, 14)));

  // sârma liberă
  S.add(cyl(8, 132, { rotX: Math.PI / 2, pos: [R.x, RAIL_Y + 12, 0] }, C.steelLight, 16, C.steel));
  S.shadow(R.x, 0, 26, 52, .20);

  // bateria
  S.add(cyl(24, 92, { rotX: Math.PI / 2, pos: [-340, 26, 0] }, C.battery, 20, C.steel));
  S.add(cyl(24, 24, { rotX: Math.PI / 2, pos: [-340, 26, R.batt > 0 ? -34 : 34] }, C.batteryTop, 20, C.batteryTop));
  S.add(tube([[-340, 26, -26], [-310, 38, -RAILZ], [RAIL_X0 - 36, RAIL_Y, -RAILZ]], 2.8, C.copper, 6));
  S.add(tube([[-340, 26, 26], [-310, 38, RAILZ], [RAIL_X0 - 36, RAIL_Y, RAILZ]], 2.8, C.copper, 6));

  if (R.on) flow3d(S, R.batt > 0 ? raPath() : raPath().slice().reverse(), R.phase, 20);
}

function drawRa() {
  const ctx = ctxR, W = cvR.__w, H = cvR.__h;
  ctx.clearRect(0, 0, W, H);
  buildRa();
  drawScene(ctx, sceneR, camR, W, H);
  const d = raDir();
  if (d !== 0) arrow3d(ctx, camR, [R.x, RAIL_Y + 52, 0], [R.x + d * 90, RAIL_Y + 52, 0], W, H, "#16a34a", 5);
  label3d(ctx, camR, [0, 30, 0], R.mag > 0 ? "N" : "S", W, H, "#ffffff", 0, 20);
  label3d(ctx, camR, [0, 2, 104], LANG === "ro" ? "magnet (fața de sus)" : "magnet (top face)", W, H, "#7b6a4e", 16);
  label3d(ctx, camR, [R.x, RAIL_Y + 22, 74], LANG === "ro" ? "sârma liberă" : "loose wire", W, H, "#55657a", 0);
  label3d(ctx, camR, [-340, 60, 0], LANG === "ro" ? "baterie" : "battery", W, H, "#55657a", -8);
}

function raKey() { return (R.batt > 0 ? "n" : "r") + (R.mag > 0 ? "n" : "f"); }
function raRender() {
  const tb = $("raTable").querySelector("tbody"); tb.innerHTML = "";
  [["n", "n"], ["r", "n"], ["n", "f"], ["r", "f"]].forEach(([b, m]) => {
    const k = b + m, v = R.found[k];
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${t(b === "n" ? "ra.normal" : "ra.rev")}</td>` +
      `<td>${t(m === "n" ? "ra.normal" : "ra.flipd")}</td>` +
      `<td>${v ? t(v === 1 ? "ra.right" : "ra.left") : "?"}</td>`;
    if (k === raKey()) tr.style.background = "var(--accent-soft)";
    tb.appendChild(tr);
  });
  $("vFound").textContent = Object.keys(R.found).length + " / 4";
}

function raStep() {
  const d = raDir();
  if (d !== 0) { R.v = clamp(R.v + d * 0.05, -2.4, 2.4); R.phase = (R.phase + 0.006) % 1; }
  else R.v *= 0.93;
  R.x += R.v;
  if (R.x < RAIL_X0) { R.x = RAIL_X0; if (R.v < 0) { R.v = 0; if (R.on) say($("sayRa"), t("ra.edge"), "warn"); } }
  if (R.x > RAIL_X1) { R.x = RAIL_X1; if (R.v > 0) { R.v = 0; if (R.on) say($("sayRa"), t("ra.edge"), "warn"); } }
  $("vRaDir").textContent = d === 0 ? t("ra.none") : t(d > 0 ? "ra.right" : "ra.left");
  drawRa();
  requestAnimationFrame(raStep);
}

function raCheck(changed) {
  if (!R.on) return;
  const d = raDir(), k = raKey();
  R.found[k] = d > 0 ? 1 : -1;
  raRender();
  if (Object.keys(R.found).length === 4) { say($("sayRa"), t("ra.all"), "good"); return; }
  if (changed === "one") say($("sayRa"), t("ra.one"), "good");
  else if (changed === "both") say($("sayRa"), t("ra.both"), "good");
  else say($("sayRa"), t("ra.go", { d: t(d > 0 ? "ra.right" : "ra.left") }), "good");
}

$("raSwitch").addEventListener("click", () => {
  R.on = !R.on; $("raSwitch").textContent = t(R.on ? "ra.off" : "ra.on");
  if (R.on) raCheck(); else say($("sayRa"), t("ra.start"));
});
$("raBatt").addEventListener("click", () => {
  R.batt *= -1; raCheck(R.batt < 0 && R.mag < 0 ? "both" : "one");
});
$("raMag").addEventListener("click", () => {
  R.mag *= -1; raCheck(R.batt < 0 && R.mag < 0 ? "both" : "one");
});
$("raReset").addEventListener("click", () => { R.x = 0; R.v = 0; });

/* =========================================================
   3. MOTORUL HOMOPOLAR — scenă 3D
   ========================================================= */
const cvM = $("cvMo"), ctxM = fitCanvas(cvM);
const camM = new Cam({ yaw: -0.52, pitch: 0.34, dist: 540, target: [0, 96, 0] });
const sceneM = new Scene();
orbit(cvM, camM);
const M = { on: false, mag: 2, pol: 1, ang: 0, spin: 0, rot: 0, heat: 0, batt: 100, cooling: false };
const BTOP = 186, MAGR = 60;

function wireStrand(a) {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const u = i / 14;
    const r = 58 * u + 88 * Math.sin(Math.PI * u);
    const y = BTOP - (BTOP - 18) * u;
    pts.push([Math.cos(a) * r, y, -Math.sin(a) * r]);
  }
  return pts;
}

function buildMo() {
  const S = sceneM; S.clear();
  S.add(quadGrid(600, 440, 8, 7, {}, C.table, true));
  S.shadow(0, 0, 95, 72, .26);

  // magnetul de neodim
  S.add(cyl(MAGR, 18, { pos: [0, 9, 0] }, M.pol > 0 ? C.red : C.blue, 28,
    M.pol > 0 ? [238, 96, 96] : [96, 152, 235]));

  // bateria
  S.add(cyl(27, 150, { pos: [0, 93, 0] }, C.battery, 22, C.steel));
  S.add(cyl(27, 34, { pos: [0, 152, 0] }, C.batteryTop, 22, C.batteryTop));
  S.add(cyl(9, 12, { pos: [0, 175, 0] }, C.steelLight, 14, C.steelLight));

  // sârma de cupru, rotită
  const hot = M.heat > 62;
  const col = hot ? C.copperHot : C.copper;
  S.add(tube(wireStrand(M.ang), 3.4, col, 7));
  S.add(tube(wireStrand(M.ang + Math.PI), 3.4, col, 7));

  if (hot) {
    [M.ang, M.ang + Math.PI].forEach(a => {
      const r = 58 * 0.5 + 88;
      sceneM.sprite([Math.cos(a) * r, BTOP - (BTOP - 18) * 0.5, -Math.sin(a) * r], 7, "rgba(255,120,70,.75)", true);
    });
  }
}

function drawMo() {
  const ctx = ctxM, W = cvM.__w, H = cvM.__h;
  ctx.clearRect(0, 0, W, H);
  buildMo();
  drawScene(ctx, sceneM, camM, W, H);

  // săgeata de rotație
  if (Math.abs(M.spin) > 0.004) {
    const dir = Math.sign(M.spin), y = BTOP + 16, r = 64;
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const a = M.ang + dir * (i / 10) * 2.1;
      const q = camM.project([Math.cos(a) * r, y, -Math.sin(a) * r], W, H);
      if (q) pts.push(q);
    }
    if (pts.length > 2) {
      ctx.save(); ctx.strokeStyle = "rgba(22,163,74,.8)"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      pts.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
      const b = pts[pts.length - 1], a2 = pts[pts.length - 2];
      const ang = Math.atan2(b.y - a2.y, b.x - a2.x);
      ctx.fillStyle = "rgba(22,163,74,.8)";
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - Math.cos(ang - 0.45) * 12, b.y - Math.sin(ang - 0.45) * 12);
      ctx.lineTo(b.x - Math.cos(ang + 0.45) * 12, b.y - Math.sin(ang + 0.45) * 12);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  label3d(ctx, camM, [0, 2, 92], LANG === "ro" ? "magnet de neodim" : "neodymium magnet", W, H, "#7b6a4e", 16);
  label3d(ctx, camM, [0, 100, -46], LANG === "ro" ? "baterie AA" : "AA battery", W, H, "#ffffff", 0, 12);
  label3d(ctx, camM, [140, 150, 0], LANG === "ro" ? "sârmă de cupru" : "copper wire", W, H, "#a9742f", 0);
}

function moStep() {
  const current = M.on && M.batt > 1 && !M.cooling ? 1 : 0;
  const target = current ? M.pol * (0.055 + M.mag * 0.05) * (M.batt / 100) : 0;
  M.spin += (target - M.spin) * 0.035;
  M.ang += M.spin;
  M.rot += Math.abs(M.spin) / (2 * Math.PI);

  // ~25 de secunde de mers continuu până se încinge, ~9 secunde de răcire
  if (current) { M.heat = clamp(M.heat + 0.055 + M.mag * 0.012, 0, 100); M.batt = clamp(M.batt - 0.012, 0, 100); }
  else M.heat = clamp(M.heat - 0.12, 0, 100);

  if (M.heat >= 100 && M.on) {
    M.on = false; M.cooling = true;
    $("moSwitch").textContent = t("mo.on");
    say($("sayMo"), t("mo.hotMsg"), "warn");
  }
  if (M.cooling && M.heat < 35) { M.cooling = false; say($("sayMo"), t("mo.cooling")); }
  if (M.on && M.batt <= 1) {
    M.on = false; $("moSwitch").textContent = t("mo.on");
    say($("sayMo"), t("mo.empty"), "warn");
  }

  $("vRot").textContent = Math.floor(M.rot);
  $("vRpm").textContent = Math.round(Math.abs(M.spin) * 60 * 60 / (2 * Math.PI));
  $("vHeat").textContent = M.heat > 65 ? t("mo.hot") : M.heat > 30 ? t("mo.warm") : t("mo.cold");
  $("barHeat").style.width = M.heat + "%";
  $("barHeat").style.background = M.heat > 65 ? "#dc2626" : M.heat > 30 ? "#f97316" : "#1f6feb";
  $("vBattLeft").textContent = Math.round(M.batt) + "%";
  $("barBatt").style.width = M.batt + "%";
  drawMo();
  requestAnimationFrame(moStep);
}

$("moSwitch").addEventListener("click", () => {
  if (M.cooling) { say($("sayMo"), t("mo.cooling"), "warn"); return; }
  if (M.batt <= 1) { say($("sayMo"), t("mo.empty"), "warn"); return; }
  M.on = !M.on; $("moSwitch").textContent = t(M.on ? "mo.off" : "mo.on");
  if (M.on) say($("sayMo"), M.mag === 1 ? t("mo.weak") : t("mo.spin"), M.mag === 1 ? "warn" : "good");
  else say($("sayMo"), t("mo.stopped"));
});
$("moFlip").addEventListener("click", () => { M.pol *= -1; if (M.on) say($("sayMo"), t("mo.rev"), "good"); });
$("moReset").addEventListener("click", () => {
  M.batt = 100; M.heat = 0; M.rot = 0; M.cooling = false; say($("sayMo"), t("mo.start"));
});
$("moMag").addEventListener("input", e => {
  M.mag = +e.target.value; $("vMoMag").textContent = M.mag;
  if (M.on && M.mag === 1) say($("sayMo"), t("mo.weak"), "warn");
});

/* butoanele de vedere */
["oeView", "raView", "moView"].forEach((id, k) => {
  const el = $(id); if (!el) return;
  el.addEventListener("click", () => [camO, camR, camM][k].reset());
});

/* =========================================================
   4. QUIZ
   ========================================================= */
const QUIZ = ["q1", "q2", "q3", "q4", "q5", "q6"];
let answered = {}, score = 0;
function buildQuiz() {
  answered = {}; score = 0; $("vScore").textContent = "";
  const box2 = $("quizBox"); box2.innerHTML = "";
  QUIZ.forEach(q => {
    const opts = [["a", true], ["b", false], ["c", false]].sort(() => Math.random() - .5);
    const d = document.createElement("div"); d.className = "q";
    d.innerHTML = `<p class="qt">${t(q + ".q")}</p><div class="opts"></div><div class="fb"></div>`;
    const wrap = d.querySelector(".opts");
    opts.forEach(([k, ok]) => {
      const b = document.createElement("button");
      b.textContent = t(q + "." + k);
      b.addEventListener("click", () => {
        if (answered[q]) return;
        answered[q] = true; b.classList.add(ok ? "ok" : "no");
        if (!ok) wrap.querySelectorAll("button").forEach(x => { if (x.textContent === t(q + ".a")) x.classList.add("ok"); });
        if (ok) score++;
        d.querySelector(".fb").textContent = t(q + ".f");
        $("vScore").textContent = t("quiz.score", { a: score, b: QUIZ.length }) +
          (Object.keys(answered).length === QUIZ.length && score === QUIZ.length ? " — " + t("quiz.perfect") : "");
      });
      wrap.appendChild(b);
    });
    box2.appendChild(d);
  });
}
$("btnQuizReset").addEventListener("click", buildQuiz);

/* ---------- pornire ---------- */
function onLangChange() {
  $("oeSwitch").textContent = t(O.on ? "oe.off" : "oe.on");
  $("raSwitch").textContent = t(R.on ? "ra.off" : "ra.on");
  $("moSwitch").textContent = t(M.on ? "mo.off" : "mo.on");
  if (!O.on) say($("sayOe"), t("oe.start"));
  if (!R.on) say($("sayRa"), t("ra.start"));
  if (!M.on) say($("sayMo"), t("mo.start"));
  raRender(); buildQuiz();
}
applyI18n();
$("vTurns").textContent = O.turns;
$("vBatt").textContent = O.batt;
$("vMoMag").textContent = M.mag;
raRender();
requestAnimationFrame(oeStep);
requestAnimationFrame(raStep);
requestAnimationFrame(moStep);
