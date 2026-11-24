import type { Course } from '../courses/schema'
import { collideBallShape } from './collision'
import { BALL_R, CAPTURE_SPEED, MAX_SPEED, PORTAL_COOLDOWN, TERRAIN_PHYSICS, WALL_RESTITUTION } from './constants'
import { moverShapes } from './movers'
import { maskSdf, slopeAt, terrainAt } from './terrain'

export interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  portalCooldown: number
}

export interface StepEvents {
  /** Strongest wall impact speed during the step; 0 if none. */
  wall: number
  sand: boolean
  water: boolean
  oob: boolean
  holed: boolean
  portal: boolean
}

export const newEvents = (): StepEvents => ({ wall: 0, sand: false, water: false, oob: false, holed: false, portal: false })
export const ballSpeed = (b: Ball): number => Math.hypot(b.vx, b.vy)

/**
 * Advance the ball by one fixed timestep `dt`. `t` is the game clock (seconds) used to place moving obstacles, so
 * the same shot at the same clock always plays out identically. Mutates only `ball` and `ev`.
 */
export function stepBall(course: Course, ball: Ball, dt: number, ev: StepEvents, t = 0): void {
  const before = terrainAt(course, ball.x, ball.y)
  const slope = slopeAt(course, ball.x, ball.y, Math.hypot(ball.vx, ball.vy))
  ball.vx += (slope.x + course.wind.x) * dt
  ball.vy += (slope.y + course.wind.y) * dt

  const p = TERRAIN_PHYSICS[before]
  const decay = Math.exp(-p.k * dt)
  ball.vx *= decay
  ball.vy *= decay
  const sp = Math.hypot(ball.vx, ball.vy)
  if (sp > 0) {
    const f = Math.min(MAX_SPEED, Math.max(0, sp - p.c * dt)) / sp
    ball.vx *= f
    ball.vy *= f
  }

  ball.x += ball.vx * dt
  ball.y += ball.vy * dt
  ball.portalCooldown = Math.max(0, ball.portalCooldown - dt)

  // Deterministic collision order: walls in course order, two relaxation passes for corners.
  for (let pass = 0; pass < 2; pass++) {
    for (const w of course.walls) {
      const hit = collideBallShape(ball, w.shape, w.bounce ?? WALL_RESTITUTION)
      if (hit > ev.wall) ev.wall = hit
    }
    for (const m of course.movers) {
      for (const s of moverShapes(m, t)) {
        const hit = collideBallShape(ball, s, WALL_RESTITUTION)
        if (hit > ev.wall) ev.wall = hit
      }
    }
  }

  // The course edge (organic fence): keep the ball centre at least BALL_R inside the playable mask.
  const m = maskSdf(course, ball.x, ball.y)
  if (m > -BALL_R) {
    const e = 1
    const gx = maskSdf(course, ball.x + e, ball.y) - maskSdf(course, ball.x - e, ball.y)
    const gy = maskSdf(course, ball.x, ball.y + e) - maskSdf(course, ball.x, ball.y - e)
    const gl = Math.hypot(gx, gy)
    if (gl > 1e-6) {
      const nx = gx / gl
      const ny = gy / gl
      const push = m + BALL_R
      ball.x -= nx * push
      ball.y -= ny * push
      const vn = ball.vx * nx + ball.vy * ny
      if (vn > 0) {
        ball.vx -= (1 + WALL_RESTITUTION) * vn * nx
        ball.vy -= (1 + WALL_RESTITUTION) * vn * ny
        if (vn > ev.wall) ev.wall = vn
      }
    }
  }

  if (ball.portalCooldown === 0) {
    for (const pt of course.portals) {
      const ends = [
        { from: pt.a, to: pt.b, dir: pt.dirB },
        { from: pt.b, to: pt.a, dir: pt.dirA },
      ]
      for (const e of ends) {
        if (Math.hypot(ball.x - e.from.x, ball.y - e.from.y) < pt.r) {
          const s = Math.max(Math.hypot(ball.vx, ball.vy) * 0.9, 150)
          ball.x = e.to.x + e.dir.x * 6
          ball.y = e.to.y + e.dir.y * 6
          ball.vx = e.dir.x * s
          ball.vy = e.dir.y * s
          ball.portalCooldown = PORTAL_COOLDOWN
          ev.portal = true
          return
        }
      }
    }
  }

  const after = terrainAt(course, ball.x, ball.y)
  if (after === 'sand' && before !== 'sand') ev.sand = true

  const speed = Math.hypot(ball.vx, ball.vy)
  const dc = Math.hypot(ball.x - course.cup.x, ball.y - course.cup.y)
  if (dc < course.cup.r && speed < CAPTURE_SPEED) {
    ev.holed = true
    return
  }
  if (after === 'water') ev.water = true
  if (ball.x < 0 || ball.x > course.width || ball.y < 0 || ball.y > course.height) ev.oob = true
}
