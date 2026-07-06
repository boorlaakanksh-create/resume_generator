import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardCopy, Download, Eye, Search, Trash2, X } from 'lucide-react'
import { DEFAULT_PROFILE_ID, RESUME_PROFILES, getProfileById } from '../data/profiles'
import { deleteLocalSubmission, getLocalSubmissions, updateLocalSubmission } from '../services/localSubmissions'

const STATUS_OPTIONS = [
  'Waiting for Response',
  'Not Moving Forward',
  'Interview',
  'Not Chosen',
  'Offer'
]

const STATUS_STYLES = {
  'Waiting for Response': 'bg-amber-900/30 text-amber-400',
  'Not Moving Forward': 'bg-red-900/40 text-red-400',
  Interview: 'bg-green-900/30 text-green-300',
  'Not Chosen': 'bg-orange-900/30 text-orange-400',
  Offer: 'bg-emerald-800/50 text-emerald-300'
}

function formatDate(iso) {
  if (!iso) return '-'
  const date = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function parseDateField(submission) {
  const raw = submission.submissionDate || submission.date
  if (!raw) return null
  return new Date(raw.includes('T') ? raw : `${raw}T00:00:00`)
}

function getThisWeekStart() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const date = new Date(now)
  date.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  date.setHours(0, 0, 0, 0)
  return date
}

