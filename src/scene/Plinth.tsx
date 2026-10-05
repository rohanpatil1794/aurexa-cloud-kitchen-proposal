// The model base: a cream, bevelled slab 3 ft wider than the footprint, extended by one tidy
// notch to carry the pickup apron, with a soft blurred shadow under it (a canvas texture on a
// plane: no extra shadow pass). Top face at y = -0.01 so the floors (y = 0.02) sit just above.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { FOOTPRINT, PICKUP_ZONE, WALL } from '../data/layout';
import { SCENE } from '../lib/palette';

const M = WALL.plinthMargin;
const THICKNESS = 2.2;
const BEVEL = 0.28;
const TOP_Y = -0.01;
const CORNER_R = 1.1;

/** Slab outline in plan (x, z), clockwise from the NW corner: the footprint + margin, plus the pickup apron notch. */
const OUTLINE: [number, number][] = [
  [-M, -M],
  [FOOTPRINT.w + M, -M],
  [FOOTPRINT.w + M, FOOTPRINT.d + M],
  [PICKUP_ZONE.x + PICKUP_ZONE.w + M, FOOTPRINT.d + M],
  [PICKUP_ZONE.x + PICKUP_ZONE.w + M, PICKUP_ZONE.z + PICKUP_ZONE.d + M],
  [PICKUP_ZONE.x - M, PICKUP_ZONE.z + PICKUP_ZONE.d + M],
];

/** Closed rounded polygon (quadratic fillets at every corner, convex or concave). */
function roundedPath(path: THREE.Shape | THREE.Path, pts: [number, number][], r: number, tx: (x: number, z: number) => [number, number]) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const a = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), b = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const ra = Math.min(r, a / 2), rb = Math.min(r, b / 2);
    const [sx, sy] = tx(p1[0] + ((p0[0] - p1[0]) / a) * ra, p1[1] + ((p0[1] - p1[1]) / a) * ra);
    const [ex, ey] = tx(p1[0] + ((p2[0] - p1[0]) / b) * rb, p1[1] + ((p2[1] - p1[1]) / b) * rb);
    const [cx, cy] = tx(p1[0], p1[1]);
    if (i === 0) path.moveTo(sx, sy); else path.lineTo(sx, sy);
    path.quadraticCurveTo(cx, cy, ex, ey);
  }
  path.closePath();
}

function slabGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  roundedPath(shape, OUTLINE, CORNER_R, (x, z) => [x, z]);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: THICKNESS - 2 * BEVEL,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelOffset: -BEVEL,
    bevelSegments: 3,
    curveSegments: 6,
  });
  // Shape (x, y) -> world (x, z); extrusion depth runs downward. Shift so the top face is at TOP_Y.
  geo.rotateX(Math.PI / 2);
  geo.translate(0, TOP_Y - BEVEL, 0);
  return geo;
}

/** Fine warm speckle so the slab reads as honed stone, not flat paint. Tiles every 16 ft. */
function speckleTexture(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const n = 240 + Math.random() * 15 - (Math.random() < 0.04 ? 14 : 0);
    img.data.set([n, n - 1, n - 3, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / 16, 1 / 16);
  tex.anisotropy = 4;
  return tex;
}

const SHADOW_PAD = 16;
const SHADOW_BOUNDS = (() => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of OUTLINE) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return { x: x0 - SHADOW_PAD, z: z0 - SHADOW_PAD, w: x1 - x0 + 2 * SHADOW_PAD, d: z1 - z0 + 2 * SHADOW_PAD };
})();

/** Soft contact shadow: the slab outline, blurred, as alpha. */
function shadowTexture(): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const sx = S / SHADOW_BOUNDS.w, sy = S / SHADOW_BOUNDS.d;
  const path = new THREE.Path();
  roundedPath(path, OUTLINE, CORNER_R, (x, z) => [(x - SHADOW_BOUNDS.x) * sx, (z - SHADOW_BOUNDS.z) * sy]);
  // Draw the outline far off-canvas and let its blurred shadow land on the canvas (works without ctx.filter).
  const OFF = 4000;
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 46;
  ctx.shadowOffsetX = OFF;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  const pts = path.getPoints(8);
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x - OFF, p.y) : ctx.moveTo(p.x - OFF, p.y)));
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Plinth() {
  const geo = useMemo(slabGeometry, []);
  const speckle = useMemo(speckleTexture, []);
  const shadow = useMemo(shadowTexture, []);
  const top = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SCENE.plinth, map: speckle, roughness: 0.88, metalness: 0 }),
    [speckle],
  );
  const edge = useMemo(() => new THREE.MeshStandardMaterial({ color: SCENE.plinthEdge, roughness: 0.82, metalness: 0 }), []);
  const shadowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: shadow, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }),
    [shadow],
  );

  useEffect(() => () => {
    geo.dispose(); speckle.dispose(); shadow.dispose(); top.dispose(); edge.dispose(); shadowMat.dispose();
  }, [geo, speckle, shadow, top, edge, shadowMat]);

  return (
    <group name="plinth">
      {/* ExtrudeGeometry groups: 0 = top + bottom caps, 1 = sides and bevel */}
      <mesh geometry={geo} material={[top, edge]} receiveShadow />
      <mesh
        material={shadowMat}
        position={[SHADOW_BOUNDS.x + SHADOW_BOUNDS.w / 2, TOP_Y - THICKNESS - 0.4, SHADOW_BOUNDS.z + SHADOW_BOUNDS.d / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      >
        <planeGeometry args={[SHADOW_BOUNDS.w, SHADOW_BOUNDS.d]} />
      </mesh>
    </group>
  );
}
