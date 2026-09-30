import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import officerImg from '../../assets/officer-login.png'
import './LoginPage.css'

// Eye icons for the password visibility toggle
function EyeOff() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.7a2 2 0 002.8 2.8M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 10 7-.5 1.3-1.6 3-3.3 4.4M6.1 6.2C4 7.6 2.6 9.6 2 12c1 2.5 5 7 10 7 1.4 0 2.7-.3 3.9-.9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Eye() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    // Wire this up to your auth API. On success, go to the dashboard.
    console.log('Login attempt:', { email, password })
    navigate('/dashboard')
  }

  return (
    <div className="page">
      <div className="card">
        {/* Left panel: officer photo on purple gradient */}
        <div className="card__illustration">
          <img className="officer-img" src={officerImg} />
        </div>

        {/* Right panel: login form */}
        <div className="card__form">
          <h1 className="form__title">Welcome Back!</h1>

          <form onSubmit={handleSubmit} className="form">
            <div className="field">
              <input
                id="email"
                type="email"
                className="field__input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="field">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="field__input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="field__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <Eye /> : <EyeOff />}
              </button>
            </div>

            <div className="form__row">
              <a className="form__forgot" href="#forgot">
                Forgot Password?
              </a>
              <button type="submit" className="form__submit">
                Log In
              </button>
            </div>
          </form>

          <p className="form__support">
            Having trouble signing in? <a href="#support">Get Support.</a>
          </p>
        </div>
      </div>
    </div>
  )
}