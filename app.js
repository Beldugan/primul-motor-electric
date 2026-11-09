/* =========================================================
   Primul motor electric — logica aplicației
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

/* baterie desenată, cu polaritate */
function drawBattery(ctx, x, y, w, h, rev, label) {
  ctx.save();
  ctx.fillStyle = "#3b4a5c"; ctx.strokeStyle = "#26313f"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#e6a23c";
  ctx.beginPath(); ctx.roundRect(x - w / 2 + 4, y - h / 2 + 4, w * 0.34, h - 8, 4); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "bold 17px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(rev ? "−" : "+", x - w / 4, y);
  ctx.fillText(rev ? "+" : "−", x + w / 4, y);
  ctx.restore();
  if (label) {
    ctx.save(); ctx.fillStyle = "#6c7a8c"; ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.fillText(label, x, y + h / 2 + 18); ctx.restore();
  }
}
/* puncte de curent pe un traseu (listă de puncte) */
function drawFlow(ctx, pts, phase, count) {
  let total = 0; const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segs.push(l); total += l;
  }
  for (let k = 0; k < count; k++) {
    let d = ((phase + k / count) % 1) * total;
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i]) {
        const u = segs[i] ? d / segs[i] : 0;
        const x = pts[i].x + (pts[i + 1].x - pts[i].x) * u;
        const y = pts[i].y + (pts[i + 1].y - pts[i].y) * u;
        ctx.save(); ctx.fillStyle = "#ffd400"; ctx.shadowColor = "#ffd400"; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 7); ctx.fill(); ctx.restore();
        break;
      }
      d -= segs[i];
    }
  }
}

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
   1. BUSOLA LUI OERSTED
   ========================================================= */
const cvO = $("cvOe"), ctxO = fitCanvas(cvO);
const O = { on: false, rev: false, turns: 5, batt: 1, ang: 0, w: 0, phase: 0, maxSeen: 0 };
const BOX = { x: 250, y: 86, w: 400, h: 200 };
const COMP = { x: 450, y: 186, r: 66 };

function oeStrength() { return O.on ? O.turns * O.batt : 0; }
function oeTarget() {  // radiani, 0 = nord (sus)
  const s = oeStrength();
  const deg = 85 * (1 - Math.exp(-s / 14));
  return (O.rev ? -1 : 1) * deg * Math.PI / 180;
}

