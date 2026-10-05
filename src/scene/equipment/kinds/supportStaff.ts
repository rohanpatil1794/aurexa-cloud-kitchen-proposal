// Kind builders for the Staff Lockers room: locker rows, changing bench and door mat.
import { BRAND } from '../../../lib/palette';
import type { KindBuilder } from '../registry';
import { floorPlate, INK, STEEL, STEEL_DARK } from './supportKit';

const num = (v: unknown, d = 0) => (typeof v === 'number' ? v : d);

/** Row of tall steel lockers (teal and grey doors, vents, number plates). Local front (+z) faces the room. */
const lockers: KindBuilder = (b, it) => {
  const n = num(it.props?.n, 5), first = num(it.props?.first, 1), alt = num(it.props?.alt);
  const pitch = it.w / n, h = it.h ?? 6, f = it.d / 2;
  b.box({ m: 'matte', c: INK, w: it.w, h: 0.25, d: it.d - 0.1, shadow: false });
  for (let i = 0; i < n; i++) {
    const x = -it.w / 2 + pitch * (i + 0.5);
    b.box({ m: 'steel', c: STEEL_DARK, x, y: 0.25, w: pitch - 0.03, h: h - 0.25, d: it.d - 0.08 });
    b.box({ m: 'matte', c: (i + alt) % 2 ? '#77838d' : BRAND.teal, x, y: 0.4, z: f - 0.02, w: pitch - 0.12, h: h - 0.5, d: 0.04 });
    for (let v = 0; v < 3; v++) {
      b.box({ m: 'matte', c: '#1c2327', x, y: h - 0.7 + v * 0.12, z: f + 0.01, w: pitch - 0.4, h: 0.04, d: 0.02, shadow: false });
    }
    b.box({ m: 'steel', c: STEEL, x: x + pitch * 0.28, y: 3.1, z: f + 0.02, w: 0.05, h: 0.42, d: 0.04, shadow: false });
    b.box({ m: 'matte', c: BRAND.cream, x, y: h - 1.25, z: f + 0.01, w: 0.36, h: 0.18, d: 0.02, shadow: false });
    b.sign({ text: String(first + i), x, y: h - 1.16, z: f + 0.023, w: 0.3, h: 0.13, fg: INK });
  }
};

/** Changing bench: timber slats on a steel frame with a shoe shelf. */
const lockerBench: KindBuilder = (b, it) => {
  const h = it.h ?? 1.6;
  for (const z of [-0.33, 0, 0.33]) b.box({ m: 'matte', c: '#c9a063', y: h - 0.1, z, w: it.w, h: 0.1, d: 0.3 });
  b.box({ m: 'steel', c: STEEL_DARK, y: 0.35, w: it.w - 0.5, h: 0.05, d: it.d - 0.3 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) b.box({ m: 'steel', c: STEEL_DARK, x: sx * (it.w / 2 - 0.3), z: sz * (it.d / 2 - 0.15), w: 0.08, h: h - 0.1, d: 0.08 });
    b.box({ m: 'steel', c: STEEL_DARK, x: sx * (it.w / 2 - 0.3), y: h - 0.2, w: 0.06, h: 0.06, d: it.d - 0.3, shadow: false });
  }
};

/** Boot mat inside the door (decal): dark teal with a lighter inset. */
const doorMat: KindBuilder = (b, it) => {
  floorPlate(b, { w: it.w, d: it.d, c: '#134a49' });
  floorPlate(b, { w: it.w - 0.3, d: it.d - 0.3, c: BRAND.teal, y: 0.045, h: 0.01 });
};

export const staffKinds: Record<string, KindBuilder> = {
  'support.lockers': lockers,
  'support.lockerBench': lockerBench,
  'support.doorMat': doorMat,
};
