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
import { THREE, M, metal, glow, glass, box, cyl, sph, cone, plane, grp, clamp, shuffle, rand, makeScreen, FONT, audio, tex } from './core.js';
import { Drive, Fly, Crane, Ship } from './sims.js';
const ok = (t, fb) => ({ t, ok: true, fb }); const no = (t, fb, crit) => ({ t, fb, crit: !!crit }); const PI = Math.PI;
const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;

/* ================================ DOCTOR ================================ */
const anaphylaxis = {
  id: 'ana', title: 'Anaphylaxis in the Clinic', kind: 'REGULAR', brief: 'Wasp sting 5 minutes ago. Hives, wheeze, swelling lips, BP 82/50.',
  meter: { label: 'Airway swelling', rate: 0.007, err: 0.05, fail: 'The airway closed.' },
  debrief: ['Adrenaline into the outer thigh muscle is the first and only first-line drug.', 'Lay a shocked patient flat with legs raised. Never stand them up.', 'No better after 5 minutes: repeat the dose. Then observe for hours.'],
  build(c) {
    Object.assign(c.env.v, { hr: 128, bp: '82/50', spo2: 89, rr: 30, msg: 'STRIDOR - HIVES' });
    c.btn('help', 'CALL HELP', -0.16, 0.012, 0.145, { color: 0xb3261e }); c.lever('o2flow', 'O2 FLOW', -0.03, 0, 0.145, { dir: [1, 0, 0], len: 0.09, value: 0.05, color: 0x1e88e5 });
    c.tool('epi', 'Adrenaline pen', 'injector', 0.12, 0.02, 0.145, { color: 0xffb300 }); c.tool('o2', 'Oxygen mask', 'mask', 0.21, 0.03, 0.145, { color: 0x80cbc4 }); c.tool('anti', 'Antihistamine', 'box', 0.3, 0.02, 0.145, { color: 0x7e57c2 });
    c.tool('amp', 'Adrenaline 1 mg/mL', 'bottle', 0.39, 0.02, 0.145, { color: 0xffcc80, mat: true }); c.tool('syr', 'Syringe', 'syringe', 0.48, 0.02, 0.145, { color: 0xeceff1, mat: true });
    c.zone('zThigh', 0.42, 0.1, 0.02, 0.045); c.zone('zFace', -0.47, 0.19, -0.06, 0.06);
  },
  steps(c) {
    const v = c.env.v;
    return [
      { t: 'decide', q: 'Hives, wheeze, lips swelling, BP 82/50. First drug?', hint: 'Think: what reverses airway swelling AND shock within minutes?', why: 'IM adrenaline is first line. Antihistamines and steroids do not treat the airway or the shock.', opts: [ok('Adrenaline, into the outer thigh muscle'), no('Antihistamine tablet and watch', 'Antihistamines do not treat airway swelling or shock.'), no('Steroid injection', 'Too slow to matter in the first minutes.'), no('Adrenaline as a fast IV push', 'IV bolus adrenaline outside cardiac arrest can kill. IM is first line.')] },
      { key: 'epi', t: 'hold', tool: 'epi', zone: 'zThigh', secs: 3, say: 'Inject into the outer mid-thigh. Hold 3 seconds.', hint: 'Pinch the adrenaline pen, press its tip on the marked spot on the thigh and keep it steady.', calm: 0.004, onDone: () => { v.hr = 118; v.bp = '96/58'; } },
      { t: 'press', btn: 'help', say: 'Call for help.', hint: 'Press CALL HELP.' },
      { key: 'o2', t: 'place', tool: 'o2', zone: 'zFace', say: 'High-flow oxygen on the patient.', hint: 'Bring the oxygen mask to the face.' },
      { t: 'set', ctl: 'o2flow', range: [0.66, 1], say: 'Oxygen to 10-15 L/min.', hint: 'Slide O2 FLOW to the right end.', onDone: () => { v.spo2 = 93; } },
      { t: 'decide', q: 'Patient sits up, says they feel faint. BP still low.', why: 'Standing or sitting a shocked anaphylaxis patient upright can cause cardiac arrest.', opts: [ok('Lay them flat and raise the legs'), no('Walk them to the resus room', 'They collapsed on standing.', true), no('Keep them sitting, sips of water', 'Upright posture drops the blood pressure further.')] },
      { t: 'wait', secs: 2.2, say: 'Five minutes later: wheeze and low BP persist.', onEnter: () => { v.msg = 'NO IMPROVEMENT'; } },
      { t: 'decide', q: 'No improvement 5 minutes after the first dose.', opts: [ok('Repeat the intramuscular adrenaline'), no('Wait 30 minutes', 'Delay is what kills in anaphylaxis.'), no('Switch to antihistamine', 'Not a treatment for shock.')] },
      { t: 'hold', tool: ['epi', 'drawn'], zone: 'zThigh', secs: 3, say: 'Second dose. Same site.', calm: 0, onDone: () => { v.hr = 102; v.bp = '112/70'; v.spo2 = 96; v.msg = 'IMPROVING'; } },
      { t: 'decide', q: 'Symptoms have settled. What now?', opts: [ok('Observe for several hours: reactions can return'), no('Discharge now', 'Biphasic reactions happen hours later.')] },
    ];
  },
  limited: { note: 'The adrenaline pen is empty. There is an ampoule and a syringe.', remove: ['epi'], swap: { epi: (c) => [
    { t: 'craft', a: 'syr', b: 'amp', makes: { id: 'drawn', label: 'Drawn-up adrenaline', kind: 'syringe', color: 0xff7043 }, say: 'No pen. Make a dose from what is on the tray.', hint: 'Bring the syringe to the adrenaline ampoule to draw it up.' },
    { t: 'decide', q: 'Adult IM dose from a 1 mg/mL ampoule?', opts: [ok('0.5 mL (0.5 mg)'), no('5 mL (5 mg)', 'Ten-fold overdose.', true), no('0.05 mL', 'Ten times too little.'), no('The whole ampoule, IV', 'IV bolus is not first line.')] },
    { t: 'hold', tool: 'drawn', zone: 'zThigh', secs: 3, say: 'Inject into the outer mid-thigh.', calm: 0.004, onDone: () => { c.env.v.hr = 118; c.env.v.bp = '96/58'; } }] } },
  twists: [{ after: 'o2', steps: () => [{ t: 'wait', secs: 2, say: 'The oxygen cylinder gauge reads EMPTY.' }, { t: 'decide', q: 'No oxygen in the room.', opts: [ok('Carry on: adrenaline is the treatment. Send someone for a cylinder'), no('Stop and go to find oxygen yourself', 'You left an unstable patient.'), no('Give two antihistamines instead', 'Not a substitute.')] }] }],
};
const codeBlue = {
  id: 'code', title: 'Code Blue: Cardiac Arrest', kind: 'EXTREME', brief: 'Collapsed, no pulse, not breathing. You are first at the bedside.',
  meter: { label: 'Brain without oxygen', rate: 0.006, err: 0.05, fail: 'Too long without circulation.' },
  debrief: ['Compressions are the treatment. Everything else fits around them.', 'Shockable rhythm: shock first. Adrenaline comes after, never instead.', 'Say CLEAR and look, every time.'],
  build(c) {
    Object.assign(c.env.v, { rhythm: 'vf', spo2: 70, bp: '--/--', rr: 0, msg: 'NO PULSE' });
    c.btn('analyze', 'ANALYZE', -0.17, 0.012, 0.145, { color: 0x1f6feb }); c.btn('charge', 'CHARGE', -0.085, 0.012, 0.145, { color: 0xb08800 }); c.btn('shock', 'SHOCK', 0, 0.012, 0.145, { color: 0xb3261e });
    c.tool('pad1', 'Defib pad', 'pad', 0.11, 0.02, 0.145, { color: 0xffb300 }); c.tool('pad2', 'Defib pad', 'pad', 0.2, 0.02, 0.145, { color: 0xffb300 }); c.tool('epi', 'Adrenaline 1 mg', 'syringe', 0.29, 0.02, 0.145, { color: 0xff7043 }); c.tool('io', 'IO needle', 'needle', 0.38, 0.02, 0.145, { color: 0xec407a }); c.tool('bvm', 'Bag-valve mask', 'mask', 0.47, 0.03, 0.145, { color: 0x90caf9 });
    c.zone('zChest', -0.2, 0.128, -0.06, 0.06); c.zone('zPadA', -0.27, 0.125, 0.0, 0.04); c.zone('zPadB', -0.12, 0.115, -0.13, 0.04); c.zone('zIV', 0.0, 0.07, 0.08, 0.04); c.zone('zShin', 0.5, 0.1, 0.0, 0.045);
  },
  steps(c) {
    const v = c.env.v; const cpr = (n) => ({ t: 'rhythm', zone: 'zChest', bpm: [100, 120], count: n, relief: 0.07, say: 'Chest compressions: 100 to 120 a minute.', hint: 'Push down on the centre of the chest in time with the click.' });
    return [
      { t: 'press', btn: 'analyze', say: 'Confirm the rhythm.', hint: 'Press ANALYZE on the defibrillator.', onDone: () => { v.msg = 'SHOCKABLE: V-FIB'; } },
      { t: 'decide', q: 'Ventricular fibrillation, no pulse. First priority?', why: 'Compressions and defibrillation come before any drug.', opts: [ok('Start compressions and get the pads on'), no('Give adrenaline first', 'Drugs come after the first shocks.'), no('Wait for a 12-lead ECG', 'Every minute without compressions costs brain.'), no('Check the blood pressure', 'There is no pulse to measure.')] },
      cpr(14),
      { t: 'place', tool: ['pad1', 'pad2'], zone: 'zPadA', say: 'Pad below the right collarbone.' }, { t: 'place', tool: ['pad1', 'pad2'], zone: 'zPadB', say: 'Second pad on the left side, below the armpit.' },
      { t: 'press', btn: 'charge', say: 'Charge.' },
      { t: 'decide', q: 'Charged. A nurse is still holding the IV arm.', opts: [ok('Call CLEAR, look, then shock'), no('Shock now, every second counts', 'You shocked a team member.', true), no('Wait for the rhythm to change', 'It will not change on its own.')] },
      { key: 'shock', t: 'press', btn: 'shock', say: 'Shock.', onDone: () => c.flash('Shock delivered.', false) },
      cpr(14),
      { key: 'epi', t: 'place', tool: 'epi', zone: 'zIV', say: 'Adrenaline 1 mg into the IV.', hint: 'Bring the adrenaline syringe to the IV port on the near arm.' },
      { t: 'press', btn: 'analyze', say: 'Two minutes up: re-check the rhythm.', onDone: () => { Object.assign(v, { rhythm: 'sinus', hr: 96, bp: '98/60', spo2: 93, rr: 10, msg: 'PULSE BACK' }); }, calm: 0 },
      { t: 'decide', q: 'Pulse is back. Now?', opts: [ok('Support breathing and pressure, 12-lead ECG, plan transfer'), no('Shock again to be safe', 'Never shock an organised rhythm with a pulse.', true), no('Stop monitoring, job done', 'Re-arrest is common in the first minutes.')] },
    ];
  },
  limited: { note: 'The IV line has blown. No vein access.', swap: { epi: () => [{ t: 'decide', q: 'No IV. Fastest route for the drug?', opts: [ok('Intraosseous needle below the knee'), no('Stop compressions and keep trying veins', 'Compressions stopped for a cannula.'), no('Skip the drug', 'It is part of the algorithm.')] }, { t: 'place', tool: 'io', zone: 'zShin', say: 'Drill the IO needle in below the knee.' }, { t: 'place', tool: 'epi', zone: 'zShin', say: 'Adrenaline through the IO line.' }] } },
  twists: [{ after: 'shock', steps: (c) => [{ t: 'wait', secs: 1.6, say: 'The defibrillator screen goes blank.', onEnter: () => { c.env.v.on = false; } }, { t: 'decide', q: 'Monitor and defib died mid-code.', opts: [ok('Keep compressions going, send for another defib'), no('Stop compressions and fix the machine', 'No flow while you troubleshoot.'), no('Call it', 'A machine fault is not a reason to stop.', true)] }, { t: 'rhythm', zone: 'zChest', bpm: [100, 120], count: 10, say: 'Keep compressing while the new defib comes.', onDone: () => { c.env.v.on = true; } }] }],
};

