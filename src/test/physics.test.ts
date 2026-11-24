import { describe, expect, it } from 'vitest'
import type { Course } from '../courses/schema'
import { DT, MAX_SPEED } from '../game/constants'
import { ballSpeed, newEvents, stepBall, type Ball } from '../game/physics'
import { flipMover, moverShapes } from '../game/movers'
import { advance, beginAim, cancelAim, createGame, type Game, resetGame, shoot, totalStrokes } from '../game/simulation'
import { predictShot } from '../game/trajectory'
import { flatCourse, wallRect } from './fixtures'

const ball = (x: number, y: number, vx = 0, vy = 0): Ball => ({ x, y, vx, vy, portalCooldown: 0 })

/** Run the game for up to `seconds` of simulated time at a fixed frame length. */
function run(g: Game, seconds: number, frame = 1 / 60): void {
  for (let t = 0; t < seconds && g.phase === 'rolling'; t += frame) advance(g, frame)
}

function runUntilNotRolling(g: Game, frame = 1 / 60): void {
  for (let i = 0; i < 60 * 60 && g.phase === 'rolling'; i++) advance(g, frame)
}

describe('stepBall', () => {
  it('moves in the launch direction', () => {
    const c = flatCourse()
    const b = ball(100, 300, 200, 0)
    stepBall(c, b, DT, newEvents())
    expect(b.x).toBeGreaterThan(100)
    expect(b.y).toBeCloseTo(300, 6)
  })

  it('slows down due to friction', () => {
    const c = flatCourse('fairway')
    const b = ball(100, 300, 200, 0)
    const ev = newEvents()
    for (let i = 0; i < 60; i++) stepBall(c, b, DT, ev)
    expect(ballSpeed(b)).toBeLessThan(200)
    expect(ballSpeed(b)).toBeGreaterThan(0)
  })

  it('decelerates by terrain: green < fairway < rough < sand', () => {
    const speeds = (['green', 'fairway', 'rough', 'sand'] as const).map((t) => {
      const c = flatCourse(t)
      const b = ball(100, 300, 200, 0)
      for (let i = 0; i < 60; i++) stepBall(c, b, DT, newEvents())
      return ballSpeed(b)
    })
    expect(speeds[0]).toBeGreaterThan(speeds[1] as number)
    expect(speeds[1]).toBeGreaterThan(speeds[2] as number)
    expect(speeds[2]).toBeGreaterThan(speeds[3] as number)
  })

  it('is independent of render frame rate', () => {
    const final = (frame: number) => {
      const g = createGame(flatCourse('fairway'))
      shoot(g, 1, 0, 0.8)
      for (let t = 0; t < 1.5; t += frame) advance(g, frame)
      return g.ball.x
    }
    // Fixed timestep: same distance at 30, 60 and 144 fps (within one step of quantization).
    expect(Math.abs(final(1 / 30) - final(1 / 144))).toBeLessThan(5)
    expect(Math.abs(final(1 / 60) - final(1 / 144))).toBeLessThan(5)
  })

  it('reflects velocity off a wall with damping', () => {
    const c = flatCourse('fairway', [wallRect(400, 0, 20, 600)])
    const b = ball(380, 300, 300, 0)
    const ev = newEvents()
    for (let i = 0; i < 20 && b.vx > 0; i++) stepBall(c, b, DT, ev)
    expect(b.vx).toBeLessThan(0)
    expect(Math.abs(b.vx)).toBeLessThan(300 * 0.6)
    expect(ev.wall).toBeGreaterThan(100)
  })

  it('resolves penetration into obstacles (including a centre inside the rectangle)', () => {
    const c = flatCourse('fairway', [wallRect(300, 250, 100, 100)])
    const b = ball(310, 300, 0, 0) // centre inside
    stepBall(c, b, DT, newEvents())
    const outside = b.x < 300 - 8 + 0.001 || b.x > 400 + 8 - 0.001 || b.y < 250 - 8 + 0.001 || b.y > 350 + 8 - 0.001
    expect(outside).toBe(true)
  })

  it('bounces off circular and capsule obstacles', () => {
    for (const shape of [
      { t: 'circle', x: 400, y: 300, r: 20 },
      { t: 'capsule', x1: 400, y1: 200, x2: 400, y2: 400, r: 6 },
    ] as const) {
      const c = flatCourse('fairway', [{ shape, style: 'wood' }])
      const b = ball(360, 300, 300, 0)
      for (let i = 0; i < 40; i++) stepBall(c, b, DT, newEvents())
      expect(b.vx).toBeLessThan(0)
    }
  })

  it('applies slope acceleration downhill', () => {
    const c = flatCourse('green')
    c.slopes = [{ shape: { t: 'rect', x: 0, y: 0, w: 800, h: 600 }, ax: 0, ay: 25 }]
    const b = ball(300, 100, 0, 40)
    for (let i = 0; i < 120; i++) stepBall(c, b, DT, newEvents())
    // Rolling downhill (+y) it keeps more speed than on a flat green.
    const flat = flatCourse('green')
    const b2 = ball(300, 100, 0, 40)
    for (let i = 0; i < 120; i++) stepBall(flat, b2, DT, newEvents())
    expect(b.vy).toBeGreaterThan(b2.vy)
  })

  it('a ball at rest on a legal slope stays at rest', () => {
    const c = flatCourse('fairway')
    c.slopes = [{ shape: { t: 'rect', x: 0, y: 0, w: 800, h: 600 }, ax: 20, ay: 0 }]
    const b = ball(300, 300)
    for (let i = 0; i < 600; i++) stepBall(c, b, DT, newEvents())
    expect(b.x).toBeCloseTo(300, 3)
  })

  it('clamps velocity to the maximum shot speed', () => {
    const c = flatCourse('green')
    const b = ball(100, 300, 5000, 0)
    stepBall(c, b, DT, newEvents())
    expect(ballSpeed(b)).toBeLessThanOrEqual(MAX_SPEED + 1e-6)
  })

  it('does not tunnel through a thin wall at max speed', () => {
    const c = flatCourse('green', [wallRect(400, 0, 10, 600)])
    const g = createGame(c)
    shoot(g, 1, 0, 1)
    run(g, 3)
    expect(g.ball.x).toBeLessThan(400)
  })

  it('teleports through a portal pair and is not re-captured immediately', () => {
    const c = flatCourse('fairway')
    c.portals = [{ a: { x: 300, y: 300 }, b: { x: 500, y: 300 }, r: 16, dirA: { x: -1, y: 0 }, dirB: { x: 1, y: 0 } }]
    const b = ball(285, 300, 200, 0)
    const ev = newEvents()
    for (let i = 0; i < 12; i++) stepBall(c, b, DT, ev)
    expect(ev.portal).toBe(true)
    expect(b.x).toBeGreaterThan(500)
  })
})

