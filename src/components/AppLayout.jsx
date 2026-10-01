import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import './AppLayout.css'

// Shared shell for the pages after login: sidebar on the left,
// topbar + the page's own content on the right.
export function AppLayout({ title, children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main">
        <Topbar title={title} />
        {children}
      </main>
    </div>
  )
}
