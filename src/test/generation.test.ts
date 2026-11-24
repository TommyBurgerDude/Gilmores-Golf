import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fallbackCourse, generateCourse } from '../courses/generator'
import { LEVEL_COUNT, PASSES, SEASONS, TEMPLATE_ORDER, TIER_CYCLE, pickNextLevel, seasonOf, templateForLevel, tierOf } from '../courses/levels'
import { COMPOSITE_IDS, FEATURES, SKELETONS } from '../courses/templateIds'
import { TEMPLATES } from '../courses/registry'
import { THEMES } from '../game/seasons'
import { flatCourse } from './fixtures'
import { Rng, hashString, mulberry32 } from '../courses/prng'
import { parFromRoute } from '../courses/par'
import { validateCourse } from '../courses/validator'

/** Cheap checks run on every level; expensive generation runs on an evenly spread sample of 240. */
const all = Array.from({ length: LEVEL_COUNT }, (_, i) => i + 1)
const sample = Array.from({ length: 240 }, (_, i) => 1 + Math.floor((i * LEVEL_COUNT) / 240))

describe('levels', () => {
  it('has thousands of levels: every hole type is played three times', () => {
    expect(PASSES).toBe(3)
    expect(LEVEL_COUNT).toBe(TEMPLATE_ORDER.length * 3)
    expect(LEVEL_COUNT).toBeGreaterThan(10000)
    const counts = new Map<string, number>()
    for (const l of all) counts.set(templateForLevel(l), (counts.get(templateForLevel(l)) ?? 0) + 1)
    expect(counts.size).toBe(TEMPLATE_ORDER.length)
    for (const n of counts.values()) expect(n).toBe(3)
  })
  it('each pass uses every hole type once, in a different order', () => {
    const n = TEMPLATE_ORDER.length
    for (const pass of [0, 1, 2]) {
      const ids = new Set(all.slice(pass * n, (pass + 1) * n).map(templateForLevel))
      expect(ids.size).toBe(n)
    }
    expect(templateForLevel(1)).not.toBe(templateForLevel(1 + n))
    expect(all.slice(0, 40).map(templateForLevel)).not.toEqual(all.slice(n, n + 40).map(templateForLevel))
  })
  it('spreads ten themes with no neighbouring repeats', () => {
    expect(SEASONS).toHaveLength(10)
    expect(new Set(all.map(seasonOf)).size).toBe(10)
    for (let l = 2; l <= LEVEL_COUNT; l++) expect(seasonOf(l)).not.toBe(seasonOf(l - 1))
    for (const s of SEASONS) expect(THEMES[s].label.length).toBeGreaterThan(0)
  })
  it('difficulty ramps 1-3 inside each cycle and is bounded', () => {
    for (const l of all) expect([1, 2, 3]).toContain(tierOf(l))
    expect(TIER_CYCLE).toBe(50)
    expect([tierOf(1), tierOf(20), tierOf(45), tierOf(51)]).toEqual([1, 2, 3, 1])
  })
  it('never repeats a hole type on adjacent levels', () => {
    for (let l = 2; l <= LEVEL_COUNT; l++) expect(templateForLevel(l)).not.toBe(templateForLevel(l - 1))
  })
  it('scheduling is fast enough to do on every page load', () => {
    const t0 = performance.now()
    const rand = mulberry32(3)
    const recent: number[] = []
    for (let i = 0; i < 500; i++) pickNextLevel(rand, recent)
    expect(performance.now() - t0).toBeLessThan(1500)
  })
})

describe('random level selection', () => {
  it('never repeats a recent level or the previous hole type, and wanders the whole space', () => {
    const rand = mulberry32(7)
    const recent: number[] = []
    let prev = pickNextLevel(rand, recent)
    const seen = new Set([prev])
    for (let i = 0; i < 400; i++) {
      const next = pickNextLevel(rand, recent)
      expect(templateForLevel(next)).not.toBe(templateForLevel(prev))
      expect(next).toBeGreaterThanOrEqual(1)
      expect(next).toBeLessThanOrEqual(LEVEL_COUNT)
      expect(recent.length).toBeLessThanOrEqual(300)
      seen.add(next)
      prev = next
    }
    expect(seen.size).toBeGreaterThan(395)
    expect(Math.max(...seen)).toBeGreaterThan(LEVEL_COUNT * 0.8)
    expect(Math.min(...seen)).toBeLessThan(LEVEL_COUNT * 0.2)
  })
})

