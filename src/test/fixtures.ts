import type { Course, Wall } from '../courses/schema'
import { CUP_R, PAR, WORLD_H, WORLD_W } from '../game/constants'

/** Flat, empty test course: one terrain everywhere, tee at (100,300), cup at (700,300). */
export function flatCourse(terrain: 'green' | 'fairway' | 'rough' | 'sand' = 'fairway', walls: Wall[] = []): Course {
  return {
    meta: {
      level: 1,
      season: 'summer',
      seed: 1,
      generatorVersion: 1,
      templateId: 'straight',
      templateName: 'Test',
      theme: 'test',
      tier: 1,
      usedFallback: false,
      flipX: false,
      flipY: false,
    },
    width: WORLD_W,
    height: WORLD_H,
    par: PAR,
    tee: { x: 100, y: 300 },
    cup: { x: 700, y: 300, r: CUP_R },
    regions: [{ terrain, shape: { t: 'rect', x: 0, y: 0, w: WORLD_W, h: WORLD_H } }],
    slopes: [],
    walls,
    portals: [],
    props: [],
    npcs: [],
    movers: [],
    wind: { x: 0, y: 0 },
  }
}

export const wallRect = (x: number, y: number, w: number, h: number): Wall => ({ shape: { t: 'rect', x, y, w, h }, style: 'wood' })
