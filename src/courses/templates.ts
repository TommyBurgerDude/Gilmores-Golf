import { CUP_R, WORLD_H as H } from '../game/constants'
import { clamp } from '../game/vectors'
import type { Rng } from './prng'
import type { CapsuleShape, CircleShape, Mover, Portal, Region, RectShape, SlopeZone, TemplateId, Vec, Wall } from './schema'

/**
 * Course before scenery, flips and metadata are applied. All templates are authored tee-left, cup-right.
 * The playable area is the union of every region inflated by MASK_MARGIN (see game/terrain.ts), so layouts are
 * organic ribbons; walls are only for obstacles inside that area.
 */
export interface Draft {
  id: TemplateId
  name: string
  theme: string
  tee: Vec
  cup: Vec
  regions: Region[]
  walls: Wall[]
  slopes: SlopeZone[]
  portals: Portal[]
  movers: Mover[]
}

export interface Template {
  id: TemplateId
  build(rng: Rng, tier: number): Draft
}

export const rect = (x: number, y: number, w: number, h: number): RectShape => ({ t: 'rect', x, y, w, h })
export const circ = (x: number, y: number, r: number): CircleShape => ({ t: 'circle', x, y, r })
export const cap = (x1: number, y1: number, x2: number, y2: number, r: number): CapsuleShape => ({ t: 'capsule', x1, y1, x2, y2, r })

const M = 48 // keep authored geometry inside the world with this inset

export const tierPick = <A>(tier: number, a: A, b: A, c: A): A => (tier <= 1 ? a : tier === 2 ? b : c)

export const teeMat = (tee: Vec): Region => ({ terrain: 'fairway', shape: rect(tee.x - 26, tee.y - 26, 52, 52) })
export const greenAt = (cup: Vec, rng: Rng): Region => ({ terrain: 'green', shape: circ(cup.x, cup.y, rng.int(46, 58)) })

export function empty(id: TemplateId, name: string, theme: string, tee: Vec, cup: Vec): Draft {
  return { id, name, theme, tee, cup, regions: [], walls: [], slopes: [], portals: [], movers: [] }
}

/** Lawn bulges of rough that make the outline of the hole less tube-like. Pushed away from tee and cup. */
function bulges(d: Draft, rng: Rng, n: number, spread: number): void {
  for (let i = 0; i < n; i++) {
    const t = rng.range(0.25, 0.8)
    const x = d.tee.x + (d.cup.x - d.tee.x) * t
    const y = d.tee.y + (d.cup.y - d.tee.y) * t + rng.sign() * rng.range(spread * 0.6, spread)
    const r = rng.int(40, 70)
    d.regions.push({ terrain: 'rough', shape: circ(Math.round(x), Math.round(clamp(y, M + r * 0.4, H - M - r * 0.4)), r) })
  }
}

const straight: Template = {
  id: 'straight',
  build(rng, tier) {
    const tee = { x: rng.int(90, 120), y: rng.int(200, 400) }
    const cup = { x: rng.int(650, 700), y: rng.int(180, 420) }
    const d = empty('straight', "Gilmore's Long Haul", 'classic', tee, cup)
    const r = tierPick(tier, 90, 80, 70)
    bulges(d, rng, rng.int(1, 2), r + 30)
    d.regions.push({ terrain: 'fairway', shape: cap(tee.x, tee.y, cup.x, cup.y, r) })
    const dx = cup.x - tee.x
    const dy = cup.y - tee.y
    const l = Math.hypot(dx, dy)
    const px = -dy / l
    const py = dx / l
    const n = tier === 1 ? rng.int(1, 2) : rng.int(2, 3)
    for (let i = 0; i < n; i++) {
      const t = rng.range(0.3, 0.75)
      const off = rng.sign() * rng.range(r * 0.25, r * 0.7)
      d.regions.push({ terrain: 'sand', shape: circ(Math.round(tee.x + dx * t + px * off), Math.round(tee.y + dy * t + py * off), rng.int(20, 30)) })
    }
    if (tier >= 2 && rng.chance(0.6)) {
      d.slopes.push({ shape: rect(300, 120, 260, 360), ax: 0, ay: rng.sign() * rng.int(8, 8 + tier * 6) })
    }
    d.regions.push(greenAt(cup, rng), teeMat(tee))
    return d
  },
}

