// Mobile explorer: a draggable bottom sheet (peek / half / full) with the same tabs, and the back chip + legends
// floating just above it. The 3D canvas stays interactive above the sheet; only the sheet and the chips take touches.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useTransform, type AnimationPlaybackControls, type MotionValue,
} from 'framer-motion';
import { useStore, type PanelTab, type SheetState } from '../../store';
import { SHEET_FRACTION, SHEET_PEEK_PX } from '../../data/cameras';
import { BackChip } from './BackChip';
import { InfoCardBody } from './InfoCard';
import { Legends } from './Legends';
import { ProposalChip } from './ProposalChip';
import { RoomBar } from './RoomBar';
import { TabBar, TabPanel } from './Tabs';

type Snaps = Record<SheetState, number>;
const STATES: SheetState[] = ['peek', 'half', 'full'];
/** A swipe projects this far ahead (ms) when choosing the snap point. */
const FLING_LOOKAHEAD_MS = 180;
/** Pointer travel (px) before a press on the header becomes a drag, so taps on the tabs and handle still click. */
const DRAG_SLOP = 6;
/** A release this long after the last movement is a stop, not a fling (ms). */
const FLING_STALE_MS = 80;

const nearest = (snaps: Snaps, h: number): SheetState =>
  STATES.reduce((best, s) => (Math.abs(snaps[s] - h) < Math.abs(snaps[best] - h) ? s : best), 'peek' as SheetState);

