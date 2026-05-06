import { LogOut, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import LoginScreen from './components/LoginScreen'
import ResumeGenerator from './components/ResumeGenerator'
import Tracker from './components/Tracker'
import { buildApiUnavailableMessage, readJsonResponse } from './utils/http'

export default function App() {
  const [tab, setTab] = useState('generate')
  const [authLoading, setAuthLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    const loadSession = async () => {
      setAuthLoading(true)
      setAuthError('')

      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'same-origin'
        })
        const { data: payload, rawText } = await readJsonResponse(response)

        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load authentication status')
        }

        if (!payload) {
          throw new Error(buildApiUnavailableMessage(rawText))
        }

        setIsAuthenticated(Boolean(payload.authenticated))
        setCurrentUser(payload.user || null)
      } catch (error) {
        setIsAuthenticated(false)
        setCurrentUser(null)
        setAuthError(error.message || 'Unable to load authentication status')
      } finally {
        setAuthLoading(false)
      }
    }

    loadSession()
  }, [])

  const handleLogin = (user) => {
    setIsAuthenticated(true)
    setCurrentUser(user)
    setAuthError('')
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin'
      })
    } finally {
      setIsAuthenticated(false)
      setCurrentUser(null)
      setTab('generate')
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 px-8 py-6 text-center shadow-sm">
          <p className="text-sm font-medium text-white">Loading secure workspace...</p>
          <p className="mt-2 text-sm text-slate-400">Checking the active session.</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        {authError && (
          <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400 shadow-sm">
            {authError}
          </div>
        )}
        <LoginScreen onLogin={handleLogin} />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/90 shadow-sm backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Resume Generator</h1>
            <p className="text-xs text-slate-400">JSON to DOCX / PDF</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-400 md:flex">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <div className="leading-tight">
                <p className="font-medium text-white">Saibhargav Karne</p>
                <p className="text-xs text-slate-400">Signed in</p>
              </div>
            </div>

            <nav className="flex gap-1 rounded-xl bg-slate-800 p-1">
              <button
                onClick={() => setTab('generate')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === 'generate'
                    ? 'bg-slate-700 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Generate
              </button>
              <button
                onClick={() => setTab('tracker')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === 'tracker'
                    ? 'bg-slate-700 text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Application Dashboard
              </button>
            </nav>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'generate' && <ResumeGenerator />}
        {tab === 'tracker' && <Tracker />}
      </main>
    </div>
  )
}
