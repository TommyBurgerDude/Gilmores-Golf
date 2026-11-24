import type { Course, Shape, Wall } from '../courses/schema'
import { PATH_WIDTH, PIXEL as S, VIEW_H, VIEW_W, VIEW_X, VIEW_Y } from './constants'
import { PAL, hash2, packColor } from './palette'
import { THEMES, activeTheme, setActiveSeason } from './seasons'
import { drawLandmark } from './landmarks'
import { drawProp } from './sprites'
import { insideShape, shapeBounds } from './shapes'
import { maskSdf, regionAt } from './terrain'

type Ctx = CanvasRenderingContext2D

const px = (v: number): number => Math.round(v / S)

function rectPx(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

export function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r + r * 0.6 - dy * dy))
    ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1)
  }
}

// ---------------------------------------------------------------- terrain

// 0-5 are playable terrain (edge priority order); 6+ are the park outside the fence.
const CODE = { rough: 0, fairway: 1, green: 2, sand: 3, ice: 4, puddle: 5, water: 6, deck: 7, outside: 8 } as const

const C = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, packColor(v)])) as Record<keyof typeof PAL, number>
const K = {
  lawnA: packColor('#4a9a45'),
  lawnB: packColor('#448f40'),
  lawnTuft: packColor('#68b858'),
  lawnDark: packColor('#357a38'),
  pathA: packColor('#cdb98f'),
  pathB: packColor('#bba67c'),
  pathLight: packColor('#ddcba2'),
  pathEdge: packColor('#8f7d58'),
  pathShade: packColor('#a8946a'),
  fenceDark: packColor('#2a1a10'),
  fenceMid: packColor('#8a5e35'),
  fenceLight: packColor('#b98a55'),
  fenceInner: packColor('#4a2f1b'),
  gridLine: packColor('#3a1a50'),
}