describe('determinism', () => {
  it('same level gives identical course data', () => {
    for (const l of [1, 7, 26, 5000, 9001, 12039]) expect(JSON.stringify(generateCourse(l))).toBe(JSON.stringify(generateCourse(l)))
  })
  it('different levels vary', () => {
    const sigs = new Set(sample.map((l) => JSON.stringify(generateCourse(l).regions)))
    expect(sigs.size).toBeGreaterThan(sample.length - 4)
  })
  it('PRNG: same seed same sequence, different seed differs', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const seqA = Array.from({ length: 10 }, a)
    expect(seqA).toEqual(Array.from({ length: 10 }, b))
    expect(Array.from({ length: 10 }, mulberry32(43))).not.toEqual(seqA)
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true)
    expect(hashString('level-1')).toBe(hashString('level-1'))
  })
  it('gameplay and generation code never call Math.random', () => {
    for (const dir of ['courses', 'game']) {
      const base = join(__dirname, '..', dir)
      for (const f of readdirSync(base)) {
        expect(readFileSync(join(base, f), 'utf8'), `${dir}/${f}`).not.toMatch(/Math\.random/)
      }
    }
  })
})

describe('generated courses', () => {
  it('a spread sample of levels is valid, has a route-based par, in its theme', () => {
    for (const l of sample) {
      const c = generateCourse(l)
      expect(validateCourse(c).reasons, `level ${l}`).toEqual([])
      expect(c.par).toBeGreaterThanOrEqual(3)
      expect(c.par).toBeLessThanOrEqual(7)
      const pv = validateCourse(c)
      expect(c.par).toBe(parFromRoute(pv.route, pv.grid))
      expect(c.meta.season).toBe(seasonOf(l))
      expect(c.meta.level).toBe(l)
      expect(c.meta.templateId).toBe(templateForLevel(l))
    }
  }, 240000)
  it('rarely needs the fallback', () => {
    const fb = sample.filter((l) => generateCourse(l).meta.usedFallback).length
    expect(fb).toBeLessThanOrEqual(3)
  }, 240000)
  it('covers many hole types and themed scenery', () => {
    expect(new Set(sample.map((l) => generateCourse(l).meta.templateId)).size).toBeGreaterThanOrEqual(sample.length - 12)
    const snow = generateCourse(5, 'straight', 'winter')
    expect(snow.props.some((p) => p.kind === 'snowman')).toBe(true)
    const beach = generateCourse(5, 'straight', 'beach')
    expect(beach.props.some((p) => p.kind === 'palm')).toBe(true)
    const city = generateCourse(5, 'straight', 'city')
    expect(city.props.some((p) => p.kind === 'building')).toBe(true)
  })
  it('fallback course is valid', () => {
    expect(validateCourse(fallbackCourse(1)).ok).toBe(true)
  })
})

describe('hole types', () => {
  it('has 13 hand-authored families plus 4000 composites (200 shapes x 20 features)', () => {
    expect(SKELETONS).toHaveLength(200)
    expect(FEATURES).toHaveLength(20)
    expect(COMPOSITE_IDS).toHaveLength(4000)
    expect(TEMPLATE_ORDER).toHaveLength(4013)
    expect(new Set(TEMPLATE_ORDER).size).toBe(4013)
    expect(new Set(SKELETONS.map((s) => s.id)).size).toBe(200)
    expect(new Set(SKELETONS.map((s) => s.name)).size).toBe(200)
    expect(new Set(SKELETONS.flatMap((s) => FEATURES.map((f) => `${s.name} ${f.name}`))).size).toBe(4000)
  })

  /** Build + validate a template without scenery (cheap enough to sweep thousands). */
  const valid = (id: string, seed: number, tier: number) => {
    const d = TEMPLATES[id]?.build(new Rng(seed), tier)
    if (!d) return ['missing template']
    const c = flatCourse()
    Object.assign(c, { tee: d.tee, cup: { ...d.cup, r: 11 }, regions: d.regions, walls: d.walls, slopes: d.slopes, portals: d.portals })
    return validateCourse(c).reasons
  }

  it('every shape works with every feature (4000 layouts, first attempt)', () => {
    let bad = 0
    for (const id of COMPOSITE_IDS) {
      if (valid(id, 7919, 2).length > 0) bad++
    }
    // The generator retries with new seeds, so a tiny first-attempt failure rate is fine.
    expect(bad).toBeLessThan(COMPOSITE_IDS.length * 0.01)
  }, 240000)

  it('real generation (with scenery and weather) is valid for a sample of composites on all tiers', () => {
    for (let i = 0; i < COMPOSITE_IDS.length; i += 37) {
      const id = COMPOSITE_IDS[i] as string
      for (const level of [5, 30, 45]) {
        const c = generateCourse(level, id)
        expect(validateCourse(c).reasons, id).toEqual([])
      }
    }
  }, 240000)
})

