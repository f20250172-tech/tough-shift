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
import { THREE, M, metal, glow, glass, box, cyl, sph, cap, tor, cone, plane, grp, noShadow, makeScreen, label, tex, rr, FONT, rand, audio, clamp } from './core.js';
import { S } from './engine.js';

export const ENVS = {};
const PI = Math.PI;

/* ---------- shared builders ---------- */
function sky(p, top, bot) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { a: { value: new THREE.Color(top) }, b: { value: new THREE.Color(bot) } }, vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'uniform vec3 a; uniform vec3 b; varying vec3 p; void main(){ float h = clamp(normalize(p).y*1.5+0.06,0.0,1.0); gl_FragColor = vec4(mix(b,a,pow(h,0.55)),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' }));
  m.frustumCulled = false; p.add(m); return m;
}
function room(c, o) {
  const g = grp(c.stage), F = c.F, w = o.w, d = o.d, h = o.h, zc = -d / 2 + 1.7;
  const fl = plane(g, w, d, M(0xffffff, { map: o.floor, r: o.fr ?? 0.55, m: o.fm ?? 0 }), 0, F, zc); fl.rotation.x = -PI / 2;
  const wm = o.wall.isMaterial ? o.wall : M(o.wall, { r: 0.9 });
  plane(g, w, h, wm, 0, F + h / 2, zc - d / 2); plane(g, w, h, wm, 0, F + h / 2, zc + d / 2).rotation.y = PI;
  plane(g, d, h, wm, -w / 2, F + h / 2, zc).rotation.y = PI / 2; plane(g, d, h, wm, w / 2, F + h / 2, zc).rotation.y = -PI / 2;
  plane(g, w, d, M(o.ceil ?? 0xf5f5f5, { r: 1 }), 0, F + h, zc).rotation.x = PI / 2;
  g.userData = { w, d, h, zc, back: zc - d / 2 }; return g;
}
function person(p, x, y, z, col, o = {}) { const g = grp(p, x, y, z); cap(g, 0.17, 0.5, col, 0, 1.15, 0); cap(g, 0.1, 0.75, o.legs ?? 0x263238, 0, 0.45, 0); sph(g, 0.11, o.skin ?? 0xd9a47c, 0, 1.72, 0); if (o.hat) { const hh = sph(g, 0.118, o.hat, 0, 1.76, 0); hh.scale.y = 0.6; } if (o.mask) box(g, 0.14, 0.07, 0.02, o.mask, 0, 1.68, 0.1); cap(g, 0.05, 0.5, col, -0.24, 1.15, 0.03); cap(g, 0.05, 0.5, col, 0.24, 1.15, 0.03); if (o.s) g.scale.setScalar(o.s); return noShadow(g); }
function sideDeck(near, col = 0x1b1e23) { // surfaces for trays and system buttons
  const m = M(col, { r: 0.5, m: 0.3 }); box(near, 0.34, 0.03, 0.2, m, -0.39, -0.015, 0.13); box(near, 0.34, 0.03, 0.26, m, 0.39, -0.015, 0.1);
  cyl(near, 0.02, 0.03, 0.76, 0x16181c, -0.39, -0.4, 0.13); cyl(near, 0.02, 0.03, 0.76, 0x16181c, 0.39, -0.4, 0.1);
}
function auxScreen(c, w = 0.42, h = 0.3, pw = 672, ph = 480) { const g = grp(c.stage, 0.41, 0.28, -0.2); g.rotation.y = -0.62; box(g, w + 0.03, h + 0.03, 0.02, M(0x0a0d12, { r: 0.4, m: 0.6 }), 0, 0, -0.012); cyl(g, 0.012, 0.012, 0.3, 0x1a1d22, 0, -0.3, -0.02); return makeScreen(g, w, h, pw, ph, 0, 0, 0); }
function instanced(p, geo, mat, n) { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; p.add(m); return m; }
const _d = new THREE.Object3D();
function setInst(m, i, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) { _d.position.set(x, y, z); _d.scale.set(sx, sy, sz); _d.rotation.set(0, ry, 0); _d.updateMatrix(); m.setMatrixAt(i, _d.matrix); }

