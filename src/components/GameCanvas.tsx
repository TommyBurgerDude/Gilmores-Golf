import { useEffect, useRef } from 'react'
import type { Course, Vec } from '../courses/schema'
import { validateCourse } from '../courses/validator'
import { sound } from '../game/audio'
import { MAX_SPEED } from '../game/constants'
import { attachInput } from '../game/input'
import { PAL } from '../game/palette'
import { terrainAt } from '../game/terrain'
import { Crowd } from '../game/crowd'
import { Particles } from '../game/particles'
import { Renderer } from '../game/renderer'
import { predictShot } from '../game/trajectory'
import { advance, createGame, type Game, resetGame, shoot } from '../game/simulation'
import type { AimState, GameStatus } from '../game/types'

interface Props {
  course: Course
  resetToken: number
  debug: boolean
  /** Board drawn rotated 90 degrees (narrow portrait screens) so it fills the width. */
  rotated: boolean
  onStatus: (s: GameStatus) => void
}

declare global {
  interface Window {
    __gilmores?: {
      game: () => Game
      shoot: (dx: number, dy: number, power: number) => boolean
      holeIn: () => void
      crowd: () => { x: number; y: number; walking: boolean }[]
    }
  }
}

export function GameCanvas({ course, resetToken, debug, rotated, onStatus }: Props) {
  const rotatedRef = useRef(rotated)
  useEffect(() => {
    rotatedRef.current = rotated
  }, [rotated])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  const trailRef = useRef<Vec[]>([])
  const particlesRef = useRef(new Particles())
  const crowdRef = useRef<Crowd | null>(null)
  const statusCb = useRef(onStatus)
  useEffect(() => {
    statusCb.current = onStatus
  }, [onStatus])

  // Replay: same course, fresh round.
  useEffect(() => {
    if (gameRef.current) resetGame(gameRef.current)
    trailRef.current = []
    particlesRef.current.clear()
    crowdRef.current?.reset()
  }, [resetToken])

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement
    const game = createGame(course)
    gameRef.current = game
    const renderer = new Renderer(canvas, course, () => rotatedRef.current)
    const particles = particlesRef.current
    const crowd = new Crowd(course.npcs, course)
    crowdRef.current = crowd
    particles.clear()
    const validation = debug ? validateCourse(course) : null
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let aim: AimState | null = null
    let last = performance.now()
    let key = ''
    let raf = 0

    const detach = attachInput(canvas, {
      getGame: () => game,
      rotated: () => rotatedRef.current,
      onAim: (a) => {
        aim = a
      },
      onShoot: () => {
        sound.play('hit', game.ball.vx !== 0 || game.ball.vy !== 0 ? Math.hypot(game.ball.vx, game.ball.vy) / MAX_SPEED : 0.5)
        trailRef.current = []
        const frac = Math.hypot(game.ball.vx, game.ball.vy) / MAX_SPEED
        if (game.strokes === 1) crowd.react('first', game.ball)
        else if (frac > 0.9) crowd.react('bigshot', game.ball)
        else if (frac < 0.3) crowd.react('tap', game.ball)
        else crowd.react('shot', game.ball, game.strokes)
      },
    })

    const ro = new ResizeObserver(() => renderer.resize())
    ro.observe(canvas)

    if (import.meta.env.DEV) {
      window.__gilmores = {
        game: () => game,
        crowd: () => crowd.people,
        shoot: (dx, dy, p) => {
          const ok = shoot(game, dx, dy, p)
          return ok
        },
        // Dev/test hook: drop the ball slowly onto the cup to exercise the real capture path.
        holeIn: () => {
          game.ball.x = game.course.cup.x - 14
          game.ball.y = game.course.cup.y
          shoot(game, 1, 0, 0.12)
        },
      }
    }

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const ev = advance(game, dt)
      if (ev.wall > 40) {
        crowd.react('bounce', game.ball)
        sound.play('wall', ev.wall / MAX_SPEED)
        particles.burst(game.ball.x, game.ball.y, reduced.matches ? 0 : 4, [PAL.cream, PAL.woodPale], 50, 0.3)
      }
      if (ev.sand) {
        crowd.react('sand', game.ball)
        sound.play('sand')
        particles.burst(game.ball.x, game.ball.y, reduced.matches ? 0 : 8, [PAL.sand, PAL.sandLight, PAL.sandDark], 60, 0.4)
      }
      if (ev.portal) {
        crowd.react('portal', game.ball)
        sound.play('portal')
      }
      if (ev.water || ev.oob) {
        crowd.react(game.penalties >= 2 ? 'again' : ev.water ? 'water' : 'oob', game.ball)
        sound.play('water')
        particles.burst(game.ball.x, game.ball.y, reduced.matches ? 0 : 14, [PAL.waterLight, PAL.white, PAL.water], 80, 0.6, 3)
      }
      if (ev.settled) {
        const dc = Math.hypot(game.ball.x - course.cup.x, game.ball.y - course.cup.y)
        if (dc < 55) crowd.react('near', game.ball)
        else if (terrainAt(course, game.ball.x, game.ball.y) === 'green') crowd.react('green', game.ball)
      }
      if (ev.holed) {
        crowd.react('hole', course.cup, game.strokes + game.penalties)
        sound.play('hole')
        particles.burst(course.cup.x, course.cup.y, reduced.matches ? 0 : 26, [PAL.yellow, PAL.coral, PAL.cream, PAL.green], 120, 0.9, 3)
      }
      if (game.phase === 'rolling') {
        const t = trailRef.current
        t.push({ x: game.ball.x, y: game.ball.y })
        if (t.length > 14) t.shift()
      } else if (trailRef.current.length) {
        trailRef.current.shift()
      }
      particles.update(dt)
      crowd.update(dt, game.phase === 'ready')

      // Moving obstacles change the outcome with time, so keep the aim preview current while dragging.
      if (aim && aim.prediction && game.phase === 'aiming' && course.movers.length > 0) {
        aim = { ...aim, prediction: predictShot(course, game.ball, -aim.pull.x, -aim.pull.y, aim.power, game.clock) }
      }
      renderer.draw({ game, aim, trail: trailRef.current, particles, crowd, time: now / 1000, reducedMotion: reduced.matches, debug: validation })

      const status: GameStatus = {
        phase: game.phase,
        strokes: game.strokes,
        penalties: game.penalties,
        power: game.phase === 'aiming' && aim ? Math.round(aim.power * 20) / 20 : 0,
        hazard: game.hazard,
      }
      const k = `${status.phase}|${status.strokes}|${status.penalties}|${status.power}|${status.hazard}`
      if (k !== key) {
        key = k
        statusCb.current(status)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      detach()
      ro.disconnect()
      if (import.meta.env.DEV) delete window.__gilmores
    }
  }, [course, debug])

  return (
    <canvas
      ref={canvasRef}
      className="course-canvas"
      role="img"
      aria-label="Mini golf hole. Press near the ball, drag away from the target, and release to putt."
    />
  )
}