describe('weather', () => {
  it('snow and mountains add ice, rain adds puddles, windy themes have wind', () => {
    const w = generateCourse(5, 'plaza3-bunkers', 'winter')
    expect(w.regions.some((r) => r.terrain === 'ice')).toBe(true)
    expect(w.wind).toEqual({ x: 0, y: 0 })
    const city = generateCourse(5, 'plaza3-bunkers', 'city')
    expect(city.regions.some((r) => r.terrain === 'puddle')).toBe(true)
    const beach = generateCourse(5, 'plaza3-bunkers', 'beach')
    const mag = Math.hypot(beach.wind.x, beach.wind.y)
    expect(mag).toBeGreaterThan(3)
    expect(mag).toBeLessThanOrEqual(14) // always below resting friction, so wind never moves a resting ball
    const summer = generateCourse(5, 'plaza3-bunkers', 'summer')
    expect(summer.regions.some((r) => r.terrain === 'ice' || r.terrain === 'puddle')).toBe(false)
    expect(summer.wind).toEqual({ x: 0, y: 0 })
  })
  it('weather is deterministic and never touches the tee or cup', () => {
    const a = generateCourse(9, 'hook1-bunkers', 'winter')
    const b = generateCourse(9, 'hook1-bunkers', 'winter')
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    for (const r of a.regions.filter((q) => q.terrain === 'ice')) {
      const s = r.shape
      if (s.t === 'circle') {
        expect(Math.hypot(s.x - a.tee.x, s.y - a.tee.y)).toBeGreaterThan(s.r + 40)
        expect(Math.hypot(s.x - a.cup.x, s.y - a.cup.y)).toBeGreaterThan(s.r + 50)
      }
    }
  })
})

describe('par', () => {
  it('is derived from the route: short straight holes are par 3, long winding ones are higher', () => {
    const straight = generateCourse(5, 'straight', 'summer')
    expect(straight.par).toBe(3)
    const spiral = generateCourse(5, 'spiral0-bunkers', 'summer')
    expect(spiral.par).toBeGreaterThan(straight.par)
    const longest = Math.max(...Array.from({ length: 30 }, (_, i) => generateCourse(5, `walk${i}-bunkers`, 'summer').par))
    expect(longest).toBeGreaterThanOrEqual(4)
  })
  it('spreads over several values across the level space', () => {
    const pars = new Map<number, number>()
    for (let i = 0; i < 240; i++) {
      const c = generateCourse(1 + Math.floor((i * LEVEL_COUNT) / 240))
      pars.set(c.par, (pars.get(c.par) ?? 0) + 1)
    }
    expect(pars.size).toBeGreaterThanOrEqual(4)
    expect(Math.min(...pars.keys())).toBe(3)
  }, 120000)
  it('maps route length to par with sensible thresholds', () => {
    const line = (len: number) => [{ x: 0, y: 0 }, { x: len, y: 0 }]
    expect(parFromRoute(null)).toBe(3)
    expect(parFromRoute(line(250))).toBe(3)
    expect(parFromRoute(line(600))).toBe(3)
    expect(parFromRoute(line(1000))).toBe(4)
    expect(parFromRoute(line(1400))).toBe(5)
    expect(parFromRoute(line(9000))).toBe(7)
  })
})