const dogleg: Template = {
  id: 'dogleg',
  build(rng, tier) {
    const tee = { x: rng.int(90, 120), y: rng.int(440, 500) }
    const cup = { x: rng.int(650, 700), y: rng.int(110, 170) }
    const d = empty('dogleg', 'Dogleg Dilemma', 'castle', tee, cup)
    const elbow = { x: rng.int(470, 570), y: tee.y }
    const r = tierPick(tier, 78, 68, 58)
    d.regions.push(
      { terrain: 'fairway', shape: cap(tee.x, tee.y, elbow.x, elbow.y, r) },
      { terrain: 'fairway', shape: cap(elbow.x, elbow.y, cup.x, cup.y, r) },
    )
    d.regions.push({ terrain: 'sand', shape: circ(elbow.x + rng.int(20, 40), elbow.y + rng.int(-10, 10), rng.int(22, 30)) })
    if (tier >= 2) d.regions.push({ terrain: 'sand', shape: circ(rng.int(250, 330), tee.y + rng.sign() * rng.int(30, 40), rng.int(18, 24)) })
    // A crumbling mini castle guarding the inside of the corner.
    d.walls.push({ shape: rect(elbow.x - 78, elbow.y - 80, 70, 40), style: 'castle' })
    d.regions.push(greenAt(cup, rng), teeMat(tee))
    return d
  },
}

const water: Template = {
  id: 'water',
  build(rng, tier) {
    const tee = { x: rng.int(90, 120), y: rng.int(260, 340) }
    const cup = { x: rng.int(670, 700), y: rng.int(250, 350) }
    const d = empty('water', 'Soggy Bottom Bridge', 'bridge', tee, cup)
    const r = tierPick(tier, 82, 72, 62)
    d.regions.push({ terrain: 'fairway', shape: cap(tee.x, tee.y, cup.x, cup.y, r) })
    const x0 = rng.int(330, 390)
    const ww = rng.int(100, 140)
    const ws = tierPick(tier, 120, 100, 80)
    const top = rng.chance(0.5)
    const wy = top ? M + ws : M
    const wh = H - 2 * M - ws
    // The dry detour around the pond.
    d.regions.push({ terrain: 'rough', shape: rect(x0 - 70, top ? M : H - M - ws, ww + 140, ws) })
    d.regions.push({ terrain: 'water', shape: rect(x0, wy, ww, wh) })
    const bh = tierPick(tier, 70, 60, 50)
    const by = Math.round(clamp((tee.y + cup.y) / 2 + rng.int(-30, 30), wy + bh / 2 + 10, wy + wh - bh / 2 - 10))
    d.regions.push({ terrain: 'fairway', shape: rect(x0 - 14, Math.round(by - bh / 2), ww + 28, bh), deck: true })
    if (tier >= 3) {
      d.slopes.push({ shape: rect(x0 - 14, Math.round(by - bh / 2), ww + 28, bh), ax: 0, ay: rng.sign() * 14 })
    }
    d.regions.push({ terrain: 'sand', shape: circ(rng.int(560, 620), cup.y + rng.sign() * rng.int(50, 70), rng.int(20, 26)) })
    d.regions.push(greenAt(cup, rng), teeMat(tee))
    return d
  },
}

