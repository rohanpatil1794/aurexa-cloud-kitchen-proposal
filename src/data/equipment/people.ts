// Equipment for the people-spaces: Indoor Garden, Content Creator Corner, Rider Waiting Area.
// Kind builders live in src/scene/equipment/kinds/people*.ts.
import type { EquipItem } from '../types';
import { BRAND } from '../../lib/palette';

type Placement = Pick<EquipItem, 'x' | 'z' | 'w' | 'd'>;

/** Footprint centred on (cx, cz): the data format wants the NW corner of the unrotated footprint. */
const centred = (cx: number, cz: number, w: number, d: number): Placement => ({
  x: +(cx - w / 2).toFixed(3),
  z: +(cz - d / 2).toFixed(3),
  w,
  d,
});

/** Rotation (degrees) that makes an item's front (+z) point from `from` towards `to`. */
const facing = (from: [number, number], to: [number, number]): number =>
  +((Math.atan2(to[0] - from[0], to[1] - from[1]) * 180) / Math.PI).toFixed(1);

// ---------------------------------------------------------------------------
// Indoor Garden (x 39-47, z 41-50). Glazed door N@43: x 41-45, z 41-44 stays clear.
// A pergola on four posts (standing in the beds) carries the hanging baskets and warm lights.
// ---------------------------------------------------------------------------
const POST_NW: [number, number] = [40.4, 42];
const POST_SE: [number, number] = [45.9, 48.4];
const PERGOLA = centred((POST_NW[0] + POST_SE[0]) / 2, (POST_NW[1] + POST_SE[1]) / 2, POST_SE[0] - POST_NW[0], POST_SE[1] - POST_NW[1]);

const GARDEN: EquipItem[] = [
  { id: 'garden-bed-w', room: 'garden', kind: 'people.planterBed', ...centred(40.175, 45.15, 1.65, 7.4), label: 'Raised planter bed', props: { seed: 3 } },
  { id: 'garden-bed-ne', room: 'garden', kind: 'people.planterBed', ...centred(45.825, 42.7, 1.65, 2.5), label: 'Raised planter bed', props: { seed: 9, flowers: 3 } },
  { id: 'garden-bed-e', room: 'garden', kind: 'people.planterBed', ...centred(45.625, 46.55, 2.05, 4.6), label: 'Raised planter bed', props: { seed: 5 } },

  { id: 'garden-ficus', room: 'garden', kind: 'people.gardenTree', ...centred(40.25, 43.4, 1, 1), h: 5.2, label: 'Ficus', props: { species: 'ficus', r: 0.8, overlap: true } },
  { id: 'garden-topiary', room: 'garden', kind: 'people.gardenTree', ...centred(40.4, 46.5, 1, 1), h: 3.6, label: 'Topiary bay', props: { species: 'topiary', overlap: true } },
  { id: 'garden-palm', room: 'garden', kind: 'people.gardenTree', ...centred(45.7, 46.4, 1, 1), h: 4.6, label: 'Areca palm', props: { species: 'palm', overlap: true } },
  { id: 'garden-bamboo', room: 'garden', kind: 'people.bamboo', ...centred(45.75, 43.1, 1, 1), label: 'Bamboo', props: { overlap: true } },

  { id: 'garden-bench', room: 'garden', kind: 'people.slatBench', ...centred(42.85, 48.8, 3.1, 1.2), rot: 180, label: 'Garden bench', props: { cushions: true } },
  { id: 'garden-stones', room: 'garden', kind: 'people.steppingStones', ...centred(43, 46.2, 1.8, 3.4), props: { flat: true } },

  { id: 'garden-pergola', room: 'garden', kind: 'people.pergola', ...PERGOLA, label: 'Pergola', props: { overhead: true } },
  { id: 'garden-hang-1', room: 'garden', kind: 'people.hangingPlanter', ...centred(42.4, 44.13, 1, 1), h: 6.9, label: 'Hanging planter', props: { overhead: true, seed: 3 } },
  { id: 'garden-hang-2', room: 'garden', kind: 'people.hangingPlanter', ...centred(43.95, 44.13, 1, 1), h: 6.9, label: 'Hanging planter', props: { overhead: true, seed: 8 } },
  { id: 'garden-hang-3', room: 'garden', kind: 'people.hangingPlanter', ...centred(43.2, 46.27, 1, 1), h: 6.9, label: 'Hanging planter', props: { overhead: true, seed: 12 } },
  { id: 'garden-lantern-1', room: 'garden', kind: 'people.lantern', ...centred(42.4, 48.4, 0.7, 0.7), h: 6.9, label: 'Pendant lantern', props: { overhead: true } },
  { id: 'garden-lantern-2', room: 'garden', kind: 'people.lantern', ...centred(43.95, 48.4, 0.7, 0.7), h: 6.9, label: 'Pendant lantern', props: { overhead: true } },
];

