// Shared data types. All geometry: 1 unit = 1 ft, origin = NW corner of footprint,
// +x = east, +z = south (down the plan), +y = up.

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Side = 'N' | 'S' | 'E' | 'W';
export type PresetId = 'aerial' | 'plan' | 'kitchen' | 'entrance';

export type ZoneId = 'veg' | 'jain' | 'vegan' | 'nonveg' | 'creator';
export type GroupId = 'prep' | 'cooking' | 'production' | 'support';

export type RoomId =
  | 'stair' | 'veg' | 'jain' | 'vegan' | 'nonveg' | 'bakery' | 'cold' | 'dry' | 'lift' | 'recv'
  | 'dessert' | 'pack' | 'kitchen' | 'dish'
  | 'dispatch' | 'rider' | 'waste' | 'garden'
  | 'lockers' | 'elec' | 'creator' | 'toilets' | 'exit';

export type CirculationId =
  | 'top-corridor' | 'left-corridor' | 'return-corridor'
  | 'bottom-corridor' | 'spine' | 'lobby';

export type SpaceId = RoomId | CirculationId | 'outside';

export type FloorKind = 'quarry' | 'steel' | 'concrete' | 'cream' | 'timber' | 'garden';

export interface Rect { x: number; z: number; w: number; d: number }

export interface Room extends Rect {
  id: RoomId;
  name: string;
  group: GroupId;
  zone?: ZoneId;
  floor: FloorKind;
  /** Wall sides that are glazed (glass partition / glazing) instead of solid. */
  glass?: Side[];
  /** 1–2 line client-facing purpose. Written in src/data/roomCopy.ts. */
  purpose: string;
  /** 2–3 client-facing design-note bullets. Written in src/data/roomCopy.ts. */
  notes: string[];
}

export interface RoomCopy {
  purpose: string;
  notes: string[];
}

export interface Circulation extends Rect {
  id: CirculationId;
  name: string;
}

export interface Zone {
  id: ZoneId;
  name: string;
  /** Saturated functional colour (plan legend). Use saturated only on floors and strips. */
  color: string;
  /** true for the four dietary zones (creator corner is the 5th, blue, non-dietary zone). */
  dietary: boolean;
}

export interface RoomGroup {
  id: GroupId;
  name: string;
}

export type OpeningKind =
  | 'door' | 'double' | 'emergency' | 'glazed' | 'service' | 'logo' | 'pass' | 'ribbon';

/**
 * A cut in a wall. `wall: 'h'` = wall running east-west at z = `at` (N/S walls);
 * `wall: 'v'` = wall running north-south at x = `at` (E/W walls).
 * `c` = centre along the wall (x for 'h', z for 'v'). A door on a wall shared by
 * two rooms is ONE opening.
 */
export interface Opening {
  id: string;
  kind: OpeningKind;
  wall: 'h' | 'v';
  at: number;
  c: number;
  w: number;
  y0: number;
  y1: number;
  /** The two spaces this opening connects (doors/pass only). */
  rooms?: [SpaceId, SpaceId];
  label?: string;
}

// ---------------------------------------------------------------------------
// Equipment (data-driven; rendered by src/scene/equipment via the kind registry)
// ---------------------------------------------------------------------------
export interface EquipItem {
  id: string;
  /** Owning room (or 'outside' / a circulation id). */
  room: SpaceId;
  /** Key into the kind registry (src/scene/equipment/registry.ts). */
  kind: string;
  /** NW corner of the item's footprint, world ft (same convention as rooms). */
  x: number;
  z: number;
  /** Footprint size along local x / local z, ft. */
  w: number;
  d: number;
  /** Height hint, ft (kind-specific). */
  h?: number;
  /** Rotation about the vertical axis in degrees, about the footprint centre.
   *  At 0 the item "faces" +z (south); 90 faces east, 180 north, 270 west. */
  rot?: number;
  label?: string;
  color?: string;
  props?: Record<string, number | string | boolean>;
}

// ---------------------------------------------------------------------------
// Flows and safety (authored in src/data/flows.ts and src/data/safety.ts)
// ---------------------------------------------------------------------------
export type FlowId = 'raw' | 'staff' | 'dirty' | 'orders';

export interface FlowStage {
  /** e.g. dishwashing stage markers 1–5 */
  n: number;
  label: string;
  at: Vec2;
}

export interface Flow {
  id: FlowId;
  name: string;
  color: string;
  /** One-line explanation used in the legend and Zones & Flow section. */
  summary: string;
  /** Polylines in (x, z). Each branch is its own polyline. Flow direction = point order. */
  paths: Vec2[][];
  stages?: FlowStage[];
}

export type SafetyKind =
  | 'extinguisher' | 'smoke' | 'heat' | 'lpg' | 'gasvalve' | 'emlight' | 'exit';

export interface SafetyPoint {
  id: string;
  kind: SafetyKind;
  x: number;
  z: number;
  /** Height above floor, ft. */
  y: number;
  /** Direction the marker faces, degrees (same convention as EquipItem.rot: 0 = south, 90 = east, 180 = north, 270 = west). */
  rot?: number;
  room?: SpaceId;
  label?: string;
}
