import { D, E, R } from './scenery'

type Ctx = CanvasRenderingContext2D

const K = '#1f1a1a'
const SHADOW = 'rgba(10,30,10,0.32)'

/** Broken windmill: tapered tower, snapped blades, one blade still hanging on. Anchor = bottom centre. */
function windmill(ctx: Ctx, cx: number, by: number, w: number): void {
  const base = Math.max(14, Math.round(w / 2))
  E(ctx, cx + 3, by, base + 6, 3, SHADOW)
  // fallen blade
  for (let i = 0; i < 14; i++) R(ctx, cx + base + 3 + i, by - 2, 1, 2, i % 3 ? '#a8784a' : '#f4e9c8')
  // tower
  for (let r = 0; r < 34; r++) {
    const half = 7 + Math.round((r / 33) * (base - 7))
    const y = by - 34 + r
    R(ctx, cx - half - 1, y, half * 2 + 3, 1, K)
    R(ctx, cx - half, y, half * 2 + 1, 1, r > 27 ? '#9a9488' : '#e8dcc0')
    R(ctx, cx + half - Math.floor(half / 2), y, Math.floor(half / 2) + 1, 1, r > 27 ? '#7a766c' : '#c9b999')
    if (r > 27 && r % 3 === 0) R(ctx, cx - half, y, half * 2 + 1, 1, '#6a665c')
  }
  R(ctx, cx - 4, by - 10, 8, 10, K)
  R(ctx, cx - 3, by - 9, 6, 9, '#6b4423')
  R(ctx, cx - 2, by - 24, 5, 6, K)
  R(ctx, cx - 1, by - 23, 3, 4, '#8ec9e0')
  // cap roof
  for (let r = 0; r < 10; r++) {
    const half = 3 + r
    R(ctx, cx - half - 1, by - 44 + r, half * 2 + 3, 1, '#4a1a10')
    R(ctx, cx - half, by - 44 + r, half * 2 + 1, 1, r % 3 === 0 ? '#cf5a3c' : '#b8452c')
  }
  // hub + blades (one intact, three snapped)
  const hx = cx
  const hy = by - 34
  for (let t = 4; t < 26; t++) {
    R(ctx, hx - t, hy - t, 3, 3, K)
    if (t % 4 < 2) R(ctx, hx - t + 1, hy - t + 1, 1, 1, '#a8784a')
    else R(ctx, hx - t + 1, hy - t + 1, 1, 1, '#f4e9c8')
  }
  for (const [dx, dy, len] of [[1, -1, 8], [-1, 1, 6], [1, 1, 9]] as const) {
    for (let t = 4; t < len; t++) R(ctx, hx + dx * t, hy + dy * t, 3, 3, t % 3 ? '#a8784a' : '#6b4423')
    R(ctx, hx + dx * len, hy + dy * len, 2, 1, '#f4e9c8')
  }
  D(ctx, hx, hy, 4, K)
  D(ctx, hx, hy, 3, '#8a5e35')
  D(ctx, hx, hy, 1, '#ff6b4a')
}

function brickLines(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  for (let j = 0; j < h; j += 4) {
    R(ctx, x, y + j + 3, w, 1, '#8a7a62')
    for (let i = (j / 4) % 2 ? 3 : 0; i < w; i += 6) R(ctx, x + i, y + j, 1, 3, '#8a7a62')
  }
}

/** Crumbling mini castle with two towers and a gate. */
function castle(ctx: Ctx, cx: number, by: number): void {
  E(ctx, cx + 2, by, 24, 3, SHADOW)
  const tower = (x: number) => {
    R(ctx, x - 1, by - 33, 11, 33, K)
    R(ctx, x, by - 32, 9, 32, '#b8a58a')
    brickLines(ctx, x, by - 32, 9, 32)
    R(ctx, x + 3, by - 22, 3, 6, K)
    for (let r = 0; r < 9; r++) {
      const half = 6 - Math.floor(r * 0.6)
      R(ctx, x + 4 - half - 1, by - 42 + r, half * 2 + 3, 1, '#4a1a10')
      R(ctx, x + 4 - half, by - 42 + r, half * 2 + 1, 1, r % 3 === 0 ? '#cf5a3c' : '#b8452c')
    }
    R(ctx, x + 4, by - 47, 1, 6, K)
    R(ctx, x + 5, by - 47, 4, 3, '#ff6b4a')
  }
  tower(cx - 21)
  tower(cx + 12)
  R(ctx, cx - 13, by - 25, 26, 25, K)
  R(ctx, cx - 12, by - 24, 24, 24, '#c4b192')
  brickLines(ctx, cx - 12, by - 24, 24, 24)
  for (let i = -12; i < 10; i += 6) {
    R(ctx, cx + i, by - 29, 4, 5, K)
    if (i !== -6) R(ctx, cx + i + 1, by - 28, 2, 4, '#b8a58a') // one merlon missing
  }
  R(ctx, cx - 5, by - 14, 10, 14, K)
  R(ctx, cx - 4, by - 13, 8, 13, '#3a2a1a')
  for (let i = -3; i < 4; i += 2) R(ctx, cx + i, by - 13, 1, 13, '#6b4a2a')
  R(ctx, cx - 4, by - 8, 8, 1, '#6b4a2a')
  for (const [dx, dy] of [[-9, -20], [6, -17], [-8, -8], [8, -5]] as const) R(ctx, cx + dx, by + dy, 4, 3, '#4a3f33') // missing bricks
}

