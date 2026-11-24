// Typed course data. Generation produces these; physics, validation and rendering consume them.
export interface Vec {
  x: number
  y: number
}

export type Terrain = 'rough' | 'fairway' | 'green' | 'sand' | 'water' | 'ice' | 'puddle'

export interface RectShape {
  t: 'rect'
  x: number
  y: number
  w: number
  h: number
}
export interface CircleShape {
  t: 'circle'
  x: number
  y: number
  r: number
}
/** A thick line segment (segment swept by radius r). */
export interface CapsuleShape {
  t: 'capsule'
  x1: number
  y1: number
  x2: number
  y2: number
  r: number
}
export type Shape = RectShape | CircleShape | CapsuleShape

/** Terrain patch. Later regions override earlier ones. `deck` marks a wooden bridge. */
export interface Region {
  terrain: Terrain
  shape: Shape
  deck?: boolean
}

/** Constant downhill acceleration (world units / s^2) inside a zone. */
/** 'slope' = hill, 'gust' = local wind, 'boost' = speed pad (only acts on a ball that is already moving). */
export type ZoneKind = 'slope' | 'gust' | 'boost'

export interface SlopeZone {
  kind?: ZoneKind
  shape: Shape
  ax: number
  ay: number
}

export type WallStyle = 'wood' | 'hedge' | 'tire' | 'clown' | 'castle' | 'hull' | 'windmill' | 'bouncer'
export interface Wall {
  /** Restitution override (> 1 makes a pop bumper that adds speed). */
  bounce?: number
  shape: Shape
  style: WallStyle
}

/** Optional tunnel: entering `a` exits `b` heading `dirB` (and vice versa). */
export interface Portal {
  a: Vec
  b: Vec
  r: number
  dirA: Vec
  dirB: Vec
}

export type PropKind =
  | 'gnome'
  | 'dino'
  | 'drainpipe'
  | 'cone'
  | 'weed'
  | 'flower'
  | 'tree'
  | 'bush'
  | 'rock'
  | 'clubhouse'
  | 'stand'
  | 'bench'
  | 'car'
  | 'lamp'
  | 'bin'
  | 'pond'
  | 'snowman'
  | 'pine'
  | 'deadtree'
  | 'palm'
  | 'rubble'
  | 'barrel'
  | 'crate'
  | 'umbrella'
  | 'towel'
  | 'sandcastle'
  | 'boulder'
  | 'log'
  | 'mushroom'
  | 'tent'
  | 'campfire'
  | 'building'
  | 'planter'
  | 'hydrant'
  | 'busstop'
  | 'neonsign'
  | 'antenna'
  | 'hologram'
export interface Prop {
  kind: PropKind
  x: number
  y: number
  variant: number
}

export type Season =
  | 'spring'
  | 'summer'
  | 'fall'
  | 'winter'
  | 'apocalypse'
  | 'beach'
  | 'mountain'
  | 'forest'
  | 'city'
  | 'cyberpunk'

export type TemplateId = string

export interface CourseMeta {
  level: number
  season: Season
  seed: number
  generatorVersion: number
  templateId: TemplateId
  templateName: string
  theme: string
  tier: number
  usedFallback: boolean
  flipX: boolean
  flipY: boolean
}

/** Deterministic moving obstacles: their position is a pure function of the game clock. */
export type Mover =
  | { kind: 'rotor'; x: number; y: number; arms: number; len: number; r: number; w: number; phase: number }
  | { kind: 'slider'; ax: number; ay: number; bx: number; by: number; bar: boolean; r: number; len: number; w: number; phase: number }
  | { kind: 'orbit'; x: number; y: number; R: number; r: number; w: number; phase: number }

export interface Course {
  meta: CourseMeta
  width: number
  height: number
  par: number
  tee: Vec
  cup: Vec & { r: number }
  regions: Region[]
  slopes: SlopeZone[]
  walls: Wall[]
  portals: Portal[]
  props: Prop[]
  npcs: Npc[]
  movers: Mover[]
  /** Constant acceleration on a moving ball (units/s^2). */
  wind: Vec
}

/** A spectator standing on the walkway. `look` picks a character design (7 = dog). */
export interface Npc {
  x: number
  y: number
  look: number
}
