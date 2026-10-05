// Lighting: a procedural studio environment (Lightformer-style emissive panels rendered into a small cube, no HDRI),
// a warm key light from the south-west with soft shadows, and a hemisphere fill. Day is the default; Evening
// (store.lighting) lowers and warms the key, deepens the environment and eases between the two (damped, ~1 s).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { isMobileNow } from '../lib/hooks';
import { lightState } from './lightState';

/** Everything the toggle animates. `a` = day, `b` = evening. */
const KEY = {
  colorA: new THREE.Color('#fff1dc'), colorB: new THREE.Color('#ffcf9e'),
  intensityA: 2.1, intensityB: 1.45,
  /** Light direction (towards the light) as azimuth from south toward west, and elevation, degrees. */
  azA: 62, azB: 78, elA: 46, elB: 20,
};
const HEMI = {
  skyA: new THREE.Color('#d3e6ea'), skyB: new THREE.Color('#6a7fb0'),
  groundA: new THREE.Color('#e9d2ab'), groundB: new THREE.Color('#9a7a5e'),
  intensityA: 0.42, intensityB: 0.8,
};
const ENV_INTENSITY = { a: 0.5, b: 0.42 };
const EXPOSURE = { a: 0.95, b: 1.02 };

/** Environment panels (positions are directions from the model; they all face the centre). */
const PANELS: { position: [number, number, number]; scale: [number, number]; a: [string, number]; b: [string, number] }[] = [
  // big soft overhead softbox
  { position: [0, 14, 0], scale: [30, 30], a: ['#fff0da', 2.4], b: ['#c9a487', 0.9] },
  // warm key strip, south-west (the glints in stainless)
  { position: [-16, 8, 12], scale: [7, 16], a: ['#ffe8c4', 3.2], b: ['#ffc58a', 2.2] },
  // cool fill strips, east and north
  { position: [18, 6, -2], scale: [5, 18], a: ['#bfe4ee', 1.5], b: ['#7d96c8', 1.6] },
  { position: [0, 5, -18], scale: [24, 4], a: ['#d4eaf2', 1.0], b: ['#6c82b8', 1.1] },
  // teal-ish bounce off the ground, low in front
  { position: [6, -3, 16], scale: [22, 7], a: ['#5f9392', 0.9], b: ['#2a5a63', 0.5] },
];
const PANEL_COLORS = PANELS.map((p) => ({ a: new THREE.Color(p.a[0]), b: new THREE.Color(p.b[0]) }));
const ENV_FLOOR = { a: new THREE.Color('#1b292b'), b: new THREE.Color('#10151f') };

/** Model bounds the shadow camera must cover: plinth + pickup apron, walls, equipment. */
const SHADOW_BOX = new THREE.Box3(new THREE.Vector3(-3, -2.5, -3), new THREE.Vector3(63, 11, 58));
const CENTER = new THREE.Vector3(30, 0, 25);

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

const lerp = THREE.MathUtils.lerp;

export function Lighting() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const quality = useStore((s) => s.quality);
  const lighting = useStore((s) => s.lighting);

  const key = useMemo(() => new THREE.DirectionalLight('#ffffff', 1), []);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const panels = useRef<(THREE.Mesh | null)[]>([]);
  const envBg = useRef<THREE.Color>(null);
  const t = useRef({ v: lighting === 'evening' ? 1 : 0, dirty: true, tick: 0 });
  // While the toggle is easing, the (tiny) environment cube re-renders every frame; otherwise it is static.
  const [envFrames, setEnvFrames] = useState(1);

  // Shadow quality: 2048 desktop / 1024 mobile or when the PerformanceMonitor asks for 'low'.
  const mapSize = quality === 'low' || isMobileNow() ? 1024 : 2048;
  useEffect(() => {
    const sh = key.shadow;
    key.castShadow = true;
    sh.mapSize.set(mapSize, mapSize);
    sh.map?.dispose();
    sh.map = null;
    // ~1 texel of normal offset removes acne on the 0.5 ft walls without detaching their shadows.
    sh.bias = -0.0004;
    sh.normalBias = 0.05;
    key.target.position.copy(CENTER);
    key.target.updateMatrixWorld();
  }, [key, mapSize]);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
  }, [gl]);

  useEffect(() => {
    t.current.dirty = true;
    setEnvFrames(Infinity);
  }, [lighting]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const goal = useStore.getState().lighting === 'evening' ? 1 : 0;
    const s = t.current;
    // 'low' quality: redraw the (static-by-nature) shadow map every other frame.
    if (useStore.getState().quality === 'low') {
      key.shadow.autoUpdate = false;
      key.shadow.needsUpdate = (s.tick++ & 1) === 0;
    } else key.shadow.autoUpdate = true;
    if (s.v !== goal) {
      s.v = useStore.getState().reducedMotion || Math.abs(s.v - goal) < 0.002 ? goal : THREE.MathUtils.damp(s.v, goal, 2.6, dt);
      s.dirty = true;
    }
    lightState.evening = s.v;
    if (!s.dirty) return;
    const e = s.v;

    _c.copy(KEY.colorA).lerp(KEY.colorB, e);
    key.color.copy(_c);
    key.intensity = lerp(KEY.intensityA, KEY.intensityB, e);
    setKeyDirection(key, lerp(KEY.azA, KEY.azB, e), lerp(KEY.elA, KEY.elB, e));
    fitShadowCamera(key);

    const h = hemi.current;
    if (h) {
      h.color.copy(HEMI.skyA).lerp(HEMI.skyB, e);
      h.groundColor.copy(HEMI.groundA).lerp(HEMI.groundB, e);
      h.intensity = lerp(HEMI.intensityA, HEMI.intensityB, e);
    }

    PANELS.forEach((p, i) => {
      const m = panels.current[i]?.material as THREE.MeshBasicMaterial | undefined;
      if (!m) return;
      m.color.copy(PANEL_COLORS[i].a).lerp(PANEL_COLORS[i].b, e).multiplyScalar(lerp(p.a[1], p.b[1], e));
    });
    envBg.current?.copy(ENV_FLOOR.a).lerp(ENV_FLOOR.b, e);

    scene.environmentIntensity = lerp(ENV_INTENSITY.a, ENV_INTENSITY.b, e);
    gl.toneMappingExposure = lerp(EXPOSURE.a, EXPOSURE.b, e);

    if (e === goal) {
      s.dirty = false;
      setEnvFrames(1); // settle: render the environment once more with the final colours
    }
  });

  return (
    <>
      <primitive object={key} />
      <primitive object={key.target} />
      <hemisphereLight ref={hemi} args={['#d3e6ea', '#e9d2ab', HEMI.intensityA]} />
      <Environment resolution={256} frames={envFrames}>
        <color ref={envBg} attach="background" args={['#1b292b']} />
        {PANELS.map((p, i) => (
          <mesh
            key={i}
            ref={(m) => { panels.current[i] = m; }}
            position={p.position}
            scale={[p.scale[0], p.scale[1], 1]}
            onUpdate={(self) => self.lookAt(0, 0, 0)}
          >
            <planeGeometry />
            <meshBasicMaterial toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </Environment>
    </>
  );
}
