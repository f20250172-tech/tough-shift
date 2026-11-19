import { init, debug } from './engine.js';
import { ENVS } from './envs.js';
import { CATS } from './drills.js';
import { EXTRA } from './drills2.js';
for (const c of CATS) if (EXTRA[c.id]) c.drills.push(...EXTRA[c.id]);
init(CATS, ENVS); window.__ts = debug;
