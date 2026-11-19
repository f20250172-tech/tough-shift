import { M, metal, glow, box, cyl, sph, cone, clamp, rand, audio } from './core.js';
import { Drive, Fly, Crane, Ship } from './sims.js';
const ok = (t, fb) => ({ t, ok: true, fb }); const no = (t, fb, crit) => ({ t, fb, crit: !!crit });

const incision = {
  id: 'cut', title: 'First Incision', kind: 'REGULAR', brief: 'Elective laparotomy. Patient draped, line marked. Your knife.',
  meter: { label: 'Blood loss', rate: 0.002, err: 0.05, fail: 'Too much blood lost.' },
  debrief: ['Time-out before knife to skin, every time.', 'One smooth pass along the mark. The blade follows your eyes.', 'No suction: a swab and pressure clears the field.'],
  build(c) {
    const Y = c.env.fieldY; box(c.stage, 0.19, 0.0008, 0.003, M(0x5e35b1, { r: 0.8 }), 0, Y, -0.04).castShadow = false;
    c.tool('scalpel', 'Scalpel', 'scalpel', 0.1, 0.03, 0.15); c.tool('forceps', 'Forceps', 'forceps', 0.19, 0.03, 0.15); c.tool('retr', 'Retractor', 'retractor', 0.28, 0.03, 0.15); c.tool('suction', 'Suction', 'suction', 0.37, 0.03, 0.15); c.tool('gauze', 'Gauze swab', 'gauze', 0.46, 0.03, 0.15);
    c.zone('zRetr', 0, Y + 0.002, -0.085, 0.03); c.zone('zPool', 0.03, Y + 0.002, -0.04, 0.026);
  },
  steps(c) {
    const Y = c.env.fieldY + 0.003;
    return [
      { t: 'decide', q: 'Scrubbed, draped, scalpel in hand. Before knife to skin?', why: 'The surgical time-out catches wrong patient, wrong site and missed antibiotics.', opts: [ok('Time-out: patient, procedure, site, allergies, antibiotics'), no('Start: the list is running late', 'Wrong-site surgery starts exactly like this.'), no('Ask "everyone ready?" and cut', 'That is not a time-out.')] },
      { key: 'incise', t: 'trace', tool: 'scalpel', tol: 0.012, path: [[-0.09, Y, -0.04], [0.09, Y, -0.04]], keep: true, say: 'Incise along the marked line. One smooth pass.', hint: 'Pinch the scalpel, put its tip on the blue dot and draw it along the line to the yellow dot.', slipMsg: 'The blade wandered off the line.' },
      { t: 'place', tool: 'retr', zone: 'zRetr', say: 'Retract the wound edge.' },
      { key: 'suction', t: 'hold', tool: 'suction', zone: 'zPool', secs: 2.5, say: 'Clear the field with suction.' },
      { t: 'points', tool: 'forceps', anyOrder: true, tol: 0.014, pts: [[-0.05, -0.047], [0.01, -0.033], [0.06, -0.046]].map((p) => ({ p: [p[0], Y, p[1]] })), say: 'Pinch each of the three small bleeders.' },
    ];
  },
  limited: { note: 'The suction tubing has split. No spare in theatre.', remove: ['suction'], swap: { suction: () => [{ t: 'hold', tool: 'gauze', zone: 'zPool', secs: 3, say: 'No suction. Clear the field another way.', hint: 'Press a gauze swab into the pool and hold.' }] } },
  twists: [{ after: 'incise', steps: () => [{ t: 'wait', secs: 1.5, say: 'The blade nicks a skin vessel: brisk ooze.' }, { t: 'hold', tool: 'gauze', zone: 'zPool', secs: 3, say: 'Control it: direct pressure.' }] }],
};

