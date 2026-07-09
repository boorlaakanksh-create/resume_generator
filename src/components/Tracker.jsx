import { useCallback, useEffect, useMemo, useState } from 'react'
import { BriefcaseIcon, ChevronDown, Download, Eye, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { DEFAULT_PROFILE_ID, RESUME_PROFILES, getProfileById } from '../data/profiles'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function parseDateInput(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function isSameLocalDate(firstValue, secondValue) {
  const firstDate = new Date(firstValue)
  const secondDate = typeof secondValue === 'string' ? parseDateInput(secondValue) : new Date(secondValue)
  if (!secondDate || Number.isNaN(firstDate.getTime()) || Number.isNaN(secondDate.getTime())) return false

  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  )
}

function countSince(applications, days) {
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000
  return applications.filter((application) => new Date(application.date).getTime() >= threshold).length
}

function normalizeAcademicProjects(parsed) {
  const nestedProjects = Array.isArray(parsed?.education)
    ? parsed.education.flatMap((entry) => entry?.academicProjects || entry?.academicProject || entry?.projects || [])
    : []
  const source = parsed?.academicProjects || parsed?.academicProject || parsed?.academic_projects || parsed?.projects || nestedProjects
  const isProjectLike = (item) => item && typeof item === 'object' && (
    item.name ||
    item.title ||
    item.projectName ||
    item.project ||
    item.context ||
    item.description ||
    item.dates ||
    item.period ||
    item.achievements ||
    item.bullets ||
    item.responsibilities ||
    item.details
  )

  if (!source) return []
  if (Array.isArray(source)) return source
  if (typeof source === 'object' && !isProjectLike(source)) {
    return Object.entries(source).map(([name, project]) => (
      project && typeof project === 'object' ? { name, ...project } : { name, details: project }
    ))
  }
  return [source]
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState(null)
  const [totalCount, setTotalCount] = useState(0)
  const [deletingId, setDeletingId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [downloadingPdfFileId, setDownloadingPdfFileId] = useState(null)
  const [viewingJdId, setViewingJdId] = useState(null)
  const [jobDescriptionModal, setJobDescriptionModal] = useState({ open: false, title: '', content: '' })
  const [selectedDate, setSelectedDate] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProfileId, setSelectedProfileId] = useState(DEFAULT_PROFILE_ID)

  const loadDocxService = useCallback(async () => {
    const module = await import('../services/docxService')
    return module.default
  }, [])

  const fetchApplications = useCallback(async ({ cursor = 0, append = false } = {}) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setError('')
    }

    try {
      const res = await fetch(`/api/tracker?limit=25&cursor=${cursor}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const items = Array.isArray(data.items) ? data.items : []

      setApplications((prev) => {
        if (!append) return items

        const existingIds = new Set(prev.map((application) => application.id))
        return [...prev, ...items.filter((application) => !existingIds.has(application.id))]
      })
      setHasMore(Boolean(data.hasMore))
      setNextCursor(data.nextCursor ?? null)
      setTotalCount(typeof data.total === 'number' ? data.total : items.length)
    } catch (err) {
      setError('Could not load the dashboard. Make sure you are running on Vercel with Redis configured.')
      console.error(err)
    } finally {
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
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
      setTotalCount((prev) => Math.max(prev - 1, 0))
    } catch {
      // keep the current list if deletion fails
    } finally {
      setDeletingId(null)
    }
  }

  const handleRedownload = async (application) => {
    setDownloadingId(application.id)

    try {
      const res = await fetch(`/api/tracker?id=${application.id}&fields=resume`)
      if (!res.ok) throw new Error('Fetch failed')
      const full = await res.json()

      const parsed = full.resumeJson
      if (!parsed) throw new Error('No resume JSON stored')

      const selectedProfile = getProfileById(full.profileId || application.profileId || DEFAULT_PROFILE_ID)

      const resumeData = {
        personalInfo: selectedProfile.personalInfo,
        contactLocation: parsed.contactLocation || 'Frisco, TX',
        jobTitle: parsed.jobTitle || '',
        summary: parsed.professionalSummary,
        summaryFormat: parsed.summaryFormat || (selectedProfile.id === 'edi' ? 'paragraph' : 'bullets'),
        skills: parsed.skills,
        experience: parsed.workExperience,
        academicProjects: normalizeAcademicProjects(parsed),
        education: selectedProfile.education,
        certifications: selectedProfile.certifications
      }

      const docxService = await loadDocxService()
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
      const res = await fetch(`/api/tracker?id=${application.id}&fields=resume`)
      if (!res.ok) throw new Error('Fetch failed')
      const full = await res.json()

      const parsed = full.resumeJson
      if (!parsed) throw new Error('No resume JSON stored')

      const selectedProfile = getProfileById(full.profileId || application.profileId || DEFAULT_PROFILE_ID)

      const resumeData = {
        personalInfo: selectedProfile.personalInfo,
        contactLocation: parsed.contactLocation || 'Frisco, TX',
        jobTitle: parsed.jobTitle || '',
        summary: parsed.professionalSummary,
        summaryFormat: parsed.summaryFormat || (selectedProfile.id === 'edi' ? 'paragraph' : 'bullets'),
        skills: parsed.skills,
        experience: parsed.workExperience,
        academicProjects: normalizeAcademicProjects(parsed),
        education: selectedProfile.education,
        certifications: selectedProfile.certifications
      }

      const docxService = await loadDocxService()
      await docxService.generateResumePdfFile(resumeData, parsed.resumeMeta?.fileName || application.fileName)
    } catch (err) {
      console.error('PDF file download failed:', err)
    } finally {
      setDownloadingPdfFileId(null)
    }
  }

  const handleViewJobDescription = async (application) => {
    setViewingJdId(application.id)

    try {
      const res = await fetch(`/api/tracker?id=${application.id}&fields=jd`)
      if (!res.ok) throw new Error('Fetch failed')
      const full = await res.json()
      setJobDescriptionModal({
        open: true,
        title: `${application.company || 'Application'}${application.role ? ` - ${application.role}` : ''}`,
        content: full.jobDescription || 'No job description was saved for this application.'
      })
    } catch (err) {
      console.error('JD fetch failed:', err)
      setJobDescriptionModal({
        open: true,
        title: `${application.company || 'Application'}${application.role ? ` - ${application.role}` : ''}`,
        content: 'Unable to load the saved job description.'
      })
    } finally {
      setViewingJdId(null)
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

      const dateMatch = selectedDate ? isSameLocalDate(application.date, selectedDate) : true

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
    const profileApps = applications.filter((a) => a.profileId === selectedProfileId)
    const last24 = countSince(applications, 1)
    const last7 = countSince(applications, 7)
    const last30 = countSince(applications, 30)

    return [
      {
        label: 'Last 24 Hours',
        value: last24,
        profileValue: countSince(profileApps, 1),
        subtitle: `${last24} application${last24 === 1 ? '' : 's'} submitted`
      },
      {
        label: 'Last 7 Days',
        value: last7,
        profileValue: countSince(profileApps, 7),
        subtitle: `~${Math.round(last7 / 7 || 0)} per day average`
      },
      {
        label: 'Last 30 Days',
        value: last30,
        profileValue: countSince(profileApps, 30),
        subtitle: `~${Math.round(last30 / 4 || 0)} per week average`
      },
      {
        label: 'Total',
        value: totalCount,
        profileValue: profileApps.length,
        subtitle: 'all-time applications',
        accent: true
      }
    ]
  }, [applications, totalCount, selectedProfileId])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading dashboard...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-yellow-800/50 bg-yellow-950/30 p-6 text-center">
        <p className="mb-1 font-medium text-yellow-400">Application Dashboard Unavailable</p>
        <p className="text-sm text-yellow-500">{error}</p>
        <button
          onClick={() => fetchApplications()}
          className="mt-4 text-sm text-yellow-500 underline hover:text-yellow-300"
        >
          Retry
        </button>
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 h-64 flex flex-col items-center justify-center text-center p-8">
        <BriefcaseIcon className="mb-4 h-10 w-10 text-slate-600" />
        <p className="text-sm text-slate-400">No applications tracked yet.</p>
        <p className="mt-1 text-xs text-slate-500">Saving from the Generate tab marks the job as applied.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {jobDescriptionModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Job Description</h3>
                <p className="text-sm text-slate-400">{jobDescriptionModal.title}</p>
              </div>
              <button
                onClick={() => setJobDescriptionModal({ open: false, title: '', content: '' })}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-300">
                {jobDescriptionModal.content}
              </pre>
            </div>
          </div>
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Activity Overview</p>
          <div className="relative">
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="appearance-none cursor-pointer rounded-2xl border border-slate-700 bg-slate-800 py-2.5 pl-4 pr-10 text-sm font-medium text-slate-200 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {RESUME_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.shortLabel}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article key={stat.label} className="rounded-3xl border border-slate-800 bg-slate-900 px-6 py-5 shadow-[0_14px_35px_rgba(0,0,0,0.3)]">
              <p className="text-sm font-semibold text-slate-300">{stat.label}</p>
              <div className="mt-3 flex items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total</p>
                  <p className={`mt-0.5 text-5xl font-bold tracking-tight ${stat.accent ? 'text-blue-400' : 'text-white'}`}>
                    {stat.value}
                  </p>
                </div>
                <div className="flex-shrink-0 rounded-2xl bg-indigo-900/30 px-4 py-2 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Profile</p>
                  <p className="mt-0.5 text-2xl font-bold text-indigo-400">{stat.profileValue}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500">{stat.subtitle}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-800/40 bg-emerald-950/30 px-6 py-5 text-emerald-400 shadow-sm">
        <p className="text-sm font-medium">
          Saved resumes are treated as applied jobs. Use the DOCX button on each row to download the submitted version again.
        </p>
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900 p-6 shadow-[0_22px_50px_rgba(0,0,0,0.3)]">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Filter &amp; Search</h2>
            <p className="mt-1 text-sm text-slate-400">
              Narrow applications by applied date, recent activity, or company and role keywords.
            </p>
            {totalCount > applications.length && (
              <p className="mt-1 text-xs text-slate-600">
                Filters and search apply to the {applications.length} loaded rows. Load more to expand the browser dataset.
              </p>
            )}
          </div>
          <button
            onClick={() => fetchApplications()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:border-slate-600 hover:text-white transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span className="font-medium">Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="h-12 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm text-slate-200 outline-none transition focus:border-blue-500 [color-scheme:dark]"
              />
            </label>

            <button
              onClick={() => setSelectedDate('')}
              className="h-12 rounded-2xl bg-slate-700 px-5 text-sm font-semibold text-slate-200 transition hover:bg-slate-600"
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
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
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
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search jobs..."
                className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 pl-11 pr-4 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 px-6 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-sky-400"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Applications</h2>
            <p className="text-sm text-slate-400">
              Showing {filteredApplications.length} filtered result{filteredApplications.length === 1 ? '' : 's'} from {applications.length} loaded application{applications.length === 1 ? '' : 's'} ({totalCount} total).
            </p>
          </div>
        </div>

        {filteredApplications.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 px-8 py-12 text-center text-slate-400">
            No applications match the current filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <article
                key={application.id}
                className="rounded-3xl border border-slate-700/50 bg-slate-900 px-6 py-5 shadow-[0_12px_30px_rgba(0,0,0,0.25)]"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xl font-semibold text-white">
                        {application.company || 'Unknown Company'}
                      </span>
                      {application.role && (
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-medium text-slate-300">
                          {application.role}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                      <span className="font-mono text-xs text-slate-600">{application.fileName}</span>
                      {application.profileLabel && <span>{application.profileLabel}</span>}
                      <span>Applied {formatDate(application.date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleRedownload(application)}
                      disabled={downloadingId === application.id}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-blue-900/30 px-4 text-sm font-semibold text-blue-400 transition hover:bg-blue-900/50 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      {downloadingId === application.id ? 'Downloading...' : 'Download DOCX'}
                    </button>

                    <button
                      onClick={() => handleRedownloadPdfFile(application)}
                      disabled={downloadingPdfFileId === application.id}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      {downloadingPdfFileId === application.id ? 'Building...' : 'PDF File'}
                    </button>

                    <button
                      onClick={() => handleViewJobDescription(application)}
                      disabled={viewingJdId === application.id || !application.hasJobDescription}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-800 px-4 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Eye className="h-4 w-4" />
                      {viewingJdId === application.id ? 'Loading JD...' : 'View JD'}
                    </button>

                    <button
                      onClick={() => handleDelete(application.id)}
                      disabled={deletingId === application.id}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-red-900/30 hover:text-red-400 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => fetchApplications({ cursor: nextCursor || 0, append: true })}
                  disabled={loadingMore}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-700 px-6 text-sm font-semibold text-slate-400 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMore ? 'Loading more...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
