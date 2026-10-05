// Main Hot Kitchen: the four cuisine islands (z 24-30), the pass counter (z 34-36) and the small
// working-kitchen touches. Kind builders: src/scene/equipment/kinds/kitchenIslands.ts.
//
// Island accents are brand colours (never the zone colours). The European island is x 34-37 (not 34-40)
// so the 3 ft clear zone inside the east door kitchen-E26 (x 37.5-40.5, z 24.5-27.5) stays open.
import type { EquipItem } from '../types';
import { BRAND } from '../../lib/palette';

const ROOM = 'kitchen';
const ACCENT = { indian: BRAND.orange, chinese: BRAND.teal, continental: BRAND.olive, european: BRAND.sand } as const;

/**
 * An item whose WORLD footprint is x0..x0+wx, z0..z0+wz, turned `rot` degrees. EquipItem stores the
 * unrotated rectangle (rot turns it about its centre), so a 90 degree turn swaps w and d.
 */
function turned(x0: number, z0: number, wx: number, wz: number, rot: 90 | 270) {
  const cx = x0 + wx / 2, cz = z0 + wz / 2;
  const w = wz, d = wx;
  return { x: cx - w / 2, z: cz - d / 2, w, d, rot };
}

const flat = { flat: true };
const stands = { overlap: true };
const overhead = { overhead: true };

