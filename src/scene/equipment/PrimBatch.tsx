import { useEffect, useMemo } from 'react';
import { buildBatch, disposeBatch, type PrimBuilder } from '../../lib/prims';
import { onTextFontLoaded } from '../../lib/textTexture';
import { buildSignMeshes } from './signAtlas';

/** Renders a PrimBuilder as instanced meshes plus its text signs (packed into a texture atlas, see signAtlas.ts). */
export function PrimBatch({ builder, visible = true }: { builder: PrimBuilder; visible?: boolean }) {
  const group = useMemo(() => buildBatch(builder), [builder]);
  const signs = useMemo(() => buildSignMeshes(builder.signs), [builder]);
  useEffect(() => () => disposeBatch(group), [group]);
  useEffect(() => onTextFontLoaded(signs.redraw), [signs]);
  useEffect(() => () => signs.dispose(), [signs]);
  return (
    <group visible={visible}>
      <primitive object={group} />
      <primitive object={signs.group} />
    </group>
  );
}
