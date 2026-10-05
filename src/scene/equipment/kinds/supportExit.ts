// Kind builders for the Emergency Exit Lobby: the photoluminescent escape-route marking, an apron rail and the
// FIRE EXIT KEEP CLEAR plate. The boot mat, bench and threshold hazard strip reuse the staff and receiving kinds.
import { BRAND } from '../../../lib/palette';
import type { KindBuilder } from '../registry';
import { INK } from './kindKit';
import { floorPlate, STEEL, STEEL_DARK } from './supportKit';

const ROUTE_GREEN = '#2f9e5c';
const SAFE_GREEN = '#1a7f46';

/**
 * Escape-route marking (decal): a line along the north edge of the footprint and down its east edge, with a
 * chevron on the run and an arrowhead where it meets the exit door (south).
 */
const escapeRoute: KindBuilder = (b, it) => {
  const t = 0.2, hw = it.w / 2, hd = it.d / 2;
  const run = -hd + t / 2, drop = hw - t / 2;
  floorPlate(b, { z: run, w: it.w, d: t, c: ROUTE_GREEN });
  floorPlate(b, { x: drop, w: t, d: it.d, c: ROUTE_GREEN });
  const arm = (x: number, z: number, ry: number) => b.box({ m: 'matte', c: ROUTE_GREEN, x, y: 0.04, z, w: 0.5, h: 0.02, d: t, ry, shadow: false });
  // chevron on the run (tip towards +x) and arrowhead at the end of the drop (tip towards +z)
  arm(-0.1, run - 0.17, -45);
  arm(-0.1, run + 0.17, 45);
  arm(drop - 0.17, hd - 0.17, -45);
  arm(drop + 0.17, hd - 0.17, 45);
};

/** Rail of apron hooks on the wall (local back, -z), with three aprons hanging above the bench. */
const apronRail: KindBuilder = (b, it) => {
  const wall = -it.d / 2;
  b.box({ m: 'steel', c: STEEL_DARK, y: 3.3, z: wall + 0.06, w: it.w, h: 0.1, d: 0.1 });
  [BRAND.cream, BRAND.teal, BRAND.orange].forEach((c, i) => {
    const x = (i - 1) * (it.w / 3);
    b.box({ m: 'steel', c: STEEL, x, y: 3.2, z: wall + 0.14, w: 0.05, h: 0.14, d: 0.1, shadow: false });
    b.box({ m: 'matte', c, x, y: 1.85, z: wall + 0.2, w: 0.6, h: 1.4, d: 0.05 });
    b.box({ m: 'matte', c, x, y: 2.8, z: wall + 0.2, w: 0.36, h: 0.45, d: 0.05 });
    b.box({ m: 'matte', c: INK, x, y: 2.3, z: wall + 0.231, w: 0.5, h: 0.05, d: 0.02, shadow: false });
  });
};

/** Green safe-condition plate: FIRE EXIT / KEEP CLEAR. Faces +z; back against the wall at local -z. */
const keepClear: KindBuilder = (b, it) => {
  b.box({ m: 'matte', c: SAFE_GREEN, y: 2.3, w: it.w, h: 0.62, d: it.d });
  b.sign({ text: 'FIRE EXIT', sub: 'KEEP CLEAR', y: 2.61, z: it.d / 2 + 0.003, w: it.w - 0.1, h: 0.52, fg: '#ffffff', bg: SAFE_GREEN, weight: 800, tracking: 0.12 });
};

export const exitKinds: Record<string, KindBuilder> = {
  'support.escapeRoute': escapeRoute,
  'support.apronRail': apronRail,
  'support.keepClear': keepClear,
};
