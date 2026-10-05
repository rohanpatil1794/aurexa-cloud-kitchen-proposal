// The four workflow layers, authored as plan polylines (x, z) in ft. Flow direction = point order.
//
// Rules the routes follow (scripts/validate-layout.ts section 8 enforces them):
//   - a polyline crosses a wall only through a real opening, at door-centre height (y 0.2);
//   - flows that share a corridor run in their own lane, FLOW_RIBBON.pitch apart, so ribbons never overlap
//     (the top corridor carries raw / staff / dirty side by side, the spine carries dirty / staff);
//   - a branch starts exactly on the path it leaves; the renderer trims it back to the parent's edge.
import { CIRCULATION, DISH_STAGES, OPENINGS, ROOM_BY_ID, STAFF_ENTRANCE, openingPoint } from './layout';
import type { CirculationId, Flow, FlowId, Vec2 } from './types';
import { FLOW_COLORS } from '../lib/palette';

/** Ribbon presentation shared by the renderer and the validator. */
export const FLOW_RIBBON = {
  /** Ribbon width, ft: three lanes fit the 2.5 ft clear width of the top corridor. */
  width: 0.7,
  /** Centre-to-centre distance of two flows sharing a corridor, ft. */
  pitch: 0.8,
  /** Corner radius, ft. */
  radius: 0.8,
  /** Travel speed of the arrowheads, ft per second. */
  speed: 2.5,
  /** Narrowest a ribbon draws on screen (CSS px): the renderer widens it with distance, e.g. on a phone. */
  minPx: 7,
  /** The widest a ribbon may be drawn, x its width, and the clear space kept between two widened ribbons of different flows, ft. */
  maxGrow: 1.7,
  growGap: 0.06,
} as const;

/**
 * A second cue besides colour, so the flows stay apart for colour-blind viewers (olive and orange, teal and black):
 *   single = a solid band with one chevron per repeat;   double = a solid band with a pair of chevrons;
 *   dashed = a broken band with a chevron on each dash;  solid = a solid band with a filled arrowhead.
 * The 3D ribbons (flowsTexture.ts) and the legend swatches draw the same pattern.
 */
export type FlowPattern = 'single' | 'double' | 'dashed' | 'solid';
export const FLOW_PATTERNS: Record<FlowId, FlowPattern> = { raw: 'single', staff: 'double', dirty: 'dashed', orders: 'solid' };

const doorAt = (id: string): Vec2 => {
  const o = OPENINGS.find((d) => d.id === id);
  if (!o) throw new Error(`flows: unknown opening ${id}`);
  return openingPoint(o);
};
const centre = (id: CirculationId, axis: 'x' | 'z'): number => {
  const c = CIRCULATION.find((s) => s.id === id);
  if (!c) throw new Error(`flows: unknown circulation ${id}`);
  return axis === 'x' ? c.x + c.w / 2 : c.z + c.d / 2;
};

/** Two flows through one door sit this far either side of its centre line. */
const DOOR_PAIR = 0.7;
/** How far a path runs into a room beyond its door, ft. */
const INTO_ROOM = 2.5;

// ---- lanes ------------------------------------------------------------------
const TOP_C = centre('top-corridor', 'z'); // 15
const LANE = FLOW_RIBBON.pitch;
const TOP = { raw: TOP_C - LANE, staff: TOP_C, dirty: TOP_C + LANE };
/** Staff Spine (clear x 50.75-53.75): dirty ware on the west lane, staff on the east lane. */
const SPINE = { dirty: 51.4, staff: 52.5 };
const LEFT_X = centre('left-corridor', 'x'); // 12.5
const RETURN_X = centre('return-corridor', 'x'); // 41.75
const BOTTOM_C = centre('bottom-corridor', 'z'); // 38.5
/** Bottom corridor: orders on the north lane (door centre of Pack), waste on the south lane. */
const BOTTOM = { orders: doorAt('pack-E38')[1], waste: BOTTOM_C + 1.1 };

// ---- 1. raw material --------------------------------------------------------
const lift = ROOM_BY_ID.lift;
/** Trunk lane through the lift and Receiving, a little west of the door centre so it clears the pallet bay. */
const TRUNK_X = doorAt('lift-S57')[0] - 0.6;
/** North-row branches stop at the edge of the 3 ft clear zone inside each door, so they never run under equipment. */
const PREP_END_Z = 13.5 - 3;
const rawNorth = ['dry-S50.5', 'cold-S43.5', 'bakery-S35', 'nonveg-S26', 'vegan-S19.5', 'jain-S14.5', 'veg-S9.5'].map((id) => doorAt(id)[0]);
const KITCHEN_FEED_Z = 22;
const kitchenN21 = doorAt('kitchen-N21')[0];
const kitchenN34 = doorAt('kitchen-N34')[0];

const rawPaths: Vec2[][] = [
  // trunk: goods lift -> Receiving -> top corridor, ending in the westernmost prep room
  [[TRUNK_X, lift.z + lift.d / 2], [TRUNK_X, TOP.raw], [rawNorth[6], TOP.raw], [rawNorth[6], PREP_END_Z]],
  ...rawNorth.slice(0, 6).map((x): Vec2[] => [[x, TOP.raw], [x, PREP_END_Z]]),
  [[kitchenN21, TOP.raw], [kitchenN21, KITCHEN_FEED_Z]],
  [[kitchenN34 - DOOR_PAIR, TOP.raw], [kitchenN34 - DOOR_PAIR, KITCHEN_FEED_Z]],
];

