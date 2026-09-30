import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './components/login/LoginPage.jsx'
import Dashboard from './components/dashboard/Dashboard.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
