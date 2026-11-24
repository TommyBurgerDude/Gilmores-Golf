import { mulberry32 } from '../courses/prng'
import type { Course, Npc, Season, Vec } from '../courses/schema'
import { PATH_WIDTH } from './constants'
import type { Pose } from './people'
import { maskSdf } from './terrain'

export interface Bubble {
  text: string
  age: number
  ttl: number
}

export interface Spectator {
  x: number
  y: number
  look: number
  pose: Pose
  poseTime: number
  bubble: Bubble | null
  cooldown: number
  /** Walking along the fence line (1 or -1 = direction). */
  walking: boolean
  dir: 1 | -1
  stateTime: number
}

export type CrowdEvent =
  | 'shot'
  | 'bigshot'
  | 'tap'
  | 'first'
  | 'water'
  | 'oob'
  | 'hole'
  | 'sand'
  | 'near'
  | 'bounce'
  | 'green'
  | 'again'
  | 'portal'

const TAUNT = [
  'My nana putts better!',
  'Did you mean that?',
  'Bold strategy.',
  'Gilmore saw that.',
  'Nice swing. Wrong way.',
  'Is this your first time?',
  'Any day now...',
  'I have seen worse. Once.',
  'The windmill is laughing.',
  'Did you read the rules?',
  'A snail just passed you.',
  'My dog could do that.',
  'Ooh. Yikes.',
]
const SPLASH = ['SPLASH!', 'The pond says hi!', 'Swamp snack!', 'Ha! Fish food!', 'Nice dive!', 'Bring a snorkel!', 'Glug glug!', 'Ball overboard!']
const AGAIN = ['AGAIN?!', 'The water loves you.', 'Third time lucky?', 'Is it magnetic?', 'You are feeding the fish.']
const OOB = ['Wrong zip code!', 'Off the map!', 'That is a parking lot now.', 'Fore... wait, never mind.', 'Lost it!']
const CHEER_BIG = ['HOLE IN ONE?!', 'LEGEND!', 'UNBELIEVABLE!', 'Free hot dogs!', 'Hall of fame!', 'WOOOOOO!']
const CHEER = ['NICE ONE!', 'WOOOO!', 'Gilmore approves!', 'That is the stuff!', 'Frame that one!', 'Hole! Hole! Hole!', 'Smooth!', 'Clap clap clap!']
const MEH = ['Finally!', 'Well. It is in.', 'Got there eventually.', 'Fine. Fine.', 'Not pretty. Counts.']
const JEER = ['Took you long enough!', 'My coffee got cold.', 'Is it over? Is it over?', 'We aged a year.', 'Phew... at last!', 'Bring a lunch next time!']
const NEAR = ['So close!', 'Ooooh!', 'Aw, so close!', 'The cup said no.', 'Lip out!', 'Inches!']
const SAND = ['Sandy!', 'Beach day!', 'Buried treasure?', 'Gritty!']
const BOUNCE = ['Boing!', 'Ow, the fence!', 'Pinball!', 'Ricochet!']
const BIG = ['WHOA, easy!', 'Send it!', 'Full power!', 'Cannon!', 'Mind the pond!']
const TAP = ['Is that a putt or a nap?', 'Tap tap tap.', 'Gentle!', 'Did it even move?', 'Put some wrist in it.']
const FIRST = ["Let's go!", 'Here we go!', 'Good luck!', 'Eyes on the ball!', 'Show us something.']
const GREEN = ['Nice! On the green!', 'Smooth surface!', 'Now sink it!', 'Looking good!', 'Almost there!']
const PORTAL = ['Whoosh!', 'Magic!', 'Where did it go?!', 'Tunnel vision!']
const IDLE = [
  'Hot dogs! Two bucks!',
  "Gilmore's since '84!",
  'Mind the gnome.',
  'Is it Tuesday?',
  'Nice weather for it.',
  'Who parked that car?',
  'I smell nachos.',
  'I love this place.',
  'Did you see that duck?',
  'My feet hurt.',
  'Seen the windmill? Broke itself.',
]
const DOG = ['WOOF!', 'ARF ARF!', '*sniff sniff*', 'BARK!', 'AWOOO!']

type Pool = 'idle' | 'taunt' | 'cheer' | 'splash'

