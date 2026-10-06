// Key to the four workflow colours. ExplorerUI mounts it while any flow layer is on: every flow is listed, the ones that
// are switched on are highlighted and spell out their route, the others stay as dimmed names.
import { FLOWS, FLOW_PATTERNS, type FlowPattern } from '../../data/flows';
import { useStore } from '../../store';

/** 'floating' = its own dark glass card over the stage (default); 'panel' = bare, for use inside an existing panel. */
export type FlowLegendVariant = 'panel' | 'floating';

const OUTLINE = 'rgba(251,243,226,0.85)';
const MARK = '#fffaf0';

/** The chevron marks of the patterns that have them, in the 30 x 14 swatch (orders draws a filled arrowhead instead). */
const MARKS: Record<Exclude<FlowPattern, 'solid'>, string> = {
  single: 'M13.2 3.7 17.2 7l-4 3.3',
  double: 'M11.5 3.8 15.7 7l-4.2 3.2M17.3 3.8 21.5 7l-4.2 3.2',
  dashed: 'M5.6 4.3 8.6 7l-3 2.7M21.4 4.3 24.4 7l-3 2.7',
};

/**
 * The ribbon as drawn in the 3D view (data/flows.ts FLOW_PATTERNS, scene/layers/flowsTexture.ts): a coloured band with a light
 * outline (it keeps black visible on dark glass) and white marks, a different shape for each flow so they stay apart without
 * colour: raw = one chevron, staff = a pair, dirty = a dashed band with a chevron on each dash, orders = a filled arrowhead.
 */
export function FlowSwatch({ color, pattern, on }: { color: string; pattern: FlowPattern; on: boolean }) {
  return (
    <svg aria-hidden width="30" height="14" viewBox="0 0 30 14" className={`mt-px shrink-0 transition-opacity ${on ? '' : 'opacity-40'}`}>
      {pattern === 'dashed' ? (
        <>
          <rect x="0.75" y="0.75" width="12.5" height="12.5" rx="6.25" fill={color} stroke={OUTLINE} strokeWidth="1.5" />
          <rect x="16.75" y="0.75" width="12.5" height="12.5" rx="6.25" fill={color} stroke={OUTLINE} strokeWidth="1.5" />
        </>
      ) : (
        <rect x="0.75" y="0.75" width="28.5" height="12.5" rx="6.25" fill={color} stroke={OUTLINE} strokeWidth="1.5" />
      )}
      {pattern === 'solid' ? (
        <path d="M11.3 3.6 19 7l-7.7 3.4z" fill={MARK} stroke={MARK} strokeWidth="1.2" strokeLinejoin="round" />
      ) : (
        <path d={MARKS[pattern]} fill="none" stroke={MARK} strokeWidth={pattern === 'dashed' ? 1.5 : 1.6} strokeLinecap="round" strokeLinejoin="round" />
      )}
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
              <FlowSwatch color={f.color} pattern={FLOW_PATTERNS[f.id]} on={on} />
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
