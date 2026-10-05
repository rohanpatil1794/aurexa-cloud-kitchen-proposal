// Explorer overlay, shown once the visitor has entered the space: a glass side panel on desktop, a draggable bottom
// sheet on phones. Both carry Rooms | Layers | Views, plus the room card, the legend key and the back chip (src/ui/explorer/).
import { useEffect } from 'react';
import { useStore } from '../store';
import { ROOM_BY_ID, ROOM_COUNT } from '../data/layout';
import { useIsMobile } from '../lib/hooks';
import { DesktopExplorer } from './explorer/Desktop';
import { restoreRoomFocus } from './explorer/focus';
import { roomPosition } from './explorer/InfoCard';
import { MobileExplorer } from './explorer/Mobile';

/**
 * camera-controls reads Ctrl + wheel as a trackpad pinch and divides its deltaY by 3 instead of 30, so one notch of a real
 * mouse wheel (deltaY 100) would zoom about 5x. Pinch events are small; anything above this is clipped to it.
 */
const MAX_CTRL_WHEEL_DELTA = 16;

/**
 * Over the model the mouse wheel scrolls the page: camera-controls would swallow it, and a visitor who scrolls on to the
 * proposal would be stuck zooming. Zooming takes Ctrl / Cmd + wheel, or a trackpad pinch (browsers report it as Ctrl + wheel);
 * those reach the camera, with a mouse notch of Ctrl + wheel softened to a sensible step.
 */
function useWheelScrollsPage() {
  useEffect(() => {
    const stage = document.getElementById('stage');
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.isTrusted || !(e.target as Element).closest('.stage-canvas')) return; // our own re-dispatch below, or the UI on top
      if (!e.ctrlKey && !e.metaKey) {
        e.stopPropagation(); // never reaches the camera: the page scrolls
      } else if (e.ctrlKey && Math.abs(e.deltaY) > MAX_CTRL_WHEEL_DELTA) {
        e.stopPropagation();
        e.preventDefault(); // no browser page zoom either
        const { deltaX, deltaMode, ctrlKey, clientX, clientY } = e;
        const deltaY = Math.sign(e.deltaY) * MAX_CTRL_WHEEL_DELTA;
        e.target?.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX, deltaY, deltaMode, ctrlKey, clientX, clientY }));
      }
    };
    stage.addEventListener('wheel', onWheel, { capture: true, passive: false });
    return () => stage.removeEventListener('wheel', onWheel, { capture: true });
  }, []);
}

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
  const mobile = useIsMobile();
  useWheelScrollsPage();
  useExplorerFocus();
  return (
    <>
      {mobile ? <MobileExplorer /> : <DesktopExplorer />}
      <RoomAnnouncer />
    </>
  );
}

export function ExplorerUI() {
  const explorer = useStore((s) => s.phase === 'explorer');
  return explorer ? <Explorer /> : null;
}