/* ---------- patient vitals monitor (ER / OR) ---------- */
function vitals(c) {
  const s = auxScreen(c), v = { hr: 82, spo2: 97, bp: '124/78', rr: 16, rhythm: 'sinus', on: true, etco2: 36 }; const N = 260, buf = new Float32Array(N); let k = 0, ph = 0, acc = 0, beepT = 0;
  const wave = (dt) => { const r = v.rhythm; if (r === 'asys') return (Math.random() - 0.5) * 0.03; if (r === 'vf') return 0.35 * Math.sin(ph * 31) + 0.25 * Math.sin(ph * 47 + 1) + 0.15 * (Math.random() - 0.5); ph += (dt * v.hr) / 60; const u = ph % 1; if (r === 'vt') return 0.7 * Math.sin(u * 2 * PI); if (u < 0.04) return 1 - Math.abs(u - 0.02) * 50 * 1; if (u > 0.04 && u < 0.07) return -0.25; if (u > 0.25 && u < 0.4) return 0.18 * Math.sin(((u - 0.25) / 0.15) * PI); if (u > 0.9) return 0.08 * Math.sin(((u - 0.9) / 0.1) * PI); return 0; };
  c.tick((dt) => {
    ph += dt * 0.0001; for (let i = 0; i < 2; i++) { buf[k] = v.on ? wave(dt / 2) : 0; k = (k + 1) % N; }
    if (v.on && (v.rhythm === 'sinus' || v.rhythm === 'vt')) { beepT -= dt; if (beepT <= 0) { beepT = 60 / v.hr; audio.beep(v.spo2 < 90 ? 760 : 980, 0.04, 'sine', 0.05); } }
    acc += dt; if (acc < 0.09) return; acc = 0; const g = s.ctx, W = s.w, Hh = s.h; g.fillStyle = v.on ? '#020806' : '#000'; g.fillRect(0, 0, W, Hh); if (!v.on) { s.dirty(); return; }
    g.strokeStyle = '#39ff88'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < N; i++) { const x = (i / N) * (W - 210) + 10, y = 120 - buf[(k + i) % N] * 80; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
    g.textAlign = 'left'; g.font = `600 22px ${FONT}`; g.fillStyle = '#39ff88'; g.fillText('ECG  ' + ({ sinus: 'SINUS', vf: 'V-FIB', vt: 'V-TACH', asys: 'ASYSTOLE' }[v.rhythm] || ''), 14, 30);
    const num = (lab, val, col, y) => { g.fillStyle = col; g.font = `600 20px ${FONT}`; g.fillText(lab, W - 190, y); g.font = `800 60px ${FONT}`; g.fillText(val, W - 190, y + 58); };
    num('HR', v.rhythm === 'vf' || v.rhythm === 'asys' ? '---' : Math.round(v.hr), '#39ff88', 40); num('SpO2 %', Math.round(v.spo2), v.spo2 < 90 ? '#ff5252' : '#4dd0ff', 150); num('NIBP', v.bp, '#ffd866', 260); num('RR', v.rr, '#e6edf3', 370);
    g.fillStyle = '#4dd0ff'; g.font = `600 22px ${FONT}`; g.fillText('PLETH', 14, 230); g.strokeStyle = '#4dd0ff'; g.beginPath(); for (let i = 0; i < 120; i++) { const x = 10 + (i / 120) * (W - 220), y = 290 - (v.spo2 > 0 && v.rhythm !== 'vf' && v.rhythm !== 'asys' ? 30 * Math.abs(Math.sin((i / 120) * 9 + ph * 6)) : 0); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
    if (v.msg) { g.fillStyle = '#ff5252'; g.font = `800 34px ${FONT}`; g.fillText(v.msg, 14, 420, W - 220); }
    s.dirty();
  });
  return v;
}

/* =====================================================================  LOBBY  */
ENVS.lobby = (c) => {
  c.mood({ bg: 0x05070c, hemi: [0x9fc9ff, 0x101624, 0.5], sun: [0xffffff, 1.3, 0.4, 2, 1], env: 0.5 }); const g = c.stage, F = c.F; sky(g, 0x0b1730, 0x020308);
  const fl = cyl(g, 5, 5, 0.05, M(0x10151d, { r: 0.22, m: 0.8 }), 0, F - 0.025, -0.6, 48); fl.castShadow = false;
  for (let i = 0; i < 3; i++) { const t = tor(g, 1.6 + i * 1.2, 0.012, glow([0x2f81f7, 0x39d353, 0xffd866][i], 2), 0, F + 0.01, -0.6); t.rotation.x = PI / 2; t.castShadow = false; }
  for (let i = 0; i < 14; i++) { const a = (i / 14) * PI * 2, r = 4.6; box(g, 0.08, 3.2, 0.08, glow(i % 2 ? 0x2f81f7 : 0x9fd3ff, 1.6), Math.cos(a) * r, F + 1.6, -0.6 + Math.sin(a) * r).castShadow = false; }
  const ring = tor(g, 1.5, 0.03, glow(0xffffff, 2.2), 0, F + 3.0, -0.6); ring.rotation.x = PI / 2; ring.castShadow = false;
  box(g, 1.2, 0.04, 0.5, M(0x161b22, { r: 0.3, m: 0.7 }), 0, -0.02, -0.04); cyl(g, 0.06, 0.2, 0.76, 0x0d1117, 0, -0.4, -0.04);
  c.tick((dt, t) => { ring.rotation.z = t * 0.2; });
  return {};
};

/* =====================================================================  EMERGENCY ROOM  */
ENVS.er = (c) => {
  c.mood({ bg: 0xdfe9ee, hemi: [0xffffff, 0xb0bec5, 0.9], sun: [0xfffaf2, 1.7, 0.3, 2.0, 0.9], env: 0.65 }); const g = c.stage, F = c.F;
  const r = room(c, { w: 6, d: 6, h: 2.9, floor: tex.tiles('#cfd8dc', '#aab7bd', [10, 10]), wall: 0xe6eef2, fr: 0.35 });
  for (const x of [-1.2, 1.2]) box(r, 1.1, 0.03, 0.6, glow(0xffffff, 1.6), x, F + 2.88, -0.6).castShadow = false;
  const cur = M(0xffffff, { map: tex.stripes('#3aa99f', '#2e8d84', [12, 1]), r: 1, side: THREE.DoubleSide }); plane(r, 3.2, 2.2, cur, -1.7, F + 1.3, -0.4).rotation.y = PI / 2; plane(r, 3.2, 2.2, cur, 1.9, F + 1.3, -0.4).rotation.y = -PI / 2;
  box(r, 3.4, 0.02, 0.02, metal(), -1.7, F + 2.42, -0.4).rotation.y = PI / 2; box(r, 1.6, 0.9, 0.12, M(0xf5f7f8), 0.9, F + 1.55, r.userData.back + 0.07); box(r, 1.5, 0.12, 0.06, M(0x90a4ae), 0.9, F + 1.0, r.userData.back + 0.05);
  for (let i = 0; i < 4; i++) cyl(r, 0.03, 0.03, 0.05, [0x43a047, 0xfdd835, 0xffffff, 0x1e88e5][i], 0.4 + i * 0.3, F + 1.0, r.userData.back + 0.1).rotation.x = PI / 2;
  const door = box(r, 1.1, 2.1, 0.05, M(0xb0bec5, { r: 0.5 }), -1.4, F + 1.05, r.userData.back + 0.03); box(r, 0.4, 0.6, 0.02, glow(0xd7ecff, 0.9), -1.4, F + 1.5, r.userData.back + 0.06); void door;
  const cart = grp(r, -1.15, F, -1.0); box(cart, 0.6, 0.9, 0.45, M(0xc62828, { r: 0.4 }), 0, 0.5, 0); for (let i = 0; i < 4; i++) box(cart, 0.56, 0.02, 0.02, metal(), 0, 0.25 + i * 0.18, 0.23); box(cart, 0.3, 0.14, 0.24, M(0x263238), 0, 1.02, 0); box(cart, 0.2, 0.09, 0.01, glow(0x39ff88, 0.8), 0, 1.03, 0.125);
  const iv = grp(r, -0.78, F, -0.52); cyl(iv, 0.012, 0.012, 1.9, metal(), 0, 0.95, 0); box(iv, 0.3, 0.012, 0.012, metal(), 0, 1.9, 0); const bag = cap(iv, 0.05, 0.12, glass(0xe3f6ff, 0.55), 0.12, 1.72, 0); bag.scale.z = 0.5; cyl(iv, 0.0025, 0.0025, 0.8, glass(0xffffff, 0.5), 0.12, 1.25, 0); cyl(iv, 0.2, 0.2, 0.03, 0x455a64, 0, 0.015, 0);
  cyl(r, 0.16, 0.16, 0.02, 0xffffff, -0.3, F + 2.3, r.userData.back + 0.02).rotation.x = PI / 2; noShadow(r);
  const near = grp(g); // gurney + patient
  box(near, 2.05, 0.06, 0.34, M(0x37474f, { r: 0.4, m: 0.6 }), 0.35, -0.07, -0.06); box(near, 2.0, 0.05, 0.32, M(0x1565c0, { r: 0.95 }), 0.35, -0.02, -0.06);
  for (const x of [-0.55, 1.25]) for (const z of [-0.2, 0.08]) { cyl(near, 0.018, 0.018, 0.66, metal(), x, -0.42, z); cyl(near, 0.05, 0.05, 0.03, 0x212121, x, -0.75, z).rotation.x = PI / 2; }
  box(near, 1.15, 0.025, 0.11, M(0xeceff1, { r: 0.35, m: 0.3 }), 0, -0.0125, 0.145); box(near, 0.03, 0.2, 0.02, metal(), -0.5, -0.1, 0.19); box(near, 0.03, 0.2, 0.02, metal(), 0.5, -0.1, 0.19);
  const skin = M(0xdfa98a, { r: 0.65 }), gown = M(0xbfd8ea, { r: 0.95 });
  box(near, 0.24, 0.045, 0.24, M(0xffffff, { r: 1 }), -0.5, 0.03, -0.06); sph(near, 0.082, skin, -0.47, 0.105, -0.06); sph(near, 0.086, 0x3e2723, -0.495, 0.11, -0.06).scale.set(0.9, 0.95, 1); cyl(near, 0.035, 0.04, 0.06, skin, -0.385, 0.075, -0.06).rotation.z = PI / 2;
  const torso = cap(near, 0.105, 0.3, gown, -0.18, 0.06, -0.06); torso.rotation.z = PI / 2; torso.scale.set(0.62, 1, 1.05);
  for (const z of [-0.2, 0.08]) { const a = cap(near, 0.032, 0.36, skin, -0.12, 0.035, z); a.rotation.z = PI / 2; }
  const bl = box(near, 1.15, 0.1, 0.3, M(0xe8f1f6, { r: 1 }), 0.72, 0.045, -0.06); void bl;
  const env = { near, v: vitals(c), chest: [-0.2, 0.128, -0.06], F };
  return env;
};

/* =====================================================================  OPERATING ROOM  */
ENVS.or = (c) => {
  c.mood({ bg: 0x0c1716, hemi: [0xbfe6e0, 0x0c1414, 0.3], sun: [0xfff4e0, 3.2, 0.12, 1.7, 0.3], env: 0.35 }); const g = c.stage, F = c.F;
  const r = room(c, { w: 7, d: 7, h: 3.1, floor: tex.noise('#22302f', [6, 6], 0.05), wall: 0x2a4644, fr: 0.25, fm: 0.2, ceil: 0x1a2625 });
  const lamp = grp(r, 0.1, 1.0, 0.05); cyl(lamp, 0.3, 0.3, 0.06, M(0xdfe6ea, { r: 0.3, m: 0.6 }), 0, 0, 0, 28); cyl(lamp, 0.27, 0.27, 0.01, glow(0xfff8e7, 2.6), 0, -0.035, 0, 28); cyl(lamp, 0.03, 0.03, 1.2, metal(), 0.25, 0.6, -0.3).rotation.z = 0.35;
  const beam = cone(r, 0.55, 1.0, M(0xfff3d6, { t: 0.018, e: 0xfff3d6, ei: 0.5, side: THREE.DoubleSide }), 0.06, 0.52, 0.0, 24); beam.castShadow = false;
  const lamp2 = grp(r, -0.9, 1.25, -0.5); cyl(lamp2, 0.22, 0.22, 0.05, M(0xdfe6ea, { r: 0.3, m: 0.6 }), 0, 0, 0, 24); cyl(lamp2, 0.2, 0.2, 0.01, glow(0xfff8e7, 1.2), 0, -0.03, 0, 24);
  box(r, 1.2, 0.8, 0.04, glow(0xcfe8ff, 0.7), 1.6, F + 1.7, r.userData.back + 0.03); box(r, 1.6, 2.2, 0.05, M(0x3b5a57, { r: 0.4, m: 0.3 }), -1.8, F + 1.1, r.userData.back + 0.03);
  const an = grp(r, -1.25, F, -0.35); box(an, 0.55, 1.2, 0.5, M(0xcfd8dc, { r: 0.4, m: 0.3 }), 0, 0.6, 0); box(an, 0.4, 0.28, 0.03, glow(0x39ff88, 0.35), 0, 1.4, 0.1); cyl(an, 0.05, 0.05, 0.4, 0x455a64, 0.35, 1.0, 0); person(r, -1.25, F, 0.35, 0x1b7f79, { hat: 0x2aa198, mask: 0x9fd3ff });
  person(r, 0.1, F, -0.72, 0x1b7f79, { hat: 0x2aa198, mask: 0x9fd3ff }).rotation.y = 0; person(r, 0.95, F, -0.68, 0x1b7f79, { hat: 0x2aa198, mask: 0x9fd3ff, s: 0.95 });
  noShadow(r);
  const near = grp(g);
  cyl(near, 0.14, 0.2, 0.7, M(0x455a64, { r: 0.4, m: 0.6 }), 0.3, -0.45, -0.04); box(near, 2.1, 0.06, 0.34, M(0x263238), 0.3, -0.05, -0.04);
  const dr = M(0x1b8079, { r: 1 }); box(near, 2.2, 0.085, 0.31, dr, 0.3, 0.018, -0.065); box(near, 2.2, 0.5, 0.02, dr, 0.3, -0.26, 0.085); const hd = sph(near, 0.1, dr, -0.62, 0.06, -0.04); hd.scale.set(1, 0.8, 1);
  const sk = plane(near, 0.36, 0.22, M(0xffffff, { map: tex.noise('#e2ad90', null, 0.035, 900), r: 0.6 }), 0, 0.0612, -0.04); sk.rotation.x = -PI / 2;
  for (const [x, z, w, d] of [[0, -0.155, 0.4, 0.014], [0, 0.075, 0.4, 0.014], [-0.187, -0.04, 0.014, 0.23], [0.187, -0.04, 0.014, 0.23]]) box(near, w, 0.004, d, M(0x7fd3cc, { r: 0.8 }), x, 0.062, z);
  box(near, 1.15, 0.02, 0.11, metal(0xcfd8dc, 0.3), 0, -0.01, 0.15); cyl(near, 0.015, 0.02, 0.76, metal(), 0.5, -0.4, 0.17); cyl(near, 0.015, 0.02, 0.76, metal(), -0.5, -0.4, 0.17);
  const env = { near, v: vitals(c), fieldY: 0.0625, lamp, beam, lights(k) { E_sun.intensity = 3.2 * k; beam.visible = k > 0.5; lamp.children[1].material.emissiveIntensity = 2.6 * k; c.E.hemi.intensity = 0.3 * (0.35 + 0.65 * k); } };
  const E_sun = c.E.sun; return env;
};

/* =====================================================================  TRUCK CAB + ROAD  */
ENVS.cab = (c, o) => {
  const w = o.weather || 'day', F = c.F, g = c.stage;
  const moods = { day: { bg: 0xa9d0f0, fog: [0xc4dcee, 80, 520], hemi: [0xffffff, 0x8d9a7a, 0.95], sun: [0xfff3da, 2.2, -0.8, 1.8, 0.6], env: 0.7 }, fog: { bg: 0xaab3b9, fog: [0xaab3b9, 5, 62], hemi: [0xdfe6ea, 0x7b858c, 0.9], sun: [0xffffff, 0.7, -0.5, 2, 0.5], env: 0.6 }, night: { bg: 0x04060c, fog: [0x04060c, 18, 150], hemi: [0x6f86b8, 0x05070b, 0.35], sun: [0xbdd0ff, 0.5, -0.5, 2, 0.5], env: 0.25 }, dusk: { bg: 0xe79a5b, fog: [0xd9a37a, 60, 420], hemi: [0xffd0a6, 0x4a4036, 0.8], sun: [0xff9d5c, 2.0, -1.5, 0.7, -0.6], env: 0.55 } };
  c.mood(moods[w]); const skyc = { day: [0x3f86d6, 0xcfe3f2], fog: [0x9aa4aa, 0xaab3b9], night: [0x02030a, 0x0a1020], dusk: [0x3b4a86, 0xf2a25c] }[w]; sky(g, skyc[0], skyc[1]);
  const dark = M(0x1b1e23, { r: 0.6 }), trim = M(0x2a2e35, { r: 0.45, m: 0.3 });
  const cab = grp(g); box(cab, 1.7, 0.34, 0.42, dark, 0, -0.05, -0.5); box(cab, 0.5, 0.06, 0.2, trim, 0, 0.15, -0.42); box(cab, 1.7, 0.6, 0.06, dark, 0, -0.5, -0.3);
  for (const x of [-0.82, 0.82]) { const p = box(cab, 0.09, 1.0, 0.09, dark, x, 0.55, -0.66); p.rotation.x = 0.25; box(cab, 0.06, 0.7, 1.3, dark, x * 1.03, -0.42, 0.1); box(cab, 0.16, 0.26, 0.03, trim, x * 1.22, 0.42, -0.5); box(cab, 0.13, 0.22, 0.005, M(0x9fb4c4, { r: 0.05, m: 1 }), x * 1.22, 0.42, -0.482); }
  box(cab, 1.9, 0.08, 1.6, dark, 0, 1.02, 0); box(cab, 1.75, 0.14, 0.08, dark, 0, 0.94, -0.74); box(cab, 0.28, 0.08, 0.02, trim, 0.0, 0.86, -0.7); noShadow(cab);
  const near = grp(g); sideDeck(near); box(near, 0.3, 0.03, 0.3, M(0x1b1e23, { r: 0.5, m: 0.3 }), 0, -0.015, -0.2);
  const cl = makeScreen(g, 0.4, 0.14, 800, 280, 0, 0.215, -0.335); cl.mesh.rotation.x = -0.35; box(g, 0.43, 0.165, 0.02, 0x0a0c10, 0, 0.212, -0.345).rotation.x = -0.35;
  /* road world */
  const rw = grp(g), y0 = -1.8, night = w === 'night';
  const gc = { day: 0x5f7f46, fog: 0x66705f, night: 0x0a0f0a, dusk: 0x6a6a44 }[w];
  const gr = plane(rw, 1600, 1600, M(0xffffff, { map: tex.noise('#' + new THREE.Color(gc).getHexString(), [160, 160], 0.1), r: 1 }), 0, y0 - 0.03, -300); gr.rotation.x = -PI / 2; gr.receiveShadow = false;
  const asph = tex.noise(night ? '#1a1c20' : '#3a3d42', [3, 260], 0.12, 4000); const rd = plane(rw, 9.4, 1400, M(0xffffff, { map: asph, r: 0.85 }), 1.8, y0, -400); rd.rotation.x = -PI / 2; rd.receiveShadow = false;
  const lineM = M(0xf5f5f5, { e: 0xffffff, ei: night ? 0.5 : 0.1 }); for (const x of [-1.85, 5.45]) { const l = plane(rw, 0.16, 1400, lineM, x, y0 + 0.012, -400); l.rotation.x = -PI / 2; }
  const dash = instanced(rw, new THREE.BoxGeometry(0.16, 0.01, 3.2), lineM, 60), post = instanced(rw, new THREE.BoxGeometry(0.1, 1.0, 0.1), M(0xf5f5f5, { e: 0xff5722, ei: night ? 0.9 : 0.15 }), 60);
  const tree = instanced(rw, new THREE.ConeGeometry(1.8, 6.5, 7), M(night ? 0x0b1a0e : 0x2f5f33, { r: 1 }), 70), trunk = instanced(rw, new THREE.CylinderGeometry(0.22, 0.3, 2.2, 6), M(0x4e342e, { r: 1 }), 70);
  const tp = []; for (let i = 0; i < 70; i++) tp.push([(i % 2 ? 1 : -1) * rand(9, 60) + 1.8, rand(0, 700), rand(0.7, 1.5)]);
  box(rw, 0.25, 0.5, 1400, metal(0x9aa3ab, 0.5), 6.6, y0 + 0.45, -400).castShadow = false;
  for (let i = 0; i < 6; i++) { const m = cone(rw, rand(60, 130), rand(40, 95), M(night ? 0x070b12 : w === 'dusk' ? 0x5a4a52 : 0x6f8f8a, { r: 1 }), -420 + i * 170 + rand(-30, 30), y0 + 20, -620 - rand(0, 80), 8); m.castShadow = false; }
  let rain = null; if (o.rain) { const n = 500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rand(-4, 4); pos[i * 3 + 1] = rand(-1, 3); pos[i * 3 + 2] = rand(-9, -0.8); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xcfe3f2, size: 0.03, transparent: true, opacity: 0.6 })); rain.frustumCulled = false; g.add(rain); }
  const obs = [];
  const road = {
    off: 0, rw, y0, obs,
    car(lane, d, col = 0xb71c1c, big) { const m = grp(rw, lane, y0, -d); box(m, big ? 2.5 : 1.8, big ? 2.6 : 0.8, big ? 8 : 4.2, M(col, { r: 0.35, m: 0.3 }), 0, big ? 1.7 : 0.6, 0); if (!big) box(m, 1.6, 0.6, 2.2, M(0x20262d, { r: 0.2, m: 0.5 }), 0, 1.25, -0.2); for (const x of [-0.65, 0.65]) box(m, 0.3, 0.14, 0.05, glow(0xff1744, 2.5), x, 0.75, big ? 4.02 : 2.12); noShadow(m); const ob = { m, lane, d, v: 0 }; obs.push(ob); return ob; },
    update(dt, st) {
      road.off += st.v * dt; const off = road.off;
      for (let i = 0; i < 60; i++) { const z = ((i * 12 - off) % 720 + 720) % 720; setInst(dash, i, 1.8, y0 + 0.012, 30 - z); const zz = ((i * 24 - off) % 1440 + 1440) % 1440; setInst(post, i, i % 2 ? -2.6 : 6.2, y0 + 0.5, 40 - zz / (i % 2 ? 1 : 1)); }
      for (let i = 0; i < 70; i++) { const z = ((tp[i][1] * 1.0 - off) % 700 + 700) % 700; setInst(tree, i, tp[i][0], y0 + 5.0 * tp[i][2], 40 - z, tp[i][2], tp[i][2], tp[i][2]); setInst(trunk, i, tp[i][0], y0 + 1.1, 40 - z); }
      dash.instanceMatrix.needsUpdate = post.instanceMatrix.needsUpdate = tree.instanceMatrix.needsUpdate = trunk.instanceMatrix.needsUpdate = true;
      asph.offset.y = (off / 1400) * 260; rw.rotation.y = st.psi; rw.position.x = -st.x; rw.rotation.x = S.calm ? 0 : -(st.grade || 0) * 0.5;
      for (const ob of obs) { ob.d -= (st.v - ob.v) * dt; ob.m.position.z = -ob.d; ob.m.position.x = ob.lane; }
      if (rain) { const p = rain.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) - dt * 9, z = p.getZ(i) + dt * st.v * 0.25; if (y < -1 || z > -0.6) { y = 3; z = rand(-9, -0.8); } p.setY(i, y); p.setZ(i, z); } p.needsUpdate = true; }
    },
  };
  road.update(0, { v: 0, psi: 0, x: 0 });
  return { near, road, cl, weather: w };
};