function Sheet({ height, snaps }: { height: MotionValue<number>; snaps: Snaps }) {
  const sheet = useStore((s) => s.sheet);
  const setSheet = useStore((s) => s.setSheet);
  const setPanelTab = useStore((s) => s.setPanelTab);
  const selectedRoom = useStore((s) => s.selectedRoom);
  const tab = useStore((s) => s.panelTab);
  const reduced = useStore((s) => s.reducedMotion);

  const anim = useRef<AnimationPlaybackControls | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const swallowClick = useRef(false);

  // While the sheet is tucked away its content is clipped; keep it out of the tab order and the accessibility tree too.
  const [open, setOpen] = useState(() => height.get() > snaps.peek + 12);
  useMotionValueEvent(height, 'change', (h) => setOpen(h > snaps.peek + 12));

  const settle = useCallback(
    (to: SheetState, velocity = 0) => {
      anim.current?.stop();
      if (reduced) height.set(snaps[to]);
      else anim.current = animate(height, snaps[to], { type: 'spring', stiffness: 360, damping: 38, velocity });
    },
    [height, snaps, reduced],
  );

  // The store drives the sheet (room picked, Back, tab tapped...); also re-fits when the viewport changes.
  useEffect(() => settle(sheet), [sheet, settle]);

  // A room picked in the 3D view lifts the peeking sheet to half (not at eye level: the room bar stays above the peeking sheet);
  // clearing the selection tucks it away again.
  useEffect(() => {
    const s = useStore.getState();
    if (!selectedRoom) s.setSheet('peek');
    else if (s.sheet === 'peek' && s.roomView !== 'eye') s.setSheet('half');
    scrollRef.current?.scrollTo({ top: 0 });
  }, [selectedRoom]);

  // With a room card above the tab content, switching tab jumps past the card to the content.
  const firstTab = useRef(true);
  useEffect(() => {
    if (firstTab.current) { firstTab.current = false; return; }
    const box = scrollRef.current, panel = panelRef.current;
    if (box && panel && useStore.getState().selectedRoom) {
      box.scrollTo({ top: panel.offsetTop - box.offsetTop, behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [tab, reduced]);

  const onTab = (t: PanelTab) => {
    setPanelTab(t);
    if (sheet === 'peek') setSheet('half');
  };

  // Dragging the header (handle + tabs) resizes the sheet. Move / up are followed on the window, so a fast mouse drag
  // that leaves the header keeps working (touch is captured by the browser anyway).
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    swallowClick.current = false;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const id = e.pointerId;
    const samples: { t: number; h: number }[] = [];
    let active = false;
    let y0 = e.clientY;
    let h0 = 0;

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      if (!active) {
        if (Math.abs(ev.clientY - y0) < DRAG_SLOP) return;
        active = true;
        anim.current?.stop();
        y0 = ev.clientY;
        h0 = height.get();
      }
      const h = Math.min(snaps.full, Math.max(snaps.peek, h0 - (ev.clientY - y0)));
      height.set(h);
      samples.push({ t: ev.timeStamp, h });
      if (samples.length > 6) samples.shift();
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (!active) return; // a tap: the buttons handle it
      swallowClick.current = true;
      const first = samples[0], last = samples[samples.length - 1];
      const dt = last.t - first.t;
      const flung = dt > 0 && ev.type === 'pointerup' && ev.timeStamp - last.t < FLING_STALE_MS;
      const v = flung ? ((last.h - first.h) / dt) * 1000 : 0; // px/s, up is positive
      const next = nearest(snaps, height.get() + (v * FLING_LOOKAHEAD_MS) / 1000);
      setSheet(next);
      settle(next, v);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  return (
    <motion.section
      aria-label="Explore the kitchen"
      data-label-obstacle
      style={{ height }}
      className="glass explorer-glass explorer-sheet pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col overflow-hidden"
    >
      <div
        onPointerDown={onPointerDown}
        onClickCapture={(e) => {
          if (swallowClick.current) { swallowClick.current = false; e.stopPropagation(); e.preventDefault(); }
        }}
        style={{ height: SHEET_PEEK_PX }}
        className="shrink-0 touch-none select-none border-b border-cream/12"
      >
        <button
          type="button"
          aria-label={sheet === 'peek' ? 'Expand panel' : 'Collapse panel'}
          aria-expanded={sheet !== 'peek'}
          onClick={() => setSheet(sheet === 'peek' ? 'half' : 'peek')}
          className="sheet-handle flex h-8 w-full items-start justify-center pt-2.5"
        >
          <span className="h-1 w-10 rounded-full bg-cream/30" />
        </button>
        <TabBar onSelect={onTab} className="h-11" />
      </div>
      <div
        ref={scrollRef}
        className={`thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1 ${open ? '' : 'invisible'}`}
      >
        {selectedRoom && (
          <div data-focus-return className="mb-4 border-b border-cream/12 pb-4">
            <InfoCardBody roomId={selectedRoom} />
          </div>
        )}
        <div ref={panelRef}>
          <TabPanel />
        </div>
      </div>
    </motion.section>
  );
}

export function MobileExplorer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const insetRef = useRef<HTMLDivElement>(null);
  const [stageH, setStageH] = useState(0);
  const [safeBottom, setSafeBottom] = useState(0);
  const sheet = useStore((s) => s.sheet);
  const selectedRoom = useStore((s) => s.selectedRoom);
  const eye = useStore((s) => s.roomView === 'eye');
  const height = useMotionValue(0);
  const dockBottom = useTransform(height, (h) => h + 12);

  useLayoutEffect(() => {
    const root = rootRef.current, inset = insetRef.current;
    if (!root || !inset) return;
    const measure = () => {
      setStageH(root.clientHeight);
      setSafeBottom(inset.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  const snaps = useMemo<Snaps>(
    () => ({
      peek: SHEET_PEEK_PX + safeBottom,
      half: Math.round(stageH * SHEET_FRACTION.half),
      full: Math.round(stageH * SHEET_FRACTION.full),
    }),
    [stageH, safeBottom],
  );

  return (
    <div ref={rootRef} data-explorer className="pointer-events-none absolute inset-0 z-10">
      {/* Resolves env(safe-area-inset-bottom) to pixels */}
      <div ref={insetRef} aria-hidden className="absolute bottom-0 left-0 w-0" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      {stageH > 0 && (
        <>
          <motion.div
            style={{ bottom: dockBottom }}
            className={`absolute inset-x-3 flex max-h-[60%] flex-col-reverse items-start gap-2 transition-opacity duration-200 ${
              sheet === 'full' ? 'invisible opacity-0' : ''
            }`}
          >
            {/* Eye level: the room bar (it has its own Back) takes the place of the chip row. */}
            <AnimatePresence>{selectedRoom && eye && <RoomBar key="bar" roomId={selectedRoom} />}</AnimatePresence>
            {!(selectedRoom && eye) && (
              <div className="flex w-full items-center justify-between gap-2">
                <BackChip />
                <ProposalChip className="ml-auto" />
              </div>
            )}
            <Legends />
          </motion.div>
          <Sheet height={height} snaps={snaps} />
        </>
      )}
    </div>
  );
}
