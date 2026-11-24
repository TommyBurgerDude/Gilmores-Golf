import type { Course, Vec } from '../courses/schema'
import { DT, PREDICT_SECONDS, powerToSpeed } from './constants'
import { type Ball, newEvents, stepBall } from './physics'

export interface Prediction {
  points: Vec[]
  end: 'horizon' | 'rest' | 'water' | 'oob' | 'hole'
  bounces: Vec[]
}

/**
 * Predict a shot with the same stepBall() the live simulation uses, on a private copy of the ball.
 * Never touches game state.
 */
export function predictShot(course: Course, from: Vec, dirX: number, dirY: number, power: number, clock = 0): Prediction {
  const l = Math.hypot(dirX, dirY) || 1
  const sp = powerToSpeed(power)
  const b: Ball = { x: from.x, y: from.y, vx: (dirX / l) * sp, vy: (dirY / l) * sp, portalCooldown: 0 }
  const points: Vec[] = [{ x: b.x, y: b.y }]
  const bounces: Vec[] = []
  const n = Math.round(PREDICT_SECONDS / DT)
  let end: Prediction['end'] = 'horizon'
  for (let i = 1; i <= n; i++) {
    const ev = newEvents()
    stepBall(course, b, DT, ev, clock + (i - 1) * DT)
    if (ev.wall > 20) bounces.push({ x: b.x, y: b.y })
    if (i % 6 === 0) points.push({ x: b.x, y: b.y })
    if (ev.holed) return { points: [...points, { x: b.x, y: b.y }], end: 'hole', bounces }
    if (ev.water || ev.oob) return { points: [...points, { x: b.x, y: b.y }], end: ev.water ? 'water' : 'oob', bounces }
    if (Math.hypot(b.vx, b.vy) < 7) {
      end = 'rest'
      points.push({ x: b.x, y: b.y })
      break
    }
  }
  return { points, end, bounces }
}
