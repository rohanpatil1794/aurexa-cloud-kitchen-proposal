// Floating legends on the stage, so they stay in view whichever tab is open: workflows (any flow layer on) and safety.
// `compact` (phones) swaps the full workflow legend for a one-line key of the active workflows, so it does not cover the model.
import { FLOW_LAYERS, useStore } from '../../store';
import { FLOWS } from '../../data/flows';
import { FlowLegend } from '../legends/FlowLegend';
import { SafetyLegend } from '../legends/SafetyLegend';
import { FlowChip } from './parts';

function FlowKey() {
  const layers = useStore((s) => s.layers);
  return (
    <ul
      aria-label="Workflows shown"
      className="glass explorer-glass explorer-card explorer-fade-in pointer-events-auto flex max-w-full flex-wrap gap-x-3.5 gap-y-1 px-3.5 py-2"
    >
      {FLOWS.filter((f) => layers[f.id]).map((f) => (
        <li key={f.id} className="flex items-center gap-1.5 text-[12px] font-medium text-cream">
          <FlowChip color={f.color} />
          {f.name}
        </li>
      ))}
    </ul>
  );
}

export function Legends({ compact = false, showSafety = true }: { compact?: boolean; showSafety?: boolean }) {
  const flowOn = useStore((s) => FLOW_LAYERS.some((id) => s.layers[id]));
  const safetyOn = useStore((s) => s.layers.safety);
  return (
    <>
      {flowOn &&
        (compact ? (
          <FlowKey />
        ) : (
          <div className="explorer-fade-in pointer-events-auto empty:hidden">
            <FlowLegend />
          </div>
        ))}
      {safetyOn && showSafety && (
        <div className="explorer-fade-in pointer-events-auto empty:hidden">
          <SafetyLegend />
        </div>
      )}
    </>
  );
}