function drawOe() {
  const ctx = ctxO, W = cvO.__w, H = cvO.__h;
  ctx.clearRect(0, 0, W, H);

  // cutia de carton
  ctx.save();
  ctx.fillStyle = "rgba(214,186,140,.35)"; ctx.strokeStyle = "#b08a52"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(BOX.x, BOX.y, BOX.w, BOX.h, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#8a7149"; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillText(LANG === "ro" ? "cutie de carton cu busola înăuntru" : "cardboard box with the compass inside", BOX.x + BOX.w / 2, BOX.y + BOX.h + 22);
  ctx.restore();

  // spirele
  const shown = Math.min(O.turns, 14);
  ctx.save();
  ctx.strokeStyle = O.on ? "#b5762f" : "#c9a06a"; ctx.lineWidth = 2.6;
  for (let i = 0; i < shown; i++) {
    const y = BOX.y + 16 + i * ((BOX.h - 32) / Math.max(shown - 1, 1));
    ctx.beginPath(); ctx.moveTo(BOX.x - 18, y); ctx.lineTo(BOX.x + BOX.w + 18, y); ctx.stroke();
  }
  ctx.restore();
  if (O.turns > 14) {
    ctx.save(); ctx.fillStyle = "#8a7149"; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("× " + O.turns, BOX.x + BOX.w + 26, BOX.y + 14); ctx.restore();
  }

  // busola
  ctx.save();
  ctx.fillStyle = "rgba(235,245,250,.95)"; ctx.strokeStyle = "#7f8b98"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(COMP.x, COMP.y, COMP.r, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#55657a"; ctx.font = "bold 13px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const dirs = LANG === "ro" ? ["N", "E", "S", "V"] : ["N", "E", "S", "W"];
  ctx.fillText(dirs[0], COMP.x, COMP.y - COMP.r + 12);
  ctx.fillText(dirs[1], COMP.x + COMP.r - 12, COMP.y);
  ctx.fillText(dirs[2], COMP.x, COMP.y + COMP.r - 12);
  ctx.fillText(dirs[3], COMP.x - COMP.r + 12, COMP.y);
  // acul
  const a = O.ang - Math.PI / 2;
  const L = COMP.r - 16;
  ctx.translate(COMP.x, COMP.y); ctx.rotate(O.ang);
  ctx.strokeStyle = "#d92b2b"; ctx.lineWidth = 6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -L); ctx.stroke();
  ctx.strokeStyle = "#2f6fd0";
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, L); ctx.stroke();
  ctx.fillStyle = "#7f8b98"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill();
  ctx.restore();

  // bateria și firele
  const by = BOX.y + BOX.h / 2;
  drawBattery(ctx, 806, by, 86, 44, O.rev, LANG === "ro" ? (O.batt > 1 ? O.batt + " baterii" : "1 baterie") : (O.batt > 1 ? O.batt + " batteries" : "1 battery"));
  const path = [
    { x: BOX.x - 18, y: BOX.y + 16 }, { x: 120, y: BOX.y + 16 }, { x: 120, y: by - 22 },
    { x: 763, y: by - 22 }, { x: 763, y: by + 22 }, { x: 120, y: by + 22 },
    { x: 120, y: BOX.y + BOX.h - 16 }, { x: BOX.x - 18, y: BOX.y + BOX.h - 16 }
  ];
  ctx.save();
  ctx.strokeStyle = "#5b6b7c"; ctx.lineWidth = 3.5; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke(); ctx.restore();

  if (O.on && O.turns > 0) {
    drawFlow(ctx, O.rev ? path.slice().reverse() : path, O.phase, 14);
    // câmpul în jurul firelor
    ctx.save();
    ctx.strokeStyle = "rgba(31,111,235,.30)"; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const r = 10 + i * 9;
      ctx.beginPath(); ctx.arc(BOX.x + 40, BOX.y + 16, r, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(BOX.x + BOX.w - 40, BOX.y + BOX.h - 16, r, 0, 7); ctx.stroke();
    }
    ctx.restore();
  }
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
  O.on = !O.on; $("oeSwitch").textContent = t(O.on ? "oe.off" : "oe.on");
  oeMsg();
});
$("oeFlip").addEventListener("click", () => { O.rev = !O.rev; oeMsg("flip"); });
$("turns").addEventListener("input", e => { O.turns = +e.target.value; $("vTurns").textContent = O.turns; oeMsg(); });
$("batt").addEventListener("input", e => { O.batt = +e.target.value; $("vBatt").textContent = O.batt; oeMsg(); });

/* =========================================================
   2. ȘINELE
   ========================================================= */
const cvR = $("cvRa"), ctxR = fitCanvas(cvR);
const R = { on: false, batt: 1, mag: 1, x: 450, v: 0, phase: 0, found: {} };
const RAIL = { top: 128, bot: 232, x0: 150, x1: 760 };

function raDir() { return R.on ? R.batt * R.mag : 0; }

