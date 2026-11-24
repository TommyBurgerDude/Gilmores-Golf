import type { Shape } from '../courses/schema'
import { clamp } from './vectors'

/** Closest point on a shape's "core" (rect itself, circle centre, capsule segment) and the core radius. */
export function coreOf(s: Shape, px: number, py: number): { cx: number; cy: number; r: number } {
  switch (s.t) {
    case 'rect':
      return { cx: clamp(px, s.x, s.x + s.w), cy: clamp(py, s.y, s.y + s.h), r: 0 }
    case 'circle':
      return { cx: s.x, cy: s.y, r: s.r }
    case 'capsule': {
      const dx = s.x2 - s.x1
      const dy = s.y2 - s.y1
      const l2 = dx * dx + dy * dy
      const t = l2 === 0 ? 0 : clamp(((px - s.x1) * dx + (py - s.y1) * dy) / l2, 0, 1)
      return { cx: s.x1 + dx * t, cy: s.y1 + dy * t, r: s.r }
    }
  }
}

export function insideShape(s: Shape, x: number, y: number, pad = 0): boolean {
  if (s.t === 'rect') return x >= s.x - pad && x <= s.x + s.w + pad && y >= s.y - pad && y <= s.y + s.h + pad
  const c = coreOf(s, x, y)
  return Math.hypot(x - c.cx, y - c.cy) <= c.r + pad
}

/** Signed distance: negative inside the shape, positive outside. */
export function sdfShape(s: Shape, x: number, y: number): number {
  if (s.t === 'rect') {
    const dx = Math.abs(x - (s.x + s.w / 2)) - s.w / 2
    const dy = Math.abs(y - (s.y + s.h / 2)) - s.h / 2
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0)
  }
  const c = coreOf(s, x, y)
  return Math.hypot(x - c.cx, y - c.cy) - c.r
}

export function shapeBounds(s: Shape): { x0: number; y0: number; x1: number; y1: number } {
  switch (s.t) {
    case 'rect':
      return { x0: s.x, y0: s.y, x1: s.x + s.w, y1: s.y + s.h }
    case 'circle':
      return { x0: s.x - s.r, y0: s.y - s.r, x1: s.x + s.r, y1: s.y + s.r }
    case 'capsule':
      return {
        x0: Math.min(s.x1, s.x2) - s.r,
        y0: Math.min(s.y1, s.y2) - s.r,
        x1: Math.max(s.x1, s.x2) + s.r,
        y1: Math.max(s.y1, s.y2) + s.r,
      }
  }
}

export function shapeNumbers(s: Shape): number[] {
  switch (s.t) {
    case 'rect':
      return [s.x, s.y, s.w, s.h]
    case 'circle':
      return [s.x, s.y, s.r]
    case 'capsule':
      return [s.x1, s.y1, s.x2, s.y2, s.r]
  }
}

export function flipShape(s: Shape, fx: boolean, fy: boolean, W: number, H: number): Shape {
  const X = (x: number) => (fx ? W - x : x)
  const Y = (y: number) => (fy ? H - y : y)
  switch (s.t) {
    case 'rect':
      return { t: 'rect', x: fx ? W - s.x - s.w : s.x, y: fy ? H - s.y - s.h : s.y, w: s.w, h: s.h }
    case 'circle':
      return { t: 'circle', x: X(s.x), y: Y(s.y), r: s.r }
    case 'capsule':
      return { t: 'capsule', x1: X(s.x1), y1: Y(s.y1), x2: X(s.x2), y2: Y(s.y2), r: s.r }
  }
}
