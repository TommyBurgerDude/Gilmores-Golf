import type { Course, Vec } from '../courses/schema'
import { DT, HAZARD_TIME, MAX_FRAME, powerToSpeed, MAX_STEPS_PER_FRAME, REST_SPEED, REST_TIME } from './constants'
import { type Ball, ballSpeed, newEvents, stepBall } from './physics'
import { terrainAt } from './terrain'

export type Phase = 'ready' | 'aiming' | 'rolling' | 'hazard' | 'complete'
export type HazardKind = 'water' | 'oob'

export interface Game {
  course: Course
  phase: Phase
  ball: Ball
  safe: Vec
  strokes: number
  penalties: number
  restTime: number
  acc: number
  hazardTimer: number
  hazard: HazardKind | null
  holeTime: number
  /** Seconds of game time; drives moving obstacles. Always advances. */
  clock: number
}

/** What happened during one `advance` call (consumed by audio / particles; never feeds back into physics). */
export interface FrameEvents {
  wall: number
  sand: boolean
  water: boolean
  oob: boolean
  holed: boolean
  portal: boolean
  settled: boolean
}

const newBall = (p: Vec): Ball => ({ x: p.x, y: p.y, vx: 0, vy: 0, portalCooldown: 0 })

export function createGame(course: Course): Game {
  return {
    course,
    phase: 'ready',
    ball: newBall(course.tee),
    safe: { ...course.tee },
    strokes: 0,
    penalties: 0,
    restTime: 0,
    acc: 0,
    hazardTimer: 0,
    hazard: null,
    holeTime: 0,
    clock: 0,
  }
}

/** Replay: same course, fresh round. */
export function resetGame(g: Game): void {
  Object.assign(g, createGame(g.course))
}

export const totalStrokes = (g: Game): number => g.strokes + g.penalties

export function beginAim(g: Game): boolean {
  if (g.phase !== 'ready') return false
  g.phase = 'aiming'
  return true
}

export function cancelAim(g: Game): boolean {
  if (g.phase !== 'aiming') return false
  g.phase = 'ready'
  return true
}

/** Launch the ball. `power` is 0..1. Ignored unless the ball is stationary and aimable. */
export function shoot(g: Game, dirX: number, dirY: number, power: number): boolean {
  if (g.phase !== 'ready' && g.phase !== 'aiming') return false
  const l = Math.hypot(dirX, dirY)
  if (l < 1e-9 || !(power > 0)) return false
  const sp = powerToSpeed(power)
  g.ball.vx = (dirX / l) * sp
  g.ball.vy = (dirY / l) * sp
  g.strokes += 1
  g.phase = 'rolling'
  g.restTime = 0
  g.acc = 0
  return true
}

export function advance(g: Game, frameDt: number): FrameEvents {
  const out: FrameEvents = { wall: 0, sand: false, water: false, oob: false, holed: false, portal: false, settled: false }
  // Outside a shot the clock follows real frame time; during a shot it advances in exact fixed steps below.
  if (g.phase !== 'rolling') g.clock += Math.min(Math.max(frameDt, 0), MAX_FRAME)

  if (g.phase === 'hazard') {
    g.hazardTimer -= frameDt
    if (g.hazardTimer <= 0) {
      g.ball = newBall(g.safe)
      g.hazard = null
      g.phase = 'ready'
    }
    return out
  }
  if (g.phase === 'complete') {
    g.holeTime += frameDt
    return out
  }
  if (g.phase !== 'rolling') return out

  g.acc += Math.min(Math.max(frameDt, 0), MAX_FRAME)
  let steps = 0
  while (g.acc >= DT && steps < MAX_STEPS_PER_FRAME && g.phase === 'rolling') {
    g.acc -= DT
    steps++
    const ev = newEvents()
    stepBall(g.course, g.ball, DT, ev, g.clock)
    g.clock += DT
    out.wall = Math.max(out.wall, ev.wall)
    out.sand ||= ev.sand
    out.portal ||= ev.portal

    if (ev.holed) {
      g.phase = 'complete'
      g.ball.x = g.course.cup.x
      g.ball.y = g.course.cup.y
      g.ball.vx = 0
      g.ball.vy = 0
      g.holeTime = 0
      out.holed = true
      return out
    }
    if (ev.water || ev.oob) {
      // Exactly one penalty per incident: the phase leaves 'rolling' immediately.
      g.penalties += 1
      g.phase = 'hazard'
      g.hazard = ev.water ? 'water' : 'oob'
      g.hazardTimer = HAZARD_TIME
      g.ball.vx = 0
      g.ball.vy = 0
      out.water = ev.water
      out.oob = !ev.water
      return out
    }

    if (ballSpeed(g.ball) < REST_SPEED) g.restTime += DT
    else g.restTime = 0
    if (g.restTime >= REST_TIME) {
      g.ball.vx = 0
      g.ball.vy = 0
      if (terrainAt(g.course, g.ball.x, g.ball.y) !== 'water') g.safe = { x: g.ball.x, y: g.ball.y }
      g.phase = 'ready'
      out.settled = true
      return out
    }
  }
  if (steps >= MAX_STEPS_PER_FRAME) g.acc = 0 // drop catch-up debt instead of spiralling
  return out
}
