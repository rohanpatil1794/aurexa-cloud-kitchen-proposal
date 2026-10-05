// The Stage behind a dynamic import: three, r3f, drei and the whole scene (about two thirds of the JS) download
// after the page has painted, so the boot screen and the page shell appear from the first, small bundle.
import { Component, lazy, Suspense, type ReactNode } from 'react';
import { useStore } from '../store';
import { WebGLFallback } from '../ui/WebGLFallback';

const Stage = lazy(() => import('./Stage').then((m) => ({ default: m.Stage })));

/** The chunk can fail to download (offline, or a redeploy replaced it): show the floor plan, not a blank page. */
class ChunkBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[stage] the 3D scene failed to load, showing the floor plan instead.', error);
    useStore.getState().setSceneReady(true); // no frames will ever come: let the loading splash go
  }
  render() {
    return this.state.failed ? <WebGLFallback /> : this.props.children;
  }
}

export function LazyStage() {
  return (
    <ChunkBoundary>
      <Suspense fallback={null}>
        <Stage />
      </Suspense>
    </ChunkBoundary>
  );
}
