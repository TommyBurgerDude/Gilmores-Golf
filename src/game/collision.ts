import type { Shape } from '../courses/schema'
import { BALL_R } from './constants'
import { coreOf } from './shapes'

export interface BallLike {
  x: number
  y: number
  vx: number
  vy: number
}

/**
 * Resolve a ball (circle of BALL_R) against a static shape: push it out along the contact normal and
 * reflect the normal velocity component with restitution `e`.
 * Returns the impact speed along the normal (0 if the ball was only pushed out / not colliding).
 */
export function collideBallShape(ball: BallLike, s: Shape, e: number): number {
  const core = coreOf(s, ball.x, ball.y)
  const dx = ball.x - core.cx
  const dy = ball.y - core.cy
  const d = Math.hypot(dx, dy)
  const minD = BALL_R + core.r
  if (d >= minD) return 0

  let nx: number
  let ny: number
  if (s.t === 'rect' && d < 1e-9) {
    // Ball centre is inside the rectangle: exit through the nearest face.
    const l = ball.x - s.x
    const r = s.x + s.w - ball.x
    const t = ball.y - s.y
    const b = s.y + s.h - ball.y
    const m = Math.min(l, r, t, b)
    if (m === l) {
      nx = -1
      ny = 0
      ball.x = s.x - BALL_R
    } else if (m === r) {
      nx = 1
      ny = 0
      ball.x = s.x + s.w + BALL_R
    } else if (m === t) {
      nx = 0
      ny = -1
      ball.y = s.y - BALL_R
    } else {
      nx = 0
      ny = 1
      ball.y = s.y + s.h + BALL_R
    }
  } else if (d < 1e-9) {
    nx = 1
    ny = 0
    ball.x = core.cx + minD
    ball.y = core.cy
  } else {
    nx = dx / d
    ny = dy / d
    ball.x = core.cx + nx * minD
    ball.y = core.cy + ny * minD
  }

  const vn = ball.vx * nx + ball.vy * ny
  if (vn >= 0) return 0
  ball.vx -= (1 + e) * vn * nx
  ball.vy -= (1 + e) * vn * ny
  return -vn
}
