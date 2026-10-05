import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildBatch, disposeBatch, type PrimBuilder, type SignRec } from '../../lib/prims';
import { getTextTexture } from '../../lib/textTexture';

/** Renders a PrimBuilder as instanced meshes (+ its text signs). */
export function PrimBatch({ builder, visible = true }: { builder: PrimBuilder; visible?: boolean }) {
  const group = useMemo(() => buildBatch(builder), [builder]);
  useEffect(() => () => disposeBatch(group), [group]);
  return (
    <group visible={visible}>
      <primitive object={group} />
      <Signs signs={builder.signs} />
    </group>
  );
}

const planeGeo = new THREE.PlaneGeometry(1, 1);

function Sign({ s }: { s: SignRec }) {
  const { position, quaternion, material } = useMemo(() => {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    s.matrix.decompose(position, quaternion, new THREE.Vector3());
    const map = getTextTexture({
      text: s.text, aspect: s.w / s.h, fg: s.fg ?? '#ffffff', bg: s.bg ?? null,
      weight: s.weight, tracking: s.tracking, sub: s.sub,
    });
    const material = new THREE.MeshBasicMaterial({
      map, transparent: true, toneMapped: !s.emissive, side: s.double ? THREE.DoubleSide : THREE.FrontSide,
    });
    return { position, quaternion, material };
  }, [s]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh geometry={planeGeo} material={material} position={position} quaternion={quaternion} scale={[s.w, s.h, 1]} raycast={() => {}} />
  );
}

export function Signs({ signs }: { signs: SignRec[] }) {
  return (
    <>
      {signs.map((s, i) => (
        <Sign key={i} s={s} />
      ))}
    </>
  );
}
