// Content Creator Corner: teal backdrop with a glowing kitchen-name sign, ring light, camera, a small
// podcast table and a rug. Tripod builders are drawn facing +z (the item is rotated to aim at the table).
import { BRAND } from '../../../lib/palette';
import { CHARCOAL, STEEL_DARK, roundTable } from '../../../lib/kit';
import { KITCHEN_NAME } from '../../../config';
import type { KindBuilder } from '../registry';
import { BLACK } from './kindKit';
import { GLOW } from './peopleShared';

const TRIPOD = '#3a4349';

/**
 * Free-standing feature wall: teal panel on a dark plinth, cream cap and keyline frame, timber slats
 * on the lower third, and the glowing kitchen-name sign with an orange underline. Faces +z.
 * w = length, d = thickness, h = height.
 */
const backdrop: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 7;
  const front = d / 2;
  const cream = '#e8d3a8';

  b.box({ c: '#12403f', w: w + 0.16, h: 0.25, d: d + 0.14 });
  b.box({ c: BRAND.teal, y: 0.25, w, h: h - 0.25, d });
  b.box({ c: cream, y: h, w: w + 0.04, h: 0.1, d: d + 0.06 });

  // Timber slats along the base.
  const slats = Math.floor((w - 0.3) / 0.3);
  const step = (w - 0.3) / slats;
  for (let i = 0; i < slats; i++) {
    b.box({ c: '#a87848', x: -w / 2 + 0.15 + step * (i + 0.5), y: 0.3, z: front + 0.03, w: step - 0.1, h: 2.35, d: 0.06 });
  }

  // Cream keyline frame around the sign.
  const fy0 = 2.8;
  const fy1 = h - 0.6;
  const fx = w / 2 - 0.3;
  const line = { c: cream, z: front + 0.012, d: 0.02 };
  b.box({ ...line, y: fy0, w: 2 * fx, h: 0.05 });
  b.box({ ...line, y: fy1, w: 2 * fx, h: 0.05 });
  for (const sx of [-1, 1]) b.box({ ...line, x: sx * fx, y: fy0, w: 0.05, h: fy1 - fy0 + 0.05 });

  b.sign({ text: KITCHEN_NAME.toUpperCase(), x: 0, y: 4.75, z: front + 0.03, w: Math.min(4.6, w - 1), h: 0.8, fg: GLOW.cream, emissive: true, weight: 700 });
  b.box({ m: 'emissive', c: GLOW.orange, x: 0, y: 4.17, z: front + 0.025, w: 3.2, h: 0.07, d: 0.03 });
};

/** Cinema-style camera on a tripod. Lens points +z. */
const camera: KindBuilder = (b) => {
  const head = 4.0;
  const feet: [number, number][] = [[0, -0.72], [-0.66, 0.42], [0.66, 0.42]];
  for (const [x, z] of feet) b.pipe({ m: 'steel', c: TRIPOD, a: [0, head - 0.1, 0], b: [x, 0.02, z], r: 0.035, shadow: true });
  // Leg spreader triangle.
  for (let i = 0; i < 3; i++) {
    const [ax, az] = feet[i];
    const [bx, bz] = feet[(i + 1) % 3];
    b.pipe({ m: 'steel', c: TRIPOD, a: [ax * 0.86, 0.55, az * 0.86], b: [bx * 0.86, 0.55, bz * 0.86], r: 0.015 });
  }
  b.cyl({ m: 'steel', c: TRIPOD, r: 0.11, y: head - 0.15, h: 0.2 });
  b.box({ m: 'steel', c: BLACK, y: head + 0.05, w: 0.3, h: 0.1, d: 0.3 });
  b.pipe({ m: 'matte', c: BLACK, a: [0.1, head + 0.08, -0.1], b: [0.45, head - 0.22, -0.55], r: 0.02 });

  const mid = head + 0.36;
  b.box({ c: CHARCOAL, y: head + 0.15, z: -0.05, w: 0.5, h: 0.42, d: 0.66 });
  b.box({ c: BLACK, x: 0, y: head + 0.2, z: -0.45, w: 0.22, h: 0.3, d: 0.12 });
  b.cyl({ m: 'steel', c: BLACK, rx: 90, r: 0.17, h: 0.5, y: mid - 0.25, z: 0.58 });
  b.cyl({ c: BLACK, rx: 90, r: 0.22, h: 0.2, y: mid - 0.1, z: 0.9 });
  b.cyl({ m: 'gloss', c: '#1a2a3f', rx: 90, r: 0.13, h: 0.02, y: mid - 0.01, z: 0.99 });
  b.box({ c: BLACK, x: 0, y: head + 0.57, z: -0.1, w: 0.04, h: 0.1, d: 0.4 });
  b.box({ c: BLACK, x: 0, y: head + 0.67, z: -0.1, w: 0.3, h: 0.04, d: 0.04 });
  // Flip-out monitor and record light.
  b.box({ c: BLACK, x: -0.4, y: head + 0.2, w: 0.04, h: 0.34, d: 0.46 });
  b.box({ m: 'emissive', c: '#3a6a88', x: -0.425, y: head + 0.24, w: 0.01, h: 0.26, d: 0.38 });
  b.sph({ m: 'emissive', c: '#ff3b30', r: 0.035, x: 0.2, y: head + 0.55, z: 0.3 });
};

