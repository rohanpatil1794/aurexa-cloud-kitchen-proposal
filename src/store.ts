import { create } from 'zustand';
import type { PresetId, RoomId, Vec3 } from './data/types';
import { ROOM_BY_ID, neighbourRoom } from './data/layout';
import { HERO_POSE, presetPose, roomEye, roomOverview, type Frame } from './data/cameras';

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
  /** Orbit poses: the subject the rig frames in the free part of the screen. */
  frame: Frame | null;
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
  frame?: Frame;
}

const reducedMotionQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const prefersReducedMotion = reducedMotionQuery?.matches ?? false;

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
  /** The on-screen + / - buttons: a new `id` asks CameraRig for one zoom step (dir 1 = closer). Ctrl + wheel and pinch go straight to the rig. */
  zoomStep: { id: number; dir: 1 | -1 };
  stepZoom: (dir: 1 | -1) => void;
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
  /** Set while eye level has raised the walls itself: the mode to put back when the camera leaves the room. A visitor's own wall choice clears it. */
  wallModeBeforeEye: WallMode | null;
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
  frame: o.frame ?? null,
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

  camera: mkCam(HERO_POSE.position, HERO_POSE.target, { instant: true, frame: HERO_POSE.frame }),
  activePreset: null,
  autoOrbit: !prefersReducedMotion,
  setAutoOrbit: (v) => set({ autoOrbit: v }),
  flyTo: (position, target, opts) => {
    // prefers-reduced-motion: jump instead of flying.
    const instant = (opts?.instant ?? false) || get().reducedMotion;
    const { wallMode, wallModeBeforeEye } = get();
    // Eye level stands inside the rooms: with 3.5 ft walls the eye sees the empty stage above them. So it raises the walls
    // (the rise starts with the flight) and every other camera move puts the visitor's choice back.
    const walls: Partial<AppState> =
      opts?.mode === 'look'
        ? wallMode === 'full' ? {} : { wallMode: 'full', wallModeBeforeEye: wallMode }
        : wallModeBeforeEye ? { wallMode: wallModeBeforeEye, wallModeBeforeEye: null } : {};
    set({
      camera: mkCam(position, target, { ...opts, instant }),
      activePreset: opts?.preset ?? null,
      autoOrbit: false,
      ...walls,
    });
  },
  goPreset: (id, instant) => {
    const s = get();
    const p = presetPose(id, (s.wallModeBeforeEye ?? s.wallMode) === 'full');
    s.flyTo(p.position, p.target, { preset: id, instant, frame: p.frame });
  },
  goRoom: (id, view = 'overview') => {
    const room = ROOM_BY_ID[id];
    const eye = view === 'eye';
    const pose = eye ? roomEye(room) : roomOverview(room);
    set({ selectedRoom: id, roomView: view });
    get().flyTo(pose.position, pose.target, { mode: eye ? 'look' : 'orbit', frame: pose.frame });
  },
  zoomStep: { id: 0, dir: 1 },
  stepZoom: (dir) => set((s) => ({ zoomStep: { id: s.zoomStep.id + 1, dir } })),
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
  wallModeBeforeEye: null,
  setWallMode: (m) => {
    set({ wallMode: m, wallModeBeforeEye: null });
    // The Hot Kitchen view looks down from higher up when the walls are full height.
    if (get().activePreset === 'kitchen') get().goPreset('kitchen');
  },
  lighting: 'day',
  setLighting: (m) => set({ lighting: m }),
  quality: 'high',
  setQuality: (q) => set({ quality: q }),

  panelTab: 'rooms',
  setPanelTab: (t) => set({ panelTab: t }),
  sheet: 'peek',
  setSheet: (s) => set({ sheet: s }),
}));

// Following the OS setting live: reduced motion stops the hero turntable and makes every fly a jump.
reducedMotionQuery?.addEventListener('change', (e) => {
  useStore.setState(e.matches ? { reducedMotion: true, autoOrbit: false } : { reducedMotion: false });
});