function drawRa() {
  const ctx = ctxR, W = cvR.__w, H = cvR.__h;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,.05)"; ctx.fillRect(0, 300, W, H - 300);

  // magnetul de sub șine
  ctx.save();
  const mx0 = 330, mx1 = 570;
  ctx.fillStyle = R.mag > 0 ? "#d92b2b" : "#2f6fd0";
  ctx.beginPath(); ctx.roundRect(mx0, RAIL.top - 26, mx1 - mx0, 156, 10); ctx.fill();
  ctx.globalAlpha = .25; ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.roundRect(mx0 + 8, RAIL.top - 18, mx1 - mx0 - 16, 140, 8); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#fff"; ctx.font = "bold 20px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(R.mag > 0 ? "N" : "S", (mx0 + mx1) / 2, RAIL.top + 52);
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(LANG === "ro" ? "magnet (fața de sus)" : "magnet (top face)", (mx0 + mx1) / 2, RAIL.top + 100);
  ctx.restore();

  // șinele
  ctx.save();
  ctx.strokeStyle = "#c1743a"; ctx.lineWidth = 7; ctx.lineCap = "round";
  [RAIL.top, RAIL.bot].forEach(y => { ctx.beginPath(); ctx.moveTo(RAIL.x0, y); ctx.lineTo(RAIL.x1, y); ctx.stroke(); });
  ctx.restore();

  // sârma liberă
  ctx.save();
  ctx.strokeStyle = "#8e96a1"; ctx.lineWidth = 10; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(R.x, RAIL.top - 10); ctx.lineTo(R.x, RAIL.bot + 10); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(R.x - 2, RAIL.top - 6); ctx.lineTo(R.x - 2, RAIL.bot + 6); ctx.stroke();
  ctx.fillStyle = "#55657a"; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillText(LANG === "ro" ? "sârma liberă" : "loose wire", R.x, RAIL.bot + 34);
  ctx.restore();

  // bateria + fire
  drawBattery(ctx, 92, 180, 80, 42, R.batt < 0, "");
  const path = [
    { x: 92, y: 159 }, { x: 92, y: RAIL.top }, { x: R.x, y: RAIL.top },
    { x: R.x, y: RAIL.bot }, { x: 92, y: RAIL.bot }, { x: 92, y: 201 }
  ];
  ctx.save(); ctx.strokeStyle = "#5b6b7c"; ctx.lineWidth = 3.5; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.stroke(); ctx.restore();
  if (R.on) drawFlow(ctx, R.batt > 0 ? path : path.slice().reverse(), R.phase, 12);

  // săgeata forței
  const d = raDir();
  if (d !== 0) {
    ctx.save();
    ctx.strokeStyle = "#16a34a"; ctx.fillStyle = "#16a34a"; ctx.lineWidth = 4;
    const ax = R.x + d * 34, ay = (RAIL.top + RAIL.bot) / 2 - 56;
    ctx.beginPath(); ctx.moveTo(R.x, ay); ctx.lineTo(ax, ay); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax + d * 12, ay); ctx.lineTo(ax, ay - 7); ctx.lineTo(ax, ay + 7); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
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
  if (d !== 0) {
    R.v = clamp(R.v + d * 0.055, -2.6, 2.6);
    R.phase = (R.phase + 0.006) % 1;
  } else R.v *= 0.93;
  R.x += R.v;
  if (R.x < RAIL.x0 + 20) { R.x = RAIL.x0 + 20; if (R.v < 0) { R.v = 0; if (R.on) say($("sayRa"), t("ra.edge"), "warn"); } }
  if (R.x > RAIL.x1 - 20) { R.x = RAIL.x1 - 20; if (R.v > 0) { R.v = 0; if (R.on) say($("sayRa"), t("ra.edge"), "warn"); } }
  $("vRaDir").textContent = d === 0 ? t("ra.none") : t(d > 0 ? "ra.right" : "ra.left");
  drawRa();
  requestAnimationFrame(raStep);
}

function raCheck(changed) {
  if (!R.on) return;
  const d = raDir(), k = raKey();
  const isNew = !R.found[k];
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
  R.batt *= -1;
  raCheck(R.batt * R.mag === 1 && R.batt < 0 ? "both" : "one");
});
$("raMag").addEventListener("click", () => {
  R.mag *= -1;
  raCheck(R.batt < 0 && R.mag < 0 ? "both" : "one");
});
$("raReset").addEventListener("click", () => { R.x = 450; R.v = 0; });

/* =========================================================
   3. MOTORUL HOMOPOLAR
   ========================================================= */
const cvM = $("cvMo"), ctxM = fitCanvas(cvM);
const M = { on: false, mag: 2, pol: 1, ang: 0, spin: 0, rot: 0, heat: 0, batt: 100, cooling: false };
const BAT = { x: 450, top: 112, bot: 296, w: 72 };

