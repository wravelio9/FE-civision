import { useNavigate } from 'react-router-dom'
import './Dashboard.css'
import Officer from '../../assets/officer-dashboard.png'

/* ---------- Inline icons (stroke-based, inherit currentColor) ---------- */
const Icon = {
  Dashboard: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" />
    </svg>
  ),
  Report: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3M12 4v11M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Profile: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.5-2.4 1a7 7 0 00-2-1.2l-.4-2.6H10l-.4 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.5 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1a7 7 0 002 1.2l.4 2.6h4l.4-2.6a7 7 0 002-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  Help: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9.5 9.5a2.5 2.5 0 013.9-2c1.2.8 1.1 2.3 0 3-.7.5-1.4.8-1.4 1.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M14 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2v-2M10 12h10M17 9l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 20a2 2 0 004 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
  Avatar: () => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="9.5" r="3.2" fill="currentColor" />
      <path d="M5.5 19c1-3 4-4.5 6.5-4.5S17.5 16 18.5 19" fill="currentColor" opacity="0.9" />
    </svg>
  ),
}

/* ---------- Mock table data ---------- */
const REVIEW_ROWS = Array.from({ length: 6 }, () => ({
  location: 'Jl. Jati Baru Raya',
  timestamp: '13:19:27',
  status: 'Valid',
}))

const NAV_TOP = [
  { key: 'dashboard', label: 'Dashboard', icon: Icon.Dashboard },
  { key: 'report', label: 'Report Details', icon: Icon.Report },
  { key: 'upload', label: 'Upload Media', icon: Icon.Upload },
]

const NAV_MID = [
  { key: 'profile', label: 'Profile', icon: Icon.Profile },
  { key: 'settings', label: 'Settings', icon: Icon.Settings },
  { key: 'help', label: 'Get Help', icon: Icon.Help },
]

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="dash">
      {/* ---------- Sidebar ---------- */}
      <aside className="sidebar">
        <div className="sidebar__logo">
          <span className="sidebar__logo-mark" />
          <span className="sidebar__logo-text">Civision</span>
        </div>

        <nav className="sidebar__nav">
          {NAV_TOP.map((item, i) => {
            const IconComp = item.icon
            return (
              <button
                key={item.key}
                className={`nav-item${i === 0 ? ' nav-item--active' : ''}`}
              >
                <IconComp />
                <span>{item.label}</span>
              </button>
            )
          })}

          <div className="sidebar__divider" />

          {NAV_MID.map((item) => {
            const IconComp = item.icon
            return (
              <button key={item.key} className="nav-item">
                <IconComp />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <button className="nav-item nav-item--logout" onClick={() => navigate('/')}>
          <Icon.Logout />
          <span>Logout</span>
        </button>
      </aside>

      {/* ---------- Main content ---------- */}
      <main className="main">
        {/* Top bar */}
        <header className="topbar">
          <div>
            <h1 className="topbar__title">Dashboard</h1>
            <p className="topbar__subtitle">09:10 AM - 22 September 2026</p>
          </div>
          <div className="topbar__actions">
            <button className="icon-btn" aria-label="Notifications">
              <Icon.Bell />
            </button>
            <button className="icon-btn" aria-label="Profile">
              <Icon.Avatar />
            </button>
          </div>
        </header>

        {/* Welcome banner */}
        <section className="banner">
          <div className="banner__text">
            <h2 className="banner__greeting">Good Morning, Name</h2>
            <p className="banner__desc">
              You currently have <a href="#incidents">10 new incidents</a> queued up for review.
              <br />
              Let&apos;s tackle them!
            </p>
            <button className="banner__btn">Review It</button>
          </div>
          <div className="banner__illustration" aria-hidden="true">
            <img className="officer-img" src={Officer} />
          </div>
        </section>

        {/* Review progress + map */}
        <section className="content">
          <div className="review">
            <div className="review__head">
              <h3 className="review__title">Review Progress</h3>
              <div className="search">
                <input className="search__input" placeholder="Search something..." />
                <button className="search__btn" aria-label="Search">
                  <Icon.Search />
                </button>
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {REVIEW_ROWS.map((row, i) => (
                  <tr key={i}>
                    <td className="table__location">{row.location}</td>
                    <td className="table__time">{row.timestamp}</td>
                    <td>
                      <span className="status status--valid">
                        <span className="status__dot" />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="map" aria-label="Map of incident locations">
            <div className="map__grid" />
            <span className="map__pin" style={{ top: '22%', left: '30%' }} />
            <span className="map__pin" style={{ top: '55%', left: '58%' }} />
            <span className="map__pin" style={{ top: '72%', left: '35%' }} />
          </div>
        </section>
      </main>
    </div>
  )
}

/* Simple flat officer illustration for the banner (inline SVG) */
function OfficerBanner() {
  return (
    <svg viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="banner__officer">
      {/* Body */}
      <path d="M60 220v-40c0-28 22-50 50-50s50 22 50 50v40H60Z" fill="#9fb4d8" />
      <path d="M110 130c-18 0-34 9-42 24h84c-8-15-24-24-42-24Z" fill="#7f97c4" />
      {/* Tie / collar */}
      <path d="M104 130l6 14 6-14-6-6-6 6Z" fill="#2d2b6b" />
      {/* Neck */}
      <rect x="98" y="92" width="24" height="30" rx="10" fill="#f2c9a8" />
      {/* Head */}
      <circle cx="110" cy="72" r="30" fill="#f7d3b3" />
      {/* Hair under cap */}
      <path d="M84 74c0-6 2-12 5-16 6 6 36 6 42 0 3 4 5 10 5 16-4-8-14-12-26-12s-22 4-26 12Z" fill="#1b1b1b" />
      {/* Cap */}
      <path d="M80 58c0-14 14-24 30-24s30 10 30 24H80Z" fill="#2d2b6b" />
      <rect x="78" y="58" width="64" height="8" rx="4" fill="#22214f" />
      <rect x="102" y="48" width="16" height="8" rx="2" fill="#e2b53a" />
      {/* Eyes */}
      <circle cx="100" cy="72" r="3.2" fill="#1b1b1b" />
      <circle cx="120" cy="72" r="3.2" fill="#1b1b1b" />
      {/* Smile */}
      <path d="M102 82c4 4 12 4 16 0" stroke="#c98b63" strokeWidth="3" strokeLinecap="round" />
      {/* Badge */}
      <circle cx="140" cy="150" r="8" fill="#e2b53a" />
    </svg>
  )
}
