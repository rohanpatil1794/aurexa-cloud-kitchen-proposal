// Equipment for the "production" group: Bakery, Receiving, Goods Lift, Dessert, Packing & QC and Dispatch.
// Kind builders live in src/scene/equipment/kinds/production*.ts.
import type { EquipItem, RoomId } from '../types';
import { BIN_COLORS, BRAND } from '../../lib/palette';

/**
 * Item placed by the world position of its footprint CENTRE. EquipItem.x / z are the NW corner of the
 * unrotated footprint; rotating an item turns it about that same centre, so the centre is the stable anchor.
 */
function put(
  room: RoomId, id: string, kind: string, cx: number, cz: number, w: number, d: number, extra: Partial<EquipItem> = {},
): EquipItem {
  return { id, room, kind, x: cx - w / 2, z: cz - d / 2, w, d, ...extra };
}

const OVERHEAD = { overhead: true } as const;
const FLAT = { flat: true } as const;

const bakery: EquipItem[] = [
  // Back line along the north wall, fronts facing the room: mixer, proofer, deck ovens.
  put('bakery', 'bakery-mixer', 'production.spiralMixer', 31.8, 1.9, 2.7, 2.8, { h: 4.4, label: 'Spiral mixer' }),
  put('bakery', 'bakery-proofer', 'production.proofer', 34.7, 1.8, 2.6, 2.6, { h: 6.2, label: 'Proofer' }),
  put('bakery', 'bakery-ovens', 'production.deckOven', 37.9, 2.15, 3.4, 3.4, { h: 6.3, label: 'Deck oven stack' }),
  put('bakery', 'bakery-table', 'production.workTable', 33.8, 7.2, 4.8, 2.5, { label: 'Work table' }),
  // Racks parked against the east and west walls, clear of the double door's landing and the oven fronts.
  put('bakery', 'bakery-rack-e1', 'production.rollRack', 38.8, 8.7, 1.8, 2.2, { props: { load: 'baguette' } }),
  put('bakery', 'bakery-rack-e2', 'production.rollRack', 38.8, 11, 1.8, 2.2, { props: { load: 'loaf' } }),
  put('bakery', 'bakery-rack-w1', 'production.rollRack', 31.3, 9.7, 1.8, 2.2, { props: { load: 'rolls' } }),
  put('bakery', 'bakery-rack-w2', 'production.rollRack', 31.3, 12, 1.8, 2.2),
];

const receiving: EquipItem[] = [
  // The east wall carries the receiving line (weigh, stage, inspect); the middle stays clear for the three doors.
  put('recv', 'recv-scale', 'production.floorScale', 59.075, 6.6, 2.4, 1.05, { rot: 270, label: 'Floor scale' }),
  put('recv', 'recv-pallet', 'production.palletCrates', 58.3, 9.2, 2.6, 2, { label: 'Delivery pallet' }),
  put('recv', 'recv-inspect', 'production.inspectTable', 59.075, 11.9, 2.6, 1.05, { rot: 270, label: 'Inspection table' }),
  put('recv', 'recv-bin-reject', 'production.bin', 54.9, 6, 1, 1, { color: BIN_COLORS.red, label: 'REJECT', h: 2.2 }),
  put('recv', 'recv-bin-packaging', 'production.bin', 54.9, 7.2, 1, 1, { color: BRAND.teal, label: 'PACKAGING', h: 2.2 }),
];

const lift: EquipItem[] = [
  put('lift', 'lift-shaft', 'production.liftShaft', 57, 1.2, 5.2, 1.5, { h: 9.4, label: 'Goods lift' }),
  put('lift', 'lift-threshold', 'production.hazardStripe', 57, 2.15, 3.8, 0.4, { props: FLAT }),
  put('lift', 'lift-crates', 'production.crateStack', 54.9, 3.9, 1.1, 0.95),
];

