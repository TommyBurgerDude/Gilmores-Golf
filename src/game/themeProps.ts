import { hash2 } from './palette'
import { activeTheme } from './seasons'

type Ctx = CanvasRenderingContext2D

const R = (ctx: Ctx, x: number, y: number, w: number, h: number, c: string) => {
  ctx.fillStyle = c
  ctx.fillRect(x, y, w, h)
}
function D(ctx: Ctx, cx: number, cy: number, r: number, c: string): void {
  ctx.fillStyle = c
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r + r * 0.6 - dy * dy))
    ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1)
  }
}
function E(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, c: string): void {
  ctx.fillStyle = c
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.5))))
    ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1)
  }
}
const SHADOW = 'rgba(10,30,10,0.32)'
const K = '#1f1a1a'

function glow(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function deadtree(ctx: Ctx, x: number, y: number, v: number): void {
  E(ctx, x + 2, y, 8, 3, SHADOW)
  R(ctx, x - 2, y - 18, 5, 18, K)
  R(ctx, x - 1, y - 18, 3, 18, '#5a4a3c')
  R(ctx, x + 1, y - 18, 1, 18, '#3a2e24')
  for (let t = 0; t < 7; t++) {
    R(ctx, x - 3 - t, y - 15 - t, 3, 2, K)
    R(ctx, x - 3 - t, y - 15 - t, 2, 1, '#5a4a3c')
    R(ctx, x + 3 + t, y - 11 - t - (v % 2), 3, 2, K)
    R(ctx, x + 3 + t, y - 11 - t - (v % 2), 2, 1, '#5a4a3c')
  }
  R(ctx, x - 10, y - 24, 2, 3, '#5a4a3c')
  R(ctx, x + 9, y - 20, 2, 3, '#5a4a3c')
  R(ctx, x - 1, y - 22, 2, 4, '#5a4a3c')
}

function rubble(ctx: Ctx, x: number, y: number, v: number): void {
  E(ctx, x + 2, y, 10, 3, SHADOW)
  E(ctx, x, y - 3, 9, 4, K)
  E(ctx, x, y - 3, 8, 3, '#4a463e')
  R(ctx, x - 6, y - 7, 5, 4, K)
  R(ctx, x - 5, y - 6, 3, 2, '#8a867a')
  R(ctx, x + 1, y - 8, 6, 5, K)
  R(ctx, x + 2, y - 7, 4, 3, '#7a766c')
  R(ctx, x + 4 - (v % 2) * 6, y - 14, 1, 7, '#8a4a2a')
}

function barrel(ctx: Ctx, x: number, y: number, v: number): void {
  E(ctx, x + 1, y, 5, 2, SHADOW)
  R(ctx, x - 4, y - 9, 9, 9, K)
  R(ctx, x - 3, y - 8, 7, 7, v % 2 ? '#3a8a3a' : '#9a4a2a')
  R(ctx, x - 3, y - 6, 7, 1, '#4a4a52')
  R(ctx, x - 3, y - 3, 7, 1, '#4a4a52')
  R(ctx, x - 1, y - 8, 1, 7, v % 2 ? '#5ab85a' : '#c46a42')
  R(ctx, x, y - 5, 2, 2, '#f2c94c')
}

function crate(ctx: Ctx, x: number, y: number): void {
  E(ctx, x + 1, y, 6, 2, SHADOW)
  R(ctx, x - 5, y - 9, 11, 9, K)
  R(ctx, x - 4, y - 8, 9, 7, '#a8784a')
  R(ctx, x - 4, y - 8, 9, 1, '#c49a64')
  for (let i = 0; i < 7; i++) {
    R(ctx, x - 4 + i, y - 8 + i, 1, 1, '#6b4423')
    R(ctx, x + 4 - i, y - 8 + i, 1, 1, '#6b4423')
  }
}

function palm(ctx: Ctx, x: number, y: number, v: number): void {
  E(ctx, x + 4, y, 9, 3, SHADOW)
  for (let i = 0; i < 18; i++) {
    const cx = x + Math.round(Math.sin(i / 7 + v) * 2)
    R(ctx, cx - 1, y - i, 4, 1, K)
    R(ctx, cx, y - i, 2, 1, i % 3 === 0 ? '#6a4424' : '#9a6a3a')
  }
  const tx = x + Math.round(Math.sin(18 / 7 + v) * 2)
  const ty = y - 18
  const leaf = (dx: number, dy: number) => {
    for (let t = 1; t <= 10; t++) {
      const px = tx + Math.round(dx * t)
      const py = ty + Math.round(dy * t + (t * t) / 28)
      R(ctx, px - 1, py - 1, 3, 3, K)
    }
    for (let t = 1; t <= 10; t++) {
      const px = tx + Math.round(dx * t)
      const py = ty + Math.round(dy * t + (t * t) / 28)
      R(ctx, px, py, 2, 2, t % 3 ? '#2a9a3a' : '#5ad060')
    }
  }
  for (const [dx, dy] of [[-1, -0.3], [1, -0.3], [-0.8, -0.7], [0.8, -0.7], [0, -0.9], [-1, 0.1], [1, 0.1]] as const) leaf(dx, dy)
  D(ctx, tx, ty + 1, 2, '#6a4424')
}

const UMB = ['#ff6b4a', '#2e86c1', '#f2c94c', '#2ec4a8']
function umbrella(ctx: Ctx, x: number, y: number, v: number): void {
  E(ctx, x + 5, y, 10, 3, SHADOW)
  R(ctx, x, y - 16, 1, 16, '#f4e9c8')
  for (let dy = -6; dy <= 0; dy++) {
    const w = Math.floor(11 * Math.sqrt(1 - (dy * dy) / 49))
    for (let i = -w; i <= w; i++) R(ctx, x + i, y - 17 + dy, 1, 1, ((i + 12) >> 2) & 1 ? '#ffffff' : (UMB[v % 4] as string))
  }
  R(ctx, x - 11, y - 17, 23, 1, K)
}

const TOWEL = ['#ff6b4a', '#2e86c1', '#f2c94c', '#9a5ac0']
function towel(ctx: Ctx, x: number, y: number, v: number): void {
  R(ctx, x - 7, y - 4, 14, 6, K)
  R(ctx, x - 6, y - 3, 12, 4, TOWEL[v % 4] as string)
  for (let i = -5; i < 6; i += 3) R(ctx, x + i, y - 3, 1, 4, '#ffffff')
}

function sandcastle(ctx: Ctx, x: number, y: number): void {
  E(ctx, x + 1, y, 9, 2, SHADOW)
  R(ctx, x - 7, y - 6, 15, 6, '#8a7040')
  R(ctx, x - 6, y - 5, 13, 5, '#dcc080')
  for (const dx of [-6, 3]) {
    R(ctx, x + dx, y - 12, 4, 7, '#8a7040')
    R(ctx, x + dx + 1, y - 11, 2, 6, '#e8d090')
  }
  R(ctx, x - 2, y - 10, 4, 5, '#8a7040')
  R(ctx, x - 1, y - 9, 2, 4, '#e8d090')
  R(ctx, x, y - 15, 1, 5, '#2a2a2e')
  R(ctx, x + 1, y - 15, 3, 2, '#ff6b4a')
}

function boulder(ctx: Ctx, x: number, y: number, v: number): void {
  const t = activeTheme()
  E(ctx, x + 2, y, 12, 3, SHADOW)
  E(ctx, x, y - 6, 11, 8, t.rock[0])
  E(ctx, x, y - 6, 10, 7, v % 2 ? t.rock[1] : '#6a6a74')
  E(ctx, x - 3, y - 9, 5, 3, t.rock[2])
  R(ctx, x + 2, y - 5, 5, 1, '#4a4a54')
  R(ctx, x - 4, y - 3, 3, 1, '#4a4a54')
  if (t.snowCap) E(ctx, x, y - 12, 6, 2, '#ffffff')
}

function log(ctx: Ctx, x: number, y: number): void {
  E(ctx, x + 1, y, 11, 2, SHADOW)
  R(ctx, x - 10, y - 6, 20, 6, K)
  R(ctx, x - 9, y - 5, 18, 4, '#7a5230')
  R(ctx, x - 9, y - 5, 18, 1, '#9a6a3a')
  for (let i = -6; i < 8; i += 5) R(ctx, x + i, y - 4, 1, 3, '#5a3a1c')
  D(ctx, x - 10, y - 3, 3, K)
  D(ctx, x - 10, y - 3, 2, '#c49a64')
  D(ctx, x - 10, y - 3, 1, '#9a6a3a')
  R(ctx, x + 2, y - 7, 5, 2, '#3a8a3a')
}

function mushroom(ctx: Ctx, x: number, y: number, v: number): void {
  const cap = ['#d83a2a', '#a8784a', '#4ae0d0'][v % 3] as string
  E(ctx, x + 1, y, 5, 1, SHADOW)
  R(ctx, x - 1, y - 5, 3, 5, K)
  R(ctx, x, y - 5, 1, 5, '#f4e9c8')
  E(ctx, x, y - 6, 5, 3, K)
  E(ctx, x, y - 6, 4, 2, cap)
  R(ctx, x - 2, y - 7, 1, 1, '#ffffff')
  R(ctx, x + 1, y - 6, 1, 1, '#ffffff')
  if (v % 3 === 2) glow(ctx, x, y - 6, 8, 'rgba(74,224,208,0.2)')
}

const TENT = ['#d9603a', '#3a8ad0', '#e8c33a']
function tent(ctx: Ctx, x: number, y: number, v: number): void {
  E(ctx, x + 2, y, 14, 3, SHADOW)
  const c = TENT[v % 3] as string
  for (let r = 0; r < 14; r++) {
    const half = Math.round(r * 0.95) + 1
    R(ctx, x - half - 1, y - 14 + r, half * 2 + 3, 1, K)
    R(ctx, x - half, y - 14 + r, half * 2 + 1, 1, c)
    R(ctx, x + half - Math.floor(half / 3), y - 14 + r, Math.floor(half / 3) + 1, 1, '#00000033')
  }
  for (let r = 4; r < 14; r++) R(ctx, x - Math.floor((r - 3) / 2), y - 14 + r, Math.floor((r - 3) / 2) * 2 + 1, 1, '#2a1a10')
  R(ctx, x, y - 17, 1, 4, '#8a5e35')
  R(ctx, x + 1, y - 17, 3, 2, '#ff6b4a')
}

function campfire(ctx: Ctx, x: number, y: number): void {
  glow(ctx, x, y - 4, 14, 'rgba(255,150,50,0.22)')
  for (const [dx, a] of [[-4, 0], [3, 1]] as const) R(ctx, x + dx - 2, y - 3 + a, 6, 2, '#4a2f1b')
  R(ctx, x - 2, y - 8, 5, 6, '#e8601a')
  R(ctx, x - 1, y - 10, 3, 6, '#f2a02a')
  R(ctx, x, y - 11, 1, 4, '#fff0a0')
  for (const dx of [-5, 5]) D(ctx, x + dx, y - 1, 1, '#6a6a70')
}

function building(ctx: Ctx, x: number, y: number, v: number): void {
  const t = activeTheme()
  const cyber = t.label === 'Cyberpunk'
  const w = 30
  const h = 46 + (v % 3) * 12
  const body = cyber ? ['#1a1430', '#241c44', '#120e28'][v % 3] : ['#8a8e98', '#b0614a', '#6a7a9a'][v % 3]
  const side = cyber ? '#0e0a22' : '#00000033'
  E(ctx, x + 6, y, 18, 3, SHADOW)
  R(ctx, x - 16, y - h - 1, w + 2, h + 1, K)
  R(ctx, x - 15, y - h, w, h, body as string)
  R(ctx, x + 8, y - h, 7, h, side)
  R(ctx, x - 15, y - h, w, 2, cyber ? '#ff2d95' : '#d0d4dc')
  for (let wy = y - h + 5; wy < y - 8; wy += 6) {
    for (let wx = x - 12; wx < x + 12; wx += 6) {
      const lit = hash2(wx, wy, v) % 100 < 45
      R(ctx, wx, wy, 3, 3, lit ? (cyber ? (hash2(wx, wy, 3) & 1 ? '#40e0ff' : '#ff2d95') : '#f8e08a') : cyber ? '#0a0818' : '#3a4452')
    }
  }
  R(ctx, x - 3, y - 8, 6, 8, '#1a1a22')
  if (cyber) {
    glow(ctx, x, y - h / 2, 22, 'rgba(255,45,149,0.1)')
    R(ctx, x - 15, y - h, 1, h, '#40e0ff')
  } else {
    R(ctx, x + 4, y - h - 6, 1, 6, '#4a4a56')
    R(ctx, x + 2, y - h - 4, 5, 1, '#4a4a56')
  }
}

function planter(ctx: Ctx, x: number, y: number): void {
  const cyber = activeTheme().label === 'Cyberpunk'
  R(ctx, x - 6, y - 5, 12, 5, K)
  R(ctx, x - 5, y - 4, 10, 4, cyber ? '#3a2a6a' : '#7a5030')
  D(ctx, x, y - 9, 5, K)
  D(ctx, x, y - 9, 4, cyber ? '#c02ad0' : '#2c7a33')
  D(ctx, x - 1, y - 10, 2, cyber ? '#ff5ae8' : '#6cc65c')
}

function hydrant(ctx: Ctx, x: number, y: number): void {
  R(ctx, x - 3, y - 8, 7, 8, K)
  R(ctx, x - 2, y - 7, 5, 7, '#d83a2a')
  R(ctx, x - 4, y - 5, 9, 2, '#d83a2a')
  R(ctx, x - 3, y - 10, 7, 3, K)
  R(ctx, x - 2, y - 9, 5, 2, '#f05a4a')
}

function busstop(ctx: Ctx, x: number, y: number): void {
  R(ctx, x - 13, y - 1, 28, 3, SHADOW)
  R(ctx, x - 12, y - 18, 26, 4, K)
  R(ctx, x - 11, y - 17, 24, 2, '#4a4a56')
  R(ctx, x - 12, y - 14, 2, 14, '#2a2a30')
  R(ctx, x + 12, y - 14, 2, 14, '#2a2a30')
  R(ctx, x - 10, y - 14, 22, 9, '#8ec9e0')
  R(ctx, x - 10, y - 14, 8, 2, '#c5e6f2')
  R(ctx, x - 8, y - 6, 16, 2, '#6b4423')
  R(ctx, x + 15, y - 22, 1, 22, '#2a2a30')
  R(ctx, x + 12, y - 26, 8, 5, '#2e86c1')
  R(ctx, x + 14, y - 24, 4, 1, '#ffffff')
}

const NEON = ['#ff2d95', '#40e0ff', '#a050ff']
function neonsign(ctx: Ctx, x: number, y: number, v: number): void {
  const c = NEON[v % 3] as string
  glow(ctx, x, y - 12, 12, v % 3 === 1 ? 'rgba(64,224,255,0.18)' : 'rgba(255,45,149,0.18)')
  R(ctx, x, y - 6, 1, 6, '#2a2a2e')
  R(ctx, x - 7, y - 17, 15, 11, K)
  R(ctx, x - 6, y - 16, 13, 9, '#0a0818')
  R(ctx, x - 6, y - 16, 13, 1, c)
  R(ctx, x - 6, y - 8, 13, 1, c)
  R(ctx, x - 6, y - 16, 1, 9, c)
  R(ctx, x + 6, y - 16, 1, 9, c)
  R(ctx, x - 3, y - 14, 7, 1, '#ffffff')
  R(ctx, x - 3, y - 12, 4, 1, c)
  R(ctx, x - 3, y - 10, 6, 1, c)
}

function antenna(ctx: Ctx, x: number, y: number): void {
  E(ctx, x + 1, y, 5, 2, SHADOW)
  R(ctx, x - 3, y - 4, 7, 4, K)
  R(ctx, x - 2, y - 3, 5, 3, '#3a3a50')
  R(ctx, x, y - 42, 2, 38, '#2a2a30')
  for (const [dy, w] of [[-34, 6], [-26, 8], [-18, 10]] as const) R(ctx, x + 1 - w / 2, y + dy, w, 1, '#6a6a80')
  R(ctx, x, y - 45, 2, 3, '#ff2d2d')
  glow(ctx, x + 1, y - 44, 5, 'rgba(255,45,45,0.3)')
}

function hologram(ctx: Ctx, x: number, y: number, v: number): void {
  const c = v % 2 ? '64,224,255' : '255,45,149'
  R(ctx, x - 5, y - 3, 10, 3, K)
  R(ctx, x - 4, y - 2, 8, 2, '#3a3a5a')
  ctx.fillStyle = `rgba(${c},0.18)`
  ctx.beginPath()
  ctx.moveTo(x - 3, y - 3)
  ctx.lineTo(x - 9, y - 26)
  ctx.lineTo(x + 9, y - 26)
  ctx.lineTo(x + 3, y - 3)
  ctx.fill()
  D(ctx, x, y - 20, 4, `rgba(${c},0.55)`)
  R(ctx, x - 3, y - 15, 7, 8, `rgba(${c},0.45)`)
  for (let ly = y - 26; ly < y - 4; ly += 3) R(ctx, x - 9, ly, 18, 1, `rgba(${c},0.12)`)
}

/** Theme-specific props. Returns true when handled. (x, y) = bottom centre in art pixels. */
export function drawThemeProp(ctx: Ctx, kind: string, variant: number, x: number, y: number): boolean {
  switch (kind) {
    case 'deadtree':
      deadtree(ctx, x, y, variant)
      return true
    case 'rubble':
      rubble(ctx, x, y, variant)
      return true
    case 'barrel':
      barrel(ctx, x, y, variant)
      return true
    case 'crate':
      crate(ctx, x, y)
      return true
    case 'palm':
      palm(ctx, x, y, variant)
      return true
    case 'umbrella':
      umbrella(ctx, x, y, variant)
      return true
    case 'towel':
      towel(ctx, x, y, variant)
      return true
    case 'sandcastle':
      sandcastle(ctx, x, y)
      return true
    case 'boulder':
      boulder(ctx, x, y, variant)
      return true
    case 'log':
      log(ctx, x, y)
      return true
    case 'mushroom':
      mushroom(ctx, x, y, variant)
      return true
    case 'tent':
      tent(ctx, x, y, variant)
      return true
    case 'campfire':
      campfire(ctx, x, y)
      return true
    case 'building':
      building(ctx, x, y, variant)
      return true
    case 'planter':
      planter(ctx, x, y)
      return true
    case 'hydrant':
      hydrant(ctx, x, y)
      return true
    case 'busstop':
      busstop(ctx, x, y)
      return true
    case 'neonsign':
      neonsign(ctx, x, y, variant)
      return true
    case 'antenna':
      antenna(ctx, x, y)
      return true
    case 'hologram':
      hologram(ctx, x, y, variant)
      return true
    default:
      return false
  }
}
