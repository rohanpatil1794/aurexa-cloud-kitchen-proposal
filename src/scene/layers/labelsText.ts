import { roomArea } from '../../data/layout';
import type { Room, RoomId } from '../../data/types';

/** Room names broken into short lines, so narrow rooms (5 ft prep rooms, the 6 ft lift) get narrow pills. */
export const LABEL_LINES: Record<RoomId, readonly string[]> = {
  stair: ['Fire', 'Staircase'],
  veg: ['Veg', 'Prep'],
  jain: ['Jain', 'Prep'],
  vegan: ['Vegan', 'Prep'],
  nonveg: ['Non-Veg', 'Prep'],
  bakery: ['Bakery & Bread', 'Production'],
  cold: ['Cold', 'Storage'],
  dry: ['Dry', 'Storage'],
  lift: ['Goods', 'Lift'],
  recv: ['Receiving &', 'Inspection'],
  dessert: ['Dessert', 'Production'],
  pack: ['Packing &', 'Quality Control'],
  kitchen: ['Main Hot Kitchen'],
  dish: ['Dishwashing', 'Area'],
  dispatch: ['Dispatch', 'Area'],
  rider: ['Rider', 'Waiting Area'],
  waste: ['Waste Management'],
  garden: ['Indoor', 'Garden'],
  lockers: ['Staff', 'Lockers'],
  elec: ['Electrical', '& UPS Room'],
  creator: ['Content', 'Creator Corner'],
  toilets: ['Male / Female', 'Toilets'],
  exit: ['Emergency', 'Exit Lobby'],
};

/** "168 sq ft" (same rounding as the room list). */
export const areaLabel = (room: Room): string => `${Math.round(roomArea(room))} sq ft`;