const narrow: Template = {
  id: 'narrow',
  build(rng, tier) {
    const w = tierPick(tier, 124, 108, 94)
    const c1 = rng.int(250, 350)
    const c2 = Math.round(clamp(c1 + rng.int(-Math.floor(w * 0.5), Math.floor(w * 0.5)), 240, 360))
    const xs = rng.int(380, 430)
    const tee = { x: rng.int(100, 120), y: c1 }
    const cup = { x: rng.int(690, 705), y: c2 }
    const d = empty('narrow', 'Squeeze Play', 'hedge', tee, cup)
    const h = w / 2
    const x0 = 64
    const x1 = 736
    const hedge = (x1_: number, y1: number, x2: number, y2: number): Wall => ({ shape: cap(x1_, y1, x2, y2, 7), style: 'hedge' })
    for (const s of [-1, 1]) {
      d.walls.push(hedge(x0, c1 + s * h, xs, c1 + s * h), hedge(xs, c1 + s * h, xs, c2 + s * h), hedge(xs, c2 + s * h, x1, c2 + s * h))
    }
    d.walls.push(hedge(x0, c1 - h, x0, c1 + h), hedge(x1, c2 - h, x1, c2 + h))
    d.regions.push(
      { terrain: 'fairway', shape: rect(x0, c1 - h, xs - x0 + 1, w) },
      { terrain: 'fairway', shape: rect(xs, c2 - h, x1 - xs, w) },
      { terrain: 'fairway', shape: rect(xs - 20, Math.min(c1, c2) - h, 40, Math.abs(c1 - c2) + w) },
    )
    const n = tier + 1
    let side = rng.sign()
    for (let i = 0; i < n; i++) {
      const x = Math.round(190 + (440 * (i + 0.5)) / n)
      if (Math.abs(x - xs) < 40) continue
      const cy = x < xs ? c1 : c2
      d.walls.push({ shape: circ(x, cy + side * rng.int(8, 16), 12), style: 'tire' })
      side = side === 1 ? -1 : 1
    }
    if (tier >= 3) d.slopes.push({ shape: rect(xs, c2 - h, 200, w), ax: 0, ay: rng.sign() * 12 })
    d.regions.push({ terrain: 'green', shape: circ(cup.x, cup.y, Math.min(52, Math.floor(h))) })
    d.regions.push(teeMat(tee))
    return d
  },
}

const THEMES = [
  { theme: 'clown', name: 'Clown Mouth Tunnel', style: 'clown' as const, w: 76 },
  { theme: 'castle', name: 'Tiny Fake Castle', style: 'castle' as const, w: 80 },
  { theme: 'pirate', name: 'Sinking Pirate Ship', style: 'hull' as const, w: 90 },
  { theme: 'windmill', name: 'Broken Windmill', style: 'windmill' as const, w: 56 },
]

const themed: Template = {
  id: 'themed',
  build(rng, tier) {
    const th = rng.pick(THEMES)
    const tee = { x: rng.int(90, 110), y: rng.int(250, 350) }
    const cup = { x: rng.int(690, 715), y: rng.int(250, 350) }
    const d = empty('themed', th.name, th.theme, tee, cup)
    const r = tierPick(tier, 88, 78, 68)
    const bw = th.w
    const bh = 44
    const bx = rng.int(340, 380)
    const cy = 300 + rng.int(-20, 20)
    const by = cy - Math.floor(bh / 2)
    d.regions.push({ terrain: 'fairway', shape: cap(tee.x, tee.y, cup.x, cup.y, r) })
    d.walls.push({ shape: rect(bx, by, bw, bh), style: th.style })
    if (th.theme !== 'windmill') {
      d.portals.push({ a: { x: bx - 8, y: cy }, b: { x: bx + bw + 8, y: cy }, r: 16, dirA: { x: -1, y: 0 }, dirB: { x: 1, y: 0 } })
    }
    const laneTop = rng.chance(0.5)
    d.regions.push({ terrain: 'sand', shape: circ(rng.int(180, 280), laneTop ? cy - 80 : cy + 80, rng.int(20, 26)) })
    if (tier >= 2) {
      const mx = rng.int(500, 560)
      const my = laneTop ? cy - 100 : cy + 100
      const ang = rng.sign() * (Math.PI / 6)
      const dx = Math.cos(ang) * 45
      const dy = Math.sin(ang) * 45
      d.walls.push({ shape: cap(Math.round(mx - dx), Math.round(my - dy), Math.round(mx + dx), Math.round(my + dy), 6), style: 'wood' })
    }
    d.regions.push(greenAt(cup, rng), teeMat(tee))
    return d
  },
}

