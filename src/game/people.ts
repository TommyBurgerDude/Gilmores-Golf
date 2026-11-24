import type { Season } from '../courses/schema'
type Ctx = CanvasRenderingContext2D

export type Pose = 'idle' | 'cheer' | 'laugh' | 'taunt' | 'oops'

type Hair = 'short' | 'long' | 'bun' | 'spiky' | 'curly' | 'bald' | 'mohawk'

interface Look {
  skin: string
  hair: string
  hairStyle: Hair
  shirt: string
  pants: string
  hat?: 'cap' | 'visor' | 'sun' | 'beanie' | 'hood' | 'hardhat' | 'helmet'
  hatColor?: string
  extra?: 'mustache' | 'ice' | 'apron' | 'glasses' | 'mask' | 'shades' | 'backpack' | 'tie' | 'neonvisor' | 'scarf'
  name: string
}

const L = (name: string, skin: string, hair: string, hairStyle: Hair, shirt: string, pants: string, hat?: Look['hat'], hatColor?: string, extra?: Look['extra']): Look => ({
  name,
  skin,
  hair,
  hairStyle,
  shirt,
  pants,
  hat,
  hatColor,
  extra,
})
const DOG = L('Dog', '#b07a4a', '#7a4a2a', 'short', '#7a4a2a', '#7a4a2a')

/** Index 0 is Gilmore (the owner), 1-6 are visitors, 7 is the dog. */
const STANDARD: Look[] = [
  L('Gilmore', '#e8b08a', '#9a9a9a', 'short', '#2e86c1', '#5a4630', 'cap', '#d94a2c', 'apron'),
  L('Visor lady', '#f2c8a4', '#c0652a', 'long', '#e86aa8', '#f4e9c8', 'visor'),
  L('Grump', '#d9a07a', '#d8d8d8', 'bald', '#6a7a4a', '#3a3a4a', undefined, undefined, 'mustache'),
  L('Kid', '#8a5a3a', '#1f1a1a', 'curly', '#f2c94c', '#2e5a9a', undefined, undefined, 'ice'),
  L('Sunhat', '#c68a62', '#3a2a1a', 'long', '#7ad0c0', '#8a4a7a', 'sun'),
  L('Teen', '#f2c8a4', '#2a2a2e', 'spiky', '#9a5ac0', '#2a2a2e', 'beanie', '#ff6b4a'),
  L('Dad', '#e0a878', '#5a3a1a', 'short', '#c0392b', '#4a6a8a', undefined, undefined, 'glasses'),
  DOG,
]

const BEANIES = ['#d94a2c', '#2e86c1', '#e8c33a', '#9a5ac0', '#2f9e5f', '#ff6b4a', '#c0392b']
const WINTER: Look[] = STANDARD.map((l, i) =>
  i === 7 ? l : { ...l, hat: l.hat === 'cap' ? l.hat : 'beanie', hatColor: l.hat === 'cap' ? l.hatColor : BEANIES[i], extra: l.extra ?? 'scarf' },
)

const FALL_SHIRTS = ['#a8421c', '#c9702a', '#6a5a3a', '#d4a02a', '#8a4a2a', '#7a3a1c', '#9a5a2a']
const FALL: Look[] = STANDARD.map((l, i) => (i === 7 ? l : { ...l, shirt: FALL_SHIRTS[i] as string }))

