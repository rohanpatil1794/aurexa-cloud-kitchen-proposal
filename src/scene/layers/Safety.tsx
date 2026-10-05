// Safety layer: every SAFETY_POINT as a small "icon in space" (a little oversized so it reads from the aerial), each
// with a soft pulse ring. The icons are composed with PrimBuilder, batched into a few InstancedMeshes with their own
// fading materials; the rings are one instanced shader mesh whose pulse runs on the GPU (one uniform per frame).
// Ceiling items are drawn at ceiling height even in dollhouse mode, so they float over the plan.
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SAFETY_KINDS, SAFETY_POINTS } from '../../data/safety';
import type { SafetyKind, SafetyPoint } from '../../data/types';
import { BRAND } from '../../lib/palette';
import { PrimBuilder, SHARED } from '../../lib/prims';
import { getTextTexture } from '../../lib/textTexture';
import { useStore } from '../../store';

type Prim = PrimBuilder['prims'][number];

// One restrained palette, a step deeper than the swatches so the key light does not wash it out.
const RED = '#b5332b';
const CREAM = '#ecdcb8';
const WHITE = '#e6e2d6';
const DARK = '#2a3236';
const BRASS = '#b08d57';
const GREEN = '#1a7f46';
const LED_RED = '#ff4a3d';
const LED_BLUE = '#4aa3ff';
const LAMP = '#ffdf9a';

const FADE_RATE = 9;

// ---------------------------------------------------------------------------
// Icons. Local frame: origin = the point on the floor, +z = the way it faces, the wall (if any) at z = -stand-off.
// ---------------------------------------------------------------------------
type Build = (b: PrimBuilder, p: SafetyPoint) => void;

