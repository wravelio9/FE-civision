import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/feat-login/LoginPage.jsx'
import Dashboard from './pages/feat-dashboard/Dashboard.jsx'
import ReportPage from './pages/feat-report/ReportPage.jsx'
import UploadPage from './pages/feat-upload/jsx/UploadPage.jsx'
import ProfilePage from './pages/feat-profile/ProfilePage.jsx'
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  )
}
