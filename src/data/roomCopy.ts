// Client-facing copy for every room: a 1–2 line purpose and 2–3 "Design notes".
// PLACEHOLDER — to be rewritten by the copy pass. Keep the shape: purpose (string), notes (2–3 bullets).
import type { RoomCopy, RoomId } from './types';

const ids: RoomId[] = [
  'stair', 'veg', 'jain', 'vegan', 'nonveg', 'bakery', 'cold', 'dry', 'lift', 'recv',
  'dessert', 'pack', 'kitchen', 'dish', 'dispatch', 'rider', 'waste', 'garden',
  'lockers', 'elec', 'creator', 'toilets', 'exit',
];

export const ROOM_COPY: Record<RoomId, RoomCopy> = Object.fromEntries(
  ids.map((id) => [id, { purpose: 'Purpose pending.', notes: ['Design note pending.', 'Design note pending.'] }]),
) as Record<RoomId, RoomCopy>;