/** Two bends in a row: tee -> corner -> corner -> cup, with a tire in the middle of the diagonal. */
const sbend: Template = {
  id: 'sbend',
  build(rng, tier) {
    const ty = rng.int(130, 200)
    const cyy = rng.int(400, 470)
    const tee = { x: rng.int(95, 120), y: ty }
    const cup = { x: rng.int(670, 700), y: cyy }
    const d = empty('sbend', 'The S-Bend', 'bend', tee, cup)
    const x1 = rng.int(260, 330)
    const x2 = rng.int(470, 540)
    const r = tierPick(tier, 70, 62, 54)
    d.regions.push(
      { terrain: 'fairway', shape: cap(tee.x, ty, x1, ty, r) },
      { terrain: 'fairway', shape: cap(x1, ty, x2, cyy, r) },
      { terrain: 'fairway', shape: cap(x2, cyy, cup.x, cyy, r) },
    )
    d.regions.push({ terrain: 'sand', shape: circ(x1 + rng.int(25, 45), ty + rng.int(-20, 20), rng.int(20, 26)) })
    if (tier >= 2) d.regions.push({ terrain: 'sand', shape: circ(x2 - rng.int(25, 45), cyy + rng.int(-20, 20), rng.int(18, 24)) })
    d.walls.push({ shape: circ(Math.round((x1 + x2) / 2), Math.round((ty + cyy) / 2), 12), style: 'tire' })
    if (tier >= 3) d.slopes.push({ shape: rect(x1, Math.min(ty, cyy) - 20, x2 - x1, Math.abs(cyy - ty) + 40), ax: rng.sign() * 12, ay: 0 })
    d.regions.push(greenAt(cup, rng), teeMat(tee))
    return d
  },
}

/** A round lagoon in the middle of a wide field; go around either side. */
const lagoon: Template = {
  id: 'lagoon',
  build(rng, tier) {
    const tee = { x: rng.int(95, 120), y: rng.int(270, 330) }
    const cup = { x: rng.int(680, 705), y: rng.int(270, 330) }
    const d = empty('lagoon', 'Lazy Lagoon', 'lagoon', tee, cup)
    const r = tierPick(tier, 90, 80, 70)
    const wx = rng.int(380, 420)
    const wy = 300 + rng.int(-15, 15)
    const wr = tierPick(tier, 55, 65, 75)
    d.regions.push({ terrain: 'fairway', shape: cap(tee.x, tee.y, cup.x, cup.y, r) })
    d.regions.push({ terrain: 'rough', shape: circ(wx, wy - wr - 55, 70) })
    d.regions.push({ terrain: 'rough', shape: circ(wx, wy + wr + 55, 70) })
    d.regions.push({ terrain: 'water', shape: circ(wx, wy, wr) })
    d.regions.push({ terrain: 'sand', shape: circ(wx + rng.sign() * rng.int(110, 150), wy + rng.sign() * rng.int(40, 60), rng.int(20, 26)) })
    if (tier >= 2) d.walls.push({ shape: circ(wx - wr - 40, wy + rng.sign() * 40, 10), style: 'tire' })
    d.regions.push(greenAt(cup, rng), teeMat(tee))
    return d
  },
}