const LOOK_SETS: Record<Season, Look[]> = {
  spring: STANDARD,
  summer: STANDARD,
  fall: FALL,
  winter: WINTER,
  apocalypse: [
    L('Gilmore', '#d8a880', '#8a8a8a', 'short', '#6a5a3a', '#3a3228', 'cap', '#5a4a30', 'apron'),
    L('Scavenger', '#c89870', '#3a2a1a', 'short', '#5a4a3a', '#2a2620', 'hood', undefined, 'mask'),
    L('Raider', '#d8a880', '#d83a2a', 'mohawk', '#4a1a1a', '#2a1a1a', undefined, undefined, 'shades'),
    L('Kid', '#b88860', '#2a1a10', 'spiky', '#6a6a30', '#3a3a2a', 'helmet', '#6a7a5a'),
    L('Medic', '#e8c8a0', '#c8c8c8', 'bun', '#e8e0d0', '#5a5a4a', undefined, undefined, 'mask'),
    L('Wanderer', '#a8785a', '#1a1a1a', 'short', '#4a4a3a', '#2a2a22', 'hood', undefined, 'backpack'),
    L('Soldier', '#d0a078', '#4a3a2a', 'short', '#4a5a3a', '#3a4a2a', 'helmet', '#5a6a4a', 'mustache'),
    DOG,
  ],
  beach: [
    L('Gilmore', '#e8a878', '#c8c8c8', 'short', '#ff8a4a', '#2ec4d4', 'sun', undefined, 'glasses'),
    L('Swimmer', '#f0c098', '#e8c050', 'long', '#ff4a8a', '#2e86c1'),
    L('Surfer', '#d8a070', '#e8d060', 'long', '#2ec4d4', '#f2c94c', undefined, undefined, 'shades'),
    L('Kid', '#8a5a3a', '#1a1a1a', 'curly', '#f2c94c', '#ff6b4a', 'visor', undefined, 'ice'),
    L('Sunbather', '#c68a62', '#2a1a10', 'bun', '#7ad0c0', '#ff6b9a', 'sun', undefined, 'shades'),
    L('Lifeguard', '#e0a878', '#4a3a2a', 'short', '#e8402a', '#e8402a', 'visor'),
    L('Dad', '#e8b088', '#7a5a2a', 'short', '#3aa8d8', '#f4e9c8', undefined, undefined, 'shades'),
    DOG,
  ],
  mountain: [
    L('Gilmore', '#e8b08a', '#9a9a9a', 'short', '#b83a2a', '#3a3a4a', 'beanie', '#2a2a30', 'apron'),
    L('Hiker', '#e0b090', '#6a3a1a', 'long', '#2e7a6a', '#4a4a3a', 'beanie', '#e8c33a', 'backpack'),
    L('Ranger', '#d0a078', '#3a2a1a', 'short', '#5a7a3a', '#6a5a3a', 'cap', '#4a6a2a', 'mustache'),
    L('Kid', '#f0c4a0', '#c0652a', 'curly', '#ff6b4a', '#2e5a9a', 'hood', undefined, 'scarf'),
    L('Skier', '#e8c0a0', '#1a1a1a', 'short', '#2e86c1', '#2a2a30', 'helmet', '#e8402a', 'shades'),
    L('Climber', '#c89870', '#2a1a10', 'short', '#e8c33a', '#4a4a4a', 'helmet', '#2e86c1', 'backpack'),
    L('Elder', '#d8a880', '#e0e0e0', 'bald', '#6a4a8a', '#3a3a3a', 'beanie', '#6a3a2a', 'mustache'),
    DOG,
  ],
  forest: [
    L('Gilmore', '#e0a878', '#9a9a9a', 'short', '#3a7a3a', '#5a4630', 'cap', '#2f6a3a', 'apron'),
    L('Ranger', '#d0a078', '#4a3a2a', 'short', '#6a8a3a', '#5a4a2a', 'cap', '#7a6a2a', 'backpack'),
    L('Scout', '#f0c4a0', '#c0652a', 'spiky', '#c9a02a', '#4a6a3a', 'beanie', '#2f6a3a', 'backpack'),
    L('Camper', '#8a5a3a', '#1a1a1a', 'curly', '#d9603a', '#3a3a4a', 'beanie', '#e8c33a', 'scarf'),
    L('Forager', '#c68a62', '#3a2a1a', 'long', '#8a6a9a', '#5a4a3a', 'sun'),
    L('Lumberjack', '#e0a878', '#5a3a1a', 'short', '#b83a2a', '#3a3a4a', 'cap', '#2a2a2a', 'mustache'),
    L('Hiker', '#f2c8a4', '#7a5a2a', 'bun', '#4a8a8a', '#6a5a3a', 'visor', undefined, 'backpack'),
    DOG,
  ],
  city: [
    L('Gilmore', '#e8b08a', '#8a8a8a', 'short', '#4a5a7a', '#2a2a30', 'cap', '#2e86c1', 'tie'),
    L('Executive', '#f0c8a4', '#3a2a1a', 'long', '#2a3a5a', '#2a3a5a', undefined, undefined, 'glasses'),
    L('Courier', '#c89870', '#1a1a1a', 'short', '#e8c33a', '#2a2a30', 'cap', '#e8402a', 'backpack'),
    L('Skater', '#8a5a3a', '#1a1a1a', 'spiky', '#d83a6a', '#3a3a4a', 'beanie', '#2a2a30'),
    L('Banker', '#e0b090', '#4a3a2a', 'short', '#8a8a96', '#3a3a46', undefined, undefined, 'tie'),
    L('Tourist', '#f2c8a4', '#c0652a', 'bun', '#ff8a4a', '#4a8ad0', 'sun', undefined, 'ice'),
    L('Jogger', '#d8a070', '#2a1a10', 'long', '#2ec4a8', '#2a2a30', 'visor'),
    DOG,
  ],
  cyberpunk: [
    L('Gilmore', '#d8b090', '#9a9a9a', 'short', '#6a2a9a', '#1a1630', undefined, undefined, 'neonvisor'),
    L('Punk', '#f0c8a4', '#ff2d95', 'mohawk', '#1a1630', '#3a1a5a', undefined, undefined, 'shades'),
    L('Hacker', '#c89870', '#1a1a1a', 'short', '#1a2a3a', '#1a1630', 'hood', undefined, 'neonvisor'),
    L('Kid', '#8a5a3a', '#40e0ff', 'spiky', '#ff2d95', '#2a1a4a'),
    L('Android', '#9ab0c8', '#8a9ab0', 'short', '#2a3a4a', '#1a2a3a', undefined, undefined, 'shades'),
    L('Courier', '#e0b090', '#a050ff', 'long', '#40e0ff', '#1a1630', 'helmet', '#a050ff', 'backpack'),
    L('Exec', '#e8c0a0', '#2a2a2e', 'short', '#0a0a14', '#0a0a14', undefined, undefined, 'tie'),
    DOG,
  ],
}