function getLastWeekBounds() {
  const thisWeekStart = getThisWeekStart()
  const start = new Date(thisWeekStart)
  start.setDate(thisWeekStart.getDate() - 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function getThisMonthStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function getLastMonthBounds() {
  const now = new Date()
  return {
    start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
  }
}

function countInRange(submissions, start, end) {
  return submissions.filter((submission) => {
    const date = parseDateField(submission)
    return date && date >= start && date <= end
  }).length
}

async function loadDocxService() {
  const module = await import('../services/docxService')
  return module.default
}

function mergeSubmissions(remoteItems, localItems) {
  const remoteIds = new Set(remoteItems.map((item) => item.id))
  return [
    ...localItems,
    ...remoteItems.filter((item) => !remoteIds.has(item.id) || !item.localOnly)
  ]
}

export default function Submissions() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [profileFilter, setProfileFilter] = useState('total')
  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [viewingJdId, setViewingJdId] = useState(null)
  const [jdModal, setJdModal] = useState({ open: false, title: '', content: '' })

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    const localItems = getLocalSubmissions()
    try {
      const res = await fetch('/api/submissions?limit=500')
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      setSubmissions(mergeSubmissions(data.items || [], localItems))
    } catch {
      setSubmissions(localItems)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  useEffect(() => {
    const handler = () => fetchSubmissions()
    window.addEventListener('submission-logged', handler)
    return () => window.removeEventListener('submission-logged', handler)
  }, [fetchSubmissions])

  const profileOptions = useMemo(() => [
    { id: 'total', label: 'Total (All)' },
    ...RESUME_PROFILES.map((profile) => ({ id: profile.id, label: profile.shortLabel || profile.label }))
  ], [])

  const profiledSubmissions = useMemo(() => (
    profileFilter === 'total'
      ? submissions
      : submissions.filter((submission) => submission.profileId === profileFilter)
  ), [profileFilter, submissions])

  const metrics = useMemo(() => {
    const now = new Date()
    const lastWeek = getLastWeekBounds()
    const lastMonth = getLastMonthBounds()
    return {
      thisWeek: countInRange(profiledSubmissions, getThisWeekStart(), now),
      lastWeek: countInRange(profiledSubmissions, lastWeek.start, lastWeek.end),
      thisMonth: countInRange(profiledSubmissions, getThisMonthStart(), now),
      lastMonth: countInRange(profiledSubmissions, lastMonth.start, lastMonth.end),
      total: profiledSubmissions.length
    }
  }, [profiledSubmissions])

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return profiledSubmissions.filter((submission) => {
      const matchesSearch = !query || [
        submission.vendorCompany,
        submission.clientName,
        submission.pocName,
        submission.pocEmail,
        submission.phone
      ].some((value) => value?.toLowerCase().includes(query))
      const matchesStatus = statusFilter === 'all' || submission.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [profiledSubmissions, searchTerm, statusFilter])

  const handleStatusChange = async (id, newStatus, previousStatus) => {
    setUpdatingId(id)
    setSubmissions((prev) => prev.map((item) => item.id === id ? { ...item, status: newStatus } : item))

    if (id.startsWith('local-')) {
      updateLocalSubmission(id, { status: newStatus })
      setUpdatingId(null)
      return
    }

    try {
      const res = await fetch(`/api/submissions?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('PATCH failed')
    } catch {
      setSubmissions((prev) => prev.map((item) => item.id === id ? { ...item, status: previousStatus } : item))
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (id) => {
    setDeletingId(id)

    if (id.startsWith('local-')) {
      deleteLocalSubmission(id)
      setSubmissions((prev) => prev.filter((submission) => submission.id !== id))
      setDeletingId(null)
      return
    }

    try {
      const res = await fetch(`/api/submissions?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setSubmissions((prev) => prev.filter((submission) => submission.id !== id))
    } catch {
      // Keep row if deletion fails.
    } finally {
      setDeletingId(null)
    }
  }

  const handleViewJd = async (submission) => {
    setViewingJdId(submission.id)

    if (submission.localOnly) {
      setJdModal({
        open: true,
        title: `${submission.clientName || submission.vendorCompany || 'Submission'} - JD & Signature`,
        content: submission.jobDescription || 'No job description saved.'
      })
      setViewingJdId(null)
      return
    }

    try {
      const res = await fetch(`/api/submissions?id=${submission.id}&fields=jd`)
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      setJdModal({
        open: true,
        title: `${submission.clientName || submission.vendorCompany || 'Submission'} - JD & Signature`,
        content: data.jobDescription || 'No job description saved.'
      })
    } catch {
      setJdModal({ open: true, title: 'Error', content: 'Unable to load.' })
    } finally {
      setViewingJdId(null)
    }
  }

  const handleDownloadPdf = async (submission) => {
    setDownloadingId(submission.id)
    try {
      let full = submission

      if (!submission.localOnly) {
        const res = await fetch(`/api/submissions?id=${submission.id}&fields=resume`)
        if (!res.ok) throw new Error('Fetch failed')
        full = await res.json()
      }

      const parsed = full.resumeJson
      if (!parsed) throw new Error('No resume stored')
      const profile = getProfileById(full.profileId || DEFAULT_PROFILE_ID)
      const resumeData = {
        personalInfo: profile.personalInfo,
        contactLocation: parsed.contactLocation || 'Frisco, TX',
        jobTitle: parsed.jobTitle || '',
        summary: parsed.professionalSummary,
        summaryFormat: parsed.summaryFormat || (profile.id === 'edi' ? 'paragraph' : 'bullets'),
        skills: parsed.skills,
        experience: parsed.workExperience,
        education: profile.education,
        certifications: profile.certifications
      }
      const service = await loadDocxService()
      await service.generateResumePdfFile(resumeData, parsed.resumeMeta?.fileName || submission.fileName || 'Resume')
    } catch (err) {
      console.error('PDF download failed:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  const tiles = [
    { label: 'This Week', value: metrics.thisWeek },
    { label: 'Last Week', value: metrics.lastWeek },
    { label: 'This Month', value: metrics.thisMonth },
    { label: 'Last Month', value: metrics.lastMonth },
    { label: 'Total', value: metrics.total }
  ]
  const headers = ['Date', 'Vendor', 'RTR', 'POC Name', 'Phone', 'POC Email', 'Client', 'Status', 'JD', 'PDF', '']

  return (
    <div className="space-y-6">
      {jdModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Job Description</h3>
                <p className="text-sm text-slate-400">{jdModal.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(jdModal.content)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-800 hover:text-emerald-400"
                >
                  <ClipboardCopy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setJdModal({ open: false, title: '', content: '' })}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-300">{jdModal.content}</pre>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-800 p-1">
        {profileOptions.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setProfileFilter(id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              profileFilter === id ? 'bg-slate-700 text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search vendor, client, POC, phone..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-2xl border border-slate-700 bg-slate-800 py-2.5 pl-4 pr-8 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <button
          onClick={fetchSubmissions}
          className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-400 transition hover:text-white"
        >
          Refresh
        </button>
        <span className="text-sm text-slate-500">{filtered.length} of {profiledSubmissions.length}</span>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 px-8 py-12 text-center text-slate-400">Loading submissions...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 px-8 py-12 text-center text-slate-400">
          {submissions.length === 0
            ? 'No submissions yet. Log your first vendor submission from the Generate tab.'
            : 'No submissions match the current filters.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900">
                {headers.map((header) => (
                  <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((submission, index) => (
                <tr
                  key={submission.id}
                  className={`border-b border-slate-800/50 transition hover:bg-slate-800/30 ${index % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/60'}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatDate(submission.submissionDate)}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">{submission.vendorCompany || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">{submission.rtrAmount || '-'}</td>
                  <td className="px-4 py-3 text-slate-300">{submission.pocName || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">{submission.phone || '-'}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {submission.pocEmail
                      ? <a href={`mailto:${submission.pocEmail}`} className="transition hover:text-indigo-400">{submission.pocEmail}</a>
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{submission.clientName || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      <span className={`pointer-events-none inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[submission.status] || STATUS_STYLES['Waiting for Response']}`}>
                        {submission.status || 'Waiting for Response'}
                      </span>
                      <select
                        value={submission.status || 'Waiting for Response'}
                        onChange={(event) => handleStatusChange(submission.id, event.target.value, submission.status)}
                        disabled={updatingId === submission.id}
                        className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      >
                        {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewJd(submission)}
                      disabled={!submission.hasJobDescription || viewingJdId === submission.id}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Eye className="h-3 w-3" />JD
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDownloadPdf(submission)}
                      disabled={!submission.hasResume || downloadingId === submission.id}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-emerald-700/80 px-3 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Download className="h-3 w-3" />PDF
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(submission.id)}
                      disabled={deletingId === submission.id}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition hover:bg-red-900/30 hover:text-red-400 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
