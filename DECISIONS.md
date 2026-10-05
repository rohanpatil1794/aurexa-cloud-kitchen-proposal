# DECISIONS

One line per deviation from the brief / LAYOUT SPEC, or per non-obvious design call. Append new lines with
`echo "- ..." >> DECISIONS.md` (never rewrite the file wholesale).

## Layout deviations (vs. LAYOUT SPEC)

- Pack (Packing & QC) narrowed from 11.5 ft to 10 ft wide (x 0–10) so the left corridor runs straight at x 10–15 and lines up with Dessert's east wall; this also lets the 3 ft Dispatch north door fit between the T-junction walls.
- Dispatch N@12.5 moved to N@12 (door spans x 10.5–13.5, the clear span between the Pack wall at x 10 and the Rider wall at x 14).
- Left corridor is one rectangle x 10–15 (z 16.5–36); Bottom Corridor is x 10–50.5 (z 36–41) instead of starting at x 11.5, so corridor rectangles partition the footprint with no overlap or gap.
- Pack E door is at (10, 38) instead of (11.5, 38) as a consequence of the narrower Pack room.
- Content Creator Corner depth 9 → 8 ft (z 32–40), Toilets move to z 40–46 (still 6 × 6), Emergency Exit Lobby deepened 3 → 4 ft (z 46–50): a 3 ft door cannot fit in a 3 ft-deep room between two walls.
- Door positions nudged to clear junctions: Toilets W@z44 → W@z43, Creator W@z36.5 → W@z36, Emergency Exit Lobby W@z48.5 → W@z48.
- Indoor Garden 42 → 39 (x 39–47, 8 × 9 ft) and Waste Management 20 → 17 ft wide (x 22–39): the Passenger Lift (3 × 3 ft) at x 50.7–53.7 would have completely blocked the 3.5 ft-wide staff lobby and the staff flow, so the lobby is widened to x 47–54 and the lift is tucked against the garden wall at x 47.5–50.5.
- Waste N@38 → N@36 and Garden N@46 → N@43 to stay inside the new room edges (door positions otherwise as spec).
- Staff Spine starts at z 16.5 (the Top Corridor owns z 13.5–16.5) so circulation floor rectangles never overlap; the spine + lobby still reads as one x 50.5–54 route.
- A shared-wall door is modelled once (Lift S@57 = Receiving N@57, Dry E@z9.5 = Receiving W@z9.5, Dessert S = Pack N@5, Pack S@6 = Dispatch N@6, Dispatch E@z45 = Rider W).

## Assets

- `public/assets/floorplan.png` is the canonical plan: generated from `src/data/layout.ts` by `scripts/make-floorplan.mjs` (`npm run assets`), so it matches the 3D model exactly. It is used for the download link and the WebGL fallback. The client's original AI-drawn plan (`floorplan-original.png`, currently saved as `floorplan-orignal.png`) is reference only: nothing in the site references it and the build strips it from `dist`.

## Tech

- Pinned to React 18.3 / @react-three/fiber 8 / drei 9 / three 0.170 (the stack the brief names) with Vite 7, TypeScript 5.9 and Tailwind CSS 4 (CSS-first config).
- OG/Twitter image URLs in index.html are relative (/og.png); crawlers need an absolute origin, so set og:image and twitter:image to the deployed https URL once the Vercel domain is known.
- apple-touch-icon.png is a full-bleed cream square (iOS rounds it itself; pre-rounded transparent corners would show black on iOS). favicon.png/favicon-32.png/favicon.ico are transparent.
- OG image splits the title over two lines (AUREXA × [KITCHEN NAME] / CLOUD KITCHEN PROPOSAL) with an orange rule in place of the em dash so it stays legible at thumbnail size; the og:title meta carries the full string.
- Brand cuts come from an exact two-background matte of logo-light/logo-dark (identical marks on white and black), so no halo on any backdrop. Wordmarks are single-ink (black on light, white on dark); recolour them in CSS with mask-image if a teal or cream version is needed.
- floorplan.png: room-to-room doors swing into the larger room, other doors into the room (emergency exits outward); the plan is drawn from layout.ts, so after editing the layout data re-run `npm run assets` to keep it in sync.
- Wall geometry module is src/scene/building/wallModel.ts (NOT walls.ts): on Windows/macOS walls.ts and Walls.tsx collide (extensionless './Walls' resolves to walls.ts first, and tsc raises TS1261 casing errors), so the pure model, helpers (wallBoxesIntersectSegment, wallCrossings, WALL_MODEL) live in wallModel.ts.
- Stage: the explorer panel offset uses camera.setViewOffset (image slides left by half of 360 px on desktop; up by 7% / 20% of the height for the mobile sheet's peek / half states, a guess at the sheet heights), not a camera move, so perspective and picking stay exact; dollyToCursor is off because a view offset would skew cursor-anchored zoom.
- Stage: orbit poses are viewport-aware (data/cameras.ts fitOrbitPose): narrow or panel-reduced viewports dolly out up to 3.4x so the footprint keeps fitting the width; portrait phones also swing the aerial / hero view towards frontal and higher. Eye level widens its lens on portrait screens (lookFov). Preset numbers for aerial, plan and hero were retuned for the 1440 x 900 + 360 px panel case; targets sit on the plinth's centre column so the turntable never swings the model.
- Stage: the mouse wheel is left to the page during the hero phase (camera-controls would preventDefault it and trap the page scroll); wheel dolly starts when the explorer is entered.
- Stage: the plinth is one merged outline (footprint + 1.5 ft margin, plus a rounded notch for the pickup apron) at a single height, so PickupZone can draw on y = 0.02 like everything else. Floors are one merged mesh per material (7 draw calls) with world-aligned procedural textures; the zone tint is mixed in sRGB (55% towards the zone colour); threshold strips are 3 x 0.5 ft just inside each zone-room door and fade with the zones layer.
- Stage: environment panels are plain meshes with Lightformer's material (so their colours can be damped between Day and Evening and the cube re-rendered only while easing); the key light is a south-west DirectionalLight whose shadow camera is re-fitted to the model every time the light moves.
- Stage: `?quality=low|high` in the URL pins the quality tier and disables the PerformanceMonitor (diagnostics); 'low' = 1024 shadow map refreshed every other frame, dpr 1.
- Walls: the teal cap is a separate 0.15 ft box on the visible top of every solid piece (same footprint as the wall); its albedo is the brand teal x0.62 because the top face takes the full key + overhead fill and would otherwise wash out to pale jade.
- Ceiling is a 0.4 ft slab resting ON the wall tops (underside at y = wallAnim.h, garden cut out and replaced by a glass skylight); it ghosts to 15% opacity while the camera is above that plane and is opaque below it. Recessed light panels sit on a small grid centred inside each space.
- Wall pieces beside an opening are stacked at the opening's head / sill heights (inner boxes carry no cap) so coplanar seams share vertices; wall + cap materials use polygonOffset to hide the 1 px creases between touching boxes.
