import { useEffect, useState } from 'react'
import { Icon } from './Icons'
import { Time } from './Time'

export function Topbar({ title }) {
  // True once the page is scrolled down. Switches on the glass background.
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Tanggal hari ini, contoh: "22 September 2026"
  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <header className={`topbar${scrolled ? ' topbar--scrolled' : ''}`}>
      <div>
        <h1 className="topbar__title">{title}</h1>
        <p className="topbar__subtitle">
          <Time />
          <span className="topbar__date"> - {today}</span>
        </p>
      </div>
      <div className="topbar__actions">
        <button type="button" className="icon-btn" aria-label="Notifications">
          <Icon.Bell />
        </button>
        <button type="button" className="icon-btn" aria-label="Profile">
          <Icon.Avatar />
        </button>
      </div>
    </header>
  )
}