/** Out along the top, around the far end, and back along the bottom to a cup beside the tee. */
const uturn: Template = {
  id: 'uturn',
  build(rng, tier) {
    const ty = rng.int(120, 160)
    const cy = rng.int(430, 470)
    const x1 = rng.int(620, 660)
    const tee = { x: rng.int(100, 130), y: ty }
    const cup = { x: rng.int(130, 170), y: cy }
    const d = empty('uturn', 'Hairpin Hustle', 'hairpin', tee, cup)
    const r = tierPick(tier, 64, 58, 52)
    d.regions.push(
      { terrain: 'fairway', shape: cap(tee.x, ty, x1, ty, r) },
      { terrain: 'fairway', shape: cap(x1, ty, x1, cy, r) },
      { terrain: 'fairway', shape: cap(x1, cy, cup.x, cy, r) },
    )
    d.regions.push({ terrain: 'sand', shape: circ(x1 - rng.int(10, 30), ty + rng.int(30, 60), rng.int(20, 26)) })
    d.walls.push({ shape: circ(x1 - 10, Math.round((ty + cy) / 2), 12), style: 'tire' })
    if (tier >= 3) d.slopes.push({ shape: rect(x1 - r, ty, r * 2, cy - ty), ax: 0, ay: rng.sign() * 14 })
    d.regions.push(greenAt(cup, rng), teeMat(tee))
    return d
  },
}

/** The green sits on a round island inside a moat; one wooden bridge leads across. */
const island: Template = {
  id: 'island',
  build(rng, tier) {
    const tee = { x: rng.int(95, 120), y: rng.int(260, 340) }
    const cx = rng.int(600, 650)
    const cy = 300 + rng.int(-40, 40)
    const cup = { x: cx, y: cy }
    const d = empty('island', 'Castaway Isle', 'island', tee, cup)
    const r = tierPick(tier, 80, 72, 64)
    d.regions.push({ terrain: 'fairway', shape: cap(tee.x, tee.y, cx - 150, cy, r) })
    d.regions.push({ terrain: 'water', shape: circ(cx, cy, 125) })
    d.regions.push({ terrain: 'rough', shape: circ(cx, cy, 80) })
    const bh = tierPick(tier, 60, 52, 46)
    d.regions.push({ terrain: 'fairway', shape: rect(cx - 140, cy - bh / 2, 72, bh), deck: true })
    d.regions.push({ terrain: 'sand', shape: circ(cx + rng.int(30, 50), cy + rng.sign() * rng.int(30, 45), rng.int(14, 18)) })
    d.regions.push({ terrain: 'green', shape: circ(cx, cy, 52) })
    d.regions.push(teeMat(tee))
    return d
  },
}

/** A wide field full of tire bumpers: pinball golf. */
const pinball: Template = {
  id: 'pinball',
  build(rng, tier) {
    const tee = { x: rng.int(95, 120), y: rng.int(250, 350) }
    const cup = { x: rng.int(680, 705), y: rng.int(250, 350) }
    const d = empty('pinball', 'Bumper Alley', 'pinball', tee, cup)
    const r = 100
    d.regions.push({ terrain: 'fairway', shape: cap(tee.x, tee.y, cup.x, cup.y, r) })
    const n = 4 + tier * 2
    const placed: Vec[] = []
    for (let i = 0, tries = 0; i < n && tries < 200; tries++) {
      const x = rng.int(220, 620)
      const t = (x - tee.x) / (cup.x - tee.x)
      const y = Math.round(tee.y + (cup.y - tee.y) * t + rng.int(-r + 30, r - 30))
      if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < 75)) continue
      placed.push({ x, y })
      d.walls.push({ shape: circ(x, y, 12), style: 'tire' })
      i++
    }
    d.regions.push({ terrain: 'sand', shape: circ(rng.int(300, 500), tee.y + rng.sign() * rng.int(110, 130), rng.int(18, 24)) })
    d.regions.push(greenAt(cup, rng), teeMat(tee))
    return d
  },
}

