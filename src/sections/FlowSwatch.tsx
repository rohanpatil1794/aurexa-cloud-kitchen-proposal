import type { FlowPattern } from '../data/flows';

// A 2D key to one workflow ribbon. It draws the same pattern as the 3D ribbon (FLOW_PATTERNS, scene/layers/flowsTexture.ts):
//   single = one chevron;  double = a pair of chevrons;  dashed = a broken band with a chevron on each dash;
//   solid  = an unbroken band with a filled arrowhead.
// The pattern is a second cue besides colour, so the four flows stay apart for colour-blind readers.

const MARK = '#fffaf0';
/** The light outline the 3D ribbon wears; only needed on a dark background, where it keeps the black flow visible. */
const HALO = 'rgba(251, 243, 226, 0.9)';

const MID = 12;
/** Open chevron pointing right, centred on x: `wing` half height, `depth` back from the tip, `tip` ahead of x. */
const chevron = (x: number, wing: number, depth: number, tip: number) =>
  `M${x - depth} ${MID - wing}L${x + tip} ${MID}L${x - depth} ${MID + wing}`;

interface Props {
  color: string;
  pattern: FlowPattern;
  /** Draw the light outline (for dark backgrounds). */
  halo?: boolean;
  className?: string;
}

export function FlowSwatch({ color, pattern, halo = false, className = 'h-6 w-15 shrink-0 sm:h-7 sm:w-[4.4rem]' }: Props) {
  const band = { fill: color, stroke: halo ? HALO : 'none', strokeWidth: halo ? 1.5 : 0 };
  const mark = { fill: 'none', stroke: MARK, strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <svg viewBox="0 0 60 24" aria-hidden="true" focusable="false" className={className}>
      {pattern === 'dashed' ? (
        <>
          <rect x="1" y="3" width="25" height="18" rx="5" {...band} />
          <rect x="34" y="3" width="25" height="18" rx="5" {...band} />
          <path d={chevron(13.5, 5.2, 4.2, 3.2)} {...mark} />
          <path d={chevron(46.5, 5.2, 4.2, 3.2)} {...mark} />
        </>
      ) : (
        <>
          <rect x="1" y="3" width="58" height="18" rx="9" {...band} />
          {pattern === 'single' && <path d={chevron(31, 6, 5, 3.5)} {...mark} />}
          {pattern === 'double' && (
            <>
              <path d={chevron(24.5, 5.4, 3.4, 3)} {...mark} />
              <path d={chevron(36, 5.4, 3.4, 3)} {...mark} />
            </>
          )}
          {pattern === 'solid' && <path d="M24 6L36 12L24 18Z" fill={MARK} stroke={MARK} strokeWidth="1.4" strokeLinejoin="round" />}
        </>
      )}
    </svg>
  );
}
