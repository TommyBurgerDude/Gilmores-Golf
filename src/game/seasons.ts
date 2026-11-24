import type { PropKind, Season } from '../courses/schema'

type C3 = readonly [string, string, string]

/** What to scatter around the course. [kind, count, footprint radius, variants]. */
export interface Profile {
  pond: boolean
  stand: boolean
  cars: readonly [number, number]
  goofy: boolean
  benches: number
  lamps: number
  bins: number
  plants: readonly (readonly [PropKind, number, number, number])[]
}

export interface Theme {
  label: string
  /** Ice patches (snow) and puddles (rain) added per level, plus the strongest wind. */
  weather: { ice: number; puddles: number; wind: number }
  /** base, dark, tuft */
  rough: C3
  /** stripe A, stripe B, edge */
  fairway: C3
  /** check A, check B, edge */
  green: C3
  /** base, speckle, edge */
  sand: C3
  /** base, highlight, edge (ice / toxic / neon) */
  water: C3
  /** check A, check B, tuft, dark speck */
  lawn: readonly [string, string, string, string]
  lawnPattern: 'checker' | 'asphalt' | 'grid' | 'sand' | 'rock'
  /** gravel A, gravel B, light, kerb, fence shadow */
  path: readonly [string, string, string, string, string]
  pathPattern: 'gravel' | 'planks' | 'neon' | 'sidewalk'
  /** fence: dark outline, mid, light, inner shadow */
  fence: readonly [string, string, string, string]
  /** canopy palettes: outline, mid, light, highlight, shade */
  oak: readonly (readonly string[])[]
  /** outline, mid, light, shade */
  pine: readonly [string, string, string, string]
  /** outline, mid, highlight */
  bush: C3
  rock: C3
  snowCap: boolean
  flowers: boolean
  particles: { kind: 'snow' | 'leaf' | 'petal' | 'ash' | 'rain' | 'firefly' | 'neonrain' | null; colors: readonly string[]; count: number }
  /** clubhouse look */
  club: { wall: string; line: string; roof: string; roofDark: string; sign: string; door: string }
  carColors: readonly string[]
  awning: readonly [string, string]
  glow: string
  profile: Profile
}

const GREEN_OAK = ['#16401f', '#2c7a33', '#3f9b3f', '#6cc65c', '#245f2a']
const LUSH_OAK = ['#143b28', '#23764a', '#34a05a', '#62d27e', '#1d5e3d']
const ORANGE_OAK = ['#4f2210', '#bd5420', '#df7a2a', '#f4bc50', '#963c16']
const RED_OAK = ['#4a1410', '#a8321c', '#cf4a28', '#f08a50', '#7a2414']
const GOLD_OAK = ['#4a3410', '#c9a02a', '#e8c040', '#f8e070', '#9a7818']
const CHERRY = ['#7a2a48', '#e88ab0', '#f4a8c8', '#ffd0e2', '#c4608a']
const SNOW_OAK = ['#3a4a5a', '#b8cad6', '#dce8f0', '#ffffff', '#8aa0b2']
const DEEP_OAK = ['#0f2f1c', '#1d5a2c', '#2a7a3a', '#4aa04e', '#17482a']
const MOSS_OAK = ['#1b3a24', '#3a6a3a', '#5a8a48', '#86b068', '#2c5230']
const ASH_OAK = ['#2a2420', '#5a5048', '#7a7068', '#9a9088', '#3a322c']
const NEON_OAK = ['#1a0a30', '#6a1aa8', '#c02ad0', '#ff5ae8', '#40107a']
const TEAL_OAK = ['#08283a', '#0a6a78', '#10b0b8', '#5af0f0', '#074a58']

const STD: Profile = {
  pond: true,
  stand: true,
  cars: [1, 2],
  goofy: true,
  benches: 2,
  lamps: 4,
  bins: 2,
  plants: [
    ['tree', 36, 20, 3],
    ['bush', 16, 10, 2],
    ['rock', 8, 9, 2],
  ],
}

