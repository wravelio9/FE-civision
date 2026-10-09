import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import officerImg from '../../assets/officer-login.png'
import { EyeOff } from '../../components/EyeOff'
import { Eye } from '../../components/Eye'
import './LoginPage.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
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