/** Theme flavour. Mixed with the generic lines so every theme still sounds like Gilmore's. */
const THEME_LINES: Partial<Record<Season, Record<Pool, readonly string[]>>> = {
  apocalypse: {
    idle: ['Seen any clean water?', 'Gilmore has the last hot dog.', 'The sky is a nice shade of orange.', 'I traded a boot for this club.', 'Mind the glowing puddle.'],
    taunt: ['Even the raiders putt better.', 'Wasting a perfectly good shot.', 'That swing cost you a ration.', 'Survival of the fittest? Not you.'],
    cheer: ['Better than a can of beans!', 'Wasteland legend!', 'We survived and you scored!', 'Shiny! Do it again!'],
    splash: ['Glowing! Ball is glowing!', 'Now it is radioactive!', 'Toxic swim!', 'Mutant fish incoming!'],
  },
  beach: {
    idle: ['Surf is up!', 'Anyone seen my sunscreen?', 'Smells like coconut.', 'Gilmore, a smoothie please!', 'Hang loose.'],
    taunt: ['Wipeout!', 'That is a wave of bad putting.', 'Sand in your swing?', 'Needs more sunscreen. And aim.'],
    cheer: ['Totally tubular!', 'Cowabunga!', 'Radical putt!', 'Catch that wave!'],
    splash: ['Surf and turf!', 'Ball went swimming!', 'Dive dive dive!', 'High tide!'],
  },
  mountain: {
    idle: ['Brisk up here.', 'Great view, terrible putting.', 'Altitude is no excuse.', 'Is that a yeti?', 'Watch out for avalanches.'],
    taunt: ['Downhill from here.', 'The mountain judges you.', 'Rocky start.', 'Climb back to the tee!'],
    cheer: ['Summit reached!', 'Peak performance!', 'Echo-worthy!', 'Reached the top!'],
    splash: ['Glacier plunge!', 'Brr! Cold water!', 'Alpine dip!', 'Ice cold!'],
  },
  forest: {
    idle: ['Smells like pine.', 'Heard an owl.', 'Careful, mushrooms.', 'Seen a bear? No? Good.', 'Marshmallows at six.'],
    taunt: ['You are barking up the wrong tree.', 'Even the squirrels are laughing.', 'Lost in the woods!', 'Branch out a little.'],
    cheer: ['Tree-mendous!', 'Wood you look at that!', 'Nature approves!', 'Great shot, ranger!'],
    splash: ['Frog pond!', 'Ribbit! Ball is a frog now.', 'Fishing for balls!', 'Creek plunge!'],
  },
  city: {
    idle: ['Taxi! Never mind.', 'I am late for a meeting.', 'Anyone got change?', 'Hot dogs, two bucks!', 'Honk if you like golf.'],
    taunt: ['That is a parking ticket.', 'You hit rush hour!', 'Take the bus next time.', 'Gridlock of a shot.'],
    cheer: ['Nailed it, downtown!', 'Big city big shot!', 'Standing ovation!', 'Skyscraper shot!'],
    splash: ['Fountain splash!', 'Make a wish!', 'Pigeons approve.', 'Gutter ball!'],
  },
  cyberpunk: {
    idle: ['Neon never sleeps.', 'My implant itches.', 'Nice chrome, chummer.', 'Rain again.', 'Hacking the scoreboard...'],
    taunt: ['Error 404: aim not found.', 'Low latency, high failure.', 'Even the bots putt better.', 'Syntax error in your swing.'],
    cheer: ['Jacked in and scoring!', 'Stellar, choom!', 'Overclocked!', 'Critical hit!'],
    splash: ['Short circuit!', 'Data leak!', 'Splashdown, system down.', 'Neon puddle!'],
  },
}

/** Cosmetic crowd: wanders the walkway and reacts to events with poses and speech bubbles. Never affects gameplay. */
export class Crowd {
  people: Spectator[]
  private course: Course
  private season: Season
  private rand = mulberry32(0xc0ffee)
  private ambient = 6

  constructor(npcs: Npc[], course: Course) {
    this.course = course
    this.season = course.meta.season
    this.people = npcs.map((n, i) => ({
      x: n.x,
      y: n.y,
      look: n.look,
      pose: 'idle',
      poseTime: 0,
      bubble: null,
      cooldown: 0,
      walking: i % 2 === 0,
      dir: i % 3 === 0 ? -1 : 1,
      stateTime: 1 + (i % 5),
    }))
  }

  /** A line from the theme's own pool most of the time, otherwise the generic one. */
  private line(pool: Pool, base: readonly string[]): string {
    const themed = THEME_LINES[this.season]?.[pool]
    return themed && this.rand() < 0.55 ? this.pick(themed) : this.pick(base)
  }

  private pick<T>(a: readonly T[]): T {
    return a[Math.floor(this.rand() * a.length)] as T
  }

