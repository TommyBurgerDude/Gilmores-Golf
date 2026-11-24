import { describe, expect, it } from 'vitest'
import { scoreResult } from '../game/scoring'

describe('scoreResult (par 3 unless noted)', () => {
  it.each([
    [1, 'Ace', '-2'],
    [2, 'Birdie', '-1'],
    [3, 'Par', 'E'],
    [4, 'Bogey', '+1'],
    [5, 'Double Bogey', '+2'],
    [6, '3 over par', '+3'],
    [9, '6 over par', '+6'],
  ])('%i strokes -> %s (%s)', (strokes, name, rel) => {
    const r = scoreResult(strokes, 3)
    expect(r.name).toBe(name)
    expect(r.relative).toBe(rel)
  })

  it('names an eagle as two under par', () => {
    expect(scoreResult(3, 5).name).toBe('Eagle')
    expect(scoreResult(2, 4).name).toBe('Eagle')
  })
})
