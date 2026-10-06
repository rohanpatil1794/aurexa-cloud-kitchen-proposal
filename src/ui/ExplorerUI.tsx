// Explorer overlay, shown once the visitor has entered the space: a glass side panel on landscape screens, a draggable
// bottom sheet on phones and portrait tablets (the one rule: data/cameras.ts isSheetLayout, via useSheetLayout, the same one
// the camera frames the model with). Both carry Rooms | Layers | Views, plus the room card, the legend key, the zoom buttons
// and the back chip (src/ui/explorer/).
//
// The mouse wheel is the page's: the stage is a sticky section and the proposal sits below it. Zooming the model (Ctrl / Cmd +
// wheel, a trackpad pinch, the + / - buttons) is handled in scene/CameraRig.tsx.
import { useEffect } from 'react';
import { useStore } from '../store';
import { ROOM_BY_ID, ROOM_COUNT } from '../data/layout';
import { useSheetLayout } from '../lib/hooks';
import { DesktopExplorer } from './explorer/Desktop';
import { restoreRoomFocus } from './explorer/focus';
import { roomPosition } from './explorer/InfoCard';
import { MobileExplorer } from './explorer/Mobile';

/** Keyboard focus follows the visitor in and out: into the tab bar on entry, back to the room's row when its card goes. */
function useExplorerFocus() {
  useEffect(() => {
    // The hero CTA that opened the explorer is leaving the page, so focus would fall to <body>.
    const active = document.activeElement;
    if (!active || active === document.body || active.closest('.hero-root')) {
      document.getElementById('explorer-tab-rooms')?.focus({ preventScroll: true });
    }
    return useStore.subscribe((s, prev) => {
      if (prev.selectedRoom && !s.selectedRoom && document.activeElement?.closest('[data-focus-return]')) {
        restoreRoomFocus(prev.selectedRoom);
      }
    });
  }, []);
}

/** Screen readers hear a pick made in the 3D view (or by Prev / Next), which changes nothing they are focused on. */
function RoomAnnouncer() {
  const id = useStore((s) => s.selectedRoom);
  return (
    <p role="status" className="sr-only">
      {id ? `${ROOM_BY_ID[id].name} selected, room ${roomPosition(id)} of ${ROOM_COUNT}.` : ''}
    </p>
  );
}

function Explorer() {
  const sheet = useSheetLayout();
  useExplorerFocus();
  return (
    <>
      {sheet ? <MobileExplorer /> : <DesktopExplorer />}
      <RoomAnnouncer />
    </>
  );
}

export function ExplorerUI() {
  const explorer = useStore((s) => s.phase === 'explorer');
  return explorer ? <Explorer /> : null;
}
