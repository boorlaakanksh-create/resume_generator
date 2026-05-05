import { useState } from 'react'
import ResumeGenerator from './components/ResumeGenerator'
import Tracker from './components/Tracker'

export default function App() {
  const [tab, setTab] = useState('generate')

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Bhargav Resume Generator</h1>
            <p className="text-xs text-gray-500">Paste JSON from Claude → Download DOCX</p>
          </div>
          <nav className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTab('generate')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'generate'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Generate
            </button>
            <button
              onClick={() => setTab('tracker')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'tracker'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Job Tracker
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
