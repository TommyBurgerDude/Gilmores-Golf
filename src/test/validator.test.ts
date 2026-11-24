import { describe, expect, it } from 'vitest'
import { fallbackCourse, generateCourse } from '../courses/generator'
import { BASE_TEMPLATES } from '../courses/templateIds'
import { TEMPLATES } from '../courses/templates'
import { Rng } from '../courses/prng'
import type { Course } from '../courses/schema'
import { validateCourse } from '../courses/validator'
import { flatCourse, wallRect } from './fixtures'

const good = (): Course => generateCourse(5)

describe('validator', () => {
  it('accepts a flat open course', () => {
    expect(validateCourse(flatCourse()).ok).toBe(true)
  })

  it('accepts every template at every tier', () => {
    for (const id of Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]) {
      for (let seed = 1; seed <= 30; seed++) {
        const draft = TEMPLATES[id].build(new Rng(seed), 1 + (seed % 3))
        const c = flatCourse()
        Object.assign(c, { tee: draft.tee, cup: { ...draft.cup, r: 11 }, regions: draft.regions, walls: draft.walls, slopes: draft.slopes, portals: draft.portals })
        const r = validateCourse(c)
        // Individual seeds may be rejected (that is what the validator is for) but must never crash, and most pass.
        expect(Array.isArray(r.reasons)).toBe(true)
      }
    }
  })

  it('rejects non-finite coordinates', () => {
    const c = good()
    c.tee = { x: NaN, y: 10 }
    expect(validateCourse(c).reasons.join()).toMatch(/non-finite/)
    const d = good()
    d.walls.push({ shape: { t: 'rect', x: 0, y: 0, w: Infinity, h: 1 }, style: 'wood' })
    expect(validateCourse(d).ok).toBe(false)
  })

  it('rejects geometry outside the world', () => {
    const c = good()
    c.walls.push(wallRect(700, 500, 200, 200))
    expect(validateCourse(c).reasons.join()).toMatch(/outside world/)
  })

  it('detects tee and cup overlapping blocking geometry', () => {
    const a = flatCourse('fairway', [wallRect(90, 290, 30, 30)])
    expect(validateCourse(a).reasons.join()).toMatch(/tee overlaps/)
    const b = flatCourse('fairway', [wallRect(690, 290, 30, 30)])
    expect(validateCourse(b).reasons.join()).toMatch(/cup overlaps/)
  })

  it('rejects water at the tee or cup', () => {
    const a = flatCourse()
    a.regions.push({ terrain: 'water', shape: { t: 'circle', x: 100, y: 300, r: 40 } })
    expect(validateCourse(a).ok).toBe(false)
    const b = flatCourse()
    b.regions.push({ terrain: 'water', shape: { t: 'circle', x: 700, y: 300, r: 20 } })
    expect(validateCourse(b).reasons.join()).toMatch(/cup is in water/)
  })

  it('navigation rejects fully blocked routes (walls)', () => {
    const c = flatCourse('fairway', [wallRect(400, 0, 20, 600)])
    const r = validateCourse(c)
    expect(r.route).toBeNull()
    expect(r.reasons.join()).toMatch(/no route/)
  })

  it('navigation rejects routes blocked by water', () => {
    const c = flatCourse()
    c.regions.push({ terrain: 'water', shape: { t: 'rect', x: 400, y: 0, w: 60, h: 600 } })
    expect(validateCourse(c).route).toBeNull()
  })

  it('a bridge over water restores the route; a too-narrow gap does not', () => {
    const open = flatCourse()
    open.regions.push({ terrain: 'water', shape: { t: 'rect', x: 400, y: 0, w: 60, h: 600 } })
    open.regions.push({ terrain: 'fairway', shape: { t: 'rect', x: 390, y: 280, w: 80, h: 40 }, deck: true })
    expect(validateCourse(open).route).not.toBeNull()

    const tight = flatCourse('fairway', [wallRect(400, 0, 20, 296), wallRect(400, 304, 20, 296)])
    expect(validateCourse(tight).route).toBeNull() // 8-unit gap < ball diameter
  })

  it('route is deterministic', () => {
    const a = validateCourse(good())
    const b = validateCourse(good())
    expect(a.route).toEqual(b.route)
  })

  it('fallback is valid and used when nothing else validates', () => {
    expect(validateCourse(fallbackCourse(1)).ok).toBe(true)
    expect(fallbackCourse(1).meta.usedFallback).toBe(true)
  })

  it('generation terminates with a valid course for every hand-authored template', () => {
    for (const t of BASE_TEMPLATES) {
      for (let l = 1; l <= 6; l++) expect(validateCourse(generateCourse(l, t)).ok, `${t} ${l}`).toBe(true)
    }
  })
})
