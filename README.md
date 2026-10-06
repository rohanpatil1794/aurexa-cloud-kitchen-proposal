# Aurexa 3D proposal: cloud kitchen + office

A client-facing pitch site by **Aurexa Design Consultants**: a walkable 3D model of a 3,000 sq ft commercial cloud
kitchen and office (a 60 × 50 ft footprint, 23 rooms), followed by a short written proposal. The visitor lands on a
slowly turning model, enters it, picks rooms, switches the four workflow layers and the safety layer on, drops to eye
level, and scrolls on into the proposal sections.

Everything is procedural: there are no GLB models, HDRIs, font files or network requests at runtime. The whole building
(walls, floors, equipment, signs, flows, safety markers) is generated from typed data in `src/data/`.

Stack: Vite 7, React 18, TypeScript 5.9, @react-three/fiber 8, drei 9, three 0.170, zustand 5, Tailwind CSS 4,
framer-motion 12. Static build, deployed on Vercel.

- [Quick start](#quick-start)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [How it fits together](#how-it-fits-together)
- [Deep links and URL parameters](#deep-links-and-url-parameters)
- [Changing things](#changing-things)
- [Equipment: kinds, the prim batcher and the kit](#equipment-kinds-the-prim-batcher-and-the-kit)
- [Camera and navigation](#camera-and-navigation)
- [Responsive layout](#responsive-layout)
- [Layers and modes](#layers-and-modes)
- [Performance and resilience](#performance-and-resilience)
- [Assets and brand](#assets-and-brand)
- [Configuration: placeholders to replace](#configuration-placeholders-to-replace)
- [Deploying](#deploying)
- [Browser support](#browser-support)
- [Known limitations](#known-limitations)

## Quick start

Node 22.x is what production builds with. Locally, Node 20.19+ or 22.12+ works (Vite 7's floor; see `engines` in
`package.json`).

```bash
npm install          # or `npm ci` for an exact install from package-lock.json
npm run dev          # http://localhost:5173 with hot reload
npm run build        # type check + production build into dist/
npm run preview      # serve dist/ at http://localhost:4173
```

In the dev build the console and the screenshot script can drive the app: `window.__store` is the zustand store
(for example `__store.getState().enterSpace()` or `.goRoom('kitchen')`), `window.__rig` is the camera-controls
instance and `window.__r3f` the r3f state. None of these exist in the production build.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 (host exposed, so a phone on the same network can open it). |
| `npm run build` | `tsc --noEmit`, then `vite build` into `dist/`. This is the Vercel build command: a type error fails the deploy. |
| `npm run preview` | Serves `dist/` (port 4173; add `-- --port 4174` to change it). |
| `npm run typecheck` | `tsc --noEmit` only. |
| `npm run validate` | Layout validator (9 sections): rooms on the 0.5 ft grid, rooms + circulation tile the 60 × 50 footprint exactly, every opening sits on a real wall, doors clear wall junctions, no overlapping openings, every room reachable from outside, wall geometry, the four flow routes (they cross walls only through doors, keep their lanes, and never run under equipment), and extinguisher coverage (every walk-through door has one within 10 ft, four in the kitchen). Exits 1 on any failure. |
| `npm run validate:equipment` | Equipment validator: every item's room exists, its footprint (rotation aware) lies inside the room, items do not overlap, and the 3 × 3 ft clear zone inside every door is empty. |
| `npm run validate:all` | Both validators. Run it after any change in `src/data/`. |
| `npm run check` | `validate:all` plus the full build. Run it before every push to `main` (which deploys). |
| `npm run assets` | Regenerates the favicons, the brand logo cuts, `public/og.png` and `public/assets/floorplan.png` from `brand-src/` and the layout data (see [Assets and brand](#assets-and-brand)). Idempotent. |
| `npm run shot` | Headless-Chrome screenshot helper (Playwright, drives the installed Chrome, no browser download). |

`npm run shot -- --out screenshots/aerial.png [--url http://localhost:5173] [--w 1440 --h 900 | --w 390 --h 844 --dpr 2]
[--wait 12000] [--wait2 4000] [--js "<code>"]... [--click "<css selector>"]... [--scroll "<selector>"] [--full] [--sw]`.
`--js` runs in the page, in order, for example `--js "__store.getState().enterSpace()"`. The first load of the dev
server is slow while modules compile, so give it `--wait 12000`. `--sw` forces software GL (the default uses the
machine GPU). The script prints console errors and exits with 2 when the page logged one. At most three screenshots
run at once on a machine (a lock folder in the OS temp directory). `screenshots/` is git-ignored.

## Project structure

```
index.html            Template: title and Open Graph tags are filled from src/config.ts; static boot splash
vite.config.ts        Plugins (react, tailwind, html-meta, preload-fonts), chunking, output to dist/ (assets in dist/static)
vercel.json           Framework, build, cache and security headers, noindex
DECISIONS.md          Every deviation from the brief and every non-obvious design call, grouped by topic
public/               Served as is: favicons, og.png, brand/ (logo cuts), assets/floorplan.png (the canonical plan)
brand-src/            Original logo-light.png, logo-dark.png, palette.png. Read by `npm run assets` only, never served
reference/            The client's original AI-drawn plan. Reference only: git-ignored, never served, built or read
scripts/              brand-assets.mjs, make-floorplan.mjs (+ lib/text-path.mjs: text to outlines), validate-layout.ts,
                      validate-equipment.ts, shot.mjs
src/
  main.tsx            Entry
  App.tsx             Page structure: top bar, sticky stage, proposal; deep links; Esc clears the selection
  config.ts           Client / kitchen names, hero copy, contact details, STAGE_SCROLL_VH (placeholders live here)
  store.ts            The one zustand store: phase, camera requests, selection, layers, modes, zoom steps
  index.css           Tailwind 4 theme tokens (brand colours), fonts, and the CSS for the UI and the sections
  data/               Pure TypeScript, no React or three. The single source of truth (below)
    layout.ts           Rooms, circulation, openings (doors), zones, wall constants
    types.ts            RoomId, EquipItem, PresetId ...
    roomCopy.ts         Purpose line and design notes for every room (the info cards)
    cameras.ts          Camera presets and hero pose, room overview / eye-level poses (EYE_VIEWS), fitFrame,
                        isSheetLayout (the one responsive rule), sheet and panel constants
    flows.ts            The four workflow routes as plan polylines, FLOW_PATTERNS
    safety.ts           Safety points generated from the layout and the equipment footprints, extinguisher coverage,
                        north-arrow spots
    equipment/          Equipment items per room group (position, size, kind, label)
  lib/
    prims.ts            Primitive batcher (instanced meshes, shadow and detail buckets)
    kit.ts              Shared silhouettes (bench, bin, crate, stool, plant, tree, fridge ...)
    palette.ts          Brand, scene, zone and flow colours
    textTexture.ts      Canvas text (sign and label fonts are loaded once, redrawn once)
    deepLink.ts         Hash deep links (/#safety, /#stage)
    hooks.ts            useIsMobile, useSheetLayout, isMobileNow
    wallAnim.ts         Shared animated wall height (read per frame)
  scene/              Everything inside the <Canvas>
    LazyStage.tsx       Dynamic import of Stage; falls back to the floor plan if the chunk cannot load
    Stage.tsx           The one Canvas: WebGL probe, fallback, context loss, ReadyGate
    RenderGovernor.tsx  RenderGovernor (frameloop 'demand', pixel-ratio ladder) and BootGate (async shader compile)
    Scene.tsx           Composes the scene in boot groups and late groups
    CameraRig.tsx       drei CameraControls driven by the store; zoom; eye-level crane moves. cameraPath.ts: scroll stub
    stageLayout.ts      The free area of the screen (below the top bar, beside the panel / above the sheet, beside the hero text)
    Lighting.tsx        Environment dome, key and fill lights, Day / Evening, shadow-map cache. lightState.ts: shared eased state
    EveningGlow.tsx     Evening light pools and lamp halos
    Plinth.tsx, Floors.tsx, floorTextures.ts, floorPainters.ts, floorWorker.ts   Base slab and floors (textures painted in a worker)
    building/           Walls (wallModel.ts is the pure geometry model), ceiling, the Staff Entrance logo door
    equipment/          Equipment, PrimBatch, registry, rng.ts, signAtlas.ts, and kinds/ (one builder per kind; kindKit.ts)
    outside/            Delivery pickup zone, canopy and scooters
    interaction/        Room picking and the selection outline
    layers/             Labels (+ labelsLayout, labelsText), Flows (+ flowsGeometry, flowsTexture), Safety, Dimensions, NorthArrow
  ui/                 TopBar, Hero, LoadingSplash, WebGLFallback, CubeMotif, nav.ts (section scrolling), useMedia.ts,
                      ExplorerUI, explorer/ (Desktop panel, Mobile sheet, tabs, InfoCard, RoomBar, BackChip, ProposalChip,
                      ZoomControls, Legends, focus.ts, actions.ts), legends/ (flow and safety keys)
  sections/           The five proposal sections and the footer
```

The wall model is `wallModel.ts`, not `walls.ts`: on Windows and macOS `walls.ts` and `Walls.tsx` collide
(see DECISIONS.md).

## How it fits together

Coordinates everywhere: **1 unit = 1 ft**, origin = the north-west corner of the footprint, +x east, +z south, +y up,
top of the plan = north.

```
 src/data/  (pure data)
   layout.ts   roomCopy.ts   cameras.ts   flows.ts   safety.ts   equipment/*
      │               │            │          │          │            │
      ├───────────────┴────────────┴──────────┴──────────┴────────────┤
      ▼                                                                ▼
 scripts/validate-*.ts            scripts/make-floorplan.mjs      src/scene + src/ui + src/sections
 npm run validate:all             -> public/assets/floorplan.png   (everything the visitor sees)

 index.html -> main.tsx -> <App>                  (useDeepLink, Esc)
   <TopBar/>                                      fixed bar, nav, mobile menu
   #stage-wrap   (STAGE_SCROLL_VH svh tall)
     #stage      sticky, full viewport
       <LazyStage/> --import()--> <Stage/> -> <Canvas frameloop="demand">
                                                ReadyGate, RenderGovernor, Scene, BootGate
         Scene, boot groups:  Lighting + CameraRig | Plinth, Floors, Walls | Equipment | LogoDoor, PickupZone, NorthArrow
         Scene, late groups:  RoomPicking + Labels | Ceiling | Flows | Safety | Dimensions | EveningGlow
       <Hero/> <ExplorerUI/> <LoadingSplash/>     DOM overlays on top of the canvas
   <Proposal/>   Vision, Zones & Flow, Safety, Design Language, Next steps, Footer

 src/store.ts (zustand) is the only shared state: scene, UI and sections all read and write it.
```

`src/data/layout.ts` is the **single source of truth for geometry**. Walls, floors, ceilings, labels, the room list in
the panel, the info cards, camera poses, flow routes, safety points, the generated floor plan, the validators and the
numbers quoted in the proposal copy (room counts, areas, door counts) are all derived from it. Nothing is typed twice.
That is why a room can be moved in one place and the rest follows.

The page is one long scroll. The 3D stage is a sticky full-viewport section whose wrapper is `STAGE_SCROLL_VH` tall
(100 today), and the light proposal sections scroll up over it. One persistent `<Canvas>` serves the hero and the
explorer; entering the space changes the store `phase` from `hero` to `explorer`, which opens the panel (or the sheet)
and flies the camera to the aerial view. The phase starts as `loading` and becomes `hero` once the scene has drawn its
first frames.

## Deep links and URL parameters

The only things the app reads from the URL (`src/lib/deepLink.ts`, `src/scene/Stage.tsx`):

| URL | What it does |
| --- | --- |
| `/#vision`, `/#zones-flow`, `/#safety`, `/#design-language`, `/#contact` | Opens scrolled to that section, flush under the top bar. Any element id on the page works the same way (`/#proposal` is the start of the proposal). The loading splash is released at once, because the 3D stage is off screen; the scene finishes building behind the page and draws when the reader scrolls up to it. |
| `/#stage` | Opens the explorer (aerial view, Rooms tab). If the scene is still starting it waits for the hero and then enters. |
| `?quality=low` or `?quality=high` | Pins the render quality (lowest or highest pixel-ratio tier) and switches the adaptive stepping off. For diagnosis. Read once at load; combines with a hash (`/?quality=low#safety`). |

There are no parameters for rooms, layers or camera poses. The hash is checked once, when the page mounts. The top
bar writes it (`history.replaceState`) when a nav link is clicked (Explorer writes `#stage`), not while scrolling;
clicking the logo clears the hash and keeps the query string. A malformed or unknown hash is ignored.

## Changing things

After any edit in `src/data/`, run `npm run validate:all`. After editing rooms, doors, zone colours or the layout in
any way, also run `npm run assets` so `floorplan.png` matches the model again.

**A room** (size, position, name, group, floor, glazing): edit its `room(...)` row in `ROOMS` in
`src/data/layout.ts`. The rooms and the `CIRCULATION` rectangles must tile the 60 × 50 footprint exactly with no gap
or overlap (snap to 0.5 ft); `npm run validate` tells you where they do not. Move the doors that sit on the walls you
touched and the equipment inside the room. A new room also needs its id in `RoomId` (`src/data/types.ts`), an
entry in `ROOM_COPY` (`src/data/roomCopy.ts`) and its label text in `LABEL_LINES` and `LABEL_SHORT`
(`src/scene/layers/labelsText.ts`).

**A door**: edit `OPENINGS` in `src/data/layout.ts`. `op(id, kind, wall, at, centre, [roomA, roomB], { w, label })`,
where `wall: 'h'` is an east-west wall at z = `at`, `wall: 'v'` a north-south wall at x = `at`, and `centre` is the
position along that wall. A door on a wall shared by two rooms is **one** opening, not two. Walls, flows, safety and
the floor plan all follow. Doors must clear wall junctions and keep a 3 × 3 ft clear zone inside (the validators
check both).

**An equipment item**: add or edit a row in `src/data/equipment/*.ts` (`prep.ts`, `production.ts`, `support.ts`,
`people.ts`, `kitchenLine.ts`, `kitchenIslands.ts`). An item is `{ id, room, kind, x, z, w, d, h?, rot?, label?, color?, props? }`;
the local `put(...)` helper in the file takes the **centre** instead of the corner. Its parameter order differs
between files (`production.ts` takes the room first, `prep.ts` and `support.ts` take the id first), so check the
signature at the top of the file you are editing. `rot` is in degrees about the footprint centre (0 faces south,
90 east, 180 north, 270 west). Flags in `props`: `overhead`, `flat`, `overlap`, `outside`, `door` (see the header of
`scripts/validate-equipment.ts`). The new item must stay inside its room and out of the door zones.

**A new kind of equipment**: write a builder `(b: PrimBuilder, item: EquipItem) => void` under
`src/scene/equipment/kinds/` and register it with `registerKinds({ 'group.name': builder })`. If you add a file,
import it in `kinds/index.ts` (or in the group file that already registers its siblings). See the next section.

**Copy**:

- Names, hero text and contact details: `src/config.ts`.
- Room purposes and design notes (the info cards): `src/data/roomCopy.ts`. Keep it free of invented figures: the only
  numbers allowed are facts of the plan. British spelling; the one exception is the dishwashing stage name
  "Sanitize" (`DISH_STAGES` in `layout.ts`).
- Proposal sections: `src/sections/*.tsx`. The numbers in them come from `layout.ts` and `safety.ts`.

**A zone colour**: `ZONE_COLORS` in `src/lib/palette.ts` (the zone table in `layout.ts` reads it). Workflow colours
are `FLOW_COLORS` in the same file. Run `npm run assets` afterwards: the floor plan uses the same colours.

**A flow route**: edit the polylines in `src/data/flows.ts` (points are `(x, z)` in feet, direction = point order).
Two flows sharing a corridor run in their own lane `FLOW_RIBBON.pitch` apart. `npm run validate` section 8 checks that
every route crosses walls only through doors, keeps its lanes, passes the five dishwashing stages in order, and never
runs under floor-standing equipment, so it will tell you when a moved item or door breaks a route. Each flow also has
a pattern (`FLOW_PATTERNS`) that the 3D ribbons, the legends and the proposal keys all draw.

**A safety rule**: `src/data/safety.ts`. Points are generated, not typed: small policy tables say what goes where (per
room, per door, per corridor) and the code finds a free spot on solid wall, clear of doors, glazing and equipment. So
when equipment moves, the markers move with it. A coverage pass then adds extinguishers until every walk-through door
has one within `EXTINGUISHER_REACH` (10 ft); `npm run validate` section 9 re-checks it independently.

**A camera preset**: `PRESETS` and `HERO_POSE` in `src/data/cameras.ts` (the Views tab lists `PRESET_LABELS`). An orbit
pose is a position and target plus a `frame`: the world points that must stay on screen (see
[Camera and navigation](#camera-and-navigation)). Eye-level vantage points that are not "just inside the longest door"
are hand-placed in `EYE_VIEWS` in the same file.

## Equipment: kinds, the prim batcher and the kit

The 3D equipment is not modelled in a DCC tool. Each item in `src/data/equipment/*` names a **kind**
(`'prep.bench'`, `'kitchenLine.fryer'`, ...). `src/scene/equipment/registry.ts` maps a kind to a builder function.

- A **builder** draws one item with primitives into a `PrimBuilder` (`src/lib/prims.ts`): `box`, `cyl`, `cone`, `sph`,
  `pipe`, `sign` and `frame` (a nested local frame). Inside a builder the origin is the **centre of the item's footprint
  on the floor**, `+x` is the item's right, `+z` its front, angles are in degrees, and a part's `y` is its bottom.
  Materials are a small set: `steel`, `matte`, `gloss`, `glass`, `emissive`, `brass`. Large stainless faces use `gloss`
  with a light satin colour, because the metallic `steel` material only reflects the dark stage and reads black; dark
  paint colours cannot be relit, so keep device bodies at mid slate or lighter (`SLATE` in `kindKit.ts`).
- The **prims batcher** (`buildBatch`) merges every primitive of every item into instanced meshes, one per
  geometry, detail level, material and shadow bucket (per-instance colour), so the whole building's dressing stays at
  a few dozen draw calls. Parts under 0.3 ft do not cast shadows unless a part says `shadow: true`; round details under
  0.25 ft radius use cheaper 10-sided geometry. `PrimBatch` renders the result and the text signs; the `Equipment` layer
  toggles it as a whole.
- **Signs** (`sign()`) are not one plane each: `src/scene/equipment/signAtlas.ts` packs every sign of a builder into a
  canvas atlas and merges them into one mesh per material class (self-lit or lit, one or two sided), alpha-to-coverage
  cut-outs on the MSAA canvas. The Safety layer and the north arrow use `getTextTexture` planes instead, because they
  fade with their layer and cut-outs cannot.
- The **kit** (`src/lib/kit.ts`) holds shared silhouettes (bench, bin, crate, stool, round table, plant, tree, wall
  shelf, fridge and more) and the stainless / charcoal / foliage colour constants. Use it before drawing something
  twice. `kinds/kindKit.ts` holds what every kind file needs: `num` / `str` (item props with a fallback), `tint`, and the
  `INK`, `BLACK` and `SLATE` colours. Group-specific helpers live next to their builders (`prepKit.ts`, `supportKit.ts`,
  `productionParts.ts`, `kitchenLineParts.ts`, `kitchenIslandsParts.ts`).
- **Randomness** comes from `src/scene/equipment/rng.ts`: `rng(seed)` (mulberry32, a number or a string such as the item
  id), plus `between` and `pick`. Never `Math.random`: scatter, stock and planting must look the same on every load.

Builders run once, when the Equipment group mounts, so keep them allocation-light and deterministic. `kinds/supportExit.ts`
is a good small example (the Emergency Exit Lobby: escape-route marking, an apron rail and a KEEP CLEAR plate, reusing
the staff and receiving kinds for the boot mat, bench and hazard strip).

## Camera and navigation

One camera, driven through the store (`src/store.ts`). Components never move it directly.

| Store API | Meaning |
| --- | --- |
| `flyTo(position, target, { mode?, instant?, preset?, frame? })` | Fly (or jump, when `instant` or reduced motion) to any pose. A new request id means "go here". `mode: 'orbit'` is the normal orbit / dolly / pan; `'look'` is eye level (the orbit target sits a hair in front of the camera, so dragging looks around in place). |
| `goPreset('aerial' \| 'plan' \| 'kitchen' \| 'entrance')` | Fly to a preset in `data/cameras.ts`. |
| `goRoom(id, 'overview' \| 'eye')` | Select a room and fly to its 3/4 overview or its 5.5 ft eye-level pose. `clearSelection()` returns to the aerial view; `stepRoom(±1)` walks through the rooms in panel order. |
| `enterSpace()` | The hero call to action: switches `phase` to `explorer`, opens the panel, flies to the aerial view. |
| `setAutoOrbit(bool)` | The slow turntable of the hero. It stops when the visitor drags the model and resumes 3 s after they let go (hero only). |
| `stepZoom(±1)` | One zoom step, the same as the on-screen + / - buttons. |

**Framing.** Every orbit pose carries a `frame`: world points that must stay on screen. `fitFrame` (`data/cameras.ts`,
pure perspective maths) dollies the camera along the authored direction until those points fit the **free area** of the
stage, and `CameraRig` then shifts the image with `camera.setViewOffset` so the subject is centred in that area (not a
camera move, so perspective and picking stay exact). The free area comes from `src/scene/stageLayout.ts`: in the explorer
it is the stage below the top bar, left of the 360 px panel on the panel layout, above the sheet on the sheet layout; in
the hero it is the larger area beside or above the measured headline. So one preset works on a 1920 px desktop, a tablet
and a phone, and a resized window refits (150 ms debounce) unless the visitor has orbited or zoomed since the camera last
went somewhere. Portrait screens swing the aerial towards a frontal, higher view; eye level widens its lens on them.

**Behaviour worth knowing.** Eye level raises the walls to full height by itself and puts the visitor's wall mode back
when the camera leaves. Flights into, between and out of eye level are crane moves (up over the walls, straight down onto
the spot), so they never cut through geometry. A finger orbits at half the mouse speed and stops 28° above the horizon (a
mouse 10°). The Hot Kitchen preset looks down more steeply in full-height mode.

**Controls.** Everything is also listed in the Views tab, worded for the visitor's input device.

| Input | Orbit views | Eye level |
| --- | --- | --- |
| Drag | Orbit | Look around |
| Right-drag, two-finger drag | Pan | (no pan) |
| Ctrl / Cmd + scroll over the model, trackpad pinch, touch pinch, the + / - buttons | Zoom (dolly, 12 ft to 220 ft) | Zoom the lens (0.75× to 2.2×) |
| Plain mouse wheel | Scrolls the page (always: the stage is a sticky section) | Scrolls the page |

A Ctrl + scroll notch is 1.2×, a button press 1.3×, a pinch is continuous; zoom glides for 0.25 s and jumps under
reduced motion. The + / - pill (`ui/explorer/ZoomControls.tsx`) sits under the Back chip at the top-left.

**Scroll walkthrough (stub, no path authored yet).** The camera can be driven along a path by scroll:

```ts
import { cameraPath } from './scene/cameraPath';
cameraPath.start({ keyframes: [{ position: [x, y, z], target: [x, y, z] }, ...] }); // rig takes over, user input off
const unbind = cameraPath.bindScroll(document.getElementById('stage-wrap')!);        // progress follows scroll
// ...later
unbind(); cameraPath.stop();                                                          // hand control back
```

`cameraPath.ts` wraps the store fields `cameraPath` and `cameraPathProgress` (0 to 1) and holds the Catmull-Rom
sampler the rig uses. To give the walkthrough room to scroll, raise **`STAGE_SCROLL_VH`** in `src/config.ts` (the
height of `#stage-wrap` in viewport heights; the stage is sticky, so 400 means three extra screens of travel).

## Responsive layout

One rule decides the explorer's layout, `isSheetLayout(width, height)` in `src/data/cameras.ts`, applied to the size of
the `#stage` box the canvas fills:

| Layout | When | What the visitor gets |
| --- | --- | --- |
| **Bottom sheet** | width < 768 px, or portrait (height ≥ width) up to 1100 px wide: phones and portrait tablets | A draggable sheet (peek 76 px / half 52% / full 88%) with the Rooms, Layers and Views tabs; the Back and Proposal chips, the legend key and the + / - buttons float around it. |
| **Side panel** | everything else: desktops and landscape tablets (from 1024 × 768) | A 360 px glass panel on the right; the room card and legend key bottom-left; Back chip and + / - top-left. |
| **Landscape drawer** | the panel layout on a screen at most 500 px tall: landscape phones 768 px or wider (844 × 390) | The panel folds behind an Explore toggle and the room card becomes the slim room bar. A landscape phone narrower than 768 px (667 × 375) gets the sheet. |

The camera framing (`stageLayout.explorerFree`), the label layer's keep-out areas and the explorer UI (`useSheetLayout`
in `lib/hooks.ts`) all call that one function, so they cannot disagree. `useIsMobile` (width < 768) is separate: it
only drives the top bar's burger menu and, with `isMobileNow` (which also counts touch screens), the pixel-ratio and
shadow-map choices. At eye level the room card is replaced by the room bar on every layout. Touch screens get 44 px
targets in the explorer.

**Compact labels.** When the model a stage can show is small (`min(free width, 1.3 × free height) < 720 px`, so phones in
either orientation and squat windows), room labels use one short word per room in 9 px type, and a room much smaller on
screen than its pill shows a zone-coloured dot instead; hover, tap or selection turns it back into the pill. Pills are
decluttered on screen around the panel, sheet, room card, chips, legends and the north arrow, and never cover another
room's click target.

## Layers and modes

Toggled from the Layers tab of the explorer, or from code with `setLayer(id, on)` / `toggleLayer(id)`:

| Layer | Default | Shows |
| --- | --- | --- |
| `raw`, `staff`, `dirty`, `orders` | off | The four animated workflow ribbons (raw material, staff, dirty / utensils / waste, orders out). Each also has a pattern (single chevron, double, dashed, solid) so they stay apart without colour. |
| `safety` | off | Extinguishers, smoke and heat detectors, LPG detectors, the gas shut-off, emergency lights and exit signs. |
| `zones` | on | Floor tint by diet zone (Veg, Jain, Vegan, Non-Veg, plus the blue content corner). |
| `labels` | on | Room name pills (one DOM layer, decluttered on screen; one-word pills and dots on small stages). |
| `dimensions` | off | The 60 ft and 50 ft dimension lines. (The north arrow is always on.) |
| `equipment` | on | All dressing. Off shows bare rooms. |

Modes: `setWallMode('dollhouse' | 'full')` (walls 3.5 ft or the full 10 ft, animated, with the ceiling slab) and
`setLighting('day' | 'evening')` (key light, environment and the lamps ease between the two; Evening adds warm light
pools and lamp halos).

## Performance and resilience

How the 3D stage gets to the screen and stays cheap. The reasons and measurements are in DECISIONS.md (Rendering and
performance).

- **Lazy 3D.** `App` mounts `LazyStage`, which loads `Stage` with a dynamic `import()`. The first paint needs only the
  `vendor` (React) and `index` chunks, about 140 KB gzipped; `three`, r3f, drei, camera-controls and the scene (about 330 KB
  gzipped more) load afterwards, in parallel, plus a small worker for the floor textures. `index.html` carries a static
  copy of the loading splash, so even a cold start on a slow phone is dark and branded from the first paint. If the 3D
  chunk cannot be fetched, the floor-plan fallback shows and the splash is released.
- **Staged boot (`Scene`, `BootGate`).** WebGL is probed once after first paint with a throwaway context. The scene then
  mounts in four boot groups, one browser task each (light + camera; plinth, floors, walls; equipment; entrance, pickup,
  north arrow). Each group starts its shader programs linking in the GPU process while the next is built; `BootGate`
  then waits for the links (`KHR_parallel_shader_compile`), reads each program's tables and uploads the big textures in
  10 ms slices, and only then lets the render loop start, so the splash never freezes on one long task. After three real
  frames the splash fades and the hero is up. What the hero cannot show (labels and picking, ceiling, flows, safety,
  dimensions, evening lamps) mounts afterwards, one task each; if the visitor reaches for one first, it mounts on the spot.
- **Render on demand (`RenderGovernor`).** The canvas runs `frameloop="demand"`. Frames are drawn for 3 s after any store
  change and 3.6 s after the camera moves, continuously while a flow layer, the safety layer or the hero turntable
  animates, and at about 30 fps for a selected room's outline pulse. Otherwise nothing is drawn, so a still explorer
  costs no CPU or GPU. The loop is off entirely while the stage is off screen (80 px margin), the tab is hidden, or the
  shaders are still compiling.
- **Pixel-ratio ladder.** Quality is a pixel ratio, stepped by the governor: tier 0 is the device ratio clamped to 1.5-2
  on desktop (1-1.5 on touch screens), then 1.25, then 1, never above 8.5 M rendered pixels. It steps down after two slow
  windows (mean frame over 27 ms) of a continuous run and probes back up after 25 s. `?quality=low` pins the last tier,
  `?quality=high` the first, both disabling the stepping.
- **Cached shadows and lights.** The key light's shadow map (2048 px, 1024 on touch) is rendered only when a caster can
  have changed: wall height moving, the Equipment layer toggling, the Day / Evening ease, a context restore. The
  environment cube renders once and again only while Day / Evening eases. Small parts do not cast shadows.
- **Floors.** The floor detail textures are painted in a module worker (the main-thread painters remain as the fallback).
- **WebGL fallback and context loss.** If WebGL is missing, context creation fails, or the 3D chunk cannot load,
  `WebGLFallback` becomes the whole stage (the hero and explorer step aside) and shows the generated floor plan (also
  the download link) and a "Continue to the proposal" button; the rest of the page works as normal. If a lost context
  does not come back within 4 seconds the same fallback shows; if it does, the environment cube and shadow map are
  redrawn.
- **Reduced motion.** `prefers-reduced-motion` is followed live: camera moves jump instead of fly, the turntable is off,
  walls, layer fades, Day / Evening, labels and the north arrow snap, flows and safety pulses hold still (and no longer
  keep frames coming), hero and panel transitions become simple fades, CSS animations are cut to nothing and smooth
  scrolling is off.
- **Phones.** Touch devices get the 1024 px shadow map and a pixel ratio of at most 1.5. While the hero is up the canvas
  lets vertical swipes scroll the page and horizontal drags orbit; in the explorer the canvas owns every touch, so a
  Proposal chip leads on to the proposal.

## Assets and brand

- `npm run assets` regenerates, from `brand-src/` and `src/data/layout.ts`: `public/favicon.*`, `apple-touch-icon.png`,
  the transparent logo cuts in `public/brand/`, `public/og.png` (1200 × 630) and `public/assets/floorplan.png`
  (2400 × 2000, north up, drawn from the layout data so it matches the 3D model exactly). The logo cuts come from an
  exact two-background matte of `logo-light.png` / `logo-dark.png`, so they sit on any backdrop without a halo.
- **`public/assets/floorplan.png` is the canonical plan.** It is the download link and the WebGL fallback image. It is
  generated, never hand-edited.
- **Folders that are not served.** `brand-src/` (tracked) holds the original logos and palette sheet (`logo-light.png`,
  `logo-dark.png`, `palette.png`); they used to sit in `public/` and moved out so nothing source-only is published; they
  are inputs to `npm run assets`. `reference/` (git-ignored, so a clean checkout does not have it) holds the client's
  original AI-drawn plan, `floorplan-original.png`. It is reference only: nothing in the site, the scripts or the build
  reads, references or ships it, and the generated plan above replaces it everywhere.
- Palette (Tailwind utilities `bg-teal`, `text-orange`, `bg-cream`, ...): teal `#1d6866` primary, orange `#cb622a`
  for the highlight, selection and key actions, cream `#f6e3c2` and sand `#edcb95` warm surfaces, olive `#8f854a`
  plants, greys `#77838d` `#9aa7b2` `#c7d0d8`, teal tints `#5f9392` `#8cc1c0`. Zone colours: veg `#5FAE6B`,
  jain `#F2C94C`, vegan `#8E5BC2`, non-veg `#D64545`, creator `#5AA9E6`. Orange buttons carry dark ink text, not white
  (white on `#cb622a` is 3.9:1).
- Fonts: Public Sans, Latin subset, **woff2 only** (declared in `src/index.css`, bundled from `@fontsource`; no
  network). The canvas sign textures redraw once the font has loaded.

## Configuration: placeholders to replace

Everything client-specific is in **`src/config.ts`**. The placeholders in square brackets are deliberate and must be
replaced before the link goes to the client.

| Export | Placeholder | Appears in |
| --- | --- | --- |
| `CLIENT_NAME` | `Cloud Kitchen` | Hero subline, footer ("Prepared for"), page description and link preview |
| `KITCHEN_NAME` | `[Kitchen Name]` | Tab title, link preview, Vision copy, the Next steps mail subject, the backdrop sign in the Content Creator Corner, `og.png` |
| `CONTACT.person`, `.email`, `.phone`, `.address`, `.hours` | `[Contact Name], [Role]`, `hello@aurexa.example`, `+00 00000 00000`, `[Studio address line 1], [City]`, `[Opening hours]` | Next steps band (mailto and tel links are built from email and phone) |

`SITE_TITLE` and `SITE_DESCRIPTION` are built from those names and are injected into `index.html` (title, description,
`og:*` and `twitter:*` tags) by the `html-meta` plugin in `vite.config.ts`, in dev and in the build. **`public/og.png`
has the kitchen name drawn into the picture**, so after changing `KITCHEN_NAME` run `npm run assets` and commit the
new `og.png`.

## Deploying

The site is a static build on Vercel: project **`aurexa-cloud-kitchen-proposal`**, under the project owner's Vercel
account, connected to the GitHub repository.

| Event | Result |
| --- | --- |
| Push to `main` | **Production** deployment, automatically. Never leave `main` broken: run `npm run check` first (`npm run build` type-checks, and a type error fails the deploy). |
| Push to any other branch, or a pull request | A **preview** deployment with its own URL. |

- **Build.** `vercel.json` selects the **Vite** framework with build command `npm run build` and output directory
  `dist`; install is Vercel's default (`npm install`, which respects `package-lock.json`). There are no required
  environment variables. There is no CLI step: the GitHub integration does the deploy (a local `vercel link` writes
  `.vercel/`, which is git-ignored).
- **Node version.** Vercel reads `engines.node` in `package.json` (`^20.19.0 || ^22.12.0`) and it **overrides the Node.js
  Version in the project settings**: changing the dashboard has no effect while `engines` is set. The range is
  deliberately capped below 23, so Vercel resolves it to the newest 20 / 22 it supports, which is **22.x**, and a future
  Node major cannot change the build unannounced. To move to another Node, change `engines` (and check the Vite
  release notes), not the dashboard. If a deploy ever fails on an engine error, look here first.
- **Absolute `og:image`.** Crawlers (WhatsApp, LinkedIn, Slack) do not resolve a relative image URL. The build makes
  `og:image` and `twitter:image` absolute from `SITE_URL` if set, else from Vercel's `VERCEL_PROJECT_PRODUCTION_URL`
  (a system variable exposed to builds by default; previews therefore also point at the production domain). With a
  custom domain, set `SITE_URL=https://your-domain.example` in the project's environment variables and redeploy. When
  neither variable exists (a local build) the tags stay `/og.png` and the build prints a warning. Link previews are
  cached by the platforms: refresh them with LinkedIn's Post Inspector or Facebook's Sharing Debugger.
- **Not indexed.** `index.html` has `<meta name="robots" content="noindex">` and `vercel.json` sends
  `X-Robots-Tag: noindex, nofollow`. Remove both to allow search engines. Vercel's Deployment Protection (project
  settings) is separate and controls who can open previews and, if enabled, production: check it before sending a
  preview link to the client.

What `vercel.json` sets:

- Caching: `/static/*` (fingerprinted JS, CSS, fonts and the floor worker) for a year, `immutable`. The fingerprinted
  files go to `dist/static` on purpose: `/assets` holds the un-hashed `floorplan.png`, which must stay revalidated.
  `/`, `/index.html` always revalidate; `/assets/*`, `/brand/*`, the favicons and `og.png` use a one-hour cache.
- Security headers: a Content-Security-Policy limited to the site's own origin (inline styles allowed, `blob:` and
  `data:` for textures, `worker-src 'self' blob:`, no third-party anything), `X-Content-Type-Options`,
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin` and a `Permissions-Policy` with the
  sensor and payment APIs switched off. If the proposal must be embedded in another site, relax `X-Frame-Options` and
  `frame-ancestors`. If you add any third-party script, font, image host or analytics, extend the CSP in the same file
  (the Vercel preview toolbar, which loads from `vercel.live`, is blocked by it on preview deployments; that is harmless).
- No rewrites or redirects: the site is one page with hash links, so any other path is Vercel's 404.

## Browser support

Current Chrome and Edge (111+), Safari (16.4+, iOS 16.4+) and Firefox (128+): the floor set by Tailwind CSS 4, with
WebGL 2 required for the 3D view (three 0.170). The build targets ES2022. Without WebGL or with hardware acceleration
off, the visitor gets the floor-plan fallback and the full proposal text. The site was developed and checked in
Chromium (Chrome on Windows, desktop and phone-sized viewports); Safari and Firefox follow from the standards used and
have not been tested here (Safari's trackpad pinch goes through gesture events, which is also untested), so test an
iPhone and a Mac before the pitch.

## Known limitations

- **Placeholders.** The client name, kitchen name and contact details in `src/config.ts` are placeholders (see above).
  `og.png` shows the placeholder name until `npm run assets` is re-run.
- **The scroll walkthrough is a stub.** The camera-path API is wired end to end, but no path is authored and
  `STAGE_SCROLL_VH` is 100.
- **Dressing is stylised, not CAD.** Equipment is built from primitives and sized to read at dollhouse scale (for
  example the toilet cubicles are narrower than real ones, and the European island is shorter than the original
  brief). Every such call is one line in `DECISIONS.md`. The layout validators check clear zones and routes, not
  building-code compliance.
- **No invented numbers.** The site quotes only figures derived from `src/data/layout.ts` and `src/data/safety.ts`. It
  makes no claims about throughput, cost or timelines.
- **Phones.** Touch devices get a lighter shadow map and a lower pixel ratio, and the governor steps the pixel ratio
  down further when frames are slow, but a low-end phone can still be sluggish in full-height mode with every layer on.
- **Cross-browser testing** is limited to Chromium (see Browser support).
- **Labels** on small stages are one-word pills and dots, shifted to avoid overlaps and tied to their room by a thin
  stem, so a pill may not sit exactly over its room.
- **Two layers still use older width-only rules.** The dimension pills and the north arrow's compact resting spot test
  the stage width alone instead of the shared layout / compact rules, so on portrait tablets and landscape phones they
  may sit slightly differently from the labels around them.
- **Static only.** There is no backend, form, analytics or CMS. The contact band uses `mailto:` and `tel:` links.
