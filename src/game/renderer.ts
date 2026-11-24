import { mulberry32 } from '../courses/prng'
import type { Course, Vec } from '../courses/schema'
import type { ValidationResult } from '../courses/validator'
import { BALL_R, MAX_DRAG, PIXEL as S, VIEW_H, VIEW_W, VIEW_X, VIEW_Y, WORLD_H, WORLD_W } from './constants'
import type { Crowd } from './crowd'
import { moverShapes } from './movers'
import { drawPerson } from './people'
import { THEMES } from './seasons'
import { PAL } from './palette'
import type { Particles } from './particles'
import { type Layers, disc, mapArt, renderLayers } from './pixelart'
import type { Game } from './simulation'
import type { AimState } from './types'

type Ctx = CanvasRenderingContext2D

export interface RenderState {
  game: Game
  aim: AimState | null
  trail: Vec[]
  particles: Particles
  crowd: Crowd
  time: number
  reducedMotion: boolean
  debug: ValidationResult | null
}

const px = (v: number): number => Math.round(v / S)

/** Draws the pixel-art world into a low-res buffer, scales it crisply to the canvas, then draws vector overlays. */
export class Renderer {
  /** Cached static layers per orientation: [normal, rotated]. */
  private layers: [Layers | null, Layers | null] = [null, null]
  /** Moving things drawn in world orientation (ball, cup, trail, movers, particles). Transparent. */
  private dynWorld: HTMLCanvasElement
  private dwc: Ctx
  /** Things that must stay upright on screen (crowd, flag, weather). Sized for the current orientation. */
  private dynUp: { rot: boolean; canvas: HTMLCanvasElement; ctx: Ctx } | null = null
  private ctx: Ctx
  private dpr = 1
  /** True when the board is shown rotated 90 degrees clockwise (narrow portrait screens). */
  private rotated: () => boolean
  private rand = mulberry32(0xa11b1e)
  private lastTime = 0
  private ambient: { x: number; y: number; ph: number; c: string }[] = []
  private streaks: { x: number; y: number; ph: number }[] = []
  private canvas: HTMLCanvasElement
  private course: Course

  constructor(canvas: HTMLCanvasElement, course: Course, rotated: () => boolean = () => false) {
    this.canvas = canvas
    this.rotated = rotated
    this.course = course
    this.dynWorld = document.createElement('canvas')
    this.dynWorld.width = VIEW_W / S
    this.dynWorld.height = VIEW_H / S
    this.dwc = this.dynWorld.getContext('2d') as Ctx
    this.ctx = canvas.getContext('2d') as Ctx
    const pc = THEMES[course.meta.season].particles
    for (let i = 0; i < pc.count; i++) {
      this.ambient.push({ x: this.rand() * VIEW_W, y: this.rand() * VIEW_H, ph: this.rand() * 6.28, c: pc.colors[i % pc.colors.length] as string })
    }
    if (Math.hypot(course.wind.x, course.wind.y) > 0.5) {
      for (let i = 0; i < 22; i++) this.streaks.push({ x: this.rand() * VIEW_W, y: this.rand() * VIEW_H, ph: this.rand() })
    }
    this.resize()
  }

