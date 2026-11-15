"use strict";
/* =========================================================
   LUDO UNGGAH-UNGGUH BASA JAWA - logika permainan
   Posisi pion (progress):
     -1      = kotak awal (home base)
      0..50  = jalur utama (relatif dari petak awal warna)
     51..55  = jalur finis warna
     56      = finis
   ========================================================= */

const COLORS = ["red", "blue", "green", "yellow"]; // urutan giliran searah jarum jam
const LABEL = { red: "Merah", blue: "Biru", green: "Hijau", yellow: "Kuning" };
const START = { red: 0, blue: 13, green: 26, yellow: 39 };
const BASE_ORIGIN = { red: [0, 0], blue: [0, 9], yellow: [9, 0], green: [9, 9] };
const FINISH = 56, STEP_MS = 280;
const CELL = 100 / 15;
const LEVEL_OF_DICE = { 1: "C1", 2: "C1", 3: "C2", 4: "C3", 5: "C3", 6: "C4" };
const LEVEL_NAME = { C1: "C1 · Mengingat", C2: "C2 · Memahami", C3: "C3 · Menerapkan", C4: "C4 · Menganalisis" };

/* ---------- geometri papan 15x15 ---------- */
const TRACK = (() => {
  const t = [];
  const seg = (r0, c0, dr, dc, n) => { for (let i = 0; i < n; i++) t.push([r0 + dr * i, c0 + dc * i]); };
  seg(6, 1, 0, 1, 5); seg(5, 6, -1, 0, 6); seg(0, 7, 0, 1, 2); seg(1, 8, 1, 0, 5);
  seg(6, 9, 0, 1, 6); seg(7, 14, 1, 0, 2); seg(8, 13, 0, -1, 5); seg(9, 8, 1, 0, 6);
  seg(14, 7, 0, -1, 2); seg(13, 6, -1, 0, 5); seg(8, 5, 0, -1, 6); seg(7, 0, -1, 0, 2);
  return t;
})();
const HOME_COL = {
  red: [1, 2, 3, 4, 5].map(c => [7, c]),
  blue: [1, 2, 3, 4, 5].map(r => [r, 7]),
  green: [13, 12, 11, 10, 9].map(c => [7, c]),
  yellow: [13, 12, 11, 10, 9].map(r => [r, 7]),
};
const SAFE = new Set(COLORS.flatMap(c => [START[c], (START[c] + 8) % 52]));
console.assert(TRACK.length === 52, "jalur harus 52 petak");
console.assert(COLORS.every(c => { const [r, k] = TRACK[(START[c] + 50) % 52], [hr, hc] = HOME_COL[c][0]; return Math.abs(r - hr) + Math.abs(k - hc) === 1; }), "jalur finis harus bersambung");

const absIndex = (color, p) => (START[color] + p) % 52;
function cellOf(color, p) {
  if (p <= 50) return TRACK[absIndex(color, p)];
  return HOME_COL[color][p - 51];
}
function baseSpot(color, i) {
  const [r, c] = BASE_ORIGIN[color];
  return [r + (i < 2 ? 1.5 : 3.5), c + (i % 2 ? 3.5 : 1.5)];
}
function finishSpot(color, i) {
  const off = (i - 1.5) * 0.3;
  return { red: [7 + off, 6.2], blue: [6.2, 7 + off], green: [7 + off, 7.8], yellow: [7.8, 7 + off] }[color];
}

/* ---------- kosakata (dari dokumen materi) ---------- */
const VOCAB = [
  ["mulang", "mucal", "ngasta", "mengajar"], ["awak", "badan", "salira", "badan"], ["menehi", "nyukani", "maringi", "memberi"],
  ["gelem", "purun", "kersa", "mau"], ["duwe", "gadhah", "kagungan", "mempunyai"], ["nggawa", "mbekta", "ngasta", "membawa"],
  ["jeneng", "nama", "asma", "nama"], ["keris", "dhuwung", "wangkingan", "keris"], ["kowe", "sampeyan", "panjenengan", "kamu"],
  ["akon", "aken", "dhawuh", "menyuruh"], ["krungu", "mireng", "midhanget", "mendengar"], ["mlaku", "mlampah", "tindak", "berjalan"],
  ["lanang", "jaler", "kakung", "laki-laki"], ["lara", "sakit", "gerah", "sakit"], ["lunga", "kesah", "tindak", "pergi"],
  ["lungguh", "linggih", "lenggah", "duduk"], ["mulih", "wangsul", "kondur", "pulang"], ["nonton", "ningali", "mirsani", "melihat"],
  ["omah", "griya", "dalem", "rumah"], ["mangan", "nedha", "dhahar", "makan"], ["pikir", "manah", "penggalih", "berfikir"],
  ["nyilih", "nyambut", "ngampil", "meminjam"], ["slamet", "wilujeng", "sugeng", "selamat"], ["takon", "taken", "nyuwun pirsa", "bertanya"],
  ["tuku", "tumbas", "mundhut", "membeli"],
];

