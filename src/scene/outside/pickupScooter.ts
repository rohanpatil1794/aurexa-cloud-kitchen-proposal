// A compact, stylised parked scooter built from primitives. Local frame as in lib/prims.ts: origin on the
// ground at the middle of the scooter, +z = the front (nose), +x = the rider's right. About 3.9 ft long.
import type { PrimBuilder } from '../../lib/prims';
import { SCENE } from '../../lib/palette';

export interface ScooterStyle {
  /** Bodywork colour. */
  body: string;
  /** Delivery box and its lid. */
  box: string;
  /** Band round the box. */
  band: string;
}

const TIRE = '#29323a';
const SEAT = '#3b464c';
const CHROME = SCENE.stainlessDark;

export function scooter(b: PrimBuilder, s: ScooterStyle): void {
  // wheels: tyre + hub, axis along x
  for (const [z, r] of [[1.4, 0.44], [-1.15, 0.46]] as const) {
    b.cyl({ c: TIRE, r, h: 0.24, z, y: r - 0.12, rz: 90 });
    b.cyl({ m: 'steel', c: CHROME, r: r * 0.45, h: 0.27, z, y: r - 0.135, rz: 90, shadow: false });
  }

  // body: floorboard, rounded tail cowl, leg shield, handlebar cowl, front mudguard
  b.box({ c: s.body, y: 0.42, z: 0.42, w: 0.64, h: 0.16, d: 1.2 });
  b.box({ c: s.body, y: 0.45, z: -0.55, w: 0.78, h: 0.78, d: 1.4 });
  b.sph({ c: s.body, x: 0, y: 0.84, z: -1.25, r: 0.4, sy: 1, sz: 1.12 });
  b.box({ c: s.body, y: 0.55, z: 0.98, w: 0.68, h: 1.7, d: 0.11, rx: -14 });
  b.box({ c: s.body, y: 2.0, z: 1.02, w: 0.7, h: 0.32, d: 0.42 });
  b.box({ c: s.body, y: 0.93, z: 1.45, w: 0.26, h: 0.08, d: 0.78 });
  b.sph({ m: 'gloss', c: '#f6e3c2', x: 0, y: 2.14, z: 1.27, r: 0.12 });

  // seat, forks, handlebar, exhaust
  b.box({ c: SEAT, y: 1.23, z: -0.4, w: 0.6, h: 0.2, d: 1.1 });
  for (const sx of [-1, 1]) {
    b.pipe({ m: 'steel', c: CHROME, a: [sx * 0.16, 0.44, 1.4], b: [sx * 0.16, 1.95, 1.12], r: 0.035 });
    b.cyl({ c: SEAT, r: 0.05, h: 0.28, x: sx * 0.62, y: 2.21, z: 1.0, rz: 90, shadow: false });
  }
  b.cyl({ m: 'steel', c: CHROME, r: 0.035, h: 1.2, x: 0, y: 1.75, z: 1.0, rz: 90, shadow: false });
  b.cyl({ m: 'steel', c: CHROME, r: 0.07, h: 0.8, x: 0.42, y: 0.1, z: -0.9, rx: 90, shadow: false });

  // delivery box on a rack: body, lid, band, tail light
  b.box({ m: 'steel', c: CHROME, y: 1.4, z: -1.5, w: 0.9, h: 0.06, d: 1.0 });
  b.box({ c: s.box, y: 1.46, z: -1.5, w: 1.05, h: 1.0, d: 1.1 });
  b.box({ c: s.box, y: 2.44, z: -1.5, w: 1.09, h: 0.1, d: 1.14 });
  b.box({ c: s.band, y: 1.86, z: -1.5, w: 1.08, h: 0.16, d: 1.13, shadow: false });
  b.box({ m: 'emissive', c: '#ff5a43', y: 1.62, z: -2.06, w: 0.34, h: 0.08, d: 0.03 });
}
