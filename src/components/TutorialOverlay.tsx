export function TutorialOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="How to play">
      <div className="card panel">
        <h2>Welcome to Gilmore&apos;s!</h2>
        <p>A new rundown hole every time. Par is set for each hole from its route.</p>
        <ol className="steps">
          <li>
            <b>1</b> Press or tap near the ball.
          </li>
          <li>
            <b>2</b> Drag AWAY from where you want to go. Farther drag = harder hit.
          </li>
          <li>
            <b>3</b> Release to shoot. Water and out of bounds cost +1.
          </li>
        </ol>
        <button type="button" className="btn btn-primary" onClick={onClose} autoFocus>
          Let&apos;s putt
        </button>
      </div>
    </div>
  )
}
