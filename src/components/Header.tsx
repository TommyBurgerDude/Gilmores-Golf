import type { ReactNode } from 'react'

interface Props {
  season: string
  children: ReactNode
}

export function Header({ season, children }: Props) {
  return (
    <header className="header panel">
      <div className="brand">
        <h1>Gilmore&apos;s Golf</h1>
        <p>
          {season}
        </p>
      </div>
      {children}
    </header>
  )
}