const BUILD: Record<SafetyKind, Build> = {
  extinguisher(b, p) {
    const y = p.y;
    b.box({ c: DARK, y: y + 0.05, z: -0.36, w: 0.56, h: 0.12, d: 0.12 });
    b.cyl({ c: RED, r: 0.34, h: 1.35, y: y - 0.9 });
    b.cyl({ c: CREAM, r: 0.35, h: 0.5, y: y - 0.45 });
    b.sph({ c: RED, r: 0.34, y: y + 0.45, sy: 0.5 });
    b.cyl({ c: DARK, r: 0.09, h: 0.22, y: y + 0.55 });
    b.box({ c: DARK, y: y + 0.7, z: 0.05, w: 0.14, h: 0.13, d: 0.5 });
  },
  smoke(b, p) {
    b.cyl({ c: WHITE, r: 0.6, h: 0.3, y: p.y - 0.15 });
    b.cyl({ c: DARK, r: 0.3, h: 0.05, y: p.y + 0.15 });
    b.cyl({ c: DARK, r: 0.3, h: 0.05, y: p.y - 0.2 });
    b.box({ m: 'emissive', c: LED_RED, x: 0.42, y: p.y + 0.15, z: 0, w: 0.1, h: 0.05, d: 0.1 });
    b.box({ m: 'emissive', c: LED_RED, x: 0.42, y: p.y - 0.2, z: 0, w: 0.1, h: 0.05, d: 0.1 });
  },
  heat(b, p) {
    b.cyl({ c: BRAND.orange, r: 0.68, h: 0.26, y: p.y - 0.13 });
    b.cyl({ c: WHITE, r: 0.44, h: 0.36, y: p.y - 0.18 });
    b.cyl({ c: DARK, r: 0.14, h: 0.05, y: p.y + 0.18 });
    b.sph({ c: DARK, r: 0.16, y: p.y - 0.2, sy: 0.6 });
  },
  lpg(b, p) {
    b.box({ c: WHITE, y: p.y - 0.43, w: 0.64, h: 0.86, d: 0.44 });
    b.box({ m: 'emissive', c: LED_BLUE, y: p.y + 0.43, w: 0.64, h: 0.04, d: 0.2 });
    for (const dy of [-0.05, -0.2, -0.35]) b.box({ c: DARK, y: p.y + dy, z: 0.225, w: 0.46, h: 0.06, d: 0.03 });
    b.box({ m: 'emissive', c: LED_BLUE, x: 0.2, y: p.y + 0.3, z: 0.225, w: 0.1, h: 0.1, d: 0.04 });
  },
  gasvalve(b, p) {
    // Riser from the ring main, a short run into the kitchen wall, a red gate valve inline with its wheel on top.
    const run = p.y - 0.6;
    const valveZ = -0.38;
    b.pipe({ m: 'matte', c: BRASS, a: [0, run, 0], b: [0, 9, 0], r: 0.07 });
    b.pipe({ m: 'matte', c: BRASS, a: [0, run, 0], b: [0, run, -0.75], r: 0.07 });
    b.sph({ c: RED, r: 0.25, y: run, z: valveZ });
    b.cyl({ c: DARK, r: 0.05, h: 0.5, y: run + 0.15, z: valveZ });
    const spokes = 12;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      b.box({ c: RED, x: Math.cos(a) * 0.34, y: p.y - 0.04, z: valveZ + Math.sin(a) * 0.34, w: 0.2, h: 0.08, d: 0.08, ry: -((a * 180) / Math.PI + 90) });
    }
    b.cyl({ c: RED, r: 0.1, h: 0.1, y: p.y - 0.05, z: valveZ });
    b.box({ c: RED, y: p.y - 0.04, z: valveZ, w: 0.68, h: 0.07, d: 0.07 });
    b.box({ c: RED, y: p.y - 0.04, z: valveZ, w: 0.07, h: 0.07, d: 0.68 });
    // Hanging tag, readable from both sides.
    b.box({ c: CREAM, y: p.y - 0.82, z: 0.18, w: 0.66, h: 0.78, d: 0.05 });
    for (const [z, ry] of [[0.217, 0], [0.143, 180]] as const) {
      b.sign({ text: 'GAS', sub: 'OFF', x: 0, y: p.y - 0.43, z, w: 0.56, h: 0.68, ry, fg: '#ffffff', bg: RED, weight: 800, tracking: 0.1 });
    }
  },
  emlight(b, p) {
    const wall = p.rot !== undefined;
    b.box({ c: CREAM, y: p.y - 0.17, w: 1.2, h: 0.34, d: 0.34 });
    if (wall) {
      for (const x of [-0.34, 0.34]) b.box({ m: 'emissive', c: LAMP, x, y: p.y - 0.12, z: 0.18, w: 0.28, h: 0.2, d: 0.08 });
      b.box({ m: 'emissive', c: LAMP, y: p.y + 0.17, w: 0.5, h: 0.03, d: 0.2 });
    } else {
      // ceiling bulkhead: lamps on the underside, a pale strip on top so it reads from the aerial
      for (const x of [-0.34, 0.34]) b.box({ m: 'emissive', c: LAMP, x, y: p.y - 0.2, w: 0.28, h: 0.04, d: 0.24 });
      b.box({ m: 'emissive', c: LAMP, y: p.y + 0.17, w: 0.7, h: 0.03, d: 0.18 });
    }
  },
  exit(b, p) {
    b.box({ c: CREAM, y: p.y - 0.55, w: 2.8, h: 1.1, d: 0.16 });
    for (const [z, ry] of [[0.092, 0], [-0.092, 180]] as const) {
      b.sign({ text: 'EXIT', x: 0, y: p.y, z, w: 2.6, h: 0.9, ry, fg: '#ffffff', bg: GREEN, weight: 800, tracking: 0.16 });
    }
  },
};

/** Icons are drawn oversize by this factor, so they read from the aerial (the gas valve stays true: its riser meets the ring main). */
const SCALE: Record<SafetyKind, number> = { extinguisher: 1.3, smoke: 1.2, heat: 1.2, lpg: 1.35, gasvalve: 1, emlight: 1.2, exit: 1.15 };