describe('simulation', () => {
  it('a normal shot eventually settles and re-enables aiming without losing strokes', () => {
    const g = createGame(flatCourse('fairway'))
    expect(shoot(g, 1, 0.1, 0.5)).toBe(true)
    runUntilNotRolling(g)
    expect(g.phase).toBe('ready')
    expect(g.strokes).toBe(1)
    expect(g.ball.vx).toBe(0)
    expect(g.safe.x).toBeCloseTo(g.ball.x, 6)
    expect(beginAim(g)).toBe(true)
    expect(cancelAim(g)).toBe(true)
  })

  it('rejects shots while rolling, in hazard recovery and after completion', () => {
    const g = createGame(flatCourse('fairway'))
    shoot(g, 1, 0, 0.3)
    expect(shoot(g, 1, 0, 0.3)).toBe(false)
    expect(g.strokes).toBe(1)
    expect(beginAim(g)).toBe(false)
    g.phase = 'complete'
    expect(shoot(g, 1, 0, 1)).toBe(false)
    g.phase = 'hazard'
    expect(shoot(g, 1, 0, 1)).toBe(false)
  })

  it('rejects zero-power or zero-direction shots', () => {
    const g = createGame(flatCourse())
    expect(shoot(g, 1, 0, 0)).toBe(false)
    expect(shoot(g, 0, 0, 1)).toBe(false)
    expect(g.strokes).toBe(0)
  })

  function waterCourse(): Course {
    const c = flatCourse('fairway')
    c.regions.push({ terrain: 'water', shape: { t: 'rect', x: 300, y: 0, w: 100, h: 600 } })
    return c
  }

  it('water adds exactly one penalty and returns to the previous safe position', () => {
    const g = createGame(waterCourse())
    shoot(g, 1, 0, 0.9)
    runUntilNotRolling(g)
    expect(g.phase).toBe('hazard')
    expect(g.hazard).toBe('water')
    expect(g.penalties).toBe(1)
    expect(g.strokes).toBe(1)
    for (let i = 0; i < 200; i++) advance(g, 1 / 60) // extra frames must not add penalties
    expect(g.penalties).toBe(1)
    expect(g.phase).toBe('ready')
    expect(g.ball.x).toBe(100)
    expect(g.ball.y).toBe(300)
    expect(g.ball.vx).toBe(0)
    expect(totalStrokes(g)).toBe(2)
  })

  it('out of bounds adds exactly one penalty and restores the safe position', () => {
    const g = createGame(flatCourse('fairway')) // no walls: the ball can leave the world
    shoot(g, -1, 0, 1)
    runUntilNotRolling(g)
    expect(g.phase).toBe('hazard')
    expect(g.hazard).toBe('oob')
    expect(g.penalties).toBe(1)
    for (let i = 0; i < 100; i++) advance(g, 1 / 60)
    expect(g.penalties).toBe(1)
    expect(g.ball.x).toBe(100)
  })

  it('uses the last settled position as the safe position', () => {
    const c = waterCourse()
    const g = createGame(c)
    shoot(g, 1, 0, 0.35)
    runUntilNotRolling(g)
    expect(g.phase).toBe('ready')
    const safeX = g.ball.x
    expect(safeX).toBeGreaterThan(100)
    shoot(g, 1, 0, 1)
    runUntilNotRolling(g)
    for (let i = 0; i < 100; i++) advance(g, 1 / 60)
    expect(g.ball.x).toBeCloseTo(safeX, 6)
  })

  it('captures a slow ball in the cup exactly once', () => {
    const g = createGame(flatCourse('green'))
    g.ball.x = 686
    g.ball.y = 300
    shoot(g, 1, 0, 0.12)
    let holed = 0
    for (let i = 0; i < 300; i++) if (advance(g, 1 / 60).holed) holed++
    expect(holed).toBe(1)
    expect(g.phase).toBe('complete')
    expect(g.strokes).toBe(1)
    expect(shoot(g, 1, 0, 1)).toBe(false)
  })

  it('does not capture a ball that is moving too fast', () => {
    const g = createGame(flatCourse('green'))
    g.ball.x = 600
    shoot(g, 1, 0, 1)
    let holed = false
    for (let i = 0; i < 40; i++) holed ||= advance(g, 1 / 60).holed
    expect(holed).toBe(false)
  })

  it('handles huge frame deltas without a spiral of death', () => {
    const g = createGame(flatCourse('fairway'))
    shoot(g, 1, 0, 1)
    const t0 = performance.now()
    advance(g, 5) // simulates a suspended tab resuming
    expect(performance.now() - t0).toBeLessThan(200)
  })

  it('replay resets the round but keeps the course', () => {
    const c = flatCourse('fairway')
    const g = createGame(c)
    shoot(g, 1, 0, 0.5)
    runUntilNotRolling(g)
    resetGame(g)
    expect(g.course).toBe(c)
    expect([g.strokes, g.penalties, g.phase]).toEqual([0, 0, 'ready'])
    expect([g.ball.x, g.ball.y, g.safe.x]).toEqual([100, 300, 100])
  })
})

