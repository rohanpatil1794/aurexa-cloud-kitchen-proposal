// Floors, generated from ROOMS + CIRCULATION: one merged mesh per floor material (7 draw calls in
// total), world-aligned procedural textures (src/scene/floorTextures.ts), per-vertex colour.
//
//  - Zone rooms (veg / jain / vegan / nonveg / creator) blend their base floor 55% towards the zone colour
//    while store.layers.zones is on; the tint eases in and out when the layer toggles.
//  - A saturated threshold strip lies on the floor just inside each zone room's door, fading with the same layer.
//  - Everything sits at FLOOR_Y, a hair above the plinth top (y = -0.01).
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CIRCULATION, OPENINGS, ROOMS, ROOM_BY_ID, WALL, ZONES } from '../data/layout';
import type { RoomId, ZoneId } from '../data/types';
import { useStore } from '../store';
import { FLOOR_STYLES, floorTexture, type FloorMaterialKind } from './floorTextures';
import { lightState } from './lightState';

/** Height of the floor surface (ft). Other agents: stand things on y = FLOOR_Y, put flat decals at STRIP_Y or above. */
export const FLOOR_Y = 0.02;
/** Threshold strips and other flat decals: just above the floor. */
export const STRIP_Y = FLOOR_Y + 0.012;

const ZONE_MIX = 0.55;
const STRIP_DEPTH = 0.5;
/** Neighbouring floor rectangles overlap by this much so no hairline gap can appear on the shared edge. */
const BLEED = 0.002;
const EVENING_GLOW = new THREE.Color('#ff9a55');

interface Rect { x: number; z: number; w: number; d: number }
interface TintRef { zone: ZoneId; base: string; vertex: number; attr: THREE.BufferAttribute }

const _a = new THREE.Color();
const _b = new THREE.Color();
const _c = new THREE.Color();
/** Mix two sRGB hex colours in sRGB space (what a designer expects from "55% towards the zone colour"), return linear. */
function mixSRGB(out: THREE.Color, base: string, zone: string, k: number): THREE.Color {
  _a.set(base).convertLinearToSRGB();
  _b.set(zone).convertLinearToSRGB();
  return out.copy(_a).lerp(_b, k).convertSRGBToLinear();
}