const blowout = {
  id: 'tire', title: 'Steer-Tire Blowout', kind: 'EXTREME', env: { weather: 'dusk' }, brief: 'Motorway, 90 km/h, fully loaded. Evening traffic.',
  debrief: ['Blowout: grip, steer straight, stay OFF the brake.', 'Let drag slow you, then brake gently once it is stable.', 'Shoulder, hazards, triangles. Never change a wheel on the traffic side.'],
  build(c) { c.sim = Drive(c, { v: 25 }); c.btn('haz', 'HAZARDS', 0.43, 0.012, 0.16, { color: 0xb08800, size: [0.085, 0.05] }); },
  steps(c) {
    const st = c.sim;
    return [
      { t: 'sim', dur: 6, ctls: ['steer', 'pedal'], say: 'Cruise: hold your lane at 75-100 km/h.', hint: 'Turn the wheel to steer. Right lever: push for gas, pull for brake.', test: () => ({ err: Math.abs(st.x) > 1.1 || st.v * 3.6 < 72 || st.v * 3.6 > 102 ? 1.2 : 0, msg: `${Math.round(st.v * 3.6)} km/h` }), bot: () => st.bot(0, 24.5) },
      { t: 'wait', secs: 0.9, say: 'BANG! Front-right tire gone.', onEnter: () => { st.pull = 0.012; st.blown = true; st.warn = 'TIRE FAILURE'; audio.bad(); } },
      { t: 'decide', q: 'Steer tire blown at 90 km/h. The truck pulls hard right.', time: 8, why: 'Hard braking on a blown steer tire throws the weight onto the dead wheel.', opts: [ok('Grip the wheel, steer straight, stay OFF the brake'), no('Brake hard now', 'The truck slewed across two lanes.', true), no('Swerve to the shoulder immediately', 'A sharp input at speed rolled it.'), no('Let go and let it settle', 'It settled in the ditch.', true)] },
      { key: 'hold', t: 'sim', dur: 9, ctls: ['steer'], say: 'Counter-steer. Hold the lane. No brakes yet.', start: () => { st.pull = 0.09; }, test: () => { if (st.a < -0.55 && st.v > 14) return { fail: 'Braked hard on a blown steer tire: lost control.' }; if (st.x > 3 || st.x < -2.9) return { fail: 'Left your lane at speed.' }; return { err: Math.abs(st.x) > 1.2 ? 1.2 : 0, msg: `${Math.round(st.v * 3.6)} km/h` }; }, bot: () => st.bot(0, st.v) },
      { key: 'haz', t: 'press', btn: 'haz', say: 'Hazards on.', onDone: () => { st.hazard = true; } },
      { t: 'sim', ctls: ['steer', 'pedal'], say: 'Now brake GENTLY and ease onto the left edge until you stop.', test: () => { if (st.a < -0.85 && st.v > 10) return { fail: 'Stamped on the brake: jack-knifed.' }; if (st.x > 3 || st.x < -3.4) return { fail: 'Left the road.' }; const inB = st.x < -1.0 && st.x > -2.8; return { err: inB ? 0 : 1.2, done: st.v < 1, q: inB ? 1 : 0.4, msg: `${Math.round(st.v * 3.6)} km/h` }; }, bot: () => st.bot(-1.9, st.v - 1) },
      { t: 'decide', q: 'Stopped on the shoulder at dusk.', opts: [ok('Hazards on, triangles out behind, stay clear of traffic, call it in'), no('Change the wheel on the traffic side now', 'Working with your back to 90 km/h traffic.'), no('Stay in the cab and wait', 'An unmarked truck at dusk gets hit.')] },
    ];
  },
  limited: { note: 'The hazard switch is broken.', remove: ['haz'], swap: { haz: () => [{ t: 'decide', q: 'No hazard lights.', opts: [ok('Headlights and indicator on, triangles out the moment you stop'), no('Nothing you can do', 'There is always something.'), no('Stop in the lane so people notice', 'They noticed too late.', true)] }] } },
  twists: [{ after: 'hold', steps: (c) => [{ t: 'wait', secs: 1.2, say: 'A car sits alongside in the lane you are drifting toward.', onEnter: () => { const ob = c.env.road.car(3.6, 5, 0x1565c0); ob.v = c.sim.v; } }, { t: 'sim', dur: 6, ctls: ['steer'], say: 'Keep it out of the right lane.', test: () => (c.sim.x > 1.7 ? { fail: 'Side-swiped the car alongside.' } : { err: Math.abs(c.sim.x) > 0.9 ? 1.2 : 0 }), bot: () => c.sim.bot(0, c.sim.v) }] }],
};