const CLUB_STD = { wall: '#f1e2b8', line: '#e0cf9e', roof: '#b8452c', roofDark: '#a23a24', sign: '#d94a2c', door: '#7a4a2a' }
const PINE_STD = ['#12301f', '#1f5d36', '#2f7d48', '#18482b'] as const
const ROCK_STD = ['#2a2a2e', '#9a9a9a', '#c8c4b8'] as const

export const THEMES: Record<Season, Theme> = {
  spring: {
    label: 'Spring',
    weather: { ice: 0, puddles: 3, wind: 0 },
    rough: ['#5ab14d', '#54a947', '#86d474'],
    fairway: ['#74d058', '#6cc650', '#3f8f35'],
    green: ['#92ec72', '#86e066', '#47a03a'],
    sand: ['#efd09a', '#cfa468', '#a88248'],
    water: ['#46a09a', '#6cc0b6', '#27605a'],
    lawn: ['#58b04c', '#52a846', '#8ad874', '#3f8a3a'],
    lawnPattern: 'checker',
    path: ['#d2bf98', '#c0ab82', '#e2d2ac', '#95825c', '#ac9870'],
    pathPattern: 'gravel',
    fence: ['#2a1a10', '#8a5e35', '#b98a55', '#4a2f1b'],
    oak: [GREEN_OAK, CHERRY, LUSH_OAK],
    pine: PINE_STD,
    bush: ['#16401f', '#2c7a33', '#6cc65c'],
    rock: ROCK_STD,
    snowCap: false,
    flowers: true,
    particles: { kind: 'petal', colors: ['#ffc0d8', '#ffe0ec', '#ff9ac0'], count: 28 },
    club: CLUB_STD,
    carColors: ['#c0392b', '#2e86c1', '#e8c33a', '#2f9e5f'],
    awning: ['#ff6b4a', '#f4e9c8'],
    glow: 'rgba(255,240,150,0.22)',
    profile: STD,
  },
  summer: {
    label: 'Summer',
    weather: { ice: 0, puddles: 0, wind: 0 },
    rough: ['#4f9443', '#488c3d', '#6bb25a'],
    fairway: ['#6cc24f', '#64b84a', '#2f6e2f'],
    green: ['#8be86a', '#7fdc5f', '#3f8f35'],
    sand: ['#ecca8c', '#c79a5a', '#a07a3e'],
    water: ['#3f8f8a', '#5a9f94', '#234d4a'],
    lawn: ['#4a9a45', '#448f40', '#68b858', '#357a38'],
    lawnPattern: 'checker',
    path: ['#cdb98f', '#bba67c', '#ddcba2', '#8f7d58', '#a8946a'],
    pathPattern: 'gravel',
    fence: ['#2a1a10', '#8a5e35', '#b98a55', '#4a2f1b'],
    oak: [GREEN_OAK, LUSH_OAK, GREEN_OAK],
    pine: PINE_STD,
    bush: ['#16401f', '#2c7a33', '#6cc65c'],
    rock: ROCK_STD,
    snowCap: false,
    flowers: true,
    particles: { kind: null, colors: [], count: 0 },
    club: CLUB_STD,
    carColors: ['#c0392b', '#2e86c1', '#e8c33a', '#2f9e5f'],
    awning: ['#ff6b4a', '#f4e9c8'],
    glow: 'rgba(255,240,150,0.22)',
    profile: STD,
  },
  fall: {
    label: 'Fall',
    weather: { ice: 0, puddles: 2, wind: 8 },
    rough: ['#8f8a3a', '#84803a', '#b8a24a'],
    fairway: ['#7fb04a', '#76a644', '#3f6e2a'],
    green: ['#9ad45a', '#8ec850', '#4f8f35'],
    sand: ['#e4c288', '#c09660', '#9a7646'],
    water: ['#437f78', '#5f9c90', '#25504a'],
    lawn: ['#8c8a3a', '#82803a', '#c4a84a', '#6a6a2c'],
    lawnPattern: 'checker',
    path: ['#c9ae82', '#b89c70', '#d8be94', '#8a6e46', '#a38660'],
    pathPattern: 'gravel',
    fence: ['#2a1a10', '#8a5e35', '#b98a55', '#4a2f1b'],
    oak: [ORANGE_OAK, RED_OAK, GOLD_OAK],
    pine: PINE_STD,
    bush: ['#4a2a10', '#9a6a2a', '#d4a24a'],
    rock: ROCK_STD,
    snowCap: false,
    flowers: false,
    particles: { kind: 'leaf', colors: ['#e07a2a', '#c0541f', '#f0b840', '#a8321c'], count: 30 },
    club: CLUB_STD,
    carColors: ['#a8421c', '#4a6a8a', '#c9a02a', '#6a5a3a'],
    awning: ['#e07a2a', '#f4e9c8'],
    glow: 'rgba(255,200,120,0.22)',
    profile: STD,
  },
  winter: {
    label: 'Winter',
    weather: { ice: 4, puddles: 0, wind: 0 },
    rough: ['#dfe9f0', '#d3e0ea', '#ffffff'],
    fairway: ['#b9d6c8', '#aecdbf', '#6f9a88'],
    green: ['#cfeadf', '#c4e3d6', '#7fb09c'],
    sand: ['#ebdfc8', '#d6c8aa', '#a89874'],
    water: ['#9fd0e0', '#c8eaf4', '#5a8fa8'],
    lawn: ['#eaf1f6', '#e0e9f0', '#ffffff', '#c9d6e0'],
    lawnPattern: 'checker',
    path: ['#c9c2b6', '#b9b2a6', '#d9d3c8', '#8a8278', '#a39b8f'],
    pathPattern: 'gravel',
    fence: ['#2a1a10', '#8a5e35', '#b98a55', '#4a2f1b'],
    oak: [SNOW_OAK, SNOW_OAK, SNOW_OAK],
    pine: PINE_STD,
    bush: ['#4a5a6a', '#cfdde6', '#ffffff'],
    rock: ROCK_STD,
    snowCap: true,
    flowers: false,
    particles: { kind: 'snow', colors: ['#ffffff', '#e8f2f8'], count: 70 },
    club: CLUB_STD,
    carColors: ['#c0392b', '#2e86c1', '#e8c33a', '#2f9e5f'],
    awning: ['#2e86c1', '#f4e9c8'],
    glow: 'rgba(255,240,150,0.3)',
    profile: { ...STD, plants: [['tree', 36, 20, 3], ['bush', 16, 10, 2], ['rock', 8, 9, 2], ['snowman', 2, 12, 1]] },
  },
  apocalypse: {
    label: 'Apocalypse',
    weather: { ice: 0, puddles: 4, wind: 8 },
    rough: ['#6a6454', '#5e584a', '#8a8268'],
    fairway: ['#7a8a4a', '#6e7e44', '#3e4a24'],
    green: ['#8aa05a', '#7e9452', '#4a5a2e'],
    sand: ['#b8a47a', '#9a8660', '#6e5e3e'],
    water: ['#6a9a2a', '#9ac43a', '#3a5a12'],
    lawn: ['#5a5648', '#524e42', '#7a745c', '#3e3a30'],
    lawnPattern: 'rock',
    path: ['#6a645a', '#5a554c', '#7e786c', '#3e3a32', '#4a463e'],
    pathPattern: 'gravel',
    fence: ['#1a1410', '#7a4a2a', '#b0703a', '#3a2412'],
    oak: [ASH_OAK, ASH_OAK, ASH_OAK],
    pine: ['#1a1612', '#3a3228', '#5a5044', '#2a241c'],
    bush: ['#2a2218', '#5a4a32', '#7a6a48'],
    rock: ['#1a1816', '#6a655c', '#8a857a'],
    snowCap: false,
    flowers: false,
    particles: { kind: 'ash', colors: ['#9a9088', '#c8c0b4', '#ff8a3a', '#6a645a'], count: 50 },
    club: { wall: '#8a7a68', line: '#6a5c4c', roof: '#4a3c30', roofDark: '#3a2e24', sign: '#a8421c', door: '#3a2a1c' },
    carColors: ['#6a3a22', '#5a5a52', '#7a4a1c', '#4a4640'],
    awning: ['#7a4a2a', '#9a8a68'],
    glow: 'rgba(255,140,60,0.28)',
    profile: {
      pond: true,
      stand: false,
      cars: [3, 5],
      goofy: false,
      benches: 1,
      lamps: 3,
      bins: 3,
      plants: [['deadtree', 24, 18, 2], ['rubble', 14, 12, 2], ['bush', 8, 10, 2], ['rock', 10, 9, 2], ['barrel', 6, 8, 1], ['crate', 4, 8, 1]],
    },
  },
  beach: {
    label: 'Beach',
    weather: { ice: 0, puddles: 0, wind: 12 },
    rough: ['#e6d29a', '#dcc68a', '#f4e4b0'],
    fairway: ['#7ad05a', '#72c652', '#3f8f35'],
    green: ['#98ec78', '#8ce06c', '#47a03a'],
    sand: ['#f6e4b0', '#e0c88a', '#b8a060'],
    water: ['#2ec4d4', '#8aeaf0', '#127a8a'],
    lawn: ['#f0dca0', '#e8d294', '#fff0c0', '#d8c484'],
    lawnPattern: 'sand',
    path: ['#b8844a', '#a8743c', '#c8945a', '#6a4424', '#8a5c30'],
    pathPattern: 'planks',
    fence: ['#4a2a10', '#d8b070', '#f0d090', '#8a6a3a'],
    oak: [TEAL_OAK, GREEN_OAK, LUSH_OAK],
    pine: PINE_STD,
    bush: ['#1a5a30', '#3aa050', '#8ae080'],
    rock: ['#4a3a2a', '#b8a888', '#dccca8'],
    snowCap: false,
    flowers: false,
    particles: { kind: null, colors: [], count: 0 },
    club: { wall: '#f6ead0', line: '#e4d4a8', roof: '#1aa8b8', roofDark: '#128a9a', sign: '#ff6b4a', door: '#8a5a2a' },
    carColors: ['#ff6b4a', '#2ec4d4', '#f2c94c', '#ffffff'],
    awning: ['#ff6b4a', '#ffffff'],
    glow: 'rgba(255,240,170,0.2)',
    profile: {
      pond: true,
      stand: true,
      cars: [0, 1],
      goofy: false,
      benches: 2,
      lamps: 2,
      bins: 2,
      plants: [['palm', 26, 16, 2], ['bush', 10, 10, 2], ['rock', 8, 9, 2], ['umbrella', 6, 16, 4], ['towel', 6, 12, 4], ['sandcastle', 3, 12, 1]],
    },
  },
  mountain: {
    label: 'Mountain',
    weather: { ice: 2, puddles: 0, wind: 10 },
    rough: ['#7a8a7a', '#6e7e6e', '#94a494'],
    fairway: ['#68b05a', '#60a652', '#3a7430'],
    green: ['#88d874', '#7ccc68', '#46923a'],
    sand: ['#d8ccb0', '#b8aa8c', '#8a7e62'],
    water: ['#4a8ab4', '#8ac4e8', '#245474'],
    lawn: ['#8a948a', '#7e887e', '#aab4aa', '#646e64'],
    lawnPattern: 'rock',
    path: ['#b0a898', '#9e9686', '#c8c0b0', '#6a6458', '#868074'],
    pathPattern: 'gravel',
    fence: ['#2a1a10', '#6a4a2a', '#9a7448', '#3a2814'],
    oak: [MOSS_OAK, DEEP_OAK, MOSS_OAK],
    pine: ['#0e2a28', '#1a5a50', '#2a7a6c', '#134238'],
    bush: ['#1a3a2a', '#3a6a4a', '#7aa07a'],
    rock: ['#2a2a30', '#7a7a84', '#aaaab4'],
    snowCap: true,
    flowers: false,
    particles: { kind: 'snow', colors: ['#ffffff', '#dce8f0'], count: 22 },
    club: { wall: '#9a6a3a', line: '#7a5028', roof: '#4a3a2c', roofDark: '#382c22', sign: '#f4e9c8', door: '#4a2c14' },
    carColors: ['#c0392b', '#2e5a86', '#e8c33a', '#3a3a3a'],
    awning: ['#2e86c1', '#f4e9c8'],
    glow: 'rgba(255,220,150,0.25)',
    profile: {
      pond: true,
      stand: false,
      cars: [0, 1],
      goofy: false,
      benches: 2,
      lamps: 2,
      bins: 2,
      plants: [['pine', 34, 20, 1], ['boulder', 14, 14, 2], ['rock', 10, 9, 2], ['bush', 6, 10, 2], ['log', 4, 12, 1], ['tent', 2, 22, 3]],
    },
  },
  forest: {
    label: 'Forest',
    weather: { ice: 0, puddles: 3, wind: 0 },
    rough: ['#3a7a3a', '#337033', '#5a9a52'],
    fairway: ['#58b048', '#50a640', '#2e6e2c'],
    green: ['#78d060', '#6cc454', '#3a8a30'],
    sand: ['#d4b480', '#b08a54', '#82643a'],
    water: ['#2a7a6a', '#4aa08a', '#154a40'],
    lawn: ['#2f6e34', '#2a642f', '#4a8a46', '#1f5226'],
    lawnPattern: 'checker',
    path: ['#9a7a4a', '#8a6a3c', '#b0905a', '#5a4224', '#74583a'],
    pathPattern: 'gravel',
    fence: ['#1a1008', '#5a3a1c', '#8a5e30', '#2a1a0c'],
    oak: [DEEP_OAK, MOSS_OAK, GREEN_OAK],
    pine: ['#0e2a1a', '#1a5a34', '#2a7a48', '#124028'],
    bush: ['#10301a', '#2a6a34', '#5a9a52'],
    rock: ['#1e2a1e', '#6a7a68', '#98a896'],
    snowCap: false,
    flowers: false,
    particles: { kind: 'firefly', colors: ['#ffe86a', '#d8ff7a'], count: 26 },
    club: { wall: '#6a4a2a', line: '#4e341c', roof: '#2f6a3a', roofDark: '#245230', sign: '#f2e0a8', door: '#3a2410' },
    carColors: ['#2e5a3a', '#8a5a2a', '#3a3a3a', '#6a2a2a'],
    awning: ['#2f6a3a', '#f4e9c8'],
    glow: 'rgba(210,255,150,0.22)',
    profile: {
      pond: true,
      stand: false,
      cars: [0, 1],
      goofy: false,
      benches: 2,
      lamps: 3,
      bins: 2,
      plants: [['tree', 44, 22, 3], ['pine', 14, 20, 1], ['bush', 20, 10, 2], ['mushroom', 12, 8, 3], ['log', 6, 12, 1], ['rock', 8, 9, 2], ['tent', 2, 22, 3], ['campfire', 1, 8, 1]],
    },
  },
  city: {
    label: 'City',
    weather: { ice: 0, puddles: 5, wind: 0 },
    rough: ['#8a8d94', '#80838a', '#a4a8b0'],
    fairway: ['#5ab04e', '#52a646', '#34702e'],
    green: ['#7ad864', '#6ecc58', '#3e8e34'],
    sand: ['#d4c4a0', '#b4a47c', '#8a7c58'],
    water: ['#3a7ab0', '#6aaee0', '#1e4a70'],
    lawn: ['#6a6d74', '#62656c', '#8a8e96', '#4a4d54'],
    lawnPattern: 'asphalt',
    path: ['#bcbcc0', '#aaaaae', '#d4d4d8', '#6a6a70', '#8a8a90'],
    pathPattern: 'sidewalk',
    fence: ['#1a1a20', '#7a7e88', '#a8acb6', '#3a3c44'],
    oak: [GREEN_OAK, LUSH_OAK, GREEN_OAK],
    pine: PINE_STD,
    bush: ['#16401f', '#2c7a33', '#6cc65c'],
    rock: ROCK_STD,
    snowCap: false,
    flowers: false,
    particles: { kind: 'rain', colors: ['#a8c4e0', '#c8dcf0'], count: 60 },
    club: { wall: '#9aa4b0', line: '#7e8894', roof: '#4a4a56', roofDark: '#3a3a44', sign: '#2e86c1', door: '#2a3a4a' },
    carColors: ['#e8c33a', '#c0392b', '#2e86c1', '#f4f4f4', '#2a2a2e'],
    awning: ['#2e86c1', '#f4e9c8'],
    glow: 'rgba(255,230,160,0.3)',
    profile: {
      pond: false,
      stand: true,
      cars: [3, 5],
      goofy: false,
      benches: 3,
      lamps: 8,
      bins: 4,
      plants: [['building', 7, 36, 3], ['planter', 10, 10, 2], ['hydrant', 5, 6, 1], ['busstop', 1, 26, 1], ['tree', 6, 20, 2]],
    },
  },
  cyberpunk: {
    label: 'Cyberpunk',
    weather: { ice: 0, puddles: 5, wind: 0 },
    rough: ['#2a2048', '#241a40', '#4a3a80'],
    fairway: ['#12807a', '#0e7470', '#05c8c0'],
    green: ['#18d0a0', '#12c494', '#00ffc8'],
    sand: ['#a8308a', '#8a2870', '#ff4ad0'],
    water: ['#1a50d0', '#40e0ff', '#00a8ff'],
    lawn: ['#16102e', '#120c28', '#ff2d95', '#0c0820'],
    lawnPattern: 'grid',
    path: ['#201840', '#1a1236', '#40e0ff', '#ff2d95', '#0e0a24'],
    pathPattern: 'neon',
    fence: ['#05d8ff', '#ff2d95', '#ffd0f0', '#2a0a4a'],
    oak: [NEON_OAK, TEAL_OAK, NEON_OAK],
    pine: ['#08283a', '#0a6a78', '#10b0b8', '#074a58'],
    bush: ['#1a0a30', '#6a1aa8', '#ff5ae8'],
    rock: ['#0e0a24', '#3a2a6a', '#6a50b0'],
    snowCap: false,
    flowers: false,
    particles: { kind: 'neonrain', colors: ['#ff2d95', '#40e0ff', '#a050ff'], count: 70 },
    club: { wall: '#2a2438', line: '#3a3050', roof: '#ff2d95', roofDark: '#c01a70', sign: '#40e0ff', door: '#0a0818' },
    carColors: ['#ff2d95', '#40e0ff', '#a050ff', '#ffe040'],
    awning: ['#ff2d95', '#40e0ff'],
    glow: 'rgba(64,224,255,0.3)',
    profile: {
      pond: true,
      stand: true,
      cars: [2, 3],
      goofy: false,
      benches: 1,
      lamps: 6,
      bins: 2,
      plants: [['building', 6, 36, 3], ['neonsign', 8, 10, 3], ['antenna', 4, 10, 1], ['hologram', 2, 16, 2], ['planter', 6, 10, 2], ['crate', 5, 8, 1], ['barrel', 3, 8, 1]],
    },
  },
}

let active: Season = 'summer'
export const setActiveSeason = (s: Season): void => {
  active = s
}
export const activeTheme = (): Theme => THEMES[active]
