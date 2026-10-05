// Indoor Garden: raised planter beds, three kinds of small tree, bamboo, a pergola with hanging
// baskets and warm pendants, stepping stones. Everything is a few instanced primitives.
import { BRAND } from '../../../lib/palette';
import { FOLIAGE_GREEN, FOLIAGE_OLIVE } from '../../../lib/kit';
import type { KindBuilder } from '../registry';
import { GLOW, between, num, pick, rng } from './peopleShared';

/** Raised bed rim height and the soil surface everything grows from. */
const BED_H = 1.15;
const SOIL_TOP = BED_H + 0.06;
/** Underside of the pergola main beams. */
const BEAM_Y = 8.4;

const FOLIAGE_DEEP = '#3f7a45';
const FOLIAGE_FRESH = '#7a9a4c';
const FOLIAGE = [FOLIAGE_OLIVE, FOLIAGE_GREEN, FOLIAGE_DEEP, FOLIAGE_FRESH] as const;
const FLOWERS = [BRAND.orange, BRAND.cream, BRAND.sand, '#e8885a'] as const;
const STEM = '#4d7a3f';
const BARK = '#6b4a32';

const TAU = Math.PI * 2;
const DEG = 180 / Math.PI;

/**
 * Raised timber bed with a stone coping, dark soil and low planting: leafy mounds, tufts of
 * ornamental grass and a few brand-coloured flowers on thin stems. props: seed, mounds, grass, flowers.
 */
const planterBed: KindBuilder = (b, it) => {
  const { w, d } = it;
  const rim = 0.22;
  b.box({ c: '#7a5535', w, h: BED_H, d });
  const coping = { c: '#cdbd98', y: BED_H, h: 0.1 };
  b.box({ ...coping, z: -(d - rim) / 2, w, d: rim });
  b.box({ ...coping, z: (d - rim) / 2, w, d: rim });
  b.box({ ...coping, x: -(w - rim) / 2, w: rim, d: d - 2 * rim });
  b.box({ ...coping, x: (w - rim) / 2, w: rim, d: d - 2 * rim });
  b.box({ c: '#4a3524', y: BED_H, w: w - 2 * rim, h: 0.06, d: d - 2 * rim });

  const rnd = rng(num(it, 'seed', 1));
  const hx = (w - 2 * rim) / 2 - 0.15;
  const hz = (d - 2 * rim) / 2 - 0.15;
  const area = w * d;
  const spot = () => ({ x: between(rnd, -hx, hx), z: between(rnd, -hz, hz) });

  for (let i = 0, n = num(it, 'mounds', Math.round(area * 1.8)); i < n; i++) {
    const r = between(rnd, 0.24, 0.42);
    b.sph({ c: pick(rnd, FOLIAGE), r, y: SOIL_TOP + r * 0.35, sy: 0.65, ...spot() });
  }
  for (let i = 0, n = num(it, 'grass', Math.round(area / 3)); i < n; i++) {
    const { x, z } = spot();
    const c = pick(rnd, [FOLIAGE_FRESH, FOLIAGE_GREEN] as const);
    for (let k = 0; k < 3; k++) {
      b.cone({
        c, r: 0.09, h: between(rnd, 0.55, 0.9), y: SOIL_TOP,
        x: x + between(rnd, -0.1, 0.1), z: z + between(rnd, -0.1, 0.1),
        rx: between(rnd, -14, 14), rz: between(rnd, -14, 14),
      });
    }
  }
  for (let i = 0, n = num(it, 'flowers', Math.round(area * 0.9)); i < n; i++) {
    const { x, z } = spot();
    const top = SOIL_TOP + between(rnd, 0.5, 0.85);
    b.pipe({ m: 'matte', c: STEM, a: [x, SOIL_TOP + 0.1, z], b: [x, top, z], r: 0.014 });
    b.sph({ c: pick(rnd, FLOWERS), r: between(rnd, 0.07, 0.1), x, y: top, z });
  }
};