const depress = {
  id: 'fl350', title: 'Depressurization at 35,000 ft', kind: 'EXTREME', brief: 'Cruise, 35,000 ft. A bang, mist in the cabin, your ears pop.',
  meter: { label: 'Hypoxia', rate: 0.028, err: 0.03, fail: 'You lost consciousness.' },
  debrief: ['Your own mask first. You have well under a minute of useful thought.', 'Then get down: thrust idle, speedbrake, descend to 10,000 ft.', 'Communicate once the aircraft is going where it must.'],
  build(c) {
    const st = (c.sim = Fly(c, { alt: 35000, ias: 290, thr: 0.5, altK: 8, dist: 900000 })); st.ap = !!c.E.bot; st.apPitch = 2.5;
    c.tool('mask', 'Oxygen mask', 'mask', -0.33, 0.03, 0.07, { color: 0xffd54f }); c.tool('pob', 'Portable oxygen', 'mask', 0.44, 0.03, 0.0, { color: 0x81c784 }); c.zone('zFace', 0, 0.33, 0.24, 0.1);
    c.btn('spd', 'SPEEDBRAKE', 0.5, 0.012, 0.17, { color: 0x30363d, size: [0.075, 0.045] }); c.btn('atc', 'MAYDAY', 0.5, 0.012, 0.11, { color: 0xb3261e, size: [0.075, 0.045] });
    c.tick(() => { c.E.renderer.toneMappingExposure = 1.05 * (1 - 0.75 * clamp(c.game.meter)); });
  },
  steps(c) {
    const st = c.sim;
    return [
      { t: 'wait', secs: 1.5, say: 'CABIN ALTITUDE warning. Mist. Ears pop.', onEnter: () => { st.alarm = true; st.msgs = ['!CABIN ALTITUDE']; } },
      { key: 'mask', t: 'place', tool: ['mask', 'pob'], zone: 'zFace', consume: true, time: 12, crit: true, calm: 0, relief: 0.5, say: 'Your oxygen mask. First. Now.', hint: 'Pinch the yellow mask on your left and bring it to your face.', why: 'At 35,000 ft you have well under a minute of useful consciousness.', onDone: () => { st.alarm = false; } },
      { t: 'decide', q: 'Mask on. Cabin altitude climbing through 20,000 ft.', opts: [ok('Emergency descent to 10,000 ft'), no('Troubleshoot the pressurization panel first', 'The passengers\' oxygen lasts about 12 minutes.'), no('Climb above the weather', 'Up is the wrong direction.', true), no('Ask the cabin crew to check the doors', 'They are on oxygen too.')] },
      { t: 'set', ctl: 'thr1', range: [0, 0.12], say: 'Thrust levers: IDLE.' }, { t: 'set', ctl: 'thr2', range: [0, 0.12], say: 'Both of them.' },
      { key: 'spd', t: 'press', btn: 'spd', say: 'Speedbrake: EXTEND.', onDone: () => { st.sb = true; } },
      { t: 'sim', ctls: ['stick'], say: 'Push the nose down 5-12 degrees and descend to 14,000 ft.', hint: 'Right hand: push the sidestick forward and hold the dive steady.', start: () => { st.apPitch = -9; st.live = true; }, test: () => { if (st.ias > 350) return { fail: 'Overspeed: structural damage.' }; return { err: st.pitch > -3 || st.pitch < -14 ? 1.2 : 0, done: st.alt < 14000, msg: `ALT ${Math.round(st.alt / 100) * 100} ft   ${Math.round(st.ias)} kt` }; } },
      { t: 'press', btn: 'atc', say: 'MAYDAY call: emergency descent.', onEnter: () => { st.apPitch = 2.5; } },
      { t: 'decide', q: 'Level at 10,000 ft. Fuel burns fast down here.', opts: [ok('Check the cabin, divert to the nearest suitable airport'), no('Climb back to cruise and continue', 'The hull is not holding pressure.', true), no('Hold here until fuel is low', 'You turned one emergency into two.')] },
    ];
  },
  limited: { note: 'Your mask hose is torn. No flow.', remove: ['mask'], swap: { mask: (c) => [{ t: 'decide', q: 'Your mask is dead. Seconds of clear thought left.', time: 8, opts: [ok('Grab the portable oxygen bottle'), no('Hold your breath and start the descent', 'You passed out in the dive.', true), no('Share the first officer\'s mask', 'Two pilots, one mask, nobody flying.')] }, { t: 'place', tool: 'pob', zone: 'zFace', consume: true, calm: 0, relief: 0.5, say: 'Portable oxygen to your face.', onDone: () => { c.sim.alarm = false; } }] } },
  twists: [{ after: 'spd', steps: (c) => [{ t: 'wait', secs: 1.5, say: 'The speedbrake lever is jammed. No extra drag.', onEnter: () => { c.sim.sb = false; } }, { t: 'decide', q: 'No speedbrake for the descent.', opts: [ok('Gear down if speed allows: more drag'), no('Add thrust', 'Faster, not lower.'), no('Accept a shallow descent', 'Too slow for the people in the back.')] }] }],
};

