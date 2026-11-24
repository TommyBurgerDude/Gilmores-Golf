# Gilmore's Golf

A funny, rundown pixel-art mini-golf game set at **Gilmore's Mini Golf**. Every new hole is picked at random from a
large pool of procedurally assembled holes across ten themes, so the game is always different. Each hole has its own par,
worked out from the route a ball has to travel.

No backend, accounts, analytics, cookies, scores or storage of any kind. Reloading starts a fresh random hole.

## Controls

Slingshot style, identical on mouse and touch:

1. Press (or click) near the ball.
2. Drag **away** from where you want to go. A farther drag means more power (capped at the dashed ring).
3. A dotted preview shows the path, including wall bounces; a coral marker means it ends in water or out of bounds.
4. Release to shoot. Input is ignored while the ball is moving.

Header buttons toggle sound (muted by default) and replay the hole.

### On phones

- **Portrait:** on narrow portrait screens the board is rotated a quarter turn so the 4:3 course fills the width (about 35% bigger). Terrain turns with the board; people, trees, buildings, the flag, the club, speech bubbles and falling weather are drawn upright (`game/pixelart.ts` splits a rotating ground layer from an upright sprite layer).
- **Landscape:** the board fills the height and the header and status panel sit beside it.
- **Touch aiming:** the grab zone around the ball is at least 34 px, a full-power pull needs at least 110 px of finger travel (so power is easy to control), and a pulsing ring marks the ball on small screens.

## Features

- 4,013 hole types: 13 hand-authored families plus 4,000 composites (200 path shapes x 20 hazards), across ten themes
  (four seasons plus apocalypse, beach, mountain, forest, city and cyberpunk).
- Moving obstacles (windmill rotors, sliding doors, wrecking balls), pop bumpers, speed pads, gust zones, ice, mud, wind
  and weather that changes how the ball rolls.
- Custom fixed-timestep 2D physics: terrain friction, slopes, walls/circles/slanted boards, bunkers, water and
  out-of-bounds penalties, cup capture, optional tunnels.
- Pixel-art art direction drawn entirely in code (no image assets), synthesized Web Audio effects.
- Route validation with a configuration-space grid search, bounded attempts and a known-good fallback hole.

## The park

Each hole is carved into Gilmore's park. The playable area is the union of every terrain region inflated by a margin
(`maskSdf` in `game/terrain.ts`); its edge is a wooden fence that the ball collides with. Outside the fence the renderer
draws a gravel walkway and lawn, then seeded scenery (`courses/scenery.ts`): clubhouse, snack stand, pond, parked cars,
trees, lamps and goofy props, all rejection-sampled so nothing overlaps the course. Spectators (`game/crowd.ts`,
`game/people.ts`) wander the walkway, cheer holes (more wildly for birdies, jeering slow rounds), taunt splashes and chat idly; they are cosmetic and never
affect physics. The canvas shows a 960x720 view around the 800x600 playable world.

## Stack

React 19, TypeScript (strict), Vite, Canvas 2D, Vitest, Playwright, GitHub Actions. No game engine or physics
library.

## Develop

```powershell
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # tsc -b --noEmit
npm run lint
npm test             # Vitest unit tests (fast: scheduling rules + a spread sample of levels)
npm run verify:levels # generate and route-check EVERY level, write docs/LEVELS.md
npm run build        # type check + production bundle in dist/
npm run preview      # serve dist/
```

Browser smoke tests (Chromium; the first run needs `npx playwright install chromium`):

```powershell
npm run test:e2e     # starts the dev server itself
```

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` lints, tests, builds and deploys with the official Pages actions.

1. Push the repository to GitHub with the default branch named `main`.
2. In **Settings > Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually). The site appears at `https://<user>.github.io/<repo>/`.

`vite.config.ts` uses `base: './'` (relative asset URLs), so the same build works under `/<repo>/` and on a root custom
domain. Set `VITE_BASE=/<repo>/` at build time if you prefer an absolute base.

## Levels and themes

There are **12,039 deterministic levels**: every one of the 4,013 hole types, played three times (a pass each), with a
different theme, difficulty tier and seed every time. Level `n` is generated purely from `n` and `GENERATOR_VERSION`
(`courses/levels.ts`): FNV-1a hash into a Mulberry32 seed. `Math.random()` is never used in generation or gameplay (a test
greps for it). The only non-seeded randomness is *which* level comes next (`pickNextLevel`, fed by
`crypto.getRandomValues` in `app/App.tsx`): it picks from the whole space, avoids the last 300 levels and never serves two
holes of the same type in a row. Level numbers and counts are not shown in the UI.

- **Themes:** ten looks (spring, summer, fall, winter, apocalypse, beach, mountain, forest, city, cyberpunk). Every block
  of ten levels shows each theme once, so neighbours never share a look. A theme changes the palette, ground, fence, trees
  and scenery, weather, spectators' outfits and chatter (`game/seasons.ts`).
- **Difficulty:** ramps 1 to 3 over every 50 levels (fairway width, hazards, slopes, bumpers), then starts over.
- **Scheduling:** each pass is a seeded shuffle of all hole types (cached, so choosing a level is instant); a pass never
  starts with the previous pass's last type.