const dessert: EquipItem[] = [
  // Freezers flank the east door like gate posts; the marble island is the hero, clear of both door landings.
  put('dessert', 'dessert-freezer-1', 'production.freezer', 8.6, 17.9, 2.2, 2.2, { rot: 270, h: 6.4, label: 'Freezer' }),
  put('dessert', 'dessert-freezer-2', 'production.freezer', 8.6, 23.15, 2.2, 2.2, { rot: 270, h: 6.4, label: 'Freezer' }),
  put('dessert', 'dessert-marble', 'production.marbleCounter', 4.4, 20.4, 4.8, 2, { label: 'Marble counter' }),
  put('dessert', 'dessert-shelf', 'production.trayShelf', 1.6, 17.5, 2.2, 1.4, { h: 5.5, label: 'Tray shelving' }),
  put('dessert', 'dessert-rack', 'production.rollRack', 3.9, 17.6, 1.8, 1.6, { h: 5.4, props: { load: 'dessert' } }),
];

const pack: EquipItem[] = [
  // Central packing table: four 2.2 ft modules side by side, each with its own tool; teal apron on the outer faces.
  put('pack', 'pack-table-nw', 'production.packModule', 3.6, 30.3, 2.2, 2.2, { props: { tool: 'sealer', out: 'NW' }, label: 'Packing table' }),
  put('pack', 'pack-table-ne', 'production.packModule', 5.8, 30.3, 2.2, 2.2, { props: { tool: 'scale', out: 'NE' } }),
  put('pack', 'pack-table-sw', 'production.packModule', 3.6, 32.5, 2.2, 2.2, { props: { tool: 'printer', out: 'SW' } }),
  put('pack', 'pack-table-se', 'production.packModule', 5.8, 32.5, 2.2, 2.2, { props: { tool: 'boxes', out: 'SE' } }),
  put('pack', 'pack-qc-lamp', 'production.qcLamp', 4.7, 31.4, 4.4, 4.4, { props: OVERHEAD, label: 'QC lamp' }),
  put('pack', 'pack-shelf-e', 'production.packShelf', 9.05, 30.1, 10.2, 1.4, { rot: 270, h: 6.2, label: 'Packaging stock' }),
  put('pack', 'pack-shelf-w', 'production.packWallShelf', 0.75, 31, 9, 0.7, { rot: 90 }),
  put('pack', 'pack-trolley', 'production.orderTrolley', 1.6, 38.9, 2, 3, { label: 'Order trolley' }),
  put('pack', 'pack-bin-waste', 'production.bin', 1.1, 25.6, 1.2, 1.2, { color: BIN_COLORS.grey, label: 'WASTE', h: 2.4 }),
  put('pack', 'pack-bin-recycle', 'production.bin', 2.5, 25.6, 1.2, 1.2, { color: BRAND.teal, label: 'RECYCLE', h: 2.4 }),
];

const dispatch: EquipItem[] = [
  // Counter splits the room: staff and racks to the north, riders and the double door to the south.
  put('dispatch', 'dispatch-counter', 'production.handoverCounter', 6.7, 45.2, 7.4, 1.6, { h: 3.4, label: 'Hand-over counter' }),
  put('dispatch', 'dispatch-rack-nw', 'production.bagRack', 2.45, 41.95, 3.9, 1.3, { h: 4.3, label: 'Bagged orders' }),
  put('dispatch', 'dispatch-rack-ne', 'production.bagRack', 9, 41.95, 2.8, 1.3, { h: 4.3 }),
  put('dispatch', 'dispatch-rack-w', 'production.bagRack', 1.1, 47.9, 3.2, 1.3, { rot: 90, h: 4.3 }),
  put('dispatch', 'dispatch-board', 'production.orderBoard', 2.45, 41.37, 3.8, 0.18, { h: 2, props: OVERHEAD, label: 'Order board' }),
  put('dispatch', 'dispatch-bench', 'production.riderBench', 13.125, 48.1, 2.8, 1.15, { rot: 270, label: 'Rider bench' }),
  put('dispatch', 'dispatch-decal', 'production.handoverDecal', 6.9, 46.7, 3.6, 0.55, { props: FLAT }),
];

export const PRODUCTION_EQUIPMENT: EquipItem[] = [...bakery, ...receiving, ...lift, ...dessert, ...pack, ...dispatch];
