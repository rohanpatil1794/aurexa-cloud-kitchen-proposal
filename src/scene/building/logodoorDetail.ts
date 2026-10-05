// Small parts of the logo door, drawn as instanced primitives in the door's local frame (see
// logodoorGeometry.ts): reveals and threshold, the leaf's raised panels / mullions / ironmongery,
// the "STAFF ENTRANCE" name board, a bracket lamp and the leafy plant in its pot.
import * as THREE from 'three';
import { PrimBuilder } from '../../lib/prims';
import { BRAND, SCENE } from '../../lib/palette';
import { LAMP, POT, SPEC, rng } from './logodoorGeometry';

export const DOOR_COLORS = {
  cream: '#f7e6c6',
  sand: '#dcb577',
  terracotta: '#bd5528',
  teal: '#1b605e',
  tealPanelEdge: '#36908a',
  tealPanelField: '#206b68',
  brass: SCENE.brass,
  lamp: '#ffd9a0',
} as const;

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _side = new THREE.Vector3();

/** Euler (rz = tilt from vertical, ry = heading) that points a primitive's local +y along `d`. */
function aim(d: THREE.Vector3): { rz: number; ry: number } {
  const tilt = Math.acos(THREE.MathUtils.clamp(d.y, -1, 1));
  return { rz: THREE.MathUtils.radToDeg(tilt), ry: THREE.MathUtils.radToDeg(Math.atan2(d.z, -d.x)) };
}

/** Leafy plant: a handful of slender stems with olive / green blade leaves, leaning towards the door. */
function plant(b: PrimBuilder, x: number, y: number, z: number): void {
  const rand = rng(11);
  b.frame({ x, y, z }, () => {
    const stems = 6;
    for (let i = 0; i < stems; i++) {
      const az = (i / stems) * Math.PI * 2 + rand() * 0.6;
      const lean = THREE.MathUtils.degToRad(8 + rand() * 20);
      const len = 1.9 + rand() * 1.6 - (i % 2) * 0.5;
      const dir = new THREE.Vector3(Math.sin(lean) * Math.cos(az) + 0.16, Math.cos(lean), Math.sin(lean) * Math.sin(az)).normalize();
      const tip = dir.clone().multiplyScalar(len);
      b.pipe({ m: 'matte', c: '#6b7438', a: [0, 0, 0], b: [tip.x, tip.y, tip.z], r: 0.022, shadow: false });
      // side axis perpendicular to the stem; leaves alternate left / right and grow towards the tip
      const side = _side.crossVectors(dir, UP).normalize();
      const n = 7;
      for (let k = 0; k < n; k++) {
        const t = 0.3 + (0.7 * k) / (n - 1);
        const sgn = k % 2 ? 1 : -1;
        const ld = _a.copy(dir).multiplyScalar(0.5).addScaledVector(side, 0.85 * sgn).addScaledVector(UP, 0.22).normalize();
        const r = 0.2 + 0.07 * (1 - Math.abs(t - 0.62));
        const c = _b.copy(dir).multiplyScalar(len * t).addScaledVector(ld, r * 0.95);
        b.sph({ m: 'matte', c: (i + k) % 3 ? BRAND.olive : SCENE.foliageGreen, r, sx: 0.46, sz: 0.17, x: c.x, y: c.y, z: c.z, ...aim(ld), shadow: false });
      }
      b.sph({ m: 'matte', c: SCENE.foliageGreen, r: 0.22, sx: 0.44, sz: 0.17, x: tip.x + dir.x * 0.2, y: tip.y + dir.y * 0.2, z: tip.z + dir.z * 0.2, ...aim(dir), shadow: false });
    }
  });
}

