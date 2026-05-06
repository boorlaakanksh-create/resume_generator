import { AlertCircle, LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'
import { buildApiUnavailableMessage, readJsonResponse } from '../utils/http'

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          email,
          password
        })
      })

      const { data: payload, rawText } = await readJsonResponse(response)
      if (!response.ok) {
        throw new Error(payload?.error || 'Login failed')
      }

      if (!payload) {
        throw new Error(buildApiUnavailableMessage(rawText))
      }

      onLogin(payload.user)
    } catch (submitError) {
      setError(submitError.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur xl:grid-cols-[1.15fr_0.85fr]">
          <section className="hidden bg-slate-950 px-10 py-12 text-white xl:flex xl:flex-col xl:justify-between">
            <div>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
                <LockKeyhole className="h-7 w-7" />
              </div>
              <h1 className="mt-8 text-4xl font-semibold tracking-tight">Secure Resume Workspace</h1>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300">
                This application is locked to a single authenticated user. Resume generation stays in the browser. Tracker data remains protected behind a signed session cookie.
              </p>
            </div>

            <div className="grid gap-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-white">What is protected</p>
                <p className="mt-2 leading-6">Dashboard reads, writes, deletes, JD access, and resume re-download endpoints require an authenticated session.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-medium text-white">Session model</p>
                <p className="mt-2 leading-6">HTTP-only cookie, signed on the server, strict same-site policy, secure in production, and short API responses with no password exposure.</p>
              </div>
            </div>
          </section>

          <section className="px-6 py-8 sm:px-10 sm:py-12">
            <div className="mx-auto max-w-md">
              <div className="xl:hidden">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <LockKeyhole className="h-6 w-6" />
                </div>
                <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">Secure Resume Workspace</h1>
              </div>

              <div className="mt-4 xl:mt-0">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-600">Single User Access</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Sign in</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use your configured email and password to access the generator and application dashboard.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-10 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                </label>

                {error && (
                  <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <p className="mt-6 text-xs leading-5 text-slate-400">
                Local note: plain `vite` dev does not serve Vercel `/api` routes. Use deployed Vercel or `vercel dev` with auth and Redis env vars configured.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
