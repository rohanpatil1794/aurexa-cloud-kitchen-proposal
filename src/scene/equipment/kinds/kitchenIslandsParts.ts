// Shared parts for the kitchen islands and the pass: cabinets, benches, pots and pans.
// Every helper draws into the CURRENT frame (local ft, y = 0 floor) at the given centre.
import type { PrimBuilder } from '../../../lib/prims';
import { CHARCOAL, STEEL, STEEL_DARK, STEEL_MID, bench, crate } from '../../../lib/kit';

/** Worktop height of every island, the pass and the hot-holding unit, ft. */
export const TOP = 3;
/** Cast-iron grates and wok rings. */
export const IRON = '#262c2f';
/** Carbon-steel wok. */
export const WOK_STEEL = '#566066';
export const COPPER = '#b8672f';
/** Wooden handles and boards. */
export const WOOD = '#6b4a32';

type Side = 'n' | 's' | 'e' | 'w';
/** Rotation that turns a local +z face towards each side of the cabinet. */
const FACE_RY: Record<Side, number> = { s: 0, e: 90, n: 180, w: 270 };

/** Door panels with handles on one face: `len` = face length, `half` = distance from the cabinet centre to the face. */
function doorFace(b: PrimBuilder, side: Side, n: number, len: number, half: number) {
  b.frame({ ry: FACE_RY[side] }, () => {
    const gap = 0.08;
    const pw = (len - 0.24 - (n - 1) * gap) / n;
    for (let i = 0; i < n; i++) {
      const cx = -len / 2 + 0.12 + pw / 2 + i * (pw + gap);
      b.box({ m: 'steel', c: STEEL, x: cx, y: 0.5, z: half + 0.01, w: pw, h: 2.2, d: 0.04 });
      b.box({ m: 'matte', c: CHARCOAL, x: cx + pw / 2 - 0.16, y: 1.5, z: half + 0.05, w: 0.05, h: 0.42, d: 0.05, shadow: false });
    }
  });
}

/**
 * Closed stainless base cabinet: kick plinth in the island's accent colour, body, worktop, and door
 * panels on the faces listed in `doors` (number of doors per side).
 */
export function cabinet(
  b: PrimBuilder,
  o: { x: number; z: number; w: number; d: number; accent: string; doors?: Partial<Record<Side, number>> },
) {
  b.frame({ x: o.x, z: o.z }, () => {
    b.box({ m: 'matte', c: o.accent, w: o.w - 0.2, h: 0.3, d: o.d - 0.2 });
    b.box({ m: 'steel', c: STEEL_MID, y: 0.3, w: o.w - 0.06, h: TOP - 0.42, d: o.d - 0.06 });
    b.box({ m: 'steel', c: STEEL, y: TOP - 0.12, w: o.w + 0.06, h: 0.12, d: o.d + 0.06 });
    for (const side of ['n', 's', 'e', 'w'] as const) {
      const n = o.doors?.[side];
      if (!n) continue;
      const along = side === 'n' || side === 's';
      doorFace(b, side, n, along ? o.w : o.d, (along ? o.d : o.w) / 2 - 0.03);
    }
  });
}

/** Open stainless prep bench (legs + undershelf) with pans, a stockpot or a crate loaded on the undershelf. */
export function openBench(b: PrimBuilder, o: { x: number; z: number; w: number; d: number; seed?: number }) {
  bench(b, { x: o.x, z: o.z, w: o.w, d: o.d, h: TOP, top: STEEL });
  b.frame({ x: o.x, z: o.z }, () => {
    const n = Math.max(2, Math.round(o.w / 1.6));
    for (let i = 0; i < n; i++) {
      const x = -o.w / 2 + (i + 0.5) * (o.w / n);
      switch ((i + (o.seed ?? 0)) % 3) {
        case 0:
          for (let k = 0; k < 3; k++) b.box({ m: 'steel', c: k === 2 ? STEEL : STEEL_DARK, x, y: 0.67 + k * 0.16, w: 1, h: 0.14, d: 0.7 });
          break;
        case 1:
          b.cyl({ m: 'steel', c: STEEL, x, y: 0.67, r: 0.34, h: 0.7 });
          b.cyl({ m: 'steel', c: STEEL_DARK, x, y: 1.37, r: 0.37, h: 0.05 });
          break;
        default:
          crate(b, { x, y: 0.67, w: 1, d: 0.8, h: 0.6 });
      }
    }
  });
}

/** Lidded pot standing on y. `copper` = polished copper, otherwise stainless. */
export function pot(b: PrimBuilder, o: { x: number; y: number; z: number; r: number; h: number; copper?: boolean }) {
  const m = o.copper ? 'gloss' : 'steel';
  const c = o.copper ? COPPER : STEEL;
  b.cyl({ m, c, x: o.x, y: o.y, z: o.z, r: o.r, h: o.h });
  b.cyl({ m, c: o.copper ? COPPER : STEEL_DARK, x: o.x, y: o.y + o.h, z: o.z, r: o.r + 0.03, h: 0.05 });
  b.cyl({ m: 'matte', c: CHARCOAL, x: o.x, y: o.y + o.h + 0.05, z: o.z, r: 0.05, h: 0.07, shadow: false });
}

/** Gastronorm pan with a coloured fill, resting on y. */
export function pan(b: PrimBuilder, o: { x: number; y: number; z: number; w: number; d: number; food: string }) {
  b.box({ m: 'steel', c: STEEL_DARK, x: o.x, y: o.y, z: o.z, w: o.w, h: 0.1, d: o.d });
  b.box({ m: 'matte', c: o.food, x: o.x, y: o.y + 0.06, z: o.z, w: o.w - 0.14, h: 0.06, d: o.d - 0.14, shadow: false });
}

/** Plate with a steel cloche. */
export function cloche(b: PrimBuilder, o: { x: number; z: number; y?: number }) {
  const y = o.y ?? TOP;
  b.cyl({ m: 'gloss', c: '#f4f1ea', x: o.x, y, z: o.z, r: 0.5, h: 0.04 });
  b.sph({ m: 'steel', c: STEEL, x: o.x, y: y + 0.04, z: o.z, r: 0.42, sy: 0.8 });
  b.sph({ m: 'steel', c: STEEL_DARK, x: o.x, y: y + 0.38, z: o.z, r: 0.07 });
}
