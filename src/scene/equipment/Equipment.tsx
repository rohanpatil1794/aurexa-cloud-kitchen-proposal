import { useMemo } from 'react';
import { EQUIPMENT } from '../../data/equipment';
import { PrimBuilder } from '../../lib/prims';
import { useStore } from '../../store';
import { PrimBatch } from './PrimBatch';
import { buildItems } from './registry';
import './kinds'; // registers every kind builder

/** All data-driven equipment + room dressing, as a few instanced meshes. Toggled by the Equipment layer. */
export function Equipment() {
  const visible = useStore((s) => s.layers.equipment);
  const builder = useMemo(() => {
    const b = new PrimBuilder();
    buildItems(b, EQUIPMENT);
    return b;
  }, []);
  return <PrimBatch builder={builder} visible={visible} />;
}
