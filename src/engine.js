/*
 * Copyright 2026 The TOUGH SHIFT Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { THREE, clamp, lerp, V3, M, metal, box, cyl, sph, tor, grp, makeScreen, label, wrapText, wrapLines, rr, FONT, audio, shuffle, mean } from './core.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { toolMesh } from './tools.js';

export const S = { sticky: false, calm: false, sound: true, assist: 0, mods: {} };
export const E = { xr: false, lock: 0, tickers: [], t: 0, bot: false, botTip: null };
export const I = { buttons: [], tools: [], ctls: [], zones: [], by: {} };
export const ASSIST = ['Trainee', 'Pro', 'Expert'];
export const PRESS = [['limited', 'Limited tools'], ['crunch', 'Less time'], ['precise', 'Tight precision'], ['multi', 'More at once'], ['twist', 'Surprise twist']];
export const COMPS = ['precision', 'procedure', 'judgment', 'speed', 'adaptability', 'composure'];
const _v = V3(), _a = V3(), _b = V3(), _zw = V3(), _w = V3(), UP = V3(0, 1, 0);
let renderer, scene, camera, rig, station, stage, hemi, sun, pmrem, CATS, ENVS, profile, hands, pointers;
const look = { yaw: 0, pitch: -0.46 };
const raycaster = new THREE.Raycaster();
const BOT = { kind: 'bot', held: null };

export const game = { on: false, mods: {}, assist: 0, steps: [], si: -1, step: null, t: 0, st: 0, log: [], errors: [], meter: 0, meterRate: 0, clock: 0, msg: '', msgT: 0, mentorT: 0, mentorUses: 0, sit: '', steady: false, over: false, ack: {} };
const hud = {};

/* =====================================================================  setup  */
export function init(cats, envs) {
  CATS = cats; ENVS = envs; loadProfile();
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local-floor');
  try { renderer.xr.setFoveation(1); } catch (e) { /* older */ }
  document.body.appendChild(renderer.domElement); renderer.domElement.style.touchAction = 'none';
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.03, 1500);
  rig = new THREE.Group(); scene.add(rig); rig.add(camera); deskCam();
  station = new THREE.Group(); scene.add(station); station.position.set(0, 0.78, -0.42);
  stage = new THREE.Group(); station.add(stage); E.stage = stage;
  hemi = new THREE.HemisphereLight(0xffffff, 0x404858, 0.7); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, 1.6); station.add(sun); station.add(sun.target); sun.target.position.set(0, 0, -0.12);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = -1.3; sc.right = 1.3; sc.top = 1.3; sc.bottom = -1.3; sc.near = 0.2; sc.far = 6; sun.shadow.bias = -0.0012; sun.shadow.normalBias = 0.012;
  pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  Object.assign(E, { renderer, scene, camera, station, hemi, sun });
  hands = [mkHand(0), mkHand(1)]; pointers = [hands[0], hands[1], mouse];
  for (let i = 0; i < 4; i++) arrows.push(mkArrow());
  setupDom(); setMood();
  addEventListener('resize', () => { if (E.xr) return; camera.aspect = innerWidth / innerHeight; deskCam(); renderer.setSize(innerWidth, innerHeight); });
  renderer.xr.addEventListener('sessionstart', () => { E.xr = true; E.needCal = true; E.calN = 0; document.body.classList.add('xr'); });
  renderer.xr.addEventListener('sessionend', () => { E.xr = false; document.body.classList.remove('xr'); station.position.set(0, 0.78, -0.42); station.rotation.set(0, 0, 0); deskCam(); });
  renderer.setAnimationLoop(loop);
  showHome();
}
function deskCam() { const portrait = innerWidth < innerHeight; camera.fov = portrait ? 98 : 84; camera.position.set(0, 1.24, portrait ? 0.24 : 0.14); camera.updateProjectionMatrix(); }
export function calibrate() {
  camera.getWorldPosition(_a); camera.getWorldDirection(_b); _b.y = 0; if (_b.lengthSq() < 1e-4) _b.set(0, 0, -1); _b.normalize();
  station.position.set(_a.x + _b.x * 0.38, _a.y - 0.42, _a.z + _b.z * 0.38); station.rotation.set(0, Math.atan2(-_b.x, -_b.z), 0);
}
export function setMood(o = {}) {
  scene.background = new THREE.Color(o.bg ?? 0x0b0f17);
  scene.fog = o.fog ? new THREE.Fog(o.fog[0], o.fog[1], o.fog[2]) : null;
  const h = o.hemi || [0xffffff, 0x404858, 0.7]; hemi.color.set(h[0]); hemi.groundColor.set(h[1]); hemi.intensity = h[2];
  const s = o.sun || [0xffffff, 1.6, 0.6, 1.9, 0.9]; sun.color.set(s[0]); sun.intensity = s[1]; sun.position.set(s[2], s[3], s[4]);
  scene.environmentIntensity = o.env ?? 0.55; renderer.toneMappingExposure = o.exp ?? 1.05;
}
function setupDom() {
  const css = document.createElement('style');
  css.textContent = `html,body{margin:0;height:100%;overflow:hidden;background:#0b0f17;font-family:${FONT};color:#e6edf3}canvas{display:block}
#ui{position:fixed;right:10px;top:8px;display:flex;flex-direction:column;gap:6px;align-items:flex-end;pointer-events:none}
#ui button{pointer-events:auto;font:700 13px ${FONT};padding:9px 16px;border-radius:999px;border:0;background:#2f81f7;color:#fff;cursor:pointer}#ui button[disabled]{background:#30363d;color:#8b949e}
#ui span{font-size:11px;color:#9da7b3;max-width:230px;text-align:right;text-shadow:0 1px 2px #000}#tt{position:fixed;left:14px;top:calc(10px + env(safe-area-inset-top));font:800 15px ${FONT};letter-spacing:.14em;color:#e6edf3;opacity:.85;pointer-events:none}
body.xr #ui,body.xr #tt{display:none}`;
  document.head.appendChild(css);
  const tt = document.createElement('div'); tt.id = 'tt'; tt.textContent = 'TOUGH SHIFT'; document.body.appendChild(tt);
  const ui = document.createElement('div'); ui.id = 'ui'; const b = document.createElement('button'); b.textContent = 'ENTER VR'; const sp = document.createElement('span');
  sp.textContent = 'Browser preview: drag to look, click or drag to use your hands. In a headset, use your real hands: poke buttons, pinch to grab.';
  ui.appendChild(b); ui.appendChild(sp); document.body.appendChild(ui);
  const no = (why) => { b.disabled = true; b.textContent = 'VR NOT AVAILABLE HERE'; sp.textContent = why + ' Browser preview: drag to look, click or drag to use your hands.'; };
  if (navigator.xr && navigator.xr.isSessionSupported) navigator.xr.isSessionSupported('immersive-vr').then((ok) => { if (!ok) no('Open this page in the Meta Quest browser for hand tracking.'); }).catch(() => no('Open this page in the Meta Quest browser for hand tracking.'));
  else no('Open this page in the Meta Quest browser for hand tracking.');
  b.addEventListener('click', async () => {
    audio.init();
    try { const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] }); await renderer.xr.setSession(s); }
    catch (e) { sp.textContent = 'Could not start VR: ' + (e && e.message ? e.message : e); }
  });
  const dom = renderer.domElement;
  dom.addEventListener('pointerdown', onDown); dom.addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
}

/* =====================================================================  pointers  */
const JOINTS = ['wrist', 'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip', 'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip', 'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip', 'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip', 'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip'];
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [8, 9], [0, 10], [10, 11], [11, 12], [12, 13], [13, 14], [0, 15], [15, 16], [16, 17], [17, 18], [18, 19], [0, 20], [20, 21], [21, 22], [22, 23], [23, 24]];
function mkHand(i) {
  const h = renderer.xr.getHand(i), c = renderer.xr.getController(i); rig.add(h); rig.add(c);
  c.addEventListener('selectstart', () => { c.userData.sel = true; }); c.addEventListener('selectend', () => { c.userData.sel = false; });
  c.addEventListener('connected', (e) => { c.userData.src = e.data; }); c.addEventListener('disconnected', () => { c.userData.src = null; c.userData.sel = false; });
  const vis = new THREE.Group(); scene.add(vis); vis.visible = false;
  const skin = new THREE.MeshStandardMaterial({ color: 0xbfe3ff, roughness: 0.3, metalness: 0.15, emissive: 0x1f7fd0, emissiveIntensity: 0.35 });
  const jg = new THREE.SphereGeometry(1, 10, 8), bg = new THREE.CylinderGeometry(0.0058, 0.0058, 1, 8);
  const js = JOINTS.map((n, k) => { const m = new THREE.Mesh(jg, skin); m.scale.setScalar(k > 0 && k % 5 === 4 ? 0.0088 : 0.0075); vis.add(m); return m; });
  const bones = BONES.map(() => { const m = new THREE.Mesh(bg, skin); vis.add(m); return m; });
  return { kind: 'hand', i, h, c, vis, js, bones, skin, tip: V3(), palm: V3(), pinchPos: V3(), pinching: false, wasPinching: false, tracked: false, held: null, inside: new Set() };
}
function updHand(P) {
  const J = P.h.joints, tip = J && J['index-finger-tip'], th = J && J['thumb-tip'];
  if (E.xr && tip && th && tip.visible) {
    tip.getWorldPosition(P.tip); th.getWorldPosition(_a);
    const d = P.tip.distanceTo(_a); P.pinching = P.pinching ? d < 0.042 : d < 0.022;
    P.pinchPos.copy(P.tip).add(_a).multiplyScalar(0.5);
    (J['middle-finger-phalanx-proximal'] || tip).getWorldPosition(P.palm);
    P.tracked = true; P.vis.visible = true;
    for (let k = 0; k < 25; k++) { const j = J[JOINTS[k]]; if (j) j.getWorldPosition(P.js[k].position); }
    for (let k = 0; k < 24; k++) { const a = P.js[BONES[k][0]].position, b = P.js[BONES[k][1]].position, m = P.bones[k]; m.visible = true; m.position.copy(a).add(b).multiplyScalar(0.5); _b.copy(b).sub(a); const L = _b.length(); m.scale.set(1, L || 0.001, 1); if (L > 1e-5) m.quaternion.setFromUnitVectors(UP, _b.divideScalar(L)); }
  } else if (E.xr && P.c.userData.src && !P.c.userData.src.hand) {
    P.c.getWorldPosition(P.tip); P.pinchPos.copy(P.tip); P.palm.copy(P.tip); P.pinching = !!P.c.userData.sel; P.tracked = true; P.vis.visible = true;
    for (let k = 0; k < 25; k++) P.js[k].position.copy(P.tip); for (const m of P.bones) m.visible = false;
  } else { P.tracked = false; P.pinching = false; P.vis.visible = false; }
  P.skin.emissiveIntensity = P.pinching ? 1.1 : 0.35;
}
const mouse = { kind: 'mouse', tip: V3(), palm: V3(), pinchPos: V3(), pinching: false, wasPinching: false, tracked: false, held: null, inside: new Set(), ray: new THREE.Ray(), down: false, clicked: false, looking: false, ndc: new THREE.Vector2(), lx: 0, ly: 0 };
function setNdc(e) { mouse.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); }
const usable = (it) => !it.removed && !it.locked && it.enabled !== false && it.g.visible;
function onDown(e) {
  audio.init(); if (E.xr) return; setNdc(e); mouse.down = true; mouse.clicked = true; mouse.looking = false; mouse.lx = e.clientX; mouse.ly = e.clientY;
  raycaster.setFromCamera(mouse.ndc, camera); mouse.ray.copy(raycaster.ray);
  const list = []; for (const k of ['buttons', 'tools', 'ctls']) for (const it of I[k]) if (usable(it)) for (const m of it.pick) list.push(m);
  const hit = raycaster.intersectObjects(list, false)[0];
  if (hit) { const it = hit.object.userData.it; if (it.kind === 'button') { if (E.lock <= 0 && it.cool <= 0) press(it); mouse.down = false; } else { aimPoint(mouse.ray, mouse.tip); mouse.pinchPos.copy(mouse.tip); grab(mouse, it); } return; }
  const s = game.on && game.step; let near = false;
  if (s && !s.tool && H[s.t].targets) for (const w of H[s.t].targets(s)) if (mouse.ray.distanceToPoint(w) < 0.14) near = true;
  if (!near) mouse.looking = true;
}
function onMove(e) {
  if (E.xr) return;
  if (mouse.down && mouse.looking) { look.yaw = clamp(look.yaw - (e.clientX - mouse.lx) * 0.004, -1.3, 1.3); look.pitch = clamp(look.pitch - (e.clientY - mouse.ly) * 0.004, -1.2, 0.6); mouse.lx = e.clientX; mouse.ly = e.clientY; }
  setNdc(e);
}
function onUp() { mouse.down = false; mouse.looking = false; if (mouse.held) drop(mouse); }
function updMouse() {
  const P = mouse; P.tracked = P.down && !P.looking && !E.xr; if (!P.tracked) return;
  raycaster.setFromCamera(P.ndc, camera); P.ray.copy(raycaster.ray);
  if (P.held && P.held.kind === 'ctl') P.held.mousePoint(P.ray, P.pinchPos);
  else { aimPoint(P.ray, P.tip); P.pinchPos.copy(P.tip); P.palm.copy(P.tip); }
}
// where a mouse ray "touches" the work: snap near the live targets, else the work plane
function aimPoint(ray, out) {
  const s = game.on && game.step; let best = 0.09, got = false;
  if (s && H[s.t].targets) for (const w of H[s.t].targets(s)) { const d = ray.distanceToPoint(w); if (d < best) { best = d; if (d < 0.022) out.copy(w); else ray.closestPointToPoint(w, out); got = true; } }
  if (!got) { const y = station.position.y + (s && s._py !== undefined ? s._py : 0.035); const t = (y - ray.origin.y) / ray.direction.y; if (t > 0 && isFinite(t)) ray.at(Math.min(t, 3), out); else ray.at(0.6, out); }
  return out;
}
// every fingertip that can "touch": tracked hands, a held-down mouse, the test bot
const _tips = [];
function fingerTips() { _tips.length = 0; for (const P of pointers) if (P.tracked && !P.held) { _tips.push(P.tip); if (P.kind === 'hand') _tips.push(P.palm); } if (E.botTip) _tips.push(E.botTip); return _tips; }

