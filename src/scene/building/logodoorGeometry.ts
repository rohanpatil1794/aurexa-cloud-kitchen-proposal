// Geometry for the Staff Entrance "logo door" (see brand-src/logo-light.png): a chunky, slightly
// irregular cream surround, a teal leaf with a half-round fan-light, and a terracotta step and pot.
//
// Local frame: origin on the south wall's centre line at the door centre, +x east, +z outside (south),
// +y up. The wall model leaves the 3 x 7 ft opening completely open and frameless; everything here
// lives in the opening or just outside it.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { STAFF_ENTRANCE, WALL } from '../../data/layout';
import { rng } from '../equipment/rng';

export const SPEC = {
  halfW: STAFF_ENTRANCE.w / 2,
  openH: STAFF_ENTRANCE.h,
  /** z of the outside wall face (the inside face is at -face). */
  face: WALL.outer / 2,
  /** Cream reveal lining the sides and head of the opening. */
  reveal: 0.08,
  /** Surround: jamb width outside the reveal, top of the head band, depth proud of the wall. */
  jamb: 0.58,
  headTop: 7.5,
  surroundD: 0.3,
  step: { w: 4.3, h: 0.16, d: 0.66 },
  cornice: { w: 4.5, h: 0.3, d: 0.44 },
  /**
   * Door leaf, hinged on the east side (as seen from outside) and ajar `angle` degrees inward. The leaf is modelled with
   * the hinge on its local x = 0, so it hangs from a group turned (180 - angle) degrees: the free edge, and the knob on it,
   * then sit on the west side, in plain view from the south-east Entrance camera.
   */
  leaf: { w: 2.76, y0: 0.2, y1: 6.9, t: 0.14, hingeX: 1.4, hingeZ: -0.04, angle: 16 },
  /** Fan-light: half-disc of radius r on a flat base, centred on the leaf (leaf-local coordinates). */
  fan: { cx: 1.38, base: 5.2, r: 1.08 },
} as const;

/** Bracket lamp on the east jamb: lantern centre x, height of the bracket arm, z. */
export const LAMP = { x: 2.45, y: 6, z: SPEC.face + SPEC.surroundD / 2 } as const;

/** Pot centre (local plan coordinates): beside the surround, inside the plinth margin. */
export const POT = { x: -2.55, z: SPEC.face + 0.58 } as const;

/**
 * The cream surround: an inverted U (two jambs and a head) cut from one wobbly outline and extruded with a
 * soft bevel, like the clay-modelled frame in the logo. Material groups: 0 = front face (cream),
 * 1 = sides and bevel (the warmer sand edge). Spans z 0 .. surroundD.
 */
export function surroundGeometry(): THREE.BufferGeometry {
  const rand = rng(7);
  const { halfW, reveal, jamb, headTop, surroundD } = SPEC;
  const iw = halfW - reveal;
  const ow = iw + jamb;
  const ih = SPEC.openH - reveal;
  const foot = 0.1; // sunk into the step so the wobble never shows a gap
  const corners: [number, number][] = [
    [-ow, foot], [-iw, foot], [-iw, ih], [iw, ih], [iw, foot], [ow, foot], [ow, headTop], [-ow, headTop],
  ];
  const wobble = 0.02;
  const shape = new THREE.Shape();
  let first = true;
  corners.forEach(([x0, y0], i) => {
    const [x1, y1] = corners[(i + 1) % corners.length];
    const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const x = x0 + (x1 - x0) * t + (rand() - 0.5) * 2 * wobble;
      const y = y0 + (y1 - y0) * t;
      const yy = y <= foot + 1e-6 ? y : y + (rand() - 0.5) * 2 * wobble;
      if (first) shape.moveTo(x, yy);
      else shape.lineTo(x, yy);
      first = false;
    }
  });
  shape.closePath();
  const bt = 0.05;
  const bs = 0.045;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: surroundD - 2 * bt,
    bevelEnabled: true,
    bevelThickness: bt,
    bevelSize: bs,
    bevelOffset: -bs,
    bevelSegments: 3,
    curveSegments: 1,
  });
  geo.translate(0, 0, bt);
  return geo;
}

export const corniceGeometry = () => new RoundedBoxGeometry(SPEC.cornice.w, SPEC.cornice.h, SPEC.cornice.d, 3, 0.07);
export const stepGeometry = () => new RoundedBoxGeometry(SPEC.step.w, SPEC.step.h, SPEC.step.d, 3, 0.05);

/** Half-disc of radius r on the x axis (flat side down), as a closed shape. */
function fanShape(r: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.absarc(0, 0, r, Math.PI, 0, true);
  s.closePath();
  return s;
}

/** Leaf slab with the half-round fan-light cut out. Leaf-local frame: hinge on x = 0, spans z -t/2 .. t/2. */
export function leafGeometry(): THREE.BufferGeometry {
  const { w, y0, y1, t } = SPEC.leaf;
  const { cx, base, r } = SPEC.fan;
  const shape = new THREE.Shape();
  shape.moveTo(0, y0);
  shape.lineTo(w, y0);
  shape.lineTo(w, y1);
  shape.lineTo(0, y1);
  shape.closePath();
  shape.holes.push(new THREE.Path(fanShape(r).getPoints(28).map((p) => p.add(new THREE.Vector2(cx, base)))));
  const b = 0.014;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: t - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: -b,
    bevelSegments: 1,
    curveSegments: 1,
  });
  geo.translate(0, 0, b - t / 2);
  return geo;
}

/** The fan-light pane, in the leaf's mid-plane (leaf-local). */
export function fanGlassGeometry(): THREE.BufferGeometry {
  const { cx, base, r } = SPEC.fan;
  const geo = new THREE.ShapeGeometry(fanShape(r), 28);
  geo.translate(cx, base, 0);
  return geo;
}

/** Terracotta pot: a lathed profile with a rolled lip. Base on y = 0, soil level y = 0.97. */
export function potGeometry(): THREE.BufferGeometry {
  const profile: [number, number][] = [
    [0, 0], [0.3, 0], [0.33, 0.05], [0.45, 0.9], [0.46, 0.96], [0.55, 0.99],
    [0.55, 1.15], [0.5, 1.15], [0.45, 1.1], [0.42, 0.97], [0, 0.97],
  ];
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32);
}

/** Soft radial glow sprite (additive halo behind lamps and the fan-light). */
export function glowTexture(): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.4)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