/* =====================================================================  COCKPIT  */
ENVS.cockpit = (c, o) => {
  const night = o.time === 'night', g = c.stage;
  c.mood(night ? { bg: 0x03050a, hemi: [0x6f86b8, 0x05070b, 0.3], sun: [0xbdd0ff, 0.5, 0.4, 2, 0.6], env: 0.22 } : { bg: 0x9cc8ee, fog: [0xcfe3f2, 900, 14000], hemi: [0xffffff, 0x8fa0b0, 0.9], sun: [0xfff3da, 2.0, 0.7, 1.9, 0.5], env: 0.7 });
  const dark = M(0x23272e, { r: 0.6 }), grey = M(0x4a5059, { r: 0.55, m: 0.2 });
  const ck = grp(g); box(ck, 1.8, 0.05, 0.42, dark, 0, 0.215, -0.5); box(ck, 1.8, 0.4, 0.05, grey, 0, 0.0, -0.3); box(ck, 1.8, 0.5, 0.05, grey, 0, -0.45, -0.24);
  for (const x of [0, -0.78, 0.78]) { const p = box(ck, x ? 0.1 : 0.05, 0.85, 0.06, dark, x, 0.62, -0.9); p.rotation.x = 0.3; } box(ck, 2.0, 0.1, 1.5, dark, 0, 1.03, 0); box(ck, 1.9, 0.12, 0.08, dark, 0, 0.97, -1.0);
  const oh = box(ck, 0.5, 0.03, 0.6, grey, 0, 0.97, -0.3); void oh; for (let i = 0; i < 30; i++) box(ck, 0.022, 0.006, 0.022, glow([0x39d353, 0xffd866, 0x4dd0ff][i % 3], 0.9), -0.2 + (i % 6) * 0.08, 0.953, -0.52 + Math.floor(i / 6) * 0.1).castShadow = false;
  for (const x of [-0.92, 0.92]) box(ck, 0.06, 0.7, 1.4, dark, x, -0.2, 0.1); noShadow(ck);
  const near = grp(g); box(near, 0.36, 0.04, 0.44, M(0x2d323a, { r: 0.5, m: 0.3 }), 0, -0.02, -0.03); box(near, 0.36, 0.7, 0.4, M(0x23272e), 0, -0.4, -0.03); sideDeck(near, 0x2d323a);
  const pfd = makeScreen(g, 0.27, 0.22, 594, 484, -0.17, 0.035, -0.272), eic = makeScreen(g, 0.27, 0.22, 594, 484, 0.15, 0.035, -0.272);
  box(g, 0.29, 0.24, 0.01, 0x08090c, -0.17, 0.035, -0.279); box(g, 0.29, 0.24, 0.01, 0x08090c, 0.15, 0.035, -0.279);
  /* outside */
  const out = grp(g, 0, 0.42, 0.38); out.rotation.order = 'ZXY'; sky(out, night ? 0x02030a : 0x2f7fd6, night ? 0x0b1226 : 0xd4e6f3);
  const gt = tex.tiles(night ? '#0a100c' : '#6f8c55', night ? '#101a12' : '#587446', [260, 260]); const ground = plane(out, 30000, 30000, M(0xffffff, { map: gt, r: 1 }), 0, -3, 0); ground.rotation.x = -PI / 2; ground.receiveShadow = false;
  const rwy = grp(out, 0, -2.95, -1500); const rp = plane(rwy, 50, 2800, M(night ? 0x16181c : 0x2f3238, { r: 0.9 }), 0, 0, 0); rp.rotation.x = -PI / 2; rp.receiveShadow = false;
  for (let i = 0; i < 40; i++) { const m = box(rwy, 1, 0.05, 28, glow(0xffffff, night ? 2.2 : 0.4), 0, 0.03, 1350 - i * 70); m.castShadow = false; }
  for (let i = 0; i < 44; i++) for (const x of [-26, 26]) { const m = box(rwy, 0.6, 0.3, 0.6, glow(i < 4 ? 0x39d353 : 0xfff1c1, night ? 3 : 1.2), x, 0.2, 1400 - i * 64); m.castShadow = false; }
  for (let i = 0; i < 10; i++) { const m = box(rwy, 14, 0.3, 0.8, glow(0xfff1c1, night ? 3 : 1.4), 0, 0.2, 1440 + i * 45); m.castShadow = false; }
  if (!night) for (let i = 0; i < 10; i++) { const cl = sph(out, rand(120, 260), M(0xffffff, { r: 1, t: 0.85 }), rand(-4000, 4000), rand(900, 1700), -rand(2500, 9000), 8); cl.scale.y = 0.25; cl.castShadow = false; }
  const world = { out, ground, rwy, update(st) { out.rotation.z = S.calm ? 0 : (st.roll * PI) / 180; out.rotation.x = S.calm ? 0 : (-st.pitch * PI) / 180; const h = Math.max(3, st.alt * 0.3048); ground.position.y = -h; rwy.position.y = -h + 0.05; rwy.position.z = -(st.dist ?? 4000) - 1400; rwy.position.x = -(st.loc || 0) * 60; gt.offset.y -= ((st.ias || 0) * 0.514 * (st.dt || 0)) / (30000 / 260); out.rotation.y = 0; } };
  world.update({ roll: 0, pitch: 0, alt: 0, dist: -1300 });
  return { near, pfd, eic, world, night };
};

