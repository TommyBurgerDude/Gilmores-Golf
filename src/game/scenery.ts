import { activeTheme } from './seasons'
import { drawText } from './sprites'
import { drawThemeProp } from './themeProps'

type Ctx = CanvasRenderingContext2D

export const R = (ctx: Ctx, x: number, y: number, w: number, h: number, c: string) => {
  ctx.fillStyle = c
  ctx.fillRect(x, y, w, h)
}

export function D(ctx: Ctx, cx: number, cy: number, r: number, c: string): void {
  ctx.fillStyle = c
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r + r * 0.6 - dy * dy))
    ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1)
  }
}

export function E(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, c: string): void {
  ctx.fillStyle = c
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry + 0.5))))
    ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1)
  }
}

const SHADOW = 'rgba(10,30,10,0.32)'


function oak(ctx: Ctx, x: number, y: number, v: number): void {
  const list = activeTheme().oak
  const p = list[v % list.length] as readonly string[]
  E(ctx, x + 3, y, 10, 3, SHADOW)
  R(ctx, x - 2, y - 8, 5, 8, '#2a1a10')
  R(ctx, x - 1, y - 8, 3, 8, '#7a4f2a')
  R(ctx, x + 1, y - 8, 1, 8, '#4a2f1b')
  R(ctx, x - 3, y - 1, 7, 1, '#2a1a10')
  D(ctx, x, y - 16, 11, p[0] as string)
  D(ctx, x, y - 16, 10, p[1] as string)
  D(ctx, x + 3, y - 12, 6, p[4] as string)
  D(ctx, x - 2, y - 18, 7, p[2] as string)
  D(ctx, x - 4, y - 20, 3, p[3] as string)
  for (const [dx, dy] of [[-6, -14], [4, -20], [6, -16], [-1, -23], [-7, -18]] as const) R(ctx, x + dx, y + dy, 2, 1, p[3] as string)
}

function pine(ctx: Ctx, x: number, y: number): void {
  E(ctx, x + 3, y, 8, 3, SHADOW)
  R(ctx, x - 1, y - 6, 3, 6, '#2a1a10')
  R(ctx, x, y - 6, 1, 6, '#6b4423')
  for (let i = 0; i < 3; i++) {
    const top = y - 28 + i * 8
    const half0 = 7 + i * 3
    const hgt = 14
    for (let row = 0; row < hgt; row++) {
      const half = Math.max(1, Math.round((half0 * (row + 1)) / hgt))
      const pc = activeTheme().pine
      const capped = activeTheme().snowCap && row < 5 + i
      R(ctx, x - half - 1, top + row, half * 2 + 3, 1, pc[0])
      R(ctx, x - half, top + row, half * 2 + 1, 1, capped ? '#f4f8fb' : pc[1])
      R(ctx, x - half, top + row, Math.max(1, Math.floor(half / 2)), 1, capped ? '#ffffff' : pc[2])
      R(ctx, x + half - Math.floor(half / 3), top + row, Math.floor(half / 3) + 1, 1, capped ? '#c4d4e0' : pc[3])
    }
  }
}

function bush(ctx: Ctx, x: number, y: number, v: number): void {
  E(ctx, x + 2, y, 6, 2, SHADOW)
  const bc = activeTheme().bush
  D(ctx, x, y - 4, 6, bc[0])
  D(ctx, x, y - 4, 5, bc[1])
  D(ctx, x + 2, y - 3, 3, bc[0])
  D(ctx, x - 1, y - 6, 2, bc[2])
  if (v % 2 && activeTheme().flowers) for (const [dx, dy] of [[-3, -3], [2, -6], [3, -2]] as const) R(ctx, x + dx, y + dy, 1, 1, '#ff6b4a')
}

function rock(ctx: Ctx, x: number, y: number, v: number): void {
  E(ctx, x + 2, y, 7, 2, SHADOW)
  const rc = activeTheme().rock
  E(ctx, x, y - 3, 6, 4, rc[0])
  E(ctx, x, y - 3, 5, 3, v % 2 ? rc[1] : rc[1])
  E(ctx, x - 1, y - 4, 3, 1, rc[2])
  R(ctx, x + 2, y - 2, 3, 1, '#6a6a70')
}

