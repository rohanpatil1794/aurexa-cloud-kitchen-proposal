// Equipment items for the "prep" group: the four zone prep rooms, Cold Storage and Dry Storage.
// Kind builders live in src/scene/equipment/kinds/prep*.ts.
//
// Positions are given by the item's plan CENTRE (see `put`). w / d are the item's LOCAL sizes, so a
// bench rotated 90 / 270 swaps them in plan. Prep rooms are 5 ft (Non-Veg 8 ft) wide: benches hug the
// side walls with a galley aisle between them and the sink sits on the north wall, which leaves the
// 3 x 3 ft clear zone inside each south door free. Wall shelves all sit on the east wall: the far side
// from the south-west aerial camera, so they never hide a bench.
import type { EquipItem, RoomId, ZoneId } from '../types';
import { ZONE_COLORS } from '../../lib/palette';

function put(
  id: string, room: RoomId, kind: string, cx: number, cz: number, w: number, d: number, extra: Partial<EquipItem> = {},
): EquipItem {
  return { id, room, kind, x: cx - w / 2, z: cz - d / 2, w, d, ...extra };
}

const OVERHEAD = { overhead: true } as const;

interface PrepRoomSpec {
  room: RoomId;
  zone: ZoneId;
  produce: string;
  sink: [cx: number, w: number];
  bin: [cx: number, cz: number];
  /** [cx, cz, length, rot] for the two benches (depth fixed per room). */
  benches: [[number, number, number, number], [number, number, number, number]];
  benchDepth: number;
  shelf: { cx: number; cz: number; w: number; rot: number; herbs?: boolean };
}

function prepRoom(s: PrepRoomSpec): EquipItem[] {
  const color = ZONE_COLORS[s.zone];
  const r = s.room;
  return [
    put(`${r}-sink`, r, 'prep.sink', s.sink[0], 1.3, s.sink[1], 1.8, { color, label: '3-compartment sink' }),
    put(`${r}-bin`, r, 'prep.bin', s.bin[0], s.bin[1], 1, 1, { color, h: 2.3, label: 'Colour-coded waste bin' }),
    ...s.benches.map(([cx, cz, len, rot], i) =>
      put(`${r}-bench-${i ? 'b' : 'a'}`, r, 'prep.bench', cx, cz, len, s.benchDepth, {
        rot, color, label: 'Stainless prep bench', props: { produce: s.produce },
      })),
    put(`${r}-shelf`, r, 'prep.shelf', s.shelf.cx, s.shelf.cz, s.shelf.w, 0.7, {
      rot: s.shelf.rot, color, h: 4.5, label: 'Wall shelf', props: s.shelf.herbs ? { ...OVERHEAD, herbs: true } : OVERHEAD,
    }),
  ];
}

// ---------------------------------------------------------------------------
// Cold Storage: four zone fridges along the north wall, the walk-in on the east side, a transfer trolley
// ---------------------------------------------------------------------------
const COLD_FRIDGES: [zone: ZoneId, tag: string, name: string][] = [
  ['veg', 'VEG', 'Veg'], ['jain', 'JAIN', 'Jain'], ['vegan', 'VEGAN', 'Vegan'], ['nonveg', 'NON-VEG', 'Non-Veg'],
];

const COLD: EquipItem[] = [
  ...COLD_FRIDGES.map(([zone, tag, name], i) =>
    put(`cold-fridge-${zone}`, 'cold', 'prep.fridge', 41.08 + i * 1.6, 1.6, 1.56, 2.3, {
      color: ZONE_COLORS[zone], h: 6.5, label: `${name} fridge`, props: { tag },
    })),
  put('cold-walkin', 'cold', 'prep.walkIn', 45.35, 7.85, 4.7, 2.7, { rot: 270, h: 7, label: 'Walk-in cold room' }),
  put('cold-trolley', 'cold', 'prep.trolley', 41.25, 7, 1.7, 1.2, { h: 4.6, label: 'Zone crate trolley' }),
];