/* =====================================================================  CRANE / CONSTRUCTION SITE  */
ENVS.crane = (c, o) => {
  const g = c.stage, F = c.F; c.mood({ bg: 0xb8d4ea, fog: [0xcddfec, 60, 320], hemi: [0xffffff, 0x9a8f7a, 0.95], sun: [0xfff0d2, 2.3, 0.9, 1.9, 0.4], env: 0.7 }); sky(g, 0x4a90d9, 0xdbe8f2);
  const y0 = F - 1.4; const gp = plane(g, 600, 600, M(0xffffff, { map: tex.noise('#a08f72', [60, 60], 0.12), r: 1 }), 0, y0, -80); gp.rotation.x = -PI / 2; gp.receiveShadow = false;
  const cabm = M(0xf9a825, { r: 0.4, m: 0.2 }), dark = M(0x1b1e23, { r: 0.6 }); const cb = grp(g);
  box(cb, 1.6, 0.06, 1.5, dark, 0, F - 0.03, 0); box(cb, 1.6, 0.08, 1.5, cabm, 0, 1.0, 0); for (const [x, z] of [[-0.78, -0.72], [0.78, -0.72], [-0.78, 0.72], [0.78, 0.72]]) box(cb, 0.06, 1.8, 0.06, cabm, x, 0.1, z); box(cb, 1.6, 0.45, 0.05, cabm, 0, -0.55, -0.72); box(cb, 0.05, 0.45, 1.5, cabm, -0.78, -0.55, 0); box(cb, 0.05, 0.45, 1.5, cabm, 0.78, -0.55, 0); noShadow(cb);
  const near = grp(g); sideDeck(near, 0x23272e);
  const site = grp(g, 0, y0, 0); const steel = M(0x8d3b2a, { r: 0.6, m: 0.4 }), conc = M(0xb9b9b4, { r: 0.95 });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { box(site, 0.35, 12, 0.35, steel, -9 + i * 6, 6, -34 - j * 6); if (i < 3) for (const y of [4, 8, 12]) box(site, 6, 0.3, 0.3, steel, -6 + i * 6, y, -34 - j * 6); if (j < 2) for (const y of [4, 8, 12]) box(site, 0.3, 0.3, 6, steel, -9 + i * 6, y, -37 - j * 6); }
  box(site, 18.6, 0.25, 12.6, conc, 0, 4.1, -40); for (const [x, z, col] of [[-12, -14, 0x1565c0], [-12, -17, 0xc62828], [13, -22, 0x2e7d32]]) box(site, 2.5, 2.6, 6, M(col, { r: 0.6, m: 0.3 }), x, 1.3, z);
  box(site, 60, 1.8, 0.1, M(0xffffff, { map: tex.hazard([30, 1]) }), 0, 0.9, -52); for (let i = 0; i < 5; i++) cone(site, 0.2, 0.5, 0xff6f00, -4 + i * 2, 0.25, -8);
  const twr = grp(site, 30, 0, -60); box(twr, 1.2, 40, 1.2, cabm, 0, 20, 0); box(twr, 34, 1, 1, cabm, -10, 40, 0); for (const x of [-22, 22]) { cyl(site, 0.3, 0.3, 11, M(0x5d4037), x, 5.5, -12); box(site, 2.4, 0.15, 0.15, M(0x5d4037), x, 10.6, -12); }
  for (const dx of [-1, 1]) { const wr = box(site, 44, 0.03, 0.03, 0x111111, 0, 10.7, -12 + dx * 0.0); wr.position.x = 0; wr.position.y = 10.6 + dx * 0.05; wr.position.z = -12 + dx * 1.0; }
  noShadow(site);
  const lmi = auxScreen(c);
  return { near, site, y0, lmi };
};

