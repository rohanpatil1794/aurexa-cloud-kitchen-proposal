// Where the 3D view is free of UI: shared by the camera rig (frames poses in it) and the labels (keep clear of the rest).
// DOM reads only (top bar, hero text), no scene or store state of its own. Rectangles are in canvas px (origin = the
// canvas's top-left corner), which is what the camera and the label layer work in.
import { DESKTOP_MIN_WIDTH, PANEL_WIDTH, SHEET_FRACTION, SHEET_PEEK_PX, type FreeRect } from '../data/cameras';
import type { SheetState } from '../store';

/**
 * Phones get the bottom sheet, everything wider the side panel. This is the one rule the camera and the labels follow; the
 * explorer UI (ExplorerUI / lib/hooks useIsMobile) must use the same one, so changing it takes this line and that hook together.
 */
export const isSheetLayout = (width: number): boolean => width < DESKTOP_MIN_WIDTH;

/** The side panel with its 12 px margin from the screen edge and a gap before the model. */
const PANEL_RESERVE = PANEL_WIDTH + 24;

/** Landscape phones: the explorer panel folds into a drawer over the stage (ui/explorer/Desktop.tsx SHORT_SCREEN, max-height 500px). */
export const isShortScreen = (height: number): boolean => height <= 500;

/** How far (px) the fixed top bar reaches into the canvas. */
export function topBarHeight(canvas: HTMLElement): number {
  const bar = document.querySelector('.topbar');
  const bottom = bar ? bar.getBoundingClientRect().bottom : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 0;
  return Math.max(0, bottom - canvas.getBoundingClientRect().top);
}

/** Height the bottom sheet covers in each state. Full is framed like half: the model is hidden behind it anyway. */
export const sheetCover = (h: number, sheet: SheetState): number => (sheet === 'peek' ? SHEET_PEEK_PX : h * SHEET_FRACTION.half);

/** The explorer's free area: below the top bar, left of the side panel (desktop; none on a short screen) or above the sheet (phones). */
export function explorerFree(w: number, h: number, sheet: SheetState, topBar: number, out: FreeRect = { x0: 0, y0: 0, x1: 0, y1: 0 }): FreeRect {
  const sheetLayout = isSheetLayout(w);
  out.x0 = 0;
  out.y0 = topBar;
  out.x1 = sheetLayout || isShortScreen(h) ? w : w - PANEL_RESERVE;
  out.y1 = sheetLayout ? h - sheetCover(h, sheet) : h;
  return out;
}

/**
 * The room card's footprint at the bottom-left of the desktop stage (ui/explorer/InfoCard FloatingCard: 380 px wide with a
 * 16 px margin; about 450 px tall at most), so a room overview can be placed clear of it. Phones have the sheet and short
 * screens the slim room bar instead.
 */
export const CARD = { w: 396, h: 456 } as const;
export const hasRoomCard = (w: number, h: number): boolean => !isSheetLayout(w) && !isShortScreen(h);

/** The hero's text block in canvas px. */
export interface TextBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Measure the hero text: the real text lines for the horizontal extent, the layout box of the stack for the vertical one. */
export function measureHeroText(canvas: HTMLElement): TextBox | null {
  const root = document.querySelector('.hero-root');
  const title = root?.querySelector('.hero-title');
  const stack = title?.parentElement;
  if (!root || !title || !stack) return null;
  const origin = canvas.getBoundingClientRect();
  const range = document.createRange();
  let left = Infinity, right = -Infinity;
  for (const el of root.querySelectorAll('.hero-title, .hero-subline, .hero-cta')) {
    range.selectNodeContents(el);
    const r = el.classList.contains('hero-cta') ? el.getBoundingClientRect() : range.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue; // hidden at this size
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
  }
  const box = stack.getBoundingClientRect();
  return right > left ? { left: left - origin.left, right: right - origin.left, top: box.top - origin.top, bottom: box.bottom - origin.top } : null;
}

const HERO_GAP = 12;
/** The model's width is about this many times its height (the aerial 3/4 view). */
const MODEL_ASPECT = 1.3;
/** The model may reach this far into the text column (share of the viewport width): the scrim darkens it there. */
const TEXT_OVERLAP = 0.07;

/**
 * Where the hero model sits: beside the text on wide screens, above it when the text spans the width (phones) or the
 * screen is portrait. Whichever area fits the larger model; portrait screens favour the area above.
 */
export function heroFree(w: number, h: number, topBar: number, text: TextBox | null): FreeRect {
  const full: FreeRect = { x0: HERO_GAP, y0: topBar + HERO_GAP, x1: w - HERO_GAP, y1: h - HERO_GAP };
  if (!text) return full;
  const side: FreeRect = { ...full, x0: Math.max(full.x0, text.right - TEXT_OVERLAP * w) };
  const above: FreeRect = { ...full, y1: Math.min(full.y1, text.top - HERO_GAP) };
  const capacity = (r: FreeRect) => Math.min(r.x1 - r.x0, MODEL_ASPECT * (r.y1 - r.y0));
  const aboveBias = w < h ? 1.3 : 1;
  return capacity(above) * aboveBias > capacity(side) ? above : side;
}
