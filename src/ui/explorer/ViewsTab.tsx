// Views tab: camera presets, plus overview / eye-level for the selected room (or a room picker when none is).
import { useStore, type RoomView } from '../../store';
import { PRESET_LABELS } from '../../data/cameras';
import { ROOMS_GROUPED, ROOM_BY_ID } from '../../data/layout';
import type { PresetId, RoomId } from '../../data/types';
import { pickPreset, pickRoom } from './actions';
import { ChevronDownIcon, PresetIcon } from './icons';
import { roomViewOptions } from './InfoCard';
import { MicroHeading, Segmented } from './parts';

const PRESET_ROWS: { id: PresetId; caption: string }[] = [
  { id: 'aerial', caption: 'The whole building' },
  { id: 'plan', caption: 'Straight down, north up' },
  { id: 'kitchen', caption: 'Over the cooking floor' },
  { id: 'entrance', caption: 'Outside, at the door' },
];

function RoomSelect({ value, onChange }: { value: RoomId | null; onChange: (id: RoomId) => void }) {
  return (
    <div className="relative">
      <select
        aria-label="Room"
        value={value ?? ''}
        onChange={(e) => e.target.value && onChange(e.target.value as RoomId)}
        className="min-h-11 w-full appearance-none rounded-xl border border-cream/16 bg-black/25 pl-3 pr-9 text-[14px] text-cream transition-colors hover:border-cream/30 md:min-h-10"
      >
        <option value="" disabled>
          Choose a room…
        </option>
        {ROOMS_GROUPED.map(({ group, rooms }) => (
          <optgroup key={group.id} label={group.name}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDownIcon size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cream/60" />
    </div>
  );
}

/**
 * How to move the camera, worded for the visitor's input device (the mappings live in scene/CameraRig.tsx, the wheel in
 * ui/ExplorerUI.tsx). With a mouse the wheel keeps scrolling the page; zooming takes Ctrl / Cmd (or a trackpad pinch).
 */
function ControlsHint() {
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const rows = touch
    ? [['Drag', 'Orbit'], ['Pinch', 'Zoom'], ['Two fingers', 'Pan']]
    : [['Drag', 'Orbit'], ['Right-drag', 'Pan'], ['Scroll', 'Down the page'], ['Ctrl / ⌘ + scroll', 'Zoom']];
  return (
    <div>
      <MicroHeading className="mb-2 px-0.5">Controls</MicroHeading>
      <dl className={`grid gap-2 ${touch ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {rows.map(([how, what]) => (
          <div key={how} className="rounded-xl bg-black/20 px-3 py-2.5">
            <dt className="text-[11.5px] leading-tight text-cream/70">{how}</dt>
            <dd className="mt-0.5 text-[13px] font-medium text-cream">{what}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ViewsTab() {
  const activePreset = useStore((s) => s.activePreset);
  const selectedRoom = useStore((s) => s.selectedRoom);
  const roomView = useStore((s) => s.roomView);
  const room = selectedRoom ? ROOM_BY_ID[selectedRoom] : null;

  return (
    <div className="space-y-6">
      <div>
        <MicroHeading className="mb-2 px-0.5">Camera</MicroHeading>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_ROWS.map(({ id, caption }) => {
            const on = activePreset === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => pickPreset(id)}
                className={`flex min-h-[84px] flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors ${
                  on
                    ? 'border-orange bg-orange text-ink'
                    : 'border-cream/14 bg-black/20 text-cream hover:border-cream/30 hover:bg-cream/6'
                }`}
              >
                <PresetIcon id={id} size={20} />
                <span>
                  <span className="block text-[14px] font-medium leading-tight">{PRESET_LABELS[id]}</span>
                  <span className={`mt-0.5 block text-[11.5px] leading-snug ${on ? 'text-ink' : 'text-cream/70'}`}>{caption}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <MicroHeading className="px-0.5">Inside a room</MicroHeading>
        {!room && <p className="px-0.5 text-[13px] leading-snug text-cream/70">Pick a room to look around inside it.</p>}
        <RoomSelect value={selectedRoom} onChange={(id) => pickRoom(id, roomView)} />
        {room && (
          <Segmented<RoomView>
            label="Room view"
            value={roomView}
            onChange={(v) => pickRoom(room.id, v)}
            options={roomViewOptions}
          />
        )}
      </div>

      <ControlsHint />
    </div>
  );
}