const hoistSlip = {
  id: 'slip', title: 'Crane: Hoist Brake Slipping', kind: 'EXTREME', brief: '3 tonnes at 7 m. Two workers directly underneath. The load starts to creep down.',
  debrief: ['Warn first, move the load away from people second.', 'Fight for height only while you are moving it clear.', 'Lock the crane out afterwards. Nobody "tests" a slipping brake.'],
  build(c) { c.sim = Crane(c, { x: 0, z: -14, h: 7, tgt: [7, -20], workers: [[0, -14], [1.2, -15]] }); c.btn('horn', 'HORN', 0.44, 0.012, 0.17, { color: 0xb08800 }); c.btn('estop', 'E-STOP', 0.44, 0.012, 0.1, { color: 0xb3261e }); },
  steps(c) {
    const st = c.sim;
    return [
      { t: 'wait', secs: 1.3, say: 'The load is sinking on its own.', onEnter: () => { st.slip = 0.3; } },
      { key: 'horn', t: 'press', btn: 'horn', time: 6, say: 'Warn them: horn!' },
      { t: 'decide', q: 'Hoist brake slipping with 3 tonnes over people.', time: 9, opts: [ok('Swing the load clear of people, then set it down under control'), no('Hit E-STOP now', 'E-stop relies on the same failing brake, and you lost the power to move clear.'), no('Leave the cab', 'Nobody at the controls.', true), no('Wait and watch it', 'It kept coming.', true)] },
      { key: 'swing', t: 'sim', ctls: ['jl', 'jr'], say: 'Move it to the green pad. Hold hoist UP to slow the sink.', hint: 'Left stick moves the load. Right stick forward fights the slip.', test: () => { if (st.h < 2.4 && st.nearWorker() < 2.2) return { fail: 'The load came down on the crew.' }; return { err: st.nearWorker() < 3 ? 1.2 : 0, done: st.dist() < 1.7, msg: `HEIGHT ${st.h.toFixed(1)} m   TO PAD ${st.dist().toFixed(1)} m` }; }, bot: () => st.bot(st.tgt[0], st.tgt[1], st.h + 1.2) },
      { t: 'sim', ctls: ['jr'], say: 'Set it down under control.', test: () => ({ err: st.dist() > 2.6 ? 1.2 : 0, done: st.h <= 0.75, msg: `HEIGHT ${st.h.toFixed(1)} m` }), bot: () => st.bot(st.tgt[0], st.tgt[1], 0.4) },
      { t: 'press', btn: 'estop', say: 'Emergency stop.' },
      { t: 'decide', q: 'Load is on the ground. Now?', opts: [ok('Lock out and tag the crane: nobody uses it until the brake is inspected'), no('Test it with a lighter load', 'Testing a failed brake over a live site.'), no('Finish the shift carefully', 'It let go again an hour later.', true)] },
    ];
  },
  limited: { note: 'The horn does not work.', remove: ['horn'], swap: { horn: () => [{ t: 'decide', q: 'No horn. The workers have their backs to you.', time: 7, opts: [ok('Radio the signaller, flash the work lights, start moving the load away'), no('Shout from the cab', 'They cannot hear you over the site.'), no('Wait until they notice', 'They did not.', true)] }] } },
  twists: [{ after: 'swing', steps: () => [{ t: 'decide', q: 'The pad is 5 m from a 33 kV line. Rigger shouts "just drop it here!"', opts: [ok('Stay on the pad, keep the minimum approach distance'), no('Drop it under the line: it is an emergency', 'The hoist rope arced to the line.', true), no('Carry it further over the site office', 'Over more people.')] }] }],
};

