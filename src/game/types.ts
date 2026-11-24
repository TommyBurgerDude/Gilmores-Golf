import type { Vec } from '../courses/schema'
import type { Prediction } from './trajectory'

/** Live slingshot state while the player is dragging. */
export interface AimState {
  /** Ball-relative drag vector, clamped to MAX_DRAG (points opposite the shot). */
  pull: Vec
  /** 0..1 */
  power: number
  /** Null until the drag exceeds the minimum distance. */
  prediction: Prediction | null
}

/** Snapshot pushed to the React UI. */
export interface GameStatus {
  phase: 'ready' | 'aiming' | 'rolling' | 'hazard' | 'complete'
  strokes: number
  penalties: number
  power: number
  hazard: 'water' | 'oob' | null
}