/* =====================================================================  interactables  */
function reg(kind, o) { I[kind].push(o); if (o.id) I.by[o.id] = o; return o; }
function disposeTree(root) { root.traverse((o) => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { if (!x.userData.shared) { if (x.map) x.map.dispose(); x.dispose(); } }); }); }
export function clearStage() {
  station.remove(stage); disposeTree(stage); stage = new THREE.Group(); station.add(stage); E.stage = stage;
  I.buttons = []; I.tools = []; I.ctls = []; I.zones = []; I.by = {}; E.tickers = []; HLs = []; E.botTip = null; BOT.held = null;
  for (const P of pointers) { P.held = null; P.inside.clear(); }
  audio.setHum(60, 0); setMood();
}
const proxyMat = new THREE.MeshBasicMaterial({ visible: false }); proxyMat.userData.shared = true;
function proxy(g, r, it, y = 0) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), proxyMat); m.position.y = y; m.userData.it = it; g.add(m); it.pick.push(m); return m; }

function drawBtn(b) {
  const s = b.scr, g = s.ctx, W = s.w, Hh = s.h; g.clearRect(0, 0, W, Hh); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const sub = b.sub, availH = sub ? Hh * 0.58 : Hh * 0.9;
  for (let fs = Math.round(Hh * (sub ? 0.36 : 0.46)); fs > 10; fs -= 2) { g.font = `700 ${fs}px ${FONT}`; const L = wrapLines(g, b.label, W * 0.93); if (L.length * fs * 1.12 <= availH || fs <= 12) { const cy = sub ? Hh * 0.37 : Hh / 2; L.forEach((ln, i) => g.fillText(ln, W / 2, cy + (i - (L.length - 1) / 2) * fs * 1.12)); break; } }
  if (sub) { g.font = `600 ${Math.round(Hh * 0.2)}px ${FONT}`; g.fillStyle = 'rgba(255,255,255,.78)'; g.fillText(sub, W / 2, Hh * 0.8, W * 0.94); }
  s.dirty();
}
export function mkButton(o) {
  const [w, h] = o.size || [0.075, 0.045]; const g = grp(o.parent || stage, ...(o.pos || [0, 0, 0])); const face = o.face || 'up';
  g.rotation.order = 'YXZ'; g.rotation.x = face === 'up' ? -Math.PI / 2 : face === 'tilt' ? -0.95 : 0; if (o.rotY) g.rotation.y = o.rotY;
  box(g, w + 0.012, h + 0.012, 0.012, M(0x14171c, { r: 0.5, m: 0.4 }), 0, 0, -0.007);
  const col = o.color ?? 0x2b4a7a; const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.1, emissive: col, emissiveIntensity: 0.18 });
  const cp = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.016), mat); cp.position.z = 0.006; cp.castShadow = true; g.add(cp);
  const scr = makeScreen(g, w * 0.96, h * 0.92, clamp(Math.round((128 * w) / h), 128, 1024), 128, 0, 0, 0.0146, { transparent: true });
  const b = { id: o.id, kind: 'button', g, cap: cp, mat, scr, w, h, label: o.label || '', sub: o.sub, enabled: true, cool: 0, anim: 0, onPress: o.onPress, free: !!o.free, opt: o.opt, lit: false, hl: false, pick: [cp] };
  cp.userData.it = b;
  b.setLabel = (t, sub) => { b.label = t; if (sub !== undefined) b.sub = sub; drawBtn(b); };
  b.setColor = (c) => { mat.color.set(c); mat.emissive.set(c); };
  b.setLit = (on) => { b.lit = !!on; };
  drawBtn(b);
  return reg('buttons', b);
}
function press(b) { b.cool = 0.4; b.anim = 1; audio.tick(); if (b.onPress) b.onPress(b); else stepButton(b); }
function updateButtons(dt) {
  const assistOn = game.on && (game.assist === 0 || game.mentorT > 0);
  for (const b of I.buttons) {
    if (b.cool > 0) b.cool -= dt; b.anim = Math.max(0, b.anim - dt * 5); b.cap.position.z = 0.006 - 0.008 * b.anim;
    b.mat.emissiveIntensity = b.lit ? 1.0 : b.hl && assistOn ? 0.55 + 0.4 * Math.sin(E.t * 6) : b.flash ? 0.5 + 0.5 * Math.sin(E.t * 12) : 0.18;
    if (!usable(b)) continue;
    for (const P of pointers) {
      if (P.kind !== 'hand' || !P.tracked) continue;
      _v.copy(P.tip); b.g.worldToLocal(_v); const ax = Math.abs(_v.x), ay = Math.abs(_v.y), was = P.inside.has(b);
      const inside = ax < b.w / 2 + 0.004 && ay < b.h / 2 + 0.004 && _v.z > -0.03 && _v.z < 0.02;
      if (inside && !was) { P.inside.add(b); if (b.cool <= 0 && E.lock <= 0 && !P.held) press(b); }
      else if (was && !(ax < b.w / 2 + 0.014 && ay < b.h / 2 + 0.014 && _v.z > -0.04 && _v.z < 0.032)) P.inside.delete(b);
    }
  }
}