/** Two water bands, each crossed only by a bridge at a different height. */
const twinbridge: Template = {
  id: 'twinbridge',
  build(rng, tier) {
    const tee = { x: rng.int(95, 120), y: rng.int(270, 330) }
    const cup = { x: rng.int(680, 705), y: rng.int(270, 330) }
    const d = empty('twinbridge', 'Two Bridges', 'bridges', tee, cup)
    d.regions.push({ terrain: 'fairway', shape: cap(tee.x, tee.y, cup.x, cup.y, 85) })
    const bh = tierPick(tier, 68, 58, 50)
    const ya = rng.int(190, 280)
    const yb = Math.round(clamp(ya + rng.sign() * rng.int(90, 140), 170, 430))
    const xa = rng.int(240, 280)
    const xb = rng.int(470, 510)
    const ww = rng.int(70, 90)
    for (const [x, y] of [[xa, ya], [xb, yb]] as const) {
      d.regions.push({ terrain: 'water', shape: rect(x, 60, ww, 480) })
      d.regions.push({ terrain: 'fairway', shape: rect(x - 12, y - bh / 2, ww + 24, bh), deck: true })
    }
    d.regions.push({ terrain: 'sand', shape: circ(Math.round((xa + xb) / 2 + ww / 2), rng.chance(0.5) ? 220 : 380, rng.int(18, 24)) })
    d.regions.push(greenAt(cup, rng), teeMat(tee))
    return d
  },
}

/** Rolling slopes push the ball across a wide field. */
const hills: Template = {
  id: 'hills',
  build(rng, tier) {
    const tee = { x: rng.int(95, 120), y: rng.int(250, 350) }
    const cup = { x: rng.int(680, 705), y: rng.int(250, 350) }
    const d = empty('hills', 'Rolling Hills', 'hills', tee, cup)
    const r = tierPick(tier, 95, 88, 80)
    bulges(d, rng, 2, r + 20)
    d.regions.push({ terrain: 'fairway', shape: cap(tee.x, tee.y, cup.x, cup.y, r) })
    const s = tierPick(tier, 12, 18, 24)
    d.slopes.push(
      { shape: rect(210, 120, 150, 360), ax: 0, ay: rng.sign() * s },
      { shape: rect(360, 120, 150, 360), ax: 0, ay: rng.sign() * s },
      { shape: rect(510, 120, 120, 360), ax: rng.sign() * Math.round(s * 0.6), ay: rng.sign() * Math.round(s * 0.6) },
    )
    for (let i = 0; i < 2 + (tier > 1 ? 1 : 0); i++) {
      d.regions.push({ terrain: 'sand', shape: circ(rng.int(260, 560), tee.y + rng.sign() * rng.int(40, 90), rng.int(18, 26)) })
    }
    d.regions.push(greenAt(cup, rng), teeMat(tee))
    return d
  },
}

/** A tall hedge splits the field. Go through the warp hole (a tunnel) or around the gap. */
const warp: Template = {
  id: 'warp',
  build(rng, tier) {
    const tee = { x: rng.int(95, 120), y: rng.int(260, 340) }
    const cup = { x: rng.int(680, 705), y: rng.int(260, 340) }
    const d = empty('warp', 'The Hedge Warp', 'warp', tee, cup)
    d.regions.push({ terrain: 'fairway', shape: cap(tee.x, tee.y, cup.x, cup.y, tierPick(tier, 95, 88, 80)) })
    const bx = rng.int(370, 420)
    const gap = tierPick(tier, 120, 100, 84)
    const top = rng.chance(0.5)
    const wy = top ? M + gap : M
    const wh = H - 2 * M - gap
    d.walls.push({ shape: rect(bx, wy, 24, wh), style: 'hedge' })
    const py = Math.round(wy + wh / 2)
    d.portals.push({ a: { x: bx - 8, y: py }, b: { x: bx + 32, y: py }, r: 16, dirA: { x: -1, y: 0 }, dirB: { x: 1, y: 0 } })
    // The detour lane, widened so it joins the fairway on both sides of the hedge.
    d.regions.push({ terrain: 'rough', shape: rect(bx - 110, top ? M : H - M - gap - 140, 244, gap + 140) })
    d.regions.push({ terrain: 'sand', shape: circ(rng.int(200, 300), 300 + rng.sign() * rng.int(70, 100), rng.int(18, 24)) })
    d.regions.push(greenAt(cup, rng), teeMat(tee))
    return d
  },
}

export const TEMPLATES: Record<string, Template> = {
  straight,
  dogleg,
  water,
  narrow,
  themed,
  sbend,
  lagoon,
  uturn,
  island,
  pinball,
  twinbridge,
  hills,
  warp,
}
export { CUP_R }