/** Small trees that grow out of a bed. props.species: ficus | topiary | palm. item.h = trunk-to-crown height. */
const gardenTree: KindBuilder = (b, it) => {
  const h = it.h ?? 5;
  const rnd = rng(num(it, 'seed', 7));
  const species = it.props?.species;

  b.frame({ y: SOIL_TOP }, () => {
    if (species === 'topiary') {
      // Cloud-pruned bay: a slim stem carrying three balls.
      b.cyl({ c: BARK, r: 0.06, h: h * 0.6 });
      b.sph({ c: FOLIAGE_DEEP, r: 0.52, y: h * 0.62 });
      b.sph({ c: FOLIAGE_GREEN, r: 0.4, y: h * 0.84, x: 0.06 });
      b.sph({ c: FOLIAGE_DEEP, r: 0.27, y: h * 0.99, x: -0.04 });
    } else if (species === 'palm') {
      // Slender trunk with a rosette of drooping fronds and a few upright new ones.
      b.cyl({ c: BARK, r: 0.1, h });
      b.cyl({ c: BARK, r: 0.15, h: 0.4 });
      b.sph({ c: FOLIAGE_DEEP, r: 0.2, y: h + 0.05 });
      // A frond is a long thin ellipsoid tilted about the crown (tilt > 0 droops, < 0 points up).
      const frond = (phi: number, tilt: number, len: number, c: string) => {
        const t = tilt / DEG;
        const r = len / 2;
        b.sph({
          c, r, sx: 0.17 / r, sy: 0.035 / r,
          x: Math.sin(phi) * r * Math.cos(t), z: Math.cos(phi) * r * Math.cos(t),
          y: h + 0.1 - r * Math.sin(t),
          rx: tilt, ry: phi * DEG,
        });
      };
      for (let i = 0; i < 9; i++) {
        frond((i / 9) * TAU + between(rnd, -0.2, 0.2), between(rnd, 26, 48), between(rnd, 1.5, 1.9), i % 2 ? FOLIAGE_GREEN : '#4e8a47');
      }
      for (let i = 0; i < 4; i++) frond((i / 4) * TAU + 0.4, between(rnd, -40, -28), between(rnd, 0.9, 1.2), FOLIAGE_FRESH);
    } else {
      // Broad ficus: a short trunk and a lumpy mixed canopy.
      const R = num(it, 'r', 0.8);
      b.cyl({ c: BARK, r: 0.13, h: h * 0.55 });
      b.sph({ c: FOLIAGE_OLIVE, r: R, y: h * 0.66, sy: 0.85 });
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + between(rnd, -0.3, 0.3);
        b.sph({
          c: k % 2 ? FOLIAGE_GREEN : FOLIAGE_OLIVE, r: R * between(rnd, 0.5, 0.68),
          x: Math.sin(a) * R * 0.6, y: h * between(rnd, 0.6, 0.88), z: Math.cos(a) * R * 0.6, sy: 0.9,
        });
      }
      b.sph({ c: FOLIAGE_GREEN, r: R * 0.55, y: h * 0.97, sy: 0.9 });
    }
  });
};

/** A loose clump of bamboo culms with feathery tops, rising from a bed. */
const bamboo: KindBuilder = (b, it) => {
  const rnd = rng(num(it, 'seed', 11));
  b.frame({ y: SOIL_TOP }, () => {
    for (let i = 0; i < 8; i++) {
      const a = between(rnd, 0, TAU);
      const rad = between(rnd, 0.05, 0.5);
      const h = between(rnd, 4.2, 6.2);
      const x = Math.sin(a) * rad;
      const z = Math.cos(a) * rad;
      b.cyl({ c: '#8da24f', r: 0.04, h, x, z });
      b.sph({ c: pick(rnd, FOLIAGE), r: 0.36, x, y: h - 0.15, z, sy: 0.55 });
      b.sph({ c: pick(rnd, FOLIAGE), r: 0.28, x: x + between(rnd, -0.15, 0.15), y: h * 0.78, z: z + between(rnd, -0.15, 0.15), sy: 0.5 });
    }
  });
};

/** Flat stepping stones zig-zagging along the item's length (z), from the door towards the bench. */
const steppingStones: KindBuilder = (b, it) => {
  const rnd = rng(num(it, 'seed', 5));
  const n = num(it, 'stones', 6);
  const tones = ['#d8cba6', '#cfc19b', '#c9bb95'] as const;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    b.cyl({
      c: pick(rnd, tones), r: between(rnd, 0.3, 0.42), y: 0.025, h: 0.05,
      x: (i % 2 ? 1 : -1) * between(rnd, 0.15, 0.4), z: -it.d / 2 + t * it.d,
    });
  }
};

/**
 * Pergola over the planting: four slim teal posts standing in the beds, two main beams, cross rafters
 * and a string of warm festoon bulbs under the entrance rafter. Footprint = the four posts.
 */
