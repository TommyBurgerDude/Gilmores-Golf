/** Canvas palette. Keep in sync with the CSS variables in styles/global.css. */
export const PAL = {
  forest: '#1f4d2b', // deep forest green
  green: '#8be86a', // bright putting green
  greenDark: '#7fdc5f',
  greenEdge: '#3f8f35',
  fairway: '#6cc24f',
  fairwayLight: '#64b84a',
  fairwayDark: '#438a36',
  fairwayEdge: '#2f6e2f',
  olive: '#4f9443', // patchy olive grass
  oliveDark: '#488c3d',
  oliveLight: '#6bb25a',
  dirt: '#9b8450',
  dirtDark: '#7f6a3f',
  sand: '#ecca8c', // warm tan sand
  sandDark: '#c79a5a',
  sandLight: '#f0d49a',
  sandEdge: '#a07a3e',
  water: '#3f8f8a', // muddy blue-green
  waterLight: '#5a9f94',
  waterDark: '#2f6662',
  waterEdge: '#234d4a',
  wood: '#8a5e35', // weathered wood
  woodLight: '#a8784a',
  woodDark: '#4a2f1b',
  woodPale: '#c49a64',
  cream: '#f4e9c8',
  charcoal: '#2a2a2e',
  coral: '#ff6b4a',
  stone: '#a8a08e',
  stoneDark: '#8a7a62',
  stoneHole: '#4a3f33',
  white: '#ffffff',
  yellow: '#f2c94c',
  blue: '#4a6fa5',
  grey: '#9d9686',
  greyDark: '#6a6a70',
} as const

export function packColor(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0
}

export function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}
