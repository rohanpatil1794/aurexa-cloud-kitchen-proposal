import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils } from 'three';
import { WALL } from '../../data/layout';
import { wallAnim } from '../../lib/wallAnim';
import { useStore } from '../../store';
import { WallRig } from './wallMeshes';

/** Eased damping rate for the dollhouse <-> full-height transition (1/s). */
const LAMBDA = 4;

/**
 * Every wall, opening, glazing panel, frame and zone band, generated from the layout data (walls.ts).
 * This component is the ONLY writer of wallAnim ({h, t}); it does so once per frame, before the other
 * useFrame callbacks (negative priority runs first and does not take over rendering).
 */
export function Walls() {
  const rig = useMemo(() => new WallRig(wallAnim.h), []);
  const invalidate = useThree((s) => s.invalidate);
  const wallMode = useStore((s) => s.wallMode);

  useEffect(() => () => rig.dispose(), [rig]);
  // A demand-driven canvas needs a nudge to start animating.
  useEffect(() => invalidate(), [wallMode, invalidate]);

  useFrame((state, delta) => {
    const { wallMode: mode, reducedMotion } = useStore.getState();
    const target = mode === 'full' ? WALL.height : WALL.dollhouse;
    let h = wallAnim.h;
    if (h !== target) {
      h = reducedMotion ? target : MathUtils.damp(h, target, LAMBDA, Math.min(delta, 0.1));
      if (Math.abs(h - target) < 0.004) h = target;
      wallAnim.h = h;
      wallAnim.t = MathUtils.clamp((h - WALL.dollhouse) / (WALL.height - WALL.dollhouse), 0, 1);
      if (h !== target) state.invalidate();
    }
    if (h !== rig.height) rig.update(h);
  }, -10);

  return <primitive object={rig.group} />;
}