/** Sinking pirate ship in a puddle, sagging sail and a tattered flag. */
function hull(ctx: Ctx, cx: number, by: number): void {
  E(ctx, cx, by - 5, 28, 10, K)
  E(ctx, cx, by - 5, 27, 9, '#3f8f8a')
  R(ctx, cx - 18, by - 3, 6, 1, '#5aa59e')
  R(ctx, cx + 8, by - 6, 7, 1, '#5aa59e')
  // hull, tilted a little
  for (let r = 0; r < 12; r++) {
    const half = 17 - Math.round(r * 0.45)
    const y = by - 19 + r
    const off = Math.round((11 - r) * 0.15)
    R(ctx, cx - half - 1 + off, y, half * 2 + 3, 1, K)
    R(ctx, cx - half + off, y, half * 2 + 1, 1, r < 2 ? '#c49a64' : r % 3 === 0 ? '#6b4423' : '#8a5e35')
  }
  for (const dx of [-10, -3, 4, 11]) R(ctx, cx + dx, by - 12, 2, 2, '#f4e9c8')
  R(ctx, cx + 17, by - 21, 4, 3, '#6b4423') // bowsprit
  // mast
  R(ctx, cx - 1, by - 52, 3, 34, K)
  R(ctx, cx, by - 52, 1, 34, '#8a5e35')
  R(ctx, cx - 4, by - 54, 9, 3, K)
  R(ctx, cx - 3, by - 53, 7, 1, '#6b4423')
  // sagging sail
  for (let r = 0; r < 22; r++) {
    const sag = Math.round(Math.sin((r / 21) * Math.PI) * 3)
    const y = by - 49 + r
    R(ctx, cx - 11 + sag, y, 23, 1, r > 18 && r % 2 ? '#c9b999' : '#f4e9c8')
    R(ctx, cx - 12 + sag, y, 1, 1, K)
    R(ctx, cx + 12 + sag, y, 1, 1, K)
  }
  R(ctx, cx - 11, by - 50, 23, 1, K)
  R(ctx, cx - 2, by - 40, 5, 4, K)
  R(ctx, cx - 1, by - 39, 1, 1, '#fff')
  R(ctx, cx + 1, by - 39, 1, 1, '#fff')
  R(ctx, cx + 3, by - 58, 8, 4, K)
  R(ctx, cx + 4, by - 57, 5, 2, '#2a2a2e')
  R(ctx, cx + 6, by - 57, 1, 1, '#fff')
}

/** Giant clown head. The mouth is the tunnel. */
function clown(ctx: Ctx, cx: number, by: number): void {
  E(ctx, cx + 2, by, 22, 3, SHADOW)
  for (const [dx, dy, r] of [[-15, -33, 8], [15, -33, 8], [-9, -44, 8], [9, -44, 8], [0, -47, 8]] as const) {
    D(ctx, cx + dx, by + dy, r + 1, K)
  }
  for (const [dx, dy, r] of [[-15, -33, 8], [15, -33, 8], [-9, -44, 8], [9, -44, 8], [0, -47, 8]] as const) {
    D(ctx, cx + dx, by + dy, r, '#f08a2c')
    D(ctx, cx + dx - 2, by + dy - 2, 3, '#f7b24a')
  }
  D(ctx, cx, by - 26, 18, K)
  D(ctx, cx, by - 26, 17, '#f4e9c8')
  D(ctx, cx + 5, by - 22, 9, '#e6d9b4')
  D(ctx, cx - 12, by - 24, 3, '#ff9aa8')
  D(ctx, cx + 12, by - 24, 3, '#ff9aa8')
  for (const dx of [-7, 7]) {
    D(ctx, cx + dx, by - 33, 5, K)
    D(ctx, cx + dx, by - 33, 4, '#fff')
    R(ctx, cx + dx, by - 33, 2, 3, K)
    R(ctx, cx + dx - 4, by - 41, 9, 2, '#e03030')
  }
  D(ctx, cx, by - 27, 4, K)
  D(ctx, cx, by - 27, 3, '#e03030')
  R(ctx, cx - 1, by - 29, 1, 1, '#ffb0b0')
  E(ctx, cx, by - 17, 13, 6, K)
  E(ctx, cx, by - 17, 12, 5, '#3a0f14')
  R(ctx, cx - 9, by - 22, 4, 3, '#fff')
  R(ctx, cx + 5, by - 22, 4, 3, '#fff')
  R(ctx, cx - 4, by - 13, 8, 2, '#e8506a')
  // collar and bow tie
  E(ctx, cx, by - 6, 16, 5, K)
  E(ctx, cx, by - 6, 15, 4, '#e03030')
  R(ctx, cx - 7, by - 6, 6, 5, '#2e86c1')
  R(ctx, cx + 2, by - 6, 6, 5, '#2e86c1')
  R(ctx, cx - 1, by - 5, 3, 3, '#f2c94c')
}

/** Upright 3/4-view landmark whose collision box is the footprint (x, y, w, h in art pixels). */
export function drawLandmark(ctx: Ctx, style: string, x: number, y: number, w: number, h: number): boolean {
  const cx = x + Math.floor(w / 2)
  const by = y + h
  switch (style) {
    case 'windmill':
      windmill(ctx, cx, by, w)
      return true
    case 'castle':
      castle(ctx, cx, by)
      return true
    case 'hull':
      hull(ctx, cx, by)
      return true
    case 'clown':
      clown(ctx, cx, by)
      return true
    default:
      return false
  }
}