/* =====================================================================  WORKSHOP  */
ENVS.shop = (c) => {
  const g = c.stage, F = c.F; c.mood({ bg: 0x2a2620, hemi: [0xfff0d8, 0x3a332b, 0.6], sun: [0xffe8c2, 2.2, 0.25, 1.8, 0.7], env: 0.5 });
  const r = room(c, { w: 9, d: 8, h: 3.6, floor: tex.noise('#5b5e61', [8, 8], 0.14, 5000), wall: M(0x8a8f93, { r: 0.9 }), fr: 0.5, ceil: 0x3b3f44 });
  const peg = plane(r, 2.6, 1.2, M(0xffffff, { map: tex.noise('#c9a36b', [6, 3], 0.08), r: 0.9 }), 0, F + 1.55, -0.62); void peg;
  for (let i = 0; i < 9; i++) { const x = -1.1 + i * 0.27; box(r, 0.03, 0.26 + (i % 3) * 0.08, 0.015, metal(), x, F + 1.7, -0.6); tor(r, 0.035, 0.012, metal(), x, F + 1.86 + (i % 3) * 0.04, -0.6); }
  const chest = grp(r, -1.7, F, -0.7); box(chest, 0.9, 1.1, 0.5, M(0xb71c1c, { r: 0.35, m: 0.4 }), 0, 0.55, 0); for (let i = 0; i < 6; i++) box(chest, 0.8, 0.02, 0.02, metal(), 0, 0.2 + i * 0.16, 0.26);
  const car = grp(r, 2.6, F, -1.6); box(car, 1.8, 0.5, 4.2, M(0x1565c0, { r: 0.25, m: 0.6 }), 0, 1.9, 0); box(car, 1.6, 0.5, 2.2, M(0x0d1b2a, { r: 0.15, m: 0.7 }), 0, 2.35, -0.2); for (const x of [-0.95, 0.95]) for (const z of [-1.3, 1.3]) { cyl(car, 0.34, 0.34, 0.24, 0x111111, x, 1.65, z, 18).rotation.z = PI / 2; } for (const x of [-1.15, 1.15]) box(car, 0.2, 3.2, 0.25, M(0xf9a825, { r: 0.5, m: 0.4 }), x, 1.6, 0);
  for (let i = 0; i < 4; i++) tor(r, 0.28, 0.11, M(0x15171a, { r: 0.95 }), -3.3, F + 0.12 + i * 0.23, -1.9).rotation.x = PI / 2;
  const door = plane(r, 3.6, 2.8, M(0xb0bec5, { map: tex.planks('#aab4ba', '#7c878d', [1, 3]), r: 0.6, m: 0.3 }), -2.2, F + 1.4, r.userData.back + 0.02); void door; for (let i = 0; i < 4; i++) box(r, 0.6, 0.35, 0.02, glow(0xfff3d6, 1.3), -3.4 + i * 0.8, F + 2.1, r.userData.back + 0.04);
  const lp = grp(r, 0, 0.95, -0.05); cyl(lp, 0.004, 0.004, 1.6, 0x111111, 0, 0.8, 0); cone(lp, 0.16, 0.14, M(0x2e7d32, { r: 0.4, m: 0.5, side: THREE.DoubleSide }), 0, 0, 0, 20); sph(lp, 0.04, glow(0xfff1c1, 3), 0, -0.04, 0);
  noShadow(r);
  const near = grp(g); const wood = M(0xffffff, { map: tex.planks('#8b6a45', '#5f4630', [3, 2]), r: 0.7 }); box(near, 1.25, 0.05, 0.6, wood, 0, -0.025, -0.08);
  for (const x of [-0.58, 0.58]) for (const z of [-0.34, 0.18]) box(near, 0.06, 0.74, 0.06, 0x3e2e20, x, -0.41, z); box(near, 1.2, 0.04, 0.5, 0x3e2e20, 0, -0.55, -0.08);
  const vise = grp(near, -0.5, 0, -0.28); box(vise, 0.1, 0.07, 0.12, M(0x1e4e8c, { r: 0.4, m: 0.6 }), 0, 0.035, 0); box(vise, 0.1, 0.05, 0.02, metal(), 0, 0.09, 0.03); box(vise, 0.1, 0.05, 0.02, metal(), 0, 0.09, -0.03);
  return { near };
};