/** Weather terrain colours, re-tinted per theme. */
const X = {
  ice: packColor('#c6ecf6'),
  iceLight: packColor('#ffffff'),
  iceEdge: packColor('#7ab8d0'),
  puddle: packColor('#4a8a9a'),
  puddleLight: packColor('#8ac4d0'),
  puddleEdge: packColor('#2a5a6a'),
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t)
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`
}

/** Re-colour the packed palettes for a season. The static layer is rendered synchronously, so this is safe. */
function applyTheme(season: Course['meta']['season']): void {
  const t = THEMES[season]
  setActiveSeason(season)
  const p = packColor
  Object.assign(C, {
    olive: p(t.rough[0]), oliveDark: p(t.rough[1]), oliveLight: p(t.rough[2]),
    fairway: p(t.fairway[0]), fairwayLight: p(t.fairway[1]), fairwayEdge: p(t.fairway[2]),
    green: p(t.green[0]), greenDark: p(t.green[1]), greenEdge: p(t.green[2]),
    sand: p(t.sand[0]), sandDark: p(t.sand[1]), sandEdge: p(t.sand[2]),
    water: p(t.water[0]), waterLight: p(t.water[1]), waterEdge: p(t.water[2]),
  })
  Object.assign(K, {
    lawnA: p(t.lawn[0]), lawnB: p(t.lawn[1]), lawnTuft: p(t.lawn[2]), lawnDark: p(t.lawn[3]),
    pathA: p(t.path[0]), pathB: p(t.path[1]), pathLight: p(t.path[2]), pathEdge: p(t.path[3]), pathShade: p(t.path[4]),
    fenceDark: p(t.fence[0]), fenceMid: p(t.fence[1]), fenceLight: p(t.fence[2]), fenceInner: p(t.fence[3]),
    gridLine: p(mix(t.lawn[0], t.lawn[2], 0.28)),
  })
  Object.assign(X, {
    puddle: p(mix(t.water[0], t.rough[0], 0.3)),
    puddleLight: p(mix(t.water[1], '#ffffff', 0.25)),
    puddleEdge: p(t.water[2]),
  })
}

function terrainColor(code: number, x: number, y: number, n: number, seed: number): number {
  switch (code) {
    // Flat-shaded "felt": solid colours, wide mowing stripes, almost no noise.
    case CODE.fairway:
      return (x >> 4) & 1 ? C.fairwayLight : C.fairway
    case CODE.green:
      return ((x >> 3) + (y >> 3)) & 1 ? C.greenDark : C.green
    case CODE.sand:
      return n < 10 ? C.sandDark : C.sand
    case CODE.ice:
      return (x + y) % 11 === 0 || (x * 3 - y) % 17 === 0 ? X.iceLight : n < 12 ? X.iceEdge : X.ice
    case CODE.puddle:
      return (y & 7) === 4 && ((x + (y >> 3) * 3) & 7) < 4 ? X.puddleLight : X.puddle
    case CODE.water:
      return (y & 7) === 3 && ((x + (y >> 3) * 5) & 7) < 3 ? C.waterLight : C.water
    case CODE.deck: {
      const plank = x >> 2
      if ((x & 3) === 3) return C.woodDark
      const h = hash2(plank, 1, seed) & 255
      if (h < 36) return C.woodPale
      return h < 120 ? C.woodLight : C.wood
    }
    default: {
      // Rough: big two-tone checker plus a sparse regular scatter of tufts.
      if ((x * 5 + y * 3) % 23 === 0 && n < 140) return C.oliveLight
      return ((x >> 4) + (y >> 4)) & 1 ? C.oliveDark : C.olive
    }
  }
}

const EDGE: Record<number, number> = {
  [CODE.fairway]: C.fairwayEdge,
  [CODE.green]: C.greenEdge,
  [CODE.sand]: C.sandEdge,
  [CODE.water]: C.waterEdge,
  [CODE.ice]: 0,
  [CODE.puddle]: 0,
  [CODE.deck]: C.woodDark,
}

/** The park outside the fence: walkway, then ground. d is the distance past the fence. */
function parkColor(d: number, x: number, y: number, n: number): number {
  const t = activeTheme()
  if (d <= PATH_WIDTH) {
    if (d < 4) return K.pathShade // shadow of the fence
    if (d > PATH_WIDTH - 2) return K.pathEdge // kerb
    switch (t.pathPattern) {
      case 'planks':
        return (x & 3) === 3 ? K.pathEdge : (x >> 2) & 1 ? K.pathA : K.pathB
      case 'neon':
        return d > 10 && d < 13 ? K.pathLight : n < 20 ? K.pathB : K.pathA
      case 'sidewalk':
        return (x & 7) === 0 || (y & 7) === 0 ? K.pathB : n < 12 ? K.pathShade : K.pathA
      default:
        if (n < 18) return K.pathB
        if (n > 240) return K.pathLight
        return ((x >> 3) + (y >> 3)) & 1 ? K.pathA : K.pathB
    }
  }
  switch (t.lawnPattern) {
    case 'grid':
      return (x & 7) === 0 || (y & 7) === 0 ? K.gridLine : n < 4 ? K.lawnTuft : K.lawnA
    case 'asphalt':
      if (n < 5) return K.lawnDark
      if ((x * 3 + y * 7) % 41 === 0 && n < 120) return K.lawnTuft
      return ((x >> 4) + (y >> 4)) & 1 ? K.lawnA : K.lawnB
    case 'sand':
      if (n < 14) return K.lawnDark
      if (n > 236) return K.lawnTuft
      return ((x >> 3) + (y >> 3)) & 1 ? K.lawnA : K.lawnB
    case 'rock':
      if (n < 26) return K.lawnDark
      if ((x * 3 + y * 5) % 17 === 0 && n < 160) return K.lawnTuft
      return ((x >> 2) + (y >> 3)) & 1 ? K.lawnA : K.lawnB
    default:
      if ((x * 7 + y * 11) % 29 === 0 && n < 150) return K.lawnTuft
      if (n < 6) return K.lawnDark
      return ((x >> 3) + (y >> 3)) & 1 ? K.lawnA : K.lawnB
  }
}

/** Fence band: the last 8 world units inside the playable mask. */
function fenceColor(d: number, x: number, y: number): number {
  if (d > -2) return K.fenceDark
  if (d > -5) return ((x >> 2) + (y >> 2)) & 1 ? K.fenceLight : K.fenceMid
  return K.fenceInner
}

function paintTerrain(ctx: Ctx, course: Course, w: number, h: number): void {
  const img = ctx.createImageData(w, h)
  const out = new Uint32Array(img.data.buffer)
  const codes = new Uint8Array(w * h)
  const seed = course.meta.seed
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wx = x * S + S / 2 - VIEW_X
      const wy = y * S + S / 2 - VIEW_Y
      const n = hash2(x, y, seed) & 255
      const d = maskSdf(course, wx, wy)
      if (d > -8) {
        codes[y * w + x] = CODE.outside
        out[y * w + x] = d > 0 ? parkColor(d, x, y, n) : fenceColor(d, x, y)
        continue
      }
      const reg = regionAt(course, wx, wy)
      const code = !reg ? CODE.rough : reg.deck ? CODE.deck : CODE[reg.terrain]
      codes[y * w + x] = code
      out[y * w + x] = terrainColor(code, x, y, n, seed)
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = codes[y * w + x] as number
      if (c === 0 || c >= CODE.outside) continue
      // 2px bold outline where this terrain meets a lower-priority one.
      let lower = false
      for (let d = 1; d <= 2 && !lower; d++) {
        for (const [dx, dy] of [[-d, 0], [d, 0], [0, -d], [0, d]] as const) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const nc = codes[ny * w + nx] as number
          if (nc < c) lower = true
        }
      }
      if (lower) out[y * w + x] = c === CODE.ice ? X.iceEdge : c === CODE.puddle ? X.puddleEdge : (EDGE[c] as number)
    }
  }
  ctx.putImageData(img, 0, 0)
}

function arrowAt(ctx: Ctx, cx: number, cy: number, dx: number, dy: number, len: number, color: string, head: boolean): void {
  ctx.fillStyle = color
  for (let t = -len; t <= len; t++) ctx.fillRect(Math.round(cx + dx * t), Math.round(cy + dy * t), 1, 1)
  if (head) {
    const tx = cx + dx * len
    const ty = cy + dy * len
    for (const k of [-1, -2]) {
      ctx.fillRect(Math.round(tx - dx * 2 + -dy * k), Math.round(ty - dy * 2 + dx * k), 1, 1)
      ctx.fillRect(Math.round(tx - dx * 2 + dy * k), Math.round(ty - dy * 2 - dx * k), 1, 1)
    }
  }
}

/** Hints on the ground: hill chevrons, orange speed-pad arrows and pale gust streaks. */
function paintSlopeHints(ctx: Ctx, course: Course): void {
  for (const z of course.slopes) {
    const b = shapeBounds(z.shape)
    const mag = Math.hypot(z.ax, z.ay) || 1
    const dx = z.ax / mag
    const dy = z.ay / mag
    const kind = z.kind ?? 'slope'
    const step = kind === 'boost' ? 16 : kind === 'gust' ? 24 : 36
    for (let gy = b.y0 + 12; gy < b.y1; gy += step) {
      for (let gx = b.x0 + 12; gx < b.x1; gx += step) {
        if (!insideShape(z.shape, gx, gy)) continue
        const cx = px(gx)
        const cy = px(gy)
        if (kind === 'boost') {
          arrowAt(ctx, cx + 1, cy + 1, dx, dy, 3, 'rgba(60,20,0,0.55)', true)
          arrowAt(ctx, cx, cy, dx, dy, 3, '#ff9a2a', true)
        } else if (kind === 'gust') {
          arrowAt(ctx, cx, cy, dx, dy, 4, 'rgba(255,255,255,0.5)', false)
          arrowAt(ctx, cx + Math.round(-dy * 3), cy + Math.round(dx * 3), dx, dy, 2, 'rgba(255,255,255,0.3)', false)
        } else {
          const horiz = Math.abs(z.ax) > Math.abs(z.ay)
          arrowAt(ctx, cx, cy, horiz ? Math.sign(z.ax) : 0, horiz ? 0 : Math.sign(z.ay), 2, 'rgba(20,40,20,0.28)', true)
        }
      }
    }
  }
}

// ---------------------------------------------------------------- walls

function strokeCapsule(ctx: Ctx, s: Extract<Shape, { t: 'capsule' }>, r: number, color: string, ox = 0, oy = 0): void {
  const x1 = px(s.x1)
  const y1 = px(s.y1)
  const x2 = px(s.x2)
  const y2 = px(s.y2)
  const n = Math.max(1, Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)))
  for (let i = 0; i <= n; i++) {
    disc(ctx, Math.round(x1 + ((x2 - x1) * i) / n) + ox, Math.round(y1 + ((y2 - y1) * i) / n) + oy, r, color)
  }
}

function drawWoodRect(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number): void {
  rectPx(ctx, x - 1, y - 1, w + 2, h + 2, PAL.woodDark)
  const horiz = w >= h
  const len = horiz ? w : h
  for (let t = 0; t < len; t += 10) {
    const seg = Math.min(10, len - t)
    const hh = hash2(t, x + y, seed) & 255
    const base = hh < 70 ? PAL.woodLight : hh < 190 ? PAL.wood : PAL.woodPale
    const jitter = hh > 235 ? 1 : 0 // a crooked board
    if (horiz) {
      rectPx(ctx, x + t, y + jitter, seg, h - jitter, base)
      rectPx(ctx, x + t, y + jitter, seg, 1, PAL.woodPale)
      rectPx(ctx, x + t, y + h - 1, seg, 1, PAL.woodDark)
      rectPx(ctx, x + t + seg - 1, y, 1, h, PAL.woodDark)
      if (h >= 4) rectPx(ctx, x + t + 1, y + 1 + jitter, 1, 1, PAL.cream)
    } else {
      rectPx(ctx, x + jitter, y + t, w - jitter, seg, base)
      rectPx(ctx, x + jitter, y + t, 1, seg, PAL.woodPale)
      rectPx(ctx, x + w - 1, y + t, 1, seg, PAL.woodDark)
      rectPx(ctx, x, y + t + seg - 1, w, 1, PAL.woodDark)
      if (w >= 4) rectPx(ctx, x + 1 + jitter, y + t + 1, 1, 1, PAL.cream)
    }
  }
}

function drawHedge(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number): void {
  rectPx(ctx, x, y, w, h, '#17381f')
  for (let j = 1; j < h - 1; j++) {
    for (let i = 1; i < w - 1; i++) {
      const n = hash2(x + i, y + j, seed) & 255
      ctx.fillStyle = n < 60 ? '#2f6b3a' : n < 80 ? '#3f8a45' : PAL.forest
      ctx.fillRect(x + i, y + j, 1, 1)
    }
  }
}

function drawWall(ctx: Ctx, wall: Wall, seed: number): void {
  const s = wall.shape
  if (s.t === 'circle') {
    const cx = px(s.x)
    const cy = px(s.y)
    const r = Math.round(s.r / S)
    if (wall.style === 'bouncer') {
      disc(ctx, cx, cy, r, PAL.charcoal)
      disc(ctx, cx, cy, r - 1, '#f2c94c')
      disc(ctx, cx, cy, r - 2, '#d83a2a')
      disc(ctx, cx, cy, Math.max(1, r - 4), '#ff8a6a')
      rectPx(ctx, cx - 1, cy - 2, 2, 1, PAL.white)
      for (const [dx, dy] of [[-r, 0], [r - 1, 0], [0, -r], [0, r - 1]] as const) rectPx(ctx, cx + dx, cy + dy, 1, 1, '#fff')
      return
    }
    disc(ctx, cx, cy, r, PAL.charcoal)
    disc(ctx, cx, cy, r - 1, '#4a4a52')
    disc(ctx, cx, cy, Math.max(1, r - 3), PAL.charcoal)
    rectPx(ctx, cx - r + 2, cy - r + 1, 2, 1, PAL.grey)
    return
  }
  if (s.t === 'capsule') {
    const r = Math.max(1, Math.round(s.r / S))
    strokeCapsule(ctx, s, r + 1, PAL.woodDark)
    strokeCapsule(ctx, s, r, PAL.wood)
    strokeCapsule(ctx, s, Math.max(0, r - 1), PAL.woodLight, 0, -0)
    return
  }
  const x = px(s.x)
  const y = px(s.y)
  const w = px(s.x + s.w) - x
  const h = px(s.y + s.h) - y
  switch (wall.style) {
    case 'hedge':
      drawHedge(ctx, x, y, w, h, seed)
      break
    default:
      // Upright landmark sprites are drawn in the sprite layer, not here.
      if (LANDMARKS.has(wall.style)) break
      drawWoodRect(ctx, x, y, w, h, seed)
  }
}

/** `off` is the shadow offset in art pixels (it turns with the board so light always falls down-right on screen). */
function drawShadow(ctx: Ctx, s: Shape, off: readonly [number, number]): void {
  ctx.fillStyle = 'rgba(15,30,15,0.35)'
  if (s.t === 'rect') {
    ctx.fillRect(px(s.x) + off[0], px(s.y) + off[1], px(s.x + s.w) - px(s.x), px(s.y + s.h) - px(s.y))
  } else if (s.t === 'circle') {
    disc(ctx, px(s.x) + off[0], px(s.y) + off[1], Math.round(s.r / S), 'rgba(15,30,15,0.35)')
  } else {
    strokeCapsule(ctx, s, Math.max(1, Math.round(s.r / S)), 'rgba(15,30,15,0.35)', off[0], off[1])
  }
}

const LANDMARKS = new Set(['clown', 'castle', 'hull', 'windmill'])

// ---------------------------------------------------------------- entry point

export interface Layers {
  /** Terrain, fence, walkway, boards, hedges, tires, slope hints. Drawn in world orientation (rotates with the board). */
  ground: HTMLCanvasElement
  /** Props and landmarks: always upright on screen. Its size follows the screen orientation. */
  sprites: HTMLCanvasElement
}

/** Art-pixel position in the world-oriented buffer -> position in the screen-oriented buffer. */
export function mapArt(ax: number, ay: number, rotated: boolean): { x: number; y: number } {
  return rotated ? { x: VIEW_H / S - ay, y: ax } : { x: ax, y: ay }
}

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d') as Ctx
  ctx.imageSmoothingEnabled = false
  return { canvas, ctx }
}

/**
 * Pre-render everything that never moves. When `rotated` the board is shown a quarter turn clockwise (phones in
 * portrait): the ground layer stays in world orientation and is rotated when blitted, while sprites are drawn
 * upright at their rotated positions so people, trees and buildings never lie on their side.
 */
export function renderLayers(course: Course, rotated: boolean): Layers {
  applyTheme(course.meta.season)
  const w = VIEW_W / S
  const h = VIEW_H / S
  const seed = course.meta.seed
  const g = makeCanvas(w, h)
  const ctx = g.ctx

  paintTerrain(ctx, course, w, h)
  ctx.save()
  ctx.translate(VIEW_X / S, VIEW_Y / S)
  paintSlopeHints(ctx, course)
  const off: readonly [number, number] = rotated ? [2, -1] : [1, 2]
  for (const wall of course.walls) drawShadow(ctx, wall.shape, off)
  for (const wall of course.walls) drawWall(ctx, wall, seed)
  for (const pt of course.portals) {
    for (const e of [pt.a, pt.b]) {
      disc(ctx, px(e.x), px(e.y), 7, PAL.coral)
      disc(ctx, px(e.x), px(e.y), 6, PAL.charcoal)
      disc(ctx, px(e.x), px(e.y), 3, '#000000')
    }
  }
  ctx.restore()

  // Upright sprites, depth-sorted by their on-screen y.
  const sw = rotated ? h : w
  const sh = rotated ? w : h
  const sp = makeCanvas(sw, sh)
  const items: { y: number; draw: () => void }[] = []
  const ox = VIEW_X / S
  const oy = VIEW_Y / S
  for (const pr of course.props) {
    const m = mapArt(px(pr.x) + ox, px(pr.y) + oy, rotated)
    items.push({ y: m.y, draw: () => drawProp(sp.ctx, pr.kind, pr.variant, m.x, m.y) })
  }
  for (const wall of course.walls) {
    const s = wall.shape
    if (s.t !== 'rect' || !LANDMARKS.has(wall.style)) continue
    const x = px(s.x)
    const y = px(s.y)
    const ww = px(s.x + s.w) - x
    const hh = px(s.y + s.h) - y
    const m = mapArt(x + Math.floor(ww / 2) + ox, y + hh + oy, rotated)
    items.push({ y: m.y, draw: () => drawLandmark(sp.ctx, wall.style, m.x - Math.floor(ww / 2), m.y - hh, ww, hh) })
  }
  items.sort((a, b) => a.y - b.y)
  for (const it of items) it.draw()
  return { ground: g.canvas, sprites: sp.canvas }
}
