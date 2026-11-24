import type { Mover, Shape } from '../courses/schema'

/** Current collision shapes of a mover at game time t (seconds). Pure and deterministic. */
export function moverShapes(m: Mover, t: number): Shape[] {
  switch (m.kind) {
    case 'rotor': {
      const out: Shape[] = []
      for (let i = 0; i < m.arms; i++) {
        const a = m.phase + m.w * t + (i * Math.PI * 2) / m.arms
        out.push({ t: 'capsule', x1: m.x, y1: m.y, x2: m.x + Math.cos(a) * m.len, y2: m.y + Math.sin(a) * m.len, r: m.r })
      }
      return out
    }
    case 'slider': {
      const f = 0.5 + 0.5 * Math.sin(m.w * t + m.phase)
      const x = m.ax + (m.bx - m.ax) * f
      const y = m.ay + (m.by - m.ay) * f
      if (!m.bar) return [{ t: 'circle', x, y, r: m.r }]
      const dx = m.bx - m.ax
      const dy = m.by - m.ay
      const l = Math.hypot(dx, dy) || 1
      const nx = -dy / l
      const ny = dx / l
      const h = m.len / 2
      return [{ t: 'capsule', x1: x - nx * h, y1: y - ny * h, x2: x + nx * h, y2: y + ny * h, r: m.r }]
    }
    case 'orbit': {
      const a = m.phase + m.w * t
      return [{ t: 'circle', x: m.x + Math.cos(a) * m.R, y: m.y + Math.sin(a) * m.R, r: m.r }]
    }
  }
}

/** Mirror a mover for a horizontally / vertically flipped course. */
export function flipMover(m: Mover, fx: boolean, fy: boolean, W: number, H: number): Mover {
  const X = (x: number) => (fx ? W - x : x)
  const Y = (y: number) => (fy ? H - y : y)
  // Angle mirroring: flipX: a -> PI - a, flipY: a -> -a, both: a -> a + PI.
  const spin = (phase: number, w: number) => {
    if (fx && fy) return { phase: phase + Math.PI, w }
    if (fx) return { phase: Math.PI - phase, w: -w }
    if (fy) return { phase: -phase, w: -w }
    return { phase, w }
  }
  switch (m.kind) {
    case 'rotor':
      return { ...m, x: X(m.x), y: Y(m.y), ...spin(m.phase, m.w) }
    case 'orbit':
      return { ...m, x: X(m.x), y: Y(m.y), ...spin(m.phase, m.w) }
    case 'slider':
      return { ...m, ax: X(m.ax), ay: Y(m.ay), bx: X(m.bx), by: Y(m.by) }
  }
}
