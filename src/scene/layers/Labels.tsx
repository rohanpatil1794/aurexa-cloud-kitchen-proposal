// Room name pills over the canvas.
//
// One DOM layer (appended beside the canvas, not inside the element R3F listens on, so pill events never reach
// the scene) and ONE useFrame that projects every room anchor, fades, resolves overlaps and moves the pills.
// React only renders the static pill markup and its hover / selected attributes; nothing re-renders per frame.
//
//  - Anchor: the room centre, just above the wall tops (follows wallAnim.h, and clears the ceiling slab in full height).
//  - Visible: in the explorer with the Labels layer on; hidden under the ceiling when standing inside a room.
//    They fade in with a sweep across the plan when the explorer opens.
//  - Fade by distance: orbit views show every label (they fade away only for near-horizontal views, where they
//    would pile up); at eye level only nearby labels remain. The selected room's label always stays.
//  - Overlaps: narrow neighbours are stacked / shifted on screen (Declutter); a pill with no free spot fades out. The
//    UI over the stage (anything marked data-label-obstacle: panel, sheet, room card, chips, legends) is a keep-out area.
//  - Compact screens (phones, a narrow stage): one short word per room, small type, and rooms much smaller on screen than
//    their pill shrink to a zone-coloured dot until they are hovered, tapped or selected, so the model stays readable.
//  - Pills are buttons: hover lights the room (store.hoveredRoom), a click selects it.
import { useCallback, useEffect, useMemo, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { useFrame, useThree, type RootState } from '@react-three/fiber';
import * as THREE from 'three';
import type { FreeRect } from '../../data/cameras';
import { FOOTPRINT, ROOMS, ZONES, roomArea, roomCenter } from '../../data/layout';
import type { Room, RoomId } from '../../data/types';
import { wallAnim } from '../../lib/wallAnim';
import { useStore } from '../../store';
import { explorerFree, topBarHeight } from '../stageLayout';
import { Declutter, MAX_OBSTACLES, easeTo, pillPointer } from './labelsLayout';
import { LABEL_LINES, LABEL_SHORT, areaLabel } from './labelsText';
import './labels.css';

const N = ROOMS.length;
/** Size of a room as it appears on screen scales with this (ft): the geometric mean of its sides. */
const ROOM_SIZE = ROOMS.map((r) => Math.sqrt(r.w * r.d));
const INDEX_OF = Object.fromEntries(ROOMS.map((r, i) => [r.id, i])) as Record<RoomId, number>;
/** Visit order for overlap resolution: small rooms keep their spot (a pill that moves away from one is easily
 *  mistaken for its neighbour's), big rooms give way (their pills can drift and still sit over the room). */
const BY_AREA = ROOMS.map((_, i) => i).sort((a, b) => roomArea(ROOMS[a]) - roomArea(ROOMS[b]));

const DEG = Math.PI / 180;
/** Pills float this far above the wall tops (ft). */
const LIFT = 1;
/** Ceiling slab thickness (ft, see Ceiling.tsx): in full-height mode it covers the wall tops. */
const CEILING = 0.4;
/** Orbit views fade labels out below these camera elevations above the label (radians). */
const ELEVATION_GONE = 9 * DEG;
const ELEVATION_FULL = 24 * DEG;
/** Eye level: fully visible up to LOOK_NEAR ft from the camera, gone beyond LOOK_FAR. */
const LOOK_NEAR = 12;
const LOOK_FAR = 32;
/**
 * While a room is selected and the camera is close to it (orbit views), the other labels dim: by DIM_NEAR beside it,
 * by DIM_FAR from NEIGHBOUR_FAR ft away. Zooming out past FOCUS_FAR ft brings them all back.
 */
const DIM_NEAR = 0.3;
const DIM_FAR = 0.85;
const NEIGHBOUR_NEAR = 18;
const NEIGHBOUR_FAR = 48;
const FOCUS_NEAR = 70;
const FOCUS_FAR = 120;
const ENTER_DELAY = 0.35;
const ENTER_SWEEP = 0.9;
const ENTER_FADE = 0.5;
const OPACITY_STEPS = 50;
/** Below this opacity a pill is hidden outright (and stops taking the pointer). */
const HIDE_BELOW = 0.06;
/** A free stage area narrower than this (px) gets compact labels. */
const COMPACT_WIDTH = 720;
/** Compact only: a room whose size on screen is under MINI_IN x its pill's width shows a dot, until it exceeds MINI_OUT x. */
const MINI_IN = 0.8;
const MINI_OUT = 1;
/** Side (px) of a dot, with its ring. */
const MINI_SIZE = 15;
/** Anchors this far outside the screen (px) are skipped; closer ones are pulled inside it. */
const EDGE = 40;
/** Space kept between pills and the screen edge / top bar, px. */
const MARGIN = 8;
/** Space kept around the UI over the stage, px (the declutter adds its own gap). */
const OBSTACLE_PAD = 4;
/** The UI over the stage is looked up again this often (frames); its rectangles are read every frame. */
const OBSTACLE_REFRESH = 20;
/** A pill moved further than this (px) from its room gets a stem down to the room's floor. */
const STEM_MIN_OFFSET = 14;
/** Height (ft) of a stem's foot: on the floor. */
const STEM_FOOT_Y = 0.05;
const DEFAULT_SIZE = [64, 30] as const;

const smoothstep = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const _dir = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _p = new THREE.Vector3();
const disconnected = (el: HTMLElement) => !el.isConnected;

class LabelRig {
  host: HTMLElement | null = null;
  private readonly els: (HTMLElement | null)[] = new Array(N).fill(null);
  private readonly pills: (HTMLElement | null)[] = new Array(N).fill(null);
  private readonly stems: (HTMLElement | null)[] = new Array(N).fill(null);
  private readonly anchor = new Float32Array(N * 2);
  private readonly floorX = new Float32Array(N);
  private readonly floorY = new Float32Array(N);
  private readonly delay = new Float32Array(N);
  private readonly declutter = new Declutter(N);
  private readonly order = new Int32Array(N);
  /** Full pill size (px, as last measured); per pill: a dot is wanted / a dot is set in the DOM (-1 = not written yet). */
  private readonly pillW = new Float32Array(N).fill(DEFAULT_SIZE[0]);
  private readonly pillH = new Float32Array(N).fill(DEFAULT_SIZE[1]);
  private readonly mini = new Uint8Array(N);
  private readonly miniDom = new Int8Array(N).fill(-1);
  /** Per pill: opacity before overlap hiding, eased 0..1 fade for "no free spot", and the eased offset in px. */
  private readonly goal = new Float32Array(N);
  private readonly unplaced = new Float32Array(N);
  private readonly ox = new Float32Array(N);
  private readonly oy = new Float32Array(N);
  /** Last values written to the DOM, so unchanged ones are never touched. */
  private readonly lastX = new Float32Array(N).fill(NaN);
  private readonly lastY = new Float32Array(N).fill(NaN);
  private readonly lastOpacity = new Int16Array(N).fill(-1);
  private readonly lastZ = new Int32Array(N).fill(-1);
  private readonly lastStemOpacity = new Int16Array(N).fill(-1);
  private readonly lastStemX = new Float32Array(N).fill(NaN);
  private readonly lastStemY = new Float32Array(N).fill(NaN);
  private readonly lastStemLen = new Int16Array(N).fill(-1);
  private readonly lastStemAngle = new Float32Array(N).fill(NaN);
  /** Eased 0..1: layer visibility, eye-level blend, dimming of unselected pills while a room is selected. */
  private master = 0;
  private lookT = 0;
  private dim = 0;
  private focusX = 0;
  private focusZ = 0;
  private enterAt = -1;
  private compact = false;
  private width = 0;
  private height = 0;
  /** Height of the fixed top bar (px): pills stay clear of it. */
  private topBar = 0;
  private readonly free: FreeRect = { x0: 0, y0: 0, x1: 0, y1: 0 };
  private obstacleEls: HTMLElement[] = [];
  private frame = 0;
  private readonly resize: ResizeObserver | null;

  constructor() {
    ROOMS.forEach((r, i) => {
      const [cx, cz] = roomCenter(r);
      this.anchor[i * 2] = cx;
      this.anchor[i * 2 + 1] = cz;
      this.delay[i] = ((cx + cz) / (FOOTPRINT.w + FOOTPRINT.d)) * ENTER_SWEEP;
      this.declutter.w[i] = DEFAULT_SIZE[0];
      this.declutter.h[i] = DEFAULT_SIZE[1];
    });
    // Watches the full pills: they keep their size while a dot is shown.
    this.resize = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver((entries) => {
          for (const e of entries) {
            const i = Number((e.target as HTMLElement).dataset.i);
            this.pillW[i] = e.borderBoxSize?.[0]?.inlineSize ?? e.contentRect.width;
            this.pillH[i] = e.borderBoxSize?.[0]?.blockSize ?? e.contentRect.height;
          }
        });
  }

  attach(i: number, el: HTMLElement | null): void {
    this.els[i] = el;
    if (!el) return;
    this.lastX[i] = this.lastY[i] = NaN;
    this.lastOpacity[i] = this.lastZ[i] = -1;
    this.miniDom[i] = -1;
  }

  attachPill(i: number, el: HTMLElement | null): void {
    const prev = this.pills[i];
    if (prev) this.resize?.unobserve(prev);
    this.pills[i] = el;
    if (el) this.resize?.observe(el);
  }

  attachStem(i: number, el: HTMLElement | null): void {
    this.stems[i] = el;
    this.lastStemOpacity[i] = -1;
    this.lastStemX[i] = this.lastStemY[i] = this.lastStemAngle[i] = NaN;
    this.lastStemLen[i] = -1;
  }

  dispose(): void {
    this.resize?.disconnect();
  }

  update(state: RootState, rawDt: number): void {
    const s = useStore.getState();
    const dt = Math.min(rawDt, 0.1);
    const reduced = s.reducedMotion;
    const cam = state.camera;
    const { width: W, height: H } = state.size;

    const explorer = s.phase === 'explorer';
    if (!explorer) this.enterAt = -1;
    else if (this.enterAt < 0) this.enterAt = state.clock.elapsedTime;

    // Under the ceiling the labels would show through it.
    const underCeiling = wallAnim.t > 0.02 && cam.position.y < wallAnim.h + CEILING;
    const goal = explorer && s.layers.labels && !underCeiling ? 1 : 0;
    if (goal === 0 && this.master === 0) return; // idle: nothing visible, nothing to do
    this.master = easeTo(this.master, goal, goal ? 6 : 8, dt, reduced);
    this.lookT = easeTo(this.lookT, s.camera.mode === 'look' ? 1 : 0, 3, dt, reduced);

    if (W !== this.width || H !== this.height) {
      this.width = W;
      this.height = H;
      if (this.host) this.topBar = topBarHeight(this.host);
    }
    // How much stage the explorer UI leaves decides whether the labels go compact.
    explorerFree(W, H, s.sheet, this.topBar, this.free);
    const compact = this.free.x1 - this.free.x0 < COMPACT_WIDTH;
    if (compact !== this.compact && this.host) {
      this.compact = compact;
      if (compact) this.host.setAttribute('data-compact', '');
      else this.host.removeAttribute('data-compact');
    }
    // Pills stay on the stage, below the top bar, and clear of every piece of UI over it.
    const dc = this.declutter;
    dc.minX = MARGIN;
    dc.minY = this.topBar + MARGIN;
    dc.maxX = W - MARGIN;
    dc.maxY = H - MARGIN;
    this.readObstacles();

    cam.updateMatrixWorld();
    cam.getWorldDirection(_fwd);
    const pxPerFtAtOne = H / (2 * Math.tan(((cam as THREE.PerspectiveCamera).fov * DEG) / 2));
    const y = wallAnim.h + (wallAnim.t > 0.02 ? CEILING : 0) + LIFT;
    const sinceEnter = state.clock.elapsedTime - this.enterAt - ENTER_DELAY;
    const selIndex = s.selectedRoom ? INDEX_OF[s.selectedRoom] : -1;
    const hovIndex = s.hoveredRoom ? INDEX_OF[s.hoveredRoom] : -1;
    // The dimming keeps its centre while it fades out after the selection is cleared.
    if (selIndex >= 0) {
      this.focusX = this.anchor[selIndex * 2];
      this.focusZ = this.anchor[selIndex * 2 + 1];
    }
    const focusDist = Math.hypot(cam.position.x - this.focusX, cam.position.y, cam.position.z - this.focusZ);
    this.dim = easeTo(this.dim, selIndex >= 0 ? 1 - smoothstep(FOCUS_NEAR, FOCUS_FAR, focusDist) : 0, 6, dt, reduced);

    // ---- project, fade ---------------------------------------------------------------------------------------
    const free = this.free;
    for (let i = 0; i < N; i++) {
      const wx = this.anchor[i * 2], wz = this.anchor[i * 2 + 1];
      _dir.set(wx - cam.position.x, y - cam.position.y, wz - cam.position.z);
      const dist = _dir.length();
      const inFront = _dir.dot(_fwd) > 0.5;
      _p.set(wx, y, wz).project(cam);
      const sx = (_p.x * 0.5 + 0.5) * W;
      const sy = (0.5 - _p.y * 0.5) * H;
      _p.set(wx, STEM_FOOT_Y, wz).project(cam);
      this.floorX[i] = (_p.x * 0.5 + 0.5) * W;
      this.floorY[i] = (0.5 - _p.y * 0.5) * H;
      const onScreen = inFront && sx > free.x0 - EDGE && sx < free.x1 + EDGE && sy > free.y0 - EDGE && sy < free.y1 + EDGE;

      const orbit = smoothstep(ELEVATION_GONE, ELEVATION_FULL, Math.asin(THREE.MathUtils.clamp(-_dir.y / dist, -1, 1)));
      const look = 1 - smoothstep(LOOK_NEAR, LOOK_FAR, dist);
      let f = orbit + (look - orbit) * this.lookT;
      const pointed = i === selIndex || i === hovIndex;
      if (pointed) f = 1;
      else {
        const apart = smoothstep(NEIGHBOUR_NEAR, NEIGHBOUR_FAR, Math.hypot(wx - this.focusX, wz - this.focusZ));
        f *= 1 - this.dim * (1 - this.lookT) * (DIM_NEAR + (DIM_FAR - DIM_NEAR) * apart);
      }
      const appear = reduced ? 1 : smoothstep(0, ENTER_FADE, sinceEnter - this.delay[i]);
      const want = onScreen ? this.master * appear * f : 0;

      // Compact: a room much smaller on screen than its pill becomes a dot (with some hysteresis); pointed at, it is a pill.
      const ratio = (ROOM_SIZE[i] * pxPerFtAtOne) / dist / this.pillW[i];
      this.mini[i] = compact && !pointed && ratio < (this.mini[i] ? MINI_OUT : MINI_IN) ? 1 : 0;
      dc.w[i] = this.mini[i] ? MINI_SIZE : this.pillW[i];
      dc.h[i] = this.mini[i] ? MINI_SIZE : this.pillH[i];

      dc.x[i] = sx;
      dc.y[i] = sy;
      dc.active[i] = want > HIDE_BELOW ? 1 : 0;
      this.goal[i] = want;
    }

    // ---- stack / shift overlapping pills -----------------------------------------------------------------------
    let n = 0;
    if (selIndex >= 0) this.order[n++] = selIndex;
    for (let k = 0; k < N; k++) if (BY_AREA[k] !== selIndex) this.order[n++] = BY_AREA[k];
    dc.resolve(this.order, n);

    // ---- write the DOM (only what changed) ---------------------------------------------------------------------
    for (let i = 0; i < N; i++) {
      const el = this.els[i];
      if (!el) continue;
      if (this.mini[i] !== this.miniDom[i]) {
        this.miniDom[i] = this.mini[i];
        el.toggleAttribute('data-mini', this.mini[i] === 1);
      }
      this.unplaced[i] = easeTo(this.unplaced[i], dc.active[i] === 1 && !dc.placed[i] ? 1 : 0, 8, dt, reduced);
      const opacity = this.goal[i] * (1 - this.unplaced[i]);
      const hidden = opacity < HIDE_BELOW;
      const q = Math.round(opacity * OPACITY_STEPS);
      if (q !== this.lastOpacity[i]) {
        this.lastOpacity[i] = q;
        el.style.opacity = String(q / OPACITY_STEPS);
        el.style.visibility = hidden ? 'hidden' : 'visible';
      }
      if (hidden) {
        // Out of sight: arrive at the right spot later rather than glide in from a stale one.
        this.ox[i] = dc.dx[i];
        this.oy[i] = dc.dy[i];
        this.writeStem(i, 0, 0, 0, 0, 0);
        continue;
      }

      this.ox[i] = easeTo(this.ox[i], dc.dx[i], 12, dt, reduced);
      this.oy[i] = easeTo(this.oy[i], dc.dy[i], 12, dt, reduced);
      // Whole pixels, so the text stays crisp.
      const px = Math.round(dc.x[i] + this.ox[i] - dc.w[i] / 2);
      const py = Math.round(dc.y[i] + this.oy[i] - dc.h[i] / 2);
      if (px !== this.lastX[i] || py !== this.lastY[i]) {
        this.lastX[i] = px;
        this.lastY[i] = py;
        el.style.transform = `translate3d(${px}px,${py}px,0)`;
      }
      // Nearer (lower on screen) pills on top; the room being pointed at above all.
      const z = i === selIndex || i === hovIndex ? 3000 : 1000 + Math.round(dc.y[i]);
      if (z !== this.lastZ[i]) {
        this.lastZ[i] = z;
        el.style.zIndex = String(z);
      }
      // A pill that had to move away from its room is tied to the room's floor by a thin stem.
      const moved = this.lookT < 0.5 && Math.hypot(this.ox[i], this.oy[i]) > STEM_MIN_OFFSET;
      this.writeStem(i, moved ? q : 0, this.floorX[i], this.floorY[i], px + dc.w[i] / 2, py + dc.h[i] / 2);
    }
  }

  /** The UI over the stage (data-label-obstacle) as keep-out rectangles in layer px. */
  private readObstacles(): void {
    const dc = this.declutter;
    if (this.frame++ % OBSTACLE_REFRESH === 0 || this.obstacleEls.some(disconnected)) {
      this.obstacleEls = Array.from(document.querySelectorAll<HTMLElement>('[data-label-obstacle]')).slice(0, MAX_OBSTACLES);
    }
    const origin = this.host?.getBoundingClientRect();
    let n = 0;
    if (origin) {
      for (const el of this.obstacleEls) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        dc.obstacles[n * 4] = r.left - origin.left - OBSTACLE_PAD;
        dc.obstacles[n * 4 + 1] = r.top - origin.top - OBSTACLE_PAD;
        dc.obstacles[n * 4 + 2] = r.right - origin.left + OBSTACLE_PAD;
        dc.obstacles[n * 4 + 3] = r.bottom - origin.top + OBSTACLE_PAD;
        n++;
      }
    }
    dc.obstacleCount = n;
  }

  /** Stem from the room's floor point (fx, fy) to the pill centre (cx, cy); `q` is its quantised opacity (0 = hidden). */
  private writeStem(i: number, q: number, fx: number, fy: number, cx: number, cy: number): void {
    const stem = this.stems[i];
    if (!stem) return;
    if (q !== this.lastStemOpacity[i]) {
      this.lastStemOpacity[i] = q;
      stem.style.opacity = String(q / OPACITY_STEPS);
      stem.style.visibility = q === 0 ? 'hidden' : 'visible';
    }
    if (q === 0) return;
    const x = Math.round(fx), y = Math.round(fy);
    const len = Math.round(Math.hypot(cx - fx, cy - fy));
    const angle = Math.round(Math.atan2(cy - fy, cx - fx) * 100) / 100;
    if (x !== this.lastStemX[i] || y !== this.lastStemY[i] || angle !== this.lastStemAngle[i]) {
      this.lastStemX[i] = x;
      this.lastStemY[i] = y;
      this.lastStemAngle[i] = angle;
      stem.style.transform = `translate3d(${x}px,${y}px,0) rotate(${angle}rad)`;
    }
    if (len !== this.lastStemLen[i]) {
      this.lastStemLen[i] = len;
      stem.style.width = `${len}px`;
    }
  }
}

