import { BOOST_ACCEL } from '../game/constants'
import { clamp } from '../game/vectors'
import { Rng, hashString } from './prng'
import type { Region, Vec } from './schema'
import { FEATURES, SKELETONS, type SkelDef } from './templateIds'
import { type Draft, type Template, cap, circ, empty, greenAt, rect, teeMat, tierPick } from './templates'

/**
 * Composite hole types: a path SHAPE (200 of them) crossed with a hazard FEATURE (20) gives 4000 hole types.
 * The fairway is a chain of capsules along the path. Features are placed relative to the path so they sit on the
 * playable ground; the route validator still has the last word.
 */

interface Skeleton {
  pts: Vec[]
  r: number
  /** Extra playable ground (arms, lawns) drawn before the fairway. */
  extra?: Region[]
}

type Info = { pts: Vec[]; r: number; len: number; cum: number[] }

function pathInfo(pts: Vec[], r: number): Info {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1] as Vec
    const b = pts[i] as Vec
    cum.push((cum[i - 1] as number) + Math.hypot(b.x - a.x, b.y - a.y))
  }
  return { pts, r, len: cum[cum.length - 1] as number, cum }
}

/** Point and unit tangent at fraction t (0..1) of the path length. */
function at(info: Info, t: number): { p: Vec; tan: Vec } {
  const target = clamp(t, 0, 1) * info.len
  for (let i = 1; i < info.pts.length; i++) {
    const c1 = info.cum[i] as number
    if (target <= c1 || i === info.pts.length - 1) {
      const a = info.pts[i - 1] as Vec
      const b = info.pts[i] as Vec
      const c0 = info.cum[i - 1] as number
      const f = c1 === c0 ? 0 : (target - c0) / (c1 - c0)
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1
      return { p: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, tan: { x: (b.x - a.x) / l, y: (b.y - a.y) / l } }
    }
  }
  return { p: info.pts[0] as Vec, tan: { x: 1, y: 0 } }
}

const R = (v: number) => Math.round(v)
const jit = (rng: Rng, v: number, a: number) => v + rng.int(-a, a)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const pt = (x: number, y: number): Vec => ({ x: R(x), y: R(y) })
const rr = (tier: number, base: number) => R(base * tierPick(tier, 1.08, 1, 0.92))
const linspace = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => lerp(a, b, n === 1 ? 0 : i / (n - 1)))

type FamilyFn = (rng: Rng, tier: number, p: number) => Skeleton

