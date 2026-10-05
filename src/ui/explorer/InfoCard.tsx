// The selected room's card: purpose, size, design notes, previous / next and the Overview / Eye-level switch.
// Built from three parts so the layouts can arrange them: `RoomHead` (zone, name, size, Back), `RoomNotes` (purpose and notes)
// and `RoomControls` (view switch and neighbours). `FloatingCard` is the desktop version (bottom-left of the stage; the
// controls are pinned under the scrolling text, so they never leave the card), `InfoCardBody` the phone sheet's (controls first).
// Only the texts are keyed by room, never the controls: stepping with Previous / Next keeps keyboard focus on the button.
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useStore, type RoomView } from '../../store';
import { GROUPS, ROOM_BY_ID, ROOM_COUNT, ROOM_ORDER, neighbourRoom, roomArea } from '../../data/layout';
import type { RoomId } from '../../data/types';
import { pickRoom } from './actions';
import { BackIcon, ChevronLeftIcon, ChevronRightIcon, EyeLevelIcon, OverviewIcon } from './icons';
import { MicroHeading, Segmented, ZoneDot } from './parts';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const GROUP_NAME = Object.fromEntries(GROUPS.map((g) => [g.id, g.name]));

/** Same order as the Rooms tab and the Previous / Next buttons. */
export const roomPosition = (id: RoomId) => ROOM_ORDER.indexOf(id) + 1;

export const roomViewOptions = [
  { value: 'overview', label: 'Overview', icon: <OverviewIcon size={15} /> },
  { value: 'eye', label: 'Eye-level', icon: <EyeLevelIcon size={15} /> },
] satisfies { value: RoomView; label: string; icon: ReactNode }[];

function NeighbourButton({ dir, id }: { dir: -1 | 1; id: RoomId }) {
  const stepRoom = useStore((s) => s.stepRoom);
  const next = dir === 1;
  return (
    <button
      type="button"
      onClick={() => stepRoom(dir)}
      className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-cream/14 bg-black/15 px-2.5 py-1 transition-colors hover:border-orange/70 hover:bg-cream/6 ${
        next ? 'flex-row-reverse text-right' : 'text-left'
      }`}
    >
      {next ? <ChevronRightIcon size={16} className="shrink-0 text-cream/60" /> : <ChevronLeftIcon size={16} className="shrink-0 text-cream/60" />}
      <span className="min-w-0 flex-1">
        <span className="micro block text-[10px]">{next ? 'Next' : 'Previous'}</span>
        <span className="line-clamp-2 block break-words text-[13px] font-medium leading-tight text-cream">{ROOM_BY_ID[id].name}</span>
      </span>
    </button>
  );
}

/** Overview / Eye-level switch and Previous / Next. */
export function RoomControls({ roomId, className = '' }: { roomId: RoomId; className?: string }) {
  const roomView = useStore((s) => s.roomView);
  return (
    <div className={`space-y-2 ${className}`}>
      <Segmented<RoomView> label="Room view" value={roomView} onChange={(v) => pickRoom(roomId, v)} options={roomViewOptions} />
      <div className="grid grid-cols-2 gap-2">
        <NeighbourButton dir={-1} id={neighbourRoom(roomId, -1)} />
        <NeighbourButton dir={1} id={neighbourRoom(roomId, 1)} />
      </div>
    </div>
  );
}

/** Zone and group, Back, the room's name and its size. The name is the card's focus target after a keyboard pick. */
export function RoomHead({ roomId, compact = false }: { roomId: RoomId; compact?: boolean }) {
  const room = ROOM_BY_ID[roomId];
  const clearSelection = useStore((s) => s.clearSelection);
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="micro flex min-w-0 items-center gap-2">
          <ZoneDot zone={room.zone} />
          <span className="truncate">{GROUP_NAME[room.group]}</span>
        </p>
        <button
          type="button"
          onClick={clearSelection}
          className="-mr-1.5 flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-cream/80 transition-colors hover:bg-cream/10 hover:text-cream md:min-h-8 md:px-2.5"
        >
          <BackIcon size={14} />
          Back
          <kbd className="hidden rounded border border-cream/30 px-1 text-[10px] leading-4 text-cream/75 md:inline">Esc</kbd>
        </button>
      </div>

      <h2
        tabIndex={-1}
        data-room-heading
        className={`brand-heading mt-1 leading-snug text-cream ${compact ? 'text-[14px]' : 'text-[15px]'}`}
      >
        <span key={roomId} className="explorer-fade-in inline-block">
          {room.name}
        </span>
      </h2>
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <p className="text-[13px] tabular-nums text-sand">
          {fmt(room.w)} × {fmt(room.d)} ft<span className="mx-1.5 text-cream/30">·</span>
          {Math.round(roomArea(room))} sq ft
        </p>
        <p className="micro shrink-0 tabular-nums text-cream/80" aria-label={`Room ${roomPosition(roomId)} of ${ROOM_COUNT}`}>
          {roomPosition(roomId)} / {ROOM_COUNT}
        </p>
      </div>
    </>
  );
}

/** Purpose and design notes. */
export function RoomNotes({ roomId, compact = false }: { roomId: RoomId; compact?: boolean }) {
  const room = ROOM_BY_ID[roomId];
  return (
    <div key={roomId} className="explorer-fade-in">
      <p className={`mt-3 leading-relaxed text-cream/85 ${compact ? 'text-[12.5px]' : 'text-[13px]'}`}>{room.purpose}</p>

      <MicroHeading as="h3" className="mb-2 mt-4">
        Design notes
      </MicroHeading>
      <ul className="space-y-2">
        {room.notes.map((n) => (
          <li key={n} className={`flex gap-2.5 leading-snug text-cream/75 ${compact ? 'text-[12px]' : 'text-[12.5px]'}`}>
            <span aria-hidden className="mt-[0.45em] size-1 shrink-0 rounded-full bg-orange" />
            {n}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The phone sheet's version: smaller type, and the controls ahead of the text so they stay in reach at half height. */
export function InfoCardBody({ roomId }: { roomId: RoomId }) {
  return (
    <div>
      <RoomHead roomId={roomId} compact />
      <RoomControls roomId={roomId} className="mt-3" />
      <RoomNotes roomId={roomId} compact />
    </div>
  );
}

export function FloatingCard({ roomId }: { roomId: RoomId }) {
  const reduced = useStore((s) => s.reducedMotion);
  const t = reduced ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const };
  return (
    <motion.section
      aria-label="Room details"
      data-focus-return
      data-label-obstacle
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12, transition: reduced ? { duration: 0 } : { duration: 0.2 } }}
      transition={t}
      className="glass explorer-glass explorer-card pointer-events-auto flex min-h-0 w-[380px] max-w-full shrink flex-col overflow-hidden"
    >
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-1 pt-3">
        <RoomHead roomId={roomId} />
        <RoomNotes roomId={roomId} />
      </div>
      <div className="shrink-0 border-t border-cream/12 px-5 pb-4 pt-3">
        <RoomControls roomId={roomId} />
      </div>
    </motion.section>
  );
}
