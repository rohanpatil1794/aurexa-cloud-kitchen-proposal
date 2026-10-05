// Shared, mutable, per-frame lighting state (not React state). Written once per frame by scene/Lighting.tsx;
// anything that wants to react to the Day/Evening toggle (floor light pools, logo-door halos, ...) reads it inside its own useFrame.
//   evening = 0 (day) ... 1 (evening); damped, so it eases between the two when store.lighting changes.
export const lightState = { evening: 0 };

// The environment cube and the shadow map are rendered once and cached, so they come back empty after a WebGL
// context loss. Stage tells everyone who caches a render target (Lighting) to bake it again.
const restoreListeners = new Set<() => void>();
export function onContextRestored(fn: () => void): () => void {
  restoreListeners.add(fn);
  return () => void restoreListeners.delete(fn);
}
export function notifyContextRestored(): void {
  restoreListeners.forEach((fn) => fn());
}