/* ================================ SURGEON ================================ */
const bleeder = {
  id: 'bleed', title: 'Bleeder!', kind: 'EXTREME', brief: 'Open abdomen. A small artery lets go. Blood pressure is falling.',
  meter: { label: 'Blood loss', rate: 0.014, err: 0.05, fail: 'The patient bled out.' },
  debrief: ['Pressure first, tell the anaesthetist, then see before you clamp.', 'Never clamp blind into a pool of blood.', 'Missing instrument: point pressure with anything that reaches.'],
  build(c) {
    const Y = c.env.fieldY; Object.assign(c.env.v, { hr: 124, bp: '86/50', spo2: 96 });
    const pool = cyl(c.stage, 0.012, 0.012, 0.002, M(0x8e0000, { r: 0.15 }), 0.04, Y, -0.05, 24); pool.castShadow = false; c.tick(() => { const k = 1 + c.game.meter * 6; pool.scale.set(k, 1, k); });
    box(c.stage, 0.2, 0.002, 0.008, M(0x7a1010, { r: 0.4 }), 0, Y, -0.04).castShadow = false;
    c.btn('call', 'CALL FOR BLOOD', -0.14, 0.012, 0.15, { color: 0xb3261e, size: [0.09, 0.05] });
    c.tool('clamp', 'Artery clamp', 'clamp', 0.1, 0.03, 0.15); c.tool('forceps', 'Forceps', 'forceps', 0.19, 0.03, 0.15, { mat: true }); c.tool('driver', 'Needle driver', 'driver', 0.28, 0.03, 0.15); c.tool('gauze', 'Gauze swab', 'gauze', 0.37, 0.03, 0.15, { mat: true }); c.tool('suction', 'Suction', 'suction', 0.46, 0.03, 0.15);
    c.zone('zBleed', 0.04, Y + 0.002, -0.05, 0.024);
  },
  steps(c) {
    const Y = c.env.fieldY + 0.002, v = c.env.v;
    return [
      { t: 'decide', q: 'Arterial bleed in the wound. BP falling. First move?', why: 'Direct pressure buys time and lets the anaesthetist catch up.', opts: [ok('Direct pressure on the bleeding point, tell anaesthesia'), no('Clamp into the pool', 'Blind clamping injures what you cannot see.'), no('Keep operating, deal with it later', 'It did not wait.', true), no('Ask for more light and wait', 'Waiting is bleeding.')] },
      { t: 'hold', tool: 'gauze', zone: 'zBleed', secs: 2.5, say: 'Pressure with a swab. Hold it still.', hint: 'Pinch the gauze, press it on the bleeding point.', calm: 0.005 },
      { t: 'press', btn: 'call', say: 'Tell the team: call for blood.' },
      { t: 'hold', tool: 'suction', zone: 'zBleed', secs: 2, say: 'Suction so you can see the vessel.' },
      { key: 'clamp', t: 'hold', tool: 'clamp', zone: 'zBleed', secs: 3, say: 'Clamp the vessel. Tips only. Do not move.', hint: 'Bring the artery clamp exactly onto the bleeding point and hold steady.', calm: 0, onDone: () => { v.bp = '94/58'; } },
      { t: 'points', tool: 'driver', tol: 0.014, pts: [[0.028, -0.062], [0.052, -0.062], [0.052, -0.038], [0.028, -0.038]].map((p) => ({ p: [p[0], Y, p[1]] })), say: 'Tie it off: four bites around the vessel, in order.', onDone: () => { v.hr = 104; v.bp = '108/66'; } },
      { t: 'decide', q: 'Bleeding controlled. Before you carry on?', opts: [ok('Count swabs, review blood loss, look for a second bleeder'), no('Close immediately', 'You never checked for a second source.'), no('Take the clamp off to test it', 'It bled again.')] },
    ];
  },
  limited: { note: 'No artery clamps on the tray. The set came up incomplete.', remove: ['clamp'], swap: { clamp: () => [
    { t: 'craft', a: 'forceps', b: 'gauze', makes: { id: 'peanut', label: 'Swab on a stick', kind: 'stick', color: 0xfafafa }, say: 'No clamp. Build something that gives point pressure.', hint: 'Wrap the gauze onto the forceps.' },
    { t: 'hold', tool: 'peanut', zone: 'zBleed', secs: 3.5, say: 'Point pressure exactly on the vessel.', calm: 0 }] } },
  twists: [{ after: 'clamp', steps: (c) => [{ t: 'wait', secs: 1.8, say: 'Theatre lights go out. Emergency lighting only.', onEnter: () => c.env.lights(0.1) }, { t: 'decide', q: 'Power failure with your hand on the vessel.', opts: [ok('Do not let go. Ask for a headlight or phone torches'), no('Release and step back until power returns', 'It bled the moment you let go.', true), no('Carry on suturing by feel', 'Needle into the wrong structure.')] }, { t: 'wait', secs: 1.5, say: 'Headlight on.', onEnter: () => c.env.lights(0.65) }] }],
};