/* ---------- bantuan: petunjuk tanpa kunci jawaban ---------- */
const GLOSS = {
  aku: "saya", kowe: "kamu", mangan: "makan", turu: "tidur", omah: "rumah", ora: "tidak", iya: "ya", arep: "akan / mau",
  wis: "sudah", durung: "belum", lunga: "pergi", teka: "datang", ngomong: "berbicara", dhuwit: "uang", sirah: "kepala",
  tangan: "tangan", mripat: "mata", mulih: "pulang", tuku: "membeli", maca: "membaca", ngerti: "mengerti / tahu",
  nonton: "menonton", duwe: "mempunyai", sega: "nasi", sekul: "nasi", lagi: "sedang", nembe: "sedang", menyang: "ke",
  dhateng: "ke", ngendi: "mana", pundi: "mana", tindak: "pergi", dhahar: "makan", nedha: "makan", sare: "tidur",
  tilem: "tidur", ngunjuk: "minum", matur: "berbicara (kepada orang yang dihormati)", ngendika: "berbicara",
  dhawuh: "menyuruh / memerintah", kondur: "pulang", wangsul: "pulang / kembali", mundhut: "membeli", tumbas: "membeli",
  panjenengan: "Anda / kamu (hormat)", kula: "saya", sampeyan: "kamu", badhe: "akan", sampun: "sudah", dereng: "belum",
  mboten: "tidak", inggih: "ya", arta: "uang", griya: "rumah", dalem: "rumah / saya", rawuh: "datang", pirsa: "tahu",
  ngertos: "mengerti", kagungan: "mempunyai", gadhah: "mempunyai", mirsani: "melihat", ningali: "melihat", asta: "tangan",
  kesah: "pergi", sowan: "berkunjung / menghadap", tatu: "luka", simbah: "kakek / nenek", eyang: "kakek / nenek",
  adhi: "adik", kanca: "teman", raket: "akrab", sepantaran: "sebaya", sapantaran: "sebaya", diajeni: "dihormati",
  micara: "berbicara", takon: "bertanya", mangsuli: "menjawab", pamit: "berpamitan", ngaturi: "mempersilakan",
  maos: "membaca", peken: "pasar", ngurmati: "menghormati", tuwa: "tua", enom: "muda", ukara: "kalimat", tembung: "kata",
  kalungguhan: "kedudukan", umur: "usia", ulangan: "ujian", nyapu: "menyapu", pawon: "dapur", sesuk: "besok",
};
const MAT = {
  nl: "Ngoko lugu: seluruh kata dan imbuhan memakai ngoko. Dipakai kepada teman akrab, atau dari orang yang lebih tua/tinggi kepada yang lebih muda/rendah.",
  na: "Ngoko alus: dasarnya ngoko, tetapi kata kerja, kata ganti, dan kata benda tertentu untuk orang yang dihormati diganti krama inggil. Untuk diri sendiri tetap ngoko.",
  kl: "Krama lugu: semua kata memakai krama (termasuk untuk diri sendiri) tanpa krama inggil. Dipakai kepada orang yang belum akrab, atau dalam tulisan/pidato umum.",
  ka: "Krama alus: memakai kata krama dan krama inggil. Krama inggil untuk orang yang dihormati, krama untuk diri sendiri. Dipakai murid ke guru, anak ke orang tua, bawahan ke atasan.",
  ki: "Krama inggil dipakai untuk menghormati orang lain (yang diajak bicara atau yang dibicarakan), tidak boleh untuk diri sendiri.",
  self: "Perhatikan subjek kalimat: untuk diri sendiri jangan memakai krama inggil, cukup krama.",
  rule: "Ragam bahasa dipilih berdasarkan lawan bicara: umur, kedudukan, dan tingkat keakraban.",
};
const LEVEL_TIP = {
  C1: "Soal mengingat. Ingat kembali istilah atau padanan kata yang ditanyakan.",
  C2: "Soal memahami. Pahami maksud kalimat dan siapa yang diajak berbicara.",
  C3: "Soal menerapkan. Tentukan dulu siapa yang berbicara dan kepada siapa, lalu pilih kata untuk orang lain atau untuk diri sendiri.",
  C4: "Soal menganalisis. Periksa setiap kata pada pilihan: mana yang ngoko, krama, atau krama inggil, lalu bandingkan.",
};
function buildHint(q, level) {
  const s = q.q.toLowerCase();
  const keys = [];
  if (s.includes("ngoko lugu")) keys.push("nl");
  if (s.includes("ngoko alus")) keys.push("na");
  if (s.includes("krama lugu")) keys.push("kl");
  if (s.includes("krama alus")) keys.push("ka");
  if (s.includes("krama inggil")) keys.push("ki");
  if (/awake dhewe|\baku\b|kula/.test(s)) keys.push("self");
  if (!keys.length) keys.push("rule");
  const words = [...new Set(s.match(/[a-z]+/g) || [])].filter(w => GLOSS[w]).slice(0, 7);
  return `<p>💡 <b>Petunjuk konteks:</b> ${LEVEL_TIP[level]}</p>` +
    `<p>📘 <b>Materi:</b> ${keys.slice(0, 2).map(k => MAT[k]).join(" ")}</p>` +
    (words.length ? `<p>🔤 <b>Kosakata:</b> ${words.map(w => `<i>${w}</i> = ${GLOSS[w]}`).join("; ")}</p>` : "");
}

/* ---------- utilitas ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function showScreen(name) {
  $$(".screen").forEach(s => s.classList.toggle("active", s.id === "scr-" + name));
  window.scrollTo(0, 0);
}
const modalWaiters = {};
function openModal(id) {
  $("#" + id).classList.add("open");
  return new Promise(r => { modalWaiters[id] = r; });
}
function closeModal(id) {
  $("#" + id).classList.remove("open");
  const w = modalWaiters[id]; delete modalWaiters[id]; if (w) w();
}
let toastTimer;
function toast(msg, ms = 2200) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

/* ---------- suara (Web Audio, tanpa file) ---------- */
const SFX = (() => {
  let ctx = null, muted = false;
  try { muted = localStorage.getItem("ludo-mute") === "1"; } catch (e) { /* storage tidak tersedia */ }
  const ac = () => { if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (A) ctx = new A(); } if (ctx && ctx.state === "suspended") ctx.resume(); return ctx; };
  function tone(f, dur, type = "sine", vol = .2, at = 0, f2) {
    if (muted || !ac()) return;
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + .02);
  }
  function noise(dur, vol, at) {
    if (muted || !ac()) return;
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = "bandpass"; f.frequency.value = 1800 + Math.random() * 1500;
    s.buffer = buf; g.gain.value = vol; s.connect(f).connect(g).connect(ctx.destination); s.start(ctx.currentTime + at);
  }
  return {
    get muted() { return muted; },
    toggle() { muted = !muted; try { localStorage.setItem("ludo-mute", muted ? "1" : "0"); } catch (e) { /* abaikan */ } return muted; },
    dice() { let t = 0; for (let i = 0; i < 14; i++) { noise(.05, .5, t); t += .05 + i * .006; } },
    step() { tone(520 + Math.random() * 80, .08, "triangle", .15); },
    ok() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .25, "triangle", .2, i * .1)); },
    no() { tone(300, .45, "sawtooth", .15, 0, 110); },
    thud() { tone(140, .3, "square", .2, 0, 50); noise(.12, .4, 0); },
    sparkle() { [1319, 1568, 2093].forEach((f, i) => tone(f, .18, "sine", .12, i * .06)); },
    finish() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, .22, "square", .1, i * .12)); },
    win() { [392, 523, 659, 784, 659, 784, 1047, 1047].forEach((f, i) => tone(f, .3, "triangle", .2, i * .15)); },
  };
})();

