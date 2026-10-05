// The one persistent <Canvas>, filling the sticky #stage section from App.tsx.
//
//  - transparent canvas over a CSS radial gradient (.stage-canvas in index.css), ACES filmic, PCF soft shadows
//  - renders only while the stage is on screen and the tab is visible (frameloop 'never' otherwise)
//  - drei <PerformanceMonitor> -> store.quality ('high' | 'low'); `?quality=high|low` pins it (for diagnostics)
//  - WebGL missing, context creation failing or a lost context that never comes back -> <WebGLFallback/>
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useStore } from '../store';
import { isMobileNow, useIsMobile, webglAvailable } from '../lib/hooks';
import { FOV, HERO_POSE } from '../data/cameras';
import { WebGLFallback } from '../ui/WebGLFallback';
import { Scene } from './Scene';

/** Module-level so the Canvas never sees a "new" camera config (which would replace the rig's camera). */
const CAMERA = { position: HERO_POSE.position, fov: FOV.orbit, near: 1, far: 900 };
const GL = { antialias: true, alpha: true, powerPreference: 'high-performance' as const, stencil: false };
const RESIZE = { scroll: false, debounce: { scroll: 0, resize: 0 } };
const CONTEXT_LOST_GRACE_MS = 4000;

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

/** One redraw when rendering resumes, so the loop restarts cleanly after being paused. */
function ResumeKick({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (active) invalidate();
  }, [active, invalidate]);
  return null;
}

const pinnedQuality = (() => {
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('quality') : null;
  return q === 'low' || q === 'high' ? q : null;
})();

export function Stage() {
  const mobile = useIsMobile() || isMobileNow(); // narrow viewport or touch device
  const quality = useStore((s) => s.quality);
  const lighting = useStore((s) => s.lighting);
  const stageVisible = useStore((s) => s.stageVisible);
  const [docHidden, setDocHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [failed, setFailed] = useState(() => !webglAvailable());
  const wrapRef = useRef<HTMLDivElement>(null);

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
    if (pinnedQuality) useStore.getState().setQuality(pinnedQuality);
  }, []);

  // No WebGL: there will be no frames, so release the loading splash ourselves.
  useEffect(() => {
    if (failed) useStore.getState().setSceneReady(true);
  }, [failed]);

  if (failed) return <WebGLFallback />;

  const active = stageVisible && !docHidden;
  return (
    <div
      ref={wrapRef}
      className="stage-canvas absolute inset-0 z-0"
      data-lighting={lighting}
      role="img"
      aria-label="Interactive 3D model of the cloud kitchen. Drag to orbit, scroll to zoom."
    >
      <StageBoundary onError={() => setFailed(true)}>
        <Canvas
          frameloop={active ? 'always' : 'never'}
          dpr={quality === 'low' ? 1 : [1, mobile ? 1.5 : 2]}
          shadows="soft"
          gl={GL}
          camera={CAMERA}
          resize={RESIZE}
          onCreated={(state) => {
            const canvas = state.gl.domElement;
            let lostTimer = 0;
            canvas.addEventListener('webglcontextlost', (e) => {
              e.preventDefault(); // lets the browser restore the context
              lostTimer = window.setTimeout(() => setFailed(true), CONTEXT_LOST_GRACE_MS);
            });
            canvas.addEventListener('webglcontextrestored', () => {
              window.clearTimeout(lostTimer);
              state.invalidate();
            });
            if (import.meta.env.DEV) (window as unknown as { __r3f?: unknown }).__r3f = state;
          }}
        >
          <ResumeKick active={active} />
          <ReadyGate />
          {!pinnedQuality && (
            <PerformanceMonitor
              ms={300}
              iterations={8}
              flipflops={3}
              onDecline={() => useStore.getState().setQuality('low')}
              onIncline={() => useStore.getState().setQuality('high')}
            />
          )}
          <Scene />
        </Canvas>
      </StageBoundary>
    </div>
  );
}
