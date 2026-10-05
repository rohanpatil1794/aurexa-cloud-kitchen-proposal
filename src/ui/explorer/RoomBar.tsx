// The room card as one slim bar, for the views where the card would cover the scene: eye level (a walk-through wants the whole
// lens), and short landscape screens. Name and size, the Overview / Eye-level switch, Previous / Next and Back stay on the bar;
// the purpose and design notes open above it on demand.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore, type RoomView } from '../../store';
import { ROOM_BY_ID, neighbourRoom, roomArea } from '../../data/layout';
import type { RoomId } from '../../data/types';
import { pickRoom } from './actions';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, CloseIcon } from './icons';
import { RoomNotes, roomViewOptions } from './InfoCard';
import { Segmented, ZoneDot } from './parts';

/** Text-only: the bar is tight, especially on phones. */
const viewOptions = roomViewOptions.map(({ value, label }) => ({ value, label }));

const iconButton =
  'grid size-11 shrink-0 place-items-center rounded-xl border border-cream/14 bg-black/15 text-cream/80 transition-colors hover:border-orange/70 hover:bg-cream/6 hover:text-cream';

export function RoomBar({ roomId }: { roomId: RoomId }) {
  const room = ROOM_BY_ID[roomId];
  const roomView = useStore((s) => s.roomView);
  const reduced = useStore((s) => s.reducedMotion);
  const stepRoom = useStore((s) => s.stepRoom);
  const clearSelection = useStore((s) => s.clearSelection);
  const [notes, setNotes] = useState(false);
  const prev = ROOM_BY_ID[neighbourRoom(roomId, -1)].name;
  const next = ROOM_BY_ID[neighbourRoom(roomId, 1)].name;

  return (
    <motion.section
      aria-label="Room details"
      data-focus-return
      data-label-obstacle
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8, transition: { duration: reduced ? 0 : 0.2 } }}
      transition={reduced ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="glass explorer-glass explorer-card pointer-events-auto flex min-h-0 w-[min(48rem,100%)] shrink flex-col overflow-hidden"
    >
      {notes && (
        <div id="room-bar-notes" className="thin-scroll min-h-0 flex-1 overflow-y-auto border-b border-cream/12 px-4 pb-3 pt-1">
          <RoomNotes roomId={roomId} compact />
        </div>
      )}
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2">
        <div className="flex min-w-0 flex-1 basis-48 items-center gap-2 pl-1">
          <ZoneDot zone={room.zone} />
          <h2 tabIndex={-1} data-room-heading title={room.name} className="brand-heading min-w-0 truncate text-[13px] leading-snug text-cream">
            {room.name}
          </h2>
          <span className="shrink-0 whitespace-nowrap text-[12px] tabular-nums text-sand">{Math.round(roomArea(room))} sq ft</span>
          <button type="button" onClick={clearSelection} aria-label="Back to aerial" title="Back to aerial (Esc)" className={`${iconButton} ml-auto sm:hidden`}>
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="min-w-44 flex-1 basis-44 sm:w-48 sm:flex-none">
          <Segmented<RoomView> label="Room view" value={roomView} onChange={(v) => pickRoom(roomId, v)} options={viewOptions} />
        </div>
        <button type="button" onClick={() => stepRoom(-1)} aria-label={`Previous room: ${prev}`} title={`Previous: ${prev}`} className={iconButton}>
          <ChevronLeftIcon size={17} />
        </button>
        <button type="button" onClick={() => stepRoom(1)} aria-label={`Next room: ${next}`} title={`Next: ${next}`} className={iconButton}>
          <ChevronRightIcon size={17} />
        </button>
        <button
          type="button"
          onClick={() => setNotes((v) => !v)}
          aria-expanded={notes}
          aria-controls={notes ? 'room-bar-notes' : undefined}
          aria-label="Design notes"
          className={`${iconButton} md:flex md:w-auto md:items-center md:gap-1.5 md:px-3 md:text-[12px] md:font-medium`}
        >
          <span className="hidden md:inline">Notes</span>
          {notes ? <ChevronDownIcon size={15} /> : <ChevronUpIcon size={15} />}
        </button>
        <button type="button" onClick={clearSelection} aria-label="Back to aerial" title="Back to aerial (Esc)" className={`${iconButton} hidden sm:grid`}>
          <CloseIcon size={16} />
        </button>
      </div>
    </motion.section>
  );
}
