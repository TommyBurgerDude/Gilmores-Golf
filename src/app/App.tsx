import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Controls } from '../components/Controls'
import { GameCanvas } from '../components/GameCanvas'
import { Header } from '../components/Header'
import { HUD } from '../components/HUD'
import { ResultsOverlay } from '../components/ResultsOverlay'
import { TutorialOverlay } from '../components/TutorialOverlay'
import { generateCourse } from '../courses/generator'
import { SEASON_LABEL, clampLevel, pickNextLevel } from '../courses/levels'
import type { Season, TemplateId } from '../courses/schema'
import { sound } from '../game/audio'
import type { GameStatus } from '../game/types'
import '../styles/global.css'
import '../styles/game.css'

/** Non-seeded randomness only picks WHICH level to play next; every level itself is deterministic. */
function browserRandom(): number {
  return (crypto.getRandomValues(new Uint32Array(1))[0] as number) / 4294967296
}

/** Narrow portrait screens (phones): the board is rotated a quarter turn so the 4:3 course fills the width. */
const PORTRAIT_PHONE = '(max-width: 640px) and (orientation: portrait)'
function usePortraitPhone(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(PORTRAIT_PHONE)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(PORTRAIT_PHONE).matches,
    () => false,
  )
}

const INITIAL: GameStatus = { phase: 'ready', strokes: 0, penalties: 0, power: 0, hazard: null }

/** Developer-only URL options (stripped from production builds): ?debug, ?level=N, ?template=<id>, ?theme=<id> */
function devOptions() {
  if (!import.meta.env.DEV) return { debug: false, level: null, template: undefined, theme: undefined }
  const q = new URLSearchParams(window.location.search)
  return {
    debug: q.has('debug'),
    level: q.has('level') ? clampLevel(Number(q.get('level'))) : null,
    template: (q.get('template') as TemplateId | null) ?? undefined,
    theme: (q.get('theme') as Season | null) ?? undefined,
  }
}

export default function App() {
  const [dev] = useState(devOptions)
  const rotated = usePortraitPhone()
  const recent = useRef<number[]>([])
  const [level, setLevel] = useState(() => dev.level ?? pickNextLevel(browserRandom, []))
  const course = useMemo(() => generateCourse(level, dev.template, dev.theme), [level, dev.template, dev.theme])
  const [status, setStatus] = useState<GameStatus>(INITIAL)
  const [soundOn, setSoundOn] = useState(false)
  const [showTutorial, setShowTutorial] = useState(true)
  const [resetToken, setResetToken] = useState(0)

  const onStatus = useCallback((s: GameStatus) => setStatus(s), [])
  const replay = useCallback(() => {
    setResetToken((n) => n + 1)
    setStatus(INITIAL)
  }, [])
  const nextLevel = useCallback(() => {
    if (!recent.current.includes(level)) recent.current.push(level)
    setLevel(pickNextLevel(browserRandom, recent.current))
    setStatus(INITIAL)
  }, [level])
  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      sound.setEnabled(!on)
      return !on
    })
  }, [])

  const total = status.strokes + status.penalties
  return (
    <main className="app">
      <Header season={SEASON_LABEL[course.meta.season]}>
        <Controls soundOn={soundOn} canReplay={total > 0 || status.phase === 'complete'} onToggleSound={toggleSound} onReplay={replay} />
      </Header>
      <div className="stage-wrap">
        <div className={rotated ? 'stage stage-rotated' : 'stage'}>
          <GameCanvas course={course} resetToken={resetToken} debug={dev.debug} rotated={rotated} onStatus={onStatus} />
          {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
          {status.phase === 'complete' && <ResultsOverlay strokes={total} par={course.par} onReplay={replay} onNext={nextLevel} />}
        </div>
      </div>
      <HUD status={status} holeName={course.meta.templateName} wind={course.wind} par={course.par} />
      {dev.debug && <div className="debug-note">debug view on (dev build only)</div>}
    </main>
  )
}
