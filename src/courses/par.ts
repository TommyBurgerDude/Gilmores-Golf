import type { Vec } from './schema'
import type { NavGrid } from './validator'

/** One full-power shot on a fairway travels about this far (see tune.test.ts). */
export const SHOT_REACH = 360
export const MIN_PAR = 3
export const MAX_PAR = 7

export function routeLength(route: readonly Vec[]): number {
  let len = 0
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1] as Vec
    const b = route[i] as Vec
    len += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return len
}

/** True when the straight segment a->b stays on free ground in the (ball-radius inflated) navigation grid. */
function lineClear(a: Vec, b: Vec, grid: NavGrid): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (grid.cell / 2)))
  for (let i = 0; i <= n; i++) {
    const x = a.x + ((b.x - a.x) * i) / n
    const y = a.y + ((b.y - a.y) * i) / n
    const ci = Math.min(grid.cols - 1, Math.max(0, Math.floor(x / grid.cell)))
    const cj = Math.min(grid.rows - 1, Math.max(0, Math.floor(y / grid.cell)))
    if (grid.blocked[cj * grid.cols + ci]) return false
  }
  return true
}

/**
 * Number of straight shots the safe route needs: from the tee, repeatedly take the farthest route point that is
 * within one shot's reach and visible in a straight line. Bends therefore cost strokes; long straight runs do not.
 */
export function shotsNeeded(route: readonly Vec[], grid: NavGrid): number {
  const last = route.length - 1
  let i = 0
  let hops = 0
  while (i < last && hops < 40) {
    let best = i + 1
    for (let j = i + 1; j <= last; j++) {
      const a = route[i] as Vec
      const b = route[j] as Vec
      if (Math.hypot(b.x - a.x, b.y - a.y) > SHOT_REACH) continue
      if (lineClear(a, b, grid)) best = j
    }
    i = best
    hops++
  }
  return Math.max(1, hops)
}

/**
 * Par for a hole: the straight shots the shortest safe route needs, plus one putt, clamped to 3-7. Without a grid it
 * falls back to route length / reach. Deterministic: it depends only on the validated route.
 */
export function parFromRoute(route: readonly Vec[] | null, grid?: NavGrid): number {
  if (!route || route.length < 2) return MIN_PAR
  const shots = grid ? shotsNeeded(route, grid) : Math.max(1, Math.ceil(routeLength(route) / SHOT_REACH - 0.25))
  return Math.min(MAX_PAR, Math.max(MIN_PAR, shots + 1))
}
