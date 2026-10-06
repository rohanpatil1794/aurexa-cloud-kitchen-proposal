// The one persistent <Canvas>, filling the sticky #stage section from App.tsx.
//
//  - transparent canvas over a CSS radial gradient (.stage-canvas in index.css), ACES filmic, PCF soft shadows
//  - frameloop 'demand', driven by <RenderGovernor/>: a frame is drawn only while something changes, so a static explorer
//    is idle. 'never' while the stage is off screen, the tab is hidden, or the shaders are still compiling (BootGate)
//  - quality = pixel-ratio tier, stepped down when frames of a continuous run are slow (store.quality: 'high' = tier 0,
//    'low' = a lower tier); `?quality=high|low` pins it (diagnostics)
//  - WebGL missing, context creation failing or a lost context that never comes back -> <WebGLFallback/>
//    (WebGL is probed once, after the first paint, with a throwaway context that is released at once: the first context
//    creation initialises the GPU process and takes ~0.6 s, so it must not sit in the render path, and three would log
//    console errors on a machine without WebGL)
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useStore } from '../store';
import { isMobileNow, useIsMobile } from '../lib/hooks';
import { FOV, HERO_POSE } from '../data/cameras';
import { WebGLFallback } from '../ui/WebGLFallback';
import { loadTextFonts } from '../lib/textTexture';
import { notifyContextRestored } from './lightState';
import { prepareFloorTextures } from './floorTextures';
import { BootGate, MAX_TIER, RenderGovernor, pixelRatio } from './RenderGovernor';
import { Scene } from './Scene';

/** Module-level so the Canvas never sees a "new" camera config (which would replace the rig's camera). */
const CAMERA = { position: HERO_POSE.position, fov: FOV.orbit, near: 1, far: 900 };
const GL = { antialias: true, alpha: true, powerPreference: 'high-performance' as const, stencil: false };
const RESIZE = { scroll: false, debounce: { scroll: 0, resize: 0 } };
const CONTEXT_LOST_GRACE_MS = 4000;

// Two jobs start as soon as this chunk runs, long before the scene needs them: the sign and label fonts download (textTexture.ts)
// and the floor textures are painted in a worker (floorTextures.ts).
loadTextFonts();
prepareFloorTextures();

/** Catches renderer / context creation errors thrown while mounting the Canvas. */
class StageBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[stage] 3D view failed to start, showing the floor plan instead.', error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Tells the loading splash the scene is up, once a few frames have really been drawn. */
function ReadyGate() {
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current < 3 && ++frames.current === 3) useStore.getState().setSceneReady(true);
  });
  return null;
}

/** Throwaway context: tells "no WebGL" apart from "WebGL fine" without three's console errors. */
function probeWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

const pinnedQuality = (() => {
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('quality') : null;
  return q === 'low' || q === 'high' ? q : null;
})();

export function Stage() {
  const mobile = useIsMobile() || isMobileNow(); // narrow viewport or touch device
  const lighting = useStore((s) => s.lighting);
  const stageVisible = useStore((s) => s.stageVisible);
  const [docHidden, setDocHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [failed, setFailed] = useState(false);
  /** null until probed (just after first paint): the Canvas is not mounted before that. */
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [stage, setStage] = useState(0);
  const [built, setBuilt] = useState(false);
  const [compiled, setCompiled] = useState(false);
  const [tier, setTier] = useState(pinnedQuality === 'low' ? MAX_TIER : 0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const onStage = useCallback((n: number, done: boolean) => {
    setStage(n);
    if (done) setBuilt(true);
  }, []);
  const onCompiled = useCallback(() => setCompiled(true), []);
  // The Canvas starts at the tier's pixel ratio; RenderGovernor keeps it right after that (resizes, tier changes).
  const [dpr0] = useState(() => pixelRatio(tier, mobile, window.innerWidth, window.innerHeight));

  // Pause rendering when the stage scrolls off-screen or the tab is hidden.
  useEffect(() => {
    const el = document.getElementById('stage') ?? wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => useStore.getState().setStageVisible(entry.isIntersecting),
      { rootMargin: '80px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const on = () => setDocHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  useEffect(() => {
    useStore.getState().setQuality(tier === 0 ? 'high' : 'low');
  }, [tier]);

  useEffect(() => {
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => setWebgl(probeWebGL()), 0);
    });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  // No WebGL: there will be no frames, so release the loading splash ourselves.
  const unavailable = failed || webgl === false;
  useEffect(() => {
    if (unavailable) useStore.getState().setSceneReady(true);
  }, [unavailable]);

  if (unavailable) return <WebGLFallback />;

  const active = stageVisible && !docHidden && compiled;
  return (
    <div
      ref={wrapRef}
      className="stage-canvas absolute inset-0 z-0"
      data-lighting={lighting}
      role="img"
      aria-label="Interactive 3D model of the cloud kitchen. Drag to orbit, scroll to zoom."
    >
      <StageBoundary onError={() => setFailed(true)}>
        {webgl && (
          <Canvas
            frameloop={active ? 'demand' : 'never'}
            dpr={dpr0}
            shadows="soft"
            gl={GL}
            camera={CAMERA}
            resize={RESIZE}
            onCreated={(state) => {
              // A shader error is a developer problem: skip the (blocking) link-status read in production builds.
              state.gl.debug.checkShaderErrors = import.meta.env.DEV;
              const canvas = state.gl.domElement;
              let lostTimer = 0;
              canvas.addEventListener('webglcontextlost', (e) => {
                e.preventDefault(); // lets the browser restore the context
                lostTimer = window.setTimeout(() => {
                  // Already lost: unmounting must not try to force a loss again (three would warn).
                  state.gl.forceContextLoss = () => {};
                  setFailed(true);
                }, CONTEXT_LOST_GRACE_MS);
              });
              canvas.addEventListener('webglcontextrestored', () => {
                window.clearTimeout(lostTimer);
                notifyContextRestored(); // cached render targets (environment, shadow map) come back empty
                state.invalidate();
              });
              if (import.meta.env.DEV) (window as unknown as { __r3f?: unknown }).__r3f = state;
            }}
          >
            <ReadyGate />
            <RenderGovernor tier={tier} mobile={mobile} pinned={pinnedQuality !== null} onTier={setTier} />
            <Scene onStage={onStage} />
            <BootGate stage={stage} built={built} onCompiled={onCompiled} />
          </Canvas>
        )}
      </StageBoundary>
    </div>
  );
}