export function mkTool(o) {
  const g = grp(o.parent || stage, ...o.pos); const body = toolMesh(o.kind || 'box', o.color ?? 0x90a4ae); g.add(body); const sc = body.userData.lie ? 1.55 : 1.15; body.scale.setScalar(sc); if (!o.tip) body.userData.tip = body.userData.tip.map((v) => v * sc);
  const t = { id: o.id, kind: 'tool', g, body, label: o.label || o.id, home: g.position.clone(), tip: V3(...(o.tip || body.userData.tip)), lie: body.userData.lie, held: null, snapped: null, grabR: o.grabR || 0.085, off: V3(), removed: false, mat: !!o.mat, pick: [], arrowH: 0.06 };
  body.rotation.x = t.lie; body.traverse((m) => { if (m.isMesh) { m.userData.it = t; t.pick.push(m); } }); proxy(g, 0.034, t);
  t.tag = label(g, t.label, 0.085, 0.02, 0, 0.012, 0.048, { bg: 'rgba(8,12,20,.82)', size: 0.6, px: 64 }); t.tag.mesh.rotation.x = -0.9;
  t.tipWorld = (v) => stage.localToWorld(v.copy(t.tip).add(g.position));
  t.setTipWorld = (w) => { _v.copy(w); stage.worldToLocal(_v); g.position.copy(_v).sub(t.tip); };
  t.remove = () => { t.removed = true; g.visible = false; if (t.held) { t.held.held = null; t.held = null; } };
  return reg('tools', t);
}
export function mkZone(o) {
  const g = grp(o.parent || stage, ...o.pos); const r = o.r || 0.035; const c = o.color ?? 0x4dd0ff;
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.8, r, 30), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 0.8, 24), new THREE.MeshBasicMaterial({ color: 0x7ee787, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  if (!o.vertical) { ring.rotation.x = -Math.PI / 2; disc.rotation.x = -Math.PI / 2; } disc.position.y = 0.001; g.add(ring); g.add(disc); disc.visible = false; ring.visible = !!o.always;
  const z = { id: o.id, kind: 'zone', g, r, ring, disc, always: !!o.always, hl: false, arrowH: 0.09 };
  z.world = (v) => g.getWorldPosition(v);
  z.fill = (p) => { disc.visible = p > 0.01; const k = clamp(p, 0.02, 1); disc.scale.set(k, k, k); };
  return reg('zones', z);
}
function ctlBase(o, type) {
  const g = grp(o.parent || stage, ...o.pos);
  const mat = new THREE.MeshStandardMaterial({ color: o.color ?? 0xd32f2f, roughness: 0.38, metalness: 0.1, emissive: o.color ?? 0xd32f2f, emissiveIntensity: 0.1 });
  return { id: o.id, kind: 'ctl', type, g, mat, label: o.label, held: null, grabR: 0.075, spring: o.spring, pick: [], hl: false, arrowH: 0.1 };
}
export function mkLever(o) {
  const c = ctlBase(o, 'lever'), g = c.g, len = (c.len = o.len || 0.14); const dir = V3(...(o.dir || [0, 0, -1])).normalize();
  g.quaternion.setFromUnitVectors(V3(0, 0, -1), dir);
  box(g, 0.03, 0.008, len + 0.034, M(0x15181d, { r: 0.5, m: 0.5 }), 0, -0.004, 0); box(g, 0.007, 0.003, len, 0x000000, 0, 0.0008, 0);
  const h = grp(g); cyl(h, 0.0055, 0.0055, 0.046, metal(), 0, 0.023, 0, 10); const knob = sph(h, o.knob || 0.019, c.mat, 0, 0.052, 0); knob.userData.it = c; c.pick.push(knob); proxy(h, 0.032, c, 0.052);
  c.anchor = knob; c.value = o.value ?? 0.5;
  if (o.label) { const l = label(g, o.label, 0.085, 0.022, 0, 0.001, len / 2 + 0.034, { size: 0.62, px: 64, bg: 'rgba(8,12,20,.8)' }); l.mesh.rotation.x = -Math.PI / 2; }
  const band = box(g, 0.006, 0.004, 0.01, M(0x39d353, { e: 0x39d353, ei: 1.2 }), 0.02, 0.001, 0); band.visible = false; band.castShadow = false;
  c.showBand = (r) => { band.visible = true; band.scale.z = Math.max(0.3, ((r[1] - r[0]) * len) / 0.01); band.position.z = -((r[0] + r[1]) / 2 - 0.5) * len; };
  c.hideBand = () => { band.visible = false; };
  c.sync = () => { h.position.z = -(c.value - 0.5) * len; };
  c.drag = (wp) => { _v.copy(wp); g.worldToLocal(_v); c.value = clamp(0.5 - _v.z / len); };
  c.grabDist = (wp) => knob.getWorldPosition(_a).distanceTo(wp);
  c.mousePoint = (ray, out) => { const a = g.localToWorld(V3(0, 0.052, len / 2)), b = g.localToWorld(V3(0, 0.052, -len / 2)); ray.distanceSqToSegment(a, b, undefined, out); return out; };
  c.set = (v) => { c.value = v; };
  c.sync(); return reg('ctls', c);
}
export function mkStick(o) {
  const c = ctlBase({ color: 0x263238, ...o }, 'stick'), g = c.g, range = o.range || 0.06;
  cyl(g, 0.036, 0.042, 0.02, M(0x15181d, { r: 0.5, m: 0.5 }), 0, 0.01, 0); const piv = grp(g, 0, 0.02, 0); cyl(piv, 0.007, 0.01, 0.1, M(0x2a2f36, { r: 0.4, m: 0.6 }), 0, 0.05, 0, 12);
  const top = sph(piv, 0.023, c.mat, 0, 0.108, 0); top.userData.it = c; c.pick.push(top); proxy(piv, 0.036, c, 0.108);
  c.anchor = top; c.value = { x: 0, y: 0 }; if (c.spring === undefined) c.spring = 0;
  if (o.label) { const l = label(g, o.label, 0.1, 0.022, 0, 0.001, 0.062, { size: 0.62, px: 64, bg: 'rgba(8,12,20,.8)' }); l.mesh.rotation.x = -Math.PI / 2; }
  c.sync = () => { piv.rotation.z = -c.value.x * 0.5; piv.rotation.x = -c.value.y * 0.5; };
  c.drag = (wp) => { _v.copy(wp); g.worldToLocal(_v); c.value.x = clamp(_v.x / range, -1, 1); c.value.y = clamp(-_v.z / range, -1, 1); };
  c.grabDist = (wp) => top.getWorldPosition(_a).distanceTo(wp);
  c.mousePoint = (ray, out) => { g.getWorldPosition(_a); const y = _a.y + 0.125, t = (y - ray.origin.y) / ray.direction.y; return t > 0 && isFinite(t) ? ray.at(Math.min(t, 3), out) : out.copy(_a); };
  c.set = (x, y) => { c.value.x = x; c.value.y = y; };
  c.sync(); return reg('ctls', c);
}
export function mkWheel(o) {
  const c = ctlBase({ color: 0x1c2128, ...o }, 'wheel'), g = c.g, R = (c.R = o.radius || 0.15); g.rotation.x = o.tilt ?? -0.55; c.maxA = o.maxA || 2.2;
  const rimG = grp(g); const rim = tor(rimG, R, o.thick || 0.013, c.mat); rim.userData.it = c; c.pick.push(rim);
  for (let k = 0; k < (o.spokes || 3); k++) { const a = (k / (o.spokes || 3)) * Math.PI * 2 + Math.PI / 2; const s = box(rimG, 0.016, R, 0.008, c.mat, (Math.cos(a) * R) / 2, (Math.sin(a) * R) / 2, 0); s.rotation.z = a - Math.PI / 2; s.userData.it = c; c.pick.push(s); }
  cyl(rimG, 0.03, 0.03, 0.02, M(0x2f353d, { r: 0.4, m: 0.6 }), 0, 0, 0.004).rotation.x = Math.PI / 2; box(rimG, 0.012, 0.012, 0.004, M(0xffd54f, { e: 0xffd54f, ei: 0.8 }), 0, R, 0.012);
  cyl(g, 0.014, 0.018, 0.16, 0x1a1d22, 0, 0, -0.08).rotation.x = Math.PI / 2;
  c.anchor = rimG; c.arrowH = R + 0.05; c.value = 0; c.grabR = 0.08; c.cum = 0;
  c.sync = () => { rimG.rotation.z = -c.value * c.maxA; };
  const ang = (wp) => { _v.copy(wp); g.worldToLocal(_v); return Math.atan2(_v.y, _v.x); };
  c.grabStart = (wp) => { c.a0 = ang(wp); c.v0 = c.value; c.cum = 0; };
  c.drag = (wp) => { const a = ang(wp); let d = a - c.a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; c.a0 = a; c.cum = clamp(c.cum + d, -(1 - c.v0) * c.maxA, (c.v0 + 1) * c.maxA); c.value = clamp(c.v0 - c.cum / c.maxA, -1, 1); };
  c.grabDist = (wp) => { _v.copy(wp); g.worldToLocal(_v); return Math.abs(Math.hypot(_v.x, _v.y) - R) + Math.abs(_v.z); };
  c.mousePoint = (ray, out) => { g.getWorldPosition(_a); const n = _b.set(0, 0, 1).transformDirection(g.matrixWorld); const den = ray.direction.dot(n); if (Math.abs(den) < 1e-4) return out.copy(_a); const t = _v.copy(_a).sub(ray.origin).dot(n) / den; return ray.at(clamp(t, 0, 3), out); };
  c.set = (v) => { c.value = v; };
  c.sync(); return reg('ctls', c);
}

function grab(P, it) {
  if (it.held && it.held !== P) { it.held.held = null; }
  P.held = it; it.held = P; audio.tick();
  if (it.kind === 'tool') { it.snapped = null; _a.copy(P.pinchPos); stage.worldToLocal(_a); it.off.copy(it.g.position).sub(_a); if (it.off.length() > 0.02) it.off.setLength(0.02); }
  else if (it.grabStart) it.grabStart(P.pinchPos);
}
function drop(P) { const it = P.held; if (!it) return; P.held = null; it.held = null; }
function tryGrab(P) {
  let best = null, bd = 1e9;
  for (const t of I.tools) { if (!usable(t) || t.locked) continue; const d = t.g.getWorldPosition(_a).distanceTo(P.pinchPos); if (d < t.grabR && d < bd) { bd = d; best = t; } }
  for (const c of I.ctls) { if (!usable(c)) continue; const d = c.grabDist(P.pinchPos); if (d < c.grabR && d < bd) { bd = d; best = c; } }
  if (best) grab(P, best);
}
function updateGrabs(dt) {
  for (const P of pointers) {
    if (P.kind === 'hand') {
      if (!P.tracked) { if (P.held) drop(P); P.wasPinching = false; continue; }
      const st = P.pinching && !P.wasPinching, en = !P.pinching && P.wasPinching; P.wasPinching = P.pinching;
      if (S.sticky) { if (st) { if (P.held) drop(P); else tryGrab(P); } } else { if (st && !P.held) tryGrab(P); if (en && P.held) drop(P); }
    }
    const it = P.held; if (!it) continue;
    if (it.kind === 'tool') {
      if (P.kind === 'mouse') { _a.copy(P.tip); stage.worldToLocal(_a); _a.sub(it.tip); it.g.position.copy(_a); }
      else { _a.copy(P.pinchPos); stage.worldToLocal(_a); _a.add(it.off); it.g.position.lerp(_a, 1 - Math.exp(-dt * (game.steady ? 11 : 42))); }
    } else it.drag(P.pinchPos);
  }
}
function updateTools(dt) {
  for (const t of I.tools) {
    if (t.removed) continue;
    if (!t.held && !t.snapped) t.g.position.lerp(t.home, 1 - Math.exp(-dt * 9));
    t.body.rotation.x = lerp(t.body.rotation.x, t.held || t.snapped ? 0 : t.lie, 1 - Math.exp(-dt * 12));
    t.tag.mesh.visible = !t.held && !t.snapped && (!game.on || game.assist < 2 || game.mentorT > 0);
  }
}
function updateCtls(dt) {
  const assistOn = game.on && (game.assist === 0 || game.mentorT > 0);
  for (const c of I.ctls) {
    if (!c.held && c.spring !== undefined && c.spring !== null) { const k = 1 - Math.exp(-dt * 7); if (c.type === 'stick') { c.value.x = lerp(c.value.x, 0, k); c.value.y = lerp(c.value.y, 0, k); } else c.value = lerp(c.value, c.spring, k); }
    c.mat.emissiveIntensity = c.held ? 0.5 : c.hl && assistOn ? 0.5 + 0.4 * Math.sin(E.t * 6) : 0.1;
    c.sync();
  }
}
/* ---------- highlights (the "aid" arrows) ---------- */
const arrows = []; let HLs = [];
function mkArrow() { const m = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.032, 12), new THREE.MeshBasicMaterial({ color: 0x4dd0ff, toneMapped: false })); m.rotation.x = Math.PI; m.visible = false; scene.add(m); return m; }
function setHL(list) { clearHL(); HLs = (list || []).filter(Boolean); for (const it of HLs) it.hl = true; }
function clearHL() { for (const it of HLs) { it.hl = false; if (it.kind === 'zone') { it.ring.visible = it.always; it.ring.scale.setScalar(1); } } HLs = []; }
function updateHL() {
  const show = game.on && !game.over && (game.assist === 0 || game.mentorT > 0);
  for (let i = 0; i < arrows.length; i++) { const it = show ? HLs[i] : null, a = arrows[i]; if (!it || it.removed || !it.g.parent) { a.visible = false; continue; } a.visible = true; (it.anchor || it.g).getWorldPosition(a.position); a.position.y += (it.arrowH || 0.07) + Math.sin(E.t * 5) * 0.008; }
  for (const z of HLs) if (z.kind === 'zone') { z.ring.visible = z.always || game.assist < 2 || game.mentorT > 0; const k = 1 + 0.1 * Math.sin(E.t * 6); z.ring.scale.set(k, k, k); }
}