  /** Match the backing store to the CSS size and device pixel ratio (capped at 2). */
  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    const r = this.canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round(r.width * this.dpr))
    const h = Math.max(1, Math.round(r.height * this.dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  private layersFor(rot: boolean): Layers {
    const i = rot ? 1 : 0
    return (this.layers[i] ??= renderLayers(this.course, rot))
  }

  private upFor(rot: boolean): { canvas: HTMLCanvasElement; ctx: Ctx } {
    if (!this.dynUp || this.dynUp.rot !== rot) {
      const canvas = document.createElement('canvas')
      canvas.width = rot ? VIEW_H / S : VIEW_W / S
      canvas.height = rot ? VIEW_W / S : VIEW_H / S
      this.dynUp = { rot, canvas, ctx: canvas.getContext('2d') as Ctx }
    }
    return this.dynUp
  }

  /** Blit a world-oriented layer onto the main canvas, rotating it a quarter turn when asked. */
  private blitWorld(src: HTMLCanvasElement, rot: boolean): void {
    const ctx = this.ctx
    const cw = this.canvas.width
    const ch = this.canvas.height
    ctx.save()
    if (rot) {
      ctx.translate(cw, 0)
      ctx.rotate(Math.PI / 2)
      ctx.drawImage(src, 0, 0, ch, cw)
    } else {
      ctx.drawImage(src, 0, 0, cw, ch)
    }
    ctx.restore()
  }

  draw(st: RenderState): void {
    const rot = this.rotated()
    const L = this.layersFor(rot)

    // Moving things in world orientation.
    const dw = this.dwc
    dw.imageSmoothingEnabled = false
    dw.clearRect(0, 0, this.dynWorld.width, this.dynWorld.height)
    dw.save()
    dw.translate(VIEW_X / S, VIEW_Y / S)
    this.drawMovers(dw, st)
    this.drawCup(dw, st)
    this.drawTrail(dw, st)
    this.drawBall(dw, st)
    this.drawParticles(dw, st)
    dw.restore()

    // Upright things: crowd, flag, wind and falling weather.
    const up = this.upFor(rot)
    up.ctx.imageSmoothingEnabled = false
    up.ctx.clearRect(0, 0, up.canvas.width, up.canvas.height)
    this.drawCrowd(up.ctx, st, rot)
    this.drawFlag(up.ctx, st, rot)
    this.drawWind(up.ctx, st, rot)
    this.drawAmbient(up.ctx, st, rot)

    const ctx = this.ctx
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    const cw = this.canvas.width
    const ch = this.canvas.height
    const k = this.scale()
    this.blitWorld(L.ground, rot)
    ctx.drawImage(L.sprites, 0, 0, cw, ch)
    this.blitWorld(this.dynWorld, rot)
    ctx.drawImage(up.canvas, 0, 0, cw, ch)

    // Overlays that do not care about orientation (dots, rings, debug) are drawn in the rotated frame.
    ctx.save()
    if (rot) {
      ctx.translate(cw, 0)
      ctx.rotate(Math.PI / 2)
    }
    ctx.translate(VIEW_X * k, VIEW_Y * k)
    if (st.aim && st.game.phase === 'aiming') this.drawAim(ctx, st, k)
    if (st.debug) this.drawDebug(ctx, st, k)
    ctx.restore()
    // Overlays that must stay upright on screen (club, ball ring, speech bubbles) use screen coordinates.
    this.drawBallRing(ctx, st, k)
    if (st.aim && st.game.phase === 'aiming') this.drawClub(ctx, st, k)
    this.drawBubbles(ctx, st, k)
  }

  /** Device pixels per view unit. */
  private scale(): number {
    return (this.rotated() ? this.canvas.height : this.canvas.width) / VIEW_W
  }

  /** View coordinates (world + view offset) to device pixels on screen, honouring rotation. */
  private toScreen(vx: number, vy: number): { x: number; y: number } {
    const k = this.scale()
    return this.rotated() ? { x: this.canvas.width - vy * k, y: vx * k } : { x: vx * k, y: vy * k }
  }

  /** On small screens the ball is a few pixels wide: a soft pulsing ring makes it easy to find and grab. */
  private drawBallRing(ctx: Ctx, st: RenderState, k: number): void {
    if (st.game.phase !== 'ready' || k / this.dpr > 0.62) return
    const B = this.toScreen(st.game.ball.x + VIEW_X, st.game.ball.y + VIEW_Y)
    const pulse = st.reducedMotion ? 0 : (Math.sin(st.time * 3.2) + 1) / 2
    const r = Math.max(9 * this.dpr, (BALL_R + 7) * k) + pulse * 2 * this.dpr
    ctx.strokeStyle = `rgba(255,255,255,${0.55 + pulse * 0.35})`
    ctx.lineWidth = Math.max(2, Math.round(1.5 * this.dpr))
    ctx.beginPath()
    ctx.arc(B.x, B.y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(42,42,46,0.55)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(B.x, B.y, r + 2 * this.dpr, 0, Math.PI * 2)
    ctx.stroke()
  }

  /** Moving obstacles, drawn at their current game-clock position. */
  private drawMovers(b: Ctx, st: RenderState): void {
    const brush = (x1: number, y1: number, x2: number, y2: number, r: number, color: string, stripe?: string) => {
      const ax = px(x1)
      const ay = px(y1)
      const bx = px(x2)
      const by = px(y2)
      const n = Math.max(1, Math.abs(bx - ax), Math.abs(by - ay))
      for (let i = 0; i <= n; i++) {
        const c = stripe && Math.floor(i / 3) % 2 ? stripe : color
        disc(b, Math.round(ax + ((bx - ax) * i) / n), Math.round(ay + ((by - ay) * i) / n), r, c)
      }
    }
    for (const m of st.game.course.movers) {
      const shapes = moverShapes(m, st.game.clock)
      for (const s of shapes) {
        if (s.t === 'capsule') {
          const r = Math.max(1, Math.round(s.r / S))
          if (m.kind === 'rotor') {
            brush(s.x1, s.y1, s.x2, s.y2, r + 1, PAL.woodDark)
            brush(s.x1, s.y1, s.x2, s.y2, r, PAL.woodLight, PAL.cream)
            disc(b, px(s.x2), px(s.y2), r + 1, PAL.coral)
          } else {
            brush(s.x1, s.y1, s.x2, s.y2, r + 1, PAL.woodDark)
            brush(s.x1, s.y1, s.x2, s.y2, r, PAL.coral, PAL.cream)
          }
        } else if (s.t === 'circle') {
          const r = Math.round(s.r / S)
          const cx = px(s.x)
          const cy = px(s.y)
          if (m.kind === 'orbit') {
            const mx = px(m.x)
            const my = px(m.y)
            const n = Math.max(2, Math.round(Math.hypot(cx - mx, cy - my) / 3))
            for (let i = 1; i < n; i++) {
              b.fillStyle = i % 2 ? PAL.grey : PAL.greyDark
              b.fillRect(Math.round(mx + ((cx - mx) * i) / n), Math.round(my + ((cy - my) * i) / n), 1, 1)
            }
            disc(b, cx, cy, r, PAL.charcoal)
            disc(b, cx, cy, r - 1, '#5a5a66')
            for (const [dx, dy] of [[0, -r], [0, r], [-r, 0], [r, 0]] as const) b.fillRect(cx + dx, cy + dy, 1, 1)
            b.fillStyle = PAL.coral
            b.fillRect(cx - 1, cy - 1, 2, 2)
          } else {
            disc(b, cx, cy, r, PAL.charcoal)
            disc(b, cx, cy, r - 1, '#d83a2a')
            disc(b, cx, cy, Math.max(1, r - 3), PAL.cream)
            b.fillStyle = PAL.white
            b.fillRect(cx - r + 2, cy - r + 1, 2, 1)
          }
        }
      }
    }
  }

  /** Faint streaks that blow along the wind direction. Cosmetic; skipped for reduced motion. */
  private drawWind(b: Ctx, st: RenderState, rot: boolean): void {
    const VW = rot ? VIEW_H : VIEW_W
    const VH = rot ? VIEW_W : VIEW_H
    if (this.streaks.length === 0 || st.reducedMotion) return
    const w = this.course.wind
    const mag = Math.hypot(w.x, w.y)
    const dt = Math.min(0.05, Math.max(0, st.time - this.lastTime))
    const wx = rot ? -w.y : w.x
    const wy = rot ? w.x : w.y
    const ux = wx / mag
    const uy = wy / mag
    for (const s of this.streaks) {
      s.x += ux * mag * 7 * dt * (0.8 + s.ph * 0.5)
      s.y += uy * mag * 7 * dt * (0.8 + s.ph * 0.5)
      if (s.x < -10 || s.x > VW + 10 || s.y < -10 || s.y > VH + 10) {
        s.x = ux > 0 ? 0 : ux < 0 ? VW : this.rand() * VW
        s.y = uy > 0 ? 0 : uy < 0 ? VH : this.rand() * VH
        if (Math.abs(ux) > Math.abs(uy)) s.y = this.rand() * VH
        else s.x = this.rand() * VW
      }
      b.fillStyle = 'rgba(255,255,255,0.28)'
      for (let i = 0; i < 5; i++) b.fillRect(Math.round(s.x / S - ux * i), Math.round(s.y / S - uy * i), 1, 1)
    }
  }

  /** Falling snow, leaves, ash, rain, neon rain or drifting fireflies. Cosmetic only; skipped for reduced motion. */
  private drawAmbient(b: Ctx, st: RenderState, rot: boolean): void {
    const VW = rot ? VIEW_H : VIEW_W
    const VH = rot ? VIEW_W : VIEW_H
    const kind = THEMES[this.course.meta.season].particles.kind
    const dt = Math.min(0.05, Math.max(0, st.time - this.lastTime))
    this.lastTime = st.time
    if (!kind || st.reducedMotion) return
    const rainy = kind === 'rain' || kind === 'neonrain'
    const fall = kind === 'snow' ? 16 : kind === 'leaf' ? 22 : kind === 'ash' ? 12 : rainy ? (kind === 'rain' ? 190 : 260) : kind === 'firefly' ? 0 : 13
    const sway = kind === 'snow' || kind === 'ash' ? 8 : rainy ? 0 : kind === 'firefly' ? 14 : 18
    for (const p of this.ambient) {
      if (kind === 'firefly') {
        p.y += Math.cos(st.time * 0.9 + p.ph) * 9 * dt
      } else {
        p.y += fall * dt * (0.7 + (p.ph % 1) * 0.6)
      }
      p.x += Math.sin(st.time * 1.4 + p.ph) * sway * dt + (kind === 'snow' || rainy || kind === 'firefly' ? (rainy ? -fall * 0.06 * dt : 0) : 6 * dt)
      if (p.y > VH) { p.y = -4; p.x = this.rand() * VW }
      if (p.y < -6) p.y = VH
      if (p.x > VW) p.x = 0
      if (p.x < 0) p.x = VW
      if (kind === 'firefly' && Math.sin(st.time * 2.2 + p.ph * 5) < -0.2) continue
      b.fillStyle = p.c
      b.fillRect(Math.round(p.x / S), Math.round(p.y / S), kind === 'snow' || kind === 'ash' || kind === 'firefly' ? 1 : rainy ? 1 : 2, rainy ? 3 : 1)
      if (kind === 'firefly') {
        b.fillStyle = 'rgba(255,240,120,0.25)'
        b.fillRect(Math.round(p.x / S) - 1, Math.round(p.y / S) - 1, 3, 3)
      }
    }
  }

  private drawCrowd(b: Ctx, st: RenderState, rot: boolean): void {
    const mapped = st.crowd.people.map((p) => ({ p, m: mapArt(px(p.x) + VIEW_X / S, px(p.y) + VIEW_Y / S, rot) }))
    mapped.sort((a, c) => a.m.y - c.m.y)
    for (const { p, m } of mapped) {
      drawPerson(b, m.x, m.y, p.look, p.pose, st.reducedMotion ? 0 : st.time + p.x * 0.013, p.walking && !st.reducedMotion, this.course.meta.season)
    }
  }

  /** Speech bubbles are drawn at full resolution so the text stays readable at any canvas size. */
  private drawBubbles(ctx: Ctx, st: RenderState, k: number): void {
    const fs = Math.round(Math.max(11, Math.min(15, this.canvas.clientWidth / 55)) * this.dpr)
    ctx.font = `bold ${fs}px "Courier New", monospace`
    ctx.textBaseline = 'middle'
    for (const p of st.crowd.people) {
      const bub = p.bubble
      if (!bub) continue
      const fade = Math.min(1, bub.age / 0.12, (bub.ttl - bub.age) / 0.25)
      const tw = ctx.measureText(bub.text).width
      const pad = fs * 0.5
      const bw = tw + pad * 2
      const bh = fs + pad * 1.4
      const S0 = this.toScreen(p.x + VIEW_X, p.y + VIEW_Y)
      const bx = Math.max(4, Math.min(this.canvas.width - bw - 4, S0.x - bw / 2))
      const by = Math.max(4, S0.y - 34 * k - bh)
      const tx = S0.x
      ctx.globalAlpha = Math.max(0, fade)
      ctx.fillStyle = PAL.charcoal
      ctx.fillRect(Math.round(bx - 2), Math.round(by - 2), Math.round(bw + 4), Math.round(bh + 4))
      ctx.fillRect(Math.round(tx - 3), Math.round(by + bh + 2), 7, 3)
      ctx.fillStyle = PAL.cream
      ctx.fillRect(Math.round(bx), Math.round(by), Math.round(bw), Math.round(bh))
      ctx.fillRect(Math.round(tx - 2), Math.round(by + bh), 5, 3)
      ctx.fillStyle = PAL.charcoal
      ctx.fillText(bub.text, Math.round(bx + pad), Math.round(by + bh / 2 + 1))
      ctx.globalAlpha = 1
    }
  }

  private drawCup(b: Ctx, st: RenderState): void {
    const c = st.game.course.cup
    const cx = px(c.x)
    const cy = px(c.y)
    disc(b, cx, cy, 7, PAL.fairwayEdge)
    disc(b, cx, cy, 6, PAL.charcoal)
    b.fillStyle = PAL.woodDark
    b.fillRect(cx - 3, cy - 4, 5, 1)
  }

  private drawTrail(b: Ctx, st: RenderState): void {
    const n = st.trail.length
    for (let i = 0; i < n; i++) {
      const p = st.trail[i] as Vec
      b.fillStyle = `rgba(244,233,200,${((i + 1) / n) * 0.55})`
      b.fillRect(px(p.x), px(p.y), 1, 1)
    }
  }

  private drawBall(b: Ctx, st: RenderState): void {
    const g = st.game
    if (g.phase === 'hazard') {
      // Ripple where the ball sank.
      const t = 1 - g.hazardTimer / 0.8
      const r = Math.max(1, Math.round(2 + t * 7))
      b.strokeStyle = g.hazard === 'water' ? PAL.waterLight : PAL.coral
      b.lineWidth = 1
      b.strokeRect(px(g.ball.x) - r, px(g.ball.y) - r, r * 2, r * 2)
      return
    }
    let r = Math.round(BALL_R / S) + 1
    if (g.phase === 'complete') {
      r = Math.round(r * (1 - Math.min(1, g.holeTime / 0.35)))
      if (r <= 0) return
    }
    const x = px(g.ball.x)
    const y = px(g.ball.y)
    const sh = this.rotated() ? [2, -1] : [1, 2]
    disc(b, x + (sh[0] as number), y + (sh[1] as number), r, 'rgba(15,30,15,0.4)')
    disc(b, x, y, r, PAL.charcoal)
    disc(b, x, y, Math.max(0, r - 1), PAL.cream)
    if (r >= 3) {
      b.fillStyle = PAL.white
      b.fillRect(x - 1, y - 1, 1, 1)
      b.fillStyle = PAL.coral
      b.fillRect(x + 1, y + 1, 1, 1)
    }
  }

  private drawFlag(b: Ctx, st: RenderState, rot: boolean): void {
    const c = st.game.course.cup
    const m = mapArt(px(c.x) + VIEW_X / S, px(c.y) + VIEW_Y / S, rot)
    const cx = m.x
    const cy = m.y
    b.fillStyle = PAL.charcoal
    b.fillRect(cx, cy - 20, 2, 21)
    b.fillStyle = PAL.cream
    b.fillRect(cx, cy - 20, 1, 20)
    for (let i = 0; i < 6; i++) {
      const wob = st.reducedMotion ? 0 : Math.round(Math.sin(st.time * 4 + i * 0.8) * (0.6 + i * 0.15))
      b.fillStyle = PAL.coral
      b.fillRect(cx + 2 + wob, cy - 20 + i, 8 - i, 1)
    }
    b.fillStyle = PAL.charcoal
    b.fillRect(cx - 1, cy - 21, 4, 1)
  }

  private drawParticles(b: Ctx, st: RenderState): void {
    for (const p of st.particles.items) {
      b.globalAlpha = Math.max(0, Math.min(1, p.life / p.max))
      b.fillStyle = p.color
      b.fillRect(px(p.x), px(p.y), p.size > 2 ? 2 : 1, p.size > 2 ? 2 : 1)
    }
    b.globalAlpha = 1
  }

  /** Slingshot band, predicted path and hazard markers, drawn at full resolution so they stay legible. */
  private drawAim(ctx: Ctx, st: RenderState, k: number): void {
    const aim = st.aim as AimState
    const ball = st.game.ball
    const bx = ball.x * k
    const by = ball.y * k
    const u = Math.max(2, Math.round(k * 3))
    const snap = (v: number) => Math.round(v)

    // Max-drag ring so the power limit is visible.
    ctx.strokeStyle = 'rgba(42,42,46,0.35)'
    ctx.lineWidth = 1
    ctx.setLineDash([u, u * 1.5])
    ctx.beginPath()
    ctx.arc(bx, by, MAX_DRAG * k, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    const pred = aim.prediction
    if (!pred) return
    const hazard = pred.end === 'water' || pred.end === 'oob'
    pred.points.forEach((p, i) => {
      if (i === 0) return
      const last = i === pred.points.length - 1
      const size = last && hazard ? u * 2 : u
      const x = snap(p.x * k - size / 2)
      const y = snap(p.y * k - size / 2)
      ctx.fillStyle = PAL.charcoal
      ctx.fillRect(x - 1, y - 1, size + 2, size + 2)
      ctx.fillStyle = last && hazard ? PAL.coral : last && pred.end === 'hole' ? PAL.yellow : PAL.cream
      ctx.fillRect(x, y, size, size)
    })
    for (const bp of pred.bounces) {
      ctx.strokeStyle = PAL.cream
      ctx.lineWidth = 2
      ctx.strokeRect(snap(bp.x * k - u), snap(bp.y * k - u), u * 2, u * 2)
    }
  }

  /** The upright golf club (screen space): head on the ground behind the ball, shaft standing up the screen. */
  private drawClub(ctx: Ctx, st: RenderState, k: number): void {
    const aim = st.aim as AimState
    const ball = st.game.ball
    const u = Math.max(2, Math.round(k * 3))
    const plen = Math.hypot(aim.pull.x, aim.pull.y)
    if (plen > 0.5) {
      const gap = BALL_R + 5
      const head = Math.max(gap, plen)
      const B = this.toScreen(ball.x + VIEW_X, ball.y + VIEW_Y)
      const H = this.toScreen(ball.x + VIEW_X + (aim.pull.x / plen) * head, ball.y + VIEW_Y + (aim.pull.y / plen) * head)
      const hx = Math.round(H.x)
      const hy = Math.round(H.y)
      const sdx = H.x - B.x
      const sdist = Math.hypot(sdx, H.y - B.y) || 1
      const toward = sdx / sdist > 0.15 ? -1 : 1 // horizontal side of the ball relative to the head (on screen)
      const lean = -toward * 5 * k // the shaft leans away from the ball, like a real address
      const shaft = 74 * k
      const p = Math.max(1, Math.round(k * 2))

      // ground shadow
      ctx.fillStyle = 'rgba(15,30,15,0.35)'
      ctx.beginPath()
      ctx.ellipse(hx, hy + p, 9 * k, 3 * k, 0, 0, Math.PI * 2)
      ctx.fill()

      // shaft: outlined steel, coral grip on the top third
      const tx = hx + lean
      const ty = hy - 5 * k - shaft
      const grip = 0.34
      const gx = hx + lean * (1 - grip)
      const gy = hy - 5 * k - shaft * (1 - grip)
      ctx.lineCap = 'butt'
      ctx.strokeStyle = PAL.charcoal
      ctx.lineWidth = u + 2
      ctx.beginPath()
      ctx.moveTo(hx, hy - 5 * k)
      ctx.lineTo(tx, ty)
      ctx.stroke()
      ctx.strokeStyle = '#c8ccd2'
      ctx.lineWidth = u
      ctx.beginPath()
      ctx.moveTo(hx, hy - 5 * k)
      ctx.lineTo(gx, gy)
      ctx.stroke()
      ctx.strokeStyle = PAL.coral
      ctx.lineWidth = u + 2
      ctx.beginPath()
      ctx.moveTo(gx, gy)
      ctx.lineTo(tx, ty)
      ctx.stroke()
      ctx.fillStyle = PAL.charcoal
      ctx.fillRect(Math.round(tx - (u + 2) / 2), Math.round(ty - 2), u + 2, 3)

      // head: wedge lying toward the ball, flat face on the ball side
      const w = 15 * k
      const h = 8 * k
      const left = toward > 0 ? hx - 3 * k : hx - w + 3 * k
      const top = hy - h
      ctx.fillStyle = PAL.charcoal
      ctx.fillRect(Math.round(left - 1), Math.round(top - 1), Math.round(w + 2), Math.round(h + 2))
      ctx.fillStyle = '#9aa2ac'
      ctx.fillRect(Math.round(left), Math.round(top), Math.round(w), Math.round(h))
      ctx.fillStyle = '#6a727c' // sole
      ctx.fillRect(Math.round(left), Math.round(hy - 2.5 * k), Math.round(w), Math.round(2.5 * k))
      ctx.fillStyle = '#e4e9ee' // face, on the side toward the ball
      ctx.fillRect(Math.round(toward > 0 ? left + w - 3.5 * k : left), Math.round(top), Math.round(3.5 * k), Math.round(h - 2.5 * k))
      ctx.fillStyle = PAL.coral // hosel where the shaft meets the head
      ctx.fillRect(Math.round(toward > 0 ? left + 1 : left + w - 5 * k), Math.round(top - 2 * k), Math.round(4 * k), Math.round(2.5 * k))
    }

  }

  private drawDebug(ctx: Ctx, st: RenderState, k: number): void {
    const v = st.debug as ValidationResult
    const c = this.course
    const { grid } = v
    ctx.fillStyle = 'rgba(255,0,0,0.18)'
    for (let j = 0; j < grid.rows; j++) {
      for (let i = 0; i < grid.cols; i++) {
        if (grid.blocked[j * grid.cols + i]) ctx.fillRect(i * grid.cell * k, j * grid.cell * k, grid.cell * k, grid.cell * k)
      }
    }
    const outline = (s: Course['walls'][number]['shape'], color: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      if (s.t === 'rect') ctx.strokeRect(s.x * k, s.y * k, s.w * k, s.h * k)
      else if (s.t === 'circle') {
        ctx.beginPath()
        ctx.arc(s.x * k, s.y * k, s.r * k, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.moveTo(s.x1 * k, s.y1 * k)
        ctx.lineTo(s.x2 * k, s.y2 * k)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(s.x1 * k, s.y1 * k, s.r * k, 0, Math.PI * 2)
        ctx.arc(s.x2 * k, s.y2 * k, s.r * k, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    for (const r of c.regions) outline(r.shape, r.terrain === 'water' ? '#00ccff' : r.terrain === 'sand' ? '#ffcc00' : '#66ff66')
    for (const w of c.walls) outline(w.shape, '#ff3030')
    for (const z of c.slopes) {
      outline(z.shape, '#ff00ff')
      ctx.strokeStyle = '#ff00ff'
      const b = z.shape.t === 'rect' ? z.shape : { x: 0, y: 0, w: WORLD_W, h: WORLD_H }
      for (let gy = b.y + 20; gy < b.y + b.h; gy += 50) {
        for (let gx = b.x + 20; gx < b.x + b.w; gx += 50) {
          ctx.beginPath()
          ctx.moveTo(gx * k, gy * k)
          ctx.lineTo((gx + z.ax * 2) * k, (gy + z.ay * 2) * k)
          ctx.stroke()
        }
      }
    }
    ctx.strokeStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(c.cup.x * k, c.cup.y * k, c.cup.r * k, 0, Math.PI * 2)
    ctx.arc(c.tee.x * k, c.tee.y * k, BALL_R * k, 0, Math.PI * 2)
    ctx.stroke()
    if (v.route) {
      ctx.strokeStyle = '#ffee00'
      ctx.lineWidth = 2
      ctx.beginPath()
      v.route.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x * k, p.y * k) : ctx.lineTo(p.x * k, p.y * k)))
      ctx.stroke()
    }
    const m = c.meta
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(4, 4, 330, 56)
    ctx.fillStyle = '#fff'
    ctx.font = '12px monospace'
    ctx.fillText(`L${m.level} ${m.season} ${m.templateId} (${m.theme}) tier ${m.tier} v${m.generatorVersion}`, 10, 20)
    ctx.fillText(`seed ${m.seed} fallback ${m.usedFallback} flip ${m.flipX ? 'X' : '-'}${m.flipY ? 'Y' : '-'}`, 10, 36)
    ctx.fillText(v.ok ? 'valid' : `INVALID: ${v.reasons.join('; ')}`, 10, 52)
  }
}
