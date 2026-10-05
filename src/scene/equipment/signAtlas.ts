// Text signs, packed. All the signs of one PrimBuilder are drawn into a shared canvas atlas and their planes are merged
// into one mesh per material class (lit or self-lit, one or two sided), so a whole room set costs a handful of draw
// calls and one texture instead of a plane, a material and a texture per sign. Text is cut out (alpha to coverage on the
// MSAA canvas) rather than blended, so signs depth-test and sort like solid geometry.
import * as THREE from 'three';
import type { SignRec } from '../../lib/prims';
import { drawTextCanvas, type TextTexOpts } from '../../lib/textTexture';

/** Texels per foot of sign width (to the nearest power of two), the tile size limits, and the border that keeps mipmaps from mixing neighbours. */
const TEXELS_PER_FT = 160;
const MIN_TILE = 64;
const MAX_TILE = 512;
const PAD = 8;
const MAX_ATLAS_W = 2048;
const MAX_ATLAS_H = 4096;
const ALPHA_CUTOFF = 0.35;

interface Tile {
  opts: TextTexOpts;
  /** Text area in texels (the padded rect around it is w + 2 PAD wide). */
  w: number;
  h: number;
  /** 0xRRGGBB of the ink: carried by every see-through texel so the cut-out edge does not fade towards black. */
  ink: number;
  /** Top-left of the padded rect, set by pack(). */
  x: number;
  y: number;
}

interface Page {
  w: number;
  h: number;
  tiles: Tile[];
}

const pow2round = (n: number) => 2 ** Math.round(Math.log2(n));

/** Shelf-pack the tiles, tallest first, into pages at most MAX_ATLAS_W x MAX_ATLAS_H. */
function pack(tiles: Tile[]): Page[] {
  const padded = (n: number) => n + 2 * PAD;
  const area = tiles.reduce((a, t) => a + padded(t.w) * padded(t.h), 0);
  const widest = Math.max(...tiles.map((t) => padded(t.w)));
  const width = Math.min(MAX_ATLAS_W, Math.ceil(Math.max(widest, Math.sqrt(area) * 1.15) / 8) * 8);
  const pages: Page[] = [];
  let page: Page | undefined;
  let x = 0, y = 0, row = 0;
  for (const t of [...tiles].sort((a, b) => b.h - a.h)) {
    if (page && x + padded(t.w) > width) {
      x = 0;
      y += row;
      row = 0;
    }
    if (!page || y + padded(t.h) > MAX_ATLAS_H) {
      page = { w: width, h: 0, tiles: [] };
      pages.push(page);
      x = y = row = 0;
    }
    t.x = x;
    t.y = y;
    x += padded(t.w);
    row = Math.max(row, padded(t.h));
    page.h = y + row;
    page.tiles.push(t);
  }
  return pages;
}

/** One packed texture: the tiles drawn on a canvas, then uploaded as plain RGBA so the see-through texels can carry the ink colour. */
class Atlas {
  readonly texture: THREE.DataTexture;
  private readonly canvas = document.createElement('canvas');
  private readonly scratch = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;

  constructor(readonly page: Page) {
    this.canvas.width = page.w;
    this.canvas.height = page.h;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.texture = new THREE.DataTexture(new Uint8Array(page.w * page.h * 4), page.w, page.h, THREE.RGBAFormat);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.generateMipmaps = true;
    this.texture.anisotropy = 4;
    this.redraw();
  }

  /** Draw every tile (again, once the web font has loaded) and refresh the texture data. */
  redraw(): void {
    const { ctx, canvas, scratch, page } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const t of page.tiles) {
      if (t.opts.bg) {
        ctx.fillStyle = t.opts.bg;
        ctx.fillRect(t.x, t.y, t.w + 2 * PAD, t.h + 2 * PAD);
      }
      scratch.width = t.w;
      scratch.height = t.h;
      drawTextCanvas(scratch, t.opts);
      ctx.drawImage(scratch, t.x + PAD, t.y + PAD);
    }
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (const t of page.tiles) {
      if (t.opts.bg) continue;
      const r = (t.ink >> 16) & 255, g = (t.ink >> 8) & 255, b = t.ink & 255;
      for (let row = t.y; row < t.y + t.h + 2 * PAD; row++) {
        for (let i = (row * canvas.width + t.x) * 4, end = i + (t.w + 2 * PAD) * 4; i < end; i += 4) {
          if (px[i + 3] < 255) {
            px[i] = r;
            px[i + 1] = g;
            px[i + 2] = b;
          }
        }
      }
    }
    (this.texture.image.data as Uint8Array).set(px);
    this.texture.needsUpdate = true;
  }
}