/* =====================================================================  step engine  */
const XF = () => (game.assist === 0 ? 1.25 : 1) * (game.mods.precise ? 0.65 : 1);
const TF = () => (game.assist === 0 ? 1.4 : 1) * (game.mods.crunch ? 0.6 : 1);
const SKILL = { press: 'procedure', pressAny: 'procedure', decide: 'judgment', place: 'procedure', hold: 'precision', trace: 'precision', points: 'precision', rhythm: 'precision', set: 'procedure', fill: 'precision', sim: 'composure', craft: 'adaptability', intercept: 'speed' };
const LIMIT = { press: () => 9, pressAny: (s) => 5 * s.btns.length + 4, decide: () => 15, place: () => 11, hold: (s) => s.secs + 9, trace: () => 24, points: (s) => 5 * s.pts.length + 6, rhythm: (s) => s.count * 0.62 + 8, set: () => 10, fill: () => 15, craft: () => 18 };
const toolsFor = (s) => (Array.isArray(s.tool) ? s.tool : [s.tool]).map((id) => I.by[id]).filter((t) => t && !t.removed);
const heldTool = (s) => toolsFor(s).find((t) => t.held);
function fakeHold(t) { if (!t.held) { t.held = BOT; BOT.held = t; t.snapped = null; } }
function snap(t, z, consume) { z.world(_zw); t.setTipWorld(_zw); if (t.held) { t.held.held = null; t.held = null; } t.snapped = z; t.locked = true; if (consume) t.remove(); audio.click(); }
function wrongTool(s, z, dt) { // someone brought the wrong thing to the work site
  for (const t of I.tools) { if (!t.held || t.removed || toolsFor(s).includes(t)) continue; t.tipWorld(_w); if (_w.distanceTo(_zw) < z.r) { t._bad = (t._bad || 0) + dt; if (t._bad > 0.45 && !(s._badSet || (s._badSet = new Set())).has(t)) { s._badSet.add(t); fault('Wrong item: ' + t.label, { why: s.why }); } } else t._bad = 0; }
}
const zw = (id) => I.by[id].world(V3());

