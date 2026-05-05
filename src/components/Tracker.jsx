import { useCallback, useEffect, useMemo, useState } from 'react'
import { BriefcaseIcon, Download, RefreshCw, Search, Trash2 } from 'lucide-react'
import docxService from '../services/docxService'
import { DEFAULT_PROFILE_ID, getProfileById } from '../data/profiles'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function getStartOfDay(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function countSince(applications, days) {
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000
  return applications.filter((application) => new Date(application.date).getTime() >= threshold).length
}

function includesValue(value, term) {
  return value?.toLowerCase().includes(term)
}

const FILTER_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 Days' },
  { id: 'month', label: 'Last 30 Days' }
]

export default function Tracker() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [downloadingPdfFileId, setDownloadingPdfFileId] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/tracker')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setApplications(data)
    } catch (err) {
      setError('Could not load the dashboard. Make sure you are running on Vercel with Redis configured.')
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
      setApplications((prev) => prev.filter((application) => application.id !== id))
    } catch {
      // keep the current list if deletion fails
    } finally {
      setDeletingId(null)
    }
  }

  const handleRedownload = async (application) => {
    setDownloadingId(application.id)

    try {
      const res = await fetch(`/api/tracker?id=${application.id}`)
      if (!res.ok) throw new Error('Fetch failed')
      const full = await res.json()

      const parsed = full.resumeJson
      if (!parsed) throw new Error('No resume JSON stored')

      const selectedProfile = getProfileById(full.profileId || application.profileId || DEFAULT_PROFILE_ID)

      const resumeData = {
        personalInfo: selectedProfile.personalInfo,
        contactLocation: parsed.contactLocation || 'Dallas, TX',
        jobTitle: parsed.jobTitle || '',
        summary: parsed.professionalSummary,
        skills: parsed.skills,
        experience: parsed.workExperience,
        education: selectedProfile.education,
        certifications: selectedProfile.certifications
      }

      await docxService.generateResume(resumeData, parsed.resumeMeta?.fileName || application.fileName)
    } catch (err) {
      console.error('Re-download failed:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleRedownloadPdfFile = async (application) => {
    setDownloadingPdfFileId(application.id)

    try {
      const res = await fetch(`/api/tracker?id=${application.id}`)
      if (!res.ok) throw new Error('Fetch failed')
      const full = await res.json()

      const parsed = full.resumeJson
      if (!parsed) throw new Error('No resume JSON stored')

      const selectedProfile = getProfileById(full.profileId || application.profileId || DEFAULT_PROFILE_ID)

      const resumeData = {
        personalInfo: selectedProfile.personalInfo,
        contactLocation: parsed.contactLocation || 'Dallas, TX',
        jobTitle: parsed.jobTitle || '',
        summary: parsed.professionalSummary,
        skills: parsed.skills,
        experience: parsed.workExperience,
        education: selectedProfile.education,
        certifications: selectedProfile.certifications
      }

      await docxService.generateResumePdfFile(resumeData, parsed.resumeMeta?.fileName || application.fileName)
    } catch (err) {
      console.error('PDF file download failed:', err)
    } finally {
      setDownloadingPdfFileId(null)
    }
  }

  const filteredApplications = useMemo(() => {
    const now = Date.now()
    const lowerSearch = searchTerm.trim().toLowerCase()

    return applications.filter((application) => {
      const applicationTime = new Date(application.date).getTime()

      const filterMatch = (() => {
        if (activeFilter === 'today') return applicationTime >= now - 24 * 60 * 60 * 1000
        if (activeFilter === 'week') return applicationTime >= now - 7 * 24 * 60 * 60 * 1000
        if (activeFilter === 'month') return applicationTime >= now - 30 * 24 * 60 * 60 * 1000
        return true
      })()

      const dateMatch = selectedDate
        ? getStartOfDay(application.date).getTime() === getStartOfDay(selectedDate).getTime()
        : true

      const searchMatch = lowerSearch
        ? (
            includesValue(application.company, lowerSearch) ||
            includesValue(application.role, lowerSearch) ||
            includesValue(application.fileName, lowerSearch)
          )
        : true

      return filterMatch && dateMatch && searchMatch
    })
  }, [activeFilter, applications, searchTerm, selectedDate])

  const stats = useMemo(() => {
    const last24Hours = countSince(applications, 1)
    const last7Days = countSince(applications, 7)
    const last30Days = countSince(applications, 30)

    return [
      {
        label: 'Last 24 Hours',
        value: last24Hours,
        subtitle: `${last24Hours} application${last24Hours === 1 ? '' : 's'} submitted`
      },
      {
        label: 'Last 7 Days',
        value: last7Days,
        subtitle: `~${Math.round(last7Days / 7 || 0)} per day average`
      },
      {
        label: 'Last 30 Days',
        value: last30Days,
        subtitle: `~${Math.round(last30Days / 4 || 0)} per week average`
      },
      {
        label: 'Total',
        value: applications.length,
        subtitle: 'all-time applications',
        accent: true
      }
    ]
  }, [applications])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading dashboard...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-6 text-center">
        <p className="mb-1 font-medium text-yellow-800">Application Dashboard Unavailable</p>
        <p className="text-sm text-yellow-700">{error}</p>
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
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white h-64 flex flex-col items-center justify-center text-center p-8">
        <BriefcaseIcon className="mb-4 h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">No applications tracked yet.</p>
        <p className="mt-1 text-xs text-gray-400">Saving from the Generate tab marks the job as applied.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-3xl bg-white px-6 py-5 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold text-slate-700">{stat.label}</p>
            <p className={`mt-3 text-5xl font-bold tracking-tight ${stat.accent ? 'text-blue-600' : 'text-slate-900'}`}>
              {stat.value}
            </p>
            <p className="mt-2 text-sm text-slate-600">{stat.subtitle}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-5 text-emerald-800 shadow-sm">
        <p className="text-sm font-medium">
          Saved resumes are treated as applied jobs. Use the DOCX button on each row to download the submitted version again.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-[0_22px_50px_rgba(15,23,42,0.10)]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Filter &amp; Search</h2>
            <p className="mt-1 text-sm text-slate-500">
              Narrow applications by applied date, recent activity, or company and role keywords.
            </p>
          </div>
          <button
            onClick={fetchApplications}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-slate-300 hover:text-slate-900"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-medium">Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="h-12 rounded-2xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-500"
              />
            </label>

            <button
              onClick={() => setSelectedDate('')}
              className="h-12 rounded-2xl bg-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
            >
              Clear Date
            </button>

            <div className="flex flex-wrap gap-3">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setActiveFilter(option.id)}
                  className={`h-12 rounded-2xl px-5 text-sm font-semibold transition ${
                    activeFilter === option.id
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              setSearchTerm(searchInput)
            }}
            className="flex w-full max-w-xl gap-3"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search jobs..."
                className="h-12 w-full rounded-2xl border border-slate-300 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 px-6 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-sky-600"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Applications</h2>
            <p className="text-sm text-slate-500">
              Showing {filteredApplications.length} of {applications.length} saved application{applications.length === 1 ? '' : 's'}.
            </p>
          </div>
        </div>

        {filteredApplications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-12 text-center text-slate-500">
            No applications match the current filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <article
                key={application.id}
                className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xl font-semibold text-slate-900">
                        {application.company || 'Unknown Company'}
                      </span>
                      {application.role && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                          {application.role}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                      <span className="font-mono text-xs text-slate-400">{application.fileName}</span>
                      {application.profileLabel && <span>{application.profileLabel}</span>}
                      <span>Applied {formatDate(application.date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleRedownload(application)}
                      disabled={downloadingId === application.id}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      {downloadingId === application.id ? 'Downloading...' : 'Download DOCX'}
                    </button>

                    <button
                      onClick={() => handleRedownloadPdfFile(application)}
                      disabled={downloadingPdfFileId === application.id}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      {downloadingPdfFileId === application.id ? 'Building...' : 'PDF File'}
                    </button>

                    <button
                      onClick={() => handleDelete(application.id)}
                      disabled={deletingId === application.id}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
