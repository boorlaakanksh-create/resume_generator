import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import ResumeGenerator from './components/ResumeGenerator'
import Tracker from './components/Tracker'

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
        {tab === 'generate' && <ResumeGenerator />}
        {tab === 'tracker' && <Tracker />}
      </main>
    </div>
  )
}