/* ---------- efek visual ---------- */
function burstAt(el, colors = ["#ffd700", "#fff", "#ff9800"], n = 16) {
  const r = el.getBoundingClientRect(), fx = $("#fx");
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span"), a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 50;
    p.className = "particle";
    p.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${colors[i % colors.length]};--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d}px;--r:${Math.random() * 360}deg;border-radius:${i % 2 ? "50%" : "2px"}`;
    fx.appendChild(p); setTimeout(() => p.remove(), 1000);
  }
}
function confetti(n = 120) {
  const fx = $("#fx"), cols = ["#e53935", "#1e88e5", "#43a047", "#fdd835", "#ff9800", "#fff"];
  for (let i = 0; i < n; i++) {
    const c = document.createElement("span"), t = 2 + Math.random() * 2.5;
    c.className = "confetti";
    c.style.cssText = `left:${Math.random() * 100}vw;background:${cols[i % cols.length]};--t:${t}s;--x:${(Math.random() - .5) * 200}px;--r:${Math.random() * 1080}deg;animation-delay:${Math.random() * .8}s`;
    fx.appendChild(c); setTimeout(() => c.remove(), (t + 1) * 1000);
  }
}

/* =========================================================
   STATE
   ========================================================= */
let G = null;

function newPlayer(color, name) {
  return {
    color, name, help: 3, correct: 0, wrong: 0, travel: 0, deduct: 0, lastMoved: null,
    pawns: [0, 1, 2, 3].map(i => ({ i, p: -1, pts: 0, el: null })),
    used: { C1: new Set(), C2: new Set(), C3: new Set(), C4: new Set() },
    answers: [], log: [],
  };
}
const cur = () => G.players[G.turn];
const playerOf = c => G.players.find(p => p.color === c);
const finishedCount = pl => pl.pawns.filter(w => w.p === FINISH).length;
const isDone = pl => finishedCount(pl) === 4;
const totalPts = pl => pl.travel - pl.deduct;
const hasPawnOut = pl => pl.pawns.some(w => w.p >= 0 && w.p < FINISH);
function addLog(pl, text, delta) { pl.log.push({ text, delta }); }

/* ---------- papan ---------- */
function buildBoard() {
  const b = $("#board"); b.innerHTML = "";
  const put = (cls, r, c, w = 1, h = 1) => {
    const d = document.createElement("div"); d.className = cls;
    d.style.cssText = `left:${c * CELL}%;top:${r * CELL}%;width:${w * CELL}%;height:${h * CELL}%`;
    b.appendChild(d); return d;
  };
  COLORS.forEach(color => {
    const [r, c] = BASE_ORIGIN[color];
    const base = put(`base ${color}${r ? " bottom" : ""}`, r, c, 6, 6);
    base.dataset.color = color;
    base.innerHTML = `<div class="inner"></div><div class="bname">${esc(playerOf(color).name)}</div>`;
  });
  TRACK.forEach(([r, c], i) => {
    const owner = COLORS.find(col => START[col] === i);
    put(`cell${owner ? " start " + owner : ""}${SAFE.has(i) && !owner ? " safe" : ""}`, r, c);
  });
  COLORS.forEach(color => HOME_COL[color].forEach(([r, c]) => put(`cell ${color}`, r, c)));
  put("center", 6, 6, 3, 3);
  G.players.forEach(pl => pl.pawns.forEach(w => {
    const el = document.createElement("button");
    el.className = `pawn ${pl.color}`; el.type = "button";
    el.setAttribute("aria-label", `Pion ${LABEL[pl.color]} ${w.i + 1}`);
    el.innerHTML = `<span class="pb" style="--d:${(Math.random() * 2).toFixed(2)}s"></span>`;
    el.tabIndex = -1;
    el.addEventListener("click", () => onPawnClick(pl, w));
    b.appendChild(el); w.el = el;
  }));
}
function setPos(el, [r, c], s = 1, dr = 0, dc = 0) {
  el.style.width = el.style.height = CELL * s + "%";
  el.style.left = (c + (1 - s) / 2 + dc) * CELL + "%";
  el.style.top = (r + (1 - s) / 2 + dr) * CELL + "%";
}
const STACK = [[0, 0], [-.2, -.2], [.2, .2], [-.2, .2], [.2, -.2]];
/** Menyusun ulang semua pion dari data posisi (sumber kebenaran). */
function render() {
  const groups = {};
  G.players.forEach(pl => pl.pawns.forEach(w => {
    if (w.p >= 0 && w.p < FINISH) (groups[cellOf(pl.color, w.p).join()] ||= []).push(w);
  }));
  G.players.forEach(pl => pl.pawns.forEach(w => {
    const el = w.el;
    el.classList.toggle("done", w.p === FINISH);
    if (w.p === -1) return setPos(el, baseSpot(pl.color, w.i), .9);
    if (w.p === FINISH) return setPos(el, finishSpot(pl.color, w.i), .5);
    const g = groups[cellOf(pl.color, w.p).join()];
    if (g.length === 1) return setPos(el, cellOf(pl.color, w.p));
    const k = g.indexOf(w), [dr, dc] = STACK[(k % 4) + 1];
    setPos(el, cellOf(pl.color, w.p), .62, dr, dc);
  }));
  renderScores();
}
function renderScores() {
  $("#scoreboard").innerHTML = G.players.map((pl, i) => `
    <div class="score ${pl.color}${i === G.turn && !G.over ? " turn" : ""}${isDone(pl) ? " fin" : ""}">
      <b>${esc(pl.name)}</b><span class="pts">${totalPts(pl)}<i> poin</i></span>
      <small>✔ ${pl.correct} · ✘ ${pl.wrong} · 💡 ${pl.help} · 🏁 ${finishedCount(pl)}/4</small>
    </div>`).join("");
}
function setTurnUI(msg) {
  const pl = cur();
  $("#turn-box").className = "turn-box " + pl.color;
  $("#turn-name").textContent = pl.name;
  if (msg !== undefined) $("#turn-msg").textContent = msg;
  $$(".base").forEach(b => b.classList.toggle("active", b.dataset.color === pl.color));
  $("#btn-roll").disabled = G.phase !== "roll";
  renderScores();
}

/* ---------- dadu 3D ---------- */
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const FACE_ROT = { 1: [0, 0], 6: [0, 180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };
let diceSpin = 0;
function buildDice() {
  $("#dice").innerHTML = [1, 2, 3, 4, 5, 6].map(n =>
    `<div class="face f${n}">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => PIPS[n].includes(k) ? `<i style="grid-area:${Math.ceil(k / 3)}/${(k - 1) % 3 + 1}"></i>` : "").join("")}</div>`).join("");
}
async function rollDice(value) {
  const d = $("#dice");
  diceSpin += 2 + Math.floor(Math.random() * 2);
  const [x, y] = FACE_ROT[value];
  d.style.transition = "transform 1.5s cubic-bezier(.15,.75,.3,1)";
  d.classList.add("rolling");
  d.style.transform = `rotateX(-18deg) rotateY(18deg) rotateX(${x + 360 * diceSpin}deg) rotateY(${y + 360 * diceSpin}deg) rotateZ(${360 * diceSpin}deg)`;
  SFX.dice();
  await sleep(900); d.classList.remove("rolling");
  await sleep(650);
}

/** Modal singkat hasil dadu; tertutup otomatis atau saat diketuk. */
function diceInfo(value, text, ms) {
  $("#dm-num").textContent = value;
  $("#dm-text").textContent = text;
  const p = openModal("m-dice");
  const t = setTimeout(() => closeModal("m-dice"), ms);
  return p.then(() => clearTimeout(t));
}

/* ---------- simpan & pulihkan (tahan refresh) ---------- */
const SAVE_KEY = "ludo-unggah-ungguh-save";
function saveGame(extra = {}) {
  if (!G) return;
  const data = {
    turn: G.turn, phase: G.phase, dice: G.dice, winners: G.winners, over: G.over, natural: G.natural,
    endedAt: G.endedAt ? G.endedAt.toISOString() : null,
    q: G.q && { id: G.q.q.id, lv: G.q.lv, hinted: G.q.hinted },
    players: G.players.map(pl => ({
      color: pl.color, name: pl.name, help: pl.help, correct: pl.correct, wrong: pl.wrong, travel: pl.travel, deduct: pl.deduct,
      lastMoved: pl.lastMoved ? pl.lastMoved.i : null, pawns: pl.pawns.map(w => ({ p: w.p, pts: w.pts })),
      used: Object.fromEntries(Object.entries(pl.used).map(([k, v]) => [k, [...v]])), answers: pl.answers, log: pl.log,
    })),
    ...extra,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* storage tidak tersedia: permainan tetap jalan */ }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* abaikan */ } }
function loadGame() {
  let d;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
  if (!d || !Array.isArray(d.players) || d.players.length !== 4) return false;
  G = {
    players: d.players.map(s => {
      const pl = newPlayer(s.color, s.name);
      Object.assign(pl, { help: s.help, correct: s.correct, wrong: s.wrong, travel: s.travel, deduct: s.deduct, answers: s.answers, log: s.log });
      s.pawns.forEach((w, i) => Object.assign(pl.pawns[i], w));
      pl.lastMoved = s.lastMoved === null ? null : pl.pawns[s.lastMoved];
      for (const k in pl.used) pl.used[k] = new Set(s.used[k]);
      return pl;
    }),
    turn: d.turn, phase: "roll", dice: d.dice, winners: d.winners, over: false, natural: d.natural, q: null, chooser: null,
  };
  buildBoard(); render(); showScreen("game");
  if (d.over) {
    G.over = true; G.phase = "over"; G.endedAt = new Date(d.endedAt);
    G.results = computeResults(); showResults();
  } else if (d.phase === "question" && d.q) {
    setTurnUI("Jawab soal");
    askQuestion(d.q.lv, BANK_SOAL[d.q.lv].find(q => q.id === d.q.id), d.q.hinted);
  } else if (d.phase === "resolve") {
    // jawaban sudah dinilai sebelum refresh: lanjutkan akibatnya
    G.phase = "anim"; setTurnUI("");
    (d.ok ? afterCorrect(cur()) : afterWrong(cur())).then(() => { if (!G.over) endTurn(); });
  } else {
    setTurnUI("Kocok dadu");
  }
  toast("Permainan dilanjutkan");
  return true;
}

/* =========================================================
   ALUR PERMAINAN
   ========================================================= */
function startGame(names) {
  G = {
    players: COLORS.map(c => newPlayer(c, names[c])),
    turn: Math.floor(Math.random() * 4), phase: "roll", dice: 0, winners: [], over: false, natural: false, q: null, chooser: null,
  };
  buildBoard(); render(); showScreen("game");
  setTurnUI("Kocok dadu");
  toast(`Mulai: ${cur().name}`);
  saveGame();
}

async function onRoll() {
  if (!G || G.phase !== "roll" || G.over) return;
  G.phase = "rolling"; setTurnUI("Mengocok…");
  const value = 1 + Math.floor(Math.random() * 6);
  await rollDice(value);
  if (G.over) return;
  G.dice = value;
  if (!hasPawnOut(cur()) && value !== 6) {
    // belum ada pion keluar: tanpa soal, giliran langsung berpindah
    addLog(cur(), `Dadu ${value}: belum ada pion keluar, tidak ada soal`, 0);
    setTurnUI("Butuh angka 6");
    await diceInfo(value, "Butuh angka 6 untuk keluar", 1600);
    if (!G.over) endTurn();
    return;
  }
  const lv = LEVEL_OF_DICE[value];
  setTurnUI("Jawab soal");
  await diceInfo(value, `Soal ${LEVEL_NAME[lv]}`, 1300);
  if (!G.over) askQuestion(lv);
}

function pickQuestion(pl, lv) {
  let pool = BANK_SOAL[lv].filter(q => !pl.used[lv].has(q.id));
  if (!pool.length) { pl.used[lv].clear(); pool = BANK_SOAL[lv]; } // semua soal level ini sudah dipakai pemain ini
  const q = pool[Math.floor(Math.random() * pool.length)];
  pl.used[lv].add(q.id);
  return q;
}

function askQuestion(lv, q = pickQuestion(cur(), lv), hinted = false) {
  const pl = cur();
  G.q = { q, lv, hinted };
  G.phase = "question";
  const box = $("#m-soal .modal-box");
  box.style.setProperty("--qc", `var(--${pl.color === "yellow" ? "yellow-d" : pl.color})`);
  $("#q-player").textContent = `${pl.name} · ${LABEL[pl.color]} · 🎲 ${G.dice}`;
  $("#q-level").textContent = LEVEL_NAME[lv];
  $("#q-text").textContent = q.q;
  $("#q-options").innerHTML = q.o.map((o, i) => `<button class="opt" data-i="${i}"><b>${"ABCD"[i]}</b><span>${esc(o)}</span></button>`).join("");
  $("#q-hint").innerHTML = hinted ? buildHint(q, lv) : "";
  $("#q-hint").hidden = !hinted;
  updateHintBtn();
  openModal("m-soal");
  saveGame();
}
function updateHintBtn() {
  const pl = cur();
  $("#hint-left").textContent = pl.help;
  $("#btn-hint").disabled = pl.help <= 0 || G.q.hinted || G.phase !== "question";
}
function onHint() {
  const pl = cur();
  if (G.phase !== "question" || pl.help <= 0 || G.q.hinted) return;
  pl.help--; G.q.hinted = true;
  $("#q-hint").innerHTML = buildHint(G.q.q, G.q.lv);
  $("#q-hint").hidden = false;
  addLog(pl, `Memakai bantuan (sisa ${pl.help})`, 0);
  updateHintBtn(); renderScores(); saveGame();
}

async function onAnswer(i) {
  if (G.phase !== "question") return;
  G.phase = "feedback";
  const pl = cur(), { q, lv, hinted } = G.q, ok = i === q.a;
  const noPenalty = !hasPawnOut(pl); // soal angka 6 untuk keluar kandang: salah tidak dikurangi
  $$("#q-options .opt").forEach((b, k) => {
    b.disabled = true;
    if (k === i) b.style.borderColor = ok ? "var(--green)" : "var(--red)";
  });
  updateHintBtn();
  pl.answers.push({ id: q.id, lv, dice: G.dice, q: q.q, chosen: "ABCD"[i], key: "ABCD"[q.a], keyText: q.o[q.a], chosenText: q.o[i], ok, hinted });
  if (ok) pl.correct++;
  else if (noPenalty) { pl.wrong++; addLog(pl, `Jawaban salah (${q.id}), tanpa pengurangan karena belum ada pion keluar`, 0); }
  else { pl.wrong++; pl.deduct += 2; addLog(pl, `Jawaban salah (${q.id})`, -2); }
  renderScores();
  saveGame({ phase: "resolve", ok });
  await sleep(600);
  closeModal("m-soal");
  if (G.over) return;
  const icon = $("#fb-icon");
  icon.className = "fb-icon " + (ok ? "ok" : "no"); icon.textContent = ok ? "✔" : "✘";
  $("#fb-text").textContent = ok
    ? "Maturnuwun, wangsulanipun panjenengan leres. Mangga saged nglajengaken lampah."
    : "Ngapunten, wangsulanipun dereng leres.";
  $("#fb-extra").textContent = ok ? "" : noPenalty ? "Tanpa pengurangan poin karena belum ada pion yang keluar." : "−2 poin";
  $("#btn-fb").className = "btn big " + (ok ? "green" : "red");
  ok ? SFX.ok() : SFX.no();
  await openModal("m-feedback");
  if (G.over) return;
  G.phase = "anim";
  if (ok) await afterCorrect(pl); else await afterWrong(pl);
  if (!G.over) endTurn();
}

const canMove = (w, d) => w.p === -1 ? d === 6 : w.p < FINISH && w.p + d <= FINISH;

async function afterCorrect(pl) {
  const d = G.dice, movable = pl.pawns.filter(w => canMove(w, d));
  if (!movable.length) {
    setTurnUI("Tidak ada pion yang bisa jalan");
    await sleep(1200);
    return;
  }
  let w = movable[0];
  if (movable.length > 1) {
    G.phase = "choose";
    setTurnUI(`Pilih pion (${d} langkah)`);
    movable.forEach(m => { m.el.classList.add("movable"); m.el.tabIndex = 0; });
    w = await new Promise(r => { G.chooser = { r, movable }; });
    movable.forEach(m => { m.el.classList.remove("movable"); m.el.tabIndex = -1; });
    if (G.over) return;
    G.phase = "anim";
  }
  await moveForward(pl, w, d);
}
function onPawnClick(pl, w) {
  if (!G || G.phase !== "choose" || !G.chooser || !G.chooser.movable.includes(w)) return;
  const c = G.chooser; G.chooser = null;
  w.el.classList.add("selected"); SFX.step();
  setTimeout(() => w.el.classList.remove("selected"), 300);
  c.r(w);
}

async function walk(color, w, from, to) {
  const el = w.el, dir = to > from ? 1 : -1;
  el.classList.add("moving");
  for (let p = from + dir; ; p += dir) {
    const pos = p === -1 ? baseSpot(color, w.i) : p === FINISH ? finishSpot(color, w.i) : cellOf(color, p);
    setPos(el, pos, p === FINISH ? .5 : 1);
    el.classList.remove("hop"); void el.offsetWidth; el.classList.add("hop");
    SFX.step();
    await sleep(STEP_MS);
    if (p === to) break;
  }
  el.classList.remove("moving", "hop");
}
async function flyHome(pl, w) {
  const el = w.el;
  el.classList.add("fly");
  setPos(el, baseSpot(pl.color, w.i), .9);
  await sleep(720);
  el.classList.remove("fly");
  el.classList.add("vanish"); await sleep(200); el.classList.remove("vanish"); // teleportasi ringan
  el.classList.add("land"); SFX.sparkle(); await sleep(400); el.classList.remove("land");
}
function occupants(cellKey, except) {
  const res = [];
  G.players.forEach(pl => pl.pawns.forEach(w => {
    if (w !== except && w.p >= 0 && w.p < FINISH && cellOf(pl.color, w.p).join() === cellKey) res.push({ pl, w });
  }));
  return res;
}

async function moveForward(pl, w, d) {
  const from = w.p, steps = from === -1 ? 1 : d, to = from === -1 ? 0 : from + d;
  // data dahulu, animasi hanya visualisasi
  w.p = to; w.pts += steps; pl.travel += steps; pl.lastMoved = w;
  addLog(pl, from === -1 ? `Pion ${w.i + 1} keluar dari kotak awal` : `Pion ${w.i + 1} maju ${steps} langkah`, steps);
  setTurnUI(from === -1 ? "Pion keluar!" : `Maju ${steps}`);
  await walk(pl.color, w, from, to);
  if (G.over) return render();

  const captured = [];
  if (to <= 50 && !SAFE.has(absIndex(pl.color, to))) {
    occupants(cellOf(pl.color, to).join(), w).forEach(o => { if (o.pl !== pl) captured.push(o); });
  }
  if (to === FINISH) {
    w.el.classList.add("land"); burstAt(w.el, ["#ffd700", "#fff", "#ff5252", "#40c4ff"], 30); SFX.finish(); confetti(40);
    setTurnUI("Pion finis! 🌟");
    await sleep(700); w.el.classList.remove("land");
  } else {
    w.el.classList.add("land"); burstAt(w.el); SFX.sparkle(); await sleep(400); w.el.classList.remove("land");
  }
  for (const { pl: op, w: ow } of captured) {
    op.deduct += ow.pts; addLog(op, `Pion ${ow.i + 1} dimakan ${LABEL[pl.color]}, kembali ke kotak awal`, -ow.pts);
    ow.p = -1; ow.pts = 0;
    toast(`Pion ${LABEL[op.color]} dimakan!`);
    SFX.thud(); ow.el.classList.add("bump"); await sleep(450); ow.el.classList.remove("bump");
    await flyHome(op, ow);
  }
  render();
  if (to === FINISH && isDone(pl)) await teamWins(pl);
}

async function afterWrong(pl) {
  const onTrack = pl.pawns.filter(w => w.p >= 0 && w.p < FINISH);
  if (!onTrack.length) {
    setTurnUI("Pion tetap di kandang");
    await sleep(1100);
    return;
  }
  // pion yang mundur: pion terakhir digerakkan, atau pion terdepan
  const w = onTrack.includes(pl.lastMoved) ? pl.lastMoved : onTrack.reduce((a, b) => b.p > a.p ? b : a);
  const el = w.el;
  el.classList.add("shake"); await sleep(450); el.classList.remove("shake");
  if (w.p === 0) {
    // mundur dari petak awal berarti kembali ke kotak awal
    pl.deduct += w.pts; addLog(pl, `Pion ${w.i + 1} mundur dari petak awal ke kotak awal`, -w.pts);
    w.p = -1; w.pts = 0;
    setTurnUI("Kembali ke kandang");
    await flyHome(pl, w);
    return render();
  }
  const target = w.p - 1, blockers = occupants(cellOf(pl.color, target).join(), w);
  if (blockers.length) {
    // tabrakan: animasi setengah langkah, terpental, lalu kembali ke kotak awal
    setTurnUI("Tabrakan! Kembali ke kandang");
    const [r0, c0] = cellOf(pl.color, w.p), [r1, c1] = cellOf(pl.color, target);
    el.classList.add("moving"); setPos(el, [(r0 + r1) / 2, (c0 + c1) / 2]); await sleep(260);
    SFX.thud(); blockers.forEach(b => b.w.el.classList.add("shake"));
    el.classList.add("bump"); await sleep(520);
    el.classList.remove("bump", "moving"); blockers.forEach(b => b.w.el.classList.remove("shake"));
    pl.deduct += w.pts; addLog(pl, `Pion ${w.i + 1} bertabrakan saat mundur, kembali ke kotak awal`, -w.pts);
    w.p = -1; w.pts = 0;
    await flyHome(pl, w);
    return render();
  }
  const from = w.p;
  w.p = target; w.pts -= 1; pl.deduct += 1;
  addLog(pl, `Pion ${w.i + 1} mundur 1 langkah`, -1);
  setTurnUI("Mundur 1");
  await walk(pl.color, w, from, target);
  el.classList.add("land"); await sleep(400); el.classList.remove("land");
  render();
}

async function teamWins(pl) {
  G.winners.push(pl.color);
  const rank = G.winners.length;
  addLog(pl, `Keempat pion finis — JUARA ${rank}`, 0);
  $("#win-rank").textContent = `JUARA ${rank}`;
  $("#win-text").textContent = `${pl.name} (${LABEL[pl.color]})`;
  SFX.win(); confetti(160);
  await openModal("m-win");
  const left = G.players.filter(p => !isDone(p));
  if (left.length <= 1) { G.natural = true; endGame(); }
}

function endTurn() {
  const pl = cur();
  const extra = G.dice === 6 && !isDone(pl);
  if (!extra) {
    do { G.turn = (G.turn + 1) % 4; } while (isDone(cur()));
  }
  G.phase = "roll"; G.q = null;
  render();
  setTurnUI(extra ? "Angka 6, main lagi!" : "Kocok dadu");
  if (extra) toast("🎲 Angka 6! Main lagi");
  saveGame();
}

/* =========================================================
   PENILAIAN & HASIL
   ========================================================= */
const CAPS = [100, 89, 79, 69]; // nilai maksimal per peringkat
function computeResults() {
  const rows = G.players.map(pl => {
    const progress = pl.pawns.reduce((s, w) => s + Math.max(0, w.p), 0);
    const answered = pl.correct + pl.wrong;
    const A = progress / (4 * FINISH) * 100;
    const B = answered ? pl.correct / answered * 100 : 0;
    const C = Math.max(0, Math.min(100, totalPts(pl) / (4 * FINISH) * 100));
    return { pl, progress, A, B, C, perf: .4 * A + .4 * B + .2 * C, fin: finishedCount(pl), total: totalPts(pl) };
  });
  const winIdx = c => { const i = G.winners.indexOf(c); return i < 0 ? 99 : i; };
  rows.sort((a, b) => winIdx(a.pl.color) - winIdx(b.pl.color) || b.perf - a.perf || b.total - a.total || b.pl.correct - a.pl.correct);
  // hasil identik (status juara, skor kinerja, total poin) = peringkat seri = nilai sama
  const same = (a, b) => winIdx(a.pl.color) === winIdx(b.pl.color) && Math.abs(a.perf - b.perf) < 1e-9 && a.total === b.total;
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    r.rank = prev && same(prev, r) ? prev.rank : i + 1;
    r.grade = Math.min(Math.round(50 + r.perf / 2), CAPS[r.rank - 1]);
    if (prev) r.grade = r.rank === prev.rank ? prev.grade : Math.min(r.grade, prev.grade - 1);
  });
  rows.forEach(r => {
    r.tie = rows.filter(o => o.rank === r.rank).length > 1;
    r.isWinner = G.winners.includes(r.pl.color);
    r.label = (r.isWinner || G.natural ? `Juara ${r.rank}` : `Peringkat ${r.rank}`) + (r.tie ? " (seri)" : "");
    r.status = r.fin === 4 ? "Selesai (4 pion finis)" : G.natural ? "Juara terakhir" : "Belum selesai";
  });
  console.assert(rows.every((r, i) => i === 0 || (r.rank === rows[i - 1].rank ? r.grade === rows[i - 1].grade : r.grade < rows[i - 1].grade)), "nilai harus menurun sesuai peringkat, seri sama");
  return rows;
}
function statusText() {
  if (G.natural) return { text: "🏁 Permainan selesai — semua juara telah ditentukan", none: false };
  if (!G.winners.length) return { text: "⏹ Permainan diakhiri — TANPA PEMENANG", none: true };
  return { text: "⏹ Permainan diakhiri sebelum semua pemain selesai", none: false };
}
const CALC_TEXT = `
  <p><b>Poin perjalanan:</b> +1 setiap langkah maju (termasuk keluar dari kotak awal).<br>
  <b>Pengurangan:</b> −2 setiap jawaban salah, −1 setiap langkah mundur, dan seluruh poin perjalanan pion hilang jika pion kembali ke kotak awal.</p>
  <p><b>Skor kinerja (0–100)</b> = 40% Posisi pion + 40% Ketepatan menjawab + 20% Poin, dengan:<br>
  Posisi pion = jumlah langkah keempat pion ÷ 224 × 100; Ketepatan = benar ÷ (benar + salah) × 100; Poin = total poin ÷ 224 × 100 (minimal 0).</p>
  <p><b>Peringkat:</b> pemain yang lebih dulu memasukkan keempat pion menempati peringkat teratas; sisanya diurutkan berdasarkan skor kinerja.</p>
  <p><b>Nilai akhir</b> = 50 + (skor kinerja ÷ 2), lalu dibatasi maksimal sesuai peringkat: Juara 1: 100, Juara 2: 89, Juara 3: 79, Juara 4: 69. Peringkat yang lebih rendah selalu bernilai lebih rendah. Pemain dengan hasil yang sama persis mendapat peringkat seri dan nilai yang sama. Tidak ada nilai nol.</p>`;

function endGame() {
  if (G.over) return;
  G.over = true; G.phase = "over";
  if (G.chooser) { const c = G.chooser; G.chooser = null; c.r(null); }
  ["m-soal", "m-feedback", "m-confirm", "m-win", "m-dice"].forEach(closeModal);
  render(); // posisi terakhir disimpan di G dan dipulihkan dari data
  G.results = computeResults();
  G.endedAt = new Date();
  saveGame();
  showResults();
}
function showResults() {
  const st = statusText(), rows = G.results;
  $("#result-status").textContent = st.text;
  $("#result-status").className = "result-status" + (st.none ? " none" : "");
  $("#result-list").innerHTML = rows.map((r, i) => {
    const pl = r.pl;
    return `<div class="res-card" style="--rc:var(--${pl.color === "yellow" ? "yellow-d" : pl.color});animation-delay:${i * .1}s">
      <div class="res-rank"><span>${r.isWinner || G.natural ? "🏆" : "#"}${r.rank}</span>${r.label}</div>
      <div><div class="res-name">${esc(pl.name)} <small>(${LABEL[pl.color]})</small></div>
        <div class="res-stats">
          <span>Status: <b>${r.status}</b></span><span>🏁 Pion finis: <b>${r.fin}/4</b></span>
          <span>✔ Benar: <b>${pl.correct}</b></span><span>✘ Salah: <b>${pl.wrong}</b></span>
          <span>💡 Bantuan: <b>${3 - pl.help}/3</b></span><span>➕ Poin perjalanan: <b>${pl.travel}</b></span>
          <span>➖ Pengurangan: <b>${pl.deduct}</b></span><span>Σ Total poin: <b>${r.total}</b></span>
          <span>Skor kinerja: <b>${r.perf.toFixed(1)}</b></span>
        </div></div>
      <div class="res-grade">Nilai akhir<span>${r.grade}</span></div>
    </div>`;
  }).join("");
  $("#calc-text").innerHTML = CALC_TEXT;
  showScreen("result");
  if (G.winners.length) confetti(100);
}
function showDetail() {
  const rows = G.results;
  const tabs = $("#detail-tabs");
  tabs.innerHTML = rows.map((r, i) => `<button class="tab${i ? "" : " active"}" data-i="${i}">${esc(r.pl.name)}</button>`).join("");
  const draw = i => {
    const { pl, A, B, C, perf, grade, progress } = rows[i];
    $("#detail-body").innerHTML = `
      <p><b>${esc(pl.name)}</b> (${LABEL[pl.color]}) · ${rows[i].label} · Nilai akhir <b>${grade}</b></p>
      <div class="table-scroll"><table class="vocab"><thead><tr><th>Komponen</th><th>Nilai</th></tr></thead><tbody>
        <tr><td>Posisi pion (${progress}/224 langkah)</td><td>${A.toFixed(1)}</td></tr>
        <tr><td>Ketepatan menjawab (${pl.correct}/${pl.correct + pl.wrong})</td><td>${B.toFixed(1)}</td></tr>
        <tr><td>Poin (${totalPts(pl)} poin)</td><td>${C.toFixed(1)}</td></tr>
        <tr><td><b>Skor kinerja</b> (40% · 40% · 20%)</td><td><b>${perf.toFixed(1)}</b></td></tr>
        <tr><td>Posisi akhir pion</td><td>${pl.pawns.map(w => `P${w.i + 1}: ${w.p === -1 ? "kotak awal" : w.p === FINISH ? "finis" : w.p > 50 ? `jalur finis ${w.p - 50}/5` : `langkah ${w.p}`}`).join(" · ")}</td></tr>
      </tbody></table></div>
      <h4>Riwayat jawaban (${pl.answers.length})</h4>
      ${pl.answers.length ? `<ol class="log">${pl.answers.map(a => `<li class="${a.ok ? "ok" : "no"}">[${a.lv} · 🎲${a.dice}] ${esc(a.q)}<br>
        Jawaban: <b>${a.chosen}. ${esc(a.chosenText)}</b> ${a.ok ? "✔ benar" : `✘ salah (kunci: ${a.key}. ${esc(a.keyText)})`}${a.hinted ? " · 💡 bantuan" : ""}</li>`).join("")}</ol>` : "<p>Belum ada soal dijawab.</p>"}
      <h4>Riwayat poin</h4>
      ${pl.log.length ? `<ol class="log">${pl.log.map(l => `<li class="${l.delta > 0 ? "ok" : l.delta < 0 ? "no" : ""}">${esc(l.text)}${l.delta ? ` (${l.delta > 0 ? "+" : ""}${l.delta})` : ""}</li>`).join("")}</ol>` : "<p>-</p>"}`;
  };
  tabs.onclick = e => {
    const b = e.target.closest(".tab"); if (!b) return;
    $$("#detail-tabs .tab").forEach(t => t.classList.toggle("active", t === b)); draw(+b.dataset.i);
  };
  draw(0); openModal("m-detail");
}
const T = s => String(s).replace(/[−–]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "");
function downloadPDF() {
  const J = window.jspdf && window.jspdf.jsPDF;
  if (!J) { toast("Pustaka PDF belum termuat. Gunakan 'Simpan sebagai PDF' pada dialog cetak."); return window.print(); }
  const doc = new J({ orientation: "landscape", unit: "mm", format: "a4" });
  const rows = G.results, W = doc.internal.pageSize.getWidth();
  doc.setFillColor(141, 85, 36); doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("TRANSKRIP HASIL PERMAINAN", W / 2, 10, { align: "center" });
  doc.setFontSize(11); doc.text("Ludo Unggah-Ungguh Basa Jawa", W / 2, 17, { align: "center" });
  doc.setTextColor(40); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Tanggal: ${G.endedAt.toLocaleString("id-ID")}`, 14, 30);
  doc.text(`Status: ${statusText().text.replace(/^[^A-Za-z]+/, "")}`, 14, 36);
  doc.autoTable({
    startY: 41,
    head: [["Peringkat", "Nama", "Warna", "Status", "Pion Finis", "Benar", "Salah", "Bantuan", "Poin Perjalanan", "Pengurangan", "Total Poin", "Skor Kinerja", "Nilai Akhir"]],
    body: rows.map(r => [T(r.label), T(r.pl.name), LABEL[r.pl.color], r.status, `${r.fin}/4`, r.pl.correct, r.pl.wrong, `${3 - r.pl.help}/3`, r.pl.travel, r.pl.deduct, r.total, r.perf.toFixed(1), r.grade]),
    headStyles: { fillColor: [93, 58, 26], fontSize: 8 }, styles: { fontSize: 9, halign: "center" }, columnStyles: { 1: { halign: "left" } },
  });
  let y = doc.lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold"); doc.text("Cara penghitungan nilai", 14, y); doc.setFont("helvetica", "normal"); y += 5;
  const tmp = document.createElement("div"); tmp.innerHTML = CALC_TEXT;
  doc.splitTextToSize(T(tmp.innerText.replace(/\n\s*\n/g, "\n").trim()), W - 28).forEach(line => { doc.text(line, 14, y); y += 4.6; });
  rows.forEach(r => {
    doc.addPage();
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(T(`Rincian: ${r.pl.name} (${LABEL[r.pl.color]}) - ${r.label} - Nilai ${r.grade}`), 14, 16);
    doc.autoTable({
      startY: 22,
      head: [["No", "Level", "Dadu", "Soal", "Jawaban", "Kunci", "Hasil", "Bantuan"]],
      body: r.pl.answers.map((a, i) => [i + 1, a.lv, a.dice, T(a.q), a.chosen, a.key, a.ok ? "Benar" : "Salah", a.hinted ? "Ya" : "-"]),
      headStyles: { fillColor: [93, 58, 26] }, styles: { fontSize: 8 }, columnStyles: { 3: { cellWidth: 150 } },
    });
  });
  doc.save(`transkrip-ludo-unggah-ungguh-${G.endedAt.toISOString().slice(0, 10)}.pdf`);
}

