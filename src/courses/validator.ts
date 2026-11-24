import { BALL_R, CUP_R } from '../game/constants'
import { coreOf, shapeBounds, shapeNumbers } from '../game/shapes'
import { maskSdf, terrainAt } from '../game/terrain'
import type { Course, Shape, Vec } from './schema'

export const NAV_CELL = 8
/** Extra clearance used when inflating obstacles for the route search. */
const NAV_MARGIN = 2

export interface NavGrid {
  cell: number
  cols: number
  rows: number
  /** 1 = ball centre cannot be here (wall within ball radius, water, or outside the world). */
  blocked: Uint8Array
}

export interface ValidationResult {
  ok: boolean
  reasons: string[]
  grid: NavGrid
  /** Cell-centre polyline from tee to cup, or null when no route exists. */
  route: Vec[] | null
}

/** Configuration-space grid: the ball is a point; walls are inflated by the ball radius. */
export function buildNavGrid(course: Course): NavGrid {
  const cols = Math.ceil(course.width / NAV_CELL)
  const rows = Math.ceil(course.height / NAV_CELL)
  const blocked = new Uint8Array(cols * rows)
  const inflate = BALL_R + NAV_MARGIN
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = (i + 0.5) * NAV_CELL
      const y = (j + 0.5) * NAV_CELL
      let b = x < BALL_R || y < BALL_R || x > course.width - BALL_R || y > course.height - BALL_R
      if (!b && maskSdf(course, x, y) > -inflate) b = true
      if (!b && terrainAt(course, x, y) === 'water') b = true
      if (!b) {
        for (const w of course.walls) {
          const c = coreOf(w.shape, x, y)
          if (Math.hypot(x - c.cx, y - c.cy) < inflate + c.r) {
            b = true
            break
          }
        }
      }
      blocked[j * cols + i] = b ? 1 : 0
    }
  }
  return { cell: NAV_CELL, cols, rows, blocked }
}

/** Breadth-first 8-connected search (no corner cutting). Proves geometric reachability only. */
export function findRoute(course: Course, grid: NavGrid): Vec[] | null {
  const { cols, rows, blocked, cell } = grid
  const toCell = (p: Vec) => ({
    i: Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell))),
    j: Math.min(rows - 1, Math.max(0, Math.floor(p.y / cell))),
  })
  const s = toCell(course.tee)
  const g = toCell(course.cup)
  const startIdx = s.j * cols + s.i
  const goalIdx = g.j * cols + g.i
  if (blocked[startIdx] || blocked[goalIdx]) return null

  const parent = new Int32Array(cols * rows).fill(-2)
  parent[startIdx] = -1
  const queue = [startIdx]
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const
  for (let h = 0; h < queue.length; h++) {
    const cur = queue[h] as number
    if (cur === goalIdx) break
    const ci = cur % cols
    const cj = (cur - ci) / cols
    for (const [dx, dy] of dirs) {
      const ni = ci + dx
      const nj = cj + dy
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue
      const n = nj * cols + ni
      if (blocked[n] || parent[n] !== -2) continue
      if (dx !== 0 && dy !== 0 && (blocked[cj * cols + ni] || blocked[nj * cols + ci])) continue
      parent[n] = cur
      queue.push(n)
    }
  }
  if (parent[goalIdx] === -2) return null
  const route: Vec[] = []
  for (let n = goalIdx; n !== -1; n = parent[n] as number) {
    const i = n % cols
    route.push({ x: (i + 0.5) * cell, y: ((n - i) / cols + 0.5) * cell })
  }
  return route.reverse()
}

const finiteShape = (s: Shape) => shapeNumbers(s).every(Number.isFinite)

function inWorld(s: Shape, W: number, H: number): boolean {
  const b = shapeBounds(s)
  return b.x0 >= 0 && b.y0 >= 0 && b.x1 <= W && b.y1 <= H
}

export function validateCourse(course: Course): ValidationResult {
  const reasons: string[] = []
  const { width: W, height: H } = course

  // Finite numbers everywhere.
  const nums: number[] = [W, H, course.par, course.tee.x, course.tee.y, course.cup.x, course.cup.y, course.cup.r]
  let shapesOk = true
  for (const r of course.regions) shapesOk &&= finiteShape(r.shape)
  for (const w of course.walls) shapesOk &&= finiteShape(w.shape)
  for (const z of course.slopes) {
    shapesOk &&= finiteShape(z.shape)
    nums.push(z.ax, z.ay)
  }
  for (const p of course.portals) nums.push(p.a.x, p.a.y, p.b.x, p.b.y, p.r)
  if (!shapesOk || !nums.every(Number.isFinite)) reasons.push('non-finite coordinate or dimension')

  const empty: ValidationResult = {
    ok: false,
    reasons,
    grid: { cell: NAV_CELL, cols: 0, rows: 0, blocked: new Uint8Array(0) },
    route: null,
  }
  if (reasons.length > 0) return empty

  // Bounds.
  if (!Number.isInteger(course.par) || course.par < 2 || course.par > 9) reasons.push('par must be an integer from 2 to 9')
  const inside = (p: Vec, m: number) => p.x >= m && p.y >= m && p.x <= W - m && p.y <= H - m
  if (!inside(course.tee, BALL_R)) reasons.push('tee outside world bounds')
  if (!inside(course.cup, CUP_R)) reasons.push('cup outside world bounds')
  course.walls.forEach((w, i) => {
    if (!inWorld(w.shape, W, H)) reasons.push(`wall ${i} outside world bounds`)
  })
  course.regions.forEach((r, i) => {
    if (r.terrain !== 'fairway' && r.terrain !== 'rough' && !inWorld(r.shape, W, H)) {
      reasons.push(`${r.terrain} region ${i} outside world bounds`)
    }
  })

  // Spawn / cup clearance.
  for (const [label, p, clear] of [
    ['tee', course.tee, BALL_R * 3],
    ['cup', course.cup, BALL_R + CUP_R],
  ] as const) {
    for (const w of course.walls) {
      const c = coreOf(w.shape, p.x, p.y)
      if (Math.hypot(p.x - c.cx, p.y - c.cy) < clear + c.r) {
        reasons.push(`${label} overlaps blocking geometry`)
        break
      }
    }
  }
  if (terrainAt(course, course.cup.x, course.cup.y) === 'water') reasons.push('cup is in water')
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2
    if (terrainAt(course, course.tee.x + Math.cos(ang) * BALL_R * 3, course.tee.y + Math.sin(ang) * BALL_R * 3) === 'water') {
      reasons.push('water hazard unavoidable at tee')
      break
    }
  }
  if (terrainAt(course, course.tee.x, course.tee.y) === 'water') reasons.push('tee is in water')
  if (Math.hypot(course.tee.x - course.cup.x, course.tee.y - course.cup.y) < 250) reasons.push('tee and cup too close')

  // Reachability (not a stroke-count guarantee).
  const grid = buildNavGrid(course)
  const route = findRoute(course, grid)
  if (!route) reasons.push('no route from tee to cup')
  return { ok: reasons.length === 0, reasons, grid, route }
}
