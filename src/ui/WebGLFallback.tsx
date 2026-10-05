import { useState } from 'react';
import { FLOORPLAN_URL } from '../config';

/**
 * Shown instead of the 3D stage when WebGL is unavailable (or the context cannot be created).
 * Cream on dark teal, with the 2D floor plan so the proposal still reads.
 */
export function WebGLFallback() {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <div
      role="status"
      className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-24 text-center text-cream"
      style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 45%, #15413f 0%, #0d2a2a 55%, #071617 100%)' }}
    >
      <div className="max-w-md">
        <p className="brand-heading text-[11px] text-teal-light">Interactive 3D view</p>
        <h2 className="mt-3 text-2xl font-light leading-snug sm:text-3xl">This view needs WebGL</h2>
        <p className="mt-3 text-sm leading-relaxed text-cream/75">
          Your browser or device could not start 3D graphics. Try another browser, or turn on hardware
          acceleration. Meanwhile, here is the floor plan, and the rest of the proposal works as normal.
        </p>
      </div>
      {!imgFailed && (
        <figure className="m-0 w-full max-w-3xl">
          <img
            src={FLOORPLAN_URL}
            alt="Floor plan of the 3,000 sq ft cloud kitchen and office"
            onError={() => setImgFailed(true)}
            className="mx-auto max-h-[52svh] w-auto max-w-full rounded-md border border-cream/20 bg-cream/95 object-contain p-2 shadow-2xl"
          />
          <figcaption className="mt-2 text-xs tracking-wide text-cream/55">Floor plan, 60 × 50 ft</figcaption>
        </figure>
      )}
    </div>
  );
}
