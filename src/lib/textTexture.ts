// Canvas text textures (no font downloads: uses the bundled @fontsource Public Sans, redrawn once
// the font has loaded). Textures are cached by their options.
import * as THREE from 'three';

export interface TextTexOpts {
  text: string;
  /** Plane aspect ratio (w / h). Canvas is 512 px tall-ish scaled from this. */
  aspect: number;
  fg?: string;
  bg?: string | null;
  weight?: number;
  /** letter-spacing in em */
  tracking?: number;
  sub?: string;
  /** Pixel width of the canvas (default 512). */
  px?: number;
}

const cache = new Map<string, THREE.CanvasTexture>();
const redraws = new Set<() => void>();
let fontHooked = false;

/** Weights the canvas text uses: 700 is the default sign weight, 800 the EXIT / GAS / name-plate signs, 500 the small second line. */
const TEXT_WEIGHTS = [500, 700, 800] as const;
let fontsLoaded = false;
/** Something was drawn while a text weight was still missing (the browser's fallback face): redraw once the weights arrive. */
let drewWithFallback = false;

/** True once every text weight is available. `check` is cheap and loaded fonts never unload, so the answer is cached. */
function textFontsReady(): boolean {
  if (fontsLoaded) return true;
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (!fonts || typeof fonts.check !== 'function') return (fontsLoaded = true);
  try {
    fontsLoaded = TEXT_WEIGHTS.every((w) => fonts.check(`${w} 48px "Public Sans"`));
  } catch {
    fontsLoaded = true;
  }
  return fontsLoaded;
}

/**
 * Starts loading the three weights (once). Call it early: Stage does at module load, so the fonts arrive while the scene
 * is still being built and the first sign draw already uses them. If a draw did use the fallback face, ONE redraw follows
 * when all three are in (it used to be four: one per weight plus `fonts.ready`, each repainting every sign atlas).
 */
export function loadTextFonts(): void {
  if (fontHooked || typeof document === 'undefined' || !document.fonts) return;
  fontHooked = true;
  Promise.allSettled(TEXT_WEIGHTS.map((weight) => document.fonts.load(`${weight} 48px "Public Sans"`))).then(() => {
    if (!drewWithFallback) return;
    drewWithFallback = false; // a draw that still sees a missing weight sets it again
    redraws.forEach((fn) => fn());
  });
}

function draw(canvas: HTMLCanvasElement, o: TextTexOpts) {
  loadTextFonts();
  if (!textFontsReady()) drewWithFallback = true;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (o.bg) {
    ctx.fillStyle = o.bg;
    ctx.fillRect(0, 0, W, H);
  }
  const weight = o.weight ?? 700;
  const tracking = o.tracking ?? 0.18;
  const lines = o.text.split('\n');
  const hasSub = !!o.sub;
  const mainH = hasSub ? H * 0.58 : H;
  const lineH = mainH / lines.length;
  ctx.fillStyle = o.fg ?? '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const drawTracked = (txt: string, cy: number, maxH: number, maxW: number, w: number) => {
    const chars = Array.from(txt);
    // One measureText per glyph and pass, reused for the total width and the pen advance (it used to measure three times).
    const widths = new Array<number>(chars.length);
    const measure = (s: number) => {
      ctx.font = `${w} ${s}px "Public Sans", system-ui, sans-serif`;
      let total = 0;
      for (let i = 0; i < chars.length; i++) total += (widths[i] = ctx.measureText(chars[i]).width) + s * tracking;
      return total - s * tracking;
    };
    let size = Math.min(maxH * 0.62, 220);
    const natural = measure(size);
    let total = natural;
    if (natural > maxW) {
      size *= maxW / natural;
      total = measure(size);
    }
    let x = (W - total) / 2;
    for (let i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], x, cy);
      x += widths[i] + size * tracking;
    }
  };

  lines.forEach((ln, i) => drawTracked(ln, lineH * (i + 0.5) + (hasSub ? 0 : 0), lineH, W * 0.9, weight));
  if (hasSub && o.sub) drawTracked(o.sub, mainH + (H - mainH) / 2, H - mainH, W * 0.9, 500);
}

/** Draw `o` into an existing canvas (the sign atlas packs many signs into one texture). */
export { draw as drawTextCanvas };

/** Call `fn` each time the web font finishes loading (the first draw may have used the fallback face). Returns the unsubscribe. */
export function onTextFontLoaded(fn: () => void): () => void {
  loadTextFonts();
  redraws.add(fn);
  return () => {
    redraws.delete(fn);
  };
}

export function getTextTexture(o: TextTexOpts): THREE.CanvasTexture {
  const key = JSON.stringify(o);
  const hit = cache.get(key);
  if (hit) return hit;
  loadTextFonts();
  const canvas = document.createElement('canvas');
  const px = o.px ?? 512;
  canvas.width = px;
  canvas.height = Math.max(32, Math.round(px / Math.max(0.2, o.aspect)));
  draw(canvas, o);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  redraws.add(() => {
    draw(canvas, o);
    tex.needsUpdate = true;
  });
  cache.set(key, tex);
  return tex;
}
