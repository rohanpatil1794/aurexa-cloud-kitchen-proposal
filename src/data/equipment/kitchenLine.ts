// Main Hot Kitchen, north half: exhaust hood with duct stacks, the back cooking line, the Mongolian wok station
// and the gas pipeline (ring main, header behind the line, branches over the islands). Kind builders:
// src/scene/equipment/kinds/kitchenLine*.ts.
//
// The line (z 17.2–20.2, 3 ft deep) has two service gaps, at the Raw Material doors N@21 (x 19.5–22.5) and
// N@34 (x 32.25–35.75), so it is three runs of appliances: x 15.3–19.5, 22.5–32.25 and 35.75–37.5. The wok
// station (r 1.3) closes the east end. West → east, with one fryer (two baskets) instead of three.
import type { EquipItem } from '../types';
import { GAS_RING } from '../layout';

const LINE_Z = 17.2;
const LINE_D = 3;
const COUNTER = 3;

const line = (id: string, kind: string, x: number, w: number, label: string, props?: EquipItem['props']): EquipItem => ({
  id: `kl-${id}`, room: 'kitchen', kind: `kitchenLine.${kind}`, x, z: LINE_Z, w, d: LINE_D, h: COUNTER, label, ...(props ? { props } : {}),
});

// Hood: slightly longer than the spec (x 15.3 → 40.2 instead of 16 → 40) so it covers the whole line and the wok station.
const HOOD = { x: 15.3, w: 24.9 };
const STACKS = [HOOD.x + HOOD.w * 0.19, HOOD.x + HOOD.w / 2, HOOD.x + HOOD.w * 0.81];

const GAS = { gas: true } as const;
const ITEMS: EquipItem[] = [
  { id: 'kl-hood', room: 'kitchen', kind: 'kitchenLine.hood', x: HOOD.x, z: 17.5, w: HOOD.w, d: 4, h: 8.4, label: 'Exhaust hood', props: { overhead: true } },
  ...STACKS.map((cx, i): EquipItem => ({
    id: `kl-duct-${i + 1}`, room: 'kitchen', kind: 'kitchenLine.duct', x: cx - 0.7, z: 17.6, w: 1.4, d: 1.4, h: 10, label: 'Duct stack', props: { overhead: true },
  })),

  // West run
  line('range6', 'range6', 15.3, 2.6, '6-burner range', GAS),
  line('kettle', 'kettle', 17.9, 1.6, 'Steam kettle', GAS),
  // Centre run
  line('range4', 'range4', 22.5, 1.8, '4-burner range', GAS),
  line('fryer', 'fryer', 24.3, 1.2, 'Fryer', GAS),
  line('griddle', 'griddle', 25.5, 1.9, 'Griddle', GAS),
  line('charbroiler', 'charbroiler', 27.4, 1.9, 'Charbroiler', GAS),
  // Salamander on the charbroiler's wall plate
  { id: 'kl-salamander', room: 'kitchen', kind: 'kitchenLine.salamander', x: 27.4, z: 17.25, w: 1.9, d: 1.3, h: 5.5, label: 'Salamander', props: { overlap: true } },
  line('pasta', 'pasta', 29.3, 1.2, 'Pasta cooker', GAS),
  line('bainmarie', 'bainMarie', 30.5, 1.75, 'Bain-marie'),
  // East run, closed by the wok station
  line('induction', 'induction', 35.75, 1.75, 'Induction ranges'),
  {
    id: 'kl-wok', room: 'kitchen', kind: 'kitchenLine.wok', x: 37.5, z: 18.2, w: 2.6, d: 2.6, h: COUNTER, label: 'Mongolian wok station',
    props: { gas: true, gasY: 2.1, gasZ: 18.5 },
  },

  // Stainless wall cladding behind the line (not across the two service gaps)
  ...[[15.3, 4.2], [22.5, 9.75], [35.75, 4.45]].map(([x, w], i): EquipItem => ({
    id: `kl-cladding-${i + 1}`, room: 'kitchen', kind: 'kitchenLine.cladding', x, z: 16.78, w, d: 0.15, h: 6.5,
  })),
  // Anti-fatigue mats in front of each run (floor decals)
  ...[[15.3, 4.2], [22.5, 9.75], [35.75, 4.45]].map(([x, w], i): EquipItem => ({
    id: `kl-mat-${i + 1}`, room: 'kitchen', kind: 'kitchenLine.mat', x, z: 20.35, w, d: 1.05, props: { flat: true },
  })),

  // Gas pipeline: all overhead (9 ft) or thin pipes beside the line; the ring runs outside the kitchen walls.
  { id: 'kl-gas-ring', room: 'kitchen', kind: 'kitchenLine.gasRing', x: GAS_RING.west, z: GAS_RING.north, w: GAS_RING.east - GAS_RING.west, d: GAS_RING.south - GAS_RING.north, label: 'Gas ring main', props: { overhead: true, outside: true } },
  { id: 'kl-gas-header', room: 'kitchen', kind: 'kitchenLine.gasHeader', x: 15.3, z: 16.9, w: 24.9, d: 0.2, label: 'Gas header', props: { overhead: true, outside: true } },
  { id: 'kl-gas-islands', room: 'kitchen', kind: 'kitchenLine.gasIslands', x: GAS_RING.west, z: 26.5, w: GAS_RING.east - GAS_RING.west, d: GAS_RING.south - 26.5, label: 'Gas branches', props: { overhead: true, outside: true } },
];

export const KITCHEN_LINE_EQUIPMENT: EquipItem[] = ITEMS;

// ---------------------------------------------------------------------------
// Gas layout shared with the pipe builders (world ft)
// ---------------------------------------------------------------------------
/** Where the header behind the line (z) is fed from the ring through the north wall (x). */
export const HEADER_Z = 17;
export const GAS_FEEDS = [18.2, 37.4];

/** One riser per gas appliance on the line: (x, y, z) of the stub where it meets the appliance's back. */
export const GAS_RISERS = ITEMS.filter((i) => i.props?.gas).map((i) => ({
  x: i.x + i.w / 2,
  y: Number(i.props?.gasY ?? 2.45),
  z: Number(i.props?.gasZ ?? i.z + 0.05),
}));

/** A gas connection over an island appliance: the pipe drops at (x, z) and ends at height `end` just above it. */
export interface GasDrop { x: number; z: number; end: number }

/**
 * Island gas connections (the appliances are drawn by kitchenIslands). West and east branches run along z = `z`
 * from their ring runs; a drop off that line gets a short cross branch. The tandoor is centred on (19, 26.5), the three
 * Chinese wok burners at x 23.1 / 25.2 / 27.3, the flat-top at (31, 26.5), the two European ranges at (35.5, 25.5 / 28.5).
 */
export const GAS_ISLAND_DROPS: { z: number; west: GasDrop[]; east: GasDrop[]; south: GasDrop[] } = {
  z: 26.5,
  west: [
    { x: 19, z: 26.5, end: 5.45 }, // tandoor
    { x: 17.8, z: 29, end: 4.75 }, { x: 20.2, z: 29, end: 4.75 }, // Indian gas rings
    { x: 23.1, z: 26.5, end: 4.6 }, { x: 25.2, z: 26.5, end: 4.6 }, { x: 27.3, z: 26.5, end: 4.6 }, // wok burners
  ],
  east: [{ x: 35.5, z: 25.5, end: 4.7 }, { x: 35.5, z: 28.5, end: 4.7 }], // European ranges
  south: [{ x: 31, z: 26.5, end: 4.1 }], // Continental flat-top, fed from the south run
};
