import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle, ChevronDown, ChevronRight, Download, RotateCcw, Save } from 'lucide-react'
import { DEFAULT_PROFILE_ID, getProfileById, RESUME_PROFILES } from '../data/profiles'

const ORIGINAL_COMPANY_NAME = 'Kraft Heinz'
const ORIGINAL_COMPANY_PROFILE_ID = 'data-engineer-4yr'

function camelToSpaces(str) {
  return str.replace(/([A-Z])/g, ' $1').trim()
}

function parseFileName(fileName) {
  const parts = fileName.split('_')
  if (parts.length < 3) return { company: fileName, role: '' }

  return {
    company: camelToSpaces(parts[2] || ''),
    role: parts.slice(3).map(camelToSpaces).join(' ')
  }
}

function applyOriginalCompanyOverride(data, enabled) {
  if (!data) return null
  if (!enabled || !Array.isArray(data.workExperience) || data.workExperience.length === 0) return data

  return {
    ...data,
    workExperience: data.workExperience.map((experience, index) => (
      index === 0
        ? { ...experience, company: ORIGINAL_COMPANY_NAME }
        : experience
    ))
  }
}

export default function ResumeGenerator() {
  const [rawJson, setRawJson] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [selectedProfileId, setSelectedProfileId] = useState(DEFAULT_PROFILE_ID)
  const [useOriginalCompany, setUseOriginalCompany] = useState(false)
  const [parseError, setParseError] = useState('')
  const [jobDescriptionError, setJobDescriptionError] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [showPreview, setShowPreview] = useState(true)
  const [saveStatus, setSaveStatus] = useState(null)
  const [downloadError, setDownloadError] = useState('')

  const selectedProfile = getProfileById(selectedProfileId)
  const showOriginalCompanyToggle = selectedProfile.id === ORIGINAL_COMPANY_PROFILE_ID

  const effectiveParsedData = useMemo(
    () => applyOriginalCompanyOverride(parsedData, showOriginalCompanyToggle && useOriginalCompany),
    [parsedData, showOriginalCompanyToggle, useOriginalCompany]
  )

  const hasParsedData = Boolean(effectiveParsedData)
  const hasJobDescription = Boolean(jobDescription.trim())
  const canDownload = hasParsedData
  const canSave = hasParsedData && hasJobDescription && saveStatus !== 'saving' && saveStatus !== 'saved'

  const loadDocxService = async () => {
    const module = await import('../services/docxService')
    return module.default
  }

  const buildStoredResumeJson = () => ({
    resumeMeta: {
      fileName: effectiveParsedData.resumeMeta.fileName
    },
    contactLocation: effectiveParsedData.contactLocation || '',
    jobTitle: effectiveParsedData.jobTitle || '',
    professionalSummary: effectiveParsedData.professionalSummary,
    skills: effectiveParsedData.skills,
    workExperience: effectiveParsedData.workExperience
  })

  const buildResumeData = () => ({
    personalInfo: selectedProfile.personalInfo,
    contactLocation: effectiveParsedData.contactLocation || 'Dallas, TX',
    jobTitle: effectiveParsedData.jobTitle || '',
    summary: effectiveParsedData.professionalSummary,
    skills: effectiveParsedData.skills,
    experience: effectiveParsedData.workExperience,
    education: selectedProfile.education,
    certifications: selectedProfile.certifications
  })

  const handleParse = () => {
    setParseError('')
    setSaveStatus(null)
    setDownloadError('')

    if (!rawJson.trim()) {
      setParseError('Paste your JSON from Claude first.')
      return
    }

    try {
      let jsonStr = rawJson.trim()
      const codeBlock = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlock) jsonStr = codeBlock[1].trim()

      const parsed = JSON.parse(jsonStr)
      const missing = []

      if (!parsed.professionalSummary) missing.push('professionalSummary')
      if (!parsed.skills) missing.push('skills')
      if (!parsed.workExperience) missing.push('workExperience')
      if (!parsed.resumeMeta?.fileName) missing.push('resumeMeta.fileName')

      if (missing.length > 0) {
        setParseError(`Missing required fields: ${missing.join(', ')}`)
        return
      }

      if (typeof parsed.skills !== 'object' || Array.isArray(parsed.skills)) {
        setParseError('skills must be a JSON object, not an array.')
        return
      }

      if (!Array.isArray(parsed.workExperience)) {
        setParseError('workExperience must be an array.')
        return
      }

      setParsedData(parsed)
    } catch (err) {
      setParseError(`Invalid JSON: ${err.message}`)
    }
  }

  const handleDownload = async () => {
    if (!canDownload) return
    setDownloadError('')

    try {
      const docxService = await loadDocxService()
      await docxService.generateResume(buildResumeData(), effectiveParsedData.resumeMeta.fileName)
    } catch (err) {
      console.error(err)
      setDownloadError('Failed to generate DOCX. Please try again.')
    }
  }

  const handleDownloadPdfFile = async () => {
    if (!canDownload) return
    setDownloadError('')

    try {
      const docxService = await loadDocxService()
      await docxService.generateResumePdfFile(buildResumeData(), effectiveParsedData.resumeMeta.fileName)
    } catch (err) {
      console.error(err)
      setDownloadError('Failed to generate direct PDF download. Please try again.')
    }
  }

  const handleSaveToTracker = async () => {
    if (!hasParsedData) return

    if (!hasJobDescription) {
      setJobDescriptionError('Job description is required before saving to the dashboard.')
      setSaveStatus('error')
      return
    }

    setJobDescriptionError('')
    setSaveStatus('saving')
    const { company, role } = parseFileName(effectiveParsedData.resumeMeta.fileName)

    try {
      const res = await fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: effectiveParsedData.resumeMeta.fileName,
          company,
          role,
          profileId: selectedProfile.id,
          profileLabel: selectedProfile.label,
          resumeJson: buildStoredResumeJson(),
          jobDescription
        })
      })

      if (!res.ok) throw new Error('API error')
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  const handleReset = () => {
    setRawJson('')
    setJobDescription('')
    setUseOriginalCompany(false)
    setParseError('')
    setJobDescriptionError('')
    setParsedData(null)
    setSaveStatus(null)
    setDownloadError('')
  }

  const fileName = effectiveParsedData?.resumeMeta?.fileName || 'Resume details will appear here after parsing.'
  const location = effectiveParsedData?.contactLocation || 'Dallas, TX'
  const { company, role } = hasParsedData
    ? parseFileName(effectiveParsedData.resumeMeta.fileName)
    : { company: '', role: '' }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-white">Paste JSON from Claude</h2>
          <p className="mb-4 text-sm text-slate-400">
            Paste the full JSON block. Markdown code fences are stripped automatically.
          </p>

          <textarea
            value={rawJson}
            onChange={(event) => {
              setRawJson(event.target.value)
              setParseError('')
              setSaveStatus(null)
              setDownloadError('')

              if (parsedData) {
                setParsedData(null)
              }
            }}
            placeholder='{ "resumeMeta": { "fileName": "Karne_Saibhargav_Company_Role" }, ... }'
            className={`h-56 w-full resize-none rounded-2xl border bg-slate-800 p-4 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              parseError ? 'border-red-500' : hasParsedData ? 'border-emerald-500' : 'border-slate-700'
            }`}
          />

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-300">Hardcoded Resume Profile</label>
            <select
              value={selectedProfileId}
              onChange={(event) => {
                setSelectedProfileId(event.target.value)
                setSaveStatus(null)
              }}
              className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-sm text-slate-100 outline-none transition focus:border-indigo-500"
            >
              {RESUME_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              The selected profile supplies contact details and education for the generated DOCX.
            </p>
          </div>

          {showOriginalCompanyToggle && (
            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <input
                type="checkbox"
                checked={useOriginalCompany}
                onChange={(event) => {
                  setUseOriginalCompany(event.target.checked)
                  setSaveStatus(null)
                }}
                className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-200">Use original recent company</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  When enabled, the most recent company in the parsed resume is hard-set to {ORIGINAL_COMPANY_NAME} and the JSON company value for the first role is ignored.
                </p>
              </div>
            </label>
          )}

          {parseError && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {hasParsedData && (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>
                Valid - {effectiveParsedData.workExperience.length} jobs, {Object.keys(effectiveParsedData.skills).length} skill categories
              </span>
            </div>
          )}

          <button
            onClick={hasParsedData ? handleReset : handleParse}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium transition-colors ${
              hasParsedData
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {hasParsedData ? (
              <>
                <RotateCcw className="h-4 w-4" />
                Reset
              </>
            ) : (
              'Parse JSON'
            )}
          </button>
        </div>

        <div className="rounded-3xl border border-indigo-900/50 bg-indigo-950/40 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-400">Hardcoded Profile</p>
          <div className="space-y-1 text-sm text-indigo-200">
            <p><span className="font-medium text-indigo-300">Profile:</span> {selectedProfile.shortLabel}</p>
            <p><span className="font-medium text-indigo-300">Name:</span> {selectedProfile.personalInfo.name}</p>
            <p><span className="font-medium text-indigo-300">Phone:</span> {selectedProfile.personalInfo.phone}</p>
            <p><span className="font-medium text-indigo-300">Email:</span> {selectedProfile.personalInfo.email}</p>
            <p><span className="font-medium text-indigo-300">LinkedIn:</span> {selectedProfile.personalInfo.linkedin}</p>
            <p><span className="font-medium text-indigo-300">Education:</span> {selectedProfile.education.map((entry) => entry.school).join(' | ')}</p>
            <p className="pt-2 text-xs leading-relaxed text-indigo-300/70">{selectedProfile.summary}</p>
            {selectedProfile.certifications.length > 0 && (
              <p className="pt-2 text-xs leading-relaxed text-indigo-300/70">
                <span className="font-semibold text-indigo-300">Certifications:</span> {selectedProfile.certifications.map((item) => item.name).join(' | ')}
              </p>
            )}
            {selectedProfile.clientProjects.length > 0 && (
              <p className="pt-2 text-xs leading-relaxed text-indigo-300/70">
                <span className="font-semibold text-indigo-300">Client Projects:</span> {selectedProfile.clientProjects.join(' | ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-sm">
          <div className="px-6 py-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">File Name</p>
                <p className={`font-mono text-sm ${hasParsedData ? 'text-slate-200' : 'text-slate-500'}`}>{fileName}</p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                <p className={`text-sm ${hasParsedData ? 'text-slate-200' : 'text-slate-500'}`}>{location}</p>
              </div>
            </div>

            {(company || role) ? (
              <div className="flex flex-wrap gap-4 rounded-2xl bg-slate-800 p-3 text-sm">
                {company && (
                  <span>
                    <span className="text-slate-500">Company:</span> <span className="font-medium text-slate-200">{company}</span>
                  </span>
                )}
                {role && (
                  <span>
                    <span className="text-slate-500">Role:</span> <span className="font-medium text-slate-200">{role}</span>
                  </span>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-800 p-3 text-sm text-slate-500">
                Parse JSON to populate file details and resume metadata.
              </div>
            )}
          </div>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex w-full items-center justify-between border-t border-slate-800 px-6 py-4 transition-colors hover:bg-slate-800"
          >
            <span className="font-medium text-slate-200">Content Preview</span>
            {showPreview ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )}
          </button>

          {showPreview && (
            <div className="max-h-80 space-y-4 overflow-y-auto border-t border-slate-800 bg-slate-800/50 px-6 py-4 text-sm">
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-slate-500">Summary</p>
                <p className="leading-relaxed text-slate-300">
                  {hasParsedData
                    ? `${effectiveParsedData.professionalSummary.replace(/\*\*/g, '').slice(0, 220)}${effectiveParsedData.professionalSummary.length > 220 ? '...' : ''}`
                    : 'The parsed professional summary preview will appear here.'}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs font-bold uppercase text-slate-500">
                  Employment {hasParsedData ? `(${effectiveParsedData.workExperience.length} roles)` : ''}
                </p>
                {hasParsedData ? (
                  effectiveParsedData.workExperience.map((experience, index) => (
                    <p key={index} className="text-slate-300">
                      <span className="font-medium text-slate-200">{experience.company}</span>
                      {experience.position && <span className="text-slate-500"> - {experience.position}</span>}
                      <span className="ml-2 text-xs text-slate-600">{experience.dates}</span>
                    </p>
                  ))
                ) : (
                  <p className="text-slate-500">Recent roles and dates will appear here after parsing.</p>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs font-bold uppercase text-slate-500">
                  Skills {hasParsedData ? `(${Object.keys(effectiveParsedData.skills).length} categories)` : ''}
                </p>
                {hasParsedData ? (
                  Object.entries(effectiveParsedData.skills).slice(0, 3).map(([category, skills]) => (
                    <p key={category} className="text-slate-400">
                      <span className="font-medium text-slate-300">{category}:</span>{' '}
                      {(Array.isArray(skills) ? skills : [skills]).slice(0, 5).join(', ')}
                      {Array.isArray(skills) && skills.length > 5 ? ` +${skills.length - 5} more` : ''}
                    </p>
                  ))
                ) : (
                  <p className="text-slate-500">Top skills and categories will appear here after parsing.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <label className="mb-2 block text-sm font-medium text-slate-300">Job Description</label>
            <textarea
              value={jobDescription}
              onChange={(event) => {
                setJobDescription(event.target.value)
                setJobDescriptionError('')
                setSaveStatus(null)
              }}
              placeholder="Paste the job description here before saving to the dashboard."
              className={`h-40 w-full resize-none rounded-2xl border bg-slate-800 p-4 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-indigo-500 ${
                jobDescriptionError ? 'border-red-500' : 'border-slate-700'
              }`}
            />
            <p className="mt-2 text-xs text-slate-500">
              Parse JSON to enable downloads. Paste the JD as well to enable dashboard save.
            </p>
            {jobDescriptionError && (
              <div className="mt-3 flex items-start gap-2 text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{jobDescriptionError}</span>
              </div>
            )}
          </div>

          {downloadError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-800/50 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {downloadError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={handleDownload}
              disabled={!canDownload}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-medium transition-colors ${
                canDownload
                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                  : 'cursor-not-allowed bg-slate-800 text-slate-500'
              }`}
            >
              <Download className="h-4 w-4" />
              Download DOCX
            </button>

            <button
              onClick={handleDownloadPdfFile}
              disabled={!canDownload}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-medium transition-colors ${
                canDownload
                  ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                  : 'cursor-not-allowed bg-slate-800 text-slate-500'
              }`}
            >
              <Download className="h-4 w-4" />
              Download PDF File
            </button>
          </div>

          <button
            onClick={handleSaveToTracker}
            disabled={!canSave}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-medium transition-colors ${
              saveStatus === 'saved'
                ? 'cursor-default bg-emerald-900/40 text-emerald-400'
                : saveStatus === 'error'
                  ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60'
                  : canSave
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'cursor-not-allowed bg-slate-800 text-slate-500'
            }`}
          >
            {saveStatus === 'saved' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Saved to Application Dashboard
              </>
            ) : saveStatus === 'saving' ? (
              'Saving...'
            ) : saveStatus === 'error' ? (
              'Save Failed - Retry'
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save to Job Tracker
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
