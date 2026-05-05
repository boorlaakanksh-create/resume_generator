import { useState, useEffect, useCallback } from 'react'
import { Download, Trash2, RefreshCw, BriefcaseIcon } from 'lucide-react'
import docxService from '../services/docxService'
import { PROFILE } from '../data/profile'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

export default function Tracker() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tracker')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setApplications(data)
    } catch (err) {
      setError('Could not load tracker. Make sure you are running on Vercel with Redis configured.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      await fetch(`/api/tracker?id=${id}`, { method: 'DELETE' })
      setApplications(prev => prev.filter(a => a.id !== id))
    } catch {
      // silently fail
    } finally {
      setDeletingId(null)
    }
  }

  const handleRedownload = async (app) => {
    setDownloadingId(app.id)
    try {
      // Fetch full record (with resumeJson) from API
      const res = await fetch(`/api/tracker?id=${app.id}`)
      if (!res.ok) throw new Error('Fetch failed')
      const full = await res.json()

      const parsed = full.resumeJson
      if (!parsed) throw new Error('No resume JSON stored')

      const resumeData = {
        personalInfo: PROFILE,
        contactLocation: parsed.contactLocation || 'Dallas, TX',
        summary: parsed.professionalSummary,
        skills: parsed.skills,
        experience: parsed.workExperience,
        education: PROFILE.education
      }

      await docxService.generateResume(resumeData, parsed.resumeMeta?.fileName || app.fileName)
    } catch (err) {
      console.error('Re-download failed:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading applications…
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <p className="text-yellow-800 font-medium mb-1">Tracker Unavailable</p>
        <p className="text-yellow-700 text-sm">{error}</p>
        <button
          onClick={fetchApplications}
          className="mt-4 text-sm text-yellow-700 underline hover:text-yellow-900"
        >
          Retry
        </button>
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 h-64 flex flex-col items-center justify-center text-center p-8">
        <BriefcaseIcon className="w-10 h-10 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">No applications tracked yet.</p>
        <p className="text-gray-400 text-xs mt-1">Save a resume from the Generate tab to track it here.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {applications.length} Application{applications.length !== 1 ? 's' : ''} Tracked
        </h2>
        <button
          onClick={fetchApplications}
          className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="space-y-3">
        {applications.map(app => (
          <div
            key={app.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3 flex-wrap">
                {app.company && (
                  <span className="font-semibold text-gray-900">{app.company}</span>
                )}
                {app.role && (
                  <span className="text-gray-600 text-sm">{app.role}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span className="font-mono">{app.fileName}</span>
                <span>·</span>
                <span>{formatDate(app.date)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleRedownload(app)}
                disabled={downloadingId === app.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {downloadingId === app.id ? 'Downloading…' : 'DOCX'}
              </button>

              <button
                onClick={() => handleDelete(app.id)}
                disabled={deletingId === app.id}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