  private nearest(p: Vec, count: number): Spectator[] {
    return [...this.people].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, count)
  }

  private say(s: Spectator, text: string, pose: Pose, ttl = 2.6): void {
    if (s.cooldown > 0 && pose !== 'cheer') return
    if (this.people.filter((p) => p.bubble).length >= 3 && !s.bubble) return
    s.bubble = { text: s.look === 7 ? this.pick(DOG) : text, age: 0, ttl }
    s.pose = pose
    s.poseTime = ttl * 0.8
    s.cooldown = 3.2
    s.walking = false
  }

  /** `strokes` matters for 'hole'; `ball` is where it happened. */
  react(ev: CrowdEvent, at: Vec, strokes = 0): void {
    if (this.people.length === 0) return
    const near = (n: number) => this.nearest(at, n)
    const one = (lines: readonly string[], pose: Pose, chance = 1) => {
      if (this.rand() > chance) return
      const [a] = near(1)
      if (a) this.say(a, this.pick(lines), pose)
    }
    switch (ev) {
      case 'water': {
        const [a, b] = near(2)
        if (a) this.say(a, this.line('splash', SPLASH), 'laugh')
        if (b) this.say(b, this.line('taunt', TAUNT), 'taunt')
        break
      }
      case 'again':
        one(AGAIN, 'laugh')
        break
      case 'oob':
        one(OOB, 'laugh')
        break
      case 'hole': {
        const big = strokes <= 2
        const good = strokes <= 3
        const lines = big ? CHEER_BIG : good ? CHEER : strokes >= 6 ? JEER : MEH
        const themedCheer = good
        const pose: Pose = strokes >= 6 ? 'laugh' : 'cheer'
        this.people.forEach((p, i) => {
          p.cooldown = 0
          p.walking = false
          if (i < 3 || big) this.say(p, themedCheer ? this.line('cheer', lines) : this.pick(lines), pose, 3.2)
          else {
            p.pose = pose
            p.poseTime = 3
          }
        })
        break
      }
      case 'near':
        one(NEAR, 'oops')
        break
      case 'sand':
        one(SAND, 'laugh', 0.4)
        break
      case 'bounce':
        one(BOUNCE, 'oops', 0.12)
        break
      case 'bigshot':
        one(BIG, 'oops', 0.5)
        break
      case 'tap':
        one(TAP, 'taunt', 0.6)
        break
      case 'first':
        one(FIRST, 'cheer', 0.6)
        break
      case 'green':
        one(GREEN, 'cheer', 0.5)
        break
      case 'portal':
        one(PORTAL, 'oops', 0.6)
        break
      case 'shot':
        if (strokes >= 4 && this.rand() < 0.45) one(TAUNT, 'taunt')
        break
    }
  }

  /** Walk one step along the walkway: follow the iso-line of the fence distance field. */
  private walk(p: Spectator, dt: number): void {
    const c = this.course
    const d = maskSdf(c, p.x, p.y)
    const e = 1
    const gx = maskSdf(c, p.x + e, p.y) - maskSdf(c, p.x - e, p.y)
    const gy = maskSdf(c, p.x, p.y + e) - maskSdf(c, p.x, p.y - e)
    const gl = Math.hypot(gx, gy)
    if (gl < 1e-6) return
    const nx = gx / gl
    const ny = gy / gl
    const speed = 17
    p.x += -ny * p.dir * speed * dt
    p.y += nx * p.dir * speed * dt
    const err = d - PATH_WIDTH * 0.5
    p.x -= nx * err * Math.min(1, 8 * dt)
    p.y -= ny * err * Math.min(1, 8 * dt)
    // Turn around at the edge of the view or when bumping into someone.
    const blocked = this.people.some((o) => o !== p && Math.hypot(o.x - p.x, o.y - p.y) < 13)
    if (p.x < -50 || p.x > 850 || p.y < -30 || p.y > 630 || blocked) {
      p.dir = p.dir === 1 ? -1 : 1
      p.stateTime = Math.min(p.stateTime, 0.4)
    }
  }

  update(dt: number, quiet: boolean, allowWalk = true): void {
    for (const p of this.people) {
      p.cooldown = Math.max(0, p.cooldown - dt)
      if (p.poseTime > 0) {
        p.poseTime -= dt
        if (p.poseTime <= 0) p.pose = 'idle'
      }
      if (p.bubble) {
        p.bubble.age += dt
        if (p.bubble.age >= p.bubble.ttl) p.bubble = null
      }
      if (!allowWalk || p.pose !== 'idle') continue
      p.stateTime -= dt
      if (p.stateTime <= 0) {
        p.walking = !p.walking
        p.stateTime = p.walking ? 3 + this.rand() * 7 : 2 + this.rand() * 5
        if (p.walking && this.rand() < 0.4) p.dir = p.dir === 1 ? -1 : 1
      }
      if (p.walking) this.walk(p, dt)
    }
    this.ambient -= dt
    if (this.ambient <= 0) {
      this.ambient = 8 + this.rand() * 7
      if (quiet && this.people.every((p) => !p.bubble)) {
        const s = this.pick(this.people)
        this.say(s, this.line('idle', IDLE), 'idle', 2.8)
      }
    }
  }

  reset(): void {
    for (const p of this.people) {
      p.pose = 'idle'
      p.poseTime = 0
      p.bubble = null
    }
  }
}