const loto = {
  id: 'loto', title: 'Lockout / Tagout: Live Panel', kind: 'EXTREME', brief: 'Conveyor motor fuse has blown. Production is stopped and waiting on you.',
  debrief: ['Your lock, your tag, your key in your pocket.', 'Prove dead: test the tester, test the circuit, test the tester again.', 'Only the person who fitted a lock removes it.'],
  build(c) {
    const g = c.stage; box(g, 0.38, 0.32, 0.08, M(0x6b7280, { r: 0.5, m: 0.5 }), 0, 0.16, -0.25); box(g, 0.34, 0.28, 0.005, M(0x9aa3ab, { r: 0.4, m: 0.6 }), 0, 0.16, -0.208);
    c.lever('brk', 'ISOLATOR', -0.11, 0.21, -0.205, { dir: [0, 1, 0], len: 0.09, value: 0.95, color: 0xc62828 });
    c.zone('zHasp', -0.11, 0.1, -0.2, 0.028, { vertical: true }); c.zone('zTag', -0.04, 0.1, -0.2, 0.028, { vertical: true }); c.zone('zFuse', 0.1, 0.08, -0.2, 0.028, { vertical: true }); c.zone('zLive', 0.33, 0.035, -0.08, 0.03);
    box(g, 0.07, 0.03, 0.07, M(0xeceff1), 0.33, 0.015, -0.08); box(g, 0.02, 0.004, 0.006, 0x111111, 0.33, 0.031, -0.08); box(g, 0.05, 0.03, 0.01, glow(0xffb300, 0.6), 0.1, 0.08, -0.204);
    c.btn('notify', 'NOTIFY OPERATORS', -0.14, 0.012, 0.14, { color: 0x1f6feb, size: [0.09, 0.05] }); c.btn('up', 'ISOLATE UPSTREAM', -0.03, 0.012, 0.14, { color: 0x7f1d1d, size: [0.09, 0.05] });
    c.tool('tester', 'Voltage tester', 'probe', 0.08, 0.03, 0.14, { color: 0xfdd835 }); c.tool('lock', 'Your padlock', 'lock', 0.18, 0.03, 0.14, { color: 0xc62828 }); c.tool('tag', 'Danger tag', 'tag', 0.28, 0.02, 0.14, { color: 0xc62828 }); c.tool('fuse', 'New fuse', 'fuse', 0.38, 0.02, 0.14); c.tool('driver', 'Screwdriver', 'screwdriver', 0.48, 0.03, 0.14, { color: 0x1565c0 });
  },
  steps(c) {
    const L = [0.25, 0.2, 0.15].map((y) => ({ p: [0.06, y, -0.2] })); const prove = (say) => ({ t: 'hold', tool: 'tester', zone: 'zLive', secs: 1.2, say, hint: 'Touch the tester to the bench socket.', onDone: () => c.flash('Tester reads 230 V. It works.', false) });
    return [
      { t: 'press', btn: 'notify', traps: { up: 'Killed the whole line without warning anyone.' }, soft: true, say: 'Tell the operators the machine is coming off.' },
      { t: 'set', ctl: 'brk', range: [0, 0.15], say: 'Open the isolator: OFF.', hint: 'Pinch the red handle on the panel and pull it down.' },
      { key: 'lock', t: 'place', tool: 'lock', zone: 'zHasp', say: 'Your lock on the isolator.' }, { t: 'place', tool: 'tag', zone: 'zTag', say: 'Your tag beside it.' },
      { t: 'decide', q: 'Isolator is off and locked. Is the circuit dead?', why: 'Welded contacts and back-feeds make "OFF" a claim, not a fact.', opts: [ok('Prove it: test the tester, test the circuit, test the tester again'), no('Yes: the handle says OFF', 'A welded contact. Arc flash.', true), no('Brush it with the back of your hand', 'That is how people die.', true), no('Ask the operator', 'They do not know either.')] },
      prove('Prove the tester on a known live source.'),
      { key: 'test', t: 'points', tool: 'tester', tol: 0.022, pts: L, say: 'Test all three phases, top to bottom.', onHit: (i) => c.flash(`L${i + 1}: 0 V`, false) },
      prove('Prove the tester again.'),
      { t: 'place', tool: 'fuse', zone: 'zFuse', say: 'Now replace the blown fuse.' },
      { t: 'decide', q: 'Done. The supervisor is shouting to restart.', opts: [ok('Tools out, covers on, remove YOUR lock and tag yourself, warn operators, energise'), no('Shout "clear" and flick it on', 'A fitter still had his hand in the conveyor.', true), no('Let the supervisor cut your lock', 'Only the owner removes a lock.')] },
    ];
  },
  limited: { note: 'There is no padlock in your kit.', remove: ['lock'], swap: { lock: () => [{ t: 'decide', q: 'No lock available.', opts: [ok('Do not start until you control the energy: get a lock, or pull and pocket the supply fuses'), no('A tag alone will do', 'Tags get ignored.'), no('Ask someone to stand by the switch', 'They went on a break.', true)] }] } },
  twists: [{ after: 'test', steps: (c) => [{ t: 'wait', secs: 1.6, say: 'Re-check: L2 now reads 230 V with the isolator OFF.' }, { t: 'decide', q: 'One phase live with the isolator locked off.', opts: [ok('Stop. Back-feed or welded contact: isolate upstream and prove dead again'), no('Work on the other two phases', 'They share a busbar.', true), no('Carry on with insulated tools', 'Live work without a permit.', true)] }, { t: 'press', btn: 'up', say: 'Isolate upstream.' }, { t: 'points', tool: 'tester', tol: 0.022, pts: [0.25, 0.2, 0.15].map((y) => ({ p: [0.06, y, -0.2] })), say: 'Prove all three dead again.', onHit: (i) => c.flash(`L${i + 1}: 0 V`, false) }] }],
};

