import { describe, expect, it } from 'vitest'
import { advance, createGame, shoot } from '../game/simulation'
import { flatCourse } from './fixtures'

function travel(terrain: 'green' | 'fairway' | 'rough' | 'sand', power: number): number {
  const g = createGame(flatCourse(terrain))
  g.ball.x = 20
  shoot(g, 1, 0, power)
  for (let i = 0; i < 6000 && g.phase === 'rolling'; i++) advance(g, 1 / 60)
  return g.ball.x - 20
}

describe('power tuning', () => {
  it('travel distance grows roughly linearly with power on every terrain', () => {
    for (const t of ['green', 'fairway', 'rough', 'sand'] as const) {
      const full = travel(t, 1)
      for (const p of [0.25, 0.5, 0.75]) {
        const ratio = travel(t, p) / full
        expect(ratio, `${t} @${p}`).toBeGreaterThan(p * 0.75)
        expect(ratio, `${t} @${p}`).toBeLessThan(p * 1.35)
      }
    }
  })

  it('a full fairway shot covers roughly half the hole; a light tap still moves the ball', () => {
    expect(travel('fairway', 1)).toBeGreaterThan(330)
    expect(travel('fairway', 1)).toBeLessThan(480)
    expect(travel('fairway', 0.1)).toBeGreaterThan(30)
    expect(travel('green', 0.1)).toBeLessThan(90)
  })
})