/* ================================ DRIVER ================================ */
const brakeFade = {
  id: 'fade', title: 'Brake Fade on the Descent', kind: 'EXTREME', env: { weather: 'day' }, brief: '38 tonnes. 6% downgrade for 8 km. Speed is creeping up.',
  debrief: ['Gear and engine brake hold the speed. Service brakes only trim it.', 'Brake firmly, release fully, let the drums cool.', 'Brakes gone: commit to the escape ramp early.'],
  build(c) {
    const st = (c.sim = Drive(c, { v: 22, grade: 0.06 })), rw = c.env.road.rw; const bed = plane(rw, 2.6, 1400, M(0xffffff, { map: tex.noise('#c8a96a', [2, 300], 0.3), r: 1 }), -3.4, c.env.road.y0 + 0.02, -400); bed.rotation.x = -PI / 2;
    c.btn('retard', 'ENGINE BRAKE', 0.43, 0.012, 0.16, { color: 0x1b5e20, size: [0.085, 0.05] }); c.btn('low', 'LOW GEAR', 0.43, 0.012, 0.09, { color: 0x1b5e20, size: [0.085, 0.05] }); c.btn('haz', 'HAZARDS', 0.43, 0.012, 0.02, { color: 0xb08800, size: [0.085, 0.05] }); c.btn('horn', 'HORN', 0.52, 0.012, 0.16, { color: 0x30363d, size: [0.07, 0.05], free: true });
    void st;
  },
  steps(c) {
    const st = c.sim; let d0 = 0;
    return [
      { t: 'decide', q: 'How do you hold speed down a long 6% grade?', why: 'Constant light braking overheats the drums until they fade to nothing.', opts: [ok('Low gear and engine brake first; firm, short brake applications'), no('Ride the brake lightly all the way down', 'Constant light braking cooks the drums.'), no('Neutral to save fuel', 'No engine braking at all.', true), no('Pump the pedal rapidly', 'That drains the air and heats the drums.')] },
      { key: 'eng', t: 'pressAny', btns: ['retard', 'low'], say: 'Engine brake ON. Drop to low gear.', onDone: () => { st.retard = true; st.low = true; } },
      { key: 'hold', t: 'sim', dur: 14, ctls: ['pedal', 'steer'], say: 'Hold 30-55 km/h in your lane. Brake firmly, then release to cool.', hint: 'Right lever: pull back to brake, push to accelerate. Turn the wheel to steer.',
        test: () => { const k = st.v * 3.6; if (st.temp >= 1) return { fail: 'Brakes cooked: total fade.' }; if (Math.abs(st.x) > 2.7) return { fail: 'Left the road.' }; return { err: (k < 28 || k > 56 ? 1.2 : 0) + (Math.abs(st.x) > 1.3 ? 1 : 0), msg: `${Math.round(k)} km/h   brakes ${Math.round(st.temp * 100)}%` }; }, bot: () => st.bot(0, 11) },
      { t: 'wait', secs: 1.6, say: 'BANG. Air line gone. The pedal goes to the floor.', onEnter: () => { st.noBrakes = true; st.retard = false; st.low = false; st.warn = 'BRAKE FAILURE'; audio.bad(); } },
      { t: 'decide', q: 'No brakes. 50 km/h and rising. Gravel escape ramp on your left.', time: 9, opts: [ok('Take the escape ramp. Horn and hazards on'), no('Stay on the road and hope it levels out', 'It did not level out.', true), no('Jump out', 'A 38-tonne truck with no driver.', true), no('Scrape the guard rail to slow down', 'Last resort only: the ramp is right there.')] },
      { key: 'haz', t: 'press', btn: 'haz', say: 'Hazards on.', onDone: () => { st.hazard = true; } },
      { t: 'sim', ctls: ['steer'], say: 'Steer left into the gravel bed and hold it straight until you stop.', start: () => { d0 = st.dist; },
        test: () => { const inBed = st.x < -2.2 && st.x > -4.7; st.grade = inBed ? -0.4 : 0.06; if (st.x < -5.3 || st.x > 6.3) return { fail: 'Left the road.' }; if (st.dist - d0 > 650) return { fail: 'Missed the escape ramp.' }; return { err: inBed ? 0 : 1.2, done: inBed && st.v < 1.2, msg: `${Math.round(st.v * 3.6)} km/h` }; }, bot: () => st.bot(-3.4, 30) },
      { t: 'decide', q: 'Stopped in the gravel. Now?', opts: [ok('Engine off, hazards on, warning triangles, call it in. Do not drive out'), no('Reverse out and continue', 'There are still no brakes.', true), no('Leave the truck and hitch a ride', 'Unmarked hazard on a mountain road.')] },
    ];
  },
  limited: { note: 'The engine brake is dead: blown fuse.', remove: ['retard'], swap: { eng: (c) => [{ t: 'press', btn: 'low', say: 'No engine brake. Lowest gear you can get.', onDone: () => { c.sim.low = true; } }, { t: 'decide', q: 'No retarder. How do you use the service brakes?', opts: [ok('Snub: brake hard down to 30, release, let it climb to 45, repeat'), no('Light constant pressure', 'That is how drums fade.'), no('Stay off the brakes entirely', 'Speed ran away.')] }] } },
  twists: [{ after: 'haz', steps: () => [{ t: 'decide', q: 'A car is stopped on the shoulder right before the ramp entry.', time: 7, opts: [ok('Long horn, hold your line past it, then cut into the ramp'), no('Swerve right into the fast lane', 'No brakes and now no ramp.', true), no('Aim between the car and the barrier', 'There was no room.', true)] }] }],
};

