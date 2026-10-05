// Floating key to the layers that are on, so it stays in view whichever tab is open. It is one slim glass card: a line of
// swatches + names for the active workflows and a line of icons + counts for the safety layer. The 'i' button opens the
// full legends (route summaries, marker names) above the card, so the model stays visible by default. The key and its
// details are flex items of the caller's stack (the wrapper is display: contents), so the stack's height limit applies.
import { useEffect, useId, useRef, useState } from 'react';
import { FLOW_LAYERS, useStore } from '../../store';
import { FLOWS } from '../../data/flows';
import { SAFETY_COUNTS, SAFETY_KINDS } from '../../data/safety';
import { FlowLegend } from '../legends/FlowLegend';
import { SafetyLegend, SafetyMarker } from '../legends/SafetyLegend';
import { InfoIcon } from './icons';
import { FlowChip } from './parts';

function FlowKey() {
  const layers = useStore((s) => s.layers);
  return (
    <ul aria-label="Workflows shown" className="flex flex-wrap gap-x-3.5 gap-y-1">
      {FLOWS.filter((f) => layers[f.id]).map((f) => (
        <li key={f.id} className="flex items-center gap-1.5 text-[12px] font-medium text-cream">
          <FlowChip color={f.color} />
          {f.name}
        </li>
      ))}
    </ul>
  );
}

function SafetyKey() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="micro">Safety</span>
      <ul aria-label="Safety markers shown" className="flex flex-wrap gap-x-2.5 gap-y-1">
        {SAFETY_KINDS.map((k) => (
          <li key={k.kind} title={k.label} className="flex items-center gap-1 text-[12px] font-semibold tabular-nums text-cream/85">
            <SafetyMarker kind={k.kind} className="size-[18px]" />
            <span aria-hidden="true">{SAFETY_COUNTS[k.kind]}</span>
            <span className="sr-only">
              {k.label}: {SAFETY_COUNTS[k.kind]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The key card, mounted only while a flow or the safety layer is on (closing the details resets with it). */
function LegendKey({ flowOn, safetyOn }: { flowOn: boolean; safetyOn: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const detailsId = useId();

  // Details close on Esc (without also clearing the selected room) and on a press anywhere outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="contents"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <div data-label-obstacle className="glass explorer-glass explorer-card explorer-fade-in pointer-events-auto flex max-w-full shrink-0 items-start gap-2 py-1 pl-3.5 pr-1">
        <div className="min-w-0 flex-1 space-y-1.5 py-2">
          {flowOn && <FlowKey />}
          {safetyOn && <SafetyKey />}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? detailsId : undefined}
          aria-label="Legend details"
          onClick={() => setOpen((v) => !v)}
          className={`grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-cream/10 hover:text-cream ${
            open ? 'bg-cream/10 text-cream' : 'text-cream/75'
          }`}
        >
          <InfoIcon size={18} />
        </button>
      </div>
      {open && (
        <div id={detailsId} role="group" aria-label="Legend details" data-label-obstacle className="thin-scroll pointer-events-auto flex min-h-0 max-w-full shrink flex-col gap-2 overflow-y-auto">
          {flowOn && <FlowLegend />}
          {safetyOn && <SafetyLegend />}
        </div>
      )}
    </div>
  );
}

export function Legends() {
  const flowOn = useStore((s) => FLOW_LAYERS.some((id) => s.layers[id]));
  const safetyOn = useStore((s) => s.layers.safety);
  return flowOn || safetyOn ? <LegendKey flowOn={flowOn} safetyOn={safetyOn} /> : null;
}
