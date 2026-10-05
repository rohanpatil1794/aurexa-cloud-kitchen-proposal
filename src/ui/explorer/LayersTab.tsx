// Layers tab: scene modes, the four workflows, and the plan overlays.
import type { ReactNode } from 'react';
import { useStore, type LayerId } from '../../store';
import { FOOTPRINT } from '../../data/layout';
import type { FlowId } from '../../data/types';
import { FLOWS } from '../../data/flows';
import {
  DimensionsIcon, DollhouseIcon, EquipmentIcon, FullHeightIcon, LabelsIcon, MoonIcon, SafetyIcon, SunIcon, ZonesIcon,
} from './icons';
import { FlowChip, MicroHeading, Segmented, SwitchRow } from './parts';

/** Short toggle captions; names and colours come from src/data/flows.ts so the legend and the toggles never disagree. */
const FLOW_MEANING: Record<FlowId, string> = {
  raw: 'From the goods lift through storage and prep to the kitchen.',
  staff: 'From the logo door to the kitchen, lockers and toilets.',
  dirty: 'Used ware through the five-stage wash line; waste leaves by its own route.',
  orders: 'From the pass, through packing and Dispatch, to the rider pickup.',
};

const OVERLAY_ROWS: { id: LayerId; name: string; meaning: string; icon: ReactNode }[] = [
  { id: 'safety', name: 'Safety', meaning: 'Extinguishers, smoke and gas detectors, the gas shut-off, emergency lights and exits.', icon: <SafetyIcon size={18} /> },
  { id: 'zones', name: 'Zones', meaning: 'Floor tint by diet: Veg, Jain, Vegan, Non-Veg and the content corner.', icon: <ZonesIcon size={18} /> },
  { id: 'labels', name: 'Labels', meaning: 'Room names over the plan. Tap one to open that room.', icon: <LabelsIcon size={18} /> },
  { id: 'dimensions', name: 'Dimensions', meaning: `The overall ${FOOTPRINT.w} ft by ${FOOTPRINT.d} ft footprint, drawn as architect’s dimension lines.`, icon: <DimensionsIcon size={18} /> },
  { id: 'equipment', name: 'Equipment', meaning: 'Counters, cookers, racks and fixtures. Switch off to see bare rooms.', icon: <EquipmentIcon size={18} /> },
];

export function LayersTab() {
  const layers = useStore((s) => s.layers);
  const toggleLayer = useStore((s) => s.toggleLayer);
  const wallMode = useStore((s) => s.wallMode);
  const setWallMode = useStore((s) => s.setWallMode);
  const lighting = useStore((s) => s.lighting);
  const setLighting = useStore((s) => s.setLighting);

  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <Segmented
          label="Walls"
          value={wallMode}
          onChange={setWallMode}
          options={[
            { value: 'dollhouse', label: 'Dollhouse', icon: <DollhouseIcon size={15} /> },
            { value: 'full', label: 'Full height', icon: <FullHeightIcon size={15} /> },
          ]}
        />
        <Segmented
          label="Lighting"
          value={lighting}
          onChange={setLighting}
          options={[
            { value: 'day', label: 'Day', icon: <SunIcon size={15} /> },
            { value: 'evening', label: 'Evening', icon: <MoonIcon size={15} /> },
          ]}
        />
      </div>

      <div>
        <MicroHeading className="mb-1.5 px-2.5">Workflows</MicroHeading>
        <div className="space-y-0.5">
          {FLOWS.map((f) => (
            <SwitchRow
              key={f.id}
              mark={<FlowChip color={f.color} />}
              name={f.name}
              meaning={FLOW_MEANING[f.id]}
              on={layers[f.id]}
              onToggle={() => toggleLayer(f.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <MicroHeading className="mb-1.5 px-2.5">Overlays</MicroHeading>
        <div className="space-y-0.5">
          {OVERLAY_ROWS.map((o) => (
            <SwitchRow
              key={o.id}
              mark={o.icon}
              name={o.name}
              meaning={o.meaning}
              on={layers[o.id]}
              onToggle={() => toggleLayer(o.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
