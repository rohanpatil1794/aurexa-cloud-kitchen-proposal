// Keyboard focus for the explorer: where focus goes when the room card opens, and where it returns when the card goes.
// Both are for keyboard users; a pointer interaction never needs them (programmatic focus after a click draws no ring).
import type { RoomId } from '../../data/types';
import { scrollIntoNearest } from './parts';

/** After a keyboard pick, move focus to the card's heading: the new room is read out and its controls are one Tab away. */
export function focusRoomHeading() {
  // The card mounts on the next render (and may animate in), so wait two frames.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-room-heading]')?.focus({ preventScroll: true })),
  );
}

/**
 * The card is going away (Esc, Back, the chip): give focus back to the room's row in the Rooms tab, or to the active tab when
 * the row is not on screen (the phone sheet tucks its list away).
 */
export function restoreRoomFocus(roomId: RoomId) {
  const row = document.querySelector<HTMLElement>(`[data-room-row="${roomId}"]`);
  const inSheet = row?.closest('.explorer-sheet');
  const target = row && !inSheet ? row : document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
  if (!target) return;
  target.focus({ preventScroll: true });
  if (target === row) scrollIntoNearest(row, false);
}