function Pill({ room, index, rig }: { room: Room; index: number; rig: LabelRig }) {
  const hovered = useStore((s) => s.hoveredRoom === room.id);
  const selected = useStore((s) => s.selectedRoom === room.id);
  const ref = useCallback((el: HTMLDivElement | null) => rig.attach(index, el), [rig, index]);
  const pillRef = useCallback((el: HTMLButtonElement | null) => rig.attachPill(index, el), [rig, index]);
  const zone = room.zone ? ZONES[room.zone] : null;
  const color = zone ? ({ '--dot': zone.color } as CSSProperties) : undefined;
  // The pill and the dot it shrinks to on compact screens are two faces of one control.
  const face = {
    type: 'button' as const,
    tabIndex: -1,
    'aria-label': room.name,
    onPointerEnter: (e: ReactPointerEvent) => {
      if (e.pointerType === 'touch') return;
      pillPointer.over = true;
      useStore.getState().setHoveredRoom(room.id);
    },
    onPointerLeave: (e: ReactPointerEvent) => {
      if (e.pointerType === 'touch') return;
      pillPointer.over = false;
      const s = useStore.getState();
      if (s.hoveredRoom === room.id) s.setHoveredRoom(null);
    },
    onClick: () => {
      const s = useStore.getState();
      s.goRoom(room.id, s.camera.mode === 'look' ? 'eye' : 'overview');
    },
  };
  return (
    <div ref={ref} className="lbl" data-i={index} data-hover={hovered || undefined} data-selected={selected || undefined}>
      <button ref={pillRef} data-i={index} className="lbl-pill" {...face}>
        {zone && <i className="lbl-dot" style={color} />}
        <span className="lbl-name lbl-name-full">
          {LABEL_LINES[room.id].map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
        <span className="lbl-name lbl-name-short">{LABEL_SHORT[room.id]}</span>
        <span className="lbl-area">{areaLabel(room)}</span>
      </button>
      <button className="lbl-mini" style={color} {...face} />
    </div>
  );
}

function LabelLayer({ rig }: { rig: LabelRig }) {
  return (
    <>
      {/* Stems first, so every stem lies under every pill. */}
      {ROOMS.map((r, i) => (
        <i key={r.id} className="lbl-stem" ref={(el) => rig.attachStem(i, el)} />
      ))}
      {ROOMS.map((r, i) => (
        <Pill key={r.id} room={r} index={i} rig={rig} />
      ))}
    </>
  );
}

export function Labels() {
  const gl = useThree((s) => s.gl);
  const events = useThree((s) => s.events);
  const rig = useMemo(() => new LabelRig(), []);

  useEffect(() => {
    // Beside R3F's event element, not inside it: pill pointer events must never bubble into the scene's picking.
    const source: HTMLElement | null | undefined = events.connected ?? gl.domElement.parentElement?.parentElement;
    const parent = source?.parentElement;
    if (!parent) return;
    const host = document.createElement('div');
    host.className = 'lbl-layer';
    host.setAttribute('aria-hidden', 'true');
    parent.appendChild(host);
    rig.host = host;
    const root = createRoot(host);
    root.render(<LabelLayer rig={rig} />);
    return () => {
      root.unmount();
      host.remove();
      rig.host = null;
      pillPointer.over = false;
    };
  }, [gl, events, rig]);

  useEffect(() => () => rig.dispose(), [rig]);

  useFrame((state, dt) => rig.update(state, dt));
  return null;
}
