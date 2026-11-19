import * as THREE from 'three';
export { THREE };

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

/* ---------- materials (PBR) ---------- */
const mats = new Map();
export function M(color, o) {
  if (!o && mats.has(color)) return mats.get(color);
  const p = { color, roughness: 0.78, metalness: 0 };
  if (o) {
    if (o.r !== undefined) p.roughness = o.r;
    if (o.m !== undefined) p.metalness = o.m;
    if (o.e !== undefined) { p.emissive = o.e; p.emissiveIntensity = o.ei ?? 1; }
    if (o.t !== undefined) { p.transparent = true; p.opacity = o.t; p.depthWrite = false; }
    if (o.map) p.map = o.map;
    if (o.side) p.side = o.side;
  }
  const m = new THREE.MeshStandardMaterial(p);
  if (!o) { m.userData.shared = true; mats.set(color, m); }
  return m;
}
export const metal = (c = 0xc3cbd3, r = 0.26) => M(c, { r, m: 1 });
export const glow = (c, i = 1.4) => M(c, { e: c, ei: i, r: 0.5 });
export const glass = (c = 0x9fd3ff, t = 0.22) => M(c, { t, r: 0.05, m: 0.1 });

/* ---------- mesh helpers ---------- */
const asMat = (c) => (c && c.isMaterial ? c : M(c));
function fin(p, m, x, y, z) { m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (p) p.add(m); return m; }
export const box = (p, w, h, d, c, x = 0, y = 0, z = 0) => fin(p, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), asMat(c)), x, y, z);
export const cyl = (p, rt, rb, h, c, x = 0, y = 0, z = 0, seg = 18) => fin(p, new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), asMat(c)), x, y, z);
export const sph = (p, r, c, x = 0, y = 0, z = 0, seg = 18) => fin(p, new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 4)), asMat(c)), x, y, z);
export const cap = (p, r, len, c, x = 0, y = 0, z = 0) => fin(p, new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), asMat(c)), x, y, z);
export const tor = (p, R, r, c, x = 0, y = 0, z = 0, arc = Math.PI * 2) => fin(p, new THREE.Mesh(new THREE.TorusGeometry(R, r, 10, 36, arc), asMat(c)), x, y, z);
export const cone = (p, r, h, c, x = 0, y = 0, z = 0, seg = 14) => fin(p, new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), asMat(c)), x, y, z);
export function plane(p, w, h, c, x = 0, y = 0, z = 0) { const m = fin(p, new THREE.Mesh(new THREE.PlaneGeometry(w, h), asMat(c)), x, y, z); m.castShadow = false; return m; }
export function grp(p, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (p) p.add(g); return g; }
export function noShadow(o) { o.traverse((m) => { m.castShadow = false; }); return o; }

/* ---------- canvas helpers ---------- */
export function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export function wrapLines(g, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
    out.push(line);
  }
  return out;
}
export function wrapText(g, text, x, y, maxW, lh, maxLines = 99) { const L = wrapLines(g, text, maxW); for (let i = 0; i < Math.min(L.length, maxLines); i++) { g.fillText(L[i], x, y); y += lh; } return y; }
export const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
export function makeScreen(p, w, h, pw, ph, x = 0, y = 0, z = 0, o = {}) {
  const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph; const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: !!o.transparent, depthWrite: !o.transparent }));
  mesh.position.set(x, y, z); if (p) p.add(mesh);
  return { cv, ctx, tex, mesh, w: pw, h: ph, dirty() { tex.needsUpdate = true; } };
}
// static text label on a plane
export function label(p, text, w, h, x = 0, y = 0, z = 0, o = {}) {
  const ph = o.px || 96, pw = Math.min(1024, Math.round((ph * w) / h));
  const s = makeScreen(p, w, h, pw, ph, x, y, z, { transparent: !o.bg });
  s.set = (t) => {
    const g = s.ctx; g.clearRect(0, 0, pw, ph);
    if (o.bg) { g.fillStyle = o.bg; rr(g, 0, 0, pw, ph, ph * 0.18); g.fill(); }
    g.fillStyle = o.color || '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = Math.round(ph * (o.size || 0.5)); const lines0 = String(t).split('\n');
    for (; fs > 12; fs -= 2) { g.font = `${o.weight || 600} ${fs}px ${FONT}`; const L = wrapLines(g, t, pw * 0.92); if (L.length * fs * 1.15 <= ph * 0.94 && L.length <= Math.max(lines0.length, o.lines || 2)) { L.forEach((ln, i) => g.fillText(ln, pw / 2, ph / 2 + (i - (L.length - 1) / 2) * fs * 1.15)); break; } }
    s.dirty();
  };
  s.set(text);
  return s;
}

