import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import './AppLayout.css'

// Same breakpoint as AppLayout.css: above this the sidebar is always visible.
const DESKTOP_QUERY = '(min-width: 901px)'

// Shared shell for the pages after login: sidebar on the left,
// topbar + the page's own content on the right.
// fitScreen: lock the page to the screen height so it can't scroll (used by the Dashboard).
export function AppLayout({ title, fitScreen = false, children }) {
  // Only used on small screens, where the sidebar slides in from the left.
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const { pathname } = useLocation()

  const closeMenu = () => {
    setMenuOpen(false)
    menuButtonRef.current?.focus() // give focus back to the hamburger button
  }

  // Close the menu after navigating to another page
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // While the menu is open: Escape closes it, and the page behind can't scroll
  useEffect(() => {
    if (!menuOpen) return

    const handleKey = (e) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [menuOpen])

  // If the window gets wide again, the sidebar is always visible, so drop the open state
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY)
    const handleChange = (e) => {
      if (e.matches) setMenuOpen(false)
    }
    desktop.addEventListener('change', handleChange)
    return () => desktop.removeEventListener('change', handleChange)
  }, [])

  return (
    <div className={`app-layout${fitScreen ? ' app-layout--fit-screen' : ''}`}>
      <Sidebar open={menuOpen} onClose={closeMenu} />

      {/* Dark layer behind the open sidebar on small screens. Clicking it closes the menu. */}
      <div
        className={`sidebar-backdrop${menuOpen ? ' sidebar-backdrop--visible' : ''}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <main className="main">
        <Topbar
          title={title}
          menuOpen={menuOpen}
          menuButtonRef={menuButtonRef}
          onMenuClick={() => setMenuOpen(true)}
        />
        {/* Only the page content animates in. The sidebar and topbar stay static. */}
        <div className="page-content">{children}</div>
      </main>
    </div>
  )
}