function clubhouse(ctx: Ctx, x: number, y: number): void {
  const th = activeTheme()
  const cb = th.club
  const cyber = th.label === 'Cyberpunk'
  const ruined = th.label === 'Apocalypse'
  R(ctx, x - 28, y - 1, 66, 4, SHADOW)
  // walls
  R(ctx, x - 28, y - 21, 56, 21, '#1f1a1a')
  R(ctx, x - 27, y - 20, 54, 19, cb.wall)
  for (let i = -27; i < 27; i += 4) R(ctx, x + i, y - 20, 1, 19, cb.line)
  R(ctx, x - 27, y - 3, 54, 2, '#c9b57f')
  R(ctx, x + 8, y - 15, 5, 4, '#d9c48c')
  R(ctx, x + 9, y - 13, 2, 2, '#8a5e35')
  // door
  R(ctx, x - 5, y - 15, 10, 15, '#1f1a1a')
  R(ctx, x - 4, y - 14, 8, 14, cb.door)
  R(ctx, x - 3, y - 12, 3, 5, cb.line)
  R(ctx, x + 1, y - 12, 3, 5, cb.line)
  R(ctx, x + 2, y - 6, 1, 1, '#f2c94c')
  // windows with flower boxes
  for (const wx of [-22, 14]) {
    R(ctx, wx + x, y - 16, 9, 9, '#1f1a1a')
    R(ctx, wx + x + 1, y - 15, 7, 7, '#8ec9e0')
    R(ctx, wx + x + 1, y - 15, 3, 2, '#c5e6f2')
    R(ctx, wx + x + 4, y - 15, 1, 7, '#1f1a1a')
    R(ctx, wx + x + 1, y - 12, 7, 1, '#1f1a1a')
    R(ctx, wx + x - 1, y - 7, 11, 3, '#6b4423')
    for (const fx of [0, 3, 6, 9]) R(ctx, wx + x + fx, y - 8, 1, 1, fx % 2 ? '#ff6b4a' : '#f2c94c')
  }
  // roof
  for (let row = 0; row < 20; row++) {
    const half = 20 + Math.round((row * 12) / 19)
    R(ctx, x - half - 1, y - 41 + row, half * 2 + 3, 1, cyber ? '#ffd0f0' : '#2a1a10')
    R(ctx, x - half, y - 41 + row, half * 2 + 1, 1, row % 4 < 2 ? cb.roof : cb.roofDark)
    if (row % 4 === 1) for (let i = -half + 2; i < half; i += 5) R(ctx, x + i, y - 41 + row, 2, 1, '#cf5a3c')
  }
  R(ctx, x - 12, y - 36, 6, 3, '#2a1a10') // missing shingles
  R(ctx, x + 8, y - 30, 5, 2, '#2a1a10')
  if (ruined) {
    for (const [dx, dy, w] of [[-4, -38, 8], [-22, -32, 6], [14, -34, 7], [2, -28, 6]] as const) R(ctx, x + dx, y + dy, w, 3, '#1a1410')
    for (const wx of [-22, 14]) {
      R(ctx, wx + x, y - 14, 9, 2, '#6a4a2a')
      R(ctx, wx + x, y - 10, 9, 2, '#5a3a1c')
    }
  }
  if (cyber) {
    ctx.fillStyle = 'rgba(255,45,149,0.18)'
    ctx.beginPath()
    ctx.arc(x, y - 22, 40, 0, Math.PI * 2)
    ctx.fill()
    R(ctx, x - 28, y - 21, 56, 1, '#40e0ff')
  }
  // chimney and flag
  R(ctx, x + 13, y - 47, 6, 9, '#1f1a1a')
  R(ctx, x + 14, y - 46, 4, 8, '#8a5e35')
  R(ctx, x - 24, y - 52, 1, 12, '#2a2a2e')
  R(ctx, x - 23, y - 52, 6, 3, '#ff6b4a')
  // sign (hangs a little crooked)
  R(ctx, x - 23, y - 36, 47, 12, '#1f1a1a')
  R(ctx, x - 22, y - 35, 45, 10, cyber ? '#0a0818' : ruined ? '#a89878' : '#f4e9c8')
  R(ctx, x + 12, y - 25, 11, 1, '#c9b57f')
  drawText(ctx, "GILMORE'S", x - 18, y - 33, cb.sign)
  R(ctx, x - 22, y - 26, 45, 1, '#e0cf9e')
}

