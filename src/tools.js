import { THREE, M, metal, glass, glow, box, cyl, sph, tor, cone } from './core.js';

// Procedural hand tools. Returns a group; userData.lie = rest tilt, userData.tip = working tip offset.
export function toolMesh(kind, color = 0x90a4ae) {
  const g = new THREE.Group(); let lie = 1.45, tip = [0, -0.07, 0];
  const st = metal(0xd5dbe1, 0.2), col = M(color, { r: 0.42 }), dark = M(0x20242a, { r: 0.6 });
  const flat = (t = [0, -0.012, 0]) => { lie = 0; tip = t; };
  switch (kind) {
    case 'scalpel': cyl(g, 0.0045, 0.0045, 0.09, st, 0, 0.005, 0, 8); box(g, 0.0015, 0.032, 0.009, metal(0xf2f6f9, 0.08), 0, -0.054, 0); break;
    case 'forceps': box(g, 0.004, 0.12, 0.003, st, -0.004, -0.01, 0).rotation.z = 0.05; box(g, 0.004, 0.12, 0.003, st, 0.004, -0.01, 0).rotation.z = -0.05; break;
    case 'clamp': case 'driver': {
      const c2 = kind === 'driver' ? metal(0xd4af37, 0.3) : st;
      tor(g, 0.011, 0.0025, c2, -0.012, 0.05, 0); tor(g, 0.011, 0.0025, c2, 0.012, 0.05, 0);
      box(g, 0.004, 0.1, 0.004, st, -0.004, -0.01, 0).rotation.z = 0.1; box(g, 0.004, 0.1, 0.004, st, 0.004, -0.01, 0).rotation.z = -0.1;
      if (kind === 'driver') tor(g, 0.011, 0.0012, st, 0, -0.06, 0, Math.PI).rotation.z = Math.PI;
      break;
    }
    case 'retractor': box(g, 0.012, 0.1, 0.003, st, 0, 0, 0); box(g, 0.012, 0.003, 0.03, st, 0, -0.05, 0.014); tip = [0, -0.05, 0]; break;
    case 'syringe': cyl(g, 0.008, 0.008, 0.06, glass(0xdff3ff, 0.55), 0, 0, 0, 12); cyl(g, 0.0065, 0.0065, 0.03, col, 0, -0.012, 0, 10); cyl(g, 0.012, 0.012, 0.003, 0xffffff, 0, 0.05, 0, 12); cyl(g, 0.003, 0.003, 0.022, 0xffffff, 0, 0.04, 0, 8); cyl(g, 0.0012, 0.0005, 0.04, st, 0, -0.05, 0, 6); break;
    case 'needle': cyl(g, 0.006, 0.004, 0.03, col, 0, 0.02, 0, 10); cyl(g, 0.0016, 0.0006, 0.075, st, 0, -0.032, 0, 6); break;
    case 'injector': cyl(g, 0.011, 0.011, 0.11, col, 0, -0.005, 0, 14); cyl(g, 0.0115, 0.0115, 0.02, 0xff7043, 0, -0.06, 0, 14); cyl(g, 0.0115, 0.0115, 0.012, 0x1565c0, 0, 0.056, 0, 14); break;
    case 'suction': cyl(g, 0.005, 0.003, 0.13, glass(0xffffff, 0.6), 0, -0.005, 0, 10); cyl(g, 0.008, 0.008, 0.03, 0x1e88e5, 0, 0.05, 0, 10); break;
    case 'probe': cyl(g, 0.006, 0.005, 0.085, col, 0, 0.01, 0, 10); cyl(g, 0.0018, 0.0006, 0.04, st, 0, -0.05, 0, 6); break;
    case 'pen': cyl(g, 0.005, 0.005, 0.11, col, 0, 0, 0, 10); cone(g, 0.005, 0.014, dark, 0, -0.062, 0).rotation.x = Math.PI; break;
    case 'knife': box(g, 0.012, 0.07, 0.008, col, 0, 0.03, 0); box(g, 0.001, 0.075, 0.014, metal(0xeef2f5, 0.1), 0, -0.035, 0); break;
    case 'wrench': box(g, 0.012, 0.13, 0.005, st, 0, -0.005, 0); tor(g, 0.012, 0.004, st, 0, -0.07, 0); tor(g, 0.01, 0.004, st, 0, 0.068, 0, Math.PI * 1.5); break;
    case 'torque': cyl(g, 0.006, 0.006, 0.15, st, 0, 0.01, 0, 10); cyl(g, 0.011, 0.011, 0.06, M(0x111111, { r: 0.9 }), 0, 0.06, 0, 12); cyl(g, 0.013, 0.013, 0.022, st, 0, -0.07, 0, 12); box(g, 0.02, 0.012, 0.004, glow(0xffd54f, 0.4), 0, -0.02, 0.008); tip = [0, -0.085, 0]; break;
    case 'hammer': cyl(g, 0.007, 0.007, 0.14, M(0x8d6e63), 0, 0.01, 0, 10); box(g, 0.05, 0.022, 0.022, st, 0, -0.065, 0); break;
    case 'screwdriver': cyl(g, 0.011, 0.009, 0.06, col, 0, 0.04, 0, 12); cyl(g, 0.003, 0.003, 0.08, st, 0, -0.03, 0, 8); break;
    case 'pipette': cyl(g, 0.004, 0.002, 0.11, glass(0xe8f6ff, 0.6), 0, -0.015, 0, 8); sph(g, 0.012, col, 0, 0.05, 0, 12); break;
    case 'stick': cyl(g, 0.006, 0.006, 0.13, col, 0, 0, 0, 10); tip = [0, -0.065, 0]; break;
    case 'bung': cone(g, 0.022, 0.07, col, 0, -0.02, 0, 14).rotation.x = Math.PI; lie = 1.2; tip = [0, -0.05, 0]; break;
    case 'extinguisher': cyl(g, 0.028, 0.028, 0.12, 0xc62828, 0, 0, 0, 16); cyl(g, 0.01, 0.014, 0.025, dark, 0, 0.07, 0, 10); cyl(g, 0.006, 0.01, 0.04, dark, 0.03, 0.06, 0, 8).rotation.z = -1.2; lie = 0; tip = [0, -0.02, 0]; break;
    // ---- flat items ----
    case 'pad': box(g, 0.075, 0.006, 0.095, col, 0, 0, 0); box(g, 0.05, 0.002, 0.07, 0xeceff1, 0, 0.004, 0); flat(); break;
    case 'gauze': box(g, 0.06, 0.012, 0.06, M(0xfafafa, { r: 1 }), 0, 0, 0); flat(); break;
    case 'cloth': box(g, 0.085, 0.008, 0.07, M(color, { r: 1 }), 0, 0, 0); flat(); break;
    case 'blanket': box(g, 0.11, 0.02, 0.09, M(color, { r: 1 }), 0, 0, 0); flat(); break;
    case 'seal': cyl(g, 0.035, 0.035, 0.004, glass(0xe0f7fa, 0.7), 0, 0, 0, 20); cyl(g, 0.008, 0.008, 0.008, col, 0, 0.004, 0, 10); flat(); break;
    case 'mask': { const m = sph(g, 0.045, glass(color, 0.55), 0, 0, 0, 16); m.scale.set(1, 0.7, 0.8); cyl(g, 0.012, 0.012, 0.03, dark, 0, -0.035, 0.01, 10); tor(g, 0.05, 0.003, 0x263238, 0, 0, -0.02); flat([0, 0, 0]); break; }
    case 'tape': tor(g, 0.022, 0.011, col, 0, 0, 0).rotation.x = Math.PI / 2; flat(); break;
    case 'can': cyl(g, 0.02, 0.02, 0.06, metal(color, 0.3), 0, 0.012, 0, 16); flat(); break;
    case 'bottle': cyl(g, 0.02, 0.022, 0.07, glass(color, 0.6), 0, 0.02, 0, 14); cyl(g, 0.009, 0.012, 0.022, glass(color, 0.6), 0, 0.066, 0, 10); cyl(g, 0.01, 0.01, 0.01, 0xffffff, 0, 0.08, 0, 10); flat([0, 0.02, 0]); break;
    case 'flask': cone(g, 0.032, 0.06, glass(0xeaf6ff, 0.35), 0, 0.02, 0, 18); cyl(g, 0.009, 0.009, 0.035, glass(0xeaf6ff, 0.35), 0, 0.062, 0, 10); cyl(g, 0.026, 0.03, 0.016, glass(color, 0.75), 0, -0.001, 0, 16); flat([0, 0.02, 0]); break;
    case 'ring': tor(g, 0.055, 0.016, col, 0, 0, 0).rotation.x = Math.PI / 2; flat([0, 0, 0]); break;
    case 'lock': box(g, 0.03, 0.026, 0.012, col, 0, 0, 0); tor(g, 0.011, 0.003, st, 0, 0.016, 0, Math.PI); flat([0, 0, 0]); break;
    case 'tag': box(g, 0.035, 0.002, 0.06, col, 0, 0, 0); box(g, 0.022, 0.003, 0.03, 0xffffff, 0, 0.001, 0.008); flat([0, 0, 0]); break;
    case 'fuse': cyl(g, 0.007, 0.007, 0.04, glass(0xfff8e1, 0.7), 0, 0, 0, 10).rotation.z = Math.PI / 2; cyl(g, 0.0075, 0.0075, 0.008, st, -0.02, 0, 0, 10).rotation.z = Math.PI / 2; cyl(g, 0.0075, 0.0075, 0.008, st, 0.02, 0, 0, 10).rotation.z = Math.PI / 2; flat([0, 0, 0]); break;
    case 'resistor': cyl(g, 0.006, 0.006, 0.026, M(0xd7b98e), 0, 0, 0, 10).rotation.z = Math.PI / 2; box(g, 0.004, 0.0125, 0.0125, col, -0.006, 0, 0); box(g, 0.004, 0.0125, 0.0125, 0x111111, 0.004, 0, 0); cyl(g, 0.001, 0.001, 0.07, st, 0, 0, 0, 6).rotation.z = Math.PI / 2; flat([0, 0, 0]); break;
    case 'led': sph(g, 0.009, glow(color, 0.6), 0, 0.01, 0, 12); cyl(g, 0.009, 0.01, 0.008, glass(color, 0.8), 0, 0.002, 0, 12); cyl(g, 0.0008, 0.0008, 0.03, st, -0.004, -0.014, 0, 5); cyl(g, 0.0008, 0.0008, 0.024, st, 0.004, -0.011, 0, 5); flat([0, 0, 0]); break;
    case 'battery': box(g, 0.05, 0.032, 0.028, col, 0, 0.004, 0); box(g, 0.05, 0.008, 0.028, 0x212121, 0, 0.024, 0); cyl(g, 0.004, 0.004, 0.006, st, -0.014, 0.031, 0, 8); cyl(g, 0.006, 0.006, 0.006, st, 0.014, 0.031, 0, 8); flat([0, 0, 0]); break;
    case 'wire': tor(g, 0.022, 0.003, col, 0, 0, 0, Math.PI * 1.6).rotation.x = Math.PI / 2; flat([0, 0, 0]); break;
    case 'zip': box(g, 0.003, 0.002, 0.09, col, 0, 0, 0); box(g, 0.008, 0.005, 0.008, col, 0, 0, 0.045); flat([0, 0, 0]); break;
    case 'strap': box(g, 0.1, 0.004, 0.03, col, 0, 0, 0); box(g, 0.02, 0.008, 0.034, dark, 0.03, 0.002, 0); flat([0, 0, 0]); break;
    case 'slide': box(g, 0.06, 0.002, 0.022, glass(0xeaf6ff, 0.5), 0, 0, 0); box(g, 0.012, 0.0025, 0.012, col, 0, 0.001, 0); flat([0, 0, 0]); break;
    case 'detector': box(g, 0.045, 0.02, 0.075, col, 0, 0, 0); box(g, 0.032, 0.004, 0.028, glow(0x9ccc65, 0.7), 0, 0.011, -0.012); flat([0, 0, 0]); break;
    case 'ball': sph(g, 0.03, col, 0, 0.01, 0, 16); flat([0, 0.01, 0]); break;
    case 'hose': cyl(g, 0.012, 0.012, 0.09, col, 0, 0, 0, 12).rotation.z = Math.PI / 2; flat([0, 0, 0]); break;
    default: box(g, 0.045, 0.03, 0.045, col, 0, 0.005, 0); flat([0, 0, 0]);
  }
  g.userData.lie = lie; g.userData.tip = tip;
  return g;
}