/** Pulse ring: radius ft and strength (ceiling items pulse more quietly). */
const HALO: Record<SafetyKind, { r: number; amp: number }> = {
  extinguisher: { r: 1.3, amp: 1 },
  smoke: { r: 1.5, amp: 0.55 },
  heat: { r: 1.6, amp: 0.75 },
  lpg: { r: 1.1, amp: 0.9 },
  gasvalve: { r: 1.6, amp: 1 },
  emlight: { r: 1.3, amp: 0.7 },
  exit: { r: 1.7, amp: 1 },
};

// ---------------------------------------------------------------------------
// Pulse ring shader (instanced; per-instance phase from the position, colour from instanceColor)
// ---------------------------------------------------------------------------
const HALO_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uMotion;
  attribute float aAmp;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 c = instanceMatrix[3].xyz;
    float phase = fract(uTime * 0.32 + fract(sin(dot(c.xz, vec2(12.9898, 78.233))) * 43758.5453));
    float t = mix(0.45, phase, uMotion);
    float grow = mix(0.6, 1.5, t);
    // the pulses are for the overview: they fade out as the camera comes within a room's reach
    float far = smoothstep(9.0, 26.0, distance(cameraPosition, c));
    vAlpha = aAmp * far * smoothstep(0.0, 0.12, t) * (1.0 - t) * 1.15;
    vUv = uv;
    vColor = instanceColor;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position * vec3(grow, 1.0, grow), 1.0);
  }
`;
const HALO_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float ring = smoothstep(0.64, 0.86, r) * (1.0 - smoothstep(0.90, 1.0, r));
    float glow = (1.0 - smoothstep(0.0, 0.9, r)) * 0.14;
    float a = (ring + glow) * vAlpha * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
    #include <colorspace_fragment>
  }
`;

const _m = new THREE.Matrix4();
const _grow = new THREE.Matrix4();
const _back = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

class SafetyRig {
  readonly group = new THREE.Group();
  /** Opaque once fully shown (so depth sorting stays exact), transparent only while fading. */
  private readonly solid: (THREE.MeshStandardMaterial | THREE.MeshBasicMaterial)[] = [];
  /** Text planes: always blended (their art has soft edges). */
  private readonly labels: THREE.MeshBasicMaterial[] = [];
  private readonly halo: THREE.ShaderMaterial;
  private readonly disposables: { dispose(): void }[] = [];
  private opacity = 0;

