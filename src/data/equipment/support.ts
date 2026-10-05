// Equipment items for the "support" group: Waste Management, Dishwashing, Staff Lockers, Electrical & UPS,
// Toilets, the Emergency Exit Lobby, the Fire Staircase and the Passenger Lift. Kind builders live in src/scene/equipment/kinds/support*.ts.
//
// Positions are the item's plan CENTRE (see `put`); w / d are LOCAL sizes, so an item rotated 90 / 270 swaps
// them in plan. Walls are 0.5 ft thick (outer 0.75), so every item stops 0.25 ft (0.375 outer) short of the
// room edge. Each room keeps the 3 x 3 ft zone inside its doors free and a walkable lane door to door.
import { DISH_STAGES, PASSENGER_LIFT } from '../layout';
import type { EquipItem, SpaceId } from '../types';

function put(
  id: string, room: SpaceId, kind: string, cx: number, cz: number, w: number, d: number, extra: Partial<EquipItem> = {},
): EquipItem {
  return { id, room, kind, x: cx - w / 2, z: cz - d / 2, w, d, ...extra };
}

const FLAT = { flat: true } as const;
const OVERHEAD = { overhead: true } as const;

// ---------------------------------------------------------------------------
// Waste Management (x 22-39, z 41-50). Doors N@27 and N@36 (trolley in and out), service door S@25.
// Wash-down + trolley bay in the north-west corner, cage by the service door, sorting table, six bins on the east wall.
// ---------------------------------------------------------------------------
const WASTE: EquipItem[] = [
  put('waste-bins', 'waste', 'support.wasteBins', 38.15, 45.35, 7.8, 1.2, { rot: 270, h: 2.6, label: 'Six colour-coded waste bins' }),
  put('waste-washdown', 'waste', 'support.washDown', 23.85, 41.7, 2.9, 0.8, { label: 'Wash-down point' }),
  put('waste-trolley', 'waste', 'support.wasteTrolley', 23.85, 43.75, 2.6, 1.5, { h: 3.4, label: 'Dirty-utensil trolley' }),
  put('waste-drain-a', 'waste', 'support.drain', 23.85, 42.55, 2.6, 0.45, { props: FLAT }),
  put('waste-drain-b', 'waste', 'support.drain', 31.5, 45.4, 1, 1, { props: FLAT }),
  put('waste-cage', 'waste', 'support.wasteCage', 29.4, 48.2, 4, 2.6, { rot: 180, h: 5, label: 'Storage cage' }),
  put('waste-sort', 'waste', 'support.sortTable', 34.6, 48.5, 4.2, 2, { rot: 180, h: 3.55, label: 'Sorting table' }),
];

// ---------------------------------------------------------------------------
// Dishwashing Area (x 43-50.5, z 16.5-36). Doors W@z26 and E@z22. The five stage discs sit on DISH_STAGES (the Dirty
// route U: west lane south, east lane north); the machine line runs along the north wall, the sink bank closes the
// south-west corner, ware racks line the east wall and the soiled table sits between the two lanes.
// ---------------------------------------------------------------------------
/** Name-plate offset (dx, dz from the disc centre) and width, per stage, chosen to stay clear of the equipment. */
const STAGE_LABEL: Record<number, [number, number, number]> = {
  1: [-0.1, -0.95, 2.5], 2: [-0.2, -0.95, 1.3], 3: [0.1, 1.1, 1.7], 4: [-0.1, -0.95, 0.9], 5: [-0.1, -0.95, 1.5],
};

