// Small shared pieces for the production-group kind builders (bakery, receiving, dessert, packing, dispatch).
import type { PrimBuilder, PrimMat } from '../../../lib/prims';
import { BRAND } from '../../../lib/palette';

/** Kraft-paper tones, a little deep: the key light bleaches pale browns. */
export const KRAFT = ['#b88650', '#c99a61', '#a67845'] as const;
export const KRAFT_FOLD = '#8f6535';
export const WOOD = '#a67c52';
export const INK = '#2b3236';
export const TEAL_DEEP = '#164f4d';
/** Painted / powder-coated steel panels for big vertical faces: bright metal there would only mirror the dark stage. */
export const PANEL = '#aab5be';
export const PANEL_LIGHT = '#c3ccd3';

/** Deterministic random numbers in [0, 1), seeded by a string, so stock layouts are stable between renders. */
export function seeded(key: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(rnd: () => number, list: readonly T[]): T => list[Math.floor(rnd() * list.length)];

/** Horizontal cylinder with its axis along x, centred at (x, y, z). */
export function rodX(b: PrimBuilder, o: { x?: number; y: number; z?: number; r: number; len: number; c: string; m?: PrimMat }) {
  b.cyl({ m: o.m ?? 'matte', c: o.c, r: o.r, h: o.len, rz: 90, x: o.x, z: o.z, y: o.y - o.len / 2, shadow: false });
}

/** Folded paper bag standing on the floor of the current frame (x, y, z = centre of its base). */
export function bag(
  b: PrimBuilder,
  o: { x: number; y: number; z: number; w?: number; h?: number; d?: number; c?: string; tape?: boolean; ry?: number },
) {
  const w = o.w ?? 0.62, h = o.h ?? 0.85, d = o.d ?? 0.42;
  b.frame({ x: o.x, y: o.y, z: o.z, ry: o.ry }, () => {
    b.box({ m: 'matte', c: o.c ?? KRAFT[0], w, h, d });
    b.box({ m: 'matte', c: KRAFT_FOLD, y: h - 0.12, w: w + 0.01, h: 0.12, d: d + 0.01, shadow: false });
    if (o.tape) b.box({ m: 'matte', c: BRAND.teal, y: h - 0.34, z: d / 2 + 0.005, w: w * 0.8, h: 0.09, d: 0.02, shadow: false });
  });
}
