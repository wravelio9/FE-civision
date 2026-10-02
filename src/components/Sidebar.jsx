import { useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Icon } from './Icons'

// Items with a `to` path open a page. The others don't have a page yet.
const NAV_TOP = [
  { key: 'dashboard', label: 'Dashboard', icon: Icon.Dashboard, to: '/dashboard' },
  { key: 'report', label: 'Report Details', icon: Icon.Report, to: '/report' },
  { key: 'upload', label: 'Upload Media', icon: Icon.Upload, to: '/upload' },
]

const NAV_MID = [
  { key: 'profile', label: 'Profile', icon: Icon.Profile },
  { key: 'settings', label: 'Settings', icon: Icon.Settings },
  { key: 'help', label: 'Get Help', icon: Icon.Help },
]

function NavItem({ item }) {
  const IconComp = item.icon

  if (item.to) {
    // NavLink knows which page is open and marks its item as active.
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
      >
        <IconComp />
        <span>{item.label}</span>
      </NavLink>
    )
  }

  return (
    <button type="button" className="nav-item">
      <IconComp />
      <span>{item.label}</span>
    </button>
  )
}

// open / onClose are only used on small screens, where the sidebar slides in
// from the left. On desktop it's always visible and these do nothing.
export function Sidebar({ open = false, onClose }) {
  const navigate = useNavigate()
  const closeButtonRef = useRef(null)

  // Move keyboard focus into the sidebar when it slides in
  useEffect(() => {
    if (open) closeButtonRef.current?.focus()
  }, [open])

  return (
    <aside id="app-sidebar" className={`sidebar${open ? ' sidebar--open' : ''}`}>
      <div className="sidebar__logo">
        <span className="sidebar__logo-mark" />
        <span className="sidebar__logo-text">Civision</span>
        <button
          ref={closeButtonRef}
          type="button"
          className="sidebar__close"
          aria-label="Close menu"
          onClick={onClose}
        >
          <Icon.Close />
        </button>
      </div>

      <nav className="sidebar__nav">
        {NAV_TOP.map((item) => (
          <NavItem key={item.key} item={item} />
        ))}

        <div className="sidebar__divider" />

        {NAV_MID.map((item) => (
          <NavItem key={item.key} item={item} />
        ))}
      </nav>

      <button type="button" className="nav-item nav-item--logout" onClick={() => navigate('/')}>
        <Icon.Logout />
        <span>Logout</span>
      </button>
    </aside>
  )
}
