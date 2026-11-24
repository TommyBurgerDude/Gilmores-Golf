import { PAL } from './palette'
import { drawScenery } from './scenery'

type Ctx = CanvasRenderingContext2D

/** Sprites are rows of characters; '.' is transparent. */
const COLORS: Record<string, string> = {
  k: PAL.charcoal,
  r: PAL.coral,
  w: PAL.cream,
  s: '#e8b08a',
  b: PAL.blue,
  g: '#5fbf4a',
  G: PAL.forest,
  n: PAL.grey,
  N: PAL.greyDark,
  o: '#f08a2c',
  y: PAL.yellow,
  p: '#e86aa8',
  W: '#9fd4e8',
}

const GNOME = [
  '...k...',
  '..krk..',
  '.krrrk.',
  '.krrrk.',
  'kkkkkkk',
  '.ksssk.',
  'kwwwwwk',
  'kwwkwwk',
  '.kbbbk.',
  '.kkkkk.',
]
const DINO = [
  '.....kkkk.....',
  '....kggggk....',
  '....kgkggk....',
  'k...kggggkk...',
  'kk.kgggggggk..',
  '.kkgggggggggk.',
  '..kggggggggk..',
  '..kgg.kggg.k..',
  '..kk..kk.kk...',
]
const DRAINPIPE = ['kkkkk.', 'knnnk.', 'kkkkk.', '.kNk..', '.kNk..', '.kNkkk', '.kkkNk', '.....k', '....W.']
const CONE = ['..k..', '.kok.', '.kwk.', 'kkokk', 'kkkkk']
const WEED = ['g.g.g', '.ggg.', '..g..']
const FLOWER = ['.p.p.', '..y..', '.p.p.', '..g..', '..g..']
const FLOWER_COLORS = ['p', 'r', 'w', 'y']

export function drawSprite(ctx: Ctx, rows: string[], x: number, y: number, swap?: Record<string, string>): void {
  const h = rows.length
  const w = rows[0]?.length ?? 0
  const x0 = x - Math.floor(w / 2)
  const y0 = y - h
  for (let j = 0; j < h; j++) {
    const row = rows[j] as string
    for (let i = 0; i < w; i++) {
      let c = row[i] as string
      if (c === '.') continue
      if (swap?.[c]) c = swap[c] as string
      ctx.fillStyle = COLORS[c] ?? PAL.charcoal
      ctx.fillRect(x0 + i, y0 + j, 1, 1)
    }
  }
}

const FONT: Record<string, string[]> = {
  G: ['###', '#..', '#.#', '#.#', '###'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  O: ['###', '#.#', '#.#', '#.#', '###'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  E: ['###', '#..', '##.', '#..', '###'],
  S: ['###', '#..', '###', '..#', '###'],
  "'": ['.#.', '.#.', '...', '...', '...'],
}

export function drawText(ctx: Ctx, text: string, x: number, y: number, color: string): number {
  let cx = x
  ctx.fillStyle = color
  for (const ch of text) {
    const g = FONT[ch]
    if (g) {
      for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j]?.[i] === '#') ctx.fillRect(cx + i, y + j, 1, 1)
    }
    cx += 4
  }
  return cx - x
}

export function drawProp(ctx: Ctx, kind: string, variant: number, x: number, y: number): void {
  if (drawScenery(ctx, kind, variant, x, y)) return
  switch (kind) {
    case 'gnome':
      drawSprite(ctx, GNOME, x, y)
      break
    case 'dino':
      drawSprite(ctx, DINO, x, y, variant % 2 ? { g: 'o' } : undefined)
      break
    case 'drainpipe':
      drawSprite(ctx, DRAINPIPE, x, y)
      break
    case 'cone':
      drawSprite(ctx, CONE, x, y)
      break
    case 'weed':
      drawSprite(ctx, WEED, x, y)
      break
    case 'flower':
      drawSprite(ctx, FLOWER, x, y, { p: FLOWER_COLORS[variant % 4] as string })
      break
  }
}