const flooding = {
  id: 'flood', title: 'Flooding: Split Hose', kind: 'EXTREME', env: { sea: 'storm' }, brief: 'BILGE ALARM. Water over the engine-room plates and rising.',
  meter: { label: 'Water in engine room', rate: 0.012, err: 0.04, fail: 'Engine room flooded. Power lost.' },
  debrief: ['Pump, then find and stop the source at its sea-cock.', 'Seized valve: a tapered softwood bung, driven home.', 'No bung: make one. Anything tapered and wooden.'],
  build(c) {
    const g = c.stage; cyl(g, 0.02, 0.02, 0.09, M(0x263238, { r: 0.6 }), 0.2, 0.045, -0.14); const jet = cone(g, 0.015, 0.12, M(0x4fc3f7, { e: 0x4fc3f7, ei: 1.2, t: 0.7 }), 0.2, 0.15, -0.14, 10); jet.castShadow = false; c.jet = jet; c.tick((dt, t) => { jet.scale.y = 1 + 0.2 * Math.sin(t * 20); });
    c.zone('zHole', 0.2, 0.095, -0.14, 0.035); c.wheel('valve', 'SEA-COCK', -0.08, 0.08, -0.1, { radius: 0.065, tilt: -1.1, maxA: 2.6, spokes: 4, thick: 0.008, color: 0xc62828 });
    c.btn('bilge', 'BILGE PUMP', -0.16, 0.012, 0.14, { color: 0x1f6feb, size: [0.085, 0.05] }); c.btn('vhf', 'VHF CH16', -0.06, 0.012, 0.14, { color: 0xb3261e, size: [0.085, 0.05] });
    c.tool('bung', 'Wooden bung', 'bung', 0.06, 0.03, 0.14, { color: 0xc49a6c }); c.tool('hammer', 'Hammer', 'hammer', 0.17, 0.03, 0.14); c.tool('handle', 'Mop handle', 'stick', 0.28, 0.03, 0.14, { color: 0xc49a6c, mat: true }); c.tool('knife', 'Deck knife', 'knife', 0.38, 0.03, 0.14, { color: 0xff6f00, mat: true }); c.tool('rag', 'Oily rag', 'cloth', 0.48, 0.02, 0.14, { color: 0x5d4037, mat: true });
  },
  steps(c) {
    return [
      { key: 'pump', t: 'press', btn: 'bilge', say: 'Start the bilge pump.', calm: 0.009 },
      { t: 'decide', q: 'Source: a split cooling-water hose below the waterline.', opts: [ok('Shut the sea-cock that feeds it'), no('Bail with buckets', 'The sea has more water than you have buckets.'), no('Abandon ship', 'For a hose you can isolate.'), no('Run the engine harder', 'More flow through the split.')] },
      { key: 'valve', t: 'set', ctl: 'valve', range: [0.75, 1], say: 'Close the sea-cock: clockwise, all the way.', hint: 'Pinch the red handwheel rim and turn it clockwise.', calm: 0, onDone: () => { c.jet.visible = false; } },
      { t: 'decide', q: 'Leak stopped. 20 cm of water. The engine now has no cooling water.', opts: [ok('Stop the main engine before it overheats, make a PAN-PAN call, assess'), no('MAYDAY and abandon', 'The boat is stable and the leak is stopped.'), no('Say nothing and steam home', 'Seized engine on a lee shore.', true)] },
      { t: 'press', btn: 'vhf', say: 'Make the urgency call on channel 16.' },
    ];
  },
  limited: { note: 'The sea-cock is seized solid, and the bung box is empty.', remove: ['bung'], apply: (c) => { c.by('valve').enabled = false; }, swap: { valve: (c) => [
    { t: 'decide', q: 'Seized valve. Water still coming in. No bungs aboard.', opts: [ok('Make a tapered plug from wood and drive it into the hose stub'), no('Stuff the rag in and hope', 'It blew out in seconds.'), no('Keep pumping and do nothing else', 'The pump cannot keep up for ever.')] },
    { t: 'craft', a: 'knife', b: 'handle', makes: { id: 'plug', label: 'Whittled bung', kind: 'bung', color: 0xc49a6c }, say: 'Make a bung.', hint: 'Bring the deck knife to the mop handle to whittle a taper.' },
    { t: 'place', tool: 'plug', zone: 'zHole', say: 'Push it into the hose stub.' },
    { t: 'fill', tool: 'hammer', zone: 'zHole', rate: 0.5, band: [0.7, 0.92], unit: 'SEATED', overMsg: 'Split the hose stub: worse leak.', say: 'Drive it home. Stop before it splits.', calm: 0.001, onDone: () => { c.jet.visible = false; } }] } },
  twists: [{ after: 'pump', steps: (c) => [{ t: 'wait', secs: 1.5, say: 'The bilge pump trips: strainer choked with net scraps.', onEnter: () => c.rate(0.014) }, { t: 'decide', q: 'Electric bilge pump is dead.', opts: [ok('Hand pump now; rig the engine cooling intake to suck from the bilge'), no('Wait for it to reset', 'It did not reset.'), no('Open another sea-cock to drain it', 'Water flows in, not out.', true)] }] }],
};

