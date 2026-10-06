// Composes every scene component. Most are filled in by other agents; the imports stay so they only
// have to edit their own files. Each group has its own <Suspense> so one slow part never hides the rest.
//
// The groups mount one per task (see BOOT_STAGES): building the whole scene in one commit is a 1 s block on a laptop and
// several seconds on a phone, during which the page cannot paint, scroll or take a tap.
//
// What the hero cannot show waits (the LATE groups): the explorer's picking and labels, the ceiling, the flow ribbons, the
// safety markers, the dimension lines and the evening lamps are all hidden until the visitor enters the space or flips a
// switch, so they mount after the hero is up, one task each, with their shader programs linked and warmed behind the
// frames (BootGate). A visitor who gets there first (enters the space, toggles a layer, goes to eye level, switches to
// Evening) mounts the group he needs on the spot, as the boot used to.
import { Suspense, startTransition, useEffect, useRef, useState, type ReactNode } from 'react';
import { FLOW_LAYERS, useStore, type AppState } from '../store';
import { Lighting } from './Lighting';
import { CameraRig } from './CameraRig';
import { Plinth } from './Plinth';
import { Floors } from './Floors';
import { EveningGlow } from './EveningGlow';
import { Walls } from './building/Walls';
import { Ceiling } from './building/Ceiling';
import { Equipment } from './equipment/Equipment';
import { LogoDoor } from './building/LogoDoor';
import { PickupZone } from './outside/PickupZone';
import { RoomPicking } from './interaction/RoomPicking';
import { Labels } from './layers/Labels';
import { Flows } from './layers/Flows';
import { Safety } from './layers/Safety';
import { Dimensions } from './layers/Dimensions';
import { NorthArrow } from './layers/NorthArrow';

const Lazy = ({ children }: { children: ReactNode }) => <Suspense fallback={null}>{children}</Suspense>;

/**
 * Boot groups, one task each: light + camera, plinth + floors + walls, the equipment (the heavy one), the entrance, pickup
 * and north arrow. Every one of them can be on screen in the hero. The order inside and across them is the order the objects
 * were always created in: three draws opaque objects in material-id order, so coplanar neighbours resolve the way they did.
 */
const BOOT_STAGES = 4;

/** Late groups, in the order the idle chain mounts them (bit i of the "needed" mask = group i). */
const LATE_COUNT = 6;
const L_NAV = 0, L_CEILING = 1, L_FLOWS = 2, L_SAFETY = 3, L_DIMS = 4, L_GLOW = 5;
/**
 * The first late group follows the hero by this long (the hero's intro animation gets the main thread first), the others
 * one task after another, a breath apart: a visitor who reaches for a layer before its group is in mounts it on the spot
 * (see lateNeeds), and the sooner the chain is through the fewer ever do.
 */
const LATE_FIRST_DELAY_MS = 400;
const LATE_GAP_MS = 60;

/** Which late groups something on screen needs right now. */
function lateNeeds(s: AppState): number {
  let m = 0;
  if (s.phase === 'explorer') m |= 1 << L_NAV;
  if (s.wallMode === 'full') m |= 1 << L_CEILING;
  for (let i = 0; i < FLOW_LAYERS.length; i++) if (s.layers[FLOW_LAYERS[i]]) m |= 1 << L_FLOWS;
  if (s.layers.safety) m |= 1 << L_SAFETY;
  if (s.layers.dimensions) m |= 1 << L_DIMS;
  if (s.lighting === 'evening') m |= 1 << L_GLOW;
  return m;
}

const bitCount = (m: number) => {
  let n = 0;
  for (; m; m &= m - 1) n++;
  return n;
};

/**
 * `onStage` fires after each group is committed, boot or late (`epoch` counts them, `built` is true once the boot groups
 * are all in): the shader compile follows along.
 */
export function Scene({ onStage }: { onStage: (epoch: number, built: boolean) => void }) {
  const [stage, setStage] = useState(1);
  const [chain, setChain] = useState(0);
  const ready = useStore((s) => s.sceneReady);
  const need = useStore(lateNeeds);
  // Monotone: a group that has mounted stays (switching a layer off must not tear its geometry down).
  const lateMask = useRef(0);
  lateMask.current |= need | ((1 << chain) - 1);
  const late = lateMask.current;
  const lateCount = bitCount(late);
  const built = stage >= BOOT_STAGES;
  const has = (i: number) => (late & (1 << i)) !== 0;

  useEffect(() => {
    onStage(stage + lateCount, built);
  }, [stage, lateCount, built, onStage]);

  // A new task per group: paint and input can run between groups. As a transition the render is also sliced at component
  // boundaries, so the equipment (its builder, then its meshes and sign atlas) does not run as one block.
  useEffect(() => {
    if (built) return;
    const timer = window.setTimeout(() => startTransition(() => setStage((s) => s + 1)), 0);
    return () => window.clearTimeout(timer);
  }, [stage, built]);

  useEffect(() => {
    if (!ready || chain >= LATE_COUNT) return;
    const timer = window.setTimeout(() => startTransition(() => setChain((c) => c + 1)), chain === 0 ? LATE_FIRST_DELAY_MS : LATE_GAP_MS);
    return () => window.clearTimeout(timer);
  }, [ready, chain]);

  return (
    <>
      <Lighting />
      <CameraRig />
      {stage >= 2 && (
        <>
          <Plinth />
          <Floors />
          <Lazy><Walls /></Lazy>
        </>
      )}
      {stage >= 3 && <Lazy><Equipment /></Lazy>}
      {stage >= 4 && <Lazy><LogoDoor /><PickupZone /><NorthArrow /></Lazy>}
      {has(L_NAV) && <Lazy><RoomPicking /><Labels /></Lazy>}
      {has(L_CEILING) && <Lazy><Ceiling /></Lazy>}
      {has(L_FLOWS) && <Lazy><Flows /></Lazy>}
      {has(L_SAFETY) && <Lazy><Safety /></Lazy>}
      {has(L_DIMS) && <Lazy><Dimensions /></Lazy>}
      {has(L_GLOW) && <EveningGlow />}
    </>
  );
}
