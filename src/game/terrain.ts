import type { Course, Region, Terrain, Vec } from '../courses/schema'
import { BOOST_MIN_SPEED, MASK_MARGIN } from './constants'
import { insideShape, sdfShape } from './shapes'

export function regionAt(c: Course, x: number, y: number): Region | null {
  for (let i = c.regions.length - 1; i >= 0; i--) {
    const r = c.regions[i]
    if (r && insideShape(r.shape, x, y)) return r
  }
  return null
}

export function terrainAt(c: Course, x: number, y: number): Terrain {
  return regionAt(c, x, y)?.terrain ?? 'rough'
}

export function slopeAt(c: Course, x: number, y: number, speed = Infinity): Vec {
  let ax = 0
  let ay = 0
  for (const z of c.slopes) {
    if (z.kind === 'boost' && speed < BOOST_MIN_SPEED) continue
    if (insideShape(z.shape, x, y)) {
      ax += z.ax
      ay += z.ay
    }
  }
  return { x: ax, y: ay }
}

/**
 * Signed distance to the edge of the playable area: every terrain region inflated by MASK_MARGIN.
 * Negative = inside the fence. The fence itself is drawn and collided at distance 0.
 */
export function maskSdf(c: Course, x: number, y: number): number {
  let d = Infinity
  for (const r of c.regions) {
    const v = sdfShape(r.shape, x, y) - MASK_MARGIN
    if (v < d) d = v
  }
  return d
}
