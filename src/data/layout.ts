// SINGLE SOURCE OF TRUTH for geometry. Walls, floors, labels, room list, info cards,
// camera presets, flows and safety points are all generated from this data.
//
// Coordinates: 1 unit = 1 ft. Origin = NW corner of the footprint. +x east, +z south, +y up.
// Footprint 60 (x) × 50 (z). Top of the plan is north. Snap rooms to 0.5 ft.
//
// Deviations from the original LAYOUT SPEC are listed, one per line, in DECISIONS.md.
import type {
  Circulation, Opening, OpeningKind, Room, RoomGroup, RoomId, SpaceId, Zone, ZoneId, GroupId,
  FloorKind, Side,
} from './types';
import { ROOM_COPY } from './roomCopy';
import { ZONE_COLORS } from '../lib/palette';

export * from './types';

export const FOOTPRINT = { w: 60, d: 50 } as const;
export const GRID = 0.5;

export const WALL = {
  /** Full wall height, ft. */
  height: 10,
  /** Dollhouse wall height, ft. */
  dollhouse: 3.5,
  /** Interior wall thickness, ft. */
  thickness: 0.5,
  /** Outer wall thickness, ft. */
  outer: 0.75,
  /** Zone-coloured base band height, ft. */
  band: 1.5,
  /** Plinth margin around the footprint, ft (total 3 ft wider => 1.5 each side). */
  plinthMargin: 1.5,
} as const;

export const DOOR = { w: 3, h: 7 } as const;
export const EYE_HEIGHT = 5.5;

export const GROUPS: RoomGroup[] = [
  { id: 'prep', name: 'Prep & Storage' },
  { id: 'cooking', name: 'Cooking' },
  { id: 'production', name: 'Production & Dispatch' },
  { id: 'support', name: 'Support & People' },
];

export const ZONES: Record<ZoneId, Zone> = {
  veg: { id: 'veg', name: 'Vegetarian', color: ZONE_COLORS.veg, dietary: true },
  jain: { id: 'jain', name: 'Jain', color: ZONE_COLORS.jain, dietary: true },
  vegan: { id: 'vegan', name: 'Vegan', color: ZONE_COLORS.vegan, dietary: true },
  nonveg: { id: 'nonveg', name: 'Non-Veg', color: ZONE_COLORS.nonveg, dietary: true },
  creator: { id: 'creator', name: 'Content (blue)', color: ZONE_COLORS.creator, dietary: false },
};

// ---------------------------------------------------------------------------
// Rooms:  id | name | x z w d | group | floor | extras
// ---------------------------------------------------------------------------
function room(
  id: RoomId, name: string, x: number, z: number, w: number, d: number,
  group: GroupId, floor: FloorKind, extra: { zone?: ZoneId; glass?: Side[] } = {},
): Room {
  return { id, name, x, z, w, d, group, floor, ...extra, ...ROOM_COPY[id] };
}

