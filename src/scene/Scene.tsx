// Composes every scene component. Most are filled in by other agents; the imports stay so they only
// have to edit their own files. Each group has its own <Suspense> so one slow part never hides the rest.
//
// The groups mount one per task (see STAGES): building the whole scene in one commit is a 1 s block on a laptop and
// several seconds on a phone, during which the page cannot paint, scroll or take a tap.
import { Suspense, useEffect, useState, type ReactNode } from 'react';
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
 * Mount groups, cheapest first: the shell (light, camera, plinth, floors, walls), the equipment (the heavy one),
 * the entrance and pickup, picking and labels, then the layers. EveningGlow goes last: it collects the lamps
 * from the equipment that is already in the scene.
 */
const STAGES = 5;

/** `onStage` fires after each group is committed (`built` on the last): the shader compile follows along. */
export function Scene({ onStage }: { onStage: (stage: number, built: boolean) => void }) {
  const [stage, setStage] = useState(1);
  useEffect(() => {
    onStage(stage, stage >= STAGES);
    if (stage >= STAGES) return;
    const timer = window.setTimeout(() => setStage((s) => s + 1), 0); // a new task: paint and input can run between groups
    return () => window.clearTimeout(timer);
  }, [stage, onStage]);

  return (
    <>
      <Lighting />
      <CameraRig />
      <Plinth />
      <Floors />
      <Lazy><Walls /><Ceiling /></Lazy>
      {stage >= 2 && <Lazy><Equipment /></Lazy>}
      {stage >= 3 && <Lazy><LogoDoor /><PickupZone /></Lazy>}
      {stage >= 4 && <Lazy><RoomPicking /><Labels /></Lazy>}
      {stage >= 5 && (
        <>
          <Lazy><Flows /><Safety /><Dimensions /><NorthArrow /></Lazy>
          <EveningGlow />
        </>
      )}
    </>
  );
}