  constructor(points: readonly SafetyPoint[]) {
    const keep = <T extends { dispose(): void }>(o: T): T => {
      this.disposables.push(o);
      return o;
    };
    this.group.name = 'safety';
    this.group.visible = false;

    // ---- icons: PrimBuilder composition -> one InstancedMesh per geometry x material ----
    const builder = new PrimBuilder();
    for (const p of points) {
      const prims = builder.prims.length;
      const signs = builder.signs.length;
      builder.frame({ x: p.x, z: p.z, ry: p.rot ?? 0 }, () => BUILD[p.kind](builder, p));
      const k = SCALE[p.kind];
      if (k === 1) continue;
      // Oversize about the marker's own centre (the back of a wall-hung icon just sinks into the wall).
      _grow.makeTranslation(p.x, p.y, p.z).multiply(_m.makeScale(k, k, k)).multiply(_back.makeTranslation(-p.x, -p.y, -p.z));
      for (let i = prims; i < builder.prims.length; i++) builder.prims[i].matrix.premultiply(_grow);
      for (let i = signs; i < builder.signs.length; i++) {
        const s = builder.signs[i];
        s.matrix.premultiply(_grow);
        s.w *= k;
        s.h *= k;
      }
    }

    const matte = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.05 }));
    const glow = keep(new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    this.solid.push(matte, glow);
    const buckets = new Map<string, Prim[]>();
    for (const prim of builder.prims) {
      const key = `${prim.geo}|${prim.mat === 'emissive' ? 'glow' : 'matte'}`;
      (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(prim);
    }
    for (const [key, list] of buckets) {
      const [geo, kind] = key.split('|') as [keyof typeof SHARED.geo, 'glow' | 'matte'];
      const mesh = new THREE.InstancedMesh(SHARED.geo[geo], kind === 'glow' ? glow : matte, list.length);
      mesh.name = `safety-${geo}-${kind}`;
      list.forEach((prim, i) => {
        mesh.setMatrixAt(i, prim.matrix);
        mesh.setColorAt(i, prim.color);
      });
      mesh.frustumCulled = false;
      mesh.raycast = () => {};
      this.group.add(keep(mesh));
    }

    // ---- text planes (EXIT, GAS OFF) ----
    const plane = new THREE.PlaneGeometry(1, 1);
    keep(plane);
    const signMats = new Map<string, THREE.MeshBasicMaterial>();
    for (const s of builder.signs) {
      const key = `${s.text}|${s.sub ?? ''}|${s.bg}`;
      let mat = signMats.get(key);
      if (!mat) {
        mat = keep(new THREE.MeshBasicMaterial({
          map: getTextTexture({ text: s.text, sub: s.sub, aspect: s.w / s.h, fg: s.fg, bg: s.bg, weight: s.weight, tracking: s.tracking }),
          transparent: true,
          toneMapped: false,
        }));
        signMats.set(key, mat);
        this.labels.push(mat);
      }
      const mesh = new THREE.Mesh(plane, mat);
      s.matrix.decompose(mesh.position, mesh.quaternion, _s);
      mesh.scale.set(s.w, s.h, 1);
      mesh.raycast = () => {};
      this.group.add(mesh);
    }

    // ---- pulse rings ----
    const ringGeo = keep(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2));
    const amp = new Float32Array(points.length);
    const accent = Object.fromEntries(SAFETY_KINDS.map((k) => [k.kind, new THREE.Color(k.color)])) as Record<SafetyKind, THREE.Color>;
    this.halo = keep(new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMotion: { value: 1 }, uOpacity: { value: 0 } },
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
      transparent: true,
      depthWrite: false,
    }));
    const rings = new THREE.InstancedMesh(ringGeo, this.halo, points.length);
    points.forEach((p, i) => {
      const h = HALO[p.kind];
      rings.setMatrixAt(i, _m.compose(_p.set(p.x, p.y, p.z), _q.identity(), _s.set(h.r, 1, h.r)));
      rings.setColorAt(i, accent[p.kind]);
      amp[i] = h.amp;
    });
    ringGeo.setAttribute('aAmp', new THREE.InstancedBufferAttribute(amp, 1));
    rings.name = 'safety-rings';
    rings.frustumCulled = false;
    rings.renderOrder = 10;
    rings.raycast = () => {};
    this.group.add(keep(rings));
  }

  /** Once per frame: fade with the layer, advance the pulse. Allocation free. */
  frame(on: boolean, time: number, dt: number, reduced: boolean): void {
    const target = on ? 1 : 0;
    const prev = this.opacity;
    let next = reduced ? target : THREE.MathUtils.damp(prev, target, FADE_RATE, Math.min(dt, 0.1));
    if (Math.abs(next - target) < 0.004) next = target;
    this.opacity = next;
    this.group.visible = next > 0;
    if (next === 0) return;
    if (next !== prev) {
      const opaque = next >= 0.999;
      for (const m of this.solid) {
        m.opacity = next;
        if (m.transparent === opaque) {
          m.transparent = !opaque;
          m.depthWrite = opaque;
        }
      }
      for (const m of this.labels) m.opacity = next;
      this.halo.uniforms.uOpacity.value = next;
    }
    this.halo.uniforms.uTime.value = time;
    this.halo.uniforms.uMotion.value = reduced ? 0 : 1;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}

export function Safety() {
  const rig = useMemo(() => new SafetyRig(SAFETY_POINTS), []);
  useEffect(() => () => rig.dispose(), [rig]);

  useFrame((state, delta) => {
    const s = useStore.getState();
    rig.frame(s.layers.safety, state.clock.elapsedTime, delta, s.reducedMotion);
  });

  return <primitive object={rig.group} />;
}