/* =====================================================================  sea (shared)  */
function sea(c, col, y0, amp = 0.5) {
  const geo = new THREE.PlaneGeometry(900, 900, 44, 44); geo.rotateX(-PI / 2); const m = new THREE.Mesh(geo, M(col, { r: 0.18, m: 0.55 })); m.position.set(0, y0, -200); m.receiveShadow = false; c.stage.add(m);
  const p = geo.attributes.position, base = p.array.slice(); let acc = 0;
  c.tick((dt, t) => { acc += dt; if (acc < 0.05) return; acc = 0; for (let i = 0; i < p.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; p.array[i * 3 + 1] = amp * (Math.sin(x * 0.05 + t * 0.9) + Math.sin(z * 0.07 + t * 0.7) * 0.8 + Math.sin((x + z) * 0.11 + t * 1.3) * 0.4); } p.needsUpdate = true; geo.computeVertexNormals(); });
  return m;
}

/* =====================================================================  TRAWLER DECK  */
ENVS.deck = (c, o) => {
  const g = c.stage, F = c.F, storm = o.sea !== 'calm';
  c.mood(storm ? { bg: 0x5c6b77, fog: [0x6c7a85, 20, 260], hemi: [0xcfd8dc, 0x2f3b45, 0.85], sun: [0xdfe9f2, 1.1, -0.6, 1.8, 0.4], env: 0.5 } : { bg: 0x9ec9e8, fog: [0xc6dcec, 80, 600], hemi: [0xffffff, 0x4b6a80, 0.95], sun: [0xfff0d2, 2.2, -0.8, 1.6, 0.5], env: 0.7 });
  sky(g, storm ? 0x3d4a55 : 0x3f86d6, storm ? 0x7d8b95 : 0xd4e6f3); sea(c, storm ? 0x1d3b4a : 0x1f5f8a, F - 1.6, storm ? 0.7 : 0.25);
  const ship = grp(g); const dk = plane(ship, 5.2, 9, M(0xffffff, { map: tex.planks('#7a6a55', '#4f4436', [4, 10]), r: 0.75 }), 0, F, -3.6); dk.rotation.x = -PI / 2;
  const bul = M(0x1e5a8c, { r: 0.5, m: 0.3 }); box(ship, 0.1, 1.0, 9, bul, -2.6, F + 0.5, -3.6); box(ship, 0.1, 1.0, 9, bul, 2.6, F + 0.5, -3.6);
  const ga = M(0xf9a825, { r: 0.5, m: 0.4 }); for (const x of [-1.9, 1.9]) { box(ship, 0.2, 3.8, 0.2, ga, x, F + 1.9, -7.6); } box(ship, 4.0, 0.2, 0.2, ga, 0, F + 3.8, -7.6); for (const x of [-1.2, 1.2]) cyl(ship, 0.12, 0.12, 0.1, metal(), x, F + 3.6, -7.6).rotation.z = PI / 2;
  const drums = []; for (const x of [-0.9, 0.9]) { const d = cyl(ship, 0.38, 0.38, 0.7, M(0x455a64, { r: 0.4, m: 0.7 }), x, F + 0.55, -2.2, 20); d.rotation.z = PI / 2; drums.push(d); for (const s of [-0.38, 0.38]) cyl(ship, 0.5, 0.5, 0.04, metal(0x607d8b, 0.4), x + s, F + 0.55, -2.2, 20).rotation.z = PI / 2; const wr = cyl(ship, 0.02, 0.02, 6.4, 0x222222, x * 1.2, F + 1.9, -5.0, 6); wr.rotation.x = PI / 2 - 0.42; }
  const net = sph(ship, 0.9, M(0x2e7d32, { r: 1 }), 0, F + 0.3, -5.6, 12); net.scale.set(1.4, 0.45, 1); for (let i = 0; i < 6; i++) box(ship, 0.6, 0.3, 0.4, M([0x1565c0, 0xef6c00][i % 2], { r: 0.7 }), -2.1 + (i % 2) * 0.05, F + 0.15 + Math.floor(i / 2) * 0.31, -1.2 - (i % 3) * 0.1);
  for (let i = 0; i < 5; i++) sph(ship, 0.16, M(0xff7043, { r: 0.6 }), 2.25, F + 0.9, -1.5 - i * 0.6); person(ship, 1.6, F, -4.4, 0xf9a825, { hat: 0xff6f00 }); noShadow(ship);
  let rain = null; if (storm) { const n = 500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = rand(-5, 5); pos[i * 3 + 1] = rand(-1, 3.5); pos[i * 3 + 2] = rand(-9, 1); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xcfe3f2, size: 0.03, transparent: true, opacity: 0.55 })); rain.frustumCulled = false; g.add(rain); c.tick((dt) => { const p = rain.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) - dt * 8; if (y < -1) y = 3.5; p.setY(i, y); p.setX(i, p.getX(i) + dt * 1.5 > 5 ? -5 : p.getX(i) + dt * 1.5); } p.needsUpdate = true; }); }
  if (!S.calm) c.tick((dt, t) => { ship.rotation.z = Math.sin(t * 0.7) * (storm ? 0.035 : 0.012); ship.rotation.x = Math.sin(t * 0.5 + 1) * (storm ? 0.02 : 0.006); });
  const near = grp(g); box(near, 1.2, 0.05, 0.5, M(0x37474f, { r: 0.45, m: 0.5 }), 0, -0.025, -0.05); box(near, 1.1, 0.75, 0.4, M(0x1e5a8c, { r: 0.5, m: 0.3 }), 0, -0.42, -0.05);
  const aux = auxScreen(c);
  return { near, aux, drums, storm };
};

