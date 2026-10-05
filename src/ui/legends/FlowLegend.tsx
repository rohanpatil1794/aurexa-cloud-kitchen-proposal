// Key to the four workflow colours. ExplorerUI mounts it while any flow layer is on: every flow is listed, the ones that
// are switched on are highlighted and spell out their route, the others stay as dimmed names.
import { FLOWS } from '../../data/flows';
import { useStore } from '../../store';

/** 'floating' = its own dark glass card over the stage (default); 'panel' = bare, for use inside an existing panel. */
export type FlowLegendVariant = 'panel' | 'floating';

/** The ribbon as drawn in the 3D view: coloured band, light outline, white chevrons. The outline keeps black visible on dark glass. */
export function FlowSwatch({ color, on }: { color: string; on: boolean }) {
  return (
    <svg aria-hidden width="30" height="14" viewBox="0 0 30 14" className={`mt-px shrink-0 transition-opacity ${on ? '' : 'opacity-40'}`}>
      <rect x="0.75" y="0.75" width="28.5" height="12.5" rx="6.25" fill={color} stroke="rgba(251,243,226,0.85)" strokeWidth="1.5" />
      <path
        d="M11.5 3.8 15.7 7l-4.2 3.2M17.3 3.8 21.5 7l-4.2 3.2"
        fill="none"
        stroke="#fffaf0"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FlowLegend({ variant = 'floating', className = '' }: { variant?: FlowLegendVariant; className?: string }) {
  const layers = useStore((s) => s.layers);
  const shell = variant === 'floating' ? 'glass explorer-glass explorer-card pointer-events-auto w-[320px] max-w-full px-4 py-3.5' : 'w-full';
  return (
    <section aria-label="Workflow legend" className={`${shell} ${className}`}>
      <h2 className="micro mb-2.5">Workflows</h2>
      <ul className="space-y-2">
        {FLOWS.map((f) => {
          const on = layers[f.id];
          return (
            <li key={f.id} className={`flex items-start gap-2.5 transition-opacity duration-300 ${on ? '' : 'opacity-50'}`}>
              <FlowSwatch color={f.color} on={on} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-tight text-cream">
                  {f.name}
                  <span className="sr-only">{on ? ' (shown)' : ' (hidden)'}</span>
                </p>
                <div aria-hidden={!on} className={`grid transition-[grid-template-rows] duration-300 ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <p className="overflow-hidden text-[12px] leading-snug text-cream/80">
                    <span className="block pt-0.5">{f.summary}</span>
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
