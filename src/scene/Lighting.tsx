// Lighting: a procedural studio environment (a gradient dome plus Lightformer-style emissive panels rendered into a
// small cube, no HDRI), a warm key light from the south-west with soft shadows, a hemisphere fill and a faint
// camera-attached fill at eye level. Day is the default; Evening (store.lighting) lowers the key, cools the ambient,
// deepens the dome and eases between the two (damped, ~1 s).
//
// Everything static is cached: the environment cube renders once (and again while the toggle eases), and the shadow
// map only re-renders when something that casts a shadow actually changes (wall height, equipment layer, the key moving).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { isMobileNow } from '../lib/hooks';
import { wallAnim } from '../lib/wallAnim';
import { lightState, onContextRestored } from './lightState';

/** Everything the toggle animates. `a` = day, `b` = evening. */
const KEY = {
  colorA: new THREE.Color('#fff1dc'), colorB: new THREE.Color('#ffd6b0'),
  intensityA: 2.1, intensityB: 1.3,
  /** Light direction (towards the light) as azimuth from south toward west, and elevation, degrees. */
  azA: 62, azB: 80, elA: 46, elB: 22,
};
const HEMI = {
  skyA: new THREE.Color('#d3e6ea'), skyB: new THREE.Color('#6f82c4'),
  groundA: new THREE.Color('#e9d2ab'), groundB: new THREE.Color('#8f7869'),
  intensityA: 0.42, intensityB: 0.9,
};
/** Eye-level fill: a headlamp. Brings out faces turned away from the key (cabinet fronts, racks) when the camera is low. */
const FILL = { colorA: new THREE.Color('#fff4e6'), colorB: new THREE.Color('#ffe0c0'), intensityA: 0.8, intensityB: 0.6 };
/** Camera height (ft) at which the fill is fully on / fully off. */
const FILL_Y = [16, 42] as const;
const ENV_INTENSITY = { a: 0.45, b: 0.55 };
const EXPOSURE = { a: 0.95, b: 1.0 };

/**
 * The room the model sits in, as seen by every shiny surface: a gradient dome (warm floor bounce below, pale cream at
 * the horizon, cool sky above). Without it the cube is black except for the panels, and large steel faces reflect that
 * black at eye level. Evening: dusk, deep blue overhead, a mauve glow at the horizon.
 */
const DOME = {
  stops: [-1, -0.35, 0, 0.4, 1],
  a: ['#8f7a5e', '#a8946f', '#bab4a6', '#9aa7ab', '#aebcc1'].map((c) => new THREE.Color(c)),
  b: ['#3d3446', '#54475a', '#7a6c92', '#44579a', '#1e2c66'].map((c) => new THREE.Color(c)),
  gainA: 0.85, gainB: 0.75, radius: 80,
};

/** Environment panels (positions are directions from the model; they all face the centre). */
const PANELS: { position: [number, number, number]; scale: [number, number]; a: [string, number]; b: [string, number] }[] = [
  // big soft overhead softbox
  { position: [0, 14, 0], scale: [30, 30], a: ['#fff0da', 2.2], b: ['#9fb0e0', 0.8] },
  // warm key strip, south-west (the glints in stainless)
  { position: [-16, 8, 12], scale: [7, 16], a: ['#ffe8c4', 3.2], b: ['#ffc58a', 2.4] },
  // cool fill strips, east and north
  { position: [18, 6, -2], scale: [5, 18], a: ['#bfe4ee', 1.5], b: ['#7d96c8', 1.4] },
  { position: [0, 5, -18], scale: [24, 4], a: ['#d4eaf2', 1.0], b: ['#6c82b8', 1.0] },
];
const PANEL_COLORS = PANELS.map((p) => ({ a: new THREE.Color(p.a[0]), b: new THREE.Color(p.b[0]) }));

/** Model bounds the shadow camera must cover: plinth + pickup apron, walls, equipment. */
const SHADOW_BOX = new THREE.Box3(new THREE.Vector3(-3, -2.5, -3), new THREE.Vector3(63, 11, 58));
const CENTER = new THREE.Vector3(30, 0, 25);
/** Frames the shadow map is re-rendered for after a change nobody can time exactly (a layer toggled, then React commits). */
const SHADOW_SETTLE_MS = 600;

const _c = new THREE.Color();
const _view = new THREE.Matrix4();
const _v = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _corners = Array.from({ length: 8 }, (_, i) =>
  new THREE.Vector3(
    i & 1 ? SHADOW_BOX.max.x : SHADOW_BOX.min.x,
    i & 2 ? SHADOW_BOX.max.y : SHADOW_BOX.min.y,
    i & 4 ? SHADOW_BOX.max.z : SHADOW_BOX.min.z,
  ),
);

