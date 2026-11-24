import { GRAB_RADIUS, MAX_DRAG, MIN_DRAG, VIEW_H, VIEW_W, VIEW_X, VIEW_Y } from './constants'
import { beginAim, cancelAim, type Game, shoot } from './simulation'
import { predictShot } from './trajectory'
import type { AimState } from './types'

export interface InputHandlers {
  getGame: () => Game
  onAim: (aim: AimState | null) => void
  onShoot: () => void
  /** True when the board is drawn rotated 90 degrees clockwise (narrow portrait screens). */
  rotated: () => boolean
}

/** On touch screens a full-power pull needs at least this many CSS pixels, so power can be controlled by a finger. */
const TOUCH_FULL_POWER_PX = 110
/** Minimum touch target radius around the ball, in CSS pixels. */
const TOUCH_GRAB_PX = 34
const TOUCH_MIN_DRAG_PX = 8

/**
 * Slingshot input over Pointer Events (mouse, touch, pen): press near the ball, drag AWAY from the target,
 * release to shoot. Returns a detach function.
 */
export function attachInput(canvas: HTMLCanvasElement, h: InputHandlers): () => void {
  let active: number | null = null

  /** Pointer position in world units, and how many CSS pixels one world unit covers on screen. */
  const locate = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    const u = (e.clientX - r.left) / r.width
    const v = (e.clientY - r.top) / r.height
    const rot = h.rotated()
    const vx = rot ? v * VIEW_W : u * VIEW_W
    const vy = rot ? (1 - u) * VIEW_H : v * VIEW_H
    return { x: vx - VIEW_X, y: vy - VIEW_Y, ppu: (rot ? r.height : r.width) / VIEW_W }
  }

  const compute = (e: PointerEvent) => {
    const g = h.getGame()
    const p = locate(e)
    const dx = p.x - g.ball.x
    const dy = p.y - g.ball.y
    const d = Math.hypot(dx, dy)
    const touch = e.pointerType !== 'mouse'
    const dPx = d * p.ppu
    const fullPx = touch ? Math.max(MAX_DRAG * p.ppu, TOUCH_FULL_POWER_PX) : MAX_DRAG * p.ppu
    const minPx = touch ? TOUCH_MIN_DRAG_PX : MIN_DRAG * p.ppu
    const power = Math.min(1, dPx / fullPx)
    const valid = dPx >= minPx && d > 0
    const ux = d > 0 ? dx / d : 0
    const uy = d > 0 ? dy / d : 0
    const aim: AimState = {
      pull: { x: ux * power * MAX_DRAG, y: uy * power * MAX_DRAG },
      power: valid ? power : 0,
      prediction: valid ? predictShot(g.course, g.ball, -ux, -uy, power, g.clock) : null,
    }
    return { aim, ux, uy, power, valid }
  }

  const down = (e: PointerEvent) => {
    if (active !== null || (e.pointerType === 'mouse' && e.button !== 0)) return
    const g = h.getGame()
    if (g.phase !== 'ready') return
    const p = locate(e)
    const grab = e.pointerType === 'mouse' ? GRAB_RADIUS : Math.max(GRAB_RADIUS, TOUCH_GRAB_PX / p.ppu)
    if (Math.hypot(p.x - g.ball.x, p.y - g.ball.y) > grab) return
    if (!beginAim(g)) return
    active = e.pointerId
    try {
      canvas.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    e.preventDefault()
    h.onAim(compute(e).aim)
  }

  const move = (e: PointerEvent) => {
    if (e.pointerId !== active) return
    e.preventDefault()
    h.onAim(compute(e).aim)
  }

  const finish = (e: PointerEvent, cancelled: boolean) => {
    if (e.pointerId !== active) return
    active = null
    const g = h.getGame()
    const c = compute(e)
    h.onAim(null)
    if (!cancelled && c.valid && shoot(g, -c.ux, -c.uy, c.power)) h.onShoot()
    else cancelAim(g)
  }

  const up = (e: PointerEvent) => finish(e, false)
  const cancel = (e: PointerEvent) => finish(e, true)
  const prevent = (e: Event) => e.preventDefault()

  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', cancel)
  canvas.addEventListener('contextmenu', prevent)
  return () => {
    canvas.removeEventListener('pointerdown', down)
    canvas.removeEventListener('pointermove', move)
    canvas.removeEventListener('pointerup', up)
    canvas.removeEventListener('pointercancel', cancel)
    canvas.removeEventListener('contextmenu', prevent)
    if (active !== null) cancelAim(h.getGame())
  }
}
