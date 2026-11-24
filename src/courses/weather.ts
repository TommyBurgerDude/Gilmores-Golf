import { MAX_SLOPE } from '../game/constants'
import { THEMES } from '../game/seasons'
import { coreOf } from '../game/shapes'
import { maskSdf, terrainAt } from '../game/terrain'
import { Rng, hashString } from './prng'
import type { Course, Terrain } from './schema'

/**
 * Theme weather, applied to the finished course: snow leaves ice patches that make the ball skate, rain leaves
 * puddles that slow it down, and some themes have a steady wind. Deterministic per level (own seeded generator).
 */
export function applyWeather(course: Course): void {
  const cfg = THEMES[course.meta.season].weather
  const rng = new Rng(hashString(`weather:${course.meta.seed}`))
  const tier = course.meta.tier
  const taken: { x: number; y: number; r: number }[] = []

  const clear = (x: number, y: number, r: number): boolean => {
    if (Math.hypot(x - course.tee.x, y - course.tee.y) < r + 55) return false
    if (Math.hypot(x - course.cup.x, y - course.cup.y) < r + 75) return false
    if (maskSdf(course, x, y) > -(r + 14)) return false
    if (taken.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + r + 6)) return false
    const ok: Terrain[] = ['fairway', 'rough']
    if (!ok.includes(terrainAt(course, x, y))) return false
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2
      if (!ok.includes(terrainAt(course, x + Math.cos(ang) * (r + 8), y + Math.sin(ang) * (r + 8)))) return false
    }
    for (const w of course.walls) {
      const c = coreOf(w.shape, x, y)
      if (Math.hypot(x - c.cx, y - c.cy) < r + 10 + c.r) return false
    }
    return true
  }

  const scatter = (terrain: Terrain, count: number, rmin: number, rmax: number): void => {
    for (let placed = 0, tries = 0; placed < count && tries < 300; tries++) {
      const r = rng.int(rmin, rmax)
      const x = rng.int(60, 740)
      const y = rng.int(60, 540)
      if (!clear(x, y, r)) continue
      taken.push({ x, y, r })
      course.regions.push({ terrain, shape: { t: 'circle', x, y, r } })
      placed++
    }
  }

  if (cfg.ice > 0) scatter('ice', cfg.ice + (tier - 1), 22, 34)
  if (cfg.puddles > 0) scatter('puddle', cfg.puddles + (tier - 1), 20, 34)
  if (cfg.wind > 0) {
    const mag = Math.min(MAX_SLOPE - 12, cfg.wind * (0.6 + 0.4 * rng.float()) * (1 + (tier - 1) * 0.15))
    const ang = rng.range(0, Math.PI * 2)
    course.wind = { x: Math.round(Math.cos(ang) * mag * 10) / 10, y: Math.round(Math.sin(ang) * mag * 10) / 10 }
  }
}