// ---- 2. staff ---------------------------------------------------------------
const kitchenW = doorAt('kitchen-W22');
const dishE = doorAt('dish-E22');
const staffRooms = ['lockers-W20', 'elec-W28', 'creator-W36', 'toilets-W43'].map(doorAt);

const staffPaths: Vec2[][] = [
  // logo door -> spine -> top corridor -> left corridor -> kitchen west door
  [
    [SPINE.staff, STAFF_ENTRANCE.z + 1], [SPINE.staff, TOP.staff], [LEFT_X, TOP.staff],
    [LEFT_X, kitchenW[1]], [kitchenW[0] + INTO_ROOM, kitchenW[1]],
  ],
  ...staffRooms.map(([x, z]): Vec2[] => [[SPINE.staff, z], [x + INTO_ROOM, z]]),
  // into the dishwashing room, south of the ware leaving it
  [[SPINE.staff, dishE[1] + DOOR_PAIR], [dishE[0] - 1.1, dishE[1] + DOOR_PAIR]],
];

// ---- 3. dirty / utensils / waste ---------------------------------------------
const kitchenE = doorAt('kitchen-E26');
const [s1, s2, s3, s4] = DISH_STAGES.map((s) => s.at);
const wasteN = doorAt('waste-N27');
const CLEAN_RETURN_Z = 19.5; // clean ware enters the kitchen 3 ft past its north door
const DISH_EXIT_Z = dishE[1] - DOOR_PAIR;
/** The sink bank stands south of stage 2: the west lane turns east just before it and rejoins the stage 3 marker beside the bank. */
const SINK_TURN_Z = s2[1] + 0.8;

const dirtyPaths: Vec2[][] = [
  // kitchen -> return corridor -> the five-stage U (west lane south, east lane north) -> spine -> top corridor -> kitchen
  [
    [kitchenE[0] - INTO_ROOM, kitchenE[1]], [s1[0], kitchenE[1]], [s1[0], SINK_TURN_Z], [s3[0], SINK_TURN_Z], [s3[0], s3[1]],
    [s4[0], s3[1]], [s4[0], DISH_EXIT_Z],
    [SPINE.dirty, DISH_EXIT_Z], [SPINE.dirty, TOP.dirty], [kitchenN34 + DOOR_PAIR, TOP.dirty], [kitchenN34 + DOOR_PAIR, CLEAN_RETURN_Z],
  ],
  // waste: leaves the kitchen door, down the return corridor, west along the bottom corridor into Waste Management
  [[RETURN_X, kitchenE[1]], [RETURN_X, BOTTOM.waste], [wasteN[0], BOTTOM.waste], [wasteN[0], wasteN[1] + 3]],
];

// ---- 4. orders out ------------------------------------------------------------
const packE = doorAt('pack-E38');
const packS = doorAt('pack-S6');
const dispatchS = doorAt('dispatch-S10.5');
const PASS_X = 28;
/** A floor ribbon cannot pass the counter-height window (sill y 0-3), so the flow starts on the corridor side of the pass. */
const PASS_OUT_Z = 36.5;
const DISPATCH_TURN_Z = 44;
/** East of the door centre line, past the end of the hand-over counter. */
const DISPATCH_X = dispatchS[0] + 0.9;
const PICKUP_Z = 53;

const orderPaths: Vec2[][] = [
  [
    [PASS_X, PASS_OUT_Z], [PASS_X, BOTTOM.orders], [packS[0], packE[1]], [packS[0], DISPATCH_TURN_Z],
    [DISPATCH_X, DISPATCH_TURN_Z], [DISPATCH_X, PICKUP_Z],
  ],
];

// ---- exports ------------------------------------------------------------------
export const FLOWS: Flow[] = [
  {
    id: 'raw',
    name: 'Raw material',
    color: FLOW_COLORS.raw,
    summary: 'From the goods lift through Receiving and the top corridor into storage, prep, bakery and kitchen.',
    paths: rawPaths,
  },
  {
    id: 'staff',
    name: 'Staff',
    color: FLOW_COLORS.staff,
    summary: 'Logo door, spine and top corridor to the kitchen, with side routes to lockers, toilets and the creator corner.',
    paths: staffPaths,
  },
  {
    id: 'dirty',
    name: 'Dirty, utensils & waste',
    color: FLOW_COLORS.dirty,
    summary: 'Used ware runs the five-stage wash line and returns clean by the spine; waste has its own route out.',
    paths: dirtyPaths,
    stages: DISH_STAGES.map(({ n, label, at }) => ({ n, label, at })),
  },
  {
    id: 'orders',
    name: 'Orders out',
    color: FLOW_COLORS.orders,
    summary: 'From the kitchen pass through Packing and Dispatch to the rider pickup zone.',
    paths: orderPaths,
  },
];

export const FLOW_BY_ID = Object.fromEntries(FLOWS.map((f) => [f.id, f])) as Record<FlowId, Flow>;

/** Colour, name and summary of one flow (legend, Zones & Flow section). */
export const flowInfo = (id: FlowId): Pick<Flow, 'id' | 'name' | 'color' | 'summary'> => FLOW_BY_ID[id];

/** Length of a polyline, ft. */
export function pathLength(path: readonly Vec2[]): number {
  let len = 0;
  for (let i = 1; i < path.length; i++) len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return len;
}

/** Length of a flow's main route (its first polyline) to the nearest foot, derived from the layout. */
export const flowRouteFt = (id: FlowId): number => Math.round(pathLength(FLOW_BY_ID[id].paths[0]));
