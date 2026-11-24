import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { generateCourse } from '../../courses/generator'
import { LEVEL_COUNT, seasonOf, templateForLevel, tierOf } from '../../courses/levels'
import { validateCourse } from '../../courses/validator'

export interface LevelRow {
  level: number
  template: string
  theme: string
  tier: number
  par: number
  fallback: boolean
  valid: boolean
  ms: number
  npcs: number
  props: number
  movers: number
  hasClubhouse: boolean
  ice: number
  puddles: number
  wind: number
}

/** Generate and validate one slice of the level space; write a JSON row per level for the report. */
export function verifySlice(slice: number, slices: number): void {
  it(`slice ${slice + 1}/${slices}`, { timeout: 3_600_000 }, () => {
    const rows: LevelRow[] = []
    for (let level = 1 + slice; level <= LEVEL_COUNT; level += slices) {
      const t0 = performance.now()
      const c = generateCourse(level)
      const ms = performance.now() - t0
      const v = validateCourse(c)
      rows.push({
        level,
        template: templateForLevel(level),
        theme: seasonOf(level),
        tier: tierOf(level),
        par: c.par,
        fallback: c.meta.usedFallback,
        valid: v.ok,
        ms: Math.round(ms * 10) / 10,
        npcs: c.npcs.length,
        props: c.props.length,
        movers: c.movers.length,
        hasClubhouse: c.props.some((p) => p.kind === 'clubhouse'),
        ice: c.regions.filter((r) => r.terrain === 'ice').length,
        puddles: c.regions.filter((r) => r.terrain === 'puddle').length,
        wind: Math.round(Math.hypot(c.wind.x, c.wind.y) * 10) / 10,
      })
    }
    mkdirSync('.level-report', { recursive: true })
    writeFileSync(`.level-report/slice-${slice}.json`, JSON.stringify(rows))
    const invalid = rows.filter((r) => !r.valid)
    expect(invalid.map((r) => r.level), 'invalid levels').toEqual([])
  })
}
