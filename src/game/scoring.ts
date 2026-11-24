export interface ScoreResult {
  name: string
  /** "E", "-1", "+2" */
  relative: string
  diff: number
}

export function scoreResult(strokes: number, par: number): ScoreResult {
  const diff = strokes - par
  const relative = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`
  let name: string
  if (strokes === 1) name = 'Ace'
  else if (diff <= -3) name = 'Albatross'
  else if (diff === -2) name = 'Eagle'
  else if (diff === -1) name = 'Birdie'
  else if (diff === 0) name = 'Par'
  else if (diff === 1) name = 'Bogey'
  else if (diff === 2) name = 'Double Bogey'
  else name = `${diff} over par`
  return { name, relative, diff }
}
