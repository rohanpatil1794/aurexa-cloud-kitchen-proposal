// The selected room's card: purpose, size, design notes, previous / next and the Overview / Eye-level switch.
// `FloatingCard` is the desktop version (bottom-left of the stage). The mobile sheet embeds `InfoCardBody` directly with
// `compact`: smaller type, and the Overview / Eye-level and Previous / Next controls first so they stay in reach at half height.
import { motion } from 'framer-motion';
import { useStore, type RoomView } from '../../store';
import { GROUPS, ROOM_BY_ID, ROOM_COUNT, ROOM_ORDER, neighbourRoom, roomArea } from '../../data/layout';
import type { RoomId } from '../../data/types';
import { pickRoom } from './actions';
import { BackIcon, ChevronLeftIcon, ChevronRightIcon, EyeLevelIcon, OverviewIcon } from './icons';
import { MicroHeading, Segmented, ZoneDot } from './parts';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const GROUP_NAME = Object.fromEntries(GROUPS.map((g) => [g.id, g.name]));

function NeighbourButton({ dir, id }: { dir: -1 | 1; id: RoomId }) {
  const stepRoom = useStore((s) => s.stepRoom);
  const next = dir === 1;
  return (
    <button
      type="button"
      onClick={() => stepRoom(dir)}
      className={`flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-cream/14 bg-black/15 px-2.5 transition-colors hover:border-orange/70 hover:bg-cream/6 ${
        next ? 'flex-row-reverse text-right' : 'text-left'
      }`}
    >
      {next ? <ChevronRightIcon size={16} className="shrink-0 text-cream/60" /> : <ChevronLeftIcon size={16} className="shrink-0 text-cream/60" />}
      <span className="min-w-0 flex-1">
        <span className="micro block text-[10px]">{next ? 'Next' : 'Previous'}</span>
        <span className="block truncate text-[13px] font-medium text-cream">{ROOM_BY_ID[id].name}</span>
      </span>
    </button>
  );
}

export function InfoCardBody({ roomId, compact = false }: { roomId: RoomId; compact?: boolean }) {
  const room = ROOM_BY_ID[roomId];
  const roomView = useStore((s) => s.roomView);
  const clearSelection = useStore((s) => s.clearSelection);
  // Same order as the Rooms tab and the Previous / Next buttons.
  const position = ROOM_ORDER.indexOf(roomId) + 1;

  const controls = (
    <div className={`space-y-2 ${compact ? 'mt-3' : 'mt-4'}`}>
      <Segmented<RoomView>
        label="Room view"
        value={roomView}
        onChange={(v) => pickRoom(roomId, v)}
        options={[
          { value: 'overview', label: 'Overview', icon: <OverviewIcon size={15} /> },
          { value: 'eye', label: 'Eye-level', icon: <EyeLevelIcon size={15} /> },
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        <NeighbourButton dir={-1} id={neighbourRoom(roomId, -1)} />
        <NeighbourButton dir={1} id={neighbourRoom(roomId, 1)} />
      </div>
    </div>
  );

  return (
    <div key={roomId} className="explorer-fade-in">
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
          <kbd className="hidden rounded border border-cream/25 px-1 text-[10px] leading-4 text-cream/55 md:inline">Esc</kbd>
        </button>
      </div>

      <h2 className={`brand-heading mt-1 leading-snug text-cream ${compact ? 'text-[14px]' : 'text-[15px]'}`}>{room.name}</h2>
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <p className="text-[13px] tabular-nums text-sand">
          {fmt(room.w)} × {fmt(room.d)} ft<span className="mx-1.5 text-cream/30">·</span>
          {Math.round(roomArea(room))} sq ft
        </p>
        <p className="micro shrink-0 tabular-nums text-cream/55" aria-label={`Room ${position} of ${ROOM_COUNT}`}>
          {position} / {ROOM_COUNT}
        </p>
      </div>

      {compact && controls}

      <p className={`mt-3 leading-relaxed text-cream/85 ${compact ? 'text-[12.5px]' : 'text-[13px]'}`}>{room.purpose}</p>

      <MicroHeading className="mb-2 mt-4">Design notes</MicroHeading>
      <ul className="space-y-2">
        {room.notes.map((n) => (
          <li key={n} className={`flex gap-2.5 leading-snug text-cream/75 ${compact ? 'text-[12px]' : 'text-[12.5px]'}`}>
            <span aria-hidden className="mt-[0.45em] size-1 shrink-0 rounded-full bg-orange" />
            {n}
          </li>
        ))}
      </ul>

      {!compact && controls}
    </div>
  );
}

export function FloatingCard({ roomId }: { roomId: RoomId }) {
  const reduced = useStore((s) => s.reducedMotion);
  const t = reduced ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const };
  return (
    <motion.section
      aria-label="Room details"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12, transition: reduced ? { duration: 0 } : { duration: 0.2 } }}
      transition={t}
      className="glass explorer-glass explorer-card thin-scroll pointer-events-auto min-h-0 w-[380px] max-w-full shrink overflow-y-auto px-5 pb-5 pt-3"
    >
      <InfoCardBody roomId={roomId} />
    </motion.section>
  );
}