/* =========================================================
   EVENT
   ========================================================= */
function init() {
  buildDice();
  $("#vocab-table tbody").innerHTML = VOCAB.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("");
  $("#vocab-search").addEventListener("input", e => {
    const s = e.target.value.trim().toLowerCase();
    $$("#vocab-table tbody tr").forEach(tr => { tr.hidden = !!s && !tr.textContent.toLowerCase().includes(s); });
  });

  document.addEventListener("click", e => {
    const go = e.target.closest("[data-go]");
    if (go) showScreen(go.dataset.go);
    const m = e.target.closest("[data-modal]");
    if (m) openModal(m.dataset.modal);
    const c = e.target.closest("[data-close]");
    if (c) closeModal(c.closest(".modal").id);
    const tab = e.target.closest("#m-materi [data-tab]");
    if (tab) {
      $$("#m-materi .tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab.dataset.tab));
      $$("#m-materi .tab-panel").forEach(p => p.classList.toggle("active", p.id === tab.dataset.tab));
      $("#m-materi .modal-box").scrollTop = 0;
    }
    const opt = e.target.closest("#q-options .opt");
    if (opt) onAnswer(+opt.dataset.i);
  });
  // klik latar menutup modal informasi (bukan modal permainan)
  ["m-materi", "m-aturan", "m-pembuat", "m-detail"].forEach(id =>
    $("#" + id).addEventListener("click", e => { if (e.target.id === id) closeModal(id); }));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") ["m-materi", "m-aturan", "m-pembuat", "m-detail", "m-confirm"].forEach(id => $("#" + id).classList.contains("open") && closeModal(id));
  });

  $("#setup-form").addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target), names = {};
    COLORS.forEach(c => { names[c] = (f.get(c) || "").trim() || `Pemain ${LABEL[c]}`; });
    startGame(names);
  });
  $("#btn-roll").addEventListener("click", onRoll);
  $("#btn-hint").addEventListener("click", onHint);
  $("#btn-fb").addEventListener("click", () => closeModal("m-feedback"));
  $("#btn-end").addEventListener("click", () => { if (G && !G.over) openModal("m-confirm"); });
  $("#btn-yes").addEventListener("click", () => { closeModal("m-confirm"); endGame(); });
  $("#btn-detail").addEventListener("click", showDetail);
  $("#btn-pdf").addEventListener("click", downloadPDF);
  $("#btn-again").addEventListener("click", () => { clearSave(); G = null; showScreen("setup"); });
  $("#scr-result [data-go=menu]").addEventListener("click", () => { clearSave(); G = null; });
  const snd = $("#btn-sound");
  const drawSnd = () => { snd.textContent = SFX.muted ? "🔇" : "🔊"; snd.title = SFX.muted ? "Suara mati" : "Suara hidup"; snd.setAttribute("aria-pressed", SFX.muted); };
  snd.addEventListener("click", () => { SFX.toggle(); drawSnd(); });
  drawSnd();
  window.addEventListener("resize", () => { if (G && !G.over) render(); });
}
document.addEventListener("DOMContentLoaded", () => { init(); loadGame(); });