/* =====================================================================  SHIP BRIDGE  */
ENVS.bridge = (c, o) => {
  const g = c.stage, F = c.F, night = o.time !== 'day';
  c.mood(night ? { bg: 0x02040a, fog: [0x02040a, 200, 2600], hemi: [0x5f78b0, 0x04060a, 0.32], sun: [0xbdd0ff, 0.45, 0.4, 2, 0.6], env: 0.2 } : { bg: 0x9ec9e8, fog: [0xc6dcec, 300, 4000], hemi: [0xffffff, 0x4b6a80, 0.95], sun: [0xfff0d2, 2.0, 0.6, 1.8, 0.5], env: 0.7 });
  sky(g, night ? 0x01020a : 0x3f86d6, night ? 0x0a1228 : 0xd4e6f3); const y0 = F - 22; sea(c, night ? 0x06121f : 0x1f5f8a, y0, 0.6);
  if (night) { const n = 400, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rand(0, PI * 2), e = rand(0.05, 1.3), r = 800; pos[i * 3] = Math.cos(a) * Math.cos(e) * r; pos[i * 3 + 1] = Math.sin(e) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const st = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: true, fog: false })); st.frustumCulled = false; g.add(st); }
  const br = grp(g), wall = M(0x39424c, { r: 0.6, m: 0.2 }); box(br, 5, 0.08, 3.4, M(0x1c2630, { r: 0.6 }), 0, F - 0.04, -0.3); box(br, 5, 0.1, 3.4, wall, 0, 1.25, -0.3); box(br, 5, 0.7, 0.08, wall, 0, -0.45, -1.3);
  for (let i = 0; i < 6; i++) box(br, 0.07, 1.4, 0.07, wall, -2.5 + i, 0.55, -1.3); for (const x of [-2.5, 2.5]) box(br, 0.08, 2.1, 3.4, wall, x, 0.2, -0.3 + 1.2).scale.z = 0.3;
  box(br, 2.2, 0.75, 0.5, M(0x2b333c, { r: 0.5, m: 0.3 }), 0, -0.42, -0.1); for (const x of [-1.6, 1.6]) { box(br, 0.7, 0.9, 0.6, M(0x2b333c, { r: 0.5, m: 0.3 }), x, -0.33, -0.7); box(br, 0.5, 0.36, 0.03, glow(x < 0 ? 0x39d353 : 0xffb300, night ? 0.5 : 0.25), x, 0.2, -0.6).rotation.x = -0.6; }
  const fore = grp(g, 0, y0, 0); box(fore, 30, 1, 160, M(night ? 0x13202b : 0x7a2a22, { r: 0.7 }), 0, 16, -98); for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) box(fore, 5.6, 5 + ((i * 7 + j * 3) % 3) * 2.6, 12, M([0x1565c0, 0xc62828, 0x2e7d32, 0xef6c00, 0x6a1b9a][(i + j * 2) % 5], { r: 0.7, e: 0x000000 }), -9 + j * 6, 19 + ((i * 7 + j * 3) % 3) * 1.3, -40 - i * 18);
  box(fore, 1.2, 14, 1.2, M(0xdfe6ea), 0, 24, -170); sph(fore, 0.5, glow(0xffffff, night ? 6 : 1), 0, 31.5, -170); noShadow(br); noShadow(fore);
  const near = grp(g); box(near, 1.25, 0.05, 0.52, M(0x2b333c, { r: 0.45, m: 0.4 }), 0, -0.025, -0.05);
  const con = makeScreen(g, 0.44, 0.17, 880, 340, 0, 0.215, -0.34); con.mesh.rotation.x = -0.4; box(g, 0.47, 0.2, 0.02, 0x0a0c10, 0, 0.212, -0.35).rotation.x = -0.4;
  const radar = auxScreen(c, 0.36, 0.36, 512, 512);
  /* traffic: world rotates around own ship */
  const trafficG = grp(g, 0, y0 + 1, 0); const ships = [];
  const addShip = (id) => { const m = grp(trafficG); const hull = box(m, 14, 6, 90, M(night ? 0x0c151d : 0x37474f, { r: 0.7 }), 0, 3, 0); void hull; box(m, 12, 12, 14, M(night ? 0x101a22 : 0xeceff1, { r: 0.7 }), 0, 12, 34); const L = { red: sph(m, 2.2, glow(0xff1744, 5), -7, 12, 30), green: sph(m, 2.2, glow(0x00e676, 5), 7, 12, 30), mast: sph(m, 2.2, glow(0xffffff, 5), 0, 22, 34), mast2: sph(m, 2.2, glow(0xffffff, 5), 0, 16, -36), stern: sph(m, 2, glow(0xffffff, 4), 0, 9, 46) }; noShadow(m); const s = { id, m, L, x: 0, y: 0, hdg: 0, spd: 0 }; ships.push(s); return s; };
  return { near, con, radar, night, y0, trafficG, ships, addShip };
};

