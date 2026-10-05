// Rooms tab: every room, grouped, one tap to fly there.
import { memo, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { ROOMS_GROUPED, roomArea } from '../../data/layout';
import type { Room } from '../../data/types';
import { pickRoom } from './actions';
import { MicroHeading, ZoneDot, scrollIntoNearest } from './parts';

const RoomRow = memo(function RoomRow({ room, selected, hovered }: { room: Room; selected: boolean; hovered: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const setHoveredRoom = useStore((s) => s.setHoveredRoom);

  // A room picked in the 3D view scrolls its row into sight.
  useEffect(() => {
    if (selected && ref.current) scrollIntoNearest(ref.current, !useStore.getState().reducedMotion);
  }, [selected]);

  return (
    <li>
      <button
        ref={ref}
        type="button"
        aria-current={selected ? 'true' : undefined}
        onClick={() => pickRoom(room.id)}
        // Mouse hover lights the room in the 3D view too (touch has no hover).
        onPointerEnter={(e) => e.pointerType === 'mouse' && setHoveredRoom(room.id)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHoveredRoom(null)}
        className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors md:min-h-9 ${
          selected ? 'bg-orange text-ink' : hovered ? 'bg-cream/10 text-cream' : 'text-cream hover:bg-cream/8'
        }`}
      >
        <ZoneDot zone={room.zone} blank />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{room.name}</span>
        <span className={`shrink-0 text-[11px] tabular-nums ${selected ? 'text-ink' : 'text-cream/55'}`}>
          {Math.round(roomArea(room))} sq ft
        </span>
      </button>
    </li>
  );
});

export function RoomsTab() {
  const selectedRoom = useStore((s) => s.selectedRoom);
  const hoveredRoom = useStore((s) => s.hoveredRoom);
  return (
    <div className="space-y-5">
      {ROOMS_GROUPED.map(({ group, rooms }) => (
        <section key={group.id} aria-label={group.name}>
          <MicroHeading className="mb-1.5 px-3">{group.name}</MicroHeading>
          <ul className="space-y-0.5">
            {rooms.map((r) => (
              <RoomRow key={r.id} room={r} selected={r.id === selectedRoom} hovered={r.id === hoveredRoom} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
