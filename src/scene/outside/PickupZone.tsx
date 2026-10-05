// Delivery Partners Pickup Zone (south-west apron, in front of Dispatch and Rider): a dashed painted
// outline, the "PICKUP" ground decal, a slim cantilevered canopy over the doors and three parked
// delivery scooters. The Waste service step / bollards and the EXIT ground marker live here too.
// Scooters are dressing (they follow the Equipment layer); everything else is architecture.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { BRAND } from '../../lib/palette';
import { PrimBuilder } from '../../lib/prims';
import { useStore } from '../../store';
import { PrimBatch } from '../equipment/PrimBatch';
import { PAINT_ORANGE, PAINT_Y, ZONE_RECT, dashedRectGeometry, decalMaterial, type Decal } from './pickupPaint';
import { scooter, type ScooterStyle } from './pickupScooter';
import { CANOPY_DECK, canopy, exitMarker, serviceStep } from './pickupStructure';

/** The decals sit between the first and second scooter bay, in front of the Dispatch emergency exit and double door. */
const DECAL_X = 8.5;
const DECALS: Decal[] = [
  { text: 'DELIVERY PARTNERS', w: 7.4, h: 0.78, x: DECAL_X, z: 52.6, tracking: 0.3 },
  { text: 'PICKUP', w: 9, h: 2.5, x: DECAL_X, z: 53.55, tracking: 0.26 },
];

/**
 * Parked scooters, nose out (heading 0 = south), a few degrees off square. Each stands in a gap between the
 * Dispatch / Rider doors (door spans: x 2.5-5.5, 8.5-12.5, 16.5-19.5), so the 3 ft in front of every door stays clear.
 */
const SCOOTERS: { x: number; z: number; ry: number; style: ScooterStyle }[] = [
  { x: 1.3, z: 53, ry: 7, style: { body: BRAND.teal, box: BRAND.teal, band: BRAND.cream } },
  { x: 14.6, z: 53, ry: -9, style: { body: '#c35a26', box: '#c35a26', band: BRAND.cream } },
  { x: 20.7, z: 53, ry: -6, style: { body: '#efe0c0', box: '#20282b', band: '#c35a26' } },
];

function makeParts() {
  const structure = new PrimBuilder();
  canopy(structure);
  serviceStep(structure);
  exitMarker(structure);
  const scooters = new PrimBuilder();
  for (const s of SCOOTERS) scooters.frame({ x: s.x, z: s.z, ry: s.ry }, () => scooter(scooters, s.style));
  return {
    structure,
    scooters,
    dash: dashedRectGeometry(ZONE_RECT),
    dashMat: new THREE.MeshStandardMaterial({ color: PAINT_ORANGE, roughness: 0.85, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    decalMats: DECALS.map(decalMaterial),
    deckMat: new THREE.MeshStandardMaterial({ color: '#d4ebe8', roughness: 0.15, transparent: true, opacity: 0.18, depthWrite: false }),
  };
}

export function PickupZone() {
  const showScooters = useStore((s) => s.layers.equipment);
  const p = useMemo(makeParts, []);
  useEffect(
    () => () => {
      p.dash.dispose();
      p.dashMat.dispose();
      p.decalMats.forEach((m) => m.dispose());
      p.deckMat.dispose();
    },
    [p],
  );

  return (
    <group name="pickup-zone">
      <mesh geometry={p.dash} material={p.dashMat} position={[0, PAINT_Y, 0]} receiveShadow />
      {DECALS.map((d, i) => (
        <mesh key={d.text} material={p.decalMats[i]} position={[d.x, PAINT_Y + 0.005, d.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[d.w, d.h]} />
        </mesh>
      ))}
      <mesh material={p.deckMat} position={[CANOPY_DECK.x, CANOPY_DECK.y, CANOPY_DECK.z]} renderOrder={2}>
        <boxGeometry args={[CANOPY_DECK.w, CANOPY_DECK.h, CANOPY_DECK.d]} />
      </mesh>
      <PrimBatch builder={p.structure} />
      <PrimBatch builder={p.scooters} visible={showScooters} />
    </group>
  );
}