export const KITCHEN_ISLANDS_EQUIPMENT: EquipItem[] = [
  // ------------------------------------------------------------ INDIAN  x 16.5-21.5
  { id: 'kis-indian', room: ROOM, kind: 'kitchenIslands.indian', x: 16.5, z: 24, w: 5, d: 6, label: 'Indian island', color: ACCENT.indian },
  { id: 'kis-tandoor', room: ROOM, kind: 'kitchenIslands.tandoor', x: 17.55, z: 25.05, w: 2.9, d: 2.9, label: 'Tandoor', props: stands },
  { id: 'kis-indian-ring-1', room: ROOM, kind: 'kitchenIslands.gasRing', x: 17.15, z: 28.35, w: 1.3, d: 1.3, label: 'Gas ring', props: { ...stands, pot: 'copper' } },
  { id: 'kis-indian-ring-2', room: ROOM, kind: 'kitchenIslands.gasRing', x: 19.55, z: 28.35, w: 1.3, d: 1.3, label: 'Gas ring', props: stands },
  { id: 'kis-indian-decal', room: ROOM, kind: 'kitchenIslands.decal', x: 16.3, z: 23.7, w: 5.4, d: 7.8, label: 'INDIAN', color: ACCENT.indian, props: flat },
  { id: 'kis-indian-sign', room: ROOM, kind: 'kitchenIslands.sign', x: 16.9, z: 26.94, w: 4.2, d: 0.12, label: 'INDIAN', color: ACCENT.indian, props: overhead },

  // ----------------------------------------------------------- CHINESE  x 22-28
  { id: 'kis-chinese', room: ROOM, kind: 'kitchenIslands.chinese', x: 22, z: 24, w: 6, d: 6, label: 'Chinese island', color: ACCENT.chinese },
  { id: 'kis-wok-1', room: ROOM, kind: 'kitchenIslands.wok', x: 22.4, z: 25.8, w: 1.4, d: 1.4, label: 'Wok burner', props: stands },
  { id: 'kis-wok-2', room: ROOM, kind: 'kitchenIslands.wok', x: 24.5, z: 25.8, w: 1.4, d: 1.4, label: 'Wok burner', props: stands },
  { id: 'kis-wok-3', room: ROOM, kind: 'kitchenIslands.wok', x: 26.6, z: 25.8, w: 1.4, d: 1.4, label: 'Wok burner', props: stands },
  { id: 'kis-chinese-decal', room: ROOM, kind: 'kitchenIslands.decal', x: 21.8, z: 23.7, w: 6.4, d: 7.8, label: 'CHINESE', color: ACCENT.chinese, props: flat },
  { id: 'kis-chinese-sign', room: ROOM, kind: 'kitchenIslands.sign', x: 22.7, z: 26.94, w: 4.6, d: 0.12, label: 'CHINESE', color: ACCENT.chinese, props: overhead },

  // ------------------------------------------------------- CONTINENTAL  x 28.5-33.5
  { id: 'kis-continental', room: ROOM, kind: 'kitchenIslands.continental', x: 28.5, z: 24, w: 5, d: 6, label: 'Continental island', color: ACCENT.continental },
  { id: 'kis-griddle', room: ROOM, kind: 'kitchenIslands.griddle', x: 28.9, z: 25.3, w: 4.2, d: 2.4, label: 'Flat-top griddle', props: stands },
  { id: 'kis-continental-decal', room: ROOM, kind: 'kitchenIslands.decal', x: 28.3, z: 23.7, w: 5.4, d: 7.8, label: 'CONTINENTAL', color: ACCENT.continental, props: flat },
  { id: 'kis-continental-sign', room: ROOM, kind: 'kitchenIslands.sign', x: 28.7, z: 26.94, w: 4.6, d: 0.12, label: 'CONTINENTAL', color: ACCENT.continental, props: overhead },

  // ---------------------------------------------------------- EUROPEAN  x 34-37 (shortened)
  { id: 'kis-range-1', room: ROOM, kind: 'kitchenIslands.range', x: 34, z: 24, w: 3, d: 3, rot: 90, label: '4-burner range', color: ACCENT.european, props: { set: 'a' } },
  { id: 'kis-range-2', room: ROOM, kind: 'kitchenIslands.range', x: 34, z: 27, w: 3, d: 3, rot: 90, label: '4-burner range', color: ACCENT.european, props: { set: 'b' } },
  { id: 'kis-pot-rack', room: ROOM, kind: 'kitchenIslands.potRack', ...turned(34, 24.2, 0.3, 5.6, 90), label: 'Pot rack', props: overhead },
  // The decal's text strip runs on to x 39 so it lines up with the pass window; the pad itself is x 33.8-37.2 (padW).
  { id: 'kis-european-decal', room: ROOM, kind: 'kitchenIslands.decal', x: 33.8, z: 23.7, w: 5.2, d: 7.8, label: 'EUROPEAN', color: ACCENT.european, props: { ...flat, padW: 3.4, fg: BRAND.teal } },
  { id: 'kis-european-sign', room: ROOM, kind: 'kitchenIslands.sign', x: 33.7, z: 26.94, w: 4.6, d: 0.12, label: 'EUROPEAN', color: ACCENT.european, props: { ...overhead, fg: BRAND.teal } },

  // ---------------------------------------------------------------- PASS  z 34-36
  { id: 'kis-pass', room: ROOM, kind: 'kitchenIslands.pass', x: 16, z: 34, w: 17, d: 2, label: 'Pass', color: BRAND.teal },
  { id: 'kis-hot-hold', room: ROOM, kind: 'kitchenIslands.hotHold', x: 33.5, z: 34, w: 5.5, d: 2, label: 'Hot-holding unit', color: BRAND.teal },
  { id: 'kis-heat-lamps', room: ROOM, kind: 'kitchenIslands.heatLamp', x: 16.3, z: 34.5, w: 22.4, d: 1, label: 'Heat lamps and ticket rail', props: overhead },
  { id: 'kis-kss', room: ROOM, kind: 'kitchenIslands.kss', ...turned(39.5, 34.6, 0.8, 0.8, 270), label: 'KSS (kitchen screen)' },

  // ------------------------------------------------- WORKING-KITCHEN TOUCHES
  { id: 'kis-rack-1', room: ROOM, kind: 'kitchenIslands.rack', x: 16.3, z: 32.1, w: 1.4, d: 1.9, h: 5.4, label: 'Mobile rack' },
  { id: 'kis-rack-2', room: ROOM, kind: 'kitchenIslands.rack', x: 39, z: 32.3, w: 1.2, d: 1.7, h: 5.4, label: 'Dirty-ware trolley', props: { tubs: true } },
  { id: 'kis-handwash', room: ROOM, kind: 'kitchenIslands.handwash', ...turned(15.25, 30.2, 0.9, 1.6, 90), label: 'Hand-wash station' },
  { id: 'kis-drain-1', room: ROOM, kind: 'kitchenIslands.drain', x: 24.05, z: 31.75, w: 0.9, d: 0.9, label: 'Floor drain', props: flat },
  { id: 'kis-drain-2', room: ROOM, kind: 'kitchenIslands.drain', x: 30.15, z: 31.75, w: 0.9, d: 0.9, label: 'Floor drain', props: flat },
  { id: 'kis-drain-3', room: ROOM, kind: 'kitchenIslands.drain', x: 38.15, z: 28.35, w: 0.9, d: 0.9, label: 'Floor drain', props: flat },
  { id: 'kis-channel', room: ROOM, kind: 'kitchenIslands.channel', x: 18.5, z: 33.55, w: 12.5, d: 0.3, label: 'Drain channel', props: flat },
];