const FAMILY: Record<string, FamilyFn> = {
  wave: (rng, tier, p) => {
    const xs = linspace(100, 700, p + 2)
    const amp = 100 + rng.int(0, 25)
    return { pts: xs.map((x, i) => pt(x, i === 0 || i === xs.length - 1 ? 300 : 300 + (i % 2 ? 1 : -1) * amp)), r: rr(tier, Math.max(44, 72 - p * 3)) }
  },
  zig: (rng, tier, p) => {
    const xs = linspace(100, 700, p + 1)
    return { pts: xs.map((x, i) => pt(jit(rng, x, 8), jit(rng, i % 2 ? 430 : 170, 14))), r: rr(tier, Math.max(40, 62 - p * 2)) }
  },
  zigs: (rng, tier, p) => {
    const xs = linspace(100, 700, p + 1)
    return { pts: xs.map((x, i) => pt(jit(rng, x, 8), jit(rng, i % 2 ? 470 : 130, 10))), r: rr(tier, Math.max(38, 56 - p * 2)) }
  },
  stairs: (rng, tier, p) => {
    const dx = 560 / p
    const dy = 340 / p
    const pts: Vec[] = [pt(100, 110)]
    let x = 100
    let y = 110
    for (let i = 0; i < p; i++) {
      x += dx
      pts.push(pt(x + rng.int(-6, 6), y))
      y += dy
      pts.push(pt(x + rng.int(-6, 6), y))
    }
    pts[pts.length - 1] = pt(x, y)
    return { pts, r: rr(tier, Math.max(38, 58 - p * 3)) }
  },
  spiral: (rng, tier, p) => {
    const inner = [pt(110, jit(rng, 300, 20)), pt(jit(rng, 400, 25), jit(rng, 300, 20))]
    const outer = [pt(110, 110), pt(690, 110), pt(690, 490), pt(110, 490)]
    const mid = p === 2 ? [pt(110, 300)] : []
    return { pts: [...outer, ...mid, ...inner], r: rr(tier, p === 1 ? 44 : 48) }
  },
  arc: (rng, tier, p) => {
    const b = 70 + p * 38
    const xs = linspace(100, 700, 6)
    return {
      pts: xs.map((x, i) => {
        const u = (x - 400) / 300
        return pt(jit(rng, x, 6), 450 - b * (1 - u * u) + (i === 0 || i === 5 ? 0 : rng.int(-8, 8)))
      }),
      r: rr(tier, 70),
    }
  },
  hook: (rng, tier, p) => {
    const a = 110 + (p % 2) * 380
    const b = 430 + p * 36
    const c = a < 300 ? 470 : 130
    const mid = p >= 4 ? [pt(b - 160, a === 110 ? 260 : 340)] : []
    return { pts: [pt(100, jit(rng, a, 12)), ...mid, pt(jit(rng, b, 15), jit(rng, a, 12)), pt(jit(rng, b, 15), c)], r: rr(tier, 60 + (p % 3) * 4) }
  },
  ring: (rng, tier, p) => {
    const gap = 100 + (p % 4) * 20
    const Rr = p < 4 ? 170 : 200
    const a0 = (90 + gap / 2) * (Math.PI / 180)
    const span = (360 - gap) * (Math.PI / 180)
    const n = 14
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const a = a0 + (span * i) / n
      return pt(400 + Math.cos(a) * Rr * 1.15, 300 + Math.sin(a) * Rr * 0.92 + (i === 0 || i === n ? 0 : rng.int(-4, 4)))
    })
    return { pts, r: rr(tier, 48) }
  },
  fork: (rng, tier, p) => {
    const r = rr(tier, 52)
    const sx = 330 + (p % 4) * 25
    const dy = 110 + Math.floor(p / 4) * 40 + (p % 4) * 10
    const mx = jit(rng, 520, 20)
    return {
      pts: [pt(100, 300), pt(sx, 300), pt(mx, 300 - dy), pt(700, 300)],
      r,
      extra: [{ terrain: 'fairway', shape: cap(sx, 300, mx, 300 + dy, r) }, { terrain: 'fairway', shape: cap(mx, 300 + dy, 700, 300, r) }],
    }
  },
  plaza: (rng, tier, p) => ({ pts: [pt(110, jit(rng, 300, 20)), pt(690, jit(rng, 300, 20))], r: rr(tier, 105 + p * 9) }),
  bell: (rng, tier, p) => {
    const nb = 2 + Math.floor(p / 2)
    const xs = linspace(150, 650, nb)
    const y = rng.int(270, 330)
    return {
      pts: xs.map((x, i) => pt(x, y + (nb > 2 && i % 2 ? 40 : 0))),
      r: rr(tier, p % 2 ? 38 : 48),
      extra: xs.map((x, i): Region => ({ terrain: 'rough', shape: circ(R(x), R(y + (nb > 2 && i % 2 ? 40 : 0)), 100) })),
    }
  },
  cross: (rng, tier, p) => {
    const y = rng.int(270, 330)
    const x = rng.int(380, 420)
    const r = rr(tier, p === 5 ? 70 : 58)
    const arm = (x1: number, y1: number, x2: number, y2: number): Region => ({ terrain: 'fairway', shape: cap(x1, y1, x2, y2, rr(tier, 50)) })
    const arms: Region[] =
      p === 0 || p === 5
        ? [arm(x, 100, x, 500)]
        : p === 1
          ? [arm(x, 90, x, y)]
          : p === 2
            ? [arm(x, y, x, 510)]
            : p === 3
              ? [arm(x - 160, y - 200, x + 160, y + 200), arm(x - 160, y + 200, x + 160, y - 200)]
              : [arm(260, 100, 260, 500), arm(540, 100, 540, 500)]
    return { pts: [pt(100, y), pt(700, y)], r, extra: arms }
  },
  sweep: (rng, tier, p) => {
    const span = [180, 200, 220, 240][p] as number
    const Rr = [220, 220, 200, 190][p] as number
    const a0 = Math.PI
    const n = 9
    return {
      pts: Array.from({ length: n + 1 }, (_, i) => {
        const a = a0 + ((span * Math.PI) / 180) * (i / n)
        return pt(400 + Math.cos(a) * Rr * 1.3 + (i % 3 === 1 ? rng.int(-5, 5) : 0), 330 + Math.sin(a) * Rr)
      }),
      r: rr(tier, 56),
    }
  },
  kink: (rng, tier, p) => {
    const nb = 1 + (p % 3)
    const pts: Vec[] = [pt(100, 300)]
    const xs = linspace(250, 650, nb)
    let side = rng.sign()
    for (const x of xs) {
      pts.push(pt(x - 40, 300), pt(x, 300 + side * rng.int(100, 140)), pt(x + 40, 300))
      if (p >= 3) side = side === 1 ? -1 : 1
    }
    pts.push(pt(700, 300))
    return { pts, r: rr(tier, 60) }
  },
  diag: (rng, tier, p) => {
    const sets: Vec[][] = [
      [pt(110, 110), pt(690, 490)],
      [pt(110, 110), pt(400, jit(rng, 330, 20)), pt(690, 490)],
      [pt(110, 490), pt(380, jit(rng, 250, 20)), pt(690, 110)],
      [pt(110, 200), pt(690, 400)],
    ]
    return { pts: sets[p] as Vec[], r: rr(tier, 76) }
  },
  peak: (rng, tier, p) => ({ pts: [pt(100, 450), pt(jit(rng, 400, 25), [120, 160, 200][p] as number), pt(700, 450)], r: rr(tier, 62) }),
  /** A fixed irregular shape per id: seeded random walk with spacing rules. */
  walk: (rng, tier, p) => {
    const w = new Rng(hashString(`walk:${p}`))
    for (let attempt = 0; attempt < 400; attempt++) {
      const pts: Vec[] = [pt(100, w.int(140, 460))]
      const segs = w.int(4, 7)
      for (let s = 0; s < segs; s++) {
        let placed = false
        for (let k = 0; k < 40 && !placed; k++) {
          const last = pts[pts.length - 1] as Vec
          const ang = w.range(-1.9, 1.9)
          const len = w.range(110, 240)
          const np = pt(clamp(last.x + Math.cos(ang) * len, 90, 710), clamp(last.y + Math.sin(ang) * len, 90, 510))
          if (Math.hypot(np.x - last.x, np.y - last.y) < 90) continue
          if (pts.slice(0, -1).some((q) => Math.hypot(q.x - np.x, q.y - np.y) < 130)) continue
          pts.push(np)
          placed = true
        }
        if (!placed) break
      }
      const a = pts[0] as Vec
      const b = pts[pts.length - 1] as Vec
      if (pts.length >= 4 && Math.hypot(a.x - b.x, a.y - b.y) >= 300) {
        return { pts, r: rr(tier, 50 + (hashString(`wr:${p}`) % 17)) }
      }
    }
    void rng
    return { pts: [pt(100, 300), pt(400, 200), pt(700, 300)], r: rr(tier, 60) }
  },
}

