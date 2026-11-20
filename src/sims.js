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
import { THREE, M, metal, glow, box, cyl, sph, grp, plane, clamp, lerp, rand, FONT, audio, rr, tex } from './core.js';
import { S, E } from './engine.js';
const PI = Math.PI;

/* =====================================================================  DRIVING  */
export function Drive(c, o = {}) {
  const env = c.env, st = { v: o.v ?? 22, x: 0, psi: 0, pull: 0, grade: o.grade || 0, brakeEff: 1, temp: 0.12, retard: false, low: false, blown: false, noBrakes: false, dist: 0, hazard: false, warn: '', a: 0 };
  const wheel = c.wheel('steer', 'STEER', 0, 0.12, 0.03, { radius: 0.16, tilt: -0.8, spring: 0, maxA: 1.9 });
  const ped = c.lever('pedal', 'BRAKE  <  >  GAS', 0.3, 0, 0.08, { spring: 0.5, len: 0.16, color: 0x2e7d32 });
  st.wheel = wheel; st.ped = ped; let acc = 0, gT = 0, gV = 0;
  st.bot = (tx = 0, tv = 11) => { wheel.held = wheel; ped.held = ped; wheel.value = clamp((tx - st.x) * 0.5 - st.psi * 5 - st.pull * 3.4, -1, 1); ped.value = clamp(0.5 + (tv - st.v) * 0.25, 0, 1); };
  c.tick((dt) => {
    if (c.game.over) { audio.setHum(60, 0); return; }
    const steer = wheel.value, a = (ped.value - 0.5) * 2; st.a = a;
    gT -= dt; if (gT <= 0) { gT = rand(1.5, 4); gV = (Math.random() - 0.5) * 0.02 * (o.gust ?? 1) * c.hard; }
    st.psi += (steer * 0.3 * clamp(st.v / 18, 0.15, 1.3) + (st.v > 1 ? st.pull + gV : 0)) * dt; st.psi *= 1 - 0.45 * dt; if (c.assist === 0 && (!wheel.held || (E.bot && c.game.step && c.game.step.t !== 'sim')) && !st.blown) st.psi += (-st.x * 0.03 - st.psi * 1.2) * dt; st.psi = clamp(st.psi, -0.5, 0.5);
    st.x += st.v * Math.sin(st.psi) * dt;
    st.brakeEff = st.noBrakes ? 0.06 : clamp(1.3 - st.temp * 1.3, 0.08, 1);
    let ac = a > 0 ? a * 1.5 : a * 6.5 * st.brakeEff; ac += st.grade * 9.81 - 0.012 * st.v - (st.retard ? 0.05 * st.v : 0) - (st.low ? 0.035 * st.v : 0) - (st.blown ? 0.5 : 0);
    st.v = clamp(st.v + ac * dt, 0, 45); st.temp = clamp(st.temp + (a < 0 ? -a * st.v * 0.0075 : 0) * dt - 0.02 * st.temp * dt, 0, 1.2); st.dist += st.v * dt;
    env.road.update(dt, st); audio.setHum(48 + st.v * 3.2, 0.04 + Math.max(0, a) * 0.03);
    acc += dt; if (acc < 0.1) return; acc = 0; const s = env.cl, g = s.ctx, W = s.w, Hh = s.h; g.fillStyle = '#05070a'; g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#e6edf3'; g.textAlign = 'center'; g.font = `800 150px ${FONT}`; g.fillText(Math.round(st.v * 3.6), W / 2, 150); g.font = `600 30px ${FONT}`; g.fillStyle = '#8b949e'; g.fillText('km/h', W / 2, 190);
    g.textAlign = 'left'; g.font = `600 24px ${FONT}`; g.fillStyle = '#8b949e'; g.fillText('BRAKE TEMP', 24, 44); g.fillStyle = '#21262d'; g.fillRect(24, 56, 200, 26); g.fillStyle = st.temp > 0.75 ? '#ff5252' : st.temp > 0.5 ? '#ffb300' : '#39d353'; g.fillRect(24, 56, 200 * clamp(st.temp), 26);
    const tag = (t, on, x, y, col) => { g.fillStyle = on ? col : '#21262d'; rr(g, x, y, 180, 40, 8); g.fill(); g.fillStyle = on ? '#000' : '#6e7681'; g.font = `700 22px ${FONT}`; g.textAlign = 'center'; g.fillText(t, x + 90, y + 28); g.textAlign = 'left'; };
    tag('ENGINE BRAKE', st.retard, 24, 110, '#39d353'); tag('LOW GEAR', st.low, 24, 160, '#39d353'); tag('HAZARD', st.hazard && Math.sin(E.t * 8) > 0, W - 204, 110, '#ffb300'); tag(st.lights || 'LIGHTS', !!st.lights, W - 204, 160, '#4dd0ff');
    if (st.warn) { g.fillStyle = '#ff5252'; g.font = `800 34px ${FONT}`; g.textAlign = 'center'; g.fillText(st.warn, W / 2, 250); }
    g.fillStyle = '#8b949e'; g.font = `600 22px ${FONT}`; g.textAlign = 'right'; g.fillText(st.grade ? `GRADE ${Math.round(st.grade * 100)}% DOWN` : '', W - 24, 44); s.dirty();
  });
  return st;
}

