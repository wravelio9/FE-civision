import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/login/LoginPage.jsx'
import Dashboard from './pages/dashboard/Dashboard.jsx'
import ReportPage from './pages/report/ReportPage.jsx'
import UploadPage from './pages/upload/jsx/UploadPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/upload" element={<UploadPage />} />
      </Routes>
    </BrowserRouter>
  )
}