function stand(ctx: Ctx, x: number, y: number, v: number): void {
  R(ctx, x - 13, y - 1, 30, 3, SHADOW)
  R(ctx, x - 12, y - 15, 24, 15, '#1f1a1a')
  R(ctx, x - 11, y - 14, 22, 13, '#6b4423')
  R(ctx, x - 11, y - 9, 22, 8, '#8a5e35')
  R(ctx, x - 11, y - 9, 22, 2, '#c49a64')
  R(ctx, x - 6, y - 11, 3, 2, '#f2c94c')
  R(ctx, x + 3, y - 11, 4, 2, v % 2 ? '#ff6b4a' : '#7ad0f0')
  for (let i = -13; i < 13; i++) {
    const aw = activeTheme().awning
    const c = Math.floor((i + 13) / 3) % 2 ? aw[1] : aw[0]
    R(ctx, x + i, y - 22, 1, 7, c)
    if (Math.floor((i + 13) / 3) % 2 === 0) R(ctx, x + i, y - 15, 1, 1, c)
  }
  R(ctx, x - 13, y - 23, 26, 1, '#1f1a1a')
  R(ctx, x + 14, y - 13, 7, 9, '#1f1a1a')
  R(ctx, x + 15, y - 12, 5, 7, '#2a3a2a')
  R(ctx, x + 16, y - 11, 3, 1, '#f4e9c8')
  R(ctx, x + 16, y - 9, 2, 1, '#f4e9c8')
  R(ctx, x + 17, y - 4, 1, 4, '#4a2f1b')
}

function car(ctx: Ctx, x: number, y: number, v: number): void {
  const cl = activeTheme().carColors
  const c = cl[v % cl.length] as string
  E(ctx, x + 1, y, 17, 3, SHADOW)
  R(ctx, x - 16, y - 11, 32, 10, '#1a1a1a')
  R(ctx, x - 13, y - 16, 24, 6, '#1a1a1a')
  R(ctx, x - 15, y - 10, 30, 8, c)
  R(ctx, x - 12, y - 15, 22, 6, c)
  R(ctx, x - 10, y - 14, 9, 4, '#9fd4e8')
  R(ctx, x + 1, y - 14, 8, 4, '#9fd4e8')
  R(ctx, x - 15, y - 10, 30, 1, '#ffffff55')
  R(ctx, x + 14, y - 8, 2, 2, '#f2c94c')
  R(ctx, x - 16, y - 8, 1, 2, '#ff3030')
  R(ctx, x - 6, y - 5, 4, 2, '#8a4a2a') // rust
  D(ctx, x - 9, y - 2, 3, '#1a1a1a')
  D(ctx, x + 9, y - 2, 3, '#1a1a1a')
  D(ctx, x - 9, y - 2, 1, '#9a9a9a')
  D(ctx, x + 9, y - 2, 1, '#9a9a9a')
}

function bench(ctx: Ctx, x: number, y: number): void {
  R(ctx, x - 8, y - 1, 18, 2, SHADOW)
  R(ctx, x - 8, y - 11, 16, 3, '#1f1a1a')
  R(ctx, x - 7, y - 10, 14, 1, '#b98a55')
  R(ctx, x - 8, y - 7, 16, 4, '#1f1a1a')
  R(ctx, x - 7, y - 6, 14, 2, '#a8784a')
  R(ctx, x - 7, y - 3, 2, 3, '#4a2f1b')
  R(ctx, x + 5, y - 3, 2, 3, '#4a2f1b')
}

function lamp(ctx: Ctx, x: number, y: number): void {
  R(ctx, x, y - 18, 2, 18, '#2a2a2e')
  R(ctx, x - 2, y - 21, 6, 4, '#2a2a2e')
  R(ctx, x - 1, y - 20, 4, 2, '#f7e58a')
  ctx.fillStyle = activeTheme().glow
  ctx.beginPath()
  ctx.arc(x + 1, y - 19, 7, 0, Math.PI * 2)
  ctx.fill()
}

