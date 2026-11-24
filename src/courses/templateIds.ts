/** Pure id lists (no geometry) so levels.ts can schedule templates without importing the generators. */
export const BASE_TEMPLATES = [
  'straight',
  'dogleg',
  'water',
  'narrow',
  'themed',
  'sbend',
  'lagoon',
  'uturn',
  'island',
  'pinball',
  'twinbridge',
  'hills',
  'warp',
] as const

export interface SkelDef {
  id: string
  name: string
  /** Geometry family (see composite.ts) and its parameter. */
  family: string
  p: number
}

const range = (n: number, from = 0) => Array.from({ length: n }, (_, i) => i + from)

/** 100 parametric path shapes across 15 families. */
const PARAMETRIC: SkelDef[] = [
  ...range(8, 2).map((p): SkelDef => ({ id: `wave${p}`, name: `Ripple ${p}`, family: 'wave', p })),
  ...range(7, 3).flatMap((p): SkelDef[] => [
    { id: `zig${p}`, name: `Zigzag ${p}`, family: 'zig', p },
    { id: `zigs${p}`, name: `Sharp Zigzag ${p}`, family: 'zigs', p },
  ]),
  ...range(6, 2).map((p): SkelDef => ({ id: `stairs${p}`, name: `Staircase ${p}`, family: 'stairs', p })),
  ...range(3).map((p): SkelDef => ({ id: `spiral${p}`, name: `Spiral ${p + 1}`, family: 'spiral', p })),
  ...range(8).map((p): SkelDef => ({ id: `arc${p}`, name: `Curve ${p + 1}`, family: 'arc', p })),
  ...range(8).map((p): SkelDef => ({ id: `hook${p}`, name: `Hook ${p + 1}`, family: 'hook', p })),
  ...range(8).map((p): SkelDef => ({ id: `ring${p}`, name: `Loop ${p + 1}`, family: 'ring', p })),
  ...range(8).map((p): SkelDef => ({ id: `fork${p}`, name: `Fork ${p + 1}`, family: 'fork', p })),
  ...range(8).map((p): SkelDef => ({ id: `plaza${p}`, name: `Plaza ${p + 1}`, family: 'plaza', p })),
  ...range(6).map((p): SkelDef => ({ id: `bell${p}`, name: `Bulbs ${p + 1}`, family: 'bell', p })),
  ...range(6).map((p): SkelDef => ({ id: `cross${p}`, name: `Crossroads ${p + 1}`, family: 'cross', p })),
  ...range(4).map((p): SkelDef => ({ id: `sweep${p}`, name: `Sweep ${p + 1}`, family: 'sweep', p })),
  ...range(6).map((p): SkelDef => ({ id: `kink${p}`, name: `Kink ${p + 1}`, family: 'kink', p })),
  ...range(4).map((p): SkelDef => ({ id: `diag${p}`, name: `Diagonal ${p + 1}`, family: 'diag', p })),
  ...range(3).map((p): SkelDef => ({ id: `peak${p}`, name: `Peak ${p + 1}`, family: 'peak', p })),
]

const ADJ = ['Crooked', 'Lazy', 'Twisty', 'Wobbly', 'Rambling', 'Sleepy', 'Lumpy', 'Winding', 'Tangled', 'Drifting']
const NOUN = ['Creek', 'Trail', 'Lane', 'Ridge', 'Path', 'Run', 'Way', 'Bend', 'Pass', 'Hollow']

/** 100 seeded random walks, each a fixed but irregular shape. */
const WALKS: SkelDef[] = range(100).map((p): SkelDef => ({
  id: `walk${p}`,
  name: `${ADJ[Math.floor(p / 10)]} ${NOUN[p % 10]}`,
  family: 'walk',
  p,
}))

/** 200 path shapes. */
export const SKELETONS: readonly SkelDef[] = [...PARAMETRIC, ...WALKS]

/** 20 hazard / obstacle features. */
export const FEATURES = [
  { id: 'bunkers', name: 'Bunker Bay' },
  { id: 'pond', name: 'Pond Hop' },
  { id: 'rivers', name: 'Twin Rivers' },
  { id: 'bumpers', name: 'Tire Alley' },
  { id: 'boards', name: 'Board Walk' },
  { id: 'slopes', name: 'Slippery Slopes' },
  { id: 'moat', name: 'Moat Castle' },
  { id: 'landmark', name: 'Landmark' },
  { id: 'warp', name: 'Warp Pad' },
  { id: 'gates', name: 'Croquet Gates' },
  { id: 'rotor', name: 'Windmill Blades' },
  { id: 'sliders', name: 'Sliding Doors' },
  { id: 'orbit', name: 'Wrecking Ball' },
  { id: 'bouncers', name: 'Pop Bumpers' },
  { id: 'ice', name: 'Black Ice' },
  { id: 'mud', name: 'Mud Pit' },
  { id: 'pads', name: 'Speed Pads' },
  { id: 'gusts', name: 'Gust Alley' },
  { id: 'slalom', name: 'Slalom Run' },
  { id: 'fortress', name: 'Fortress Cup' },
] as const

/** 200 shapes x 20 features = 4000 composite hole types. */
export const COMPOSITE_IDS: readonly string[] = SKELETONS.flatMap((s) => FEATURES.map((f) => `${s.id}-${f.id}`))

/** Every template id, in a stable order. */
export const ALL_TEMPLATE_IDS: readonly string[] = [...BASE_TEMPLATES, ...COMPOSITE_IDS]