type FeatureFn = (d: Draft, info: Info, rng: Rng, tier: number) => void

const perp = (t: Vec): Vec => ({ x: -t.y, y: t.x })

/** A river band across the path at t, with a bridge deck exactly on the path. */
function river(d: Draft, info: Info, tier: number, t: number): void {
  const { p, tan } = at(info, t)
  const n = perp(tan)
  const half = info.r + 55
  const cx = (v: number) => clamp(R(v), 34, 766)
  const cy = (v: number) => clamp(R(v), 34, 566)
  d.regions.push({ terrain: 'water', shape: cap(cx(p.x - n.x * half), cy(p.y - n.y * half), cx(p.x + n.x * half), cy(p.y + n.y * half), 34) })
  const bh = tierPick(tier, 66, 58, 50)
  d.regions.push({ terrain: 'fairway', shape: cap(R(p.x - tan.x * 55), R(p.y - tan.y * 55), R(p.x + tan.x * 55), R(p.y + tan.y * 55), bh / 2), deck: true })
}

const FEATURE_FN: Record<string, FeatureFn> = {
  bunkers: (d, info, rng, tier) => {
    for (let i = 0; i < 2 + tier; i++) {
      const { p, tan } = at(info, rng.range(0.2, 0.85))
      const nn = perp(tan)
      const off = rng.sign() * rng.range(info.r * 0.25, info.r * 0.65)
      d.regions.push({ terrain: 'sand', shape: circ(R(p.x + nn.x * off), R(p.y + nn.y * off), rng.int(18, 28)) })
    }
  },
  pond: (d, info, rng, tier) => river(d, info, tier, rng.range(0.4, 0.6)),
  rivers: (d, info, rng, tier) => {
    river(d, info, tier, rng.range(0.28, 0.4))
    river(d, info, tier, rng.range(0.62, 0.74))
  },
  bumpers: (d, info, rng, tier) => {
    const n = 3 + tier * 2
    for (let i = 0; i < n; i++) {
      const { p, tan } = at(info, (i + 1) / (n + 1))
      const nn = perp(tan)
      const off = rng.sign() * rng.range(info.r * 0.15, info.r * 0.45)
      d.walls.push({ shape: circ(R(p.x + nn.x * off), R(p.y + nn.y * off), 12), style: 'tire' })
    }
  },
  boards: (d, info, rng, tier) => {
    for (let i = 0; i < 2 + (tier > 1 ? 1 : 0); i++) {
      const { p, tan } = at(info, rng.range(0.25, 0.8))
      const nn = perp(tan)
      const side = rng.sign()
      const cx = p.x + nn.x * side * info.r * 0.4
      const cy = p.y + nn.y * side * info.r * 0.4
      const ang = Math.atan2(tan.y, tan.x) + side * 0.6
      const dx = Math.cos(ang) * 32
      const dy = Math.sin(ang) * 32
      d.walls.push({ shape: cap(R(cx - dx), R(cy - dy), R(cx + dx), R(cy + dy), 6), style: 'wood' })
    }
  },
  slopes: (d, info, rng, tier) => {
    const s = tierPick(tier, 12, 18, 24)
    const n = 2 + (tier > 1 ? 1 : 0)
    for (let i = 0; i < n; i++) {
      const { p, tan } = at(info, (i + 0.7) / (n + 0.6))
      const v = rng.chance(0.5) ? tan : perp(tan)
      const sg = rng.sign()
      d.slopes.push({ shape: circ(R(p.x), R(p.y), R(info.r + 20)), ax: R(v.x * s * sg), ay: R(v.y * s * sg) })
    }
  },
  moat: (d, info, _rng, tier) => {
    const { p: cup } = at(info, 1)
    const { tan } = at(info, 0.97)
    // Keep the moat inside the world; near an edge swap it for a ring of bunkers.
    const room = Math.min(cup.x, 800 - cup.x, cup.y, 600 - cup.y) - 2
    if (room < 90) {
      for (let i = 0; i < 4; i++) {
        const a = Math.atan2(-tan.y, -tan.x) + Math.PI + 0.9 + i * 1.2
        d.regions.push({ terrain: 'sand', shape: circ(R(cup.x + Math.cos(a) * 64), R(cup.y + Math.sin(a) * 64), 20) })
      }
      return
    }
    d.regions.push({ terrain: 'water', shape: circ(R(cup.x), R(cup.y), Math.min(95, R(room))) })
    d.regions.push({ terrain: 'rough', shape: circ(R(cup.x), R(cup.y), 66) })
    const bh = tierPick(tier, 60, 52, 46)
    d.regions.push({ terrain: 'fairway', shape: cap(R(cup.x - tan.x * 115), R(cup.y - tan.y * 115), R(cup.x - tan.x * 56), R(cup.y - tan.y * 56), bh / 2), deck: true })
  },
  landmark: (d, info, rng) => {
    const th = rng.pick([
      { style: 'clown' as const, w: 76 },
      { style: 'castle' as const, w: 80 },
      { style: 'hull' as const, w: 90 },
      { style: 'windmill' as const, w: 56 },
    ])
    const { p, tan } = at(info, rng.range(0.38, 0.62))
    const nn = perp(tan)
    const off = rng.sign() * info.r * 0.2
    d.walls.push({ shape: rect(R(p.x + nn.x * off - th.w / 2), R(p.y + nn.y * off - 22), th.w, 44), style: th.style })
  },
  warp: (d, info, rng) => {
    const a = at(info, rng.range(0.18, 0.3))
    const b = at(info, rng.range(0.66, 0.78))
    d.portals.push({ a: pt(a.p.x, a.p.y), b: pt(b.p.x, b.p.y), r: 15, dirA: { x: -a.tan.x, y: -a.tan.y }, dirB: { x: b.tan.x, y: b.tan.y } })
  },
  gates: (d, info, rng, tier) => {
    const gap = tierPick(tier, 64, 54, 46)
    for (let i = 0; i < 2 + (tier > 1 ? 1 : 0); i++) {
      const n = 2 + (tier > 1 ? 1 : 0)
      const { p, tan } = at(info, (i + 1) / (n + 1) + rng.range(-0.04, 0.04))
      const nn = perp(tan)
      for (const s of [-1, 1]) d.walls.push({ shape: circ(R(p.x + nn.x * s * (gap / 2 + 12)), R(p.y + nn.y * s * (gap / 2 + 12)), 11), style: 'tire' })
    }
  },

  // ---- moving elements
  rotor: (d, info, rng, tier) => {
    const { p } = at(info, rng.range(0.38, 0.62))
    const arms = tier >= 3 ? 3 : 2
    d.walls.push({ shape: circ(R(p.x), R(p.y), 9), style: 'wood' })
    d.movers.push({ kind: 'rotor', x: R(p.x), y: R(p.y), arms, len: R(Math.min(info.r * 0.9, 70)), r: 5, w: rng.sign() * (0.8 + 0.25 * tier), phase: rng.range(0, 6.28) })
  },
  sliders: (d, info, rng, tier) => {
    const n = tier >= 2 ? 3 : 2
    for (let i = 0; i < n; i++) {
      const { p, tan } = at(info, (i + 1) / (n + 1))
      const nn = perp(tan)
      const h = info.r * 0.55
      const bar = i % 2 === 1
      d.movers.push({
        kind: 'slider',
        ax: R(p.x - nn.x * h),
        ay: R(p.y - nn.y * h),
        bx: R(p.x + nn.x * h),
        by: R(p.y + nn.y * h),
        bar,
        r: bar ? 6 : 13,
        len: 40,
        w: 1 + 0.2 * tier,
        phase: rng.range(0, 6.28),
      })
    }
  },
  orbit: (d, info, rng, tier) => {
    const { p } = at(info, rng.range(0.4, 0.6))
    const Rr = R(Math.min(info.r * 0.55, 46))
    d.walls.push({ shape: circ(R(p.x), R(p.y), 7), style: 'wood' })
    const ph = rng.range(0, 6.28)
    const w = rng.sign() * (1.2 + 0.2 * tier)
    d.movers.push({ kind: 'orbit', x: R(p.x), y: R(p.y), R: Rr, r: 12, w, phase: ph })
    if (tier >= 2) d.movers.push({ kind: 'orbit', x: R(p.x), y: R(p.y), R: Rr, r: 12, w, phase: ph + Math.PI })
  },
  bouncers: (d, info, rng, tier) => {
    const n = 3 + tier
    for (let i = 0; i < n; i++) {
      const { p, tan } = at(info, (i + 1) / (n + 1))
      const nn = perp(tan)
      const off = rng.sign() * rng.range(info.r * 0.2, info.r * 0.5)
      d.walls.push({ shape: circ(R(p.x + nn.x * off), R(p.y + nn.y * off), 13), style: 'bouncer', bounce: 1.35 })
    }
  },

  // ---- terrain hazards
  ice: (d, info, rng, tier) => {
    for (let i = 0; i < 3 + tier; i++) {
      const { p, tan } = at(info, rng.range(0.15, 0.85))
      const nn = perp(tan)
      const off = rng.range(-info.r * 0.3, info.r * 0.3)
      d.regions.push({ terrain: 'ice', shape: circ(R(p.x + nn.x * off), R(p.y + nn.y * off), rng.int(24, 36)) })
    }
  },
  mud: (d, info, rng, tier) => {
    for (let i = 0; i < 3 + tier; i++) {
      const { p, tan } = at(info, rng.range(0.15, 0.85))
      const nn = perp(tan)
      const off = rng.range(-info.r * 0.3, info.r * 0.3)
      d.regions.push({ terrain: 'puddle', shape: circ(R(p.x + nn.x * off), R(p.y + nn.y * off), rng.int(24, 38)) })
    }
  },
  pads: (d, info, rng, tier) => {
    const n = 2 + (tier > 1 ? 1 : 0)
    for (let i = 0; i < n; i++) {
      const { p, tan } = at(info, (i + 0.8) / (n + 0.6))
      d.slopes.push({ kind: 'boost', shape: circ(R(p.x), R(p.y), 26), ax: R(tan.x * BOOST_ACCEL), ay: R(tan.y * BOOST_ACCEL) })
    }
    void rng
  },
  gusts: (d, info, rng, tier) => {
    const n = 2 + (tier > 1 ? 1 : 0)
    const s = tierPick(tier, 12, 16, 20)
    for (let i = 0; i < n; i++) {
      const { p, tan } = at(info, (i + 0.8) / (n + 0.6))
      const nn = perp(tan)
      const sg = rng.sign()
      d.slopes.push({ kind: 'gust', shape: circ(R(p.x), R(p.y), R(info.r * 0.85)), ax: R(nn.x * s * sg), ay: R(nn.y * s * sg) })
    }
  },
  slalom: (d, info, rng, tier) => {
    const n = 3 + (tier > 1 ? 1 : 0)
    let side = rng.sign()
    for (let i = 0; i < n; i++) {
      const { p, tan } = at(info, (i + 1) / (n + 1))
      const nn = perp(tan)
      const x1 = p.x + nn.x * side * info.r * 0.95
      const y1 = p.y + nn.y * side * info.r * 0.95
      const x2 = p.x + nn.x * side * info.r * 0.1
      const y2 = p.y + nn.y * side * info.r * 0.1
      d.walls.push({ shape: cap(R(x1), R(y1), R(x2), R(y2), 7), style: 'hedge' })
      side = side === 1 ? -1 : 1
    }
  },
  fortress: (d, info, rng, tier) => {
    const { p: cup } = at(info, 1)
    const { tan } = at(info, 0.97)
    const base = Math.atan2(-tan.y, -tan.x)
    const gap = tierPick(tier, 0.65, 0.55, 0.45)
    const n = 11
    for (let i = 0; i < n; i++) {
      const a = base + Math.PI + (i / n) * Math.PI * 2 - Math.PI
      let delta = a - base
      while (delta > Math.PI) delta -= Math.PI * 2
      while (delta < -Math.PI) delta += Math.PI * 2
      if (Math.abs(delta) < gap) continue
      d.walls.push({ shape: circ(R(cup.x + Math.cos(a) * 62), R(cup.y + Math.sin(a) * 62), 10), style: 'tire' })
    }
    void rng
  },
}