function bin(ctx: Ctx, x: number, y: number): void {
  R(ctx, x - 4, y - 1, 10, 2, SHADOW)
  R(ctx, x - 4, y - 9, 9, 9, '#1f1a1a')
  R(ctx, x - 3, y - 8, 7, 8, '#6a6a70')
  R(ctx, x - 5, y - 10, 11, 3, '#1f1a1a')
  R(ctx, x - 4, y - 9, 9, 1, '#9a9a9a')
  R(ctx, x - 1, y - 6, 1, 5, '#4a4a52')
  R(ctx, x + 2, y - 6, 1, 5, '#4a4a52')
}

function pond(ctx: Ctx, x: number, y: number): void {
  E(ctx, x, y - 6, 29, 16, '#1f1a1a')
  E(ctx, x, y - 6, 28, 15, '#7a6a48')
  E(ctx, x, y - 6, 25, 13, activeTheme().water[0])
  E(ctx, x - 6, y - 10, 12, 4, activeTheme().water[1])
  for (const [dx, dy] of [[-12, -3], [10, -2], [3, 2]] as const) {
    D(ctx, x + dx, y + dy, 3, '#2c7a33')
    R(ctx, x + dx, y + dy - 1, 2, 1, '#ff9ac0')
  }
  R(ctx, x + 7, y - 9, 5, 3, '#f2c94c')
  R(ctx, x + 11, y - 12, 3, 4, '#f2c94c')
  R(ctx, x + 14, y - 11, 2, 1, '#ff8a2c')
  R(ctx, x + 12, y - 11, 1, 1, '#1f1a1a')
  for (const dx of [-24, -20, 22]) R(ctx, x + dx, y - 14, 1, 5, '#2c7a33')
}

function snowman(ctx: Ctx, x: number, y: number): void {
  E(ctx, x + 2, y, 8, 2, SHADOW)
  D(ctx, x, y - 5, 6, '#7a8fa0')
  D(ctx, x, y - 5, 5, '#f4f8fb')
  D(ctx, x, y - 13, 5, '#7a8fa0')
  D(ctx, x, y - 13, 4, '#ffffff')
  D(ctx, x, y - 20, 4, '#7a8fa0')
  D(ctx, x, y - 20, 3, '#ffffff')
  R(ctx, x - 1, y - 21, 1, 1, '#1f1a1a')
  R(ctx, x + 1, y - 21, 1, 1, '#1f1a1a')
  R(ctx, x, y - 19, 4, 1, '#f08a2c')
  R(ctx, x - 4, y - 16, 8, 2, '#d94a2c')
  R(ctx, x - 3, y - 26, 6, 1, '#2a2a2e')
  R(ctx, x - 2, y - 29, 4, 3, '#2a2a2e')
  R(ctx, x - 9, y - 14, 4, 1, '#6b4423')
  R(ctx, x + 5, y - 12, 4, 1, '#6b4423')
  R(ctx, x, y - 8, 1, 1, '#1f1a1a')
  R(ctx, x, y - 4, 1, 1, '#1f1a1a')
}

/** Returns true when `kind` is a scenery sprite handled here. Coordinates are art pixels (anchor = bottom centre). */
export function drawScenery(ctx: Ctx, kind: string, variant: number, x: number, y: number): boolean {
  switch (kind) {
    case 'tree':
      if (variant === 1) pine(ctx, x, y)
      else oak(ctx, x, y, variant === 2 ? 1 : variant === 3 ? 2 : 0)
      return true
    case 'bush':
      bush(ctx, x, y, variant)
      return true
    case 'rock':
      rock(ctx, x, y, variant)
      return true
    case 'clubhouse':
      clubhouse(ctx, x, y)
      return true
    case 'stand':
      stand(ctx, x, y, variant)
      return true
    case 'car':
      car(ctx, x, y, variant)
      return true
    case 'bench':
      bench(ctx, x, y)
      return true
    case 'lamp':
      lamp(ctx, x, y)
      return true
    case 'bin':
      bin(ctx, x, y)
      return true
    case 'pond':
      pond(ctx, x, y)
      return true
    case 'snowman':
      snowman(ctx, x, y)
      return true
    case 'pine':
      pine(ctx, x, y)
      return true
    default:
      return drawThemeProp(ctx, kind, variant, x, y)
  }
}
