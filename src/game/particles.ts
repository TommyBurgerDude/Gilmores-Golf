import { mulberry32 } from '../courses/prng'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
}

/** Cosmetic only: uses its own seeded generator and never feeds back into gameplay. */
export class Particles {
  items: Particle[] = []
  private rand = mulberry32(0x7ee0)

  burst(x: number, y: number, count: number, colors: string[], speed = 60, life = 0.5, size = 2): void {
    for (let i = 0; i < count; i++) {
      const a = this.rand() * Math.PI * 2
      const s = speed * (0.3 + this.rand() * 0.7)
      this.items.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.6 + this.rand() * 0.4),
        max: life,
        color: colors[Math.floor(this.rand() * colors.length)] as string,
        size,
      })
    }
    if (this.items.length > 200) this.items.splice(0, this.items.length - 200)
  }

  update(dt: number): void {
    for (const p of this.items) {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.96
      p.vy *= 0.96
    }
    this.items = this.items.filter((p) => p.life > 0)
  }

  clear(): void {
    this.items = []
  }
}
