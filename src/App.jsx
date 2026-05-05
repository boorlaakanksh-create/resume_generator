import { useState } from 'react'
import ResumeGenerator from './components/ResumeGenerator'
import Tracker from './components/Tracker'

export default function App() {
  const [tab, setTab] = useState('generate')

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 bg-white/90 shadow-sm backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Bhargav Resume Generator</h1>
            <p className="text-xs text-gray-500">Paste JSON from Claude - generate polished DOCX resumes</p>
          </div>

          <nav className="flex gap-1 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setTab('generate')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'generate'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Generate
            </button>
            <button
              onClick={() => setTab('tracker')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === 'tracker'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Application Dashboard
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'generate' && <ResumeGenerator />}
        {tab === 'tracker' && <Tracker />}
      </main>
    </div>
  )
}
