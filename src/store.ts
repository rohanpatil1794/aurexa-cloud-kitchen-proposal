import { create } from 'zustand';
import type { PresetId, RoomId, Vec3 } from './data/types';
import { ROOM_BY_ID, neighbourRoom } from './data/layout';
import { HERO_POSE, PRESETS, roomEye, roomOverview } from './data/cameras';

export type CameraMode = 'orbit' | 'look';
export type LayerId =
  | 'raw' | 'staff' | 'dirty' | 'orders' // workflow flows
  | 'safety' | 'zones' | 'labels' | 'dimensions' | 'equipment';
export const FLOW_LAYERS = ['raw', 'staff', 'dirty', 'orders'] as const;
export type WallMode = 'dollhouse' | 'full';
export type LightMode = 'day' | 'evening';
export type Phase = 'loading' | 'hero' | 'explorer';
export type PanelTab = 'rooms' | 'layers' | 'views';
export type SheetState = 'peek' | 'half' | 'full';
export type RoomView = 'overview' | 'eye';

/**
 * A camera request. CameraRig watches `camera.id`; a new id means "go here".
 * mode 'look' = eye-level: the rig puts the orbit target a hair in front of the camera so
 * dragging looks around in place.
 */
export interface CameraRequest {
  id: number;
  position: Vec3;
  target: Vec3;
  mode: CameraMode;
  instant: boolean;
  preset: PresetId | null;
}

export interface CameraKeyframe {
  position: Vec3;
  target: Vec3;
}
/** Stub for the later scroll-driven walkthrough: the rig samples this by `cameraPathProgress` (0..1). */
export interface CameraPath {
  keyframes: CameraKeyframe[];
}

export interface FlyOptions {
  mode?: CameraMode;
  instant?: boolean;
  preset?: PresetId | null;
}

const prefersReducedMotion =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

export interface AppState {
  // ---- lifecycle ----------------------------------------------------------
  phase: Phase;
  /** Scene has mounted and rendered a frame; the loading splash can leave. */
  sceneReady: boolean;
  setSceneReady: (v: boolean) => void;
  /** Hero CTA: fade overlay, fly in, show explorer UI. */
  enterSpace: () => void;
  /** Stage is on screen (IntersectionObserver). Drives the Canvas frameloop. */
  stageVisible: boolean;
  setStageVisible: (v: boolean) => void;
  reducedMotion: boolean;

  // ---- camera -------------------------------------------------------------
  camera: CameraRequest;
  activePreset: PresetId | null;
  autoOrbit: boolean;
  setAutoOrbit: (v: boolean) => void;
  /** Fly to an arbitrary pose. */
  flyTo: (position: Vec3, target: Vec3, opts?: FlyOptions) => void;
  goPreset: (id: PresetId, instant?: boolean) => void;
  /** Select a room and fly to its overview or eye-level pose. */
  goRoom: (id: RoomId, view?: RoomView) => void;
  cameraPath: CameraPath | null;
  cameraPathProgress: number;
  setCameraPath: (p: CameraPath | null) => void;
  setCameraPathProgress: (t: number) => void;

  // ---- selection ----------------------------------------------------------
  hoveredRoom: RoomId | null;
  setHoveredRoom: (id: RoomId | null) => void;
  selectedRoom: RoomId | null;
  roomView: RoomView;
  /** Esc / Back: clear selection and return to aerial. */
  clearSelection: () => void;
  stepRoom: (dir: 1 | -1) => void;

  // ---- layers & modes -----------------------------------------------------
  layers: Record<LayerId, boolean>;
  setLayer: (id: LayerId, on: boolean) => void;
  toggleLayer: (id: LayerId) => void;
  wallMode: WallMode;
  setWallMode: (m: WallMode) => void;
  lighting: LightMode;
  setLighting: (m: LightMode) => void;
  /** PerformanceMonitor result. 'low' => cheaper shadows / dpr. */
  quality: 'high' | 'low';
  setQuality: (q: 'high' | 'low') => void;

  // ---- explorer UI --------------------------------------------------------
  panelTab: PanelTab;
  setPanelTab: (t: PanelTab) => void;
  /** Mobile bottom sheet state. */
  sheet: SheetState;
  setSheet: (s: SheetState) => void;
}

let camSeq = 1;
const mkCam = (position: Vec3, target: Vec3, o: FlyOptions = {}): CameraRequest => ({
  id: camSeq++,
  position,
  target,
  mode: o.mode ?? 'orbit',
  instant: o.instant ?? false,
  preset: o.preset ?? null,
});

export const useStore = create<AppState>((set, get) => ({
  phase: 'loading',
  sceneReady: false,
  setSceneReady: (v) => set((s) => ({ sceneReady: v, phase: v && s.phase === 'loading' ? 'hero' : s.phase })),
  enterSpace: () => {
    set({ phase: 'explorer', autoOrbit: false, panelTab: 'rooms' });
    get().goPreset('aerial');
  },
  stageVisible: true,
  setStageVisible: (v) => set({ stageVisible: v }),
  reducedMotion: prefersReducedMotion,

  camera: mkCam(HERO_POSE.position, HERO_POSE.target, { instant: true }),
  activePreset: null,
  autoOrbit: !prefersReducedMotion,
  setAutoOrbit: (v) => set({ autoOrbit: v }),
  flyTo: (position, target, opts) => {
    // prefers-reduced-motion: jump instead of flying.
    const instant = (opts?.instant ?? false) || get().reducedMotion;
    set({
      camera: mkCam(position, target, { ...opts, instant }),
      activePreset: opts?.preset ?? null,
      autoOrbit: false,
    });
  },
  goPreset: (id, instant) => {
    const p = PRESETS[id];
    get().flyTo(p.position, p.target, { preset: id, instant });
  },
  goRoom: (id, view = 'overview') => {
    const room = ROOM_BY_ID[id];
    const pose = view === 'eye' ? roomEye(room) : roomOverview(room);
    set({ selectedRoom: id, roomView: view });
    get().flyTo(pose.position, pose.target, { mode: view === 'eye' ? 'look' : 'orbit' });
  },
  cameraPath: null,
  cameraPathProgress: 0,
  setCameraPath: (p) => set({ cameraPath: p, cameraPathProgress: 0 }),
  setCameraPathProgress: (t) => set({ cameraPathProgress: Math.min(1, Math.max(0, t)) }),

  hoveredRoom: null,
  setHoveredRoom: (id) => set((s) => (s.hoveredRoom === id ? s : { hoveredRoom: id })),
  selectedRoom: null,
  roomView: 'overview',
  clearSelection: () => {
    set({ selectedRoom: null, roomView: 'overview' });
    get().goPreset('aerial');
  },
  stepRoom: (dir) => {
    const cur = get().selectedRoom;
    if (!cur) return;
    get().goRoom(neighbourRoom(cur, dir), get().roomView);
  },

  layers: {
    raw: false, staff: false, dirty: false, orders: false,
    safety: false, zones: true, labels: true, dimensions: false, equipment: true,
  },
  setLayer: (id, on) => set((s) => ({ layers: { ...s.layers, [id]: on } })),
  toggleLayer: (id) => set((s) => ({ layers: { ...s.layers, [id]: !s.layers[id] } })),
  wallMode: 'dollhouse',
  setWallMode: (m) => set({ wallMode: m }),
  lighting: 'day',
  setLighting: (m) => set({ lighting: m }),
  quality: 'high',
  setQuality: (q) => set({ quality: q }),

  panelTab: 'rooms',
  setPanelTab: (t) => set({ panelTab: t }),
  sheet: 'peek',
  setSheet: (s) => set({ sheet: s }),
}));
