interface Props {
  soundOn: boolean
  canReplay: boolean
  onToggleSound: () => void
  onReplay: () => void
}

export function Controls({ soundOn, canReplay, onToggleSound, onReplay }: Props) {
  return (
    <div className="controls">
      <button
        type="button"
        className="btn"
        aria-pressed={soundOn}
        aria-label={soundOn ? 'Sound on' : 'Sound off'}
        title="Toggle sound"
        onClick={onToggleSound}
      >
        {soundOn ? 'Sound: On' : 'Sound: Off'}
      </button>
      {canReplay && (
        <button type="button" className="btn" onClick={onReplay} aria-label="Reset this hole and start over">
          Replay
        </button>
      )}
    </div>
  )
}
