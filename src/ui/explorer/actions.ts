// Camera actions shared by the explorer tabs. They also nudge the mobile sheet (store.sheet), which the desktop panel ignores.
import { useStore, type RoomView } from '../../store';
import type { PresetId, RoomId } from '../../data/types';

/**
 * Fly to a room. On phones: eye level drops the sheet to its peek (the walk-through wants the screen; the room bar carries the
 * controls), coming back to the overview lifts it to half again, and a full-height sheet drops to half so the room stays on screen.
 */
export function pickRoom(id: RoomId, view: RoomView = 'overview') {
  const s = useStore.getState();
  s.goRoom(id, view);
  if (view === 'eye') s.setSheet('peek');
  else if (s.sheet === 'full' || (s.roomView === 'eye' && s.sheet === 'peek')) s.setSheet('half');
}

/** Fly to a camera preset: leaves the selected room and gets the sheet out of the way. */
export function pickPreset(id: PresetId) {
  const s = useStore.getState();
  if (s.selectedRoom) s.clearSelection();
  s.goPreset(id);
  s.setSheet('peek');
}
