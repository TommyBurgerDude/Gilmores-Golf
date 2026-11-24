import { PATH_WIDTH } from '../game/constants'
import { THEMES } from '../game/seasons'
import { insideShape } from '../game/shapes'
import { maskSdf, terrainAt } from '../game/terrain'
import type { Rng } from './prng'
import type { Course, Npc, Prop, PropKind } from './schema'

// Visible area in world coordinates (world is 0..800 x 0..600, the view adds a border).
const X0 = -70
const X1 = 870
const Y0 = -50
const Y1 = 650

interface Spot {
  x: number
  y: number
  r: number
}

/** Large plants that need extra room to look right. */
const BIG: Partial<Record<PropKind, number>> = { building: 8 }

/**
 * Seeded, purely cosmetic placement of the park around the course: spectators on the walkway, clubhouse, pond,
 * plants, parked cars and theme props. Everything is rejection-sampled against the playable mask, so no scenery ever
 * sits on the course. What appears is driven by the theme's scenery profile.
 */
export function buildScenery(rng: Rng, course: Course): { props: Prop[]; npcs: Npc[] } {
  const props: Prop[] = []
  const npcs: Npc[] = []
  const spots: Spot[] = []
  const sdf = (x: number, y: number) => maskSdf(course, x, y)
  const profile = THEMES[course.meta.season].profile
  const season = course.meta.season

  function place(r: number, minSdf: number, maxSdf: number, tries: number, yBias?: [number, number]): Spot | null {
    for (let i = 0; i < tries; i++) {
      const x = rng.int(X0 + r * 0.5, X1 - r * 0.5)
      const y = yBias ? rng.int(yBias[0], yBias[1]) : rng.int(Y0 + r, Y1 - r * 0.3)
      const d = sdf(x, y)
      if (d < minSdf || d > maxSdf) continue
      if (spots.some((s) => Math.hypot(s.x - x, s.y - y) < r + s.r)) continue
      const s = { x, y, r }
      spots.push(s)
      return s
    }
    return null
  }

  function add(kind: PropKind, r: number, minSdf: number, maxSdf: number, count: number, variants = 4, tries = 80): void {
    for (let i = 0; i < count; i++) {
      const s = place(r, minSdf, maxSdf, tries)
      if (s) props.push({ kind, x: s.x, y: s.y, variant: rng.int(0, variants - 1) })
    }
  }

  // Spectators stand on the walkway just outside the fence.
  const nNpc = rng.int(6, 8)
  for (let i = 0; i < nNpc; i++) {
    const s = place(34, PATH_WIDTH * 0.3, PATH_WIDTH * 0.7, 400)
    if (s) npcs.push({ x: s.x, y: s.y, look: i === 0 ? 0 : i === nNpc - 1 && nNpc > 6 ? 7 : rng.int(1, 6) })
  }

  const P = PATH_WIDTH
  // Big landmarks first so they get the space. Try the top and bottom bands before anywhere.
  const club = place(64, P + 30, Infinity, 200, [Y0 + 70, 70]) ?? place(64, P + 30, Infinity, 200, [560, Y1 - 4]) ?? place(64, P + 30, Infinity, 300)
  if (club) props.push({ kind: 'clubhouse', x: club.x, y: club.y, variant: 0 })
  for (const [kind, count, r, variants] of profile.plants) {
    if (BIG[kind] !== undefined) add(kind, r, P + 24, Infinity, count, variants, 160)
  }
  if (profile.pond) add('pond', 56, P + 40, Infinity, 1, 1, 200)
  if (profile.stand) add('stand', 30, P + 22, Infinity, 1, 3, 200)
  add('car', 36, P + 16, Infinity, rng.int(profile.cars[0], profile.cars[1]), 4, 200)
  add('bench', 16, P + 6, P + 60, profile.benches, 2)
  add('lamp', 8, P + 2, P + 14, profile.lamps, 1, 120)
  add('bin', 8, P + 2, P + 20, profile.bins, 1)
  if (profile.goofy) for (let i = 0; i < 5; i++) add(rng.pick(['gnome', 'dino', 'drainpipe', 'cone'] as const), 10, P + 4, P + 44, 1, 4)
  for (const [kind, count, r, variants] of profile.plants) {
    if (BIG[kind] === undefined) add(kind, r, P + (r > 12 ? 18 : 8), Infinity, count, variants, 60)
  }

  // Flowers and weeds in the rough, away from fixtures.
  const decor = season === 'winter' || !THEMES[season].flowers ? rng.int(2, 6) : season === 'spring' ? rng.int(28, 40) : rng.int(16, 26)
  for (let i = 0, placed = 0; i < 400 && placed < decor; i++) {
    const x = rng.int(0, 800)
    const y = rng.int(0, 600)
    if (sdf(x, y) > -22) continue
    if (terrainAt(course, x, y) !== 'rough') continue
    if (course.walls.some((w) => insideShape(w.shape, x, y, 12))) continue
    if (Math.hypot(x - course.tee.x, y - course.tee.y) < 40 || Math.hypot(x - course.cup.x, y - course.cup.y) < 40) continue
    props.push({ kind: THEMES[season].flowers && rng.chance(0.55) ? 'flower' : 'weed', x, y, variant: rng.int(0, 3) })
    placed++
  }
  return { props, npcs }
}
