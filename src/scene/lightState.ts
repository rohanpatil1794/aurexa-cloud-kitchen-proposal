// Shared, mutable, per-frame lighting state (not React state). Written once per frame by scene/Lighting.tsx;
// anything that wants to react to the Day/Evening toggle (floors' warm glow, ...) reads it inside its own useFrame.
//   evening = 0 (day) ... 1 (evening); damped, so it eases between the two when store.lighting changes.
export const lightState = { evening: 0 };