export function buildComposite(def: SkelDef, ftId: string): Template {
  const ft = FEATURES.find((f) => f.id === ftId)
  if (!ft) throw new Error(`unknown feature ${ftId}`)
  const id = `${def.id}-${ftId}`
  return {
    id,
    build(rng, tier): Draft {
      const s = (FAMILY[def.family] as FamilyFn)(rng, tier, def.p)
      const tee = pt((s.pts[0] as Vec).x, (s.pts[0] as Vec).y)
      const last = s.pts[s.pts.length - 1] as Vec
      const cup = pt(last.x, last.y)
      const d = empty(id, `${def.name} ${ft.name}`, id, tee, cup)
      for (const e of s.extra ?? []) d.regions.push(e)
      for (let i = 1; i < s.pts.length; i++) {
        const a = s.pts[i - 1] as Vec
        const b = s.pts[i] as Vec
        d.regions.push({ terrain: 'fairway', shape: cap(R(a.x), R(a.y), R(b.x), R(b.y), s.r) })
      }
      ;(FEATURE_FN[ftId] as FeatureFn)(d, pathInfo(s.pts, s.r), rng, tier)
      d.regions.push(greenAt(cup, rng), teeMat(tee))
      return d
    },
  }
}

export const COMPOSITE_TEMPLATES: Template[] = SKELETONS.flatMap((s) => FEATURES.map((f) => buildComposite(s, f.id)))