export function buildDoorDetail(): PrimBuilder {
  const b = new PrimBuilder();
  const { halfW, reveal, face, openH, leaf, fan, surroundD, step } = SPEC;
  const C = DOOR_COLORS;
  const wallD = face * 2 + 0.01;

  // reveals, head liner and the terracotta threshold plate that runs on through the opening
  for (const sx of [-1, 1]) b.box({ c: C.cream, x: sx * (halfW - reveal / 2), w: reveal, h: openH - reveal, d: wallD });
  b.box({ c: C.cream, y: openH - reveal, w: halfW * 2, h: reveal, d: wallD });
  b.box({ c: C.terracotta, w: (halfW - reveal) * 2, h: step.h, d: wallD });

  // leaf details (leaf-local frame: hinge on x = 0, +x towards the free edge, leaf front = +z)
  b.frame({ x: leaf.hingeX, z: leaf.hingeZ, ry: leaf.angle }, () => {
    const half = leaf.t / 2;
    for (const s of [1, -1]) {
      // two raised panels under the fan-light
      for (const px of [0.36 + 0.42, 1.56 + 0.42]) {
        b.box({ c: C.tealPanelEdge, x: px, y: 0.9, z: s * (half + 0.02), w: 0.84, h: 3.7, d: 0.04 });
        b.box({ c: C.tealPanelField, x: px, y: 1.0, z: s * (half + 0.055), w: 0.64, h: 3.5, d: 0.03 });
      }
      // brass door knob on the free edge: rose, neck, ball
      const kx = leaf.w - 0.2;
      const ky = 3.05;
      b.cyl({ m: 'brass', c: C.brass, r: 0.12, h: 0.03, x: kx, y: ky - 0.015, z: s * (half + 0.015), rx: 90 });
      b.cyl({ m: 'brass', c: C.brass, r: 0.035, h: 0.16, x: kx, y: ky - 0.08, z: s * (half + 0.1), rx: 90 });
      b.sph({ m: 'brass', c: C.brass, r: 0.1, x: kx, y: ky, z: s * (half + 0.2) });
    }
    // glints on the upper-left panel, as in the logo
    for (const gx of [0.5, 0.6]) {
      b.box({ c: '#7fc0bd', x: gx + 0.12, y: 3.95, z: half + 0.073, w: 0.035, h: 0.55, d: 0.006, rz: -22, shadow: false });
    }
    // fan-light mullions: five spokes from the base centre and a hub
    for (let a = 30; a <= 150; a += 30) {
      const rad = (a * Math.PI) / 180;
      b.box({ c: C.teal, x: fan.cx + (Math.cos(rad) * fan.r) / 2, y: fan.base + (Math.sin(rad) * fan.r) / 2 - 0.025, w: fan.r, h: 0.05, d: 0.1, rz: a, shadow: false });
    }
    b.cyl({ c: C.teal, r: 0.07, h: 0.1, x: fan.cx, y: fan.base - 0.05, rx: 90, shadow: false });
    // brass hinge barrels on the inside edge
    for (const hy of [0.9, 3.5, 6.0]) b.cyl({ m: 'brass', c: C.brass, r: 0.045, h: 0.38, x: 0, y: hy, z: 0 });
  });

  // name board on the head band
  b.sign({
    text: 'STAFF ENTRANCE', x: 0, y: 7.2, z: face + surroundD + 0.004, w: 3.1, h: 0.3,
    fg: '#17595a', tracking: 0.34, weight: 700,
  });

  // bracket lamp on the east jamb: arm, cap, glowing pane, base
  const { x: lx, y: ly, z: lz } = LAMP;
  b.pipe({ m: 'brass', c: C.brass, a: [lx - 0.47, ly, lz], b: [lx, ly, lz], r: 0.025, shadow: false });
  b.cone({ m: 'brass', c: '#7a5f33', r: 0.14, h: 0.12, x: lx, y: ly, z: lz });
  b.cyl({ m: 'emissive', c: C.lamp, r: 0.085, h: 0.3, x: lx, y: ly - 0.3, z: lz });
  b.cyl({ m: 'brass', c: '#7a5f33', r: 0.1, h: 0.04, x: lx, y: ly - 0.34, z: lz });

  // soil and plant in the pot
  b.cyl({ c: '#4a3426', r: 0.41, h: 0.03, x: POT.x, y: 0.95, z: POT.z, shadow: false });
  plant(b, POT.x, 0.98, POT.z);
  return b;
}
