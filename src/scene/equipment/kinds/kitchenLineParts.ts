// Shared drawing helpers for the kitchen line (kitchenLine*.ts). Every helper draws into the CURRENT
// PrimBuilder frame: origin = footprint centre on the floor, +z = front (the cook's side), y = 0 floor.
import type { PrimBuilder } from '../../../lib/prims';
import { BRAND, SCENE } from '../../../lib/palette';

/** Brushed stainless in three tones, dark iron / knob rails, brass, flame and ember glow. */
export const KL = {
  top: '#d0d9df',
  front: '#bdc7cf',
  body: '#aeb9c2',
  handle: '#e6ecf0',
  dark: '#2a3237',
  iron: '#1b2125',
  knob: '#dde3e7',
  brass: SCENE.brass,
  flame: '#5ab4ff',
  ember: '#ff5f1f',
  orange: BRAND.orange,
  teal: BRAND.teal,
} as const;

/** Counter height of the whole line, ft. */
export const COUNTER = 3;
/** Material of large sheet-metal faces: a satin, non-metal finish keeps stainless bright inside the closed building. */
export const SHEET = 'gloss' as const;
const KICK = 0.32;
const TOP_T = 0.07;

export interface UnitOpts {
  w: number;
  d: number;
  /** Counter height. Default 3 ft. */
  h?: number;
  /** Front door panels under the knob rail. */
  doors?: number;
  /** Knobs on the dark rail (0 = no rail). */
  knobs?: number;
  /** Backsplash height above the counter. */
  riser?: number;
  /** High shelf on top of the backsplash. */
  shelf?: boolean;
}

/**
 * The common stainless carcass of every appliance on the line: toe-kick, body, top plate, front doors,
 * dark knob rail with steel knobs, and an optional backsplash with a high shelf.
 */
export function unit(b: PrimBuilder, o: UnitOpts): void {
  const { w, d } = o;
  const h = o.h ?? COUNTER;
  const front = d / 2;
  const railY = h - 0.72;
  const railH = 0.42;

  b.box({ m: SHEET, c: KL.body, y: KICK, w, h: h - KICK - TOP_T, d });
  b.box({ m: 'matte', c: KL.teal, w: w - 0.1, h: KICK, d: d - 0.3 });
  b.box({ m: 'steel', c: KL.top, y: h - TOP_T, w, h: TOP_T, d: d + 0.04 });

  const doors = o.doors ?? 0;
  if (doors) {
    const pw = (w - 0.2) / doors;
    for (let i = 0; i < doors; i++) {
      const x = -w / 2 + 0.1 + pw * (i + 0.5);
      b.box({ m: SHEET, c: KL.front, x, y: KICK + 0.08, z: front + 0.015, w: pw - 0.06, h: railY - KICK - 0.2, d: 0.03 });
      b.box({ m: 'steel', c: KL.handle, x, y: railY - 0.32, z: front + 0.06, w: pw - 0.3, h: 0.05, d: 0.09, shadow: false });
    }
  }

  const n = o.knobs ?? 0;
  if (n) {
    b.box({ m: 'matte', c: KL.dark, y: railY, z: front + 0.03, w: w - 0.1, h: railH, d: 0.1 });
    const pitch = Math.min(0.46, (w - 0.4) / Math.max(1, n - 1));
    for (let i = 0; i < n; i++) {
      b.cyl({
        m: 'steel', c: KL.knob, x: (i - (n - 1) / 2) * pitch, y: railY + railH / 2 - 0.075, z: front + 0.155,
        r: 0.085, h: 0.15, rx: 90, shadow: false,
      });
    }
  }

  if (o.riser) {
    b.box({ m: SHEET, c: KL.front, y: h, z: -front + 0.1, w, h: o.riser, d: 0.2 });
    if (o.shelf) b.box({ m: 'steel', c: KL.top, y: h + o.riser - 0.06, z: -front + 0.32, w, h: 0.06, d: 0.55, shadow: false });
  }
}

/** Cast-iron burner grate (frame + cross bars) over a brass burner head; optionally with a blue gas flame. */
export function burner(b: PrimBuilder, x: number, z: number, s: number, lit = false): void {
  const y = COUNTER;
  const bar = 0.07;
  const bh = 0.1;
  const inner = s - 2 * bar;
  b.cyl({ m: 'brass', c: KL.brass, x, y, z, r: 0.15, h: 0.06, shadow: false });
  for (const sz of [-1, 1]) b.box({ m: 'matte', c: KL.iron, x, y, z: z + sz * (s / 2 - bar / 2), w: s, h: bh, d: bar, shadow: false });
  for (const sx of [-1, 1]) b.box({ m: 'matte', c: KL.iron, x: x + sx * (s / 2 - bar / 2), y, z, w: bar, h: bh, d: inner, shadow: false });
  b.box({ m: 'matte', c: KL.iron, x, y, z, w: inner, h: bh, d: bar, shadow: false });
  b.box({ m: 'matte', c: KL.iron, x, y, z, w: bar, h: bh, d: inner, shadow: false });
  if (lit) b.cone({ m: 'emissive', c: KL.flame, x, y: y + 0.03, z, r: 0.2, h: 0.13 });
}

/** Stock pot with lid, knob and two side handles. (x, z) = centre, y = standing surface. */
export function pot(b: PrimBuilder, x: number, y: number, z: number, r: number, h: number): void {
  b.cyl({ m: 'gloss', c: '#cfd7dd', x, y, z, r, h });
  b.cyl({ m: 'gloss', c: KL.handle, x, y: y + h, z, r: r + 0.02, h: 0.05 });
  b.sph({ m: 'matte', c: KL.iron, x, y: y + h + 0.08, z, r: 0.06, shadow: false });
  for (const s of [-1, 1]) b.box({ m: 'matte', c: KL.iron, x: x + s * (r + 0.09), y: y + h * 0.78, z, w: 0.2, h: 0.05, d: 0.08, shadow: false });
}

/** Sauté pan with golden contents and a handle towards the cook (+z). */
export function pan(b: PrimBuilder, x: number, y: number, z: number, r: number, food: string): void {
  b.cyl({ m: 'steel', c: KL.dark, x, y, z, r, h: 0.14 });
  b.cyl({ m: 'gloss', c: food, x, y: y + 0.11, z, r: r - 0.05, h: 0.03, shadow: false });
  b.box({ m: 'matte', c: KL.iron, x, y: y + 0.07, z: z + r + 0.3, w: 0.07, h: 0.05, d: 0.62, shadow: false });
}