- **Hole types:** `courses/templateIds.ts` lists 200 path shapes (100 parametric across 15 families such as waves,
  zigzags, staircases, spirals, loops, forks and plazas, plus 100 seeded random walks, each a fixed irregular shape) and 20
  hazards: bunkers, pond, twin rivers, tire alley, boards, slopes, moat, landmark, warp pad, croquet gates, windmill blades,
  sliding doors, wrecking ball, pop bumpers, black ice, mud pit, speed pads, gust alley, slalom run and fortress cup. A
  composite id is `<shape>-<hazard>` (for example `zig5-rotor`). `courses/composite.ts` places each hazard relative to the
  path so it always sits on playable ground, and the route validator rejects the rare bad layout (the generator retries).
- **Progression:** finishing a hole offers Replay or Next level. Nothing is saved.
- **Versioning:** changing generator behaviour changes existing levels. Bump `GENERATOR_VERSION` when that is intended.
- Each hole is mirrored horizontally and/or vertically by the seed for extra variety.

## Weather, wind and moving hazards

- **Themes decide the weather** (`game/seasons.ts`, `courses/weather.ts`): snowy themes sprinkle **ice patches**
  (near-frictionless), rainy themes sprinkle **puddles** (slow, no penalty), and beach, mountain, fall and apocalypse levels
  have a steady **wind** (shown in the HUD, with streaks on the course). Wind is capped below resting friction, so it moves a
  rolling ball but never a ball at rest.
- **Moving obstacles** are a pure function of the game clock (`game/movers.ts`), so a shot played at a given clock is
  deterministic. The aim preview simulates with the current clock and refreshes every frame while you drag.
- **Pop bumpers** return more speed than they receive (wall `bounce` > 1). **Speed pads** only accelerate a ball that is
  already moving. **Gust zones** push sideways.

## Architecture

```
src/courses   schema.ts (types) prng.ts levels.ts templateIds.ts templates.ts composite.ts registry.ts weather.ts scenery.ts generator.ts validator.ts
src/game      physics, collision, terrain, simulation (state machine), trajectory, input, scoring,
              pixelart + sprites (static layer), renderer (dynamic layer + overlays), particles, audio
src/components / src/app   React shell: header, HUD, overlays, GameCanvas
```

Generation, physics and rendering are separate; physics never touches React state. `GameCanvas` owns the
`requestAnimationFrame` loop and pushes small status snapshots to React only when they change.

### Generation and validation

Templates (`templates.ts`) author a hole tee-left/cup-right inside validated placement ranges, using terrain regions,
walls (rects, circles, capsules), slope zones and portals. `generator.ts` adds cosmetic props, applies seeded flips,
then `validator.ts` checks:

- finite numbers, par, world bounds, tee/cup clearance, no water at the tee or cup, minimum tee-cup distance;
- a **route**: 8-connected BFS over an 8-unit grid where walls are inflated by the ball radius and water is blocked.

Up to 8 attempts are made (new seed per attempt), then a fixed fallback hole is used. The route check proves geometric
reachability only; it says nothing about how many strokes a hole takes. Tunnels are always optional (a bypass lane
exists).

### Physics

`stepBall` runs at a fixed 1/120 s step with an accumulator, a 0.1 s frame clamp and a 24-step catch-up cap. Per step:
slope acceleration, per-terrain `exp(-k dt)` damping plus constant deceleration (frame-rate independent), movement,
two relaxation passes of wall collisions (closest-point, push-out, restitution 0.55), portals, then hazard and cup
checks. At the maximum 420 u/s the ball moves under 4 units per step, less than its radius, so thin walls cannot be
tunnelled. The trajectory preview runs the same `stepBall` on a copy.

The state machine is `ready -> aiming -> rolling -> hazard|complete`, with guarded transitions. Rolling exits at once on
water, out of bounds or cup capture, so exactly one penalty or completion is recorded per incident.

## Add a template

1. Add an id to `TemplateId` in `courses/schema.ts` and to `TEMPLATE_ORDER` in `courses/levels.ts`.
2. Add a `Template` in `courses/templates.ts` that returns a `Draft` from `(rng, tier)` using only `rng` for randomness,
   and register it in `TEMPLATES`.
3. Run `npm test` (fast sample) and `npm run verify:levels` (every level). Adding a template changes the level
   schedule, so bump `GENERATOR_VERSION`.

## Debug view

Dev server only (stripped from production builds): `http://localhost:5173/?debug`. It draws collision shapes, regions,
slope vectors, cup/tee radii, the inflated nav grid, the computed route and metadata with validation failures.
Also dev-only: `?level=N` and `?template=<id>` to preview any hole.

## Known limitations

- Physics, difficulty and par were tuned with a limited amount of play. Par is a heuristic: the number of straight, full-power shots the shortest safe route needs (bends cost strokes), plus a putt, clamped to 3-7 (`courses/par.ts`); expect further tuning.
- Route validation proves a hole is reachable, not that it is fun or fair.
- Cup capture is speed-gated but has no rim "lip-out" behaviour.
- Pixel art is scaled with nearest neighbour; on fractional scale factors pixels vary slightly in size.
- Dev-only Playwright smoke tests use a test hook to hole the ball rather than scripting a full solution.
- No keyboard aiming yet (pointer only); the canvas carries an ARIA label and status text uses a live region.
- Deployment to GitHub Pages has not been exercised from this machine.

## Verifying every level

`npm test` checks the scheduling rules on all 12,039 levels and generates a spread sample of 240. To generate and
route-validate **every** level (eight parallel workers), run:

```powershell
npm run verify:levels
```

It fails if any level is invalid and writes a summary (fallback rate, themes, tiers, weather, generation times) to
[docs/LEVELS.md](docs/LEVELS.md).

## About and license

Gilmore's Golf is a fun side project written with AI assistance (Claude Code). There is no warranty; expect rough edges.
Released under the [MIT License](LICENSE).