const OUT = '#1a1a1a'
const EYE = '#2a2a2e'

function R(ctx: Ctx, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c
  ctx.fillRect(x, y, w, h)
}

/** Darken (f < 1) or lighten (f > 1) a #rrggbb colour. */
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)))
  const r = ch((n >> 16) & 255)
  const g = ch((n >> 8) & 255)
  const b = ch(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

/**
 * Golf Story-style chibi villager: big rounded head, small body, front view, shaded hair and clothes.
 * (x, y) is the foot position in art pixels; the sprite is ~22px tall.
 */
function person(ctx: Ctx, x: number, y: number, L: Look, pose: Pose, t: number, walking: boolean, col: (c: string) => string): void {
  const bob = pose === 'cheer' ? -Math.round(Math.abs(Math.sin(t * 9)) * 3) : 0
  const sx = pose === 'laugh' ? (Math.floor(t * 14) % 2 ? 1 : -1) : 0
  const ox = x + sx
  const wf = walking ? Math.floor(t * 6) % 2 : 0
  const oy = y + bob + (walking && wf ? -1 : 0)
  const lyo = walking && wf === 0 ? -1 : 0
  const ryo = walking && wf === 1 ? -1 : 0
  const breathe = pose === 'idle' && Math.floor(t * 2.2) % 2 === 1 ? 1 : 0
  const skin = col(L.skin)
  const skinD = col(shade(L.skin, 0.86))
  const shirt = col(L.shirt)
  const shirtD = col(shade(L.shirt, 0.78))
  const shirtL = col(shade(L.shirt, 1.18))
  const pants = col(L.pants)
  const pantsD = col(shade(L.pants, 0.78))

  // legs + shoes
  R(ctx, ox - 3, oy - 5 + lyo, 3, 4, pants)
  R(ctx, ox, oy - 5 + ryo, 3, 4, pantsD)
  R(ctx, ox - 3, oy - 1 + lyo, 3, 1, col('#3a2a1a'))
  R(ctx, ox, oy - 1 + ryo, 3, 1, col('#2a1c10'))

  // torso with collar, side shading and belt
  R(ctx, ox - 3, oy - 12 + breathe, 7, 7, shirt)
  R(ctx, ox + 2, oy - 12 + breathe, 2, 7, shirtD)
  R(ctx, ox - 1, oy - 12 + breathe, 3, 1, col(shade(L.skin, 0.95)))
  R(ctx, ox - 3, oy - 12 + breathe, 1, 1, shirtL)
  R(ctx, ox - 3, oy - 6, 7, 1, pantsD)
  if (L.extra === 'apron') {
    R(ctx, ox - 2, oy - 10, 5, 5, col('#f4e9c8'))
    R(ctx, ox - 2, oy - 10, 5, 1, col('#d8c9a0'))
    R(ctx, ox, oy - 8, 1, 1, col('#d94a2c'))
  }

  // arms (2px wide, hands below the sleeve)
  const armDown = (ax: number, d: string) => {
    R(ctx, ax, oy - 11 + breathe, 2, 4, d)
    R(ctx, ax, oy - 7, 2, 2, skin)
  }
  if (pose === 'cheer') {
    R(ctx, ox - 6, oy - 19, 2, 8, shirt)
    R(ctx, ox + 4, oy - 19, 2, 8, shirtD)
    R(ctx, ox - 6, oy - 21, 2, 2, skin)
    R(ctx, ox + 4, oy - 21, 2, 2, skin)
  } else if (pose === 'taunt') {
    armDown(ox - 5, shirt)
    R(ctx, ox + 4, oy - 11, 6, 2, shirtD)
    R(ctx, ox + 10, oy - 12, 2, 3, skin)
  } else if (pose === 'oops') {
    R(ctx, ox - 6, oy - 18, 2, 7, shirt)
    R(ctx, ox + 4, oy - 18, 2, 7, shirtD)
    R(ctx, ox - 5, oy - 21, 2, 3, skin)
    R(ctx, ox + 3, oy - 21, 2, 3, skin)
  } else {
    armDown(ox - 5, shirt)
    armDown(ox + 4, shirtD)
  }
  if (L.extra === 'backpack') {
    R(ctx, ox + 4, oy - 13 + breathe, 3, 8, col('#8a5a2a'))
    R(ctx, ox + 4, oy - 13 + breathe, 3, 1, col('#b07a3a'))
    R(ctx, ox - 2, oy - 11 + breathe, 1, 5, col('#6a4420'))
  }
  if (L.extra === 'tie') {
    R(ctx, ox, oy - 11 + breathe, 1, 5, col('#c0392b'))
    R(ctx, ox - 1, oy - 12 + breathe, 3, 1, col('#f4f4f4'))
  }
  if (L.extra === 'scarf') {
    R(ctx, ox - 3, oy - 13 + breathe, 7, 2, col('#d94a2c'))
    R(ctx, ox + 2, oy - 11 + breathe, 2, 4, col('#b83a1c'))
  }
  if (L.extra === 'ice') {
    R(ctx, ox + 5, oy - 9, 1, 3, col('#c49a64'))
    R(ctx, ox + 4, oy - 12, 3, 3, col('#f4b6c8'))
    R(ctx, ox + 4, oy - 13, 2, 1, col('#fff'))
  }

  // head: 9 wide, 8 tall, rounded corners
  const hy = oy - 21 + breathe
  R(ctx, ox - 3, hy, 7, 8, skin)
  R(ctx, ox - 4, hy + 1, 9, 6, skin)
  R(ctx, ox + 3, hy + 2, 2, 4, skinD)
  R(ctx, ox - 5, hy + 3, 1, 2, skin)
  R(ctx, ox + 5, hy + 3, 1, 2, skinD)
  const closed = pose === 'laugh' || pose === 'cheer'
  if (closed) {
    R(ctx, ox - 3, hy + 4, 2, 1, col(EYE))
    R(ctx, ox + 1, hy + 4, 2, 1, col(EYE))
  } else {
    R(ctx, ox - 3, hy + 3, 1, 2, col(EYE))
    R(ctx, ox + 2, hy + 3, 1, 2, col(EYE))
    R(ctx, ox - 3, hy + 3, 1, 1, col('#fff'))
    R(ctx, ox + 2, hy + 3, 1, 1, col('#fff'))
    R(ctx, ox - 3, hy + 4, 1, 1, col(EYE))
    R(ctx, ox + 2, hy + 4, 1, 1, col(EYE))
  }
  R(ctx, ox - 4, hy + 5, 1, 1, col('#f08a8a'))
  R(ctx, ox + 4, hy + 5, 1, 1, col('#e07a7a'))
  const open = pose === 'cheer' || pose === 'laugh' || pose === 'oops'
  if (open) {
    R(ctx, ox - 1, hy + 6, 3, 2, col('#6a1a1a'))
    R(ctx, ox - 1, hy + 6, 3, 1, col('#fff'))
  } else R(ctx, ox - 1, hy + 6, 2, 1, col('#a04a3a'))
  if (L.extra === 'mustache') R(ctx, ox - 3, hy + 5, 6, 1, col('#3a2a1a'))
  if (L.extra === 'mask') {
    R(ctx, ox - 3, hy + 4, 7, 4, col('#5a5a62'))
    R(ctx, ox - 3, hy + 3, 2, 2, col('#c8e0a0'))
    R(ctx, ox + 2, hy + 3, 2, 2, col('#c8e0a0'))
    R(ctx, ox - 1, hy + 6, 3, 2, col('#3a3a42'))
  }
  if (L.extra === 'shades') {
    R(ctx, ox - 4, hy + 3, 9, 2, col('#16161a'))
    R(ctx, ox - 3, hy + 3, 2, 1, col('#40e0ff'))
    R(ctx, ox + 2, hy + 3, 2, 1, col('#40e0ff'))
  }
  if (L.extra === 'neonvisor') {
    R(ctx, ox - 4, hy + 3, 9, 2, col('#40e0ff'))
    R(ctx, ox - 3, hy + 3, 7, 1, col('#c8ffff'))
  }
  if (L.extra === 'glasses') {
    R(ctx, ox - 4, hy + 3, 4, 3, col('#2a2a2e'))
    R(ctx, ox + 1, hy + 3, 4, 3, col('#2a2a2e'))
    R(ctx, ox - 3, hy + 4, 2, 1, col('#bfe4f2'))
    R(ctx, ox + 2, hy + 4, 2, 1, col('#bfe4f2'))
  }

  // hair
  const hair = col(L.hair)
  const hairD = col(shade(L.hair, 0.7))
  const hairL = col(shade(L.hair, 1.35))
  switch (L.hairStyle) {
    case 'short':
      R(ctx, ox - 4, hy, 9, 3, hair)
      R(ctx, ox - 5, hy + 1, 1, 3, hairD)
      R(ctx, ox + 5, hy + 1, 1, 3, hairD)
      R(ctx, ox - 2, hy, 3, 1, hairL)
      R(ctx, ox - 4, hy + 3, 2, 1, hair)
      break
    case 'long':
      R(ctx, ox - 4, hy, 9, 3, hair)
      R(ctx, ox - 5, hy + 1, 2, 8, hair)
      R(ctx, ox + 4, hy + 1, 2, 8, hairD)
      R(ctx, ox - 2, hy, 3, 1, hairL)
      break
    case 'bun':
      R(ctx, ox - 4, hy, 9, 3, hair)
      R(ctx, ox - 2, hy - 3, 4, 3, hair)
      break
    case 'spiky':
      R(ctx, ox - 4, hy, 9, 3, hair)
      for (const dx of [-4, -2, 0, 2]) R(ctx, ox + dx, hy - 2, 2, 2, hair)
      R(ctx, ox - 2, hy, 3, 1, hairL)
      break
    case 'curly':
      R(ctx, ox - 5, hy - 1, 11, 4, hair)
      R(ctx, ox - 4, hy - 2, 9, 1, hair)
      for (const dx of [-4, -1, 2]) R(ctx, ox + dx, hy - 1, 2, 1, hairL)
      break
    case 'mohawk':
      R(ctx, ox - 1, hy - 3, 3, 6, hair)
      R(ctx, ox, hy - 3, 1, 5, hairL)
      R(ctx, ox - 4, hy + 1, 3, 1, hairD)
      break
    case 'bald':
      R(ctx, ox - 5, hy + 2, 1, 3, hair)
      R(ctx, ox + 5, hy + 2, 1, 3, hairD)
      R(ctx, ox - 2, hy, 4, 1, col(shade(L.skin, 1.12)))
      break
  }

  // hats
  const hc = col(L.hatColor ?? '#d94a2c')
  if (L.hat === 'cap') {
    R(ctx, ox - 4, hy - 1, 9, 3, hc)
    R(ctx, ox - 5, hy + 2, 11, 1, col(shade(L.hatColor ?? '#d94a2c', 0.75)))
    R(ctx, ox - 2, hy - 1, 3, 1, col(shade(L.hatColor ?? '#d94a2c', 1.25)))
  } else if (L.hat === 'visor') {
    R(ctx, ox - 4, hy + 1, 9, 2, col('#f4e9c8'))
    R(ctx, ox - 5, hy + 3, 11, 1, col('#d8c9a0'))
  } else if (L.hat === 'sun') {
    R(ctx, ox - 7, hy + 1, 15, 2, col('#e8d07a'))
    R(ctx, ox - 4, hy - 2, 9, 3, col('#e8d07a'))
    R(ctx, ox - 4, hy, 9, 1, col('#d94a2c'))
    R(ctx, ox - 7, hy + 2, 15, 1, col('#c4ab55'))
  } else if (L.hat === 'hood') {
    R(ctx, ox - 5, hy - 1, 11, 4, col(shade(L.shirt, 0.9)))
    R(ctx, ox - 5, hy + 3, 2, 5, col(shade(L.shirt, 0.8)))
    R(ctx, ox + 4, hy + 3, 2, 5, col(shade(L.shirt, 0.7)))
    R(ctx, ox - 4, hy - 2, 9, 1, col(shade(L.shirt, 1.1)))
  } else if (L.hat === 'hardhat') {
    R(ctx, ox - 4, hy - 2, 9, 3, col('#e8c33a'))
    R(ctx, ox - 5, hy + 1, 11, 1, col('#c4a02a'))
  } else if (L.hat === 'helmet') {
    R(ctx, ox - 5, hy - 2, 11, 5, hc)
    R(ctx, ox - 4, hy - 3, 9, 1, hc)
    R(ctx, ox - 4, hy - 2, 3, 1, col(shade(L.hatColor ?? '#6a7a5a', 1.3)))
    R(ctx, ox - 5, hy + 3, 1, 3, hc)
    R(ctx, ox + 5, hy + 3, 1, 3, hc)
  } else if (L.hat === 'beanie') {
    R(ctx, ox - 4, hy - 2, 9, 4, hc)
    R(ctx, ox - 4, hy + 1, 9, 1, col(shade(L.hatColor ?? '#ff6b4a', 0.75)))
    R(ctx, ox - 1, hy - 4, 3, 2, col('#f4e9c8'))
  }
}

function dog(ctx: Ctx, x: number, y: number, pose: Pose, t: number, walking: boolean, col: (c: string) => string): void {
  const wf = walking ? Math.floor(t * 8) % 2 : 0
  const hop = pose === 'cheer' ? -Math.round(Math.abs(Math.sin(t * 11)) * 4) : 0
  const oy = y + hop
  const wag = Math.floor(t * 12) % 2
  R(ctx, x - 4, oy - 5, 9, 3, col('#b07a4a'))
  R(ctx, x + 3, oy - 8, 4, 4, col('#b07a4a'))
  R(ctx, x + 6, oy - 6, 2, 2, col('#7a4a2a'))
  R(ctx, x + 4, oy - 7, 1, 1, col(EYE))
  R(ctx, x + 2, oy - 9, 2, 2, col('#7a4a2a'))
  R(ctx, x - 4 + wf, oy - 2, 2, 2, col('#b07a4a'))
  R(ctx, x + 2 - wf, oy - 2, 2, 2, col('#b07a4a'))
  R(ctx, x - 6, oy - 7 - wag, 2, 3, col('#b07a4a'))
  if (pose === 'laugh' || pose === 'cheer') R(ctx, x + 6, oy - 4, 2, 1, col('#ff6b8a'))
}

/** Draw a spectator. (x, y) is the foot position in art pixels. Adds a 1px dark outline around the sprite. */
export function drawPerson(ctx: Ctx, x: number, y: number, look: number, pose: Pose, t: number, walking = false, season: Season = 'summer'): void {
  const set = LOOK_SETS[season]
  const L = set[look % set.length] as Look
  const draw = (cx: number, cy: number, col: (c: string) => string) =>
    look === 7 ? dog(ctx, cx, cy, pose, t, walking, col) : person(ctx, cx, cy, L, pose, t, walking, col)
  ctx.fillStyle = 'rgba(10,30,10,0.3)'
  ctx.fillRect(x - 4, y, 9, 2)
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) draw(x + dx, y + dy, () => OUT)
  draw(x, y, (c) => c)
}
