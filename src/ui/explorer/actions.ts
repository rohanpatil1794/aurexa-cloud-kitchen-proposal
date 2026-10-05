// Camera actions shared by the explorer tabs. They also nudge the mobile sheet (store.sheet), which the desktop panel ignores.
import { useStore, type RoomView } from '../../store';
import type { PresetId, RoomId } from '../../data/types';

/** Fly to a room. A full-height sheet drops to half so the room stays on screen. */
export function pickRoom(id: RoomId, view: RoomView = 'overview') {
  const s = useStore.getState();
  s.goRoom(id, view);
  if (s.sheet === 'full') s.setSheet('half');
}

/** Fly to a camera preset: leaves the selected room and gets the sheet out of the way. */
export function pickPreset(id: PresetId) {
  const s = useStore.getState();
  if (s.selectedRoom) s.clearSelection();
  s.goPreset(id);
  s.setSheet('peek');
}
