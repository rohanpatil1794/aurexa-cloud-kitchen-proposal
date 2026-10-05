// Exhaust hood over the back line and the three duct stacks that carry it to the ceiling.
import { BRAND } from '../../../lib/palette';
import { KL, SHEET } from './kitchenLineParts';
import type { KindBuilder } from '../registry';

/** Duct metal: a shade darker than the hood so the stacks read against it. */
const STACK = '#8d9aa5';

/** Hood heights, ft: lip (bottom), top of the vertical front apron, flat top. Ceiling is at 10. */
const HOOD = { bottom: 6.5, apron: 7.4, top: 8.4, ceiling: 10, flat: 1.6, skin: 0.08 } as const;

/**
 * Canopy hood: teal-lipped front with a dark grease-filter band, sloped stainless face, flat rear top for the
 * duct collars, end caps, light panels on the underside. Local z = +d/2 is the front.
 */
const hood: KindBuilder = (b, it) => {
  const { w, d } = it;
  const { bottom, apron, top, flat, skin: T } = HOOD;
  const zf = d / 2 - 0.05;
  const zb = -d / 2 + 0.04;
  const zk = -d / 2 + flat;
  const run = zf - zk;
  const rise = top - apron;
  const slope = (Math.atan2(rise, run) * 180) / Math.PI;
  const slopeLen = Math.hypot(run, rise) + 0.02;

  // sloped face, flat top (with dark panel seams), back wall, underside
  b.box({ m: 'steel', c: KL.top, y: (apron + top) / 2 - T / 2, z: (zf + zk) / 2, w, h: T, d: slopeLen, rx: slope });
  b.box({ m: 'steel', c: KL.top, y: top - T, z: (zb + zk) / 2, w, h: T, d: zk - zb });
  const panels = Math.round(w / 4.1);
  for (let i = 1; i < panels; i++) {
    const x = -w / 2 + (w * i) / panels;
    b.box({ m: 'matte', c: KL.dark, x, y: (apron + top) / 2 - T / 2 - 0.006, z: (zf + zk) / 2, w: 0.04, h: T + 0.012, d: slopeLen, rx: slope, shadow: false });
    b.box({ m: 'matte', c: KL.dark, x, y: top - T - 0.006, z: (zb + zk) / 2, w: 0.04, h: T + 0.012, d: zk - zb, shadow: false });
  }
  b.box({ m: 'matte', c: KL.front, y: bottom, z: zb, w, h: top - bottom, d: T });
  b.box({ m: SHEET, c: KL.body, y: apron - 0.05, z: (zf + zb) / 2, w: w - 0.1, h: 0.05, d: zf - zb });

  // front: grease-filter band behind slotted filter panels, steel upper apron, teal lip
  b.box({ m: 'matte', c: KL.dark, y: bottom + 0.08, z: zf, w: w - 0.1, h: apron - bottom - 0.28, d: 0.06 });
  b.box({ m: SHEET, c: KL.top, y: apron - 0.2, z: zf, w, h: 0.2, d: T });
  b.box({ m: 'matte', c: BRAND.teal, y: bottom, z: zf + 0.02, w, h: 0.08, d: 0.12 });
  const n = Math.round(w / 2.05);
  const pw = (w - 0.1) / n;
  for (let i = 0; i < n; i++) {
    const x = -(w - 0.1) / 2 + pw * (i + 0.5);
    b.box({ m: SHEET, c: KL.front, x, y: bottom + 0.14, z: zf + 0.045, w: pw - 0.1, h: 0.48, d: 0.04, shadow: false });
    for (const y of [0.25, 0.38, 0.51]) b.box({ m: 'matte', c: KL.dark, x, y: bottom + y, z: zf + 0.07, w: pw - 0.34, h: 0.03, d: 0.02, shadow: false });
  }

  // under-hood light panels
  for (let i = 0; i < 6; i++) {
    b.box({ m: 'emissive', c: '#fff1d0', x: (i - 2.5) * (w / 6.2), y: apron - 0.07, z: 0.5, w: 1, h: 0.02, d: 0.7 });
  }

  // end caps: lower box, rear upper box and a two-step fill under the slope
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - T / 2);
    b.box({ m: SHEET, c: KL.top, x, y: bottom, z: (zf + zb) / 2, w: T, h: apron - bottom, d: zf - zb });
    b.box({ m: SHEET, c: KL.top, x, y: apron, z: (zk + zb) / 2, w: T, h: top - apron, d: zk - zb });
    for (let k = 0; k < 2; k++) {
      b.box({ m: SHEET, c: KL.top, x, y: apron, z: zk + run * (k + 0.5) / 3, w: T, h: rise * (1 - (k + 1) / 3), d: run / 3 });
    }
  }
};

/** Round exhaust duct from the hood's rear collar up to the ceiling slab, with flanged joints. Local origin = duct axis. */
const duct: KindBuilder = (b) => {
  const { top, ceiling } = HOOD;
  const r = 0.62;
  const base = top + 0.35;
  const end = ceiling + 0.15;
  b.box({ m: SHEET, c: STACK, y: top, w: 2.1, h: 0.35, d: 1.5 });
  b.cyl({ m: SHEET, c: STACK, y: base, r, h: end - base });
  for (const y of [base, 9.3, ceiling + 0.05]) b.cyl({ m: SHEET, c: KL.body, y, r: r + 0.1, h: 0.08 });
};

export const HOOD_KINDS: Record<string, KindBuilder> = {
  'kitchenLine.hood': hood,
  'kitchenLine.duct': duct,
};