/* ================================ PILOT ================================ */
const engineFire = {
  id: 'v1', title: 'Engine Fire After V1', kind: 'EXTREME', brief: 'Takeoff roll, heavy aircraft. V1 has just been called.',
  debrief: ['After V1 you go. Fly first: pitch, wings level.', 'Identify, confirm, then act: the wrong lever kills the good engine.', 'Memory items in order: thrust idle, fuel cutoff, fire handle.'],
  build(c) {
    const st = (c.sim = Fly(c, { ground: true, ias: 150, thr: 1, pitch: 0 })); st.k = Math.random() < 0.5 ? 0 : 1; st.apPitch = 13;
    for (let i = 0; i < 2; i++) { const x = i ? 0.075 : -0.075; c.btn('fuel' + (i + 1), `ENG ${i + 1} FUEL CUTOFF`, x, 0.012, 0.04, { color: 0x30363d, size: [0.085, 0.05] }); c.btn('fire' + (i + 1), `ENG ${i + 1} FIRE HANDLE`, x, 0.012, 0.11, { color: 0x7f1d1d, size: [0.085, 0.05] }); }
    c.btn('atc', 'MAYDAY', 0.5, 0.012, 0.17, { color: 0xb3261e, size: [0.07, 0.045] }); c.btn('xpdr', 'SQUAWK 7700', 0.5, 0.012, 0.11, { color: 0x30363d, size: [0.07, 0.045] });
  },
  steps(c) {
    const st = c.sim, k = st.k, n = k + 1, o = 2 - k, wrong = 'You shut down the GOOD engine. No thrust left.';
    return [
      { t: 'wait', secs: 2, say: 'Takeoff thrust set. V1.', onDone: () => { st.fire[k] = true; st.eng[k] = 0; st.msgs = [`!ENG ${n} FIRE`]; c.by('fire' + n).setLit(true); st.fd = 13; } },
      { t: 'decide', q: 'FIRE BELL just after V1.', time: 8, why: 'Past V1 there is not enough runway left to stop.', opts: [ok('Continue the takeoff. Rotate and fly the aircraft'), no('Reject: full brakes', 'Overran the runway at 120 knots.', true), no('Shut the engine down on the runway now', 'Fly first. Drills come at a safe height.'), no('Both thrust levers to idle', 'Too fast to stop, too slow to fly.', true)] },
      { key: 'rot', t: 'sim', dur: 10, ctls: ['stick'], say: 'Rotate. Hold 10-16 degrees pitch, wings level.', hint: 'Right hand: pull the sidestick back to raise the nose; push it sideways against the roll toward the dead engine.', start: () => { st.live = true; },
        test: () => ({ err: st.pitch < 9 || st.pitch > 17 || Math.abs(st.roll) > 10 ? 1.2 : 0, msg: `PITCH ${st.pitch.toFixed(0)}  ROLL ${st.roll.toFixed(0)}` }) },
      { key: 'ident', t: 'set', ctl: 'thr' + n, range: [0, 0.15], traps: { ['thr' + o]: wrong }, say: 'Fire drill: affected thrust lever to IDLE. Keep flying.', hint: `Engine ${n} is burning. Pull ONLY thrust lever ${n} back.`, why: 'Identify from the engine display and fire light before you touch a lever.' },
      { t: 'press', btn: 'fuel' + n, traps: { ['fuel' + o]: wrong, ['fire' + o]: wrong }, say: 'Fuel control switch: CUTOFF.' },
      { key: 'fire', t: 'press', btn: 'fire' + n, traps: { ['fuel' + o]: wrong, ['fire' + o]: wrong }, say: 'Fire handle: pull and discharge.', onDone: () => { st.fire[k] = false; st.msgs = [`ENG ${n} SHUT DOWN`]; c.by('fire' + n).setLit(false); } },
      { t: 'pressAny', btns: ['atc', 'xpdr'], say: 'MAYDAY call. Squawk 7700.' },
      { t: 'decide', q: 'Fire light is out. One engine. 1,500 ft.', opts: [ok('Return to land: single-engine pattern, run the checklist'), no('Continue to destination, 2 hours away', 'One engine and a fire history.'), no('Restart the engine to check it', 'You relit a fire-damaged engine.', true)] },
    ];
  },
  limited: { note: 'The engine display has failed. No engine page.', apply: (c) => { c.sim.noEic = true; }, swap: { ident: (c) => { const n = c.sim.k + 1, o = 2 - c.sim.k; return [{ t: 'decide', q: 'No engine display. How do you identify the burning engine?', opts: [ok('The lit fire handle, and the aircraft rolls toward the dead engine'), no('Guess: it is 50/50', 'Wrong engine.', true), no('Shut both down', 'Glider at 400 ft.', true)] }, { t: 'set', ctl: 'thr' + n, range: [0, 0.15], traps: { ['thr' + o]: 'You shut down the GOOD engine. No thrust left.' }, say: 'Affected thrust lever to IDLE.' }]; } } },
  twists: [{ after: 'fire', steps: (c) => { const st = c.sim, n = st.k + 1; return [{ t: 'wait', secs: 2, say: 'The fire warning comes back on.', onEnter: () => { st.fire[st.k] = true; st.msgs = [`!ENG ${n} FIRE`]; c.by('fire' + n).setLit(true); } }, { t: 'decide', q: 'Fire light still on after the first bottle.', opts: [ok('Wait 30 seconds, fire the second bottle, land at the nearest airport'), no('Ignore it, it is probably a sensor', 'It was not a sensor.'), no('Dive to blow it out', 'Not a procedure. You lost height you needed.')] }, { t: 'press', btn: 'fire' + n, say: 'Second bottle.', onDone: () => { st.fire[st.k] = false; st.msgs = [`ENG ${n} SHUT DOWN`]; } }]; } }],
};

/* ================================ MACHINE OPERATOR ================================ */
const blindLift = {
  id: 'lift', title: 'Crane: Lift Over the Crew', kind: 'REGULAR', brief: 'A 4-tonne panel to the green pad. Two workers stand on the direct path.',
  debrief: ['Never carry a load over people. Height or a route around.', 'Smooth joystick inputs: every jerk becomes swing.', 'Land slowly. Wait for the rigger before you move again.'],
  build(c) { c.sim = Crane(c, { x: -6, z: -13, h: 0.7, tgt: [5, -19], workers: [[0, -16], [1.5, -15]] }); c.btn('horn', 'HORN', 0.44, 0.012, 0.17, { color: 0xb08800 }); c.btn('estop', 'E-STOP', 0.44, 0.012, 0.1, { color: 0xb3261e }); },
  steps(c) {
    const st = c.sim; let t = 0;
    return [
      { t: 'decide', q: 'Chart: 5.0 t at 18 m, 3.6 t at 22 m. Load 4.2 t. Landing spot is at 21 m.', why: 'Capacity falls with radius. Check the chart at the landing radius, not the pick-up.', opts: [ok('Not as planned: reposition so the landing radius is 18 m or less'), no('Lift: it is fine at pick-up', 'Overturned at the landing radius.', true), no('Lift and override the limiter if it trips', 'Overriding the limiter tipped the crane.', true)] },
      { t: 'wait', secs: 1.5, say: 'Crane repositioned. Lift is within the chart.' },
      { key: 'horn', t: 'press', btn: 'horn', say: 'Sound the horn: lift starting.' },
      { t: 'sim', ctls: ['jr'], say: 'Hoist to 4-7 m and let the load settle.', hint: 'Right stick: push forward to raise, pull back to lower.', test: (dt) => { const good = st.h > 3.6 && st.h < 7.5 && st.sway() < 0.5; t = good ? t + dt : 0; return { err: 0, done: t > 1, msg: `HEIGHT ${st.h.toFixed(1)} m` }; }, bot: () => st.bot(st.x, st.z, 5) },
      { key: 'travel', t: 'sim', ctls: ['jl'], say: 'Travel to the green pad. Stay clear of the two workers.', hint: 'Left stick moves the hook: left/right and away/toward. Watch the shadow under the load.', test: () => { if (st.nearWorker() < 1.7 && st.h < 3.2) return { fail: 'The load struck a worker.' }; return { err: st.sway() > 1.1 || st.nearWorker() < 2.2 ? 1.2 : 0, done: st.dist() < 1.4 && st.sway() < 0.9, msg: `TO PAD ${st.dist().toFixed(1)} m   SWING ${st.sway().toFixed(1)}` }; }, bot: () => st.bot(st.tgt[0], st.tgt[1], 5.5) },
      { t: 'sim', ctls: ['jr'], say: 'Lower gently onto the pad.', test: () => { if (st.h < 1.1 && st.vh < -1.25) return { fail: 'Dropped the load.' }; if (st.h <= 0.75 && st.dist() > 2.3) return { fail: 'Landed off the pad.' }; return { err: st.dist() > 1.4 ? 1.2 : 0, done: st.h <= 0.75, q: clamp(1.25 - st.dist() / 1.8), msg: `HEIGHT ${st.h.toFixed(1)} m   OFFSET ${st.dist().toFixed(1)} m` }; }, bot: () => st.bot(st.tgt[0], st.tgt[1], 0.4) },
      { t: 'decide', q: 'Load is down. Riggers walk in.', opts: [ok('Slack the hoist slightly and wait for the rigger\'s signal'), no('Swing away immediately', 'The slings were still attached.', true), no('Climb down to help unhook', 'Never leave the controls with a load on the hook.')] },
    ];
  },
  limited: { note: 'The hook camera is dead. Radio signaller only.', apply: (c) => { c.sim.noCam = true; } },
  twists: [{ after: 'travel', steps: (c) => [{ t: 'wait', secs: 1.6, say: 'Wind alarm: gusting over the limit.', onEnter: () => { c.sim.wind = 1.3; } }, { t: 'decide', q: 'Gusts over the limit with the load in the air.', opts: [ok('Land the load at the nearest safe spot and stop lifting'), no('Hurry and finish the job', 'The swing took the load into the scaffold.'), no('Hold it high and wait it out', 'A sail on a string above the site.')] }] }],
};