describe('trajectory prediction', () => {
  it('uses the live physics and does not mutate game state', () => {
    const c = flatCourse('fairway', [wallRect(250, 0, 20, 600)])
    const g = createGame(c)
    const before = JSON.stringify(g)
    const p = predictShot(c, g.ball, 1, 0, 0.8)
    expect(JSON.stringify(g)).toBe(before)
    expect(p.points.length).toBeGreaterThan(3)
    expect(p.bounces.length).toBeGreaterThan(0) // respects walls
  })

  it('predicts the same path the live shot takes', () => {
    const c = flatCourse('fairway')
    const g = createGame(c)
    const p = predictShot(c, g.ball, 1, 0, 0.5)
    shoot(g, 1, 0, 0.5)
    const n = (p.points.length - 1) * 6
    for (let i = 0; i < n; i++) advance(g, DT)
    const last = p.points[p.points.length - 1]
    expect(Math.abs(g.ball.x - (last?.x ?? 0))).toBeLessThan(1)
  })

  it('flags hazard endings', () => {
    const c = flatCourse('fairway')
    c.regions.push({ terrain: 'water', shape: { t: 'rect', x: 250, y: 0, w: 100, h: 600 } })
    expect(predictShot(c, { x: 100, y: 300 }, 1, 0, 1).end).toBe('water')
  })
})

