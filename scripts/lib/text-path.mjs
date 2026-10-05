// Minimal text-to-SVG-path helper for the asset scripts.
//
// librsvg (sharp) cannot load web fonts, so the OG image and the floor plan convert text to outlines
// with this. It reads the WOFF files that ship with @fontsource (TrueType glyf outlines, zlib tables),
// follows cmap -> loca -> glyf, and returns an SVG path string. No kerning (the labels are tracked wide).
import fs from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function readTables(buf) {
  if (buf.toString('latin1', 0, 4) !== 'wOFF') throw new Error('text-path: expected a .woff font file');
  const count = buf.readUInt16BE(12);
  const tables = {};
  for (let i = 0; i < count; i++) {
    const o = 44 + i * 20;
    const tag = buf.toString('latin1', o, o + 4);
    const offset = buf.readUInt32BE(o + 4);
    const compLength = buf.readUInt32BE(o + 8);
    const origLength = buf.readUInt32BE(o + 12);
    const raw = buf.subarray(offset, offset + compLength);
    tables[tag] = compLength < origLength ? zlib.inflateSync(raw) : raw;
  }
  return tables;
}

function readCmap(cmap) {
  const n = cmap.readUInt16BE(2);
  let sub = null;
  for (let i = 0; i < n; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    const encoding = cmap.readUInt16BE(6 + i * 8);
    const offset = cmap.readUInt32BE(8 + i * 8);
    const format = cmap.readUInt16BE(offset);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (unicode && (!sub || format === 12 || (format === 4 && sub.format !== 12))) sub = { offset, format };
  }
  if (!sub) throw new Error('text-path: no usable cmap');
  const map = new Map();
  const o = sub.offset;
  if (sub.format === 4) {
    const segX2 = cmap.readUInt16BE(o + 6);
    const endO = o + 14;
    const startO = endO + segX2 + 2;
    const deltaO = startO + segX2;
    const rangeO = deltaO + segX2;
    for (let s = 0; s < segX2 / 2; s++) {
      const end = cmap.readUInt16BE(endO + s * 2);
      const start = cmap.readUInt16BE(startO + s * 2);
      const delta = cmap.readInt16BE(deltaO + s * 2);
      const range = cmap.readUInt16BE(rangeO + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let gid;
        if (range === 0) gid = (c + delta) & 0xffff;
        else {
          const g = cmap.readUInt16BE(rangeO + s * 2 + range + (c - start) * 2);
          gid = g === 0 ? 0 : (g + delta) & 0xffff;
        }
        if (gid) map.set(c, gid);
      }
    }
  } else if (sub.format === 12) {
    const groups = cmap.readUInt32BE(o + 12);
    for (let g = 0; g < groups; g++) {
      const p = o + 16 + g * 12;
      const start = cmap.readUInt32BE(p);
      const end = cmap.readUInt32BE(p + 4);
      const gid0 = cmap.readUInt32BE(p + 8);
      for (let c = start; c <= end; c++) map.set(c, gid0 + (c - start));
    }
  } else throw new Error(`text-path: unsupported cmap format ${sub.format}`);
  return map;
}

/** Glyph outline as contours of {x, y, on} points, in font units (y up). */
function readGlyph(font, gid, depth = 0) {
  const { glyf, loca, locaLong } = font;
  const start = locaLong ? loca.readUInt32BE(gid * 4) : loca.readUInt16BE(gid * 2) * 2;
  const end = locaLong ? loca.readUInt32BE(gid * 4 + 4) : loca.readUInt16BE(gid * 2 + 2) * 2;
  if (end <= start) return [];
  let p = start;
  const nContours = glyf.readInt16BE(p);
  p += 10;

  if (nContours < 0) {
    if (depth > 4) return [];
    const out = [];
    let more = true;
    while (more) {
      const flags = glyf.readUInt16BE(p);
      const child = glyf.readUInt16BE(p + 2);
      p += 4;
      let dx;
      let dy;
      if (flags & 1) { dx = glyf.readInt16BE(p); dy = glyf.readInt16BE(p + 2); p += 4; }
      else { dx = glyf.readInt8(p); dy = glyf.readInt8(p + 1); p += 2; }
      if (!(flags & 2)) { dx = 0; dy = 0; } // point-matching components are not used by the fonts we ship
      let a = 1; let b = 0; let c = 0; let d = 1;
      const f2 = (o) => glyf.readInt16BE(o) / 16384;
      if (flags & 0x8) { a = d = f2(p); p += 2; }
      else if (flags & 0x40) { a = f2(p); d = f2(p + 2); p += 4; }
      else if (flags & 0x80) { a = f2(p); b = f2(p + 2); c = f2(p + 4); d = f2(p + 6); p += 8; }
      for (const contour of readGlyph(font, child, depth + 1)) {
        out.push(contour.map((pt) => ({ on: pt.on, x: a * pt.x + c * pt.y + dx, y: b * pt.x + d * pt.y + dy })));
      }
      more = (flags & 0x20) !== 0;
    }
    return out;
  }

  const endPts = [];
  for (let i = 0; i < nContours; i++) { endPts.push(glyf.readUInt16BE(p)); p += 2; }
  p += 2 + glyf.readUInt16BE(p); // instructions
  const nPts = nContours ? endPts[nContours - 1] + 1 : 0;
  const flags = [];
  while (flags.length < nPts) {
    const f = glyf.readUInt8(p++);
    flags.push(f);
    if (f & 8) { let r = glyf.readUInt8(p++); while (r-- > 0) flags.push(f); }
  }
  const xs = [];
  const ys = [];
  let v = 0;
  for (let i = 0; i < nPts; i++) {
    const f = flags[i];
    if (f & 2) { const d = glyf.readUInt8(p++); v += f & 16 ? d : -d; }
    else if (!(f & 16)) { v += glyf.readInt16BE(p); p += 2; }
    xs.push(v);
  }
  v = 0;
  for (let i = 0; i < nPts; i++) {
    const f = flags[i];
    if (f & 4) { const d = glyf.readUInt8(p++); v += f & 32 ? d : -d; }
    else if (!(f & 32)) { v += glyf.readInt16BE(p); p += 2; }
    ys.push(v);
  }
  const contours = [];
  let s = 0;
  for (const e of endPts) {
    const pts = [];
    for (let i = s; i <= e; i++) pts.push({ x: xs[i], y: ys[i], on: (flags[i] & 1) === 1 });
    contours.push(pts);
    s = e + 1;
  }
  return contours;
}

