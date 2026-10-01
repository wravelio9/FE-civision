import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import './AppLayout.css'

// Shared shell for the pages after login: sidebar on the left,
// topbar + the page's own content on the right.
// fitScreen: lock the page to the screen height so it can't scroll (used by the Dashboard).
export function AppLayout({ title, fitScreen = false, children }) {
  return (
    <div className={`app-layout${fitScreen ? ' app-layout--fit-screen' : ''}`}>
      <Sidebar />
      <main className="main">
        <Topbar title={title} />
        {children}
      </main>
    </div>
  )
}