const pergola: KindBuilder = (b, it) => {
  const { w, d } = it;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) b.box({ c: BRAND.teal, x: sx * w / 2, z: sz * d / 2, y: SOIL_TOP, w: 0.16, h: BEAM_Y + 0.3 - SOIL_TOP, d: 0.16 });
    b.box({ c: BRAND.teal, x: sx * w / 2, y: BEAM_Y, w: 0.2, h: 0.3, d: d + 0.8 });
  }
  for (let k = 0; k < 4; k++) {
    b.box({ c: '#7a5535', y: BEAM_Y + 0.3, z: -d / 2 + (k * d) / 3, w: w + 0.9, h: 0.16, d: 0.14 });
  }

  // Climbers up the posts and vines draping from the beams.
  const rnd = rng(num(it, 'seed', 21));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let k = 0; k < 5; k++) {
        b.sph({
          c: pick(rnd, FOLIAGE), r: between(rnd, 0.14, 0.22), sy: 1.25,
          x: sx * w / 2 + between(rnd, -0.1, 0.1), y: 2.2 + k * 1.15 + between(rnd, -0.2, 0.2), z: sz * d / 2 + between(rnd, -0.1, 0.1),
        });
      }
    }
    for (let i = 1; i <= 3; i++) {
      const len = between(rnd, 0.8, 1.5);
      const x = sx * w / 2;
      const z = -d / 2 + (i * d) / 4;
      b.cyl({ c: FOLIAGE_GREEN, r: 0.03, x, z, y: BEAM_Y - len, h: len, shadow: false });
      b.sph({ c: pick(rnd, FOLIAGE), r: 0.15, x, y: BEAM_Y - len, z, shadow: false });
      b.sph({ c: pick(rnd, FOLIAGE), r: 0.12, x, y: BEAM_Y - len * 0.45, z, shadow: false });
    }
  }

  // Festoon: bulbs on a drooping wire from beam to beam.
  const n = 9;
  const point = (i: number): [number, number, number] => {
    const t = i / (n - 1);
    return [(-w / 2 + 0.1) + t * (w - 0.2), BEAM_Y + 0.1 - 0.65 * 4 * t * (1 - t), -d / 2];
  };
  for (let i = 0; i < n; i++) {
    const p = point(i);
    b.sph({ m: 'emissive', c: GLOW.warm, r: 0.075, x: p[0], y: p[1] - 0.08, z: p[2] });
    if (i > 0) b.pipe({ m: 'matte', c: '#2a2f33', a: point(i - 1), b: p, r: 0.012 });
  }
};

/** Hanging basket on three chains and a rod. item.h = height of the basket bottom. Overhead. */
const hangingPlanter: KindBuilder = (b, it) => {
  const h = it.h ?? 6.9;
  const rnd = rng(num(it, 'seed', 3));
  const ringY = h + 0.9;
  b.pipe({ m: 'matte', c: '#2a2f33', a: [0, ringY, 0], b: [0, BEAM_Y, 0], r: 0.018 });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5;
    b.pipe({ m: 'matte', c: '#2a2f33', a: [0, ringY, 0], b: [Math.sin(a) * 0.44, h + 0.3, Math.cos(a) * 0.44], r: 0.01 });
  }
  b.cyl({ c: '#b98a55', r: 0.4, y: h, h: 0.3 });
  b.cyl({ c: '#8a6236', r: 0.45, y: h + 0.27, h: 0.06 });
  b.cyl({ c: '#4a3524', r: 0.38, y: h + 0.31, h: 0.03, shadow: false });
  b.sph({ c: FOLIAGE_OLIVE, r: 0.36, y: h + 0.42, sy: 0.7 });
  b.sph({ c: FOLIAGE_GREEN, r: 0.27, x: 0.3, y: h + 0.4, z: 0.1, sy: 0.7 });
  b.sph({ c: FOLIAGE_DEEP, r: 0.27, x: -0.28, y: h + 0.4, z: -0.12, sy: 0.7 });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + between(rnd, -0.2, 0.2);
    const len = between(rnd, 0.5, 1.1);
    const x = Math.sin(a) * 0.44;
    const z = Math.cos(a) * 0.44;
    b.cyl({ c: FOLIAGE_GREEN, r: 0.03, x, z, y: h + 0.28 - len, h: len, shadow: false });
    b.sph({ c: FOLIAGE_FRESH, r: 0.1, x, y: h + 0.28 - len, z, shadow: false });
    b.sph({ c: FOLIAGE_OLIVE, r: 0.08, x, y: h + 0.28 - len * 0.5, z, shadow: false });
  }
};

/** Pendant lantern on a cord: glowing core inside a warm frosted globe. item.h = height of the globe's bottom. Overhead. */
const lantern: KindBuilder = (b, it) => {
  const h = it.h ?? 6.9;
  b.pipe({ m: 'matte', c: '#2a2f33', a: [0, h + 0.62, 0], b: [0, BEAM_Y, 0], r: 0.012 });
  b.cyl({ m: 'brass', c: '#b08d57', r: 0.1, y: h + 0.52, h: 0.12 });
  b.sph({ m: 'glass', c: GLOW.warm, r: 0.3, y: h + 0.3 });
  b.sph({ m: 'emissive', c: GLOW.warm, r: 0.19, y: h + 0.3 });
};

export const GARDEN_KINDS: Record<string, KindBuilder> = {
  'people.planterBed': planterBed,
  'people.gardenTree': gardenTree,
  'people.bamboo': bamboo,
  'people.steppingStones': steppingStones,
  'people.pergola': pergola,
  'people.hangingPlanter': hangingPlanter,
  'people.lantern': lantern,
};
