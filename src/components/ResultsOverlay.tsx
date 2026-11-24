import { scoreResult } from '../game/scoring'

interface Props {
  strokes: number
  par: number
  onReplay: () => void
  onNext: () => void
}

export function ResultsOverlay({ strokes, par, onReplay, onNext }: Props) {
  const r = scoreResult(strokes, par)
  return (
    <div className="overlay delayed" role="dialog" aria-modal="true" aria-label="Round complete" data-testid="results">
      <div className="card panel">
        <h2>Round complete</h2>
        <div className="big" data-testid="result-strokes">
          {strokes}
        </div>
        <p>{strokes === 1 ? 'stroke' : 'strokes'}</p>
        <p className="name">
          {r.name} ({r.relative})
        </p>
        <p>Par {par}. Thanks for playing Gilmore&apos;s.</p>
        <div className="actions">
          <button type="button" className="btn" onClick={onReplay}>
            Replay
          </button>
          <button type="button" className="btn btn-primary" onClick={onNext} autoFocus>
            Next level
          </button>
        </div>
      </div>
    </div>
  )
}
