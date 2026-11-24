import type { GameStatus } from '../game/types'

function message(s: GameStatus): { text: string; penalty?: boolean } {
  switch (s.phase) {
    case 'ready':
      return { text: s.strokes + s.penalties === 0 ? 'Press near the ball, drag back, release to putt.' : 'Your shot. Press near the ball and drag back.' }
    case 'aiming':
      return { text: 'Release to shoot. Drag farther for more power.' }
    case 'rolling':
      return { text: 'Rolling...' }
    case 'hazard':
      return { text: s.hazard === 'water' ? 'Splash! +1 penalty stroke.' : 'Out of bounds! +1 penalty stroke.', penalty: true }
    case 'complete':
      return { text: "In the hole!" }
  }
}

const ARROWS = ['\u2192', '\u2198', '\u2193', '\u2199', '\u2190', '\u2196', '\u2191', '\u2197']

function windLabel(wx: number, wy: number): string | null {
  const mag = Math.hypot(wx, wy)
  if (mag < 0.5) return null
  const oct = Math.round((Math.atan2(wy, wx) / (Math.PI * 2)) * 8 + 8) % 8
  return `${ARROWS[oct]} ${mag < 7 ? 'light breeze' : mag < 11 ? 'breezy' : 'gusty'}`
}

export function HUD({ status, holeName, wind, par }: { status: GameStatus; holeName: string; wind: { x: number; y: number }; par: number }) {
  const wl = windLabel(wind.x, wind.y)
  const m = message(status)
  const total = status.strokes + status.penalties
  return (
    <section className="hud panel" aria-label="Game status">
      <div className="stat">
        <span>Par</span>
        <strong data-testid="par">{par}</strong>
      </div>
      <div className="stat">
        <span>Strokes</span>
        <strong data-testid="strokes" aria-live="polite">
          {total}
        </strong>
      </div>
      <div className="msg" aria-live="polite">
        <span className="hole">
          {holeName}
          {wl && <span data-testid="wind"> · Wind {wl}</span>}
        </span>
        <span className={m.penalty ? 'penalty' : undefined} data-testid="status-text">
          {m.text}
        </span>
        {status.penalties > 0 && status.phase !== 'hazard' && <span className="hole"> Includes {status.penalties} penalty</span>}
      </div>
      <div className="power" aria-hidden="true">
        <span>Power</span>
        <div className="power-track">
          <div className="power-fill" style={{ width: `${Math.round(status.power * 100)}%` }} />
        </div>
      </div>
    </section>
  )
}
