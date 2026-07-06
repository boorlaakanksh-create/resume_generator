const STORAGE_KEY = 'resume-generator-local-submissions'

function readAll() {
  if (typeof window === 'undefined') return []

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(items) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function getLocalSubmissions() {
  return readAll()
}

export function saveLocalSubmission(payload) {
  const date = new Date().toISOString()
  const record = {
    id: `local-${Date.now()}`,
    date,
    submissionDate: payload.submissionDate || date.split('T')[0],
    vendorCompany: payload.vendorCompany || '',
    rtrAmount: payload.rtrAmount || '',
    pocName: payload.pocName || '',
    pocEmail: payload.pocEmail || '',
    phone: payload.phone || '',
    clientName: payload.clientName || '',
    status: payload.status || 'Waiting for Response',
    fileName: payload.fileName || '',
    profileId: payload.profileId || '',
    hasJobDescription: Boolean(payload.jobDescription?.trim()),
    hasResume: Boolean(payload.resumeJson),
    jobDescription: payload.jobDescription || '',
    resumeJson: payload.resumeJson || null,
    localOnly: true
  }

  writeAll([record, ...readAll()])
  return record
}

export function updateLocalSubmission(id, updates) {
  let updatedRecord = null
  const next = readAll().map((item) => {
    if (item.id !== id) return item
    updatedRecord = { ...item, ...updates }
    return updatedRecord
  })
  writeAll(next)
  return updatedRecord
}

export function deleteLocalSubmission(id) {
  writeAll(readAll().filter((item) => item.id !== id))
}