// ---------------------------------------------------------------------------
// Content Creator Corner (x 54-60, z 32-40). Glass partition W; door W@36: x 54-57, z 34.5-37.5 stays clear.
// The set sits in the east half: backdrop on the east wall, podcast table in front, rig tripods on the
// north-west and south-west flanks, both aimed at the table.
// ---------------------------------------------------------------------------
const TABLE: [number, number] = [58, 36];

const CREATOR: EquipItem[] = [
  { id: 'creator-backdrop', room: 'creator', kind: 'people.backdrop', ...centred(59.1, 36, 6, 0.3), h: 7, rot: 270, label: 'Teal backdrop wall' },
  { id: 'creator-rug', room: 'creator', kind: 'people.rug', ...centred(TABLE[0], TABLE[1], 3.4, 3.4), props: { flat: true } },
  { id: 'creator-table', room: 'creator', kind: 'people.studioTable', ...centred(TABLE[0], TABLE[1], 1.6, 1.6), label: 'Round table' },
  { id: 'creator-stool-n', room: 'creator', kind: 'people.stool', ...centred(TABLE[0], 34.55, 1.1, 1.1), color: BRAND.teal, label: 'Stool' },
  { id: 'creator-stool-s', room: 'creator', kind: 'people.stool', ...centred(TABLE[0], 37.45, 1.1, 1.1), color: BRAND.orange, label: 'Stool' },
  { id: 'creator-ring', room: 'creator', kind: 'people.ringLight', ...centred(55.6, 33.4, 1.6, 1.6), rot: facing([55.6, 33.4], TABLE), label: 'Ring light' },
  { id: 'creator-camera', room: 'creator', kind: 'people.camera', ...centred(55.6, 38.8, 1.6, 1.6), rot: facing([55.6, 38.8], TABLE), label: 'Camera on tripod' },
  { id: 'creator-plant-n', room: 'creator', kind: 'people.potPlant', ...centred(58.2, 32.95, 1, 1), color: BRAND.teal, props: { s: 1.25 } },
  { id: 'creator-plant-s', room: 'creator', kind: 'people.potPlant', ...centred(58.15, 39.2, 1, 1), props: { s: 1.25 } },
];

// ---------------------------------------------------------------------------
// Rider Waiting Area (x 14-22, z 41-50). Doors N@18 and S@18 keep x 16.5-19.5 clear end to end;
// W@45 keeps x 14-17, z 43.5-46.5 clear. The east wall carries a bench, a low table and the charging
// lockers (all facing west, so they show from the south-west); a second bench and the double-sided
// info screen stand on the west wall.
// ---------------------------------------------------------------------------
const RIDER: EquipItem[] = [
  { id: 'rider-bench-a', room: 'rider', kind: 'people.slatBench', ...centred(20.975, 42.9, 3, 1.35), rot: 270, label: 'Timber bench' },
  { id: 'rider-table', room: 'rider', kind: 'people.lowTable', ...centred(20.95, 45.2, 1, 1), label: 'Low table' },
  { id: 'rider-lockers', room: 'rider', kind: 'people.chargeLockers', ...centred(21.2, 47.75, 3.5, 1), rot: 270, h: 4, label: 'Charging lockers' },
  { id: 'rider-bench-b', room: 'rider', kind: 'people.slatBench', ...centred(14.975, 48.1, 2.8, 1.35), rot: 90, label: 'Timber bench' },
  { id: 'rider-screen', room: 'rider', kind: 'people.infoScreen', ...centred(14.9, 42.4, 2, 0.7), rot: 90, label: 'Info screen' },
  { id: 'rider-plant', room: 'rider', kind: 'people.potPlant', ...centred(16.05, 49.05, 0.8, 0.8), props: { s: 1.1 } },
];

export const PEOPLE_EQUIPMENT: EquipItem[] = [...GARDEN, ...CREATOR, ...RIDER];