const DISH: EquipItem[] = [
  ...DISH_STAGES.map(({ n, label, at }) => {
    const [lx, lz, lw] = STAGE_LABEL[n];
    return put(`dish-stage-${n}`, 'dish', 'support.dishStage', at[0], at[1], 1.4, 1.4, { label, props: { ...FLAT, n, lx, lz, lw } });
  }),
  put('dish-rack-in', 'dish', 'support.dishRackIn', 44.25, 17.95, 2, 2.4, { label: 'Dirty rack table' }),
  put('dish-machine', 'dish', 'support.dishMachine', 46.55, 17.95, 2.6, 2.4, { h: 6.3, label: 'Pass-through dishwasher' }),
  put('dish-clean', 'dish', 'support.dishClean', 49.05, 17.95, 2.4, 2.4, { label: 'Clean table' }),
  put('dish-soiled', 'dish', 'support.dishSoiled', 46.85, 29.2, 3.2, 1.6, { rot: 270, label: 'Soiled table' }),
  put('dish-sinks', 'dish', 'support.sinkBank', 44.95, 34.675, 3.3, 2.05, { rot: 180, h: 4.25, label: 'Three-compartment sink bank' }),
  put('dish-rack-store', 'dish', 'support.dishRack', 49.7, 25.325, 3.35, 1.1, { rot: 270, h: 5.1, label: 'Ware storage rack', props: { mode: 'store' } }),
  put('dish-rack-dry', 'dish', 'support.dishRack', 49.7, 29.4, 4.4, 1.1, { rot: 270, h: 5.1, label: 'Drying rack', props: { mode: 'dry' } }),
  put('dish-recycle', 'dish', 'support.recycleBins', 49.65, 34.5, 2.2, 1.1, { rot: 270, h: 2.3, label: 'Recycle bins' }),
  put('dish-trolley', 'dish', 'support.dishTrolley', 44.1, 22, 3, 1.5, { rot: 90, h: 3.4, label: 'Ware trolley' }),
  put('dish-pots', 'dish', 'support.potRail', 43.6, 30.4, 4, 0.6, { rot: 90, label: 'Pot rail', props: OVERHEAD }),
];

// ---------------------------------------------------------------------------
// Staff Lockers (x 54-60, z 16.5-24). Door W@z20. Locker rows on the north and east walls, bench on the south wall.
// ---------------------------------------------------------------------------
const LOCKERS: EquipItem[] = [
  put('lockers-north', 'lockers', 'support.lockers', 56.95, 17.5, 5.3, 1.5, { h: 6, label: 'Staff lockers', props: { n: 5, first: 1 } }),
  put('lockers-east', 'lockers', 'support.lockers', 58.85, 20.95, 5.3, 1.5, { rot: 270, h: 6, label: 'Staff lockers', props: { n: 5, first: 6, alt: 1 } }),
  put('lockers-bench', 'lockers', 'support.lockerBench', 56.35, 22.85, 3.3, 1.1, { rot: 180, h: 1.6, label: 'Changing bench' }),
  put('lockers-mat', 'lockers', 'support.doorMat', 55.4, 20.2, 2, 1.6, { props: FLAT }),
];

// ---------------------------------------------------------------------------
// Electrical & UPS Room (x 54-60, z 24-32). Door W@z28. UPS pair on the north wall, boards on the east wall, the
// cable tray runs over both and ends in the west wall.
// ---------------------------------------------------------------------------
const ELEC: EquipItem[] = [
  put('elec-ups-1', 'elec', 'support.ups', 55.5, 25.35, 2, 2.1, { h: 6.2, label: 'UPS cabinet' }),
  put('elec-ups-2', 'elec', 'support.ups', 57.75, 25.35, 2, 2.1, { h: 6.2, label: 'UPS cabinet' }),
  ...[27.35, 29.1, 30.85].map((cz, i) =>
    put(`elec-db-${i + 1}`, 'elec', 'support.panel', 59.4, cz, 1.5, 0.4, {
      rot: 270, h: 3.6, label: 'Distribution board', props: { tag: `DB-${i + 1}`, y0: 1.8 },
    })),
  put('elec-tray-n', 'elec', 'support.cableTray', 56.85, 25, 5.1, 0.9, { label: 'Cable tray', props: { ...OVERHEAD, wallEnd: true } }),
  put('elec-tray-e', 'elec', 'support.cableTray', 59, 28.525, 6.15, 0.9, { rot: 270, label: 'Cable tray', props: OVERHEAD }),
  put('elec-mat', 'elec', 'support.rubberMat', 58.3, 29.1, 1.5, 5.2, { props: FLAT }),
];