/* =====================================================================  FLYING  */
export function Fly(c, o = {}) {
  const env = c.env, st = { pitch: o.pitch ?? 2.5, roll: 0, ias: o.ias ?? 160, alt: o.alt ?? 0, vs: 0, hdg: 0, loc: 0, gsd: 0, dist: o.dist ?? 9000, eng: [1, 1], fire: [false, false], n1: [0.5, 0.5], ground: !!o.ground, flaps: o.flaps || 0, gear: o.gear !== false, sb: false, msgs: [], fd: null, live: false, altK: o.altK || 1, distK: o.distK || 1, xwind: 0, noGS: false, noEic: false, ils: !!o.ils, ap: false, air: !o.ground };
  const stick = c.stick('stick', 'SIDESTICK', 0.34, 0, 0.08, { range: 0.06 });
  const t1 = c.lever('thr1', 'THRUST 1', -0.04, 0, -0.11, { value: o.thr ?? 0.5, len: 0.15, color: 0xeceff1 }), t2 = c.lever('thr2', 'THRUST 2', 0.04, 0, -0.11, { value: o.thr ?? 0.5, len: 0.15, color: 0xeceff1 });
  st.stick = stick; st.t1 = t1; st.t2 = t2; st.n1 = [0.2 + 0.8 * t1.value, 0.2 + 0.8 * t2.value]; let acc = 0, gT = 0, gR = 0, gP = 0, alarmT = 0;
  st.botHold = (tp = 12, tr = 0) => { stick.held = stick; stick.value.x = clamp((tr - st.roll) * 0.12 - (st.n1[0] - st.n1[1]) * 0.5, -1, 1); stick.value.y = clamp((st.pitch - tp) * 0.5, -1, 1); };
  c.tick((dt) => {
    if (c.game.over) { audio.setHum(60, 0); return; }
    const thr = [t1.value, t2.value]; for (let i = 0; i < 2; i++) st.n1[i] = lerp(st.n1[i], st.eng[i] ? 0.2 + 0.8 * thr[i] : 0.04, 1 - Math.exp(-dt * 1.3));
    const thrust = (st.n1[0] + st.n1[1]) / 2, asym = st.n1[0] - st.n1[1];
    gT -= dt; if (gT <= 0) { gT = rand(0.8, 2.4); const k = (o.gust || 0) * c.hard; gR = (Math.random() - 0.5) * 18 * k; gP = (Math.random() - 0.5) * 3 * k; }
    if (st.ap || E.bot) st.botHold(st.apPitch ?? 12, 0);
    const air = !st.ground;
    st.roll += (air ? stick.value.x * 30 + asym * 14 + gR - st.roll * 0.22 : -st.roll * 3) * dt; st.pitch += (-stick.value.y * 7.5 + (air ? gP : 0) - (st.pitch - 2.5) * 0.05) * dt;
    if (st.ground) { st.pitch = clamp(st.pitch, 0, st.ias > 130 ? 20 : 3); if (st.pitch > 7 && st.ias > 135) { st.ground = false; st.air = true; } }
    st.pitch = clamp(st.pitch, -20, 25); st.roll = clamp(st.roll, -80, 80);
    const eq = 60 + 420 * thrust - 9 * st.pitch - (st.sb ? 35 : 0) - st.flaps * 60 - (st.gear && air ? 25 : 0); st.ias += (eq - st.ias) * (st.ground ? 0.05 : 0.12) * dt; st.ias = clamp(st.ias, 60, 420);
    st.vs = st.ground ? 0 : (st.pitch - 2.5) * st.ias * 1.9 * Math.cos((st.roll * PI) / 180); st.alt = Math.max(0, st.alt + ((st.vs * st.altK) / 60) * dt);
    st.hdg += st.roll * 0.06 * dt; st.dist -= st.ias * 0.514 * st.distK * dt; st.loc = clamp(st.loc + (st.hdg * 0.022 + st.xwind) * dt, -3, 3);
    st.gsd = clamp((st.alt - Math.max(0, st.dist) * 0.0524 * 3.281) / 120, -3, 3);
    if (st.live && !c.game.over) { if (Math.abs(st.roll) > 68) c.fault('Loss of control: the aircraft rolled over.', { crit: true }); else if (st.air && st.alt <= 0 && st.vs < -300) c.fault('Flew it into the ground.', { crit: true }); }
    env.world.update({ roll: st.roll, pitch: st.pitch, alt: st.ground ? 0 : st.alt, dist: st.dist, loc: st.loc, ias: st.ias, dt });
    audio.setHum(70 + thrust * 90, 0.035 + thrust * 0.03); if (st.fire[0] || st.fire[1] || st.alarm) { alarmT -= dt; if (alarmT <= 0) { alarmT = 0.9; audio.alarm(); } }
    acc += dt; if (acc < 0.08) return; acc = 0; drawPfd(env.pfd, st, c); drawEic(env.eic, st);
  });
  return st;
}
function drawPfd(s, st, c) {
  const g = s.ctx, W = s.w, Hh = s.h, cx = W / 2, cy = Hh / 2 - 10, px = 9; g.fillStyle = '#000'; g.fillRect(0, 0, W, Hh);
  g.save(); g.beginPath(); g.rect(100, 40, W - 200, Hh - 120); g.clip(); g.translate(cx, cy); g.rotate((-st.roll * PI) / 180); g.translate(0, st.pitch * px);
  g.fillStyle = '#2f7fd6'; g.fillRect(-600, -900, 1200, 900); g.fillStyle = '#7a4a22'; g.fillRect(-600, 0, 1200, 900); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(-600, 0); g.lineTo(600, 0); g.stroke();
  g.fillStyle = '#fff'; g.font = `600 20px ${FONT}`; g.textAlign = 'center'; for (let p = -20; p <= 25; p += 5) { if (!p) continue; const y = -p * px, w = p % 10 ? 30 : 60; g.beginPath(); g.moveTo(-w, y); g.lineTo(w, y); g.stroke(); if (!(p % 10)) g.fillText(Math.abs(p), w + 22, y + 7); }
  g.restore();
  if (st.fd !== null && c.assist < 2) { g.strokeStyle = '#ff4dff'; g.lineWidth = 5; const y = cy - (st.fd - st.pitch) * px; g.beginPath(); g.moveTo(cx - 90, y); g.lineTo(cx + 90, y); g.stroke(); }
  g.strokeStyle = '#ffd866'; g.lineWidth = 7; g.beginPath(); g.moveTo(cx - 110, cy); g.lineTo(cx - 40, cy); g.lineTo(cx - 40, cy + 16); g.moveTo(cx + 110, cy); g.lineTo(cx + 40, cy); g.lineTo(cx + 40, cy + 16); g.stroke(); g.fillStyle = '#ffd866'; g.fillRect(cx - 5, cy - 5, 10, 10);
  const tape = (x, val, lab, bad) => { g.fillStyle = '#111827'; g.fillRect(x, 40, 92, Hh - 120); g.fillStyle = bad ? '#ff5252' : '#fff'; g.font = `800 38px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#000'; g.fillRect(x, cy - 28, 92, 56); g.strokeStyle = bad ? '#ff5252' : '#fff'; g.lineWidth = 2; g.strokeRect(x + 1, cy - 28, 90, 56); g.fillStyle = bad ? '#ff5252' : '#fff'; g.fillText(val, x + 46, cy + 14); g.fillStyle = '#8b949e'; g.font = `600 18px ${FONT}`; g.fillText(lab, x + 46, 64); };
  tape(4, st.iasBad ? Math.round(st.ias + 60 + 30 * Math.sin(E.t)) : Math.round(st.ias), 'IAS kt', st.ias > 320 || st.ias < 115); tape(W - 96, Math.round(st.alt / 10) * 10, 'ALT ft', false);
  g.fillStyle = '#39d353'; g.font = `700 22px ${FONT}`; g.textAlign = 'right'; g.fillText(`${st.vs >= 0 ? '+' : ''}${Math.round(st.vs / 50) * 50} fpm`, W - 104, Hh - 90);
  g.textAlign = 'left'; g.fillText(`PITCH ${st.pitch.toFixed(0)}°  ROLL ${st.roll.toFixed(0)}°`, 104, Hh - 90);
  if (st.ils) { g.strokeStyle = '#fff'; g.lineWidth = 2; const bx = cx, by = Hh - 46; for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(bx + i * 44, by, 6, 0, 7); g.stroke(); } g.fillStyle = '#ff4dff'; const lx = bx - clamp(st.loc, -2.3, 2.3) * 44; g.beginPath(); g.moveTo(lx, by - 13); g.lineTo(lx + 11, by); g.lineTo(lx, by + 13); g.lineTo(lx - 11, by); g.fill(); g.fillStyle = '#8b949e'; g.font = `600 16px ${FONT}`; g.fillText('LOC', bx - 150, by + 6);
    if (!st.noGS) { const gx = W - 118, gy = cy; for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(gx, gy + i * 44, 6, 0, 7); g.stroke(); } g.fillStyle = '#ff4dff'; const yy = gy + clamp(st.gsd, -2.3, 2.3) * 44; g.beginPath(); g.moveTo(gx - 13, yy); g.lineTo(gx, yy + 11); g.lineTo(gx + 13, yy); g.lineTo(gx, yy - 11); g.fill(); } else { g.fillStyle = '#ff5252'; g.font = `700 20px ${FONT}`; g.fillText('G/S', W - 140, cy); } }
  if (st.banner) { g.fillStyle = '#ff5252'; g.font = `800 30px ${FONT}`; g.textAlign = 'center'; g.fillText(st.banner, cx, 34); }
  s.dirty();
}
function drawEic(s, st) {
  const g = s.ctx, W = s.w, Hh = s.h; g.fillStyle = '#000'; g.fillRect(0, 0, W, Hh); if (st.noEic) { g.fillStyle = '#30363d'; g.font = `700 30px ${FONT}`; g.textAlign = 'center'; g.fillText('DISPLAY FAILED', W / 2, Hh / 2); s.dirty(); return; }
  for (let i = 0; i < 2; i++) { const cx = 150 + i * 290, cy = 150, n = st.n1[i]; g.strokeStyle = '#30363d'; g.lineWidth = 16; g.beginPath(); g.arc(cx, cy, 90, PI * 0.75, PI * 2.25); g.stroke(); g.strokeStyle = st.fire[i] ? '#ff5252' : n > 0.97 ? '#ffb300' : '#39d353'; g.beginPath(); g.arc(cx, cy, 90, PI * 0.75, PI * (0.75 + 1.5 * clamp(n))); g.stroke();
    g.fillStyle = '#fff'; g.font = `800 50px ${FONT}`; g.textAlign = 'center'; g.fillText((n * 100).toFixed(0), cx, cy + 16); g.font = `600 22px ${FONT}`; g.fillStyle = '#8b949e'; g.fillText(`N1  ENG ${i + 1}`, cx, cy + 78);
    g.fillStyle = st.fire[i] ? '#ff5252' : '#8b949e'; g.font = `700 24px ${FONT}`; g.fillText(`EGT ${st.fire[i] ? 985 : st.eng[i] ? Math.round(380 + 420 * n) : 190}`, cx, cy + 112); if (st.fire[i]) { g.fillStyle = Math.sin(E.t * 10) > 0 ? '#ff1744' : '#7f0000'; rr(g, cx - 90, 4, 180, 44, 8); g.fill(); g.fillStyle = '#fff'; g.font = `800 28px ${FONT}`; g.fillText('FIRE', cx, 36); } }
  g.textAlign = 'left'; let y = 320; for (const m of st.msgs) { g.fillStyle = m[0] === '!' ? '#ff5252' : '#ffb300'; g.font = `800 28px ${FONT}`; g.fillText(m.replace(/^!/, ''), 24, y); y += 36; }
  g.fillStyle = '#4dd0ff'; g.font = `600 22px ${FONT}`; g.fillText(`FLAPS ${st.flaps ? 'LAND' : 'UP'}   GEAR ${st.gear ? 'DOWN' : 'UP'}   SPD BRK ${st.sb ? 'OUT' : 'IN'}`, 24, Hh - 20); s.dirty();
}

/* =====================================================================  CRANE  */
export function Crane(c, o = {}) {
  const env = c.env, site = env.site, st = { x: o.x ?? -6, z: o.z ?? -14, h: o.h ?? 1.0, vx: 0, vz: 0, vh: 0, sx: 0, sz: 0, svx: o.swing || 0, svz: 0, wind: 0, slip: 0, half: false, noCam: false, tgt: o.tgt || [5, -18], workers: o.workers || [], top: 15, lineX: o.lineX ?? null };
  box(env.near, 0.52, 0.03, 0.24, M(0x23272e, { r: 0.5, m: 0.3 }), 0, -0.015, 0.05).castShadow = false;
  const jl = c.stick('jl', 'MOVE LOAD', -0.14, 0, 0.05, { range: 0.06 }), jr = c.stick('jr', 'HOIST  UP / DOWN', 0.14, 0, 0.05, { range: 0.06 }); st.jl = jl; st.jr = jr;
  const boom = box(site, 0.7, 0.7, 1, M(0xf9a825, { r: 0.45, m: 0.4 })), cable = cyl(site, 0.03, 0.03, 1, 0x111111, 0, 0, 0, 6), hook = box(site, 0.5, 0.5, 0.5, M(0xf9a825, { r: 0.4, m: 0.5 }));
  const load = box(site, 2.2, 1.4, 2.2, M(0xffffff, { map: tex.noise('#9aa0a6', [2, 2], 0.2), r: 0.9 })); const blob = cyl(site, 1.4, 1.4, 0.02, M(0x000000, { t: 0.45 }), 0, 0.03, 0, 20); blob.castShadow = false;
  const pad = cyl(site, 1.9, 1.9, 0.06, M(0x2e7d32, { e: 0x39d353, ei: 0.5 }), st.tgt[0], 0.04, st.tgt[1], 28); pad.castShadow = false; const padR = cyl(site, 0.4, 0.4, 0.08, glow(0xffffff, 1), st.tgt[0], 0.06, st.tgt[1], 16); padR.castShadow = false;
  for (const w of st.workers) { const g = grp(site, w[0], 0, w[1]); cyl(g, 0.22, 0.26, 1.1, M(0xff6f00, { e: 0xff6f00, ei: 0.25 }), 0, 0.75, 0); sph(g, 0.16, 0xd9a47c, 0, 1.5, 0); const hh = sph(g, 0.18, 0xffeb3b, 0, 1.58, 0); hh.scale.y = 0.6; }
  if (st.lineX !== null) { for (const z of [-8, -26]) cyl(site, 0.2, 0.2, 10, M(0x5d4037), st.lineX, 5, z); for (const dy of [9.2, 9.8]) { const w = cyl(site, 0.04, 0.04, 18, glow(0xff5252, 1.2), st.lineX, dy, -17, 6); w.rotation.x = PI / 2; } }
  const base = new THREE.Vector3(3, 2, -2), tip = new THREE.Vector3(); let acc = 0;
  st.sway = () => Math.hypot(st.sx, st.sz); st.dist = () => Math.hypot(st.x + st.sx - st.tgt[0], st.z + st.sz - st.tgt[1]);
  st.nearWorker = () => { let d = 99; for (const w of st.workers) d = Math.min(d, Math.hypot(st.x + st.sx - w[0], st.z + st.sz - w[1])); return d; };
  st.bot = (tx, tz, th) => { jl.held = jl; jr.held = jr; const k = st.half ? 2 : 1; jl.value.x = clamp((tx - st.x) * 0.22 * k, -0.8, 0.8); jl.value.y = clamp(-(tz - st.z) * 0.22 * k, -0.8, 0.8); jr.value.y = clamp((th - st.h) * 0.8 + st.slip, -1, 1); };
  c.tick((dt) => {
    if (c.game.over) return; const sp = st.half ? 1.1 : 2.4, tx = jl.value.x * sp, tz = -jl.value.y * sp, ax = (tx - st.vx) * 2.6, az = (tz - st.vz) * 2.6;
    st.vx += ax * dt; st.vz += az * dt; st.x = clamp(st.x + st.vx * dt, -14, 14); st.z = clamp(st.z + st.vz * dt, -30, -6);
    const L = Math.max(3, st.top - st.h), w = 9.81 / L, gust = st.wind * (0.6 + 0.4 * Math.sin(E.t * 0.9));
    st.svx += (-w * st.sx - 0.45 * st.svx - ax * 0.7 + gust) * dt; st.svz += (-w * st.sz - 0.45 * st.svz - az * 0.7) * dt; st.sx += st.svx * dt; st.sz += st.svz * dt;
    st.vh = jr.value.y * 1.5 - st.slip; st.h = clamp(st.h + st.vh * dt, 0.7, 12); if (st.h <= 0.71) { st.sx *= 0.8; st.sz *= 0.8; st.svx *= 0.5; st.svz *= 0.5; }
    tip.set(st.x, st.top + 0.6, st.z); boom.position.copy(base).add(tip).multiplyScalar(0.5); boom.scale.z = base.distanceTo(tip); boom.lookAt(site.localToWorld(tip.clone()));
    const lx = st.x + st.sx, lz = st.z + st.sz; load.position.set(lx, st.h, lz); hook.position.set(lx, st.h + 1.2, lz); cable.position.set((st.x + lx) / 2, (st.top + st.h + 1.4) / 2, (st.z + lz) / 2); cable.scale.y = st.top - st.h - 1.2; cable.rotation.z = Math.atan2(st.sx, st.top - st.h) * -1; cable.rotation.x = Math.atan2(st.sz, st.top - st.h);
    blob.position.set(lx, 0.03, lz); const bs = 1 - clamp(st.h / 16, 0, 0.6); blob.scale.set(bs, 1, bs);
    audio.setHum(60 + Math.abs(st.vh) * 30 + Math.hypot(st.vx, st.vz) * 12, 0.04);
    acc += dt; if (acc < 0.12) return; acc = 0; const s = env.lmi, g = s.ctx, W = s.w, Hh = s.h; g.fillStyle = '#06090d'; g.fillRect(0, 0, W, Hh);
    const R = Math.hypot(lx - 3, lz + 2), util = 0.5 + R / 34 + (st.wind ? 0.12 : 0);
    g.fillStyle = '#e6edf3'; g.font = `700 26px ${FONT}`; g.textAlign = 'left'; g.fillText(`RADIUS ${R.toFixed(1)} m`, 16, 34); g.fillText(`HOOK HEIGHT ${st.h.toFixed(1)} m`, 16, 68); g.fillStyle = util > 0.95 ? '#ff5252' : util > 0.8 ? '#ffb300' : '#39d353'; g.fillText(`LOAD ${(util * 100).toFixed(0)}% of chart`, 16, 102);
    g.fillStyle = st.wind > 1 ? '#ff5252' : '#8b949e'; g.textAlign = 'right'; g.fillText(`WIND ${Math.round(12 + st.wind * 22)} km/h`, W - 16, 34); g.fillStyle = st.sway() > 1 ? '#ff5252' : '#8b949e'; g.fillText(`SWING ${st.sway().toFixed(1)} m`, W - 16, 68);
    const mx = W / 2, my = 300, k = 11; g.strokeStyle = '#30363d'; g.lineWidth = 2; g.strokeRect(mx - 180, my - 150, 360, 300);
    if (st.noCam) { g.fillStyle = '#ffb300'; g.font = `800 30px ${FONT}`; g.textAlign = 'center'; g.fillText('HOOK CAMERA OFFLINE', mx, my - 30); const dx = st.tgt[0] - lx, dz = st.tgt[1] - lz; g.fillStyle = '#e6edf3'; g.font = `700 30px ${FONT}`; g.fillText(`Signaller: ${Math.abs(dx) < 0.6 ? 'hold' : dx > 0 ? 'RIGHT' : 'LEFT'} ${Math.abs(dx).toFixed(0)} m`, mx, my + 20); g.fillText(`${Math.abs(dz) < 0.6 ? 'hold' : dz < 0 ? 'AWAY' : 'TOWARD'} ${Math.abs(dz).toFixed(0)} m`, mx, my + 60); }
    else if (c.assist < 2 || true) { const P = (x, z) => [mx + (x - 0) * k, my + (z + 18) * k]; g.fillStyle = '#1b5e20'; let p = P(st.tgt[0], st.tgt[1]); g.beginPath(); g.arc(p[0], p[1], 1.9 * k, 0, 7); g.fill(); g.fillStyle = '#ff6f00'; for (const wk of st.workers) { p = P(wk[0], wk[1]); g.beginPath(); g.arc(p[0], p[1], 7, 0, 7); g.fill(); }
      if (st.lineX !== null) { g.strokeStyle = '#ff5252'; g.lineWidth = 4; p = P(st.lineX, -26); const q = P(st.lineX, -8); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); }
      p = P(lx, lz); g.fillStyle = '#e6edf3'; g.fillRect(p[0] - 12, p[1] - 12, 24, 24); p = P(st.x, st.z); g.strokeStyle = '#ffd866'; g.lineWidth = 2; g.beginPath(); g.moveTo(p[0] - 14, p[1]); g.lineTo(p[0] + 14, p[1]); g.moveTo(p[0], p[1] - 14); g.lineTo(p[0], p[1] + 14); g.stroke(); g.fillStyle = '#8b949e'; g.font = `600 18px ${FONT}`; g.textAlign = 'center'; g.fillText('HOOK CAMERA (top-down)', mx, my + 172); }
    s.dirty();
  });
  return st;
}

/* =====================================================================  SHIP  */
const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
export function Ship(c, o = {}) {
  const env = c.env, st = { hdg: o.hdg ?? 0, rot: 0, spd: o.spd ?? 14, rudder: 0, x: 0, y: 0, steerOK: true, nfu: false, nfuCmd: 0, K: o.K || 12, radarOff: false, xte: 0, chan: !!o.chan, lag: 0, q: [] };
  const helm = c.wheel('helm', 'HELM', 0, 0.1, 0.07, { radius: 0.1, tilt: -0.9, maxA: 2.4, spokes: 6, thick: 0.009, color: 0x8d6e63 });
  const tel = c.lever('tel', 'ASTERN < STOP > AHEAD', -0.24, 0, -0.02, { value: o.tel ?? 0.92, len: 0.17, color: 0xffb300 }); st.helm = helm; st.tel = tel; let acc = 0;
  st.cpa = (t) => { const K = 0.514 / 1852, vx = Math.sin((t.hdg * PI) / 180) * t.spd - Math.sin((st.hdg * PI) / 180) * st.spd, vy = Math.cos((t.hdg * PI) / 180) * t.spd - Math.cos((st.hdg * PI) / 180) * st.spd, rx = t.x - st.x, ry = t.y - st.y, v2 = vx * vx + vy * vy; const tc = v2 > 1e-6 ? -(rx * vx + ry * vy) / v2 : 0; void K; return { cpa: Math.hypot(rx + vx * tc, ry + vy * tc), tcpa: tc * 60, range: Math.hypot(rx, ry), brg: wrap180((Math.atan2(rx, ry) * 180) / PI - st.hdg) }; };
  st.bot = (th) => { helm.held = helm; const e = wrap180(th - st.hdg); helm.value = clamp(e * 0.06 - st.rot * 0.25, -1, 1); if (st.nfu || !st.steerOK) st.nfuCmd = clamp(e * 2 - st.rot * 6, -30, 30); };
  c.tick((dt) => {
    if (c.game.over) return; let cmd = st.steerOK ? helm.value * 35 : st.nfu ? st.nfuCmd : st.rudder;
    st.rudder += clamp(cmd - st.rudder, -9 * dt, 9 * dt); const tgt = (tel.value - 0.5) * 2 * 16; st.spd += (tgt - st.spd) * 0.12 * dt;
    st.rot += ((st.rudder / 35) * clamp(st.spd / 12, 0.1, 1.2) * 4.2 - st.rot) * 0.7 * dt; st.hdg = (st.hdg + st.rot * dt + 360) % 360;
    const adv = (st.K * dt) / 3600; st.x += Math.sin((st.hdg * PI) / 180) * st.spd * adv; st.y += Math.cos((st.hdg * PI) / 180) * st.spd * adv;
    if (st.chan) st.xte += Math.sin((wrap180(st.hdg) * PI) / 180) * st.spd * dt * 0.035 + (st.set || 0) * dt;
    for (const t of env.ships) { t.x += Math.sin((t.hdg * PI) / 180) * t.spd * adv; t.y += Math.cos((t.hdg * PI) / 180) * t.spd * adv; const rx = t.x - st.x, ry = t.y - st.y, rng = Math.hypot(rx, ry), b = Math.atan2(rx, ry) - (st.hdg * PI) / 180; const d = rng * 260; t.m.position.set(Math.sin(b) * d, 0, -Math.cos(b) * d); t.m.scale.setScalar(clamp(d / 200, 1, 4.5)); t.m.rotation.y = (-(t.hdg - st.hdg) * PI) / 180; const beta = wrap180((Math.atan2(-rx, -ry) * 180) / PI - t.hdg); t.L.red.visible = beta < 0 && beta > -112.5; t.L.green.visible = beta > 0 && beta < 112.5; t.L.mast.visible = t.L.mast2.visible = Math.abs(beta) < 112.5; t.L.stern.visible = Math.abs(beta) > 112.5; t.m.visible = rng < 6; }
    audio.setHum(38 + Math.abs(st.spd) * 1.6, 0.04);
    acc += dt; if (acc < 0.12) return; acc = 0; let s = env.con, g = s.ctx, W = s.w, Hh = s.h; g.fillStyle = '#04070b'; g.fillRect(0, 0, W, Hh); g.textAlign = 'center';
    const cell = (x, lab, val, col = '#e6edf3') => { g.fillStyle = '#8b949e'; g.font = `600 24px ${FONT}`; g.fillText(lab, x, 46); g.fillStyle = col; g.font = `800 92px ${FONT}`; g.fillText(val, x, 150); };
    cell(150, 'HEADING', String(Math.round(st.hdg) % 360).padStart(3, '0') + '°'); cell(440, 'SPEED kn', st.spd.toFixed(1)); cell(730, 'RATE OF TURN', (st.rot >= 0 ? 'S ' : 'P ') + Math.abs(st.rot * 12).toFixed(0), '#4dd0ff');
    g.fillStyle = '#21262d'; g.fillRect(140, 220, 600, 34); g.fillStyle = st.steerOK || st.nfu ? '#39d353' : '#ff5252'; const rw = (st.rudder / 35) * 300; g.fillRect(440 + Math.min(0, rw), 220, Math.abs(rw), 34); g.fillStyle = '#fff'; g.fillRect(438, 212, 4, 50); g.font = `700 26px ${FONT}`; g.fillStyle = st.steerOK || st.nfu ? '#e6edf3' : '#ff5252'; g.fillText(`RUDDER ${st.rudder < 0 ? 'PORT' : 'STBD'} ${Math.abs(st.rudder).toFixed(0)}°` + (st.steerOK ? '' : st.nfu ? '   NFU' : '   STEERING FAILURE'), 440, 296);
    if (st.chan) { g.fillStyle = '#21262d'; g.fillRect(140, 306, 600, 22); g.fillStyle = Math.abs(st.xte) > 0.6 ? '#ff5252' : '#ffd866'; g.fillRect(440 + clamp(st.xte, -1.2, 1.2) * 250 - 8, 300, 16, 34); g.fillStyle = '#8b949e'; g.font = `600 18px ${FONT}`; g.fillText('BANK          CHANNEL CENTRE          BANK', 440, 324); }
    s.dirty(); s = env.radar; g = s.ctx; W = s.w; Hh = s.h; g.fillStyle = '#020a06'; g.fillRect(0, 0, W, Hh); const cx = W / 2, cy = Hh / 2 + 10, R = 215; g.textAlign = 'center';
    if (st.radarOff) { g.fillStyle = '#ff5252'; g.font = `800 34px ${FONT}`; g.fillText('RADAR: NO SIGNAL', cx, cy); s.dirty(); return; }
    g.strokeStyle = '#0f5132'; g.lineWidth = 2; for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(cx, cy, (R * i) / 3, 0, 7); g.stroke(); } g.beginPath(); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.stroke();
    g.save(); g.translate(cx, cy); g.rotate(E.t * 1.6); const gr = g.createLinearGradient(0, 0, R, 0); gr.addColorStop(0, 'rgba(57,211,83,.5)'); gr.addColorStop(1, 'rgba(57,211,83,0)'); g.strokeStyle = gr; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(R, 0); g.stroke(); g.restore();
    g.fillStyle = '#39d353'; g.font = `600 18px ${FONT}`; g.fillText('HEAD UP  ·  RANGE 3 nm', cx, 22); let yy = Hh - 34;
    for (const t of env.ships) { const a = st.cpa(t); if (a.range > 3.1) continue; const b = (a.brg * PI) / 180, px = cx + Math.sin(b) * (a.range / 3) * R, py = cy - Math.cos(b) * (a.range / 3) * R; const danger = a.cpa < 0.5 && a.tcpa > 0; g.fillStyle = danger ? '#ff5252' : '#ffd866'; g.beginPath(); g.arc(px, py, 7, 0, 7); g.fill(); const rh = ((t.hdg - st.hdg) * PI) / 180; g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.sin(rh) * 30, py - Math.cos(rh) * 30); g.stroke(); g.font = `700 20px ${FONT}`; g.textAlign = 'left'; g.fillText(`${t.id}  RNG ${a.range.toFixed(1)}  CPA ${a.cpa.toFixed(2)} nm  TCPA ${a.tcpa > 0 ? a.tcpa.toFixed(0) + ' min' : 'past'}`, 10, yy); yy -= 24; g.textAlign = 'center'; }
    s.dirty();
  });
  return st;
}
void plane; void metal; void S;