// ---------------------------------------------------------------------------
// Dry Storage: three racking rows (stepping down towards the south), pallet staging by the Receiving door
// ---------------------------------------------------------------------------
const DRY: EquipItem[] = [
  put('dry-rack-grain', 'dry', 'prep.rackRow', 50.5, 1.15, 6.4, 1.4, {
    h: 6.2, label: 'Grains & pulses', props: { style: 'grain', levels: 4 },
  }),
  put('dry-rack-oils', 'dry', 'prep.rackRow', 49.6, 5.55, 4.6, 1.4, {
    h: 5.2, label: 'Oils & spices', props: { style: 'oil', levels: 4 },
  }),
  put('dry-rack-pack', 'dry', 'prep.rackRow', 48.9, 9.1, 3.2, 1.4, {
    h: 4.4, label: 'Packaging', props: { style: 'pack', levels: 3 },
  }),
  put('dry-pallet-recv', 'dry', 'prep.pallet', 52.85, 12.1, 1.5, 1.8, { label: 'Pallet', props: { load: 'cartons' } }),
  put('dry-bay-recv', 'dry', 'prep.bayLines', 52.85, 12.1, 1.8, 2.2, { props: { flat: true } }),
  put('dry-pallet-west', 'dry', 'prep.pallet', 48.15, 12.1, 1.5, 1.8, { label: 'Pallet', props: { load: 'sacks' } }),
  put('dry-bay-west', 'dry', 'prep.bayLines', 48.15, 12.1, 1.7, 2.2, { props: { flat: true } }),
];

export const PREP_EQUIPMENT: EquipItem[] = [
  // Veg: staggered galley, sink at the west end of the north wall, bin in the north-east corner
  ...prepRoom({
    room: 'veg', zone: 'veg', produce: 'veg', sink: [8.9, 3.2], bin: [11.15, 0.95], benchDepth: 1.5,
    benches: [[8.05, 5.4, 4.6, 90], [10.95, 8.2, 4.4, 270]],
    shelf: { cx: 11.4, cz: 8.2, w: 3.6, rot: 270 },
  }),
  // Jain: the Veg plan mirrored east-west (the shelf stays on the east wall)
  ...prepRoom({
    room: 'jain', zone: 'jain', produce: 'jain', sink: [15.1, 3.2], bin: [12.85, 0.95], benchDepth: 1.5,
    benches: [[15.95, 5.4, 4.6, 270], [13.05, 8.2, 4.4, 90]],
    shelf: { cx: 16.4, cz: 5.4, w: 3.6, rot: 270 },
  }),
  // Vegan: full-width sink, two parallel benches, the bin at the end of the east bench, herbs on the shelf
  ...prepRoom({
    room: 'vegan', zone: 'vegan', produce: 'vegan', sink: [19.5, 4.4], bin: [21.2, 9.4], benchDepth: 1.5,
    benches: [[18.05, 6.4, 6.4, 90], [20.95, 5.9, 5.4, 270]],
    shelf: { cx: 21.4, cz: 5.9, w: 3.6, rot: 270, herbs: true },
  }),
  // Non-Veg: 8 ft wide, so a 4 ft aisle, the blast chiller in the north-east corner and a hand-wash basin by the door
  ...prepRoom({
    room: 'nonveg', zone: 'nonveg', produce: 'nonveg', sink: [24.1, 3.6], bin: [26.5, 0.95], benchDepth: 1.7,
    benches: [[23.15, 6.85, 6.7, 90], [28.85, 7.4, 5.6, 270]],
    shelf: { cx: 29.4, cz: 7.4, w: 4.6, rot: 270 },
  }),
  put('nonveg-chiller', 'nonveg', 'prep.chiller', 28.5, 1.65, 2.4, 2.4, { h: 6, label: 'Blast chiller' }),
  put('nonveg-handbasin', 'nonveg', 'prep.handBasin', 28.7, 12.75, 1.4, 0.9, {
    rot: 180, color: ZONE_COLORS.nonveg, label: 'Hand-wash basin',
  }),
  ...COLD,
  ...DRY,
];
