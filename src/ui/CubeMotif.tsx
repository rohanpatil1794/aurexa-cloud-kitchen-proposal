import { BRAND } from '../lib/palette';

/**
 * The four-cube cluster from the Aurexa mark, redrawn as vector geometry: two columns of isometric cubes
 * (teal on the left, grey on the right), the lower pair tucked half a cube down so the upper cubes overlap them.
 * Decorative only; the real logo is always shown through the PNG cuts in public/brand.
 *
 * `solid` uses the logo's face tints; `outline` is hairline strokes of the visible edges only.
 * `tone` is the backdrop the outline sits on: 'dark' = light strokes, 'light' = deep strokes.
 */

// Isometric cube: half-width W, half-height H of the top rhombus, vertical edge L (= 2H).
const W = 122;
const H = 70.5;
const L = 141;
const COL_X = [W, W * 3] as const; // centre x of the left / right column
const ROW_Y = [0, 1.5 * L] as const; // top vertex y of the upper / lower row

const f = (n: number) => +n.toFixed(2);
const pts = (...p: [number, number][]) => p.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

function faces(cx: number, cy: number) {
  return {
    top: pts([cx, cy], [cx + W, cy + H], [cx, cy + 2 * H], [cx - W, cy + H]),
    left: pts([cx - W, cy + H], [cx, cy + 2 * H], [cx, cy + 2 * H + L], [cx - W, cy + H + L]),
    right: pts([cx, cy + 2 * H], [cx + W, cy + H], [cx + W, cy + H + L], [cx, cy + 2 * H + L]),
  };
}

type Tints = { top: string; left: string; right: string };
const TEAL: Tints = { top: BRAND.tealLight, left: BRAND.teal, right: BRAND.tealMid };
const GREY: Tints = { top: BRAND.steelLight, left: BRAND.slate, right: BRAND.steelMid };

// Painter's order: lower row first, the upper cubes overlap it.
const SOLID_CUBES = [
  { cx: COL_X[0], cy: ROW_Y[1], tints: TEAL },
  { cx: COL_X[1], cy: ROW_Y[1], tints: GREY },
  { cx: COL_X[0], cy: ROW_Y[0], tints: TEAL },
  { cx: COL_X[1], cy: ROW_Y[0], tints: GREY },
];

/** Visible edges of one column, as a single path (the lower cube loses the part its upper neighbour hides). */
function columnEdges(cx: number): string {
  const [top, low] = ROW_Y;
  const c = cx;
  const upper =
    `M${c},${top}L${c + W},${top + H}V${top + H + L}L${c},${top + 2 * H + L}L${c - W},${top + H + L}V${top + H}Z` +
    `M${c - W},${top + H}L${c},${top + 2 * H}L${c + W},${top + H}M${c},${top + 2 * H}V${top + 2 * H + L}`;
  const lower =
    `M${c - W / 2},${low + H / 2}L${c - W},${low + H}V${low + H + L}L${c},${low + 2 * H + L}L${c + W},${low + H + L}V${low + H}L${c + W / 2},${low + H / 2}` +
    `M${c - W},${low + H}L${c},${low + 2 * H}L${c + W},${low + H}M${c},${low + 2 * H}V${low + 2 * H + L}`;
  return upper + lower;
}
const EDGES = [columnEdges(COL_X[0]), columnEdges(COL_X[1])] as const;

const STROKES = {
  dark: [BRAND.tealLight, BRAND.steelMid],
  light: [BRAND.teal, BRAND.slate],
} as const;

const VIEW_W = 4 * W;
const VIEW_H = ROW_Y[1] + 2 * H + L;

export function CubeMotif({
  className,
  tone = 'light',
  variant = 'solid',
}: {
  className?: string;
  tone?: 'light' | 'dark';
  variant?: 'solid' | 'outline';
}) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {variant === 'solid' ? (
        SOLID_CUBES.map(({ cx, cy, tints }) => {
          const p = faces(cx, cy);
          return (
            <g key={`${cx}-${cy}`} strokeWidth={0.8} strokeLinejoin="round">
              <polygon points={p.top} fill={tints.top} stroke={tints.top} />
              <polygon points={p.left} fill={tints.left} stroke={tints.left} />
              <polygon points={p.right} fill={tints.right} stroke={tints.right} />
            </g>
          );
        })
      ) : (
        <g strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round">
          {EDGES.map((d, i) => (
            <path key={i} d={d} stroke={STROKES[tone][i]} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
      )}
    </svg>
  );
}
