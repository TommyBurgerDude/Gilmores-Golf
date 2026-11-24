import type { Vec } from '../courses/schema'

export const v = (x: number, y: number): Vec => ({ x, y })
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y })
export const len = (a: Vec): number => Math.hypot(a.x, a.y)
export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))