/** Ring light on a tripod: a glowing ring of warm-white segments in a dark housing, phone holder in the middle. */
const ringLight: KindBuilder = (b) => {
  const R = 0.62;
  const cy = 5.0;
  const n = 18;
  const seg = (2 * Math.PI * R) / n;
  for (const [x, z] of [[0, -0.7], [-0.62, 0.38], [0.62, 0.38]]) {
    b.pipe({ m: 'steel', c: TRIPOD, a: [0, 2.5, 0], b: [x, 0.02, z], r: 0.03, shadow: true });
  }
  b.cyl({ m: 'steel', c: TRIPOD, r: 0.035, h: cy - R + 0.05 });
  b.cyl({ m: 'steel', c: TRIPOD, r: 0.06, h: 2.4 });
  b.pipe({ m: 'steel', c: TRIPOD, a: [0, cy - R, 0], b: [0, cy - R + 0.1, -0.04], r: 0.03 });

  for (let i = 0; i < n; i++) {
    const phi = (i / n) * 360;
    const rad = (i / n) * 2 * Math.PI;
    const x = Math.cos(rad) * R;
    const y = cy + Math.sin(rad) * R;
    b.box({ m: 'emissive', c: GLOW.cream, x, y: y - 0.065, z: 0.05, w: seg + 0.02, h: 0.13, d: 0.08, rz: phi + 90 });
    b.box({ c: CHARCOAL, x, y: y - 0.1, z: -0.02, w: seg + 0.04, h: 0.2, d: 0.06, rz: phi + 90 });
  }
  b.box({ c: BLACK, x: 0, y: cy - 0.15, z: 0.02, w: 0.16, h: 0.3, d: 0.04 });
  b.box({ m: 'emissive', c: '#3a6a88', x: 0, y: cy - 0.12, z: 0.045, w: 0.12, h: 0.24, d: 0.01 });
};

/** Round podcast table with two microphones and two cups. */
const studioTable: KindBuilder = (b, it) => {
  const h = 2.5;
  roundTable(b, { r: it.w / 2, h });
  for (const s of [-1, 1]) {
    b.cyl({ m: 'steel', c: BLACK, r: 0.09, y: h, h: 0.03, z: s * 0.3 });
    b.cyl({ m: 'steel', c: STEEL_DARK, r: 0.02, y: h, h: 0.5, z: s * 0.3 });
    b.cyl({ m: 'steel', c: BLACK, r: 0.06, y: h + 0.46, h: 0.18, z: s * 0.3 });
    b.cyl({ m: 'gloss', c: s < 0 ? BRAND.orange : '#ffffff', r: 0.1, y: h, h: 0.2, x: 0.45, z: s * 0.35 });
  }
};

/** Flat round rug under the table: sand rim, teal-mid field. Decal only. */
const rug: KindBuilder = (b, it) => {
  const r = it.w / 2;
  b.cyl({ c: '#e0c08a', r, y: 0.03, h: 0.03, shadow: false });
  b.cyl({ c: BRAND.tealMid, r: r * 0.82, y: 0.05, h: 0.03, shadow: false });
};

export const CREATOR_KINDS: Record<string, KindBuilder> = {
  'people.backdrop': backdrop,
  'people.camera': camera,
  'people.ringLight': ringLight,
  'people.studioTable': studioTable,
  'people.rug': rug,
};