/* =====================================================================  STADIUM  */
ENVS.arena = (c, o) => {
  const g = c.stage, F = c.F, night = o.time !== 'day';
  c.mood(night ? { bg: 0x060a14, fog: [0x060a14, 80, 400], hemi: [0xcfe0ff, 0x1c2a1c, 0.75], sun: [0xffffff, 2.2, 0.5, 2, 0.8], env: 0.5 } : { bg: 0x9ec9e8, hemi: [0xffffff, 0x4c7a4c, 0.95], sun: [0xfff0d2, 2.3, 0.6, 1.9, 0.6], env: 0.7 });
  sky(g, night ? 0x02040c : 0x3f86d6, night ? 0x101a33 : 0xd4e6f3);
  const pitch = plane(g, 110, 160, M(0xffffff, { map: tex.grass([22, 32]), r: 0.95 }), 0, F, -50); pitch.rotation.x = -PI / 2;
  const wl = M(0xffffff, { r: 0.9, e: 0xffffff, ei: 0.15 }); const ln = (w, d, x, z) => { const m = plane(g, w, d, wl, x, F + 0.01, z); m.rotation.x = -PI / 2; m.receiveShadow = false; return m; };
  if (o.sport === 'cricket') { const st = plane(g, 3.05, 20.1, M(0xd9c79a, { r: 0.95 }), 0, F + 0.008, -10.5); st.rotation.x = -PI / 2; ln(3.6, 0.06, 0, -1.2); ln(3.6, 0.06, 0, -19.8); for (const z of [-0.2, -20.8]) for (const x of [-0.11, 0, 0.11]) cyl(g, 0.018, 0.018, 0.72, M(0xf5e6c8), x, F + 0.36, z); const bat = person(g, 0.3, F, -1.3, 0xffffff, { hat: 0x1565c0 }); bat.rotation.y = PI / 2; person(g, -0.4, F, -21.5, 0xffffff, { hat: 0x1565c0 }); }
  else { ln(40.3, 0.12, 0, 0.6); ln(0.12, 16.5, -20.15, -7.65); ln(0.12, 16.5, 20.15, -7.65); ln(40.3, 0.12, 0, -15.9); ln(18.3, 0.12, 0, -4.9); ln(0.12, 5.5, -9.15, -2.15); ln(0.12, 5.5, 9.15, -2.15); const sp = cyl(g, 0.12, 0.12, 0.01, wl, 0, F + 0.01, -10.4); sp.castShadow = false; const post = M(0xffffff, { r: 0.3, m: 0.2 }); for (const x of [-3.66, 3.66]) cyl(g, 0.06, 0.06, 2.44, post, x, F + 1.22, 0.6); cyl(g, 0.06, 0.06, 7.32, post, 0, F + 2.44, 0.6).rotation.z = PI / 2; person(g, 0, F, -11.2, 0xc62828, { legs: 0xffffff }); }
  const stand = M(0x263238, { r: 0.9 }), crowd = M(0xffffff, { map: tex.noise('#3a3f4a', [40, 6], 0.5, 9000), r: 1 });
  for (const [x, z, ry, w] of [[0, -135, 0, 150], [-62, -50, PI / 2, 170], [62, -50, -PI / 2, 170]]) { const s = grp(g, x, F, z); s.rotation.y = ry; for (let i = 0; i < 7; i++) { box(s, w, 1.6, 4, stand, 0, 0.8 + i * 1.6, -i * 4); plane(s, w, 1.5, crowd, 0, 2.3 + i * 1.6, -i * 4 + 0.3); } box(s, w, 1, 30, stand, 0, 13.5, -14); noShadow(s); }
  for (const [x, z] of [[-55, -125], [55, -125], [-55, 20], [55, 20]]) { cyl(g, 0.6, 0.9, 38, 0x90a4ae, x, F + 19, z).castShadow = false; const p = box(g, 9, 5, 0.6, glow(0xffffff, night ? 5 : 1), x, F + 39, z); p.lookAt(0, F, -50); p.castShadow = false; }
  const near = grp(g); sideDeck(near, 0x23272e);
  const sb = auxScreen(c);
  return { near, sb };
};

/* =====================================================================  STUDENT LAB  */
ENVS.lab = (c) => {
  const g = c.stage, F = c.F; c.mood({ bg: 0xdfe9ee, hemi: [0xffffff, 0xb9c4c9, 0.9], sun: [0xfff6e6, 1.8, -0.5, 2.0, 0.8], env: 0.7 });
  const r = room(c, { w: 9, d: 8, h: 3.1, floor: tex.tiles('#d7d2c5', '#b9b3a4', [9, 8]), wall: 0xeef3f5, fr: 0.4 });
  const back = r.userData.back; for (let i = 0; i < 3; i++) { box(r, 1.6, 1.3, 0.04, glow(0xd7ecff, 1.4), -4.47, F + 1.7, -3.6 + i * 2.2).rotation.y = PI / 2; }
  const wb = box(r, 3.2, 1.3, 0.04, M(0xffffff, { r: 0.25 }), -1.2, F + 1.7, back + 0.03); void wb; const pt = canvasPeriodic(); plane(r, 2.2, 1.25, M(0xffffff, { map: pt, r: 0.8 }), 2.3, F + 1.75, back + 0.03);
  for (let i = 0; i < 2; i++) { const b = grp(r, -2.3 + i * 4.6, F, -2.2); box(b, 2.6, 0.9, 0.8, M(0xb0bec5, { r: 0.7 }), 0, 0.45, 0); box(b, 2.7, 0.05, 0.9, M(0x1c1f24, { r: 0.35, m: 0.2 }), 0, 0.925, 0); for (let k = 0; k < 5; k++) { cyl(b, 0.035, 0.035, 0.14 + (k % 3) * 0.05, glass([0x4fc3f7, 0xffb74d, 0x81c784, 0xe57373, 0xba68c8][k], 0.55), -0.9 + k * 0.4, 1.03 + (k % 3) * 0.025, 0.1, 12); } for (const x of [-0.7, 0.7]) { cyl(b, 0.16, 0.16, 0.04, 0x455a64, x, 0.5, 0.8); cyl(b, 0.02, 0.02, 0.5, metal(), x, 0.25, 0.8); } }
  const hood = grp(r, 3.4, F, -0.6); box(hood, 1.0, 2.2, 1.4, M(0xcfd8dc, { r: 0.5, m: 0.3 }), 0, 1.1, 0); box(hood, 0.05, 0.9, 1.2, glass(0xcfe8ff, 0.25), -0.5, 1.5, 0); box(r, 0.3, 0.45, 0.04, M(0x2e7d32, { e: 0x2e7d32, ei: 0.4 }), -3.2, F + 2.3, back + 0.04); cyl(r, 0.09, 0.09, 0.5, M(0xc62828, { r: 0.4 }), -3.9, F + 0.5, back + 0.25);
  for (const x of [-1.2, 1.2]) box(r, 1.1, 0.03, 0.5, glow(0xffffff, 1.5), x, F + 3.08, -0.6).castShadow = false; noShadow(r);
  const near = grp(g); box(near, 1.3, 0.05, 0.62, M(0x1c1f24, { r: 0.3, m: 0.2 }), 0, -0.025, -0.08); box(near, 1.24, 0.72, 0.56, M(0xb0bec5, { r: 0.7 }), 0, -0.41, -0.08);
  cyl(near, 0.012, 0.012, 0.16, metal(), -0.52, 0.08, -0.33); const tap = cyl(near, 0.01, 0.01, 0.1, metal(), -0.48, 0.155, -0.33); tap.rotation.z = PI / 2;
  const aux = auxScreen(c);
  return { near, aux };
};
function canvasPeriodic() { const t = new THREE.CanvasTexture((() => { const cv = document.createElement('canvas'); cv.width = 720; cv.height = 400; const g = cv.getContext('2d'); g.fillStyle = '#f8fafc'; g.fillRect(0, 0, 720, 400); const cols = ['#ef9a9a', '#ffcc80', '#fff59d', '#a5d6a7', '#80deea', '#90caf9', '#ce93d8']; const rows = [[0, 17], [0, 1, 12, 13, 14, 15, 16, 17], [0, 1, 12, 13, 14, 15, 16, 17], null, null, null, null]; for (let r = 0; r < 7; r++) for (let k = 0; k < 18; k++) { if (rows[r] && !rows[r].includes(k)) continue; g.fillStyle = cols[(k < 2 ? 0 : k < 12 ? 2 : k < 17 ? 4 : 6) + (r % 2 && k > 1 && k < 17 ? 1 : 0)]; rr(g, 12 + k * 38.6, 50 + r * 46, 35, 42, 5); g.fill(); } g.fillStyle = '#0f172a'; g.font = `700 26px ${FONT}`; g.fillText('PERIODIC TABLE OF THE ELEMENTS', 14, 34); return cv; })()); t.colorSpace = THREE.SRGBColorSpace; return t; }
void clamp;