export const ROOMS: Room[] = [
  // North row (z 0 → 13.5)
  room('stair', 'Fire Staircase', 0, 0, 7, 13.5, 'support', 'concrete'),
  room('veg', 'Veg Prep', 7, 0, 5, 13.5, 'prep', 'quarry', { zone: 'veg' }),
  room('jain', 'Jain Prep', 12, 0, 5, 13.5, 'prep', 'quarry', { zone: 'jain' }),
  room('vegan', 'Vegan Prep', 17, 0, 5, 13.5, 'prep', 'quarry', { zone: 'vegan' }),
  room('nonveg', 'Non-Veg Prep', 22, 0, 8, 13.5, 'prep', 'quarry', { zone: 'nonveg' }),
  room('bakery', 'Bakery & Bread Production', 30, 0, 10, 13.5, 'cooking', 'quarry'),
  room('cold', 'Cold Storage', 40, 0, 7, 13.5, 'prep', 'steel'),
  room('dry', 'Dry Storage', 47, 0, 7, 13.5, 'prep', 'concrete'),
  room('lift', 'Goods Lift', 54, 0, 6, 5, 'prep', 'steel'),
  room('recv', 'Receiving & Inspection', 54, 5, 6, 8.5, 'prep', 'concrete'),
  // Second band (z 16.5 →)
  room('dessert', 'Dessert Production', 0, 16.5, 10, 8, 'production', 'quarry'),
  room('pack', 'Packing & Quality Control', 0, 24.5, 10, 16.5, 'production', 'quarry'),
  room('kitchen', 'Main Hot Kitchen', 15, 16.5, 25.5, 19.5, 'cooking', 'quarry'),
  room('dish', 'Dishwashing Area', 43, 16.5, 7.5, 19.5, 'cooking', 'quarry'),
  // South row (z 41 → 50)
  room('dispatch', 'Dispatch Area', 0, 41, 14, 9, 'production', 'cream'),
  room('rider', 'Rider Waiting Area', 14, 41, 8, 9, 'support', 'timber'),
  room('waste', 'Waste Management', 22, 41, 17, 9, 'support', 'concrete'),
  room('garden', 'Indoor Garden', 39, 41, 8, 9, 'support', 'garden', { glass: ['S', 'N'] }),
  // East column (x 54 → 60)
  room('lockers', 'Staff Lockers', 54, 16.5, 6, 7.5, 'support', 'cream'),
  room('elec', 'Electrical & UPS Room', 54, 24, 6, 8, 'support', 'concrete'),
  room('creator', 'Content Creator Corner', 54, 32, 6, 8, 'support', 'timber', { zone: 'creator', glass: ['W'] }),
  room('toilets', 'Male/Female Toilets', 54, 40, 6, 6, 'support', 'steel'),
  room('exit', 'Emergency Exit Lobby', 54, 46, 6, 4, 'support', 'concrete'),
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<RoomId, Room>;

// Circulation: not rooms, no extra walls, cream floor #f6e3c2. The rectangles partition the
// rest of the footprint exactly (no overlaps, no gaps; checked by scripts/validate-layout.ts).
export const CIRCULATION: Circulation[] = [
  { id: 'top-corridor', name: 'Top Corridor', x: 0, z: 13.5, w: 60, d: 3 },
  { id: 'left-corridor', name: 'Left Corridor', x: 10, z: 16.5, w: 5, d: 19.5 },
  { id: 'return-corridor', name: 'Kitchen-East Return Corridor', x: 40.5, z: 16.5, w: 2.5, d: 19.5 },
  { id: 'bottom-corridor', name: 'Bottom Corridor', x: 10, z: 36, w: 40.5, d: 5 },
  { id: 'spine', name: 'Staff Spine', x: 50.5, z: 16.5, w: 3.5, d: 24.5 },
  { id: 'lobby', name: 'Staff Lobby', x: 47, z: 41, w: 7, d: 9 },
];

/** Passenger Lift box (3 × 3 ft) in the staff lobby. Tucked against the garden wall so the staff route (x 50.5–54) stays clear. */
export const PASSENGER_LIFT = { x: 47.5, z: 41.2, w: 3, d: 3 } as const;

/** Staff Entrance: door in the south wall at x 52.2 (the Aurexa "logo door"). */
export const STAFF_ENTRANCE = { x: 52.2, z: 50, w: DOOR.w, h: DOOR.h } as const;

/** Outside ground: Delivery Partners Pickup Zone (south-west, in front of Dispatch + Rider). */
export const PICKUP_ZONE = { x: 0, z: 50, w: 22, d: 4.5 } as const;

// ---------------------------------------------------------------------------
// Openings (doors, ribbon windows, pass-through). A door on a shared wall is ONE opening.
// wall 'h' = east-west wall at z = at;  wall 'v' = north-south wall at x = at;  c = centre along the wall.
// ---------------------------------------------------------------------------
function op(
  id: string, kind: OpeningKind, wall: 'h' | 'v', at: number, c: number,
  rooms: [SpaceId, SpaceId] | undefined,
  o: { w?: number; y0?: number; y1?: number; label?: string } = {},
): Opening {
  return {
    id, kind, wall, at, c, rooms,
    w: o.w ?? DOOR.w, y0: o.y0 ?? 0, y1: o.y1 ?? DOOR.h, ...(o.label ? { label: o.label } : {}),
  };
}
const TOP: SpaceId = 'top-corridor';

export const OPENINGS: Opening[] = [
  // North row → top corridor (south walls at z 13.5)
  op('stair-S3.5', 'door', 'h', 13.5, 3.5, ['stair', TOP]),
  op('veg-S9.5', 'door', 'h', 13.5, 9.5, ['veg', TOP]),
  op('jain-S14.5', 'door', 'h', 13.5, 14.5, ['jain', TOP]),
  op('vegan-S19.5', 'door', 'h', 13.5, 19.5, ['vegan', TOP]),
  op('nonveg-S26', 'door', 'h', 13.5, 26, ['nonveg', TOP]),
  op('bakery-S35', 'double', 'h', 13.5, 35, ['bakery', TOP], { w: 4 }),
  op('cold-S43.5', 'door', 'h', 13.5, 43.5, ['cold', TOP]),
  op('dry-S50.5', 'door', 'h', 13.5, 50.5, ['dry', TOP]),
  op('recv-S57', 'door', 'h', 13.5, 57, ['recv', TOP]),
  op('lift-S57', 'door', 'h', 5, 57, ['lift', 'recv']), // = recv N@57 (one opening)
  op('dry-E9.5', 'door', 'v', 54, 9.5, ['dry', 'recv']), // = recv W@z9.5 (one opening)

  // Dessert / Packing
  op('dessert-E20.5', 'door', 'v', 10, 20.5, ['dessert', 'left-corridor']),
  op('pack-N5', 'door', 'h', 24.5, 5, ['pack', 'dessert']), // dessert S = pack N (one opening)
  op('pack-E38', 'door', 'v', 10, 38, ['pack', 'bottom-corridor']),
  op('pack-S6', 'door', 'h', 41, 6, ['pack', 'dispatch']), // = dispatch N@6 (one opening)

  // Main Hot Kitchen
  op('kitchen-N21', 'door', 'h', 16.5, 21, ['kitchen', TOP]),
  op('kitchen-N34', 'door', 'h', 16.5, 34, ['kitchen', TOP], { w: 3.5 }),
  op('kitchen-W22', 'door', 'v', 15, 22, ['kitchen', 'left-corridor']),
  op('kitchen-E26', 'door', 'v', 40.5, 26, ['kitchen', 'return-corridor']),
  // Long pass-through window: opening y 3 → 7 ft, x 16 → 39, with a counter.
  op('kitchen-pass', 'pass', 'h', 36, 27.5, ['kitchen', 'bottom-corridor'], { w: 23, y0: 3, y1: 7, label: 'Pass-through window' }),

  // Dishwashing
  op('dish-W26', 'door', 'v', 43, 26, ['dish', 'return-corridor']),
  op('dish-E22', 'door', 'v', 50.5, 22, ['dish', 'spine']),

  // South row
  op('dispatch-N12', 'door', 'h', 41, 12, ['dispatch', 'bottom-corridor']),
  op('dispatch-E45', 'door', 'v', 14, 45, ['dispatch', 'rider']), // = rider W (one opening)
  op('dispatch-S10.5', 'double', 'h', 50, 10.5, ['dispatch', 'outside'], { w: 4, label: 'Dispatch double door' }),
  op('dispatch-S4', 'emergency', 'h', 50, 4, ['dispatch', 'outside'], { label: 'Emergency Exit' }),
  op('rider-N18', 'door', 'h', 41, 18, ['rider', 'bottom-corridor']),
  op('rider-S18', 'door', 'h', 50, 18, ['rider', 'outside']),
  op('waste-N27', 'door', 'h', 41, 27, ['waste', 'bottom-corridor']),
  op('waste-N36', 'door', 'h', 41, 36, ['waste', 'bottom-corridor']),
  op('waste-S25', 'service', 'h', 50, 25, ['waste', 'outside'], { w: 4, label: 'Service door' }),
  op('garden-N43', 'glazed', 'h', 41, 43, ['garden', 'bottom-corridor'], { w: 4, label: 'Glazed double door' }),

  // Staff column (east) → spine / lobby
  op('lockers-W20', 'door', 'v', 54, 20, ['lockers', 'spine']),
  op('elec-W28', 'door', 'v', 54, 28, ['elec', 'spine']),
  op('creator-W36', 'door', 'v', 54, 36, ['creator', 'spine']),
  op('toilets-W43', 'door', 'v', 54, 43, ['toilets', 'lobby']),
  op('exit-W48', 'door', 'v', 54, 48, ['exit', 'lobby']),
  op('exit-S57', 'emergency', 'h', 50, 57, ['exit', 'outside'], { label: 'Emergency Exit' }),
  op('staff-entrance', 'logo', 'h', 50, STAFF_ENTRANCE.x, ['lobby', 'outside'], { label: 'Staff Entrance' }),

  // High ribbon windows on the north wall (z = 0): prep rooms + bakery
  op('veg-ribbon', 'ribbon', 'h', 0, 9.5, undefined, { w: 3.5, y0: 6.5, y1: 8.5 }),
  op('jain-ribbon', 'ribbon', 'h', 0, 14.5, undefined, { w: 3.5, y0: 6.5, y1: 8.5 }),
  op('vegan-ribbon', 'ribbon', 'h', 0, 19.5, undefined, { w: 3.5, y0: 6.5, y1: 8.5 }),
  op('nonveg-ribbon', 'ribbon', 'h', 0, 26, undefined, { w: 5.5, y0: 6.5, y1: 8.5 }),
  op('bakery-ribbon', 'ribbon', 'h', 0, 35, undefined, { w: 7, y0: 6.5, y1: 8.5 }),
];

/** Walk-through openings (everything except ribbon windows and the pass-through window). */
export const DOORS = OPENINGS.filter((o) => o.kind !== 'ribbon' && o.kind !== 'pass');
/** Window-type openings (ribbon windows + the kitchen pass-through). */
export const WINDOWS = OPENINGS.filter((o) => o.kind === 'ribbon' || o.kind === 'pass');

/** Openings that connect a given space (doors + pass-through; never ribbon windows). */
export function doorsOf(id: SpaceId): Opening[] {
  return OPENINGS.filter((o) => o.rooms?.includes(id));
}

/** Centre point (x, z) of an opening on its wall line. */
export function openingPoint(o: Opening): [number, number] {
  return o.wall === 'h' ? [o.c, o.at] : [o.at, o.c];
}

// ---------------------------------------------------------------------------
// Derived values (never hard-code these elsewhere)
// ---------------------------------------------------------------------------
export const roomArea = (r: Room) => r.w * r.d;
export const TOTAL_AREA = FOOTPRINT.w * FOOTPRINT.d;
export const ROOM_COUNT = ROOMS.length;
export const DIETARY_ZONE_COUNT = Object.values(ZONES).filter((z) => z.dietary).length;
/** Indian, Chinese, Continental and European islands (see data/equipment/kitchen.ts). */
export const CUISINE_STATION_COUNT = 4;

export const roomCenter = (r: Room): [number, number] => [r.x + r.w / 2, r.z + r.d / 2];

/** Rooms in display order: grouped (GROUPS order), then spec order within a group. */
export const ROOMS_GROUPED: { group: RoomGroup; rooms: Room[] }[] = GROUPS.map((group) => ({
  group,
  rooms: ROOMS.filter((r) => r.group === group.id),
}));
export const ROOM_ORDER: RoomId[] = ROOMS_GROUPED.flatMap((g) => g.rooms.map((r) => r.id));

export function neighbourRoom(id: RoomId, dir: 1 | -1): RoomId {
  const i = ROOM_ORDER.indexOf(id);
  return ROOM_ORDER[(i + dir + ROOM_ORDER.length) % ROOM_ORDER.length];
}

/** Which room contains the point (x, z)? */
export function roomAt(x: number, z: number): Room | undefined {
  return ROOMS.find((r) => x >= r.x && x < r.x + r.w && z >= r.z && z < r.z + r.d);
}

// ---------------------------------------------------------------------------
// Shared contracts between agents
// ---------------------------------------------------------------------------
/**
 * Dishwashing line: five numbered stages in a U (west lane southbound from the kitchen-side door,
 * east lane northbound to the exit door). The Dishwashing dressing places its numbered markers and
 * equipment here; the Dirty / Utensils / Waste flow runs through these points in order.
 * Dish room is x 43–50.5, z 16.5–36; doors: W@z26 (x 43) and E@z22 (x 50.5).
 */
export const DISH_STAGES: { n: number; label: string; at: [number, number] }[] = [
  { n: 1, label: 'Dirty collection', at: [45, 27.5] },
  { n: 2, label: 'Wash', at: [45, 31.5] },
  { n: 3, label: 'Sanitize', at: [47.5, 34] },
  { n: 4, label: 'Dry', at: [48.5, 29.5] },
  { n: 5, label: 'Storage', at: [48.5, 24.5] },
];

/** Kitchen gas ring main (ft, plan coordinates; pipe height 9 ft): west x 14, south z 38.5, east x 42, north z 16. */
export const GAS_RING = { west: 14, south: 38.5, east: 42, north: 16, y: 9 } as const;
