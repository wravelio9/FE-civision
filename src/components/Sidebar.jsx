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

export function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <span className="sidebar__logo-mark" />
        <span className="sidebar__logo-text">Civision</span>
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