/** Axis-aligned rectangles -> one indexed BufferGeometry on the XZ plane (normals up, world-aligned UVs). */
function rectGeometry(rects: Rect[], y: number, uvSpan: number, bleed = 0): THREE.BufferGeometry {
  const n = rects.length;
  const pos = new Float32Array(n * 12), nor = new Float32Array(n * 12), uv = new Float32Array(n * 8);
  const idx = new Uint16Array(n * 6);
  rects.forEach((r, i) => {
    const x0 = r.x - bleed, x1 = r.x + r.w + bleed, z0 = r.z - bleed, z1 = r.z + r.d + bleed;
    pos.set([x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1], i * 12); // NW, NE, SE, SW
    nor.set([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], i * 12);
    uv.set([x0, z0, x1, z0, x1, z1, x0, z1].map((v) => v / uvSpan), i * 8);
    const v = i * 4;
    idx.set([v, v + 3, v + 2, v, v + 2, v + 1], i * 6);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 12), 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

/** The strip just inside a zone room's side of a door: door width x 0.5 ft, hard against the wall face. */
function thresholdStrips(): { rect: Rect; zone: ZoneId }[] {
  const out: { rect: Rect; zone: ZoneId }[] = [];
  const half = WALL.thickness / 2;
  for (const o of OPENINGS) {
    if (!o.rooms || o.kind === 'pass' || o.kind === 'ribbon') continue;
    for (const id of o.rooms) {
      const room = ROOM_BY_ID[id as RoomId];
      if (!room?.zone) continue;
      if (o.wall === 'h') {
        const north = Math.abs(room.z + room.d - o.at) < 1e-6; // the door is on the room's south wall
        out.push({ zone: room.zone, rect: { x: o.c - o.w / 2, z: north ? o.at - half - STRIP_DEPTH : o.at + half, w: o.w, d: STRIP_DEPTH } });
      } else {
        const west = Math.abs(room.x + room.w - o.at) < 1e-6; // the door is on the room's east wall
        out.push({ zone: room.zone, rect: { x: west ? o.at - half - STRIP_DEPTH : o.at + half, z: o.c - o.w / 2, w: STRIP_DEPTH, d: o.w } });
      }
    }
  }
  return out;
}

function buildFloors() {
  const spaces: { rect: Rect; kind: FloorMaterialKind; zone?: ZoneId }[] = [
    ...ROOMS.map((r) => ({ rect: r, kind: r.floor as FloorMaterialKind, zone: r.zone })),
    ...CIRCULATION.map((c) => ({ rect: c, kind: 'circulation' as FloorMaterialKind })),
  ];
  const kinds = [...new Set(spaces.map((s) => s.kind))];
  const tints: TintRef[] = [];
  const parts = kinds.map((kind) => {
    const list = spaces.filter((s) => s.kind === kind);
    const style = FLOOR_STYLES[kind];
    const geo = rectGeometry(list.map((s) => s.rect), FLOOR_Y, style.span, BLEED);
    const attr = geo.getAttribute('color') as THREE.BufferAttribute;
    list.forEach((s, i) => {
      _a.set(style.color);
      for (let v = 0; v < 4; v++) attr.setXYZ(i * 4 + v, _a.r, _a.g, _a.b);
      if (s.zone) tints.push({ zone: s.zone, base: style.color, vertex: i * 4, attr });
    });
    const mat = new THREE.MeshStandardMaterial({
      map: floorTexture(kind),
      vertexColors: true,
      roughness: style.roughness,
      metalness: style.metalness,
      emissive: EVENING_GLOW,
      emissiveIntensity: 0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    return { kind, geo, mat };
  });

  const tintAttrs = [...new Set(tints.map((t) => t.attr))];

  const strips = thresholdStrips();
  const stripGeo = rectGeometry(strips.map((s) => s.rect), STRIP_Y, 1);
  const stripAttr = stripGeo.getAttribute('color') as THREE.BufferAttribute;
  strips.forEach((s, i) => {
    _a.set(ZONES[s.zone].color);
    for (let v = 0; v < 4; v++) stripAttr.setXYZ(i * 4 + v, _a.r, _a.g, _a.b);
  });
  const stripMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.5,
    metalness: 0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  return { parts, tints, tintAttrs, stripGeo, stripMat };
}

export function Floors() {
  const floors = useMemo(buildFloors, []);
  // Eased zones-layer value. Starts at the layer's current state so a mount with zones on does not flash neutral.
  const zonesT = useMemo(() => ({ v: -1 }), []);

  useEffect(() => () => {
    floors.parts.forEach((p) => { p.geo.dispose(); p.mat.dispose(); });
    floors.stripGeo.dispose();
    floors.stripMat.dispose();
  }, [floors]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const goal = useStore.getState().layers.zones ? 1 : 0;
    if (zonesT.v !== goal) {
      const snap = zonesT.v < 0 || useStore.getState().reducedMotion || Math.abs(zonesT.v - goal) < 0.002;
      zonesT.v = snap ? goal : THREE.MathUtils.damp(zonesT.v, goal, 6, dt);
      for (const t of floors.tints) {
        mixSRGB(_c, t.base, ZONES[t.zone].color, ZONE_MIX * zonesT.v);
        for (let v = 0; v < 4; v++) t.attr.setXYZ(t.vertex + v, _c.r, _c.g, _c.b);
      }
      for (const attr of floors.tintAttrs) attr.needsUpdate = true;
      floors.stripMat.opacity = zonesT.v;
      floors.stripMat.visible = zonesT.v > 0.004;
    }
    const glow = 0.035 * lightState.evening;
    for (const p of floors.parts) if (p.mat.emissiveIntensity !== glow) p.mat.emissiveIntensity = glow;
  });

  return (
    <group name="floors">
      {floors.parts.map((p) => (
        <mesh key={p.kind} geometry={p.geo} material={p.mat} receiveShadow />
      ))}
      <mesh geometry={floors.stripGeo} material={floors.stripMat} receiveShadow renderOrder={1} />
    </group>
  );
}
