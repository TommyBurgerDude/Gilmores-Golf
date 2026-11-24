import { WORLD_H, WORLD_W, CUP_R, PAR } from '../game/constants'
import { parFromRoute } from './par'
import { flipMover } from '../game/movers'
import { flipShape } from '../game/shapes'
import { GENERATOR_VERSION, seasonOf, seedForLevel, templateForLevel, tierOf } from './levels'
import { hashString, Rng } from './prng'
import { buildScenery } from './scenery'
import { applyWeather } from './weather'
import type { Course, Season, TemplateId, Vec } from './schema'
import { TEMPLATES } from './registry'
import type { Draft } from './templates'
import { validateCourse } from './validator'

export const MAX_ATTEMPTS = 8

function assemble(level: number, templateId: TemplateId, tier: number, seed: number, fallback: boolean, season?: Season): Course {
  const rng = new Rng(seed)
  const draft: Draft = TEMPLATES[templateId].build(rng, tier)
  const flipX = !fallback && rng.chance(0.5)
  const flipY = !fallback && rng.chance(0.5)
  const course: Course = {
    meta: {
      level,
      season: season ?? seasonOf(level),
      seed,
      generatorVersion: GENERATOR_VERSION,
      templateId,
      templateName: draft.name,
      theme: draft.theme,
      tier,
      usedFallback: fallback,
      flipX,
      flipY,
    },
    width: WORLD_W,
    height: WORLD_H,
    par: PAR,
    tee: draft.tee,
    cup: { ...draft.cup, r: CUP_R },
    regions: draft.regions,
    slopes: draft.slopes,
    walls: draft.walls,
    portals: draft.portals,
    props: [],
    npcs: [],
    movers: draft.movers,
    wind: { x: 0, y: 0 },
  }
  if (flipX || flipY) {
    const X = (x: number) => (flipX ? WORLD_W - x : x)
    const Y = (y: number) => (flipY ? WORLD_H - y : y)
    const P = (p: Vec): Vec => ({ x: X(p.x), y: Y(p.y) })
    const dir = (p: Vec): Vec => ({ x: flipX ? -p.x : p.x, y: flipY ? -p.y : p.y })
    course.tee = P(course.tee)
    course.cup = { ...P(course.cup), r: CUP_R }
    course.regions = course.regions.map((r) => ({ ...r, shape: flipShape(r.shape, flipX, flipY, WORLD_W, WORLD_H) }))
    course.walls = course.walls.map((w) => ({ ...w, shape: flipShape(w.shape, flipX, flipY, WORLD_W, WORLD_H) }))
    course.slopes = course.slopes.map((z) => ({
      shape: flipShape(z.shape, flipX, flipY, WORLD_W, WORLD_H),
      ax: flipX ? -z.ax : z.ax,
      ay: flipY ? -z.ay : z.ay,
    }))
    course.portals = course.portals.map((p) => ({ ...p, a: P(p.a), b: P(p.b), dirA: dir(p.dirA), dirB: dir(p.dirB) }))
    course.movers = course.movers.map((m) => flipMover(m, flipX, flipY, WORLD_W, WORLD_H))
  }
  applyWeather(course)
  const scenery = buildScenery(rng, course)
  course.props = scenery.props
  course.npcs = scenery.npcs
  return course
}

/** Known-good hole used when every generation attempt fails validation. No randomness beyond a fixed seed. */
export function fallbackCourse(level: number): Course {
  const c = assemble(level, 'straight', 1, hashString('tee-up:fallback'), true)
  const fv = validateCourse(c)
  c.par = parFromRoute(fv.route, fv.grid)
  return c
}

/** Deterministic: same level + GENERATOR_VERSION always yields the same course. Terminates in <= MAX_ATTEMPTS tries. */
export function generateCourse(level: number, templateOverride?: TemplateId, seasonOverride?: Season): Course {
  const tier = tierOf(level)
  const templateId = templateOverride ?? templateForLevel(level)
  const base = seedForLevel(level)
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const course = assemble(level, templateId, tier, attempt === 0 ? base : hashString(`${base}#${attempt}`), false, seasonOverride)
    const v = validateCourse(course)
    if (v.ok) {
      course.par = parFromRoute(v.route, v.grid)
      return course
    }
  }
  return fallbackCourse(level)
}
