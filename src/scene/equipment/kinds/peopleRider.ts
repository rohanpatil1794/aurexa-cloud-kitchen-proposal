// Rider Waiting Area: a bank of charging lockers and a double-sided info screen. Benches, table and
// plant come from peopleSeating.ts.
import { BRAND, ZONE_COLORS } from '../../../lib/palette';
import { CHARCOAL, STEEL_DARK } from '../../../lib/kit';
import type { KindBuilder } from '../registry';
import { BLACK } from './kindKit';
import { GLOW } from './peopleShared';

/**
 * Bank of small charging lockers: grey steel carcass, teal doors, a tiny green charge LED on each,
 * and a dark header with a CHARGE sign. Front faces +z. w = length, d = depth, h = height (default 4).
 */
const chargeLockers: KindBuilder = (b, it) => {
  const { w, d } = it;
  const h = it.h ?? 4;
  const cols = Math.round(w / 0.48);
  const rows = 4;
  const plinth = 0.2;
  const cw = w / cols;
  const ch = (h - plinth) / rows;

  b.box({ c: CHARCOAL, w: w + 0.04, h: plinth, d: d + 0.04 });
  b.box({ m: 'steel', c: STEEL_DARK, y: plinth, w, h: h - plinth, d });
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = -w / 2 + cw * (i + 0.5);
      const y = plinth + ch * j;
      b.box({ c: BRAND.teal, x, y: y + 0.03, z: d / 2 + 0.015, w: cw - 0.05, h: ch - 0.06, d: 0.03 });
      b.box({ m: 'emissive', c: '#5cff95', x: x + cw / 2 - 0.11, y: y + ch - 0.17, z: d / 2 + 0.04, w: 0.09, h: 0.09, d: 0.02 });
    }
  }
  b.box({ c: '#14403f', y: h, w: w + 0.04, h: 0.4, d: d + 0.04 });
  b.sign({ text: 'CHARGE', x: 0, y: h + 0.2, z: d / 2 + 0.03, w: Math.min(1.8, w - 0.3), h: 0.3, fg: GLOW.cream, weight: 700 });
};

/**
 * Info screen on a slim stand, screen on both faces so it reads from either side of the lounge.
 * Abstract content only: a welcome line and the four diet-zone colours. w = bezel width, d = base depth.
 */
const infoScreen: KindBuilder = (b, it) => {
  const { w, d } = it;
  const bezelH = 1.1;
  const y0 = 3.65;
  b.box({ m: 'steel', c: CHARCOAL, w: 1.1, h: 0.06, d });
  b.cyl({ m: 'steel', c: CHARCOAL, r: 0.06, y: 0.06, h: y0 - 0.06 });
  b.box({ c: BLACK, y: y0, w, h: bezelH, d: 0.1 });

  const chips = [ZONE_COLORS.veg, ZONE_COLORS.jain, ZONE_COLORS.vegan, ZONE_COLORS.nonveg];
  for (const ry of [0, 180]) {
    b.frame({ ry }, () => {
      b.box({ m: 'emissive', c: '#0e4a49', y: y0 + 0.06, z: 0.055, w: w - 0.14, h: bezelH - 0.12, d: 0.01 });
      b.sign({ text: 'WELCOME', sub: 'RIDER WAITING AREA', x: 0, y: y0 + bezelH / 2 + 0.06, z: 0.065, w: w - 0.4, h: 0.7, fg: GLOW.cream, emissive: true });
      chips.forEach((c, i) => {
        b.box({ m: 'emissive', c, x: (i - 1.5) * 0.24, y: y0 + 0.12, z: 0.062, w: 0.18, h: 0.05, d: 0.01 });
      });
    });
  }
};

export const RIDER_KINDS: Record<string, KindBuilder> = {
  'people.chargeLockers': chargeLockers,
  'people.infoScreen': infoScreen,
};