const num = (n) => (Math.round(n * 100) / 100).toString();

/** Quadratic contour -> SVG path commands, transformed by (ox + x*k, oy - y*k). */
function contourToPath(pts, ox, oy, k) {
  if (pts.length < 2) return '';
  const X = (p) => ox + p.x * k;
  const Y = (p) => oy - p.y * k;
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true });
  // Start on an on-curve point (synthesise one between two off-curve points if needed).
  let first = pts.findIndex((p) => p.on);
  let ring;
  if (first >= 0) ring = [...pts.slice(first), ...pts.slice(0, first)];
  else ring = [mid(pts[0], pts[pts.length - 1]), ...pts];
  let d = `M${num(X(ring[0]))} ${num(Y(ring[0]))}`;
  let i = 1;
  const n = ring.length;
  while (i <= n) {
    const cur = ring[i % n];
    if (cur.on) {
      d += `L${num(X(cur))} ${num(Y(cur))}`;
      i++;
    } else {
      const next = ring[(i + 1) % n];
      const end = next.on ? next : mid(cur, next);
      d += `Q${num(X(cur))} ${num(Y(cur))} ${num(X(end))} ${num(Y(end))}`;
      i += next.on ? 2 : 1;
    }
  }
  return `${d}Z`;
}

export function loadFont(file) {
  const t = readTables(fs.readFileSync(file));
  const head = t.head;
  const hhea = t.hhea;
  const font = {
    unitsPerEm: head.readUInt16BE(18),
    locaLong: head.readInt16BE(50) === 1,
    ascent: hhea.readInt16BE(4),
    descent: hhea.readInt16BE(6),
    capHeight: t['OS/2'].length >= 90 ? t['OS/2'].readInt16BE(88) : 0,
    glyf: t.glyf,
    loca: t.loca,
    hmtx: t.hmtx,
    numHMetrics: hhea.readUInt16BE(34),
    cmap: readCmap(t.cmap),
    cache: new Map(),
  };
  return font;
}

/** Load a Public Sans weight (400/500/600/700...) from @fontsource. */
export function loadPublicSans(weight = 600) {
  const pkg = require.resolve('@fontsource/public-sans/package.json');
  return loadFont(pkg.replace(/package\.json$/, `files/public-sans-latin-${weight}-normal.woff`));
}

function advanceOf(font, gid) {
  const i = Math.min(gid, font.numHMetrics - 1);
  return font.hmtx.readUInt16BE(i * 4);
}

function glyphOf(font, ch) {
  const gid = font.cmap.get(ch.codePointAt(0));
  if (gid !== undefined) return gid;
  return font.cmap.get(0x20) ?? 0;
}

/** Width in px of a string at `size` px with `tracking` in em (letter-spacing = tracking * size). */
export function measureText(font, text, { size, tracking = 0 }) {
  const k = size / font.unitsPerEm;
  let w = 0;
  const chars = [...text];
  chars.forEach((ch) => { w += advanceOf(font, glyphOf(font, ch)) * k; });
  return w + Math.max(0, chars.length - 1) * tracking * size;
}

/**
 * SVG path (`d`) for `text` with its baseline at (x, y). anchor: 'start' | 'middle' | 'end'.
 * Returns { d, width }.
 */
export function textPath(font, text, { x, y, size, tracking = 0, anchor = 'start' }) {
  const k = size / font.unitsPerEm;
  const width = measureText(font, text, { size, tracking });
  let pen = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  let d = '';
  for (const ch of text) {
    const gid = glyphOf(font, ch);
    let contours = font.cache.get(gid);
    if (!contours) { contours = readGlyph(font, gid); font.cache.set(gid, contours); }
    for (const c of contours) d += contourToPath(c, pen, y, k);
    pen += advanceOf(font, gid) * k + tracking * size;
  }
  return { d, width };
}
