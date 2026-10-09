import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icons'
import civisionLogo from '../../assets/civision-logo.png'
// Placeholder officer. Save the officer-on-the-street illustration from the Get Help
// design as src/assets/officer-help.png, then change this line to import that file instead.
import officerImg from '../../assets/officer-gethelp.png'
import './HelpPage.css'

// Full-screen help page (no sidebar). The back button returns to the dashboard.
export default function HelpPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [question, setQuestion] = useState('')

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Wire this up to the support API once it exists.
    console.log('Help request:', { email, question })
  }

  return (
    <div className="help-page">
      <header className="help-header">
        <button
          type="button"
          className="help-back"
          aria-label="Back to dashboard"
          onClick={() => navigate('/dashboard')}
        >
          <Icon.ChevronLeft />
        </button>
        <img className="help-logo" src={civisionLogo} alt="Civision" />
      </header>

      <main className="help-body">
        <div className="help-illustration" aria-hidden="true">
          <img src={officerImg} alt="" />
        </div>

        <section className="help-panel" aria-labelledby="help-title">
          <form className="help-form" onSubmit={handleSubmit}>
            <h1 id="help-title" className="help-title">
              How can we
              <br />
              help you today?
            </h1>

            <input
              type="email"
              className="help-input"
              placeholder="Email"
              aria-label="Email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <textarea
              className="help-input help-input--textarea"
              placeholder="Type Your Questions..."
              aria-label="Your question"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />

            <button type="submit" className="help-send">
              Send
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