const erFire = {
  id: 'erfire', title: 'Engine Room Fire', kind: 'EXTREME', env: { time: 'night' }, brief: 'Fire alarm: engine room, purifier flat. Heavy smoke reported.',
  meter: { label: 'Fire spread', rate: 0.006, err: 0.05, fail: 'The fire reached the accommodation.' },
  debrief: ['Headcount before CO2. Always.', 'Seal the space first: vents, dampers, fuel. Then one full discharge.', 'Keep it shut for hours. Opening early re-lights it.'],
  build(c) {
    c.sim = Ship(c, { hdg: 40, spd: 12 }); const b = (id, lab, x, z, col) => c.btn(id, lab, x, 0.012, z, { color: col, size: [0.09, 0.055] });
    b('ga', 'GENERAL ALARM', 0.2, 0.13, 0xb3261e); b('muster', 'HEAD-COUNT', 0.3, 0.13, 0x1f6feb); b('vent', 'STOP VENTS', 0.4, 0.13, 0x30363d); b('fuelq', 'FUEL TRIPS', 0.5, 0.13, 0x30363d); b('co2', 'CO2 RELEASE', 0.2, 0.06, 0x7f1d1d); b('pumps', 'FIRE PUMP', 0.3, 0.06, 0x1b5e20); b('may', 'DISTRESS', 0.4, 0.06, 0xb3261e); b('man', 'CO2 ROOM TEAM', 0.5, 0.06, 0x30363d);
  },
  steps(c) {
    const co2trap = { co2: 'CO2 released too early.' };
    return [
      { key: 'ga', t: 'press', btn: 'ga', traps: co2trap, say: 'General alarm.' },
      { t: 'decide', q: 'Engineer: "It is beyond extinguishers." Fixed CO2 is available.', why: 'CO2 at fire-fighting concentration kills anyone left inside.', opts: [ok('Evacuate the engine room and get a full head-count BEFORE any CO2'), no('Release CO2 immediately', 'CO2 released with people inside.', true), no('Send a hose team in without breathing sets', 'They did not come out.', true)] },
      { t: 'press', btn: 'muster', traps: co2trap, say: 'Muster and head-count.', onDone: () => c.flash('Head-count: 21 of 22. The wiper is missing.', true) },
      { t: 'decide', q: 'One man unaccounted for. The fire is growing.', opts: [ok('Do not flood. Find him: muster points, cabins, BA team if he may be inside'), no('Flood now: one life against the ship', 'He was in the workshop.', true), no('Wait and do nothing', 'The fire did not wait.')] },
      { t: 'wait', secs: 2.2, say: 'BA team finds the wiper in the workshop. Out and safe. 22 of 22.' },
      { t: 'pressAny', btns: ['vent', 'fuelq'], traps: co2trap, say: 'Seal the space: stop ventilation, trip the fuel valves.' },
      { key: 'co2', t: 'press', btn: 'co2', say: 'Now release the CO2: full charge, once.', calm: 0 },
      { t: 'press', btn: 'pumps', say: 'Boundary cooling on the bulkheads around it.' }, { t: 'press', btn: 'may', say: 'Send the distress message with your position.' },
      { t: 'decide', q: 'Temperatures falling after 20 minutes. The chief wants to open up and look.', opts: [ok('Keep it sealed for hours. Re-entry only with BA and charged hoses after cooling'), no('Open the door for a quick look', 'Fresh air re-lit it.', true), no('Start the fans to clear the smoke', 'You fed it oxygen.', true)] },
    ];
  },
  limited: { note: 'The remote CO2 release cable has parted.', remove: ['co2'], swap: { co2: () => [{ t: 'decide', q: 'Remote CO2 release is dead.', opts: [ok('Manual release at the CO2 room: two crew, radio, outside route'), no('Open the skylight and fight it from above', 'You ventilated the fire.', true), no('Go through the engine room to pull it there', 'Into the smoke without a line.', true)] }, { t: 'press', btn: 'man', say: 'Send the CO2 room team.', calm: 0 }] } },
  twists: [{ after: 'ga', steps: () => [{ t: 'wait', secs: 1.6, say: 'Blackout. The generators have tripped.' }, { t: 'decide', q: 'Blackout during the fire.', opts: [ok('Emergency generator and emergency fire pump; carry on with the fire plan'), no('Send engineers back in to restart the generators', 'Into a burning engine room.', true), no('Abandon ship now', 'Too early: the boundaries are holding.')] }] }],
};

