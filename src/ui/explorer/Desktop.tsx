// Desktop explorer: a 360 px glass panel on the right (Rooms | Layers | Views), the room card and legends at the
// bottom-left of the stage, and the back chip under the top bar. The empty wrapper lets pointer input through to the canvas.
import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../store';
import { PANEL_WIDTH } from '../../data/cameras';
import { BackChip } from './BackChip';
import { FloatingCard } from './InfoCard';
import { Legends } from './Legends';
import { TabBar, TabPanel } from './Tabs';

const SHORT_VIEWPORT = '(max-height: 759px)';
function useShortViewport() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(SHORT_VIEWPORT);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => window.matchMedia(SHORT_VIEWPORT).matches,
    () => false,
  );
}

function Panel() {
  const reduced = useStore((s) => s.reducedMotion);
  return (
    <motion.aside
      aria-label="Explore the kitchen"
      initial={reduced ? false : { opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      style={{ width: PANEL_WIDTH }}
      className="glass explorer-glass explorer-card pointer-events-auto absolute bottom-4 right-3 top-[calc(var(--topbar-h)+1rem)] flex flex-col overflow-hidden"
    >
      <TabBar />
      <div className="mx-4 h-px shrink-0 bg-cream/12" />
      <TabPanel className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4" />
    </motion.aside>
  );
}

export function DesktopExplorer() {
  const selectedRoom = useStore((s) => s.selectedRoom);
  const short = useShortViewport();
  // DOM order = tab order: back chip, the room card (its controls come right after a pick), then the panel.
  return (
    <div data-explorer className="pointer-events-none absolute inset-0 z-10">
      <BackChip className="absolute left-4 top-[calc(var(--topbar-h)+1rem)]" />
      {/* Bottom-up stack: the room card, then the legends above it. Never reaches under the panel (360 + 12 + 16 + 16). */}
      <div className="absolute bottom-4 left-4 flex max-h-[calc(100%-9.5rem)] max-w-[calc(100%-404px)] flex-col-reverse items-start gap-3">
        <AnimatePresence>{selectedRoom && <FloatingCard key="card" roomId={selectedRoom} />}</AnimatePresence>
        {/* The card comes first: with one open, or on a short screen, the workflow legend shrinks to its one-line key. */}
        <Legends compact={short || selectedRoom !== null} />
      </div>
      <Panel />
    </div>
  );
}
