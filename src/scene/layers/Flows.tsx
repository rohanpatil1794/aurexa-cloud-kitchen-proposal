// The four workflow layers (store.layers.raw / staff / dirty / orders): flat ribbons with arrowheads that travel
// along the routes in src/data/flows.ts.
//
//  - one merged mesh and one unlit material per flow (4 draw calls); geometry from flowsGeometry.ts, arrow texture
//    from flowsTexture.ts, scrolled by ONE shared phase so the speed is constant in ft/s
//  - each layer fades in and out on its own; the animation holds still for prefers-reduced-motion
//  - seen steeply from above, a faint x-ray copy shows the routes hidden behind walls and overhead equipment
//  - ribbons never take part in picking (raycast disabled), so rooms stay clickable underneath them
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FLOWS, FLOW_RIBBON } from '../../data/flows';
import type { FlowId } from '../../data/types';
import { useStore } from '../../store';
import { wallAnim } from '../../lib/wallAnim';
import { flowRibbons, ribbonBuffers } from './flowsGeometry';
import { FLOW_REPEAT, flowTexture } from './flowsTexture';

/** Height of the ribbons above the plinth, ft. */
const RIBBON_Y = 0.2;
/** Above the floor decals (renderOrder 1) and the glass (2). */
const RENDER_ORDER = 3;
const FADE_LENGTH = 1.4;
const EASE = 6;
/** Looking-down angles (rad) over which the see-through copy fades in. */
const XRAY_PITCH = [0.56, 0.8] as const;
/** Opacity of the see-through copy (dollhouse walls .. full-height walls, which hide more). */
const XRAY_OPACITY = { low: 0.62, high: 0.8 } as const;

const noRaycast = () => {};
const smoothstep = THREE.MathUtils.smoothstep;
const _look = new THREE.Vector3();

interface FlowDraw {
  id: FlowId;
  main: THREE.Mesh;
  xray: THREE.Mesh;
  mainMaterial: THREE.MeshBasicMaterial;
  xrayMaterial: THREE.MeshBasicMaterial;
  texture: THREE.DataTexture;
  geometry: THREE.BufferGeometry;
  /** Eased layer visibility 0..1. */
  t: number;
}

function buildFlows(): FlowDraw[] {
  const { width, radius } = FLOW_RIBBON;
  return FLOWS.map((flow) => {
    const buffers = ribbonBuffers(flowRibbons(flow.paths, { width, radius, fade: FADE_LENGTH }), width, FLOW_REPEAT, RIBBON_Y);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(buffers.position, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(buffers.uv, 2));
    geometry.setAttribute('color', new THREE.BufferAttribute(buffers.color, 4));
    geometry.setIndex(new THREE.BufferAttribute(buffers.index, 1));
    geometry.computeBoundingSphere();

    const texture = flowTexture(flow.color);
    const material = (xray: boolean) =>
      new THREE.MeshBasicMaterial({
        map: texture,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: !xray,
        toneMapped: false,
      });
    const mainMaterial = material(false);
    const xrayMaterial = material(true);

    const mesh = (m: THREE.Material, order: number) => {
      const o = new THREE.Mesh(geometry, m);
      o.name = `flow-${flow.id}`;
      o.renderOrder = order;
      o.visible = false;
      o.frustumCulled = false;
      o.raycast = noRaycast;
      return o;
    };
    return {
      id: flow.id, geometry, texture, mainMaterial, xrayMaterial, t: 0,
      main: mesh(mainMaterial, RENDER_ORDER),
      xray: mesh(xrayMaterial, RENDER_ORDER),
    };
  });
}

export function Flows() {
  const flows = useMemo(buildFlows, []);
  // Shared animation state (not React state: nothing re-renders).
  const anim = useMemo(() => ({ phase: 0, xray: 0 }), []);

  useEffect(() => () => {
    for (const f of flows) {
      f.geometry.dispose();
      f.texture.dispose();
      f.mainMaterial.dispose();
      f.xrayMaterial.dispose();
    }
  }, [flows]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const { layers, reducedMotion, stageVisible } = useStore.getState();

    // x-ray copy: only while looking steeply down (aerial, plan, room overview), never at eye level
    state.camera.getWorldDirection(_look);
    const xrayGoal = smoothstep(Math.asin(THREE.MathUtils.clamp(-_look.y, -1, 1)), XRAY_PITCH[0], XRAY_PITCH[1]);
    anim.xray = reducedMotion ? xrayGoal : THREE.MathUtils.damp(anim.xray, xrayGoal, 5, dt);

    const xrayOpacity = XRAY_OPACITY.low + (XRAY_OPACITY.high - XRAY_OPACITY.low) * wallAnim.t;
    let anyVisible = false;
    for (const f of flows) {
      const goal = layers[f.id] ? 1 : 0;
      if (f.t !== goal) f.t = reducedMotion || Math.abs(f.t - goal) < 0.003 ? goal : THREE.MathUtils.damp(f.t, goal, EASE, dt);
      const on = f.t > 0;
      f.main.visible = on;
      const xray = on ? f.t * anim.xray * xrayOpacity : 0;
      f.xray.visible = xray > 0.004;
      f.mainMaterial.opacity = f.t;
      f.xrayMaterial.opacity = xray;
      anyVisible ||= on;
    }
    if (!anyVisible) return;

    if (stageVisible && !reducedMotion) anim.phase = (anim.phase + (dt * FLOW_RIBBON.speed) / FLOW_REPEAT) % 1;
    // features travel towards +u (along the point order) when the offset falls
    for (const f of flows) f.texture.offset.x = -anim.phase;
  });

  return (
    <group name="flows">
      {flows.map((f) => (
        <group key={f.id}>
          <primitive object={f.main} />
          <primitive object={f.xray} />
        </group>
      ))}
    </group>
  );
}
