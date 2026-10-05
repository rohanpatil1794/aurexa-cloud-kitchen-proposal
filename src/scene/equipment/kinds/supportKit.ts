// Shared constants and small helpers for the Support & Utilities kind builders (support*.ts in this folder).
import * as THREE from 'three';
import type { PrimBuilder } from '../../../lib/prims';
import { CHARCOAL, STEEL, STEEL_DARK, STEEL_MID } from '../../../lib/kit';

export { CHARCOAL, STEEL, STEEL_DARK, STEEL_MID };

export const INK = '#2b3236';
export const CERAMIC = '#fbf9f3';
export const CERAMIC_SOILED = '#dcd3c0';
/** Underside of the overhead services (cable tray), ft above the floor. */
export const TRAY_Y = 7.3;

const _a = new THREE.Color();
const _b = new THREE.Color();

/** Mix colour `c` towards white (t > 0) or black (t < 0) by |t|. */
export function shade(c: string, t: number): string {
  _a.set(c);
  return `#${_a.lerp(_b.set(t > 0 ? '#ffffff' : '#000000'), Math.abs(t)).getHexString()}`;
}

/** Flat plate lying on the floor (floors are at y 0.02). */
export function floorPlate(
  b: PrimBuilder,
  o: { x?: number; z?: number; w: number; d: number; c: string; y?: number; h?: number },
): void {
  b.box({ m: 'matte', c: o.c, x: o.x, z: o.z, y: o.y ?? 0.03, w: o.w, h: o.h ?? 0.02, d: o.d, shadow: false });
}

/** A stack of plates, bowls or trays drawn as one cylinder. Returns the y of its top. */
export function stack(
  b: PrimBuilder,
  o: { x: number; z: number; y: number; n: number; r?: number; c?: string; pitch?: number },
): number {
  const h = o.n * (o.pitch ?? 0.05);
  b.cyl({ m: 'gloss', c: o.c ?? CERAMIC, x: o.x, y: o.y, z: o.z, r: o.r ?? 0.4, h, shadow: false });
  return o.y + h;
}

/** Plates standing on edge in a row along x, their faces towards +z. `y` is the surface they stand on. */
export function plateRow(
  b: PrimBuilder,
  o: { x: number; z: number; y: number; n: number; r?: number; pitch?: number; c?: string },
): void {
  const r = o.r ?? 0.36, pitch = o.pitch ?? 0.2;
  for (let i = 0; i < o.n; i++) {
    b.cyl({
      m: 'gloss', c: o.c ?? CERAMIC, x: o.x + (i - (o.n - 1) / 2) * pitch, y: o.y + r - 0.02, z: o.z,
      r, h: 0.04, rx: 90, shadow: false,
    });
  }
}

/** Stack of steel trays (gastronorm / serving trays): thin slabs with a small offset each. */
export function trays(
  b: PrimBuilder,
  o: { x: number; z: number; y: number; n: number; w?: number; d?: number; c?: string },
): void {
  for (let i = 0; i < o.n; i++) {
    b.box({
      m: 'steel', c: o.c ?? STEEL, x: o.x + (i % 2 ? 0.04 : -0.03), z: o.z + (i % 3 ? 0.02 : -0.03),
      y: o.y + i * 0.09, w: o.w ?? 1.1, h: 0.07, d: o.d ?? 0.8, shadow: false,
    });
  }
}

/** Small castor wheel (axis along x) standing on the floor at (x, z). */
export function castor(b: PrimBuilder, x: number, z: number, r = 0.15): void {
  b.cyl({ m: 'matte', c: INK, x, y: r - 0.04, z, r, h: 0.08, rz: 90, shadow: false });
}

/** Top surfaces of the three trolley shelves (see trolleyFrame), ft. */
export const TROLLEY_TOPS = [0.51, 1.51, 2.51] as const;

/** Three-tier steel trolley: four posts, castors, three shelves and a push bar across the +x end. */
export function trolleyFrame(b: PrimBuilder, o: { w: number; d: number; grip: string }): void {
  const hx = (o.w - 0.2) / 2, hz = (o.d - 0.2) / 2;
  for (const px of [-1, 1]) {
    for (const pz of [-1, 1]) {
      b.box({ m: 'steel', c: STEEL_DARK, x: px * (hx - 0.04), z: pz * (hz - 0.04), y: 0.3, w: 0.07, h: 3.15, d: 0.07 });
      castor(b, px * (hx - 0.1), pz * (hz - 0.1));
    }
  }
  for (const top of TROLLEY_TOPS) b.box({ m: 'steel', c: STEEL, y: top - 0.06, w: hx * 2, h: 0.06, d: hz * 2 });
  b.pipe({ m: 'matte', c: o.grip, a: [hx - 0.04, 3.3, -hz + 0.04], b: [hx - 0.04, 3.3, hz - 0.04], r: 0.05, shadow: true });
}
