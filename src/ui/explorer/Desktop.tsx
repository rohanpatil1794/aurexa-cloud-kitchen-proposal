// Desktop explorer: a 360 px glass panel on the right (Rooms | Layers | Views), the room card and the legend key at the
// bottom-left of the stage, and the back chip under the top bar. The empty wrapper lets pointer input through to the canvas.
// Eye level swaps the card for the slim RoomBar so the walk-through keeps the lens; on short landscape screens (phones turned
// sideways) the panel also folds into a drawer behind a toggle and the room always gets the bar.
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../store';
import { PANEL_WIDTH } from '../../data/cameras';
import { scrollToProposal } from '../nav';
import { useMedia } from '../useMedia';
import { BackChip } from './BackChip';
import { ChevronDownIcon, RoomsIcon } from './icons';
import { FloatingCard } from './InfoCard';
import { Legends } from './Legends';
import { RoomBar } from './RoomBar';
import { TabBar, TabPanel } from './Tabs';

const SHORT_SCREEN = '(max-height: 500px)';

function Panel({ short }: { short: boolean }) {
  const reduced = useStore((s) => s.reducedMotion);
  return (
    <motion.aside
      id="explorer-drawer"
      aria-label="Explore the kitchen"
      data-label-obstacle
      initial={reduced ? false : { opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      style={{ width: PANEL_WIDTH }}
      className={`glass explorer-glass explorer-card pointer-events-auto absolute bottom-4 right-3 flex max-w-[calc(100%-1.5rem)] flex-col overflow-hidden ${
        short ? 'top-[calc(var(--topbar-h)+4.25rem)]' : 'top-[calc(var(--topbar-h)+1rem)]'
      }`}
    >
      <TabBar />
      <div className="mx-4 h-px shrink-0 bg-cream/12" />
      <TabPanel className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4" />
      {/* The wheel zooms the model only with Ctrl / Cmd, so the way on to the proposal is always at hand. */}
      <button
        type="button"
        onClick={scrollToProposal}
        className="flex min-h-11 shrink-0 items-center justify-between border-t border-cream/12 px-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-cream/85 transition-colors hover:bg-cream/8 hover:text-cream"
      >
        Continue to the proposal
        <ChevronDownIcon size={16} />
      </button>
    </motion.aside>
  );
}

/** Short screens: the toggle that opens and closes the panel drawer. */
function DrawerToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls="explorer-drawer"
      data-label-obstacle
      onClick={onToggle}
      className="glass explorer-chip pointer-events-auto absolute right-3 top-[calc(var(--topbar-h)+0.75rem)] flex min-h-11 items-center gap-2 rounded-full pl-3.5 pr-4 text-[13px] font-medium"
    >
      <RoomsIcon size={16} />
      {open ? 'Close' : 'Explore'}
    </button>
  );
}

export function DesktopExplorer() {
  const selectedRoom = useStore((s) => s.selectedRoom);
  const eye = useStore((s) => s.roomView === 'eye');
  const short = useMedia(SHORT_SCREEN);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const panelShown = !short || drawerOpen;
  // DOM order = tab order: back chip, the room card (its controls come right after a pick), then the panel.
  return (
    <div data-explorer className="pointer-events-none absolute inset-0 z-10">
      <BackChip className="absolute left-4 top-[calc(var(--topbar-h)+1rem)]" />
      {short && <DrawerToggle open={drawerOpen} onToggle={() => setDrawerOpen((v) => !v)} />}
      {/* Bottom-up stack: the room card, then the legend key above it. Never reaches under the panel (360 + 12 + 16 + 16). */}
      <div
        className={`absolute bottom-4 left-4 flex max-h-[calc(100%-9.5rem)] flex-col-reverse items-start gap-3 ${
          panelShown ? 'max-w-[calc(100%-404px)]' : 'max-w-[calc(100%-2rem)]'
        }`}
      >
        <AnimatePresence>
          {selectedRoom && (short || eye ? <RoomBar key="bar" roomId={selectedRoom} /> : <FloatingCard key="card" roomId={selectedRoom} />)}
        </AnimatePresence>
        <Legends />
      </div>
      {panelShown && <Panel short={short} />}
    </div>
  );
}
