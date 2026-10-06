// The room card as one slim bar, for the views where the card would cover the scene: eye level (a walk-through wants the whole
// lens), and short landscape screens. Name and size, the Overview / Eye-level switch, Previous / Next and Back stay on the bar;
// the purpose and design notes open above it on demand.
//
// Layout: a grid placed by a container query on the bar's own width, never a wrapping flex row. Wide (>= WIDE): one 62 px row,
// name | view switch | previous | next | notes | close. Narrower (phones, portrait tablets, a narrow stage): row 1 is the name and
// the close button (it can never drop to the next line), row 2 the view switch, previous, next and notes. The name wraps to a
// second line (its size follows it) before it is ever cut off; the bar has a fixed width so Previous / Next stay under the cursor
// while stepping through rooms.
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
      className="glass explorer-glass explorer-card pointer-events-auto flex min-h-0 w-[56rem] max-w-full shrink flex-col overflow-hidden"
    >
      {notes && (
        <div id="room-bar-notes" className="thin-scroll min-h-0 flex-1 overflow-y-auto border-b border-cream/12 px-4 pb-3 pt-1">
          <RoomNotes roomId={roomId} compact />
        </div>
      )}
      <div className="shrink-0 @container">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-x-2 gap-y-1.5 px-3 py-2 @min-[44rem]:grid-cols-[minmax(0,1fr)_12rem_auto_auto_auto_auto]">
          <div className="col-span-3 col-start-1 row-start-1 flex min-w-0 items-center gap-2 pl-1 @min-[44rem]:col-span-1">
            <ZoneDot zone={room.zone} />
            <div className="line-clamp-2 min-w-0 break-words text-[13px] leading-snug">
              <h2 tabIndex={-1} data-room-heading title={room.name} className="brand-heading inline text-cream">
                {room.name}
              </h2>
              <span className="ml-2 whitespace-nowrap text-[12px] tabular-nums text-sand">{Math.round(roomArea(room))} sq ft</span>
            </div>
          </div>
          <div className="col-start-1 row-start-2 @min-[44rem]:col-start-2 @min-[44rem]:row-start-1">
            <Segmented<RoomView> label="Room view" value={roomView} onChange={(v) => pickRoom(roomId, v)} options={viewOptions} />
          </div>
          <button type="button" onClick={() => stepRoom(-1)} aria-label={`Previous room: ${prev}`} title={`Previous: ${prev}`} className={`${iconButton} col-start-2 row-start-2 @min-[44rem]:col-start-3 @min-[44rem]:row-start-1`}>
            <ChevronLeftIcon size={17} />
          </button>
          <button type="button" onClick={() => stepRoom(1)} aria-label={`Next room: ${next}`} title={`Next: ${next}`} className={`${iconButton} col-start-3 row-start-2 @min-[44rem]:col-start-4 @min-[44rem]:row-start-1`}>
            <ChevronRightIcon size={17} />
          </button>
          <button
            type="button"
            onClick={() => setNotes((v) => !v)}
            aria-expanded={notes}
            aria-controls={notes ? 'room-bar-notes' : undefined}
            aria-label="Design notes"
            className={`${iconButton} col-start-4 row-start-2 md:flex md:w-auto md:items-center md:gap-1.5 md:px-3 md:text-[12px] md:font-medium @min-[44rem]:col-start-5 @min-[44rem]:row-start-1`}
          >
            <span className="hidden md:inline">Notes</span>
            {notes ? <ChevronDownIcon size={15} /> : <ChevronUpIcon size={15} />}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            aria-label="Back to aerial"
            title="Back to aerial (Esc)"
            className={`${iconButton} col-start-4 row-start-1 justify-self-end @min-[44rem]:col-start-6`}
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </div>
    </motion.section>
  );
}
