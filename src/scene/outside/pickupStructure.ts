// Fixed pieces outside the building, drawn as primitives in WORLD coordinates (the group is not offset):
// the cantilevered rider canopy over the Delivery Partners Pickup Zone, the service step and bollards at the
// Waste service door, and the EXIT ground marker. Heights are for full-height walls; the canopy stands on
// slim wall-hugging posts so it also reads correctly with the 3.5 ft dollhouse walls.
import type { PrimBuilder } from '../../lib/prims';
import { BRAND } from '../../lib/palette';
import { OPENINGS, PICKUP_ZONE, WALL } from '../../data/layout';

/** South wall's outside face (z). */
export const WALL_FACE = 50 + WALL.outer / 2;

export const CANOPY = {
  x0: PICKUP_ZONE.x + 0.4,
  x1: PICKUP_ZONE.x + PICKUP_ZONE.w - 0.4,
  /** Projection from the wall face, ft. */
  depth: 2.5,
  /** Underside of the roof deck. */
  y: 8.85,
  /** Slim steel posts hugging the wall, in the gaps between the Dispatch / Rider doors. */
  posts: [1.1, 7, 14.5, 21],
} as const;

const TEAL = '#1a5f5d';
/** Painted light-grey steel (a metallic material reads near-black against the dark environment). */
const STEEL = '#b9c3cb';
const STEEL_DARK = '#a3afb8';

/** The roof deck: a pale, mostly transparent plate so the ground markings stay readable from above. */
export const CANOPY_DECK = {
  x: (CANOPY.x0 + CANOPY.x1) / 2,
  y: CANOPY.y + 0.1,
  z: WALL_FACE + CANOPY.depth / 2,
  w: CANOPY.x1 - CANOPY.x0,
  h: 0.2,
  d: CANOPY.depth,
} as const;

export function canopy(b: PrimBuilder): void {
  const { x0, x1, depth, y, posts } = CANOPY;
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const zc = WALL_FACE + depth / 2;
  const zEdge = WALL_FACE + depth;

  // teal fascia round the (separately drawn) deck
  b.box({ c: TEAL, x: cx, y: y - 0.2, z: zEdge - 0.06, w: w + 0.2, h: 0.62, d: 0.12 });
  for (const sx of [-1, 1]) b.box({ c: TEAL, x: cx + sx * (w / 2 + 0.04), y: y - 0.2, z: zc, w: 0.12, h: 0.62, d: depth });

  // purlins under the deck and one cantilever beam per post
  const ribs = 9;
  for (let i = 0; i < ribs; i++) {
    b.box({ c: STEEL, x: x0 + 0.3 + (i * (w - 0.6)) / (ribs - 1), y: y - 0.14, z: zc, w: 0.07, h: 0.14, d: depth - 0.1, shadow: false });
  }
  for (const px of posts) {
    b.box({ c: STEEL_DARK, x: px, y: y - 0.42, z: zc - 0.02, w: 0.16, h: 0.42, d: depth - 0.12 });
    b.box({ c: STEEL_DARK, x: px, z: WALL_FACE + 0.13, w: 0.24, h: y, d: 0.24 });
    // knee brace from the post up to the beam
    b.pipe({ m: 'matte', c: STEEL, a: [px, y - 1.85, WALL_FACE + 0.26], b: [px, y - 0.42, WALL_FACE + 1.69], r: 0.04, shadow: true });
  }

  // warm LED strip under the fascia
  b.box({ m: 'emissive', c: '#ffe3b4', x: cx, y: y - 0.24, z: zEdge - 0.16, w: w - 0.6, h: 0.04, d: 0.06 });
}

/** Low concrete step and a pair of steel bollards at the Waste service door. */
export function serviceStep(b: PrimBuilder): void {
  const door = OPENINGS.find((o) => o.id === 'waste-S25')!;
  const half = door.w / 2 + 0.2;
  b.box({ c: '#b8b2a3', x: door.c, z: WALL_FACE + 0.4, w: half * 2, h: 0.12, d: 0.8 });
  b.box({ c: BRAND.orange, x: door.c, y: 0.12, z: WALL_FACE + 0.75, w: half * 2, h: 0.01, d: 0.1, shadow: false });
  for (const sx of [-1, 1]) {
    const x = door.c + sx * (half + 0.55);
    b.cyl({ m: 'steel', c: STEEL, x, z: WALL_FACE + 0.7, r: 0.1, h: 1.7 });
    b.sph({ m: 'steel', c: STEEL, x, y: 1.7, z: WALL_FACE + 0.7, r: 0.1 });
    b.cyl({ c: BRAND.orange, x, y: 1.15, z: WALL_FACE + 0.7, r: 0.104, h: 0.16, shadow: false });
  }
}

/** Small green EXIT word painted on the ground outside the emergency exit. */
export function exitMarker(b: PrimBuilder): void {
  const door = OPENINGS.find((o) => o.id === 'exit-S57')!;
  b.sign({
    text: 'EXIT', x: door.c, y: 0.03, z: WALL_FACE + 0.55, w: 2.2, h: 0.55, rx: -90,
    fg: '#2f8a56', tracking: 0.4, weight: 700,
  });
}