const playmaker = {
  id: 'reads', title: 'Playmaker: Two-Second Reads', kind: 'REGULAR', env: { time: 'day' }, brief: 'Central midfield. The ball keeps coming to you. Decide before it arrives.',
  debrief: ['Scan before you receive. The decision is made before the touch.', 'Draw the defender, then release.', 'A head injury stops the game. Always.'],
  build() {},
  steps(c) {
    const q = (text, a, b, d) => ({ t: 'decide', time: 7, q: text, opts: [ok(a), no(b[0], b[1]), no(d[0], d[1])] }); const F = c.F;
    return [
      q('You receive facing your own goal, pressed from behind. Full-back free on your open side.', 'One touch out to the free full-back', ['Turn into the press', 'Dispossessed 30 m from goal.'], ['Long ball forward, blind', 'Straight to their centre-back.']),
      q('3 v 2 break. You carry the ball. The defender commits to you.', 'Draw him, then slip the free runner', ['Shoot from 30 m', 'Wasted an overload.'], ['Slow down and wait', 'The defence recovered.']),
      { key: 'warm', t: 'intercept', shots: [0, 1, 2, 3].map(() => ({ from: [rand(-6, 6), F + 0.3, -9], to: [rand(-0.4, 0.4), rand(0.05, 0.45), 0.08], T: 1.0, arc: rand(0.2, 0.8) })), gap: 1.5, reach: 0.13, hitMsg: 'Controlled.', missMsg: 'Lost it.', say: 'Passes are fizzed in at you: get a hand on each as it arrives.' },
      q('89th minute, 1-0 up. You win the ball by their corner flag.', 'Shield it in the corner, win a throw or a foul', ['Cross into an empty box', 'Gave them the counter.'], ['Dribble back toward your half', 'Lost it in midfield.']),
      q('Your centre-back is down holding his head. The ball is live and a counter is on.', 'Put it out and call the referee: head injury first', ['Play on, it is 3 v 1', 'He was concussed and you played on.'], ['Shout at him to get up', 'Not your call to make.']),
      q('93rd-minute penalty. The keeper is in your face, pointing.', 'Your routine, your chosen spot', ['Change your mind in the run-up', 'Scuffed it wide.'], ['Argue with the keeper', 'Booked, then missed.']),
    ];
  },
  twists: [{ after: 'warm', steps: () => [{ t: 'decide', time: 6, q: 'Referee plays advantage after you are fouled. You are off balance, team-mate free wide.', opts: [ok('Play the simple pass and keep the advantage'), no('Go down and appeal', 'The advantage was gone.'), no('Force a shot', 'Blocked.')] }] }],
};

export const EXTRA = { surgeon: [incision], driver: [blowout], pilot: [depress], operator: [hoistSlip], mech: [loto], fishing: [flooding], navy: [erFire], sports: [playmaker] };
void metal; void sph;
