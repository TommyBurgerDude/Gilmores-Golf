import { mulberry32 } from '../courses/prng'

/** Tiny Web Audio synth. Muted by default; the AudioContext is only created after an explicit user toggle. */
type SoundName = 'hit' | 'wall' | 'sand' | 'water' | 'hole' | 'portal'

class Sound {
  private ctx: AudioContext | null = null
  enabled = false

  setEnabled(on: boolean): void {
    this.enabled = on
    if (on) {
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        this.ctx ??= AC ? new AC() : null
        void this.ctx?.resume()
      } catch {
        this.ctx = null
      }
      this.play('hit', 0.4)
      this.startMusic()
    } else {
      this.stopMusic()
    }
  }

  // ------------------------------------------------------------ ambient music
  // A gentle generative loop: Cmaj7 - Am7 - Fmaj7 - G6, soft pad, arpeggio plucks and a sparse pentatonic melody.
  private musicBus: GainNode | null = null
  private musicTimer: number | null = null
  private musicStep = 0
  private musicNext = 0
  private musicRand = mulberry32(0x6011f)
  private visibilityHooked = false

  private startMusic(): void {
    const ctx = this.ctx
    if (!ctx || this.musicTimer !== null) return
    if (!this.musicBus) {
      const bus = ctx.createGain()
      bus.gain.value = 0
      const delay = ctx.createDelay(1)
      delay.delayTime.value = 0.42
      const fb = ctx.createGain()
      fb.gain.value = 0.32
      const wet = ctx.createGain()
      wet.gain.value = 0.28
      bus.connect(ctx.destination)
      bus.connect(delay)
      delay.connect(fb).connect(delay)
      delay.connect(wet).connect(ctx.destination)
      this.musicBus = bus
    }
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime)
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, ctx.currentTime)
    this.musicBus.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 2.5)
    this.musicNext = ctx.currentTime + 0.2
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 150)
    if (!this.visibilityHooked) {
      this.visibilityHooked = true
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return
        if (document.hidden) void this.ctx.suspend()
        else if (this.enabled) void this.ctx.resume()
      })
    }
  }

  private stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer)
      this.musicTimer = null
    }
    const ctx = this.ctx
    if (ctx && this.musicBus) {
      this.musicBus.gain.cancelScheduledValues(ctx.currentTime)
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, ctx.currentTime)
      this.musicBus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
    }
  }

  private musicNote(midi: number, at: number, dur: number, type: OscillatorType, vol: number, attack = 0.01): void {
    const ctx = this.ctx
    if (!ctx || !this.musicBus) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
    g.gain.setValueAtTime(0.0001, at)
    g.gain.linearRampToValueAtTime(vol, at + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    o.connect(g).connect(this.musicBus)
    o.start(at)
    o.stop(at + dur + 0.05)
  }

  private scheduleMusic(): void {
    const ctx = this.ctx
    if (!ctx) return
    const STEP = 60 / 76 / 2 // eighth note at 76 bpm
    const CHORDS = [
      [48, 52, 55, 59],
      [45, 48, 52, 55],
      [41, 45, 48, 52],
      [43, 47, 50, 52],
    ] as const
    const PENTA = [72, 74, 76, 79, 81, 84]
    while (this.musicNext < ctx.currentTime + 0.6) {
      const s = this.musicStep
      const bar = Math.floor(s / 8) % 4
      const pos = s % 8
      const chord = CHORDS[bar] as readonly number[]
      const t = this.musicNext
      if (pos === 0) {
        for (const n of chord) this.musicNote(n + 12, t, STEP * 8.5, 'sine', 0.035, 0.6)
        this.musicNote((chord[0] as number) - 12, t, STEP * 3.5, 'triangle', 0.11, 0.02)
      }
      if (pos === 4) this.musicNote((chord[0] as number) - 12 + (bar === 2 ? 7 : 0), t, STEP * 3, 'triangle', 0.08, 0.02)
      const arp = [0, 1, 2, 3, 2, 1, 2, 3][pos] as number
      this.musicNote((chord[arp] as number) + 24, t, STEP * 1.6, 'triangle', 0.045)
      if ((pos === 0 || pos === 3 || pos === 6) && this.musicRand() < 0.55) {
        const n = PENTA[Math.floor(this.musicRand() * PENTA.length)] as number
        this.musicNote(n, t, STEP * (1.5 + this.musicRand() * 2), 'sine', 0.06, 0.02)
      }
      this.musicStep += 1
      this.musicNext += STEP
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0): void {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime + delay
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(ctx.destination)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  private noise(dur: number, vol: number, cutoff: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const n = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, n, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let seed = 1234567
    for (let i = 0; i < n; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      data[i] = ((seed / 4294967296) * 2 - 1) * (1 - i / n)
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = cutoff
    const g = ctx.createGain()
    g.gain.value = vol
    src.connect(f).connect(g).connect(ctx.destination)
    src.start()
  }

  play(name: SoundName, intensity = 1): void {
    if (!this.enabled || !this.ctx) return
    const i = Math.min(1, Math.max(0.15, intensity))
    switch (name) {
      case 'hit':
        this.tone(220 + 160 * i, 0.07, 'square', 0.05 * i + 0.02, -120)
        break
      case 'wall':
        this.tone(140 + 60 * i, 0.06, 'triangle', 0.06 * i + 0.01, -50)
        break
      case 'sand':
        this.noise(0.12, 0.08, 900)
        break
      case 'water':
        this.tone(520, 0.25, 'sine', 0.06, -380)
        this.noise(0.2, 0.05, 1800)
        break
      case 'portal':
        this.tone(300, 0.18, 'sawtooth', 0.04, 400)
        break
      case 'hole':
        this.tone(523, 0.12, 'square', 0.05)
        this.tone(659, 0.12, 'square', 0.05, 0, 0.1)
        this.tone(784, 0.22, 'square', 0.05, 0, 0.2)
        break
    }
  }
}

export const sound = new Sound()