// ---------------------------------------------------------------------------
// Toilets (x 54-60, z 40-46, 6 x 6 ft). Door W@z43. The 3 x 3 ft door zone stays free, so one male and one female cubicle
// (2.6 x 2.6 ft each) share the east strip and the basins sit on the north and south strips.
// ---------------------------------------------------------------------------
const TOILETS: EquipItem[] = [
  put('toilets-bank', 'toilets', 'support.toiletBank', 58.3, 43.05, 5.2, 2.6, {
    rot: 270, h: 6.2, label: 'Cubicles (1 male, 1 female)', props: { n: 2, split: 1 },
  }),
  put('toilets-vanity-n', 'toilets', 'support.vanity', 55.85, 40.825, 2.1, 1.05, { h: 2.9, label: 'Basins and mirrors' }),
  put('toilets-vanity-s', 'toilets', 'support.vanity', 55.85, 45.175, 2.1, 1.05, { rot: 180, h: 2.9, label: 'Basins and mirrors' }),
  put('toilets-dryer-n', 'toilets', 'support.dryer', 54.425, 40.8, 0.8, 0.35, { rot: 90, label: 'Hand dryer' }),
  put('toilets-dryer-s', 'toilets', 'support.dryer', 54.425, 45.2, 0.8, 0.35, { rot: 90, label: 'Hand dryer' }),
];

// ---------------------------------------------------------------------------
// Emergency Exit Lobby (x 54-60, z 46-50, 6 x 4 ft). Doors W@z48 and the outward-opening emergency door S@57. The two 3 x 3 ft
// door zones take most of the floor, so the dressing is decals (boot mat, escape-route line, hazard strip on the threshold)
// plus a boot bench, apron hooks and a FIRE EXIT KEEP CLEAR plate on the east wall strip and the north wall.
// ---------------------------------------------------------------------------
const EXIT: EquipItem[] = [
  put('exit-mat', 'exit', 'support.doorMat', 54.95, 48, 1.2, 1.4, { props: FLAT }),
  put('exit-route', 'exit', 'support.escapeRoute', 56.375, 48.56, 1.45, 1.28, { props: FLAT }),
  put('exit-hazard', 'exit', 'production.hazardStripe', 57, 49.4, 2.8, 0.35, { props: FLAT }),
  put('exit-bench', 'exit', 'support.lockerBench', 59.15, 47.45, 2.2, 0.95, { rot: 270, h: 1.5, label: 'Boot bench' }),
  put('exit-aprons', 'exit', 'support.apronRail', 59.525, 47.45, 2.2, 0.2, { rot: 270, label: 'Apron hooks', props: { overlap: true } }),
  put('exit-plate', 'exit', 'support.keepClear', 58.3, 46.3, 2, 0.1, { label: 'Fire exit keep clear plate' }),
];

// ---------------------------------------------------------------------------
// Fire Staircase (x 0-7, z 0-13.5). Door S@3.5: the flights stop at z 10.4, leaving the door zone free.
// ---------------------------------------------------------------------------
const STAIR: EquipItem[] = [
  put('stair-flights', 'stair', 'support.stair', 3.575, 5.4, 6.35, 10, { h: 6.5, label: 'Fire stair, half-landing' }),
];

// ---------------------------------------------------------------------------
// Passenger Lift (3 x 3 ft, PASSENGER_LIFT in layout.ts): doors face the lobby; the staff route east of it stays clear.
// ---------------------------------------------------------------------------
const LIFT: EquipItem[] = [
  put('lobby-lift', 'lobby', 'support.lift', PASSENGER_LIFT.x + PASSENGER_LIFT.w / 2, PASSENGER_LIFT.z + PASSENGER_LIFT.d / 2, PASSENGER_LIFT.w, PASSENGER_LIFT.d, {
    h: 8.4, label: 'Passenger lift',
  }),
];

export const SUPPORT_EQUIPMENT: EquipItem[] = [...WASTE, ...DISH, ...LOCKERS, ...ELEC, ...TOILETS, ...EXIT, ...STAIR, ...LIFT];