/** Fit the directional light's orthographic shadow camera tightly around the model. */
function fitShadowCamera(light: THREE.DirectionalLight): void {
  light.target.updateMatrixWorld();
  _view.lookAt(light.position, light.target.position, _up).setPosition(light.position).invert();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const c of _corners) {
    _v.copy(c).applyMatrix4(_view);
    minX = Math.min(minX, _v.x); maxX = Math.max(maxX, _v.x);
    minY = Math.min(minY, _v.y); maxY = Math.max(maxY, _v.y);
    minZ = Math.min(minZ, _v.z); maxZ = Math.max(maxZ, _v.z);
  }
  const cam = light.shadow.camera;
  cam.left = minX; cam.right = maxX; cam.bottom = minY; cam.top = maxY;
  cam.near = Math.max(0.5, -maxZ - 2);
  cam.far = -minZ + 2;
  cam.updateProjectionMatrix();
}

function setKeyDirection(light: THREE.DirectionalLight, azDeg: number, elDeg: number): void {
  const az = (azDeg * Math.PI) / 180, el = (elDeg * Math.PI) / 180;
  const d = 130;
  light.position.set(
    CENTER.x - d * Math.cos(el) * Math.sin(az),
    d * Math.sin(el),
    CENTER.z + d * Math.cos(el) * Math.cos(az),
  );
}

const { lerp, smoothstep, clamp } = THREE.MathUtils;

/** The dome's day and evening vertex colours are baked once; `paintDome` only blends them. */
function buildDome() {
  const geo = new THREE.SphereGeometry(DOME.radius, 24, 16);
  const n = geo.getAttribute('position').count;
  const day = new Float32Array(n * 3), eve = new Float32Array(n * 3);
  const { stops } = DOME;
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const y = geo.getAttribute('position').getY(i) / DOME.radius;
    let k = 0;
    while (k < stops.length - 2 && y > stops[k + 1]) k++;
    const t = clamp((y - stops[k]) / (stops[k + 1] - stops[k]), 0, 1);
    c.copy(DOME.a[k]).lerp(DOME.a[k + 1], t).toArray(day, i * 3);
    c.copy(DOME.b[k]).lerp(DOME.b[k + 1], t).toArray(eve, i * 3);
  }
  const colors = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
  geo.setAttribute('color', colors);
  return { geo, day, eve, colors };
}
type Dome = ReturnType<typeof buildDome>;

function paintDome(d: Dome, e: number): void {
  const gain = lerp(DOME.gainA, DOME.gainB, e);
  const out = d.colors.array as Float32Array;
  for (let i = 0; i < out.length; i++) out[i] = lerp(d.day[i], d.eve[i], e) * gain;
  d.colors.needsUpdate = true;
}

const envIntensity = (e: number) => lerp(ENV_INTENSITY.a, ENV_INTENSITY.b, e);

const panelColor = (out: THREE.Color, i: number, e: number) =>
  out.copy(PANEL_COLORS[i].a).lerp(PANEL_COLORS[i].b, e).multiplyScalar(lerp(PANELS[i].a[1], PANELS[i].b[1], e));

