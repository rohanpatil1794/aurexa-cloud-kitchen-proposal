// The Staff Entrance as THE LOGO DOOR (brand-src/logo-light.png): deep teal leaf with raised panels
// and a half-round fan-light, a chunky cream surround, brass knob, terracotta step and a potted plant.
// The wall model leaves the opening frameless; this component fills it. It deliberately stands proud
// of the 3.5 ft dollhouse walls (the frame is 7.8 ft) and sits in front of the wall in full-height mode.
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STAFF_ENTRANCE } from '../../data/layout';
import { lightState } from '../lightState';
import { PrimBatch } from '../equipment/PrimBatch';
import { buildDoorDetail, DOOR_COLORS as C } from './logodoorDetail';
import {
  LAMP, POT, SPEC, corniceGeometry, fanGlassGeometry, glowTexture, leafGeometry, potGeometry, stepGeometry, surroundGeometry,
} from './logodoorGeometry';

const DEG = Math.PI / 180;

/** Halo opacity by lighting: [day, evening]. */
const HALO = { fan: [0.06, 0.5], lamp: [0.1, 0.75] } as const;
const lerp = THREE.MathUtils.lerp;

function makeParts() {
  const std = (color: string, roughness: number) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const glow = glowTexture();
  const halo = (color: string) =>
    new THREE.MeshBasicMaterial({
      map: glow, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
  return {
    geo: {
      surround: surroundGeometry(),
      cornice: corniceGeometry(),
      step: stepGeometry(),
      leaf: leafGeometry(),
      glass: fanGlassGeometry(),
      pot: potGeometry(),
    },
    mat: {
      cream: std(C.cream, 0.78),
      sand: std(C.sand, 0.8),
      terracotta: std(C.terracotta, 0.85),
      // a little self-lit teal keeps the leaf from going black in the recess and in the evening
      teal: new THREE.MeshStandardMaterial({ color: C.teal, roughness: 0.45, metalness: 0.05, emissive: '#0f4a48', emissiveIntensity: 0.5 }),
      glass: new THREE.MeshBasicMaterial({ color: '#f1d79e', side: THREE.DoubleSide, toneMapped: false }),
      fanHalo: halo('#ffc982'),
      lampHalo: halo('#ffb870'),
    },
    glow,
    detail: buildDoorDetail(),
  };
}

export function LogoDoor() {
  const p = useMemo(makeParts, []);
  useEffect(
    () => () => {
      Object.values(p.geo).forEach((g) => g.dispose());
      Object.values(p.mat).forEach((m) => m.dispose());
      p.glow.dispose();
    },
    [p],
  );

  // The halos warm up with the Day / Evening toggle.
  useFrame(() => {
    const e = lightState.evening;
    p.mat.fanHalo.opacity = lerp(HALO.fan[0], HALO.fan[1], e);
    p.mat.lampHalo.opacity = lerp(HALO.lamp[0], HALO.lamp[1], e);
  });

  const { face, leaf, fan, cornice, step, headTop, surroundD } = SPEC;
  return (
    <group name="logo-door" position={[STAFF_ENTRANCE.x, 0, STAFF_ENTRANCE.z]}>
      <mesh geometry={p.geo.surround} material={[p.mat.cream, p.mat.sand]} position={[0, 0, face]} castShadow receiveShadow />
      <mesh
        geometry={p.geo.cornice}
        material={p.mat.cream}
        position={[0, headTop + cornice.h / 2 - 0.02, face + cornice.d / 2]}
        rotation={[0, 0, 0.35 * DEG]}
        castShadow
        receiveShadow
      />
      <mesh geometry={p.geo.step} material={p.mat.terracotta} position={[0, step.h / 2, face + step.d / 2 - 0.02]} castShadow receiveShadow />
      <mesh geometry={p.geo.pot} material={p.mat.terracotta} position={[POT.x, 0, POT.z]} castShadow receiveShadow />

      {/* the leaf, hinged on the east jamb and standing ajar, swung inward (see SPEC.leaf) */}
      <group position={[leaf.hingeX, 0, leaf.hingeZ]} rotation={[0, (180 - leaf.angle) * DEG, 0]}>
        <mesh geometry={p.geo.leaf} material={p.mat.teal} castShadow receiveShadow />
        <mesh geometry={p.geo.glass} material={p.mat.glass} />
      </group>

      <PrimBatch builder={p.detail} />

      {/* halos: outward-facing glow sprites around the fan-light and the lamp */}
      <mesh material={p.mat.fanHalo} position={[0, fan.base + 0.35, face + surroundD + 0.03]} renderOrder={4}>
        <planeGeometry args={[4.2, 3.2]} />
      </mesh>
      <mesh material={p.mat.lampHalo} position={[LAMP.x, LAMP.y - 0.15, face + surroundD + 0.03]} renderOrder={4}>
        <planeGeometry args={[1.6, 1.6]} />
      </mesh>
    </group>
  );
}