/* ================================ MECHANIC ================================ */
const B = [[-0.135, -0.16], [-0.045, -0.16], [0.045, -0.16], [0.135, -0.16], [-0.135, -0.08], [-0.045, -0.08], [0.045, -0.08], [0.135, -0.08]]; const ORDER = [2, 5, 1, 6, 3, 4, 0, 7];
const torque = {
  id: 'head', title: 'Cylinder Head: Torque Sequence', kind: 'REGULAR', brief: 'New head gasket is on. Eight head bolts to tighten correctly.',
  debrief: ['Centre outward, criss-cross, in stages: the head seats flat.', 'Stop at the click. Past it you are stretching the bolt.', 'A bolt that never clicks is telling you something. Take it out.'],
  build(c) {
    const g = c.stage; box(g, 0.42, 0.11, 0.24, M(0x50565e, { r: 0.5, m: 0.7 }), 0, 0.055, -0.12); box(g, 0.4, 0.02, 0.2, M(0x9aa3ab, { r: 0.35, m: 0.9 }), 0, 0.12, -0.12);
    for (let i = 0; i < 4; i++) cyl(g, 0.012, 0.012, 0.03, M(0xeceff1), -0.135 + i * 0.09, 0.14, -0.12, 10);
    B.forEach((p, i) => { cyl(g, 0.011, 0.011, 0.012, metal(0x30363d, 0.35), p[0], 0.136, p[1], 6); c.zone('zB' + i, p[0], 0.144, p[1], 0.02); });
    c.tool('torque', 'Torque wrench', 'torque', 0.0, 0.03, 0.14); c.tool('wrench', 'Spanner', 'wrench', 0.12, 0.03, 0.14); c.tool('bar', 'Breaker bar', 'stick', 0.24, 0.03, 0.14, { color: 0x455a64 }); c.tool('rag', 'Rag', 'cloth', 0.36, 0.02, 0.14, { color: 0xc62828 });
  },
  steps() {
    const fill = (k, i) => ({ key: 'f' + k, t: 'fill', tool: 'torque', zone: 'zB' + i, rate: 0.42, band: [0.76, 0.9], unit: 'TORQUE', blind: true, overMsg: 'Over-torqued: bolt stretched.', say: `Final torque, bolt ${k + 1} of the sequence. Stop at the click.`, hint: 'Hold the wrench on the bolt until the gauge reaches the green band, then lift off.' });
    return [
      { t: 'decide', q: 'How do you tighten the eight head bolts?', why: 'End-to-end tightening bows the head and the gasket leaks.', opts: [ok('Centre outward, criss-cross, in stages, to the specified torque'), no('One end to the other, full torque each', 'Warped head. Gasket failed in a week.'), no('As tight as possible with a breaker bar', 'Stretched bolts, cracked head.'), no('Outside bolts first', 'Trapped the bow in the middle.')] },
      { key: 'snug', t: 'points', tool: 'torque', strict: true, tol: 0.022, dwell: 0.22, pts: ORDER.map((i) => ({ p: [B[i][0], 0.144, B[i][1]] })), orderMsg: 'Out of sequence: the head will not seat flat.', say: 'Stage 1: snug all eight in sequence, from the centre out.', hint: 'Touch the wrench to each numbered bolt in order.' },
      fill(0, ORDER[0]), fill(1, ORDER[1]), fill(2, ORDER[2]),
      { t: 'decide', q: 'Bolt 3 felt spongy and never clicked.', opts: [ok('Stop. Remove and inspect it: stretched bolt or stripped thread'), no('Give it extra turns until it feels tight', 'It snapped flush with the block.'), no('Leave it, seven is enough', 'Gasket blew between cylinders.')] },
    ];
  },
  limited: { note: 'The torque wrench is out for calibration.', remove: ['torque'], swap: Object.assign({ snug: () => [{ t: 'decide', q: 'No torque wrench. Is the job still on?', opts: [ok('Yes, by the manual\'s torque-angle method: snug, then a measured angle'), no('Yes: tighten by feel', 'Feel is off by 30% on a good day.'), no('Use the breaker bar and lean on it', 'Stretched bolts.')] }, { t: 'points', tool: 'wrench', strict: true, tol: 0.022, dwell: 0.22, pts: ORDER.map((i) => ({ p: [B[i][0], 0.144, B[i][1]] })), orderMsg: 'Out of sequence.', say: 'Snug all eight in sequence with the spanner.' }] }, ...[0, 1, 2].map((k) => ({ ['f' + k]: () => [{ t: 'fill', tool: 'wrench', zone: 'zB' + ORDER[k], rate: 0.36, band: [0.44, 0.56], unit: 'ANGLE', overMsg: 'Too far: past the angle.', say: `Bolt ${k + 1}: turn 90 degrees past snug. No more.` }] }))) },
  twists: [{ after: 'snug', steps: () => [{ t: 'wait', secs: 1.8, say: 'You spot a rag fibre under the head, on the gasket face.' }, { t: 'decide', q: 'Debris on the gasket face, head already snugged.', opts: [ok('Back the bolts off in reverse order, lift, clean, start again'), no('It will crush flat', 'It became the leak path.'), no('Run sealant around the edge', 'Sealant is not a gasket.')] }] }],
};