export function Lighting() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const lighting = useStore((s) => s.lighting);
  const initial = useRef(useStore.getState().lighting === 'evening' ? 1 : 0).current;

  const key = useMemo(() => {
    const l = new THREE.DirectionalLight('#ffffff', 1);
    l.castShadow = true; // before the first compile: the shadow-casting light count is part of every program's key
    // The shadow map is cached: it renders when `needsUpdate` is set (see the frame loop), never every frame.
    l.shadow.autoUpdate = false;
    l.shadow.needsUpdate = true;
    return l;
  }, []);
  const fill = useMemo(() => new THREE.DirectionalLight('#ffffff', 0), []);
  const dome = useMemo(() => {
    const d = buildDome();
    paintDome(d, initial);
    return d;
  }, [initial]);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const panels = useRef<(THREE.Mesh | null)[]>([]);
  const t = useRef({ v: initial, dirty: true, hold: 0, wallH: NaN, shadowUntil: performance.now() + SHADOW_SETTLE_MS });
  // While the toggle is easing, the (tiny) environment cube re-renders every frame; otherwise it is static.
  const [envFrames, setEnvFrames] = useState(1);

  // Shadow quality: 2048 desktop / 1024 mobile. Fixed, so a quality flip never rebuilds the render target.
  const mapSize = useMemo(() => (isMobileNow() ? 1024 : 2048), []);
  useEffect(() => {
    const sh = key.shadow;
    sh.mapSize.set(mapSize, mapSize);
    sh.map?.dispose();
    sh.map = null;
    sh.needsUpdate = true;
    // ~1 texel of normal offset removes acne on the 0.5 ft walls without detaching their shadows.
    sh.bias = -0.0004;
    sh.normalBias = 0.05;
    key.target.position.copy(CENTER);
    key.target.updateMatrixWorld();
  }, [key, mapSize]);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
  }, [gl]);

  // <Environment> writes scene.environmentIntensity = 1 (its default) whenever it re-renders, and as its child it does
  // so before this runs: put the eased value back.
  useLayoutEffect(() => {
    scene.environmentIntensity = envIntensity(t.current.v);
  });

  useEffect(() => {
    t.current.dirty = true;
    setEnvFrames(Infinity);
  }, [lighting]);

  // The caster set changes when the Equipment layer is toggled (React commits a frame or two later), and a lost
  // context empties the cached shadow map and environment cube.
  useEffect(() => {
    const offStore = useStore.subscribe((s, prev) => {
      if (s.layers.equipment !== prev.layers.equipment) t.current.shadowUntil = performance.now() + SHADOW_SETTLE_MS;
    });
    const offContext = onContextRestored(() => {
      t.current.shadowUntil = performance.now() + SHADOW_SETTLE_MS;
      t.current.dirty = true;
      t.current.hold = 3; // frames the cube keeps drawing: React has to commit the new `frames` first
      setEnvFrames(Infinity);
    });
    return () => { offStore(); offContext(); };
  }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const goal = useStore.getState().lighting === 'evening' ? 1 : 0;
    const s = t.current;
    let casters = performance.now() < s.shadowUntil;
    if (wallAnim.h !== s.wallH) {
      s.wallH = wallAnim.h;
      casters = true;
    }
    if (s.v !== goal) {
      s.v = useStore.getState().reducedMotion || Math.abs(s.v - goal) < 0.002 ? goal : THREE.MathUtils.damp(s.v, goal, 2.6, dt);
      s.dirty = true;
    }
    lightState.evening = s.v;

    // Eye-level fill follows the camera while it is low; off (and free) from the aerial poses.
    const cam = state.camera;
    const w = 1 - smoothstep(cam.position.y, FILL_Y[0], FILL_Y[1]);
    fill.intensity = w * lerp(FILL.intensityA, FILL.intensityB, s.v);
    if (w > 0) {
      fill.position.copy(cam.position);
      cam.getWorldDirection(_v);
      fill.target.position.copy(cam.position).add(_v);
    }

    if (s.dirty) {
      const e = s.v;
      _c.copy(KEY.colorA).lerp(KEY.colorB, e);
      key.color.copy(_c);
      key.intensity = lerp(KEY.intensityA, KEY.intensityB, e);
      setKeyDirection(key, lerp(KEY.azA, KEY.azB, e), lerp(KEY.elA, KEY.elB, e));
      fitShadowCamera(key);
      casters = true; // the key moved

      fill.color.copy(FILL.colorA).lerp(FILL.colorB, e);
      const h = hemi.current;
      if (h) {
        h.color.copy(HEMI.skyA).lerp(HEMI.skyB, e);
        h.groundColor.copy(HEMI.groundA).lerp(HEMI.groundB, e);
        h.intensity = lerp(HEMI.intensityA, HEMI.intensityB, e);
      }
      for (let i = 0; i < PANELS.length; i++) {
        const m = panels.current[i]?.material as THREE.MeshBasicMaterial | undefined;
        if (m) panelColor(m.color, i, e);
      }
      paintDome(dome, e);

      scene.environmentIntensity = envIntensity(e);
      gl.toneMappingExposure = lerp(EXPOSURE.a, EXPOSURE.b, e);

      if (e === goal) {
        if (s.hold > 0) s.hold--;
        else {
          s.dirty = false;
          setEnvFrames(1); // settle: render the environment once more with the final colours
        }
      }
    }
    if (casters) key.shadow.needsUpdate = true;
  });

  const initColors = useMemo(() => PANELS.map((_, i) => panelColor(new THREE.Color(), i, initial)), [initial]);

  return (
    <>
      <primitive object={key} />
      <primitive object={key.target} />
      <primitive object={fill} />
      <primitive object={fill.target} />
      <hemisphereLight ref={hemi} args={['#d3e6ea', '#e9d2ab', HEMI.intensityA]} />
      <Environment resolution={256} frames={envFrames}>
        <mesh geometry={dome.geo}>
          <meshBasicMaterial vertexColors side={THREE.BackSide} toneMapped={false} depthWrite={false} />
        </mesh>
        {PANELS.map((p, i) => (
          <mesh
            key={i}
            ref={(m) => { panels.current[i] = m; }}
            position={p.position}
            scale={[p.scale[0], p.scale[1], 1]}
            onUpdate={(self) => self.lookAt(0, 0, 0)}
          >
            <planeGeometry />
            <meshBasicMaterial color={initColors[i]} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </Environment>
    </>
  );
}
