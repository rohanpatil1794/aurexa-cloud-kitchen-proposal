// Composes every scene component. Most are filled in by other agents; the imports stay so they only
// have to edit their own files. Each group has its own <Suspense> so one slow part never hides the rest.
import { Suspense, type ReactNode } from 'react';
import { Lighting } from './Lighting';
import { CameraRig } from './CameraRig';
import { Plinth } from './Plinth';
import { Floors } from './Floors';
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

export function Scene() {
  return (
    <>
      <Lighting />
      <CameraRig />
      <Plinth />
      <Floors />
      <Lazy><Walls /><Ceiling /></Lazy>
      <Lazy><Equipment /></Lazy>
      <Lazy><LogoDoor /><PickupZone /></Lazy>
      <Lazy><RoomPicking /><Labels /></Lazy>
      <Lazy><Flows /><Safety /><Dimensions /><NorthArrow /></Lazy>
    </>
  );
}