/* ================================ FISHING ================================ */
const mob = {
  id: 'mob', title: 'Man Overboard', kind: 'EXTREME', env: { sea: 'storm' }, brief: 'Hauling in a rising sea. A shout from aft.',
  meter: { label: 'Time in 9°C water', rate: 0.006, err: 0.05, fail: 'You lost him.' },
  debrief: ['Mark, throw, point: in the first five seconds.', 'Turn toward the side he fell: the stern and propeller swing away.', 'Engine in neutral before he is anywhere near the stern.'],
  build(c) {
    const g = c.stage; const man = sph(g, 0.3, glow(0xff6f00, 1.2), 9, c.F - 1.2, -7); c.tick((dt, t) => { man.position.y = c.F - 1.25 + Math.sin(t * 1.4) * 0.35; man.position.x = 9 + Math.sin(t * 0.3) * 1.5; });
    c.btn('mobb', 'MOB', -0.14, 0.012, 0.14, { color: 0xb3261e }); c.btn('alarm', 'ALARM', -0.05, 0.012, 0.14, { color: 0xb08800 }); c.btn('dsc', 'DISTRESS  hold 3 s', 0.05, 0.012, 0.14, { color: 0x7f1d1d, size: [0.09, 0.05] }); c.zone('zDsc', 0.05, 0.03, 0.14, 0.04);
    c.wheel('helm', 'HELM', 0, 0.11, -0.02, { radius: 0.1, tilt: -0.9, maxA: 2.2, spokes: 6, thick: 0.009, color: 0x8d6e63 }); c.lever('thr', 'ASTERN < N > AHEAD', -0.3, 0, -0.03, { value: 0.85, len: 0.16, color: 0xffb300 });
    c.tool('ring', 'Lifebuoy', 'ring', 0.3, 0.03, 0.12, { color: 0xff6f00 }); c.tool('fender', 'Fender', 'ball', 0.42, 0.03, 0.12, { color: 0xeceff1 }); c.tool('sling', 'Recovery sling', 'strap', 0.5, 0.02, 0.0, { color: 0xfdd835 }); c.zone('zSide', 0.5, 0.26, -0.22, 0.09);
  },
  steps() {
    return [
      { t: 'wait', secs: 1.4, say: 'SPLASH. "MAN OVERBOARD, STARBOARD SIDE!"' },
      { t: 'press', btn: 'mobb', time: 7, say: 'Mark the position.', hint: 'Press MOB.' },
      { key: 'ring', t: 'place', tool: 'ring', zone: 'zSide', time: 9, say: 'Throw the lifebuoy toward him.', hint: 'Grab the lifebuoy and push it out over the starboard rail (the ring on your right).' },
      { t: 'decide', q: 'He went over the STARBOARD side. Engine is ahead.', why: 'Helm toward the casualty swings the stern and propeller away from him.', opts: [ok('Helm hard to STARBOARD'), no('Helm hard to port', 'The stern swung toward him.'), no('Full astern', 'Propeller wash and blades toward the man.', true), no('Hold course and slow down gently', 'He is 200 m astern and out of sight.')] },
      { key: 'helm', t: 'set', ctl: 'helm', range: [0.7, 1], say: 'Helm hard to starboard.', hint: 'Pinch the wheel rim and turn it clockwise.' },
      { t: 'press', btn: 'alarm', say: 'Alarm: all hands. One man points at him and never looks away.' },
      { t: 'hold', zone: 'zDsc', secs: 3, say: 'Distress alert: hold the DSC button 3 seconds.', hint: 'Keep a fingertip on the DISTRESS button.' },
      { t: 'set', ctl: 'thr', range: [0.56, 0.68], say: 'Slow right down as you close on him.' },
      { t: 'decide', q: 'He is 10 m off the starboard bow. Alongside in seconds.', opts: [ok('Engine to NEUTRAL before he nears the stern; recover amidships'), no('Slow ahead to hold position', 'A turning propeller next to a man in the water.', true), no('Reverse up to him', 'Stern first is propeller first.', true)] },
      { t: 'set', ctl: 'thr', range: [0.45, 0.55], say: 'Engine: NEUTRAL.' },
      { t: 'place', tool: 'sling', zone: 'zSide', say: 'Recovery sling over the side to him.', calm: 0 },
      { t: 'decide', q: 'He is aboard, shivering hard after 12 minutes in 9°C water.', opts: [ok('Keep him flat, wet gear off gently, insulate, warm slowly, radio for medical advice'), no('Hot shower and a tot of rum', 'Rapid rewarming and alcohol collapse the blood pressure.'), no('Walk him around to warm up', 'Cold blood from the limbs reached the heart.')] },
    ];
  },
  limited: { note: 'The lifebuoy bracket is empty.', remove: ['ring'], swap: { ring: () => [{ t: 'decide', q: 'No lifebuoy to hand.', opts: [ok('Throw anything that floats: it marks him and gives him something to hold'), no('Skip it and start the turn', 'Nothing in the water to see or hold.'), no('Jump in after him', 'Now there are two casualties.', true)] }, { t: 'place', tool: 'fender', zone: 'zSide', say: 'Throw the fender.' }] } },
  twists: [{ after: 'helm', steps: () => [{ t: 'wait', secs: 1.6, say: 'Spotter: "I have lost him in the swell!"' }, { t: 'decide', q: 'Visual contact lost.', opts: [ok('Back to the MOB mark, expanding square search down-wind, keep the alert active'), no('Search where the boat is now', 'You were 300 m from where he went in.'), no('Stop engines and listen', 'You drifted off the datum.')] }] }],
};

/* ================================ MERCHANT NAVY ================================ */
const crossing = {
  id: 'colreg', title: 'Crossing at Night', kind: 'REGULAR', env: { time: 'night' }, brief: 'Dark night, open sea, 14 knots. Lights on your starboard bow.',
  debrief: ['Red light on your starboard bow, bearing steady: you give way.', 'Act early and make it large enough to be obvious.', 'Never turn to port for a vessel forward of the beam.'],
  build(c) { const st = (c.sim = Ship(c, { hdg: 0, spd: 14, K: 12 })); const t = (c.tgt = c.env.addShip('TGT 1')); t.x = 2.12; t.y = 2.12; t.hdg = 270; t.spd = 14; c.btn('w1', '1 SHORT BLAST', 0.26, 0.012, 0.0, { color: 0x1f6feb, size: [0.085, 0.05] }); c.btn('w2', '2 SHORT BLASTS', 0.36, 0.012, 0.0, { color: 0x1f6feb, size: [0.085, 0.05] }); void st; },
  steps(c) {
    const st = c.sim, t = c.tgt; let n = 0;
    return [
      { key: 'see', t: 'decide', q: 'A RED sidelight and two white masthead lights. Bearing steady, range closing.', why: 'Rule 15: with the other vessel on your starboard side, you keep out of the way.', opts: [ok('Crossing: she is on my starboard side, I am the give-way vessel'), no('I am stand-on: hold course and speed', 'Red on your starboard bow means you give way.'), no('Head-on: both turn to starboard', 'You would see both sidelights head-on.'), no('I am being overtaken', 'You would see only a stern light.')] },
      { t: 'decide', q: 'Your action as give-way vessel?', opts: [ok('Early, large alteration to STARBOARD to pass astern of her'), no('Small alteration to port', 'Turned across her bow.', true), no('Speed up and cross ahead', 'Crossing ahead at close range.', true), no('Flash the lamp and hold on', 'Hope is not a manoeuvre.')] },
      { t: 'press', btn: 'w1', wrongMsg: 'Two short blasts means "altering to PORT".', say: 'Sound signal for altering to starboard.', hint: 'One short blast.' },
      { key: 'turn', t: 'sim', ctls: ['helm'], say: 'Come right to about 060. Watch the CPA open on the radar.', hint: 'Pinch the helm rim and turn clockwise. Ease it back as you reach the heading.', test: (dt) => { const a = st.cpa(t), h = wrap180(st.hdg); if (a.range < 0.22) return { fail: 'Collision.' }; if (h < -20) return { fail: 'You turned to port across her bow.' }; n = (a.cpa > 0.8 && a.tcpa > 0) || a.tcpa <= 0 ? n + dt : 0; return { err: h < 35 || h > 100 ? 1.2 : 0, done: n > 1.5, msg: `HDG ${String(Math.round(st.hdg) % 360).padStart(3, '0')}   CPA ${a.cpa.toFixed(2)} nm` }; }, bot: () => st.bot(65) },
      { t: 'decide', q: 'She is past and clear, drawing aft.', opts: [ok('Return to the original course and log the alteration'), no('Stay on this heading to be safe', 'You are now miles off your track.')] },
      { t: 'sim', ctls: ['helm'], say: 'Come back to 000.', start: () => { n = 0; }, test: (dt) => { const h = Math.abs(wrap180(st.hdg)); n = h < 6 ? n + dt : 0; return { err: 0, done: n > 1.2, msg: `HDG ${String(Math.round(st.hdg) % 360).padStart(3, '0')}` }; }, bot: () => st.bot(0) },
    ];
  },
  limited: { note: 'Radar is down. Eyes and compass bearings only.', apply: (c) => { c.sim.radarOff = true; }, swap: { see: () => [{ t: 'decide', q: 'No radar. How do you know risk of collision exists?', opts: [ok('Compass bearings: bearing steady while range closes means risk exists'), no('She looks far away, so no risk', 'Lights at night hide range.'), no('Agree something with her on VHF', 'VHF agreements cause collisions. Use the Rules.')] }, { t: 'decide', q: 'RED sidelight and two masthead lights on your starboard bow, bearing steady.', opts: [ok('I am the give-way vessel'), no('I am stand-on', 'Red on your starboard bow: you give way.')] }] } },
  twists: [{ after: 'turn', steps: () => [{ t: 'wait', secs: 1.6, say: 'New lights fine on the bow: green over white, very slow.' }, { t: 'decide', q: 'Green over white ahead on your new heading.', opts: [ok('A trawler fishing: keep clear, give her stern gear a wide berth'), no('She must keep clear of a power-driven vessel', 'A vessel engaged in fishing has priority over you.'), no('Turn back across the first ship\'s bow', 'Back into the first danger.', true)] }] }],
};