const H = {};
H.wait = { update(s) { if (game.st >= s.secs) finishStep(null); } };
H.press = {
  button(s, b) { if (b.id === s.btn) finishStep(1 - 0.34 * s._wrong); else { wrongBtn(s, b); if (s.once && game.step === s && !game.over && !b.free) finishStep(0); } },
  hl: (s) => [I.by[s.btn]],
  auto(s) { if (game.st > 0.15) stepButton(I.by[s.btn]); },
};
H.pressAny = {
  enter(s) { s._left = new Set(s.btns); },
  button(s, b) { if (s._left.has(b.id)) { s._left.delete(b.id); b.setLit(true); s._info = `${s.btns.length - s._left.size}/${s.btns.length}`; if (!s._left.size) finishStep(1 - 0.34 * s._wrong); else setStepHL(); } else if (!s.btns.includes(b.id)) wrongBtn(s, b); },
  hl: (s) => [...s._left].map((id) => I.by[id]),
  auto(s) { if (game.st > 0.1) { const id = [...s._left][0]; if (id) stepButton(I.by[id]); } },
};
function wrongBtn(s, b) { if (b.free) return; const trap = s.traps && s.traps[b.id]; fault(trap || s.wrongMsg || 'Wrong control: ' + b.label, { crit: !!trap && !s.soft, why: s.why }); }
H.decide = {
  enter(s) {
    const g = (s._g = grp(stage, 0, 0.275, -0.12)); g.rotation.x = -0.18; const opts = shuffle(s.opts), n = opts.length, oh = 0.056, qh = 0.1, top = (n * oh + qh) / 2;
    const q = makeScreen(g, 0.66, qh, 1188, 180, 0, top - qh / 2, 0); const c = q.ctx; c.fillStyle = '#101a2c'; rr(c, 0, 0, q.w, q.h, 22); c.fill(); c.strokeStyle = '#ffd866'; c.lineWidth = 5; rr(c, 3, 3, q.w - 6, q.h - 6, 20); c.stroke();
    c.fillStyle = '#ffd866'; c.font = `700 40px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; const L = wrapLines(c, s.q, q.w - 60).slice(0, 3); L.forEach((ln, i) => c.fillText(ln, q.w / 2, q.h / 2 + (i - (L.length - 1) / 2) * 46)); q.dirty();
    s._btns = opts.map((o, k) => mkButton({ parent: g, face: 'front', pos: [0, top - qh - oh / 2 - k * oh + 0.003, 0], size: [0.66, oh - 0.008], label: o.t, color: 0x1f3a5f, opt: o, onPress: (b) => H.decide.choose(s, b) }));
    s._chosen = false; E.lock = Math.max(E.lock, 0.55);
  },
  choose(s, b) {
    if (s._chosen || game.over) return; const o = b.opt;
    if (o.ok) { s._chosen = true; b.setColor(0x1b8a4b); flash(o.fb || 'Good call.', false); s._after = 0.9; s._q = s._wrong ? 0.35 : 1; }
    else { b.setColor(0xb3261e); b.enabled = false; fault(o.fb || 'Not the best call.', { crit: o.crit, why: s.why }); if (!s.retry) { s._chosen = true; s._q = 0; s._after = 2.6; s._btns.forEach((x) => x.opt.ok && x.setColor(0x1b8a4b)); } }
  },
  update(s, dt) { if (s._chosen) { s._after -= dt; if (s._after <= 0) finishStep(s._q); } },
  exit(s) { I.buttons = I.buttons.filter((b) => !s._btns.includes(b)); for (const P of pointers) for (const b of s._btns) P.inside.delete(b); stage.remove(s._g); disposeTree(s._g); },
  auto(s) { if (game.st > 0.2 && !s._chosen) H.decide.choose(s, s._btns.find((b) => b.opt.ok)); },
};
H.place = {
  enter(s) { s._in = 0; },
  update(s, dt) {
    const z = I.by[s.zone]; z.world(_zw); const t = heldTool(s);
    if (t) { t.tipWorld(_a); if (_a.distanceTo(_zw) < z.r * 1.15) { s._in += dt; if (s._in > 0.28) { snap(t, z, s.consume); return finishStep(1 - 0.34 * s._wrong); } } else s._in = 0; }
    wrongTool(s, z, dt);
  },
  hl: (s) => (heldTool(s) ? [I.by[s.zone]] : [toolsFor(s)[0], I.by[s.zone]]),
  targets: (s) => [zw(s.zone)],
  auto(s) { const t = toolsFor(s)[0]; fakeHold(t); t.setTipWorld(zw(s.zone)); },
};
H.hold = {
  enter(s) { s._p = 0; s._sp = 0; s._n = 0; s._exits = 0; s._was = false; s._last = V3(); },
  update(s, dt) {
    const z = I.by[s.zone]; z.world(_zw); let tip = null, bd = 1e9;
    if (s.tool) { const t = heldTool(s); if (t) tip = t.tipWorld(_a); wrongTool(s, z, dt); }
    else for (const p of fingerTips()) { const d = p.distanceTo(_zw); if (d < bd) { bd = d; tip = _a.copy(p); } }
    let inside = false;
    if (tip) { inside = tip.distanceTo(_zw) < z.r * (s.tool ? XF() : 1.3); if (inside && s._was) { s._sp += tip.distanceTo(s._last) / dt; s._n++; } s._last.copy(tip); }
    if (inside) { s._p += dt; if (s.onHold) s.onHold(s._p / s.secs); } else { if (s._was) s._exits++; s._p = Math.max(0, s._p - dt * 0.7); }
    s._was = inside; z.fill(s._p / s.secs); s._info = s._p > 0.05 ? `HOLD ${Math.round((100 * s._p) / s.secs)}%` : '';
    if (s._p >= s.secs) { z.fill(0); const avg = s._n ? s._sp / s._n : 0; finishStep(clamp(1.1 - avg / 0.25) - 0.1 * Math.max(0, s._exits - 1) - 0.34 * s._wrong); }
  },
  hl: (s) => (s.tool && !heldTool(s) ? [toolsFor(s)[0], I.by[s.zone]] : [I.by[s.zone]]),
  targets: (s) => [zw(s.zone)],
  auto(s) { if (s.tool) { const t = toolsFor(s)[0]; fakeHold(t); t.setTipWorld(zw(s.zone)); } else E.botTip = zw(s.zone); },
  exit(s) { E.botTip = null; I.by[s.zone].fill(0); },
};
function pathLine(pts, color, op) { const geo = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false })); stage.add(l); return l; }
H.trace = {
  enter(s) {
    const pts = s.path.map((p) => V3(...p)), sm = [];
    for (let i = 0; i < pts.length - 1; i++) { const n = Math.max(1, Math.ceil(pts[i].distanceTo(pts[i + 1]) / 0.006)); for (let k = 0; k < n; k++) sm.push(pts[i].clone().lerp(pts[i + 1], k / n)); }
    sm.push(pts[pts.length - 1].clone()); s._sm = sm; s._k = 0; s._dev = 0; s._n = 0; s._slip = 0; s._slipT = 0; s._py = mean(sm.map((p) => p.y));
    s._guide = pathLine(sm, 0x4dd0ff, game.assist === 0 ? 0.95 : game.assist === 1 ? 0.45 : 0.0); s._cut = pathLine(sm, s.color ?? 0xff4d4d, 1); s._cut.geometry.setDrawRange(0, 0);
    s._ends = [sph(stage, 0.004, M(0x4dd0ff, { e: 0x4dd0ff, ei: 1 }), sm[0].x, sm[0].y, sm[0].z, 8), sph(stage, 0.004, M(0xffd866, { e: 0xffd866, ei: 1 }), sm[sm.length - 1].x, sm[sm.length - 1].y, sm[sm.length - 1].z, 8)];
  },
  update(s, dt) {
    const t = heldTool(s); if (!t) return; t.tipWorld(_a); stage.worldToLocal(_a); const sm = s._sm, tol = (s.tol || 0.014) * XF();
    let best = 1e9, bi = s._k; for (let i = Math.max(0, s._k - 3); i < Math.min(sm.length, s._k + 10); i++) { const d = sm[i].distanceTo(_a); if (d < best) { best = d; bi = i; } }
    if (best < 0.05) { s._dev += best; s._n++; if (best > tol * 2.3) { s._slipT += dt; if (s._slipT > 0.3 && s._slip < 3) { s._slip++; s._slipT = -1.2; fault(s.slipMsg || 'Off the line.', { why: s.why }); if (game.step !== s) return; } } else if (s._slipT > 0) s._slipT = 0; else s._slipT = Math.min(0, s._slipT + dt); }
    if (best < tol * 1.5 && bi > s._k) { s._k = bi; if (s.onTrace) s.onTrace(s._k / (sm.length - 1)); }
    s._cut.geometry.setDrawRange(0, s._k + 1); s._info = `${Math.round((100 * s._k) / (sm.length - 1))}%`;
    if (s._k >= sm.length - 1) { const avg = s._n ? s._dev / s._n : tol; finishStep(clamp(1.18 - avg / (tol * 1.15)) - 0.12 * s._slip); }
  },
  hl: (s) => (heldTool(s) ? [] : [toolsFor(s)[0]]),
  targets: (s) => (s._sm ? [stage.localToWorld(s._sm[Math.min(s._k + 2, s._sm.length - 1)].clone())] : []),
  auto(s) { const t = toolsFor(s)[0]; fakeHold(t); t.setTipWorld(stage.localToWorld(s._sm[Math.min(s._k + 3, s._sm.length - 1)].clone())); },
  exit(s) { stage.remove(s._guide); if (!s.keep) stage.remove(s._cut); s._ends.forEach((m) => stage.remove(m)); },
};
H.points = {
  enter(s) {
    s._i = 0; s._q = 0; s._dw = 0; s._done = s.pts.map(() => false); s._warn = {}; s._py = mean(s.pts.map((p) => p.p[1]));
    s._m = s.pts.map((p, i) => { const m = sph(stage, s.dot || 0.006, new THREE.MeshStandardMaterial({ color: 0xffd866, emissive: 0xffd866, emissiveIntensity: 0.9 }), ...p.p, 10); m.castShadow = false; m.visible = s.marks !== false || game.assist === 0; if ((game.assist === 0 || s.numbered) && !s.anyOrder) { const l = label(stage, String(i + 1), 0.018, 0.018, p.p[0], p.p[1] + 0.022, p.p[2], { size: 0.8, px: 48, bg: 'rgba(8,12,20,.8)' }); m.userData.l = l.mesh; } return m; });
  },
  update(s, dt) {
    let tip; if (s.tool) { const t = heldTool(s); if (!t) return; tip = t.tipWorld(_a); } else { let bd = 1e9; for (const p of fingerTips()) { for (let i = 0; i < s.pts.length; i++) { if (s._done[i]) continue; const d = p.distanceTo(stage.localToWorld(_v.set(...s.pts[i].p))); if (d < bd) { bd = d; tip = _a.copy(p); } } } if (!tip) return; }
    stage.worldToLocal(tip); const tol = (s.tol || 0.016) * XF(); let any = false;
    for (let i = 0; i < s.pts.length; i++) {
      if (s._done[i]) continue; const d = tip.distanceTo(_v.set(...s.pts[i].p)); if (d > tol) continue;
      if (!s.anyOrder && i !== s._i) { if (s.strict && !s._warn[i]) { s._warn[i] = 1; fault(s.orderMsg || 'Out of sequence.', { why: s.why }); if (game.step !== s) return; } continue; }
      any = true; s._dw += dt; s._dmin = Math.min(s._dmin ?? 1, d);
      if (s._dw >= (s.dwell ?? 0.14)) { s._done[i] = true; s._q += clamp(1.12 - (s._dmin / tol) * 0.7); s._dmin = 1; s._dw = 0; s._m[i].material.color.set(0x39d353); s._m[i].material.emissive.set(0x39d353); audio.tick(); if (s.onHit) s.onHit(i); s._i = s._done.indexOf(false); s._info = `${s._done.filter(Boolean).length}/${s.pts.length}`; }
      break;
    }
    if (!any) s._dw = 0;
    if (s._i < 0) finishStep(s._q / s.pts.length - 0.2 * s._wrong);
  },
  next: (s) => (s._i >= 0 ? stage.localToWorld(V3(...s.pts[s._i].p)) : null),
  hl: (s) => (s.tool && !heldTool(s) ? [toolsFor(s)[0]] : []),
  targets: (s) => (s.anyOrder ? s.pts.filter((p, i) => !s._done[i]).map((p) => stage.localToWorld(V3(...p.p))) : [H.points.next(s)].filter(Boolean)),
  auto(s) { const w = H.points.next(s) || (s._done.indexOf(false) >= 0 && stage.localToWorld(V3(...s.pts[s._done.indexOf(false)].p))); if (!w) return; if (s.tool) { const t = toolsFor(s)[0]; fakeHold(t); t.setTipWorld(w); } else E.botTip = w; },
  exit(s) { E.botTip = null; if (!s.keep) s._m.forEach((m) => { stage.remove(m); if (m.userData.l) stage.remove(m.userData.l); }); },
};
H.rhythm = {
  enter(s) { s._t = []; s._down = false; s._good = 0; s._metro = 0; s._bot = 0; },
  update(s, dt) {
    const z = I.by[s.zone]; z.world(_zw); let down = false, hit = false;
    if (mouse.clicked && mouse.ray.distanceToPoint(_zw) < z.r * 1.8) hit = true;
    for (const p of fingerTips()) { if (Math.hypot(p.x - _zw.x, p.z - _zw.z) < z.r * 1.7) { if (p.y < _zw.y + 0.012 || (s._down && p.y < _zw.y + 0.035)) down = true; } }
    if ((down && !s._down) || hit) {
      const n = s._t.length; if (n) { const bpm = 60 / (game.t - s._t[n - 1]); s._bpm = bpm; if (bpm >= s.bpm[0] && bpm <= s.bpm[1]) s._good++; else if (bpm >= s.bpm[0] * 0.88 && bpm <= s.bpm[1] * 1.12) s._good += 0.5; }
      s._t.push(game.t); audio.thump(); if (s.onBeat) s.onBeat(); s._info = `${s._t.length}/${s.count}` + (s._bpm ? `   ${Math.round(s._bpm)}/min` : '');
    }
    s._down = down;
    if (game.assist < 2 && s.metro !== false) { s._metro -= dt; if (s._metro <= 0) { s._metro += 120 / (s.bpm[0] + s.bpm[1]); audio.beep(1500, 0.02, 'square', 0.05); } }
    if (s._t.length >= s.count) finishStep(s._good / (s.count - 1));
  },
  hl: (s) => [I.by[s.zone]],
  targets: (s) => [zw(s.zone)],
  auto(s, dt) { s._bot += dt; const per = 120 / (s.bpm[0] + s.bpm[1]); const w = zw(s.zone); w.y += s._bot % per < per / 2 ? -0.005 : 0.06; E.botTip = w; },
  exit() { E.botTip = null; },
};
const ctlVal = (c, s) => (c.type === 'stick' ? c.value[s.axis || 'y'] : c.value);
H.set = {
  enter(s) { s._in = 0; const c = I.by[s.ctl]; if (game.assist < 2 && c.showBand) c.showBand(s.range); s._v0 = {}; if (s.traps) for (const id in s.traps) s._v0[id] = ctlVal(I.by[id], {}); },
  update(s, dt) {
    const v = ctlVal(I.by[s.ctl], s);
    if (s.traps) for (const id in s.traps) if (Math.abs(ctlVal(I.by[id], {}) - s._v0[id]) > 0.3) { fault(s.traps[id], { crit: true, why: s.why }); return; }
    if (v >= s.range[0] && v <= s.range[1]) { s._in += dt; if (s._in >= (s.secs ?? 0.5)) finishStep(1 - 0.34 * s._wrong); } else s._in = 0;
  },
  exit(s) { const c = I.by[s.ctl]; if (c.hideBand) c.hideBand(); },
  hl: (s) => [I.by[s.ctl]],
  auto(s) { const c = I.by[s.ctl], m = (s.range[0] + s.range[1]) / 2; if (c.type === 'stick') c.value[s.axis || 'y'] = m; else c.value = m; c.held = BOT; },
  button(s, b) { if (s.traps && s.traps[b.id]) fault(s.traps[b.id], { crit: true }); },
};
H.fill = {
  enter(s) {
    s._v = s.start || 0; s._was = false; s._re = 0; const z = I.by[s.zone]; const g = (s._g = grp(z.g, s.gx ?? 0.05, 0.05, 0)); box(g, 0.016, 0.1, 0.004, 0x0d1117, 0, 0, -0.003).castShadow = false;
    if (!(game.assist === 2 && s.blind)) box(g, 0.014, (s.band[1] - s.band[0]) * 0.1, 0.002, M(0x39d353, { e: 0x39d353, ei: 0.8 }), 0, ((s.band[0] + s.band[1]) / 2 - 0.5) * 0.1, -0.001).castShadow = false;
    s._bar = box(g, 0.008, 0.1, 0.004, M(0xffd866, { e: 0xffd866, ei: 1 }), 0, 0, 0.001); s._bar.castShadow = false; s._bar.scale.y = 0.01;
  },
  update(s, dt) {
    const z = I.by[s.zone]; z.world(_zw); const t = heldTool(s); let inside = false; if (t) { t.tipWorld(_a); inside = _a.distanceTo(_zw) < z.r * 1.25; } wrongTool(s, z, dt);
    const [lo, hi] = s.band;
    if (inside) { const pv = s._v; s._v += (s.rate || 0.4) * dt * (game.mods.precise ? 1.3 : 1); if (pv < lo && s._v >= lo) audio.click(); if (s.onFill) s.onFill(s._v); }
    s._bar.scale.y = clamp(s._v, 0.01, 1); s._bar.position.y = (clamp(s._v, 0.01, 1) - 1) * 0.05; s._info = `${s.unit || 'LEVEL'} ${Math.round(s._v * 100)}%`;
    if (s._v >= 1) { fault(s.overMsg || 'Overshot.', { crit: s.overCrit, why: s.why }); if (game.step === s) finishStep(0.1); return; }
    if (!inside && s._was && s._v > 0.06) {
      if (s._v >= lo && s._v <= hi) return finishStep(1 - (0.5 * Math.abs(s._v - (lo + hi) / 2)) / ((hi - lo) / 2) - 0.12 * s._re);
      if (s._v > hi) { fault(s.overMsg || 'Overshot.', { crit: s.overCrit, why: s.why }); if (game.step === s) finishStep(0.1); return; }
      s._re++; flash(s.underMsg || 'Not enough yet. Go again.', true);
    }
    s._was = inside;
  },
  hl: (s) => (heldTool(s) ? [I.by[s.zone]] : [toolsFor(s)[0], I.by[s.zone]]),
  targets: (s) => [zw(s.zone)],
  auto(s) { const t = toolsFor(s)[0]; fakeHold(t); const w = zw(s.zone); if (s._v >= (s.band[0] + s.band[1]) / 2) w.y += 0.2; t.setTipWorld(w); },
  exit(s) { I.by[s.zone].g.remove(s._g); disposeTree(s._g); },
};
H.sim = {
  enter(s) { s._in = 0; s._tt = 0; if (s.start) s.start(); },
  update(s, dt) {
    const r = s.test(dt, game.st) || {}; s._tt += dt; if ((r.err ?? 0) < 1) s._in += dt; s._info = r.msg || '';
    if (r.fail) { fault(r.fail, { crit: true, why: s.why }); return; }
    if (r.done || (s.dur && game.st >= s.dur)) finishStep(Math.pow(s._in / Math.max(s._tt, 0.01), 1.25) * (r.q ?? 1));
  },
  hl: (s) => (s.ctls || []).map((id) => I.by[id]),
  auto(s, dt) { if (s.bot) s.bot(dt); },
};
H.craft = {
  enter(s) { s._t = 0; s._pair = ''; s._badP = {}; },
  update(s, dt) {
    const A = I.by[s.a], B = I.by[s.b];
    for (const t of I.tools) {
      if (!t.held || t.removed) continue; t.g.getWorldPosition(_a);
      for (const u of I.tools) {
        if (u === t || u.removed) continue; if (_a.distanceTo(u.g.getWorldPosition(_b)) > 0.065) continue;
        const good = (t === A && u === B) || (t === B && u === A), key = t.id + '+' + u.id; if (s._pair !== key) { s._pair = key; s._t = 0; } s._t += dt;
        if (s._t > 0.45) {
          if (good) { const pos = B.g.position.clone(); if (!s.keepA) A.remove(); if (!s.keepB) B.remove(); const n = mkTool({ ...s.makes, pos: [pos.x, pos.y + 0.01, pos.z] }); n.home.set(...(s.makes.home || [pos.x, pos.y, pos.z])); spark(n.g); flash('Fabricated: ' + n.label, false); audio.win(); return finishStep(1 - 0.3 * s._wrong); }
          if (t.mat && u.mat && !s._badP[key]) { s._badP[key] = 1; fault(`${t.label} + ${u.label}: that will not do the job.`, { why: s.why }); if (game.step !== s) return; }
          s._t = 0;
        }
        return;
      }
    }
    s._t = 0; s._pair = '';
  },
  hl: (s) => [I.by[s.a], I.by[s.b]],
  targets: (s) => I.tools.filter((t) => !t.removed && !t.held).map((t) => t.g.getWorldPosition(V3())),
  auto(s) { const A = I.by[s.a], B = I.by[s.b]; fakeHold(A); A.g.position.copy(B.g.position); },
};
H.intercept = {
  enter(s) { s._i = 0; s._next = 1.0; s._balls = []; s._hit = 0; },
  update(s, dt) {
    s._next -= dt;
    if (s._next <= 0 && s._i < s.shots.length) { const sh = s.shots[s._i++]; const m = sph(stage, s.r0 || 0.055, s.ballMat || M(0xffffff, { r: 0.4 }), ...sh.from, 16); s._balls.push({ m, sh, t: 0, T: (sh.T || 1.1) / (game.mods.crunch ? 1.25 : 1) }); s._next = s.gap ?? 1.7; if (sh.cue) flash(sh.cue, false); audio.beep(300, 0.06, 'triangle', 0.2); }
    const reach = (s.reach || 0.11) * (game.assist === 0 ? 1.25 : 1) * (game.mods.precise ? 0.75 : 1);
    for (const b of s._balls) {
      if (b.dead) continue; b.t += dt; const u = b.t / b.T, sh = b.sh;
      b.m.position.set(lerp(sh.from[0], sh.to[0], u) + (u > 0.55 ? (sh.dev || 0) * ((u - 0.55) / 0.45) : 0), lerp(sh.from[1], sh.to[1], u) + Math.sin(Math.PI * u) * (sh.arc || 0), lerp(sh.from[2], sh.to[2], u)); b.m.rotation.x += dt * 9;
      b.m.getWorldPosition(_zw); let got = false; for (const p of fingerTips()) if (p.distanceTo(_zw) < reach) got = true; if (mouse.clicked && mouse.ray.distanceToPoint(_zw) < reach * 1.3) got = true;
      if (got && u > 0.3) { b.dead = true; s._hit++; stage.remove(b.m); audio.thump(); flash(s.hitMsg || 'Saved!', false); }
      else if (u >= 1.05) { b.dead = true; stage.remove(b.m); flash(s.missMsg || 'Missed.', true); audio.bad(); game.meter += s.missCost || 0; }
    }
    s._info = `${s._hit}/${s.shots.length}`;
    if (s._i >= s.shots.length && s._balls.every((b) => b.dead)) finishStep(s._hit / s.shots.length);
  },
  targets: (s) => s._balls.filter((b) => !b.dead).map((b) => b.m.getWorldPosition(V3())),
  auto(s) { const b = s._balls.find((x) => !x.dead); E.botTip = b ? b.m.getWorldPosition(V3()) : null; },
  exit() { E.botTip = null; },
};
function spark(at) { const g = grp(at); const ms = []; for (let i = 0; i < 10; i++) { const m = sph(g, 0.004, M(0xffe082, { e: 0xffc107, ei: 2 }), 0, 0, 0, 6); m.castShadow = false; m.userData.v = V3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).multiplyScalar(0.3); ms.push(m); } let t = 0; E.tickers.push((dt) => { if (t > 0.8) return; t += dt; for (const m of ms) { m.position.addScaledVector(m.userData.v, dt); m.userData.v.y -= dt * 1.2; m.visible = t < 0.8; } }); }

function stepButton(b) { const s = game.step; if (!game.on || !s || game.over) return; const h = H[s.t]; if (h.button) h.button(s, b); else if (s.traps && s.traps[b.id]) fault(s.traps[b.id], { crit: true }); }
function setStepHL() { const s = game.step; if (!s) return clearHL(); const h = H[s.t]; setHL(s.hl ? s.hl.map((id) => I.by[id]) : h.hl ? h.hl(s) : []); }
export function flash(msg, bad) { game.msg = msg; game.msgT = bad ? 3.2 : 2.2; game.msgBad = !!bad; game.dirty = true; }
export function fault(msg, o = {}) {
  if (game.over || !game.on) return; const s = game.step;
  game.errors.push({ msg, why: o.why || (s && s.why) || '', crit: !!o.crit }); flash(msg, true); audio.bad(); game.meter += game.drill.meter ? game.drill.meter.err ?? 0.06 : 0;
  if (s) s._wrong = (s._wrong || 0) + 1;
  if (o.crit) endDrill(msg);
}
function nextStep() {
  game.si++; if (game.si >= game.steps.length) return endDrill(null);
  const s = (game.step = game.steps[game.si]); game.st = 0; s._wrong = 0; s._info = '';
  s.limit = (s.time ?? (LIMIT[s.t] ? LIMIT[s.t](s) : 0)) * TF();
  const h = H[s.t]; if (!h) throw new Error('Unknown step type ' + s.t);
  if (s.sit) game.sit = s.sit; if (s.onEnter) s.onEnter(); if (h.enter) h.enter(s); setStepHL(); game.dirty = true;
}
function finishStep(q) {
  const s = game.step; if (!s || game.over) return; const h = H[s.t]; if (h.exit) h.exit(s); if (s.onDone) s.onDone();
  if (BOT.held) { BOT.held.held = null; BOT.held = null; } for (const c of I.ctls) if (c.held === BOT) c.held = null;
  if (q !== null) { const par = s.limit * 0.5; const sq = s.limit && s.t !== 'sim' && s.t !== 'intercept' ? clamp(1 - (game.st - par) / (s.limit - par)) : null; game.log.push({ t: s.t, skill: s.skill || SKILL[s.t], q: clamp(q), sq, adapt: !!s.adapt, say: s.say }); if (q >= 0.55) audio.ok(); }
  if (s.calm !== undefined) game.meterRate = s.calm; if (s.relief) game.meter = Math.max(0, game.meter - s.relief);
  game.step = null; clearHL(); nextStep();
}
function endDrill(failMsg) { if (game.over) return; game.over = true; game.failed = failMsg; game.overT = failMsg ? 2.4 : 1.2; clearHL(); if (failMsg) { flash('FAILED: ' + failMsg, true); } else { flash('Shift complete.', false); audio.win(); } game.dirty = true; }

function updateAck(dt) {
  const a = game.ack, b = hud.ack; if (!b) return;
  if (a.due > 0) { a.due -= dt; b.flash = true; if (Math.floor(a.due * 2) !== Math.floor((a.due + dt) * 2)) audio.alarm(); if (a.due <= 0) { a.miss++; b.flash = false; a.next = 9 + Math.random() * 7; fault('Missed: ' + (game.cat.ack || 'alert'), {}); } }
  else { a.next -= dt; if (a.next <= 0 && game.step && game.step.t !== 'wait' && game.step.t !== 'decide') { a.due = 5.5; flash((game.cat.ack || 'ALERT') + ' — acknowledge it (left panel).', true); } }
}
function gameUpdate(dt) {
  if (!game.on) return;
  if (game.msgT > 0) { game.msgT -= dt; if (game.msgT <= 0) game.dirty = true; }
  if (game.mentorT > 0) { game.mentorT -= dt; if (game.mentorT <= 0) game.dirty = true; }
  if (game.over) { game.overT -= dt; if (game.overT <= 0) showDebrief(); else if (game.dirty) drawBoard(); return; }
  game.t += dt; const s = game.step; if (!s) return; game.st += dt;
  if (game.drill.meter) { game.meter += game.meterRate * dt; if (game.meter >= 1) { fault(game.drill.meter.fail || 'Lost.', { crit: true }); return; } }
  if (game.clock0) { game.clock -= dt; if (game.clock <= 0) { fault(game.drill.clockFail || 'Out of time.', { crit: true }); return; } }
  const h = H[s.t]; if (E.bot && h.auto) h.auto(s, dt); if (h.update) h.update(s, dt);
  if (game.step === s && !game.over && s.limit && game.st > s.limit && !s._chosen && s.t !== 'sim' && s.t !== 'wait' && s.t !== 'intercept') { fault('Too slow: ' + (s.say || ''), { crit: s.crit }); if (!game.over && game.step === s) finishStep(0); }
  if (game.mods.multi && !game.over) updateAck(dt);
  hud.tt = (hud.tt || 0) + dt; if (game.dirty || hud.tt > 0.2) { hud.tt = 0; drawBoard(); }
}

/* =====================================================================  HUD  */
function bar(g, x, y, w, h, p, col, lab) { g.fillStyle = '#21262d'; rr(g, x, y, w, h, h / 2); g.fill(); if (p > 0) { g.fillStyle = col; rr(g, x, y, Math.max(h, w * clamp(p)), h, h / 2); g.fill(); } g.fillStyle = '#c9d1d9'; g.font = `600 20px ${FONT}`; g.textAlign = 'left'; g.fillText(lab, x, y - 7); }
function drawBoard() {
  const s = hud.board; if (!s) return; const g = s.ctx, W = s.w, Hh = s.h, d = game.drill, st = game.step; game.dirty = false;
  g.fillStyle = '#0b1220'; g.fillRect(0, 0, W, Hh); g.fillStyle = '#13233d'; g.fillRect(0, 0, W, 88);
  g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `700 38px ${FONT}`; g.fillText(d.title, 24, 56, W - 240);
  g.textAlign = 'right'; g.font = `700 26px ${FONT}`; g.fillStyle = ['#7ee787', '#ffd866', '#ff7b72'][game.assist]; g.fillText(ASSIST[game.assist].toUpperCase(), W - 24, 40);
  g.fillStyle = '#8b949e'; g.font = `600 22px ${FONT}`; g.fillText(`STEP ${Math.min(game.si + 1, game.steps.length)}/${game.steps.length}`, W - 24, 72);
  g.textAlign = 'left'; let y = 128; g.fillStyle = '#ffd866'; g.font = `600 28px ${FONT}`; y = wrapText(g, game.sit || d.brief, 24, y, W - 48, 34, 4);
  g.strokeStyle = '#30363d'; g.lineWidth = 2; g.beginPath(); g.moveTo(24, y - 14); g.lineTo(W - 24, y - 14); g.stroke(); y += 24;
  const showSay = game.assist < 2 || game.mentorT > 0 || (st && st.t === 'wait'), showHint = game.assist === 0 || game.mentorT > 0;
  if (st) {
    g.fillStyle = '#fff'; g.font = `700 36px ${FONT}`; y = wrapText(g, showSay ? st.say || '' : 'Your call. (MENTOR button gives a hint)', 24, y, W - 48, 42, 3);
    if (showHint && st.hint) { g.fillStyle = '#79c0ff'; g.font = `500 27px ${FONT}`; y = wrapText(g, st.hint, 24, y + 2, W - 48, 33, 4); }
    if (st._info) { g.fillStyle = '#7ee787'; g.font = `700 32px ${FONT}`; g.fillText(st._info, 24, Hh - 176); }
  }
  const mods = PRESS.filter((p) => game.mods[p[0]]).map((p) => p[1]).join(' · '); if (mods) { g.fillStyle = '#ff7b72'; g.font = `600 20px ${FONT}`; g.textAlign = 'right'; g.fillText(mods, W - 24, Hh - 176, W * 0.6); g.textAlign = 'left'; }
  let by = Hh - 118; if (st && st.limit && st.t !== 'sim' && st.t !== 'wait') { bar(g, 24, by, W - 48, 16, 1 - game.st / st.limit, game.st / st.limit > 0.75 ? '#ff7b72' : '#58a6ff', 'STEP TIME'); }
  by += 48; const half = (W - 72) / 2;
  if (game.clock0) bar(g, 24, by, d.meter ? half : W - 48, 16, game.clock / game.clock0, game.clock / game.clock0 < 0.25 ? '#ff7b72' : '#d2a8ff', `CLOCK ${Math.max(0, Math.ceil(game.clock))}s`);
  if (d.meter) bar(g, game.clock0 ? 48 + half : 24, by, game.clock0 ? half : W - 48, 16, game.meter, game.meter > 0.7 ? '#ff7b72' : '#f0883e', d.meter.label.toUpperCase());
  if (game.msgT > 0) { g.fillStyle = game.msgBad ? 'rgba(160,28,28,.96)' : 'rgba(20,110,60,.96)'; rr(g, 16, Hh - 290, W - 32, 110, 16); g.fill(); g.fillStyle = '#fff'; g.font = `700 30px ${FONT}`; g.textAlign = 'center'; const L = wrapLines(g, game.msg, W - 80).slice(0, 3); L.forEach((ln, i) => g.fillText(ln, W / 2, Hh - 235 + (i - (L.length - 1) / 2) * 34 + 10)); g.textAlign = 'left'; }
  s.dirty();
}
function buildHud() {
  const g = grp(stage, -0.39, 0.28, -0.2); g.rotation.y = 0.62; box(g, 0.57, 0.39, 0.016, M(0x0a0d12, { r: 0.4, m: 0.6 }), 0, 0, -0.01); cyl(g, 0.012, 0.012, 0.3, 0x1a1d22, 0, -0.33, -0.02);
  hud.board = makeScreen(g, 0.55, 0.37, 990, 666, 0, 0, 0);
  mkButton({ id: '_mentor', label: 'MENTOR', sub: 'show me how', pos: [-0.47, 0.014, 0.16], size: [0.08, 0.05], color: 0x00695c, onPress: () => { game.mentorT = 9; game.mentorUses++; game.dirty = true; } });
  mkButton({ id: '_quit', label: 'QUIT', pos: [-0.375, 0.014, 0.16], size: [0.07, 0.05], color: 0x5a1e1e, onPress: (b) => { if (b._arm && E.t - b._arm < 2.5) showCat(game.cat); else { b._arm = E.t; b.setLabel('SURE?'); } } });
  hud.ack = game.mods.multi ? mkButton({ id: '_ack', label: game.cat.ack || 'ACK', pos: [-0.28, 0.014, 0.16], size: [0.085, 0.05], color: 0x8a5a00, onPress: (b) => { const a = game.ack; if (a.due > 0) { a.due = 0; a.ok++; a.next = 8 + Math.random() * 7; b.flash = false; audio.ok(); } } }) : null;
  if (E.xr) mkButton({ id: '_rec', label: 'RECENTER', pos: [-0.47, 0.014, 0.09], size: [0.08, 0.04], color: 0x30363d, onPress: calibrate });
}

/* =====================================================================  flow  */
function mkCtx() {
  return {
    get stage() { return stage; }, F: -0.78, mods: game.mods || {}, assist: game.assist || 0, E, I, S, audio, game,
    hard: 1 + 0.18 * Object.values(game.mods || {}).filter(Boolean).length + 0.15 * (game.assist || 0),
    btn: (id, lab, x, y, z, o = {}) => mkButton({ id, label: lab, pos: [x, y, z], ...o }),
    tool: (id, lab, kind, x, y, z, o = {}) => mkTool({ id, label: lab, kind, pos: [x, y, z], ...o }),
    zone: (id, x, y, z, r = 0.035, o = {}) => mkZone({ id, pos: [x, y, z], r, ...o }),
    lever: (id, lab, x, y, z, o = {}) => mkLever({ id, label: lab, pos: [x, y, z], ...o }),
    stick: (id, lab, x, y, z, o = {}) => mkStick({ id, label: lab, pos: [x, y, z], ...o }),
    wheel: (id, lab, x, y, z, o = {}) => mkWheel({ id, label: lab, pos: [x, y, z], ...o }),
    tick: (f) => E.tickers.push(f), mood: setMood, flash, fault, by: (id) => I.by[id],
    sit: (t) => { game.sit = t; game.dirty = true; }, rate: (r) => { game.meterRate = r; }, addMeter: (v) => { game.meter = clamp(game.meter + v, 0, 2); },
  };
}
export function startDrill(cat, drill, opts) {
  clearStage(); E.lock = 0.8;
  Object.assign(game, { on: true, over: false, failed: null, cat, drill, mods: { ...opts.mods }, assist: opts.assist, steps: [], si: -1, step: null, t: 0, st: 0, log: [], errors: [], meter: 0, msg: '', msgT: 0, mentorT: 0, mentorUses: 0, sit: drill.brief, dirty: true });
  game.steady = game.assist === 0; game.ack = { next: 7, due: 0, ok: 0, miss: 0 };
  const ctx = mkCtx(); ctx.env = ENVS[cat.env](ctx, drill.env || {}); drill.build(ctx);
  let steps = drill.steps(ctx).filter(Boolean); const pre = [{ t: 'wait', secs: 2.6, say: 'Read the situation. Hands ready.' }];
  if (game.mods.limited && drill.limited) {
    const L = drill.limited; for (const id of L.remove || []) { const it = I.by[id]; if (!it) continue; if (it.remove) it.remove(); else { it.enabled = false; it.g.visible = false; } } if (L.apply) L.apply(ctx);
    if (L.swap) for (const key in L.swap) { const i = steps.findIndex((s) => s.key === key); if (i >= 0) steps.splice(i, 1, ...L.swap[key](ctx).map((s) => ({ ...s, adapt: true }))); }
    pre.push({ t: 'wait', secs: 3.2, say: 'LIMITED KIT: ' + L.note });
  }
  if (game.mods.twist && drill.twists && drill.twists.length) { const tw = drill.twists[Math.floor(Math.random() * drill.twists.length)]; const i = steps.findIndex((s) => s.key === tw.after); steps.splice(i + 1, 0, ...tw.steps(ctx).map((s) => ({ ...s, adapt: true }))); }
  game.steps = pre.concat(steps); game.meterRate = drill.meter ? drill.meter.rate : 0; game.clock0 = drill.clock ? drill.clock * TF() + 6 : 0; game.clock = game.clock0;
  buildHud(); nextStep();
}
function result() {
  const L = game.log, by = (k) => mean(L.filter((l) => l.skill === k).map((l) => l.q));
  const comps = { precision: by('precision'), procedure: by('procedure'), judgment: by('judgment'), speed: mean(L.filter((l) => l.sq !== null).map((l) => l.sq)), adaptability: mean(L.filter((l) => l.adapt || l.skill === 'adaptability').map((l) => l.q)), composure: by('composure') };
  if (game.mods.multi) { const a = game.ack, r = a.ok + a.miss ? a.ok / (a.ok + a.miss) : null; if (r !== null) comps.composure = comps.composure === null ? r : (comps.composure + r) / 2; }
  const mq = mean(L.map((l) => l.q)) ?? 0, ms = comps.speed ?? 0.7; let score = 100 * (0.74 * mq + 0.26 * ms) - 2 * game.errors.filter((e) => !e.crit).length - 3 * game.mentorUses;
  score = Math.round(clamp(score, 0, 100)); if (game.failed) score = Math.min(score, 45);
  const grade = game.failed ? 'F' : score >= 93 ? 'S' : score >= 84 ? 'A' : score >= 72 ? 'B' : score >= 58 ? 'C' : 'D';
  return { score, grade, comps, ok: !game.failed, failed: game.failed, errors: game.errors.slice(), time: game.t };
}
const prof = (id) => profile.cat[id] || (profile.cat[id] = { xp: 0, runs: 0, best: {}, comp: {}, last: '' });
const tierOf = (pr) => 1 + Math.min(4, Math.floor(pr.xp / 240));
function loadProfile() { profile = { cat: {}, s: {} }; try { const j = JSON.parse(localStorage.getItem('toughshift.v1') || 'null'); if (j && j.cat) profile = j; } catch (e) { /* storage unavailable */ } const s = profile.s || {}; S.sticky = !!s.sticky; S.calm = !!s.calm; S.sound = s.sound !== false; audio.on = S.sound; }
function saveProfile() { profile.s = { sticky: S.sticky, calm: S.calm, sound: S.sound }; try { localStorage.setItem('toughshift.v1', JSON.stringify(profile)); } catch (e) { /* storage unavailable */ } }
function adaptivePlan(cat) {
  const pr = prof(cat.id), tier = tierOf(pr), assist = tier <= 1 ? 0 : tier <= 3 ? 1 : 2, mods = {};
  const weak = COMPS.filter((k) => pr.comp[k] != null).sort((a, b) => pr.comp[a] - pr.comp[b]); const map = { precision: 'precise', speed: 'crunch', adaptability: 'limited', judgment: 'twist', composure: 'multi', procedure: 'crunch' };
  const want = weak.map((k) => map[k]).concat(shuffle(PRESS.map((p) => p[0]))); const n = tier <= 1 ? 0 : tier === 2 ? 1 : tier <= 4 ? 2 : 3; for (const m of want) { if (Object.keys(mods).length >= n) break; mods[m] = true; }
  const ds = cat.drills.slice().sort((a, b) => (pr.best[a.id]?.score ?? -1) - (pr.best[b.id]?.score ?? -1)); const drill = ds.find((d) => d.id !== pr.last) || ds[0];
  return { drill, mods, assist, tier };
}

/* ---------- menus ---------- */
function panel() { const p = grp(stage, 0, 0.27, -0.13); p.rotation.x = -0.2; return p; }
function showHome() {
  game.on = false; clearStage(); E.lock = 0.6; ENVS.lobby(mkCtx(), {}); const p = panel();
  const hd = makeScreen(p, 0.86, 0.13, 1376, 208, 0, 0.2, 0, { transparent: true }), g = hd.ctx; g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `800 96px ${FONT}`; g.fillText('TOUGH SHIFT', hd.w / 2, 104);
  g.fillStyle = '#9fd3ff'; g.font = `600 38px ${FONT}`; g.fillText('Hands-first pressure drills. Less kit. Less time. Find the way through.', hd.w / 2, 170); hd.dirty();
  CATS.forEach((c, i) => { const col = i % 5, row = Math.floor(i / 5), pr = prof(c.id); mkButton({ parent: p, face: 'front', pos: [-0.344 + col * 0.172, 0.085 - row * 0.1, 0], size: [0.16, 0.088], label: c.name, sub: pr.runs ? `Tier ${tierOf(pr)} · ${pr.runs} runs` : `${c.drills.length} drill${c.drills.length > 1 ? 's' : ''}`, color: c.color, onPress: () => showCat(c) }); });
  const tg = (x, lab, get, set) => { const b = mkButton({ parent: p, face: 'front', pos: [x, -0.125, 0], size: [0.2, 0.05], label: lab(), color: 0x30363d, onPress: () => { set(); b.setLabel(lab()); b.setLit(get()); saveProfile(); } }); b.setLit(get()); };
  tg(-0.315, () => 'Grip: ' + (S.sticky ? 'pinch once (sticky)' : 'pinch and hold'), () => S.sticky, () => { S.sticky = !S.sticky; });
  tg(-0.105, () => 'Motion: ' + (S.calm ? 'reduced' : 'full'), () => S.calm, () => { S.calm = !S.calm; });
  tg(0.105, () => 'Sound: ' + (S.sound ? 'on' : 'off'), () => S.sound, () => { S.sound = !S.sound; audio.on = S.sound; });
  mkButton({ parent: p, face: 'front', pos: [0.315, -0.125, 0], size: [0.2, 0.05], label: 'Recenter view', color: 0x30363d, onPress: () => { if (E.xr) { calibrate(); } else { look.yaw = 0; look.pitch = -0.46; } } });
}
function compBars(g, x, y, w, comp) { COMPS.forEach((k, i) => { const cx = x + (i % 3) * (w / 3), cy = y + Math.floor(i / 3) * 44; g.fillStyle = '#9da7b3'; g.font = `600 20px ${FONT}`; g.textAlign = 'left'; g.fillText(k.toUpperCase(), cx, cy); g.fillStyle = '#21262d'; rr(g, cx, cy + 6, w / 3 - 24, 12, 6); g.fill(); const v = comp[k]; if (v != null) { g.fillStyle = v > 0.8 ? '#39d353' : v > 0.6 ? '#ffd866' : '#ff7b72'; rr(g, cx, cy + 6, Math.max(12, (w / 3 - 24) * clamp(v)), 12, 6); g.fill(); } }); }
function showCat(cat) {
  game.on = false; clearStage(); E.lock = 0.6; const env = ENVS[cat.env](mkCtx(), { menu: true }); if (env && env.near) env.near.visible = false; const p = panel(), pr = prof(cat.id);
  const hd = makeScreen(p, 0.86, 0.14, 1376, 224, 0, 0.2, 0), g = hd.ctx; g.fillStyle = 'rgba(11,18,32,.92)'; rr(g, 0, 0, hd.w, hd.h, 26); g.fill(); g.fillStyle = '#fff'; g.font = `800 56px ${FONT}`; g.textAlign = 'left'; g.fillText(cat.name, 32, 68);
  g.fillStyle = '#9fd3ff'; g.font = `500 28px ${FONT}`; g.fillText(cat.blurb, 32, 112, 760); g.textAlign = 'right'; g.fillStyle = '#ffd866'; g.font = `800 44px ${FONT}`; g.fillText('TIER ' + tierOf(pr), hd.w - 32, 64); g.fillStyle = '#9da7b3'; g.font = `600 22px ${FONT}`; g.fillText(`${pr.runs} runs · ${pr.xp} xp`, hd.w - 32, 100);
  compBars(g, 32, 150, hd.w - 40, pr.comp); hd.dirty();
  cat.drills.forEach((d, i) => { const b = pr.best[d.id]; mkButton({ parent: p, face: 'front', pos: [-0.18, 0.085 - i * 0.066, 0], size: [0.5, 0.058], label: d.title, sub: d.kind + (b ? `  ·  best ${b.grade} ${b.score}` : '  ·  not yet run'), color: d.kind === 'EXTREME' ? 0x7f1d1d : 0x1f3a5f, onPress: () => startDrill(cat, d, { mods: S.mods, assist: S.assist }) }); });
  const plan = adaptivePlan(cat);
  mkButton({ parent: p, face: 'front', pos: [0.265, 0.085, 0], size: [0.33, 0.058], label: 'ADAPTIVE SHIFT', sub: 'picks drill + pressure for your weak spots', color: 0x7a4b00, onPress: () => { const pl = adaptivePlan(cat); startDrill(cat, pl.drill, pl); } });
  const ab = mkButton({ parent: p, face: 'front', pos: [0.265, 0.025, 0], size: [0.33, 0.046], label: 'Aids: ' + ASSIST[S.assist], color: 0x00695c, onPress: () => { S.assist = (S.assist + 1) % 3; ab.setLabel('Aids: ' + ASSIST[S.assist]); } });
  PRESS.forEach((m, k) => { const b = mkButton({ parent: p, face: 'front', pos: [0.265, -0.027 - k * 0.046, 0], size: [0.33, 0.04], label: m[1], color: 0x3d2a5c, onPress: () => { S.mods[m[0]] = !S.mods[m[0]]; b.setLit(S.mods[m[0]]); } }); b.setLit(!!S.mods[m[0]]); });
  mkButton({ parent: p, face: 'front', pos: [-0.37, -0.19, 0], size: [0.12, 0.046], label: '< Home', color: 0x30363d, onPress: showHome });
  void plan;
}
function showDebrief() {
  const r = result(), cat = game.cat, d = game.drill, opts = { mods: { ...game.mods }, assist: game.assist }, pr = prof(cat.id);
  const mult = 1 + 0.25 * game.assist + 0.15 * Object.values(game.mods).filter(Boolean).length; const xp = Math.round(r.score * mult * (r.ok ? 1 : 0.3) * 0.6);
  for (const k of COMPS) if (r.comps[k] != null) pr.comp[k] = pr.comp[k] == null ? r.comps[k] : pr.comp[k] * 0.6 + r.comps[k] * 0.4;
  const t0 = tierOf(pr); pr.xp += xp; pr.runs++; pr.last = d.id; if (!pr.best[d.id] || r.score > pr.best[d.id].score) pr.best[d.id] = { score: r.score, grade: r.grade }; saveProfile(); const t1 = tierOf(pr);
  game.on = false; clearStage(); E.lock = 0.9; const env = ENVS[cat.env](mkCtx(), { menu: true }); if (env && env.near) env.near.visible = false; const p = panel();
  const s = makeScreen(p, 0.6, 0.42, 1080, 756, -0.13, 0.02, 0), g = s.ctx; g.fillStyle = 'rgba(11,18,32,.95)'; rr(g, 0, 0, s.w, s.h, 28); g.fill();
  g.textAlign = 'left'; g.fillStyle = '#9da7b3'; g.font = `600 26px ${FONT}`; g.fillText(`${cat.name}  ·  ${ASSIST[opts.assist]}` + (PRESS.filter((m) => opts.mods[m[0]]).length ? '  ·  ' + PRESS.filter((m) => opts.mods[m[0]]).map((m) => m[1]).join(', ') : ''), 36, 50, s.w - 72);
  g.fillStyle = '#fff'; g.font = `800 46px ${FONT}`; g.fillText(d.title, 36, 104, s.w - 300);
  g.textAlign = 'right'; g.fillStyle = r.ok ? '#39d353' : '#ff7b72'; g.font = `900 120px ${FONT}`; g.fillText(r.grade, s.w - 40, 130); g.fillStyle = '#c9d1d9'; g.font = `700 30px ${FONT}`; g.fillText(`${r.score}/100   +${xp} xp` + (t1 > t0 ? `   TIER UP: ${t1}` : ''), s.w - 40, 172);
  g.textAlign = 'left'; g.fillStyle = r.ok ? '#7ee787' : '#ff7b72'; g.font = `700 30px ${FONT}`; g.fillText(r.ok ? `Completed in ${Math.round(r.time)}s` : 'FAILED: ' + r.failed, 36, 152, s.w - 420);
  compBars(g, 36, 216, s.w - 60, r.comps);
  let y = 330; g.font = `700 26px ${FONT}`; g.fillStyle = '#ffd866'; g.fillText(r.errors.length ? 'WHAT WENT WRONG' : 'CLEAN RUN', 36, y); y += 36;
  const seen = new Set(); for (const e of r.errors) { if (y > 520 || seen.has(e.msg)) continue; seen.add(e.msg); g.fillStyle = '#ff9a94'; g.font = `600 24px ${FONT}`; y = wrapText(g, '× ' + e.msg, 36, y, s.w - 72, 29, 2); if (e.why) { g.fillStyle = '#9da7b3'; g.font = `500 22px ${FONT}`; y = wrapText(g, e.why, 60, y, s.w - 100, 27, 2); } y += 4; }
  y = Math.max(y + 8, 470); g.font = `700 26px ${FONT}`; g.fillStyle = '#79c0ff'; g.fillText('HOW THE BEST DO IT', 36, y); y += 34; g.font = `500 24px ${FONT}`; g.fillStyle = '#c9d1d9'; for (const n of d.debrief || []) { if (y > s.h - 30) break; y = wrapText(g, '• ' + n, 36, y, s.w - 72, 29, 3) + 4; }
  s.dirty();
  const bx = 0.31, mk = (i, lab, sub, col, fn) => mkButton({ parent: p, face: 'front', pos: [bx, 0.17 - i * 0.078, 0], size: [0.24, 0.066], label: lab, sub, color: col, onPress: fn });
  mk(0, 'RETRY', 'same pressure', 0x1f3a5f, () => startDrill(cat, d, opts));
  const pl = adaptivePlan(cat); mk(1, 'NEXT: ADAPTIVE', pl.drill.title, 0x7a4b00, () => startDrill(cat, pl.drill, pl));
  mk(2, 'HARDER', 'drop an aid level', 0x7f1d1d, () => startDrill(cat, d, { mods: opts.mods, assist: Math.min(2, opts.assist + 1) }));
  mk(3, 'DRILL LIST', cat.name, 0x30363d, () => showCat(cat)); mk(4, 'HOME', '', 0x30363d, showHome);
  if (r.ok) audio.win();
}

/* =====================================================================  loop  */
let last = 0;
function tick(dt) {
  E.t += dt; if (E.lock > 0) E.lock -= dt;
  updateButtons(dt); updateGrabs(dt); updateTools(dt); updateCtls(dt); gameUpdate(dt);
  for (const f of E.tickers) f(dt, E.t);
  updateHL(); mouse.clicked = false;
}
function loop(time) {
  const now = time / 1000; const dt = clamp(now - last, 0.001, 0.05); last = now;
  if (E.xr && E.needCal) { E.calN++; if (E.calN > 10) { calibrate(); E.needCal = false; } }
  if (!E.xr) camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
  updHand(hands[0]); updHand(hands[1]); updMouse();
  if (E.bot) for (let i = 0; i < E.bot; i++) tick(0.04); else tick(dt);
  renderer.render(scene, camera);
}
// test / demo hooks
export const debug = { game, E, I, S, H, startDrill, showHome, showCat, look, get CATS() { return CATS; }, result };
