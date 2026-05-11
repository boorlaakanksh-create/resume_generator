import { Component, useState } from 'react'
import ResumeGenerator from './components/ResumeGenerator'
import Tracker from './components/Tracker'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
    this.handleReset = this.handleReset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Resume generator render failed:', error, info)
  }

  handleReset() {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="rounded-3xl border border-red-800/50 bg-red-950/40 p-6 text-red-100">
        <h2 className="text-lg font-semibold">Something in the parsed resume data caused a render error.</h2>
        <p className="mt-2 text-sm text-red-200">
          The page is still running. Reset this view, then paste the JSON again after checking for nested objects in summary, skills, or work experience.
        </p>
        <pre className="mt-4 overflow-auto rounded-2xl bg-red-950/70 p-4 text-xs text-red-100">
          {this.state.error.message}
        </pre>
        <button
          onClick={this.handleReset}
          className="mt-4 rounded-2xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
        >
          Reset View
        </button>
      </div>
    )
  }
}

export default function App() {
  const [tab, setTab] = useState('generate')

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/90 shadow-sm backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Resume Generator</h1>
            <p className="text-xs text-slate-400">JSON to DOCX / PDF</p>
          </div>

          <div className="flex items-center gap-4">
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
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <ErrorBoundary key={tab}>
          {tab === 'generate' && <ResumeGenerator />}
          {tab === 'tracker' && <Tracker />}
        </ErrorBoundary>
      </main>
    </div>
  )
}