/* ---------- procedural textures ---------- */
function speckle(g, w, h, n, a) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } }
export const tex = {
  tiles: (c1, c2, rep) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = c1; g.fillRect(0, 0, w, h); speckle(g, w, h, 900, 0.05); g.strokeStyle = c2; g.lineWidth = 3; g.strokeRect(0, 0, w, h); g.strokeRect(0, 0, w / 2, h / 2); g.strokeRect(w / 2, h / 2, w / 2, h / 2); }, rep),
  noise: (c1, rep, amt = 0.08, n = 2600) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = c1; g.fillRect(0, 0, w, h); speckle(g, w, h, n, amt); }, rep),
  planks: (c1, c2, rep) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = c1; g.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.07})`; g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 6, w * 0.6, y - 6, w, y + 2); g.stroke(); } g.strokeStyle = c2; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, (i * h) / 4); g.lineTo(w, (i * h) / 4); g.stroke(); } }, rep),
  stripes: (c1, c2, rep) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = c1; g.fillRect(0, 0, w, h); g.fillStyle = c2; for (let i = 0; i < 8; i++) g.fillRect(i * 16, 0, 5, h); }, rep),
  hazard: (rep) => canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#f5c518'; g.fillRect(0, 0, w, h); g.fillStyle = '#16181c'; for (let i = -2; i < 6; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 16, 0); g.lineTo(i * 32 + 16 + h, h); g.lineTo(i * 32 + h, h); g.fill(); } }, rep),
  grass: (rep) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2f7d32'; g.fillRect(0, 0, w, h); g.fillStyle = '#35893a'; g.fillRect(0, 0, w / 2, h); speckle(g, w, h, 3000, 0.07); }, rep),
};

/* ---------- audio (procedural) ---------- */
let AC = null, master = null;
export const audio = {
  on: true,
  init() { try { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.5; master.connect(AC.destination); } if (AC.state === 'suspended') AC.resume(); } catch (e) { /* no audio */ } },
  beep(f = 880, d = 0.08, type = 'sine', v = 0.22, when = 0) {
    if (!AC || !this.on) return;
    try { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; const t = AC.currentTime + when; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.03); } catch (e) { /* ignore */ }
  },
  ok() { this.beep(660, 0.09); this.beep(990, 0.14, 'sine', 0.22, 0.08); },
  bad() { this.beep(150, 0.28, 'sawtooth', 0.22); },
  tick() { this.beep(1300, 0.025, 'square', 0.07); },
  thump() { this.beep(90, 0.09, 'sine', 0.35); },
  click() { this.beep(2400, 0.03, 'square', 0.16); },
  alarm() { this.beep(880, 0.12, 'square', 0.14); this.beep(660, 0.12, 'square', 0.14, 0.16); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.beep(f, 0.18, 'triangle', 0.22, i * 0.11)); },
  hum: null,
  setHum(freq, vol) {
    if (!AC) return;
    try {
      if (!this.hum) { const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240; o.type = 'sawtooth'; o2.type = 'square'; o.connect(f); o2.connect(f); f.connect(g); g.connect(master); g.gain.value = 0; o.start(); o2.start(); this.hum = { o, o2, g }; }
      const t = AC.currentTime; this.hum.o.frequency.setTargetAtTime(freq, t, 0.15); this.hum.o2.frequency.setTargetAtTime(freq * 0.5 + 2, t, 0.15); this.hum.g.gain.setTargetAtTime(this.on ? vol : 0, t, 0.15);
    } catch (e) { /* ignore */ }
  },
};
