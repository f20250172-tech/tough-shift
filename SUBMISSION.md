# TOUGH SHIFT: Devpost submission kit

Copy each block into the matching field of the submission form.

**Submission name**
TOUGH SHIFT

**Tagline (under 140 characters)**
Hands-first pressure drills for people who can't afford mistakes: less kit, less time, and you still have to find the way through.

**Track**
Productivity (a 10-minute skills habit before your real shift). Gaming is a defensible second choice if you prefer it.

**Division**
New Experience (built entirely inside the competition window).

**Build link**
Your GitHub Pages URL, e.g. `https://<your-user>.github.io/tough-shift/`

**Description (about 300 words)**

*Inspiration.* The people we trust most (surgeons, pilots, crane operators, deckhands, medics) are not tested by the textbook case. They are tested when the clamp is missing, the display is dead, the clock is short and three things need them at once. Simulators for that cost millions and need a room. We wanted ten minutes of it, seated, with nothing but your hands.

*What it does.* TOUGH SHIFT is 20 scenario drills across 10 worlds: emergency room, operating theatre, truck cab, flight deck, crane cab, workshop, trawler deck, ship's bridge, stadium and student lab. Every drill mixes hands-on work (trace an incision, hold a clamp steady, compress a chest in rhythm, fly a sidestick, land a swinging load, torque bolts in sequence) with fast judgement calls that have few right answers and real consequences.

Two ideas drive it:
- **Aids that fade.** Three levels (Trainee, Pro, Expert) control mentor text, highlight arrows, ghost paths, tool steadying and lane assist. A MENTOR button gives help on demand at a score cost.
- **Pressure dials.** Limited tools, less time, tight precision, more at once, surprise twist. With limited tools on, the right instrument is gone and you must improvise, sometimes by fabricating a new tool from two items on the tray.

Adaptive Shift tracks six skills (precision, procedure, judgement, speed, adaptability, composure) and picks the next drill and pressure for your weakest one. The debrief explains every error and how the best do it.

*How we built it.* One self-contained WebXR page: Three.js, WebXR hand tracking, PBR materials with image-based lighting and soft shadows, procedural environments and audio, no external assets. A data-driven step engine and an automated bot that plays every drill end to end on each build.

*What's next.* More professions and labs, two-player crew drills, instructor-authored scenarios, and review by practising professionals. It is a training game, not certified instruction.

**How hand interactions are implemented (optional field)**
Everything is direct and within a seated arm's reach. A fingertip pokes buttons (edge-triggered volume test with cooldown and a scene-change lock so nothing fires by accident). A thumb-index pinch with hysteresis grabs tools, levers, joysticks and wheels; held tools follow the pinch point with an optional steadying filter. Chest compressions and hand-pumping are detected from fingertip and palm height with rhythm scoring. Goalkeeping uses fingertip and palm proximity to the ball. A "sticky grip" option (pinch once to hold, again to release), reduced-motion mode and a recenter button cover accessibility and comfort. Controllers work as a fallback but are never needed.

**Target launch date**
Pick a date (suggestion: Q1 2027).

---

## 3-minute video shot list
1. 0:00 Home menu: 10 worlds. Poke "Surgeons".
2. 0:10 Drill list: turn on **Limited tools**, start **Bleeder!**
3. 0:20 Decision, gauze pressure, then the missing clamp: fabricate the swab-on-a-stick and hold it on the vessel.
4. 1:00 Debrief screen: grade, skill bars, "how the best do it".
5. 1:10 Pilots: **Engine Fire After V1**. Rotate, hold the roll, pull the correct thrust lever.
6. 1:50 Machine Operators: crane lift over the crew, hook camera.
7. 2:20 Sports: penalty saves with your hands.
8. 2:40 Student Labs: LED circuit, then **Adaptive Shift** button. End on the title.

## Hosting in 4 steps
1. github.com → New repository → name `tough-shift` → Public → Create.
2. "uploading an existing file" → upload `index.html` and `README.md` → Commit.
3. Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save.
4. Wait about a minute, open `https://<your-user>.github.io/tough-shift/` in the Quest browser, press ENTER VR.
