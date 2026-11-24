import type { Terrain } from '../courses/schema'

export const WORLD_W = 800
export const WORLD_H = 600
/** One logical art pixel covers PIXEL world units. */
export const PIXEL = 2

export const BALL_R = 8
export const CUP_R = 11
export const PAR = 3

export const MAX_DRAG = 120
export const MIN_DRAG = 10
export const GRAB_RADIUS = 56
export const MAX_SPEED = 500
/** Launch speed for a 0..1 power. The sub-linear curve offsets friction so travel distance grows ~linearly with drag. */
export const powerToSpeed = (p: number): number => MAX_SPEED * Math.pow(Math.min(1, Math.max(0, p)), 0.7)

export const DT = 1 / 120
export const MAX_FRAME = 0.1
export const MAX_STEPS_PER_FRAME = 24

export const REST_SPEED = 7
export const REST_TIME = 0.3
export const WALL_RESTITUTION = 0.55
export const CAPTURE_SPEED = 230
export const PORTAL_COOLDOWN = 0.5
export const HAZARD_TIME = 0.8

export const PREDICT_SECONDS = 2

/**
 * Per-terrain rolling model: v *= exp(-k dt) (viscous) then speed -= c dt (constant),
 * both integrated per fixed step, so results do not depend on the render frame rate.
 * c must stay above the largest slope acceleration so a resting ball stays at rest.
 */
export const TERRAIN_PHYSICS: Record<Terrain, { k: number; c: number }> = {
  green: { k: 0.9, c: 30 },
  fairway: { k: 1.1, c: 34 },
  rough: { k: 2.2, c: 58 },
  sand: { k: 4.5, c: 110 },
  water: { k: 2.2, c: 58 },
  /** Near frictionless: balls skate across it. */
  ice: { k: 0.12, c: 3 },
  /** Rain puddle / mud / sludge: slows the ball a lot, no penalty. */
  puddle: { k: 3.4, c: 82 },
}

export const MAX_SLOPE = 26

/** The canvas shows a larger "view" than the playable world so scenery can surround the course. */
export const VIEW_X = 80
export const VIEW_Y = 60
export const VIEW_W = WORLD_W + VIEW_X * 2
export const VIEW_H = WORLD_H + VIEW_Y * 2
/** The playable area is every terrain region inflated by this margin; its edge is the fence. */
export const MASK_MARGIN = 28
/** Width of the gravel walkway outside the fence where spectators stand. */
export const PATH_WIDTH = 24

/** Speed pads only accelerate a ball that is already rolling at least this fast. */
export const BOOST_MIN_SPEED = 20
export const BOOST_ACCEL = 130