describe('weather and new mechanics', () => {
  const rollFor = (c: ReturnType<typeof flatCourse>, vx: number, steps = 60, t0 = 0) => {
    const b = ball(100, 300, vx, 0)
    for (let i = 0; i < steps; i++) stepBall(c, b, DT, newEvents(), t0 + i * DT)
    return b
  }
  const withRegion = (terrain: 'ice' | 'puddle') => {
    const c = flatCourse('fairway')
    c.regions.push({ terrain, shape: { t: 'rect', x: 0, y: 0, w: 800, h: 600 } })
    return c
  }

  it('ice is far more slippery than fairway and puddles slow the ball more', () => {
    const fair = rollFor(flatCourse('fairway'), 200)
    const ice = rollFor(withRegion('ice'), 200)
    const mud = rollFor(withRegion('puddle'), 200)
    expect(ice.vx).toBeGreaterThan(fair.vx)
    expect(mud.vx).toBeLessThan(fair.vx)
    expect(ice.vx).toBeGreaterThan(185)
  })

  it('wind pushes a moving ball but never a resting one', () => {
    const c = flatCourse('fairway')
    c.wind = { x: 0, y: 12 }
    const moving = rollFor(c, 120, 120)
    expect(moving.y).toBeGreaterThan(300)
    const rest = rollFor(c, 0, 600)
    expect(Math.abs(rest.y - 300)).toBeLessThan(0.01)
    expect(rest.vy).toBe(0)
  })

  it('speed pads only accelerate a ball that is already moving', () => {
    const c = flatCourse('fairway')
    c.slopes = [{ kind: 'boost', shape: { t: 'circle', x: 100, y: 300, r: 60 }, ax: 130, ay: 0 }]
    const still = rollFor(c, 0, 120)
    expect(still.x).toBeCloseTo(100, 6)
    const rolling = rollFor(c, 60, 60)
    const plain = rollFor(flatCourse('fairway'), 60, 60)
    expect(rolling.vx).toBeGreaterThan(plain.vx + 20)
  })

  it('pop bumpers return more speed than they receive', () => {
    const mk = (bounce?: number) => {
      const c = flatCourse('fairway', [{ shape: { t: 'circle', x: 200, y: 300, r: 14 }, style: bounce ? 'bouncer' : 'tire', bounce }])
      const b = ball(172, 300, 200, 0)
      let out = 0
      for (let i = 0; i < 20; i++) {
        stepBall(c, b, DT, newEvents(), 0)
        if (b.vx < 0) out = Math.max(out, -b.vx)
      }
      return out
    }
    expect(mk(1.4)).toBeGreaterThan(mk())
    expect(mk(1.4)).toBeGreaterThan(200)
  })

  it('moving obstacles are a pure function of the game clock and block the ball', () => {
    const rotor = { kind: 'rotor' as const, x: 300, y: 300, arms: 1, len: 60, r: 5, w: 1, phase: 0 }
    expect(moverShapes(rotor, 0)).toEqual(moverShapes(rotor, 0))
    expect(JSON.stringify(moverShapes(rotor, 0))).not.toBe(JSON.stringify(moverShapes(rotor, 1)))
    // Arm points along +x at t=0, so a ball rolling along y=300 from the left hits the hub side of it.
    const c = flatCourse('fairway')
    c.movers = [{ ...rotor, w: 0 }]
    const b = ball(240, 303, 150, 0)
    let maxX = 0
    for (let i = 0; i < 400; i++) {
      stepBall(c, b, DT, newEvents(), 0)
      maxX = Math.max(maxX, b.x)
    }
    expect(maxX).toBeLessThan(300)
    // Without the mover the same shot passes straight through.
    const free = ball(240, 303, 150, 0)
    for (let i = 0; i < 400; i++) stepBall(flatCourse('fairway'), free, DT, newEvents(), 0)
    expect(free.x).toBeGreaterThan(300)
  })

  it('flipping a mover mirrors its geometry', () => {
    const m = { kind: 'orbit' as const, x: 100, y: 200, R: 40, r: 10, w: 1, phase: 0.5 }
    const f = flipMover(m, true, false, 800, 600)
    const a = moverShapes(m, 2)[0]
    const b = moverShapes(f, 2)[0]
    if (a?.t !== 'circle' || b?.t !== 'circle') throw new Error('shape')
    expect(b.x).toBeCloseTo(800 - a.x, 6)
    expect(b.y).toBeCloseTo(a.y, 6)
  })

  it('the aim preview takes the game clock into account', () => {
    const c = flatCourse('fairway')
    c.movers = [{ kind: 'slider', ax: 220, ay: 240, bx: 220, by: 360, bar: false, r: 13, len: 40, w: 1.5, phase: 0 }]
    const ends = new Set<number>()
    for (const clock of [0, 0.5, 1, 1.5, 2, 2.5]) {
      const pr = predictShot(c, { x: 100, y: 300 }, 1, 0, 0.6, clock)
      ends.add(Math.round(pr.points[pr.points.length - 1]?.x ?? 0))
    }
    expect(ends.size).toBeGreaterThan(1)
  })
})