export interface SignMeshes {
  group: THREE.Group;
  /** Draw the text again (the web font arrived after the first draw). */
  redraw(): void;
  dispose(): void;
}

interface Batch {
  atlas: Atlas;
  emissive: boolean;
  double: boolean;
  pos: number[];
  uv: number[];
  index: number[];
}

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _v = new THREE.Vector3();
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const;

export function buildSignMeshes(signs: SignRec[]): SignMeshes {
  const group = new THREE.Group();
  group.name = 'sign-atlas';
  if (!signs.length) return { group, redraw() {}, dispose() {} };

  // One tile per distinct look (text, colours, size class); equal signs share it.
  const tiles = new Map<string, Tile>();
  const tileOf = signs.map((s) => {
    const w = THREE.MathUtils.clamp(pow2round(s.w * TEXELS_PER_FT), MIN_TILE, MAX_TILE);
    const h = Math.max(32, Math.round(w / Math.max(0.2, s.w / s.h)));
    const key = JSON.stringify([s.text, s.sub, s.fg, s.bg, s.weight, s.tracking, w, h]);
    let t = tiles.get(key);
    if (!t) {
      const fg = s.fg ?? '#ffffff';
      const opts: TextTexOpts = { text: s.text, sub: s.sub, aspect: w / h, fg, bg: s.bg ?? null, weight: s.weight, tracking: s.tracking };
      t = { opts, w, h, ink: new THREE.Color(fg).getHex(), x: 0, y: 0 };
      tiles.set(key, t);
    }
    return t;
  });

  const atlases = pack([...tiles.values()]).map((page) => new Atlas(page));
  const atlasOf = new Map<Tile, Atlas>();
  for (const a of atlases) for (const t of a.page.tiles) atlasOf.set(t, a);

  // Merge the planes into one geometry per (atlas, self-lit, two-sided).
  const batches = new Map<string, Batch>();
  signs.forEach((s, i) => {
    const t = tileOf[i];
    const atlas = atlasOf.get(t)!;
    const emissive = !!s.emissive, double = !!s.double;
    const key = `${atlases.indexOf(atlas)}|${emissive ? 1 : 0}|${double ? 1 : 0}`;
    let batch = batches.get(key);
    if (!batch) batches.set(key, (batch = { atlas, emissive, double, pos: [], uv: [], index: [] }));
    s.matrix.decompose(_p, _q, _s);
    const u0 = (t.x + PAD) / atlas.page.w, u1 = (t.x + PAD + t.w) / atlas.page.w;
    // the canvas (and so the texture data) is stored top row first: the top of the sign is the smaller v
    const vTop = (t.y + PAD) / atlas.page.h, vBottom = (t.y + PAD + t.h) / atlas.page.h;
    const base = batch.pos.length / 3;
    for (const [cx, cy] of CORNERS) {
      _v.set((cx * s.w) / 2, (cy * s.h) / 2, 0).applyQuaternion(_q).add(_p);
      batch.pos.push(_v.x, _v.y, _v.z);
      batch.uv.push(cx < 0 ? u0 : u1, cy < 0 ? vBottom : vTop);
    }
    batch.index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  const disposables: { dispose(): void }[] = atlases.map((a) => a.texture);
  for (const b of batches.values()) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    geo.setIndex(b.index);
    const mat = new THREE.MeshBasicMaterial({
      map: b.atlas.texture,
      alphaTest: ALPHA_CUTOFF,
      alphaToCoverage: true,
      toneMapped: !b.emissive,
      side: b.double ? THREE.DoubleSide : THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `signs${b.emissive ? '-lit' : ''}${b.double ? '-2' : ''}`;
    mesh.raycast = () => {};
    group.add(mesh);
    disposables.push(geo, mat);
  }

  return {
    group,
    redraw: () => atlases.forEach((a) => a.redraw()),
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