function drawMo() {
  const ctx = ctxM, W = cvM.__w, H = cvM.__h;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(0,0,0,.05)"; ctx.fillRect(0, 338, W, H - 338);

  // magnetul (disc, sub baterie)
  ctx.save();
  ctx.fillStyle = M.pol > 0 ? "#d92b2b" : "#2f6fd0";
  ctx.beginPath(); ctx.ellipse(BAT.x, BAT.bot + 18, 74, 20, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.25)";
  ctx.beginPath(); ctx.ellipse(BAT.x, BAT.bot + 12, 74, 18, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "bold 15px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(M.pol > 0 ? "N" : "S", BAT.x, BAT.bot + 14);
  ctx.restore();

  // bateria verticală
  ctx.save();
  ctx.fillStyle = "#3b4a5c"; ctx.strokeStyle = "#26313f"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(BAT.x - BAT.w / 2, BAT.top, BAT.w, BAT.bot - BAT.top, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#e6a23c";
  ctx.beginPath(); ctx.roundRect(BAT.x - BAT.w / 2 + 5, BAT.top + 6, BAT.w - 10, 30, 5); ctx.fill();
  ctx.fillStyle = "#c8cdd4";
  ctx.beginPath(); ctx.roundRect(BAT.x - 11, BAT.top - 12, 22, 14, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = "bold 15px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("+", BAT.x, BAT.top + 21);
  ctx.fillText("−", BAT.x, BAT.bot - 18);
  ctx.restore();

  // sârma de cupru (două fire, rotite)
  const hot = M.heat > 65;
  ctx.save();
  ctx.strokeStyle = hot ? "#ff7043" : "#c1743a";
  if (hot) { ctx.shadowColor = "#ff7043"; ctx.shadowBlur = 14; }
  ctx.lineWidth = 5; ctx.lineCap = "round";
  for (let i = 0; i < 2; i++) {
    const a = M.ang + i * Math.PI;
    const bx = BAT.x + Math.cos(a) * 86, by = BAT.bot + 14 + Math.sin(a) * 16;
    const cx = BAT.x + Math.cos(a) * 120, cy = (BAT.top + BAT.bot) / 2;
    ctx.beginPath();
    ctx.moveTo(BAT.x, BAT.top - 10);
    ctx.quadraticCurveTo(cx, cy, bx, by);
    ctx.stroke();
  }
  ctx.restore();

  // săgeți de rotație
  if (Math.abs(M.spin) > 0.004) {
    ctx.save();
    ctx.strokeStyle = "rgba(22,163,74,.75)"; ctx.lineWidth = 3.5;
    const dir = Math.sign(M.spin);
    ctx.beginPath(); ctx.ellipse(BAT.x, 86, 120, 26, 0, dir > 0 ? -0.5 : 2.6, dir > 0 ? 2.6 : 3.8); ctx.stroke();
    ctx.restore();
  }

  // etichete
  ctx.save();
  ctx.fillStyle = "#6c7a8c"; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillText(LANG === "ro" ? "sârmă de cupru îndoită" : "bent copper wire", BAT.x + 210, 120);
  ctx.fillText(LANG === "ro" ? "magnet de neodim" : "neodymium magnet", BAT.x, BAT.bot + 56);
  ctx.fillText(LANG === "ro" ? "baterie AA" : "AA battery", BAT.x - 150, (BAT.top + BAT.bot) / 2);
  ctx.restore();
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
  M.batt = 100; M.heat = 0; M.rot = 0; M.cooling = false;
  say($("sayMo"), t("mo.start"));
});
$("moMag").addEventListener("input", e => {
  M.mag = +e.target.value; $("vMoMag").textContent = M.mag;
  if (M.on && M.mag === 1) say($("sayMo"), t("mo.weak"), "warn");
});

/* =========================================================
   4. QUIZ
   ========================================================= */
const QUIZ = ["q1", "q2", "q3", "q4", "q5", "q6"];
let answered = {}, score = 0;
function buildQuiz() {
  answered = {}; score = 0; $("vScore").textContent = "";
  const box = $("quizBox"); box.innerHTML = "";
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
    box.appendChild(d);
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
  drawOe(); drawRa(); drawMo();
}
applyI18n();
$("vTurns").textContent = O.turns;
$("vBatt").textContent = O.batt;
$("vMoMag").textContent = M.mag;
raRender();
requestAnimationFrame(oeStep);
requestAnimationFrame(raStep);
requestAnimationFrame(moStep);
