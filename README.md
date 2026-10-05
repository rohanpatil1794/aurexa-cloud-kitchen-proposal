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
- [Changing things](#changing-things)
- [Equipment: kinds, the prim batcher and the kit](#equipment-kinds-the-prim-batcher-and-the-kit)
- [Camera and navigation](#camera-and-navigation)
- [Layers and modes](#layers-and-modes)
- [Performance and resilience](#performance-and-resilience)
- [Assets and brand](#assets-and-brand)
- [Configuration: placeholders to replace](#configuration-placeholders-to-replace)
- [Deploying to Vercel](#deploying-to-vercel)
- [Browser support](#browser-support)
- [Known limitations](#known-limitations)

## Quick start

Needs Node 20.19+ or 22.12+ (Vite 7).

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
| `npm run build` | `tsc --noEmit`, then `vite build` into `dist/`. This is the Vercel build command. |
| `npm run preview` | Serves `dist/` (port 4173; add `-- --port 4174` to change it). |
| `npm run typecheck` | `tsc --noEmit` only. |
| `npm run validate` | Layout validator: rooms on the 0.5 ft grid, rooms + circulation tile the 60 × 50 footprint exactly, every opening sits on a real wall, doors clear wall junctions, no overlapping openings, every room reachable from outside, wall geometry, and the four flow routes (they cross walls only through doors, keep their lanes, and never run under equipment). Exits 1 on any failure. |
| `npm run validate:equipment` | Equipment validator: every item's room exists, its footprint (rotation aware) lies inside the room, items do not overlap, and the 3 × 3 ft clear zone inside every door is empty. |
| `npm run validate:all` | Both validators. Run it after any change in `src/data/`. |
| `npm run check` | `validate:all` plus the full build. Run it before every commit. |
| `npm run assets` | Regenerates the favicons, the brand logo cuts, `public/og.png` and `public/assets/floorplan.png` (see [Assets and brand](#assets-and-brand)). Idempotent. |
| `npm run shot` | Headless-Chrome screenshot helper (Playwright, drives the installed Chrome, no browser download). |

`npm run shot -- --out screenshots/aerial.png [--url http://localhost:5173] [--w 1440 --h 900 | --w 390 --h 844 --dpr 2]
[--wait 9000] [--wait2 3500] [--js "<code>"]... [--click "<css selector>"]... [--scroll "<selector>"] [--full] [--sw]`.
`--js` runs in the page, in order, for example `--js "__store.getState().enterSpace()"`. The first load of the dev
server is slow while modules compile, so give it `--wait 9000`. The script prints console errors and exits with 2 when
the page logged one. At most three screenshots run at once on a machine (a lock folder in the OS temp directory).
`screenshots/` is git-ignored.

## Project structure

```
index.html            Template: title and Open Graph tags are filled from src/config.ts; static boot splash
vite.config.ts        Plugins (react, tailwind, html-meta, preload-fonts), chunking, output folders
vercel.json           Framework, cache and security headers, noindex
DECISIONS.md          Every deviation from the brief and every non-obvious design call, grouped by topic
public/               Served as is: favicons, og.png, brand/ (logo cuts), assets/floorplan.png
brand-src/            Final brand sources (logo-light.png, logo-dark.png, palette.png). Read by `npm run assets` only
reference/            The client's original AI-drawn plan. Reference only, git-ignored, never served or built
scripts/              brand-assets.mjs, make-floorplan.mjs, validate-layout.ts, validate-equipment.ts, shot.mjs
src/
  main.tsx            Entry
  App.tsx             Page structure: top bar, sticky stage, proposal
  config.ts           Client / kitchen names, hero copy, contact details, STAGE_SCROLL_VH (placeholders live here)
  store.ts            The one zustand store: phase, camera requests, selection, layers, modes
  index.css           Tailwind 4 theme tokens (brand colours), fonts, and the CSS for the UI and the sections
  data/               Pure TypeScript, no React or three. The single source of truth (below)
    layout.ts           Rooms, circulation, openings (doors), zones, wall constants
    roomCopy.ts         Purpose line and design notes for every room (the info cards)
    cameras.ts          Camera presets, room overview and eye-level poses, viewport fitting
    flows.ts            The four workflow routes as plan polylines
    safety.ts           Safety points, generated from the layout and the equipment footprints
    equipment/          Equipment items per room group (position, size, kind, label)
  lib/                prims.ts (primitive batcher), kit.ts (shared silhouettes), palette.ts, textTexture.ts, hooks, deepLink.ts
  scene/              Everything inside the <Canvas>
    Stage.tsx, LazyStage.tsx, Scene.tsx, CameraRig.tsx, cameraPath.ts, Lighting.tsx, Plinth.tsx, Floors.tsx
    building/           Walls (wallModel.ts is the pure geometry model), ceiling, the Staff Entrance logo door
    equipment/          Registry, PrimBatch, and kinds/ (one builder per kind of equipment)
    outside/            Delivery pickup zone, canopy and scooters
    interaction/        Room picking and the selection outline
    layers/             Labels, Flows, Safety, Dimensions, NorthArrow
  ui/                 TopBar, Hero, LoadingSplash, WebGLFallback, ExplorerUI (explorer/ panel, sheet, info card, legends)
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

 index.html -> main.tsx -> <App>
   <TopBar/>                                      fixed bar, nav, mobile menu
   #stage-wrap   (STAGE_SCROLL_VH svh tall)
     #stage      sticky, full viewport
       <LazyStage/> --import()--> <Stage/> -> <Canvas> -> <Scene/>
                                                    Lighting, CameraRig (drei CameraControls)
                                                    Plinth, Floors, Walls, Ceiling
                                                    Equipment (PrimBatch <- kind builders <- data/equipment)
                                                    LogoDoor, PickupZone
                                                    RoomPicking, Labels
                                                    Flows, Safety, Dimensions, NorthArrow
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
explorer; entering the space changes the store `phase` from `hero` to `explorer`, which opens the panel and flies the
camera to the aerial view.

Shared links work: `/#safety` (any nav id: `vision`, `zones-flow`, `safety`, `design-language`, `contact`) opens at
that section, and `/#stage` opens the explorer once the scene is ready (`src/lib/deepLink.ts`). The nav keeps the
hash up to date as the reader moves.

## Changing things

After any edit in `src/data/`, run `npm run validate:all`. After editing rooms, doors, zone colours or the layout in
any way, also run `npm run assets` so `floorplan.png` matches the model again.

**A room** (size, position, name, group, floor, glazing): edit its `room(...)` row in `ROOMS` in
`src/data/layout.ts`. The rooms and the `CIRCULATION` rectangles must tile the 60 × 50 footprint exactly with no gap
or overlap (snap to 0.5 ft); `npm run validate` tells you where they do not. Move the doors that sit on the walls you
touched and the equipment inside the room. A new room also needs its id in `RoomId` (`src/data/types.ts`) and an
entry in `ROOM_COPY` (`src/data/roomCopy.ts`).

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
  numbers allowed are facts of the plan.
- Proposal sections: `src/sections/*.tsx`. The numbers in them come from `layout.ts`.

**A zone colour**: `ZONE_COLORS` in `src/lib/palette.ts` (the zone table in `layout.ts` reads it). Workflow colours
are `FLOW_COLORS` in the same file. Run `npm run assets` afterwards: the floor plan uses the same colours.

**A flow route**: edit the polylines in `src/data/flows.ts` (points are `(x, z)` in feet, direction = point order).
Two flows sharing a corridor run in their own lane `FLOW_RIBBON.pitch` apart. `npm run validate` section 8 checks that
every route crosses walls only through doors, keeps its lanes, passes the five dishwashing stages in order, and never
runs under floor-standing equipment, so it will tell you when a moved item or door breaks a route.

**A safety rule**: `src/data/safety.ts`. Points are generated, not typed: small policy tables say what goes where (per
room, per door, per corridor) and the code finds a free spot on solid wall, clear of doors, glazing and equipment. So
when equipment moves, the markers move with it.

**A camera preset**: `PRESETS` and `HERO_POSE` in `src/data/cameras.ts` (the Views tab lists `PRESET_LABELS`).

## Equipment: kinds, the prim batcher and the kit

The 3D equipment is not modelled in a DCC tool. Each item in `src/data/equipment/*` names a **kind**
(`'prep.bench'`, `'kitchenLine.fryer'`, ...). `src/scene/equipment/registry.ts` maps a kind to a builder function.

- A **builder** draws one item with primitives into a `PrimBuilder` (`src/lib/prims.ts`): `box`, `cyl`, `cone`, `sph`,
  `pipe`, `sign` and `frame` (a nested local frame). Inside a builder the origin is the **centre of the item's footprint
  on the floor**, `+x` is the item's right, `+z` its front, angles are in degrees, and a part's `y` is its bottom.
  Materials are a small set: `steel`, `matte`, `gloss`, `glass`, `emissive`, `brass`. Large stainless faces use `gloss`
  with a light satin colour, because the metallic `steel` material only reflects the dark stage and reads black.
- The **prims batcher** (`buildBatch`) merges every primitive of every item into a handful of `InstancedMesh`es (one
  per geometry and material class, per-instance colour), so the whole building's dressing is only about 15 to 25 draw
  calls. `PrimBatch` renders the result and the text signs; the `Equipment` layer toggles it as a whole.
- The **kit** (`src/lib/kit.ts`) holds shared silhouettes (bench, bin, crate, stool, round table, plant, tree, wall
  shelf, fridge and more) and the stainless / charcoal / foliage colour constants. Use it before drawing something
  twice. Group-specific helpers live next to their builders (`prepKit.ts`, `supportKit.ts`, `productionParts.ts`, ...).

Builders run once, in `useMemo`, when the scene mounts. They are plain functions of the data, so keep them
allocation-light and deterministic (use a seeded random if you need variation; never `Math.random`).

## Camera and navigation

One camera, driven through the store (`src/store.ts`). Components never move it directly.

| Store API | Meaning |
| --- | --- |
| `flyTo(position, target, { mode?, instant?, preset? })` | Fly (or jump, when `instant` or reduced motion) to any pose. A new request id means "go here". `mode: 'orbit'` is the normal orbit / dolly / pan; `'look'` is eye level (the orbit target sits a hair in front of the camera, so dragging looks around in place). |
| `goPreset('aerial' \| 'plan' \| 'kitchen' \| 'entrance')` | Fly to a preset in `data/cameras.ts`. |
| `goRoom(id, 'overview' \| 'eye')` | Select a room and fly to its 3/4 overview or its 5.5 ft eye-level pose just inside the door with the longest sightline. `clearSelection()` returns to the aerial view; `stepRoom(±1)` walks through the rooms in panel order. |
| `enterSpace()` | The hero call to action: switches `phase` to `explorer`, opens the panel, flies to the aerial view. |
| `setAutoOrbit(bool)` | The slow turntable of the hero. It stops on any touch, wheel or fly. |

`src/scene/CameraRig.tsx` (drei `CameraControls`) watches the store. It adapts poses to the viewport (narrow or
panel-reduced viewports dolly out so the footprint keeps fitting, portrait phones swing towards a frontal, higher
view, eye level widens its lens on portrait screens), keeps the model centred in the area the desktop panel or the
mobile sheet leaves free using `camera.setViewOffset` (not a camera move, so perspective and picking stay exact), and
leaves the mouse wheel to the page during the hero.

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

## Layers and modes

Toggled from the Layers tab of the explorer, or from code with `setLayer(id, on)` / `toggleLayer(id)`:

| Layer | Default | Shows |
| --- | --- | --- |
| `raw`, `staff`, `dirty`, `orders` | off | The four animated workflow ribbons (raw material, staff, dirty / utensils / waste, orders out). Each also has a pattern (single chevron, double, dashed, solid) so they stay apart without colour. |
| `safety` | off | Extinguishers, smoke and heat detectors, LPG detectors, the gas shut-off, emergency lights and exit signs. |
| `zones` | on | Floor tint by diet zone (Veg, Jain, Vegan, Non-Veg, plus the blue content corner). |
| `labels` | on | Room name pills (one DOM layer, decluttered on screen). |
| `dimensions` | off | The 60 ft and 50 ft dimension lines. (The north arrow is always on.) |
| `equipment` | on | All dressing. Off shows bare rooms. |

Modes: `setWallMode('dollhouse' | 'full')` (walls 3.5 ft or the full 10 ft, animated, with the ceiling slab) and
`setLighting('day' | 'evening')` (key light, environment and the lamps ease between the two).

## Performance and resilience

- **Lazy 3D.** The stage is loaded with `React.lazy` (`src/scene/LazyStage.tsx`). The first paint needs only the
  `vendor` (React) and `index` chunks, roughly 140 KB gzipped; `three`, r3f, drei, camera-controls and the scene
  (roughly 320 KB gzipped more) load afterwards, in parallel. `index.html` carries a static copy of the loading
  splash, so even a cold start on a slow phone is dark and branded from the first paint. If the 3D chunk cannot be
  fetched, the floor-plan fallback shows and the splash is released.
- **Frameloop pausing.** The canvas renders only while the stage is on screen (`IntersectionObserver`, with an 80 px
  margin) and the tab is visible; otherwise `frameloop` is `never`. The shadow camera is re-fitted to the model only
  when the key light moves.
- **Quality tiers.** drei's `PerformanceMonitor` flips `store.quality` between `high` and `low`. Low means dpr 1 and a
  1024 px shadow map refreshed every other frame (high: dpr up to 2, or 1.5 on phones, and a 2048 px shadow map; phones
  always get 1024). `?quality=low` or `?quality=high` in the URL pins a tier and disables the monitor (for diagnosis).
- **Reduced motion.** `prefers-reduced-motion` (read once at load) makes camera moves jump instead of fly, turns the
  turntable off, snaps the walls, keeps the safety pulses static and shortens CSS animations.
- **WebGL fallback.** If WebGL is missing, context creation fails, or a lost context does not come back within
  4 seconds, `WebGLFallback` shows the generated floor plan (also the download link) and the rest of the page works
  as normal.
- **Hero on phones.** While the hero is up the canvas lets vertical swipes scroll the page; horizontal drags orbit.

## Assets and brand

- `npm run assets` regenerates, from `brand-src/` and `src/data/layout.ts`: `public/favicon.*`, `apple-touch-icon.png`,
  the transparent logo cuts in `public/brand/`, `public/og.png` (1200 × 630) and `public/assets/floorplan.png`
  (2400 × 2000, north up, drawn from the layout data so it matches the 3D model exactly). The logo cuts come from an
  exact two-background matte of `logo-light.png` / `logo-dark.png`, so they sit on any backdrop without a halo.
- **`public/assets/floorplan.png` is the canonical plan.** It is the download link and the WebGL fallback image. It is
  generated, never hand-edited.
- **The client's original AI-drawn plan is reference only.** It lives in `reference/floorplan-original.png`, is
  git-ignored, is not in `public/`, and nothing in the site references it. A clean checkout simply does not have it.
- `brand-src/` holds the final brand assets (`logo-light.png`, `logo-dark.png`, `palette.png`). They are inputs to
  `npm run assets` and are not served.
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
| `CLIENT_NAME` | `[Client Name]` | Hero subline, footer ("Prepared for"), page description and link preview |
| `KITCHEN_NAME` | `[Kitchen Name]` | Tab title, link preview, Vision copy, the Next steps mail subject, the backdrop sign in the Content Creator Corner, `og.png` |
| `CONTACT.person`, `.email`, `.phone`, `.address`, `.hours` | `[Contact Name], [Role]`, `hello@aurexa.example`, `+00 00000 00000`, `[Studio address line 1], [City]`, `[Opening hours]` | Next steps band (mailto and tel links are built from email and phone) |

`SITE_TITLE` and `SITE_DESCRIPTION` are built from those names and are injected into `index.html` (title, description,
`og:*` and `twitter:*` tags) by the `html-meta` plugin in `vite.config.ts`, in dev and in the build. **`public/og.png`
has the kitchen name drawn into the picture**, so after changing `KITCHEN_NAME` run `npm run assets` and commit the
new `og.png`.

## Deploying to Vercel

1. Push the repo and import it in Vercel. `vercel.json` already selects the **Vite** framework with build command
   `npm run build` and output directory `dist`. Pick Node 22.x in the project settings if it is not the default.
2. Deploy. There are no required environment variables.
3. **Absolute `og:image`.** Crawlers (WhatsApp, LinkedIn, Slack) do not resolve a relative image URL. The build makes
   `og:image` and `twitter:image` absolute from `SITE_URL` if set, else from Vercel's `VERCEL_PROJECT_PRODUCTION_URL`
   (exposed to builds by default). With a custom domain, set `SITE_URL=https://your-domain.example` in the project's
   environment variables and redeploy. When neither variable exists (a local build) the tags stay `/og.png` and the
   build prints a warning. Link previews are cached by the platforms: refresh them with LinkedIn's Post Inspector or
   Facebook's Sharing Debugger.
4. **Not indexed.** `index.html` has `<meta name="robots" content="noindex">` and `vercel.json` sends
   `X-Robots-Tag: noindex, nofollow`. Remove both to allow search engines. For a private pitch, consider Vercel's
   Deployment Protection (password) as well.

`vercel.json` also sets:

- `/static/*` (fingerprinted JS, CSS and fonts) is cached for a year, `immutable`. The fingerprinted files go to
  `dist/static` on purpose: `/assets` holds the un-hashed `floorplan.png`, which must stay revalidated.
- `/`, `/index.html`, `/assets/*`, `/brand/*`, the favicons and `og.png` use short caches (HTML always revalidates;
  the rest one hour).
- Security headers: a Content-Security-Policy limited to the site's own origin (inline styles allowed, `blob:` and
  `data:` for textures, no third-party anything), `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`,
  `Referrer-Policy: strict-origin-when-cross-origin` and a `Permissions-Policy` with the sensor and payment APIs
  switched off. If the proposal must be embedded in another site, relax `X-Frame-Options` and `frame-ancestors`.
  If you add any third-party script, font, image host or analytics, extend the CSP in the same file (the Vercel preview
  toolbar, which loads from `vercel.live`, is blocked by it on preview deployments; that is harmless).

## Browser support

Current Chrome and Edge (111+), Safari (16.4+, iOS 16.4+) and Firefox (128+): the floor set by Tailwind CSS 4, with
WebGL 2 required for the 3D view (three 0.170). The build targets ES2022. Without WebGL or with hardware acceleration
off, the visitor gets the floor-plan fallback and the full proposal text. The site was developed and checked in
Chromium (Chrome on Windows, desktop and phone-sized viewports); Safari and Firefox follow from the standards used and
have not been tested here, so test an iPhone and a Mac before the pitch.

## Known limitations

- **Placeholders.** The client name, kitchen name and contact details in `src/config.ts` are placeholders (see above).
  `og.png` shows the placeholder name until `npm run assets` is re-run.
- **The scroll walkthrough is a stub.** The camera-path API is wired end to end, but no path is authored and
  `STAGE_SCROLL_VH` is 100.
- **Dressing is stylised, not CAD.** Equipment is built from primitives and sized to read at dollhouse scale (for
  example the toilet cubicles are narrower than real ones, and the European island is shorter than the original
  brief). Every such call is one line in `DECISIONS.md`. The layout validators check clear zones and routes, not
  building-code compliance.
- **No invented numbers.** The site quotes only figures derived from `src/data/layout.ts`. It makes no claims about
  throughput, cost or timelines.
- **Phones.** Touch devices get a lighter shadow map and a lower pixel ratio, and the performance monitor drops quality
  further when frames are slow, but a low-end phone can still be sluggish in full-height mode with every layer on.
- **Cross-browser testing** is limited to Chromium (see Browser support).
- **Labels** on narrow screens are stacked and shifted to avoid overlaps and tied to their room by a thin stem, so a
  pill may not sit exactly over its room.
- **Static only.** There is no backend, form, analytics or CMS. The contact band uses `mailto:` and `tel:` links.
