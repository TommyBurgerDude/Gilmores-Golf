import { Rng, hashString } from './prng'
import type { Season, TemplateId } from './schema'
import { ALL_TEMPLATE_IDS } from './templateIds'

/**
 * Bump when generation changes on purpose: it changes every level. (The seed strings below still say "tee-up", the
 * game's original name. They are part of every level's seed, so renaming them would reshuffle all levels.)
 */
export const GENERATOR_VERSION = 2

/** Every hole type is played this many times (different theme, tier and seed each time). */
export const PASSES = 3
/** Difficulty ramps 1 -> 3 over this many levels, then starts over. */
export const TIER_CYCLE = 50
/** Ten visual themes: the four seasons plus six settings. */
export const SEASONS: readonly Season[] = [
  'spring',
  'summer',
  'fall',
  'winter',
  'apocalypse',
  'beach',
  'mountain',
  'forest',
  'city',
  'cyberpunk',
]
export const SEASON_LABEL: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  fall: 'Fall',
  winter: 'Winter',
  apocalypse: 'Apocalypse',
  beach: 'Beach',
  mountain: 'Mountain',
  forest: 'Forest',
  city: 'City',
  cyberpunk: 'Cyberpunk',
}

export const TEMPLATE_ORDER: readonly TemplateId[] = ALL_TEMPLATE_IDS

/** 3 x 4,013 hole types = 12,039 levels. */
export const LEVEL_COUNT = TEMPLATE_ORDER.length * PASSES

export const clampLevel = (n: number): number => (Number.isFinite(n) ? Math.min(LEVEL_COUNT, Math.max(1, Math.trunc(n))) : 1)

const themeCache = new Map<number, Season[]>()

/** Seeded shuffle of the ten themes for one block of levels (cached; the block-boundary swap is applied once). */
function themeOrder(block: number): Season[] {
  const hit = themeCache.get(block)
  if (hit) return hit
  const rng = new Rng(hashString(`tee-up:v${GENERATOR_VERSION}:theme-block:${block}`))
  const order = [...SEASONS]
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    const t = order[i] as Season
    order[i] = order[j] as Season
    order[j] = t
  }
  const prevLast = block > 0 ? themeOrder(block - 1)[SEASONS.length - 1] : undefined
  if (order[0] === prevLast) {
    const t = order[0] as Season
    order[0] = order[1] as Season
    order[1] = t
  }
  themeCache.set(block, order)
  return order
}

/** Each block of ten levels shows every theme once, so neighbouring levels never share a look. */
export function seasonOf(level: number): Season {
  const idx = clampLevel(level) - 1
  const block = Math.floor(idx / SEASONS.length)
  return themeOrder(block)[idx - block * SEASONS.length] as Season
}

/** Difficulty ramps 1 -> 3 inside every cycle of TIER_CYCLE levels, then starts over. */
export function tierOf(level: number): number {
  const i = (clampLevel(level) - 1) % TIER_CYCLE
  return i < 16 ? 1 : i < 34 ? 2 : 3
}

export const seedForLevel = (level: number): number => hashString(`tee-up:v${GENERATOR_VERSION}:level:${clampLevel(level)}`)

const BLOCK = TEMPLATE_ORDER.length

const blockCache = new Map<number, TemplateId[]>()

/** Seeded shuffle of all templates for one pass (cached; the pass-boundary swap is applied once). */
function blockOrder(block: number): TemplateId[] {
  const hit = blockCache.get(block)
  if (hit) return hit
  const rng = new Rng(hashString(`tee-up:v${GENERATOR_VERSION}:block:${block}`))
  const order = [...TEMPLATE_ORDER]
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    const t = order[i] as TemplateId
    order[i] = order[j] as TemplateId
    order[j] = t
  }
  const prevLast = block > 0 ? blockOrder(block - 1)[BLOCK - 1] : undefined
  if (order[0] === prevLast) {
    const t = order[0] as TemplateId
    order[0] = order[1] as TemplateId
    order[1] = t
  }
  blockCache.set(block, order)
  return order
}

/**
 * Each pass of 4,013 consecutive levels plays every hole type once, in a seeded order that differs per pass; a pass
 * never starts with the previous pass's last type. Adjacent levels never repeat a hole type.
 */
export function templateForLevel(level: number): TemplateId {
  const idx = clampLevel(level) - 1
  const block = Math.floor(idx / BLOCK)
  return blockOrder(block)[idx - block * BLOCK] as TemplateId
}

/**
 * Choose the next level at random, avoiding the most recent ones so consecutive holes feel different.
 * `rand` returns a float in [0, 1) (inject a seeded one in tests); `recent` is mutated.
 */
export function pickNextLevel(rand: () => number, recent: number[], memory = 300): number {
  const prev = recent[recent.length - 1]
  const prevTemplate = prev === undefined ? null : templateForLevel(prev)
  const ok = (l: number) => !recent.includes(l) && templateForLevel(l) !== prevTemplate
  let next = 0
  for (let tries = 0; tries < 80 && next === 0; tries++) {
    const l = 1 + Math.floor(rand() * LEVEL_COUNT)
    if (ok(l)) next = l
  }
  if (next === 0) {
    for (let l = 1; l <= LEVEL_COUNT && next === 0; l++) if (ok(l)) next = l
  }
  if (next === 0) next = 1
  recent.push(next)
  while (recent.length > memory) recent.shift()
  return next
}