/* ================================ SPORTS ================================ */
const keeper = {
  id: 'pens', title: 'Penalty Shoot-out: Keeper', kind: 'EXTREME', env: { time: 'night' }, brief: 'Cup final. Shoot-out. You are in goal. Use your hands.',
  debrief: ['Stay big and go late: the hips and plant foot tell you first.', 'Reset between kicks. The last one is gone.', 'Watch the ball all the way onto the glove.'],
  build() {},
  steps(c) {
    const F = c.F, from = [0, F + 0.2, -10.4]; const shot = (T, dev) => { const x = rand(-0.42, 0.42), y = rand(0.02, 0.5); return { from, to: [x, y, 0.08], T, arc: rand(0.1, 0.5), dev: dev ? rand(-0.18, 0.18) : 0, cue: c.assist === 0 ? `Going ${y > 0.3 ? 'HIGH' : 'LOW'} ${x < -0.12 ? 'LEFT' : x > 0.12 ? 'RIGHT' : 'CENTRE'}` : '' }; };
    return [
      { key: 'set1', t: 'intercept', shots: [1.15, 1.05, 1.0, 0.95, 0.9].map((T) => shot(T)), gap: 2.1, say: 'Five kicks. Get a hand to every one.', hint: 'Reach out and touch the ball as it arrives. The call-out tells you where it is going.' },
      { t: 'decide', q: 'Next taker: stats say 70% to his strong side. His run-up is short and straight.', time: 9, opts: [ok('Stay big, read hips and plant foot, go late'), no('Dive early to the stats side', 'He rolled it down the middle.'), no('Stand still and hope', 'Passive keepers save nothing.')] },
      { t: 'intercept', shots: [0.85, 0.8, 0.78].map((T) => shot(T, true)), gap: 1.8, say: 'Sudden death: three more, faster, with swerve.' },
    ];
  },
  limited: { note: 'A floodlight bank has failed. The ball is harder to pick up.', apply: (c) => { c.E.sun.intensity = 0.5; c.E.hemi.intensity = 0.3; } },
  twists: [{ after: 'set1', steps: (c) => [{ t: 'wait', secs: 1.4, say: 'The taker stutters in his run-up.' }, { t: 'intercept', shots: [{ from: [0, c.F + 0.2, -10.4], to: [rand(-0.4, 0.4), 0.45, 0.08], T: 1.5, arc: 1.4 }, { from: [0, c.F + 0.2, -10.4], to: [rand(-0.4, 0.4), 0.1, 0.08], T: 0.75, arc: 0.1 }], gap: 2.2, say: 'A chipped one, then a hard low one. Do not commit early.' }] }],
};

