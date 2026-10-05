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

- `floorplan.png` was not present in `public/assets` when the build started (only logo-dark, logo-light, palette). The site is built from the authoritative LAYOUT SPEC; a stand-in `floorplan.png` is generated from the layout data by `scripts/make-floorplan.mjs` (it skips generation if a real `floorplan.png` is already there). Drop the real file in to replace it.

## Tech

- Pinned to React 18.3 / @react-three/fiber 8 / drei 9 / three 0.170 (the stack the brief names) with Vite 7, TypeScript 5.9 and Tailwind CSS 4 (CSS-first config).