/* ================================ STUDENT LABS ================================ */
const circuit = {
  id: 'led', title: 'Physics: Light the LED', kind: 'REGULAR', brief: '9 V battery, one red LED (2 V, 20 mA max). Build it without burning it.',
  debrief: ['R = (supply - LED voltage) / current. Round UP to the next standard value.', 'Long leg is the anode: toward battery positive.', 'Missing value: series adds, parallel halves.'],
  build(c) {
    const g = c.stage; box(g, 0.34, 0.012, 0.16, M(0xf5f5f5, { r: 0.6 }), 0, 0.006, -0.1); for (let i = 0; i < 2; i++) box(g, 0.32, 0.002, 0.004, M(i ? 0x1565c0 : 0xc62828), 0, 0.0125, -0.04 - i * 0.12);
    c.zone('zBatt', -0.12, 0.016, -0.1, 0.035); c.zone('zR', -0.02, 0.018, -0.1, 0.03); c.zone('zLed', 0.07, 0.018, -0.1, 0.03); c.btn('sw', 'SWITCH', 0.24, 0.012, -0.1, { color: 0x1b5e20 });
    c.lamp = sph(g, 0.03, M(0xff1744, { e: 0xff1744, ei: 4, t: 0.5 }), 0.07, 0.045, -0.1); c.lamp.visible = false; c.lamp.castShadow = false;
    const m = (c.meter = makeScreen(g, 0.16, 0.07, 320, 140, 0.33, 0.1, -0.24)); m.mesh.rotation.x = -0.4; c.show = (t) => { const x = m.ctx; x.fillStyle = '#0b1b12'; x.fillRect(0, 0, 320, 140); x.fillStyle = '#39ff88'; x.font = `800 60px ${FONT}`; x.textAlign = 'center'; x.fillText(t, 160, 90); m.dirty(); }; c.show('-- V');
    c.tool('batt', '9 V battery', 'battery', -0.12, 0.02, 0.14, { color: 0x263238 }); c.tool('r100', '100 ohm', 'resistor', -0.02, 0.02, 0.14, { color: 0x6d4c41 }); c.tool('r470', '470 ohm', 'resistor', 0.08, 0.02, 0.14, { color: 0xfdd835 }); c.tool('led', 'Red LED', 'led', 0.18, 0.02, 0.14, { color: 0xff1744 }); c.tool('probe', 'Voltmeter probe', 'probe', 0.28, 0.03, 0.14, { color: 0xc62828 });
    c.tool('r220a', '220 ohm', 'resistor', 0.38, 0.02, 0.14, { color: 0xef5350, mat: true }); c.tool('r220b', '220 ohm', 'resistor', 0.48, 0.02, 0.14, { color: 0xef5350, mat: true });
  },
  steps(c) {
    return [
      { t: 'decide', q: '9 V supply, LED drops 2 V, 20 mA max. Series resistor?', hint: 'R = (9 - 2) / 0.02', why: '(9 - 2) / 0.020 = 350 ohm. The next standard value up is 470 ohm.', opts: [ok('About 350 ohm, so use 470 ohm'), no('100 ohm', '70 mA through a 20 mA LED.'), no('10 kilohm', '0.7 mA: it will barely glow.'), no('No resistor needed', 'The LED died instantly.', true)] },
      { key: 'res', t: 'place', tool: 'r470', zone: 'zR', say: 'Fit the resistor.', hint: 'Pick the 470 ohm resistor and put it on the marked gap.' },
      { t: 'decide', q: 'The LED has one long leg and one short leg.', opts: [ok('Long leg (anode) toward battery positive'), no('Short leg toward positive', 'Reverse-biased: no light.'), no('It does not matter', 'A diode conducts one way.')] },
      { t: 'place', tool: 'led', zone: 'zLed', say: 'Fit the LED.' }, { t: 'place', tool: 'batt', zone: 'zBatt', say: 'Connect the battery.' },
      { key: 'sw', t: 'press', btn: 'sw', say: 'Close the switch.', onDone: () => { c.lamp.visible = true; c.flash('LED on.', false); } },
      { t: 'points', tool: 'probe', anyOrder: true, tol: 0.02, pts: [{ p: [-0.045, 0.03, -0.1] }, { p: [0.005, 0.03, -0.1] }], say: 'Measure the voltage across the resistor: touch both ends.', onHit: () => c.show('7.0 V') },
      { t: 'decide', q: 'You measured 7.0 V across 470 ohm. Current?', opts: [ok('About 15 mA'), no('About 3.3 A', 'That is R / V, upside down.'), no('About 150 mA', 'A factor of ten out.')] },
    ];
  },
  limited: { note: 'The 470 ohm drawer is empty.', remove: ['r470'], swap: { res: () => [{ t: 'decide', q: 'No 470 ohm. You have two 220 ohm and one 100 ohm.', opts: [ok('Two 220 ohm in series: 440 ohm'), no('Two 220 ohm in parallel', 'That makes 110 ohm.'), no('Just the 100 ohm', '70 mA: LED destroyed.', true)] }, { t: 'craft', a: 'r220a', b: 'r220b', makes: { id: 'r440', label: '220 + 220 in series', kind: 'resistor', color: 0xef5350 }, say: 'Make the value you need.', hint: 'Bring one 220 ohm resistor to the other to join them end to end.' }, { t: 'place', tool: 'r440', zone: 'zR', say: 'Fit your 440 ohm pair.' }] } },
  twists: [{ after: 'sw', steps: (c) => [{ t: 'wait', secs: 1.6, say: 'The LED flickers and goes dark.', onEnter: () => { c.lamp.visible = false; } }, { t: 'decide', q: 'LED dark. The battery is fresh.', opts: [ok('Check polarity and continuity step by step with the meter'), no('Swap parts at random', 'Three good parts in the bin.'), no('Short the resistor for more current', 'Now the LED really is dead.', true)] }, { t: 'wait', secs: 1.2, say: 'Loose battery clip. Re-seated.', onEnter: () => { c.lamp.visible = true; } }] }],
};
const labFire = {
  id: 'fire', title: 'Chemistry: Fire on the Bench', kind: 'EXTREME', brief: 'A beaker of ethanol catches from a Bunsen flame. Blue flames, 20 cm high.',
  meter: { label: 'Fire spread', rate: 0.011, err: 0.08, fail: 'The fire spread across the bench.' },
  debrief: ['Gas off, then cut off the air. Small alcohol fires are smothered.', 'Never water on burning solvent: it floats and spreads.', 'Burns: cool running water for 20 minutes. No ice, no creams.'],
  build(c) {
    const g = c.stage; cyl(g, 0.035, 0.03, 0.07, glass(0xeaf6ff, 0.3), 0.08, 0.035, -0.12, 18); const fl = cone(g, 0.03, 0.14, M(0x4d9fff, { e: 0x3d7dff, ei: 3, t: 0.75 }), 0.08, 0.14, -0.12, 12); fl.castShadow = false; c.flame = fl; c.tick((dt, t) => { fl.scale.set(1 + 0.15 * Math.sin(t * 17), 1 + 0.25 * Math.sin(t * 23), 1 + 0.15 * Math.cos(t * 19)); });
    cyl(g, 0.012, 0.016, 0.1, metal(), -0.1, 0.05, -0.18); c.btn('gas', 'GAS SHUT-OFF', -0.15, 0.012, 0.0, { color: 0xb08800, size: [0.085, 0.05] }); c.btn('alarm', 'FIRE ALARM', -0.05, 0.012, 0.0, { color: 0xb3261e, size: [0.085, 0.05] });
    c.zone('zBeaker', 0.08, 0.085, -0.12, 0.05); c.zone('zAway', -0.34, 0.03, -0.12, 0.05);
    c.tool('lid', 'Heat-proof mat', 'pad', 0.08, 0.02, 0.14, { color: 0x78909c }); c.tool('blanket', 'Fire blanket', 'blanket', 0.2, 0.03, 0.14, { color: 0xc62828 }); c.tool('water', 'Beaker of water', 'bottle', 0.31, 0.02, 0.14, { color: 0x4fc3f7 }); c.tool('ext', 'CO2 extinguisher', 'extinguisher', 0.42, 0.06, 0.14); c.tool('stock', 'Ethanol stock bottle', 'bottle', 0.26, 0.02, -0.12, { color: 0xffe082 });
  },
  steps(c) {
    return [
      { key: 'gas', t: 'press', btn: 'gas', time: 7, say: 'Gas off at the bench.', hint: 'Press GAS SHUT-OFF.' },
      { t: 'decide', q: 'Small ethanol fire in a beaker.', why: 'Burning alcohol floats on water and spreads. Remove the air instead.', opts: [ok('Smother it: heat-proof mat or fire blanket over the top'), no('Throw water on it', 'Burning ethanol ran across the bench.'), no('Carry it to the sink', 'Burning ethanol spilled down your arm.', true), no('Blow it out', 'You fed it air.')] },
      { key: 'smother', t: 'place', tool: ['lid', 'blanket'], zone: 'zBeaker', say: 'Cover the beaker.', hint: 'Bring the mat or the blanket down over the top of the beaker.', calm: 0, onDone: () => { c.flame.visible = false; } },
      { t: 'wait', secs: 1.8, say: 'A classmate\'s sleeve has caught fire.' },
      { t: 'decide', q: 'Their sleeve is alight and they start to run.', time: 9, opts: [ok('Stop, drop and roll. Wrap them in the fire blanket'), no('Fan it out with a book', 'More air, bigger flame.'), no('Run with them to the nurse', 'Running fans the flames.', true)] },
      { t: 'press', btn: 'alarm', say: 'Raise the alarm. Tell the teacher.' },
      { t: 'decide', q: 'Forearm burn: red, blistering.', opts: [ok('Cool running water for 20 minutes, then cover loosely with cling film'), no('Ice pack', 'Ice deepens the injury.'), no('Butter or cream', 'Seals the heat in and has to be scrubbed off.'), no('Pop the blisters', 'Opens the door to infection.')] },
    ];
  },
  limited: { note: 'The fire blanket box is empty and there is no heat mat.', remove: ['lid', 'blanket'], swap: { smother: (c) => [{ t: 'decide', q: 'Nothing made for smothering is to hand.', opts: [ok('CO2 extinguisher at the base, or any non-flammable cover that cuts off the air'), no('Water after all', 'Burning ethanol ran across the bench.'), no('Let it burn out', 'Next to an open bottle of ethanol.')] }, { t: 'hold', tool: 'ext', zone: 'zBeaker', secs: 2, say: 'CO2 extinguisher: aim at the base and hold.', calm: 0, onDone: () => { c.flame.visible = false; } }] } },
  twists: [{ after: 'gas', steps: () => [{ t: 'wait', secs: 1.5, say: 'The open stock bottle of ethanol is 20 cm from the flames.' }, { t: 'place', tool: 'stock', zone: 'zAway', say: 'Move the fuel away first.', hint: 'Carry the stock bottle to the far left of the bench.' }] }],
};

export const CATS = [
  { id: 'doctor', name: 'Doctors', env: 'er', color: 0x0e7490, ack: 'MONITOR ALARM', blurb: 'Emergency and ward medicine: decide fast, dose right, hands on the patient.', drills: [anaphylaxis, codeBlue] },
  { id: 'surgeon', name: 'Surgeons', env: 'or', color: 0x0f766e, ack: 'ANAESTHETIST', blurb: 'Steady hands, sharp judgement, and a tray that is never quite complete.', drills: [bleeder] },
  { id: 'driver', name: 'Drivers', env: 'cab', color: 0x92400e, ack: 'DISPATCH RADIO', blurb: 'Heavy vehicles when the road, the weather or the brakes turn on you.', drills: [brakeFade] },
  { id: 'pilot', name: 'Pilots', env: 'cockpit', color: 0x1d4ed8, ack: 'ATC CALL', blurb: 'Fly the aircraft first. Then identify, confirm, act.', drills: [engineFire] },
  { id: 'operator', name: 'Machine Operators', env: 'crane', color: 0xa16207, ack: 'SITE RADIO', blurb: 'Cranes and heavy plant on a live construction site.', drills: [blindLift] },
  { id: 'mech', name: 'Mechanics & Technicians', env: 'shop', color: 0x7c2d12, ack: 'FRONT DESK', blurb: 'Sequence, torque and measured diagnosis, with the right tool missing.', drills: [torque] },
  { id: 'fishing', name: 'Fishing', env: 'deck', color: 0x155e75, ack: 'DECK SHOUT', blurb: 'Commercial deck work in a rising sea.', drills: [mob] },
  { id: 'navy', name: 'Merchant Navy', env: 'bridge', color: 0x1e3a8a, ack: 'VHF CH16', blurb: 'Bridge watchkeeping: the Rules, the helm, and what the lights are telling you.', drills: [crossing] },
  { id: 'sports', name: 'Sports', env: 'arena', color: 0x166534, ack: 'COACH SHOUT', blurb: 'Reactions and reads when the whole stadium is watching.', drills: [keeper] },
  { id: 'labs', name: 'Student Labs', env: 'lab', color: 0x6b21a8, ack: 'TEACHER', blurb: 'Physics and chemistry benches: build it, measure it, and handle it when it goes wrong.', drills: [circuit, labFire] },
];
void THREE; void shuffle; void grp;
