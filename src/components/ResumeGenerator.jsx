import { useState } from 'react'
import { AlertCircle, CheckCircle, ChevronDown, ChevronRight, Download, RotateCcw, Save } from 'lucide-react'
import docxService from '../services/docxService'
import { DEFAULT_PROFILE_ID, getProfileById, RESUME_PROFILES } from '../data/profiles'

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

export default function ResumeGenerator() {
  const [rawJson, setRawJson] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [selectedProfileId, setSelectedProfileId] = useState(DEFAULT_PROFILE_ID)
  const [parseError, setParseError] = useState('')
  const [jobDescriptionError, setJobDescriptionError] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [showPreview, setShowPreview] = useState(true)
  const [saveStatus, setSaveStatus] = useState(null)
  const [downloadError, setDownloadError] = useState('')

  const selectedProfile = getProfileById(selectedProfileId)

  const handleParse = () => {
    setParseError('')
    setSaveStatus(null)

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

  const buildResumeData = () => ({
    personalInfo: selectedProfile.personalInfo,
    contactLocation: parsedData.contactLocation || 'Dallas, TX',
    jobTitle: parsedData.jobTitle || '',
    summary: parsedData.professionalSummary,
    skills: parsedData.skills,
    experience: parsedData.workExperience,
    education: selectedProfile.education,
    certifications: selectedProfile.certifications
  })

  const handleDownload = async () => {
    setDownloadError('')

    try {
      await docxService.generateResume(buildResumeData(), parsedData.resumeMeta.fileName)
    } catch (err) {
      console.error(err)
      setDownloadError('Failed to generate DOCX. Please try again.')
    }
  }

  const handleDownloadPdfFile = async () => {
    setDownloadError('')

    try {
      await docxService.generateResumePdfFile(buildResumeData(), parsedData.resumeMeta.fileName)
    } catch (err) {
      console.error(err)
      setDownloadError('Failed to generate direct PDF download. Please try again.')
    }
  }

  const handleSaveToTracker = async () => {
    if (!jobDescription.trim()) {
      setJobDescriptionError('Job description is required before saving to the dashboard.')
      setSaveStatus('error')
      return
    }

    setJobDescriptionError('')
    setSaveStatus('saving')
    const { company, role } = parseFileName(parsedData.resumeMeta.fileName)

    try {
      const res = await fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: parsedData.resumeMeta.fileName,
          company,
          role,
          profileId: selectedProfile.id,
          profileLabel: selectedProfile.label,
          resumeJson: parsedData,
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
    setParseError('')
    setJobDescriptionError('')
    setParsedData(null)
    setSaveStatus(null)
    setDownloadError('')
  }

  const { company, role } = parsedData ? parseFileName(parsedData.resumeMeta.fileName) : {}

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Paste JSON from Claude</h2>
          <p className="mb-4 text-sm text-gray-500">
            Paste the full JSON block. Markdown code fences are stripped automatically.
          </p>

          <textarea
            value={rawJson}
            onChange={(event) => {
              setRawJson(event.target.value)
              setParseError('')

              if (parsedData) {
                setParsedData(null)
                setSaveStatus(null)
              }
            }}
            placeholder='{ "resumeMeta": { "fileName": "Karne_Saibhargav_Company_Role" }, ... }'
            className={`h-56 w-full resize-none rounded-2xl border p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              parseError ? 'border-red-400' : parsedData ? 'border-green-400' : 'border-gray-300'
            }`}
          />

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Hardcoded Resume Profile</label>
            <select
              value={selectedProfileId}
              onChange={(event) => {
                setSelectedProfileId(event.target.value)
                setSaveStatus(null)
              }}
              className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
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

          {parseError && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedData && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>
                Valid - {parsedData.workExperience.length} jobs, {Object.keys(parsedData.skills).length} skill categories
              </span>
            </div>
          )}

          <button
            onClick={parsedData ? handleReset : handleParse}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium transition-colors ${
              parsedData
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {parsedData ? (
              <>
                <RotateCcw className="h-4 w-4" />
                Reset
              </>
            ) : (
              'Parse JSON'
            )}
          </button>
        </div>

        <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-indigo-700">Hardcoded Profile</p>
          <div className="space-y-1 text-sm text-indigo-950">
            <p><span className="font-medium">Profile:</span> {selectedProfile.shortLabel}</p>
            <p><span className="font-medium">Name:</span> {selectedProfile.personalInfo.name}</p>
            <p><span className="font-medium">Phone:</span> {selectedProfile.personalInfo.phone}</p>
            <p><span className="font-medium">Email:</span> {selectedProfile.personalInfo.email}</p>
            <p><span className="font-medium">LinkedIn:</span> {selectedProfile.personalInfo.linkedin}</p>
            <p><span className="font-medium">Education:</span> {selectedProfile.education.map((entry) => entry.school).join(' | ')}</p>
            <p className="pt-2 text-xs leading-relaxed text-indigo-800">{selectedProfile.summary}</p>
            {selectedProfile.certifications.length > 0 && (
              <p className="pt-2 text-xs leading-relaxed text-indigo-800">
                <span className="font-semibold">Certifications:</span> {selectedProfile.certifications.map((item) => item.name).join(' | ')}
              </p>
            )}
            {selectedProfile.clientProjects.length > 0 && (
              <p className="pt-2 text-xs leading-relaxed text-indigo-800">
                <span className="font-semibold">Client Projects:</span> {selectedProfile.clientProjects.join(' | ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {parsedData ? (
          <>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="px-6 py-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">File Name</p>
                    <p className="font-mono text-sm text-gray-800">{parsedData.resumeMeta.fileName}</p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Location</p>
                    <p className="text-sm text-gray-800">{parsedData.contactLocation || 'Dallas, TX'}</p>
                  </div>
                </div>

                {(company || role) && (
                  <div className="flex flex-wrap gap-4 rounded-2xl bg-slate-50 p-3 text-sm">
                    {company && (
                      <span>
                        <span className="text-slate-500">Company:</span> <span className="font-medium">{company}</span>
                      </span>
                    )}
                    {role && (
                      <span>
                        <span className="text-slate-500">Role:</span> <span className="font-medium">{role}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex w-full items-center justify-between border-t px-6 py-4 transition-colors hover:bg-slate-50"
              >
                <span className="font-medium text-gray-900">Content Preview</span>
                {showPreview ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {showPreview && (
                <div className="max-h-80 space-y-4 overflow-y-auto border-t bg-slate-50 px-6 py-4 text-sm">
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-gray-500">Summary</p>
                    <p className="leading-relaxed text-gray-800">
                      {parsedData.professionalSummary.replace(/\*\*/g, '').slice(0, 220)}
                      {parsedData.professionalSummary.length > 220 ? '...' : ''}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-gray-500">
                      Employment ({parsedData.workExperience.length} roles)
                    </p>
                    {parsedData.workExperience.map((experience, index) => (
                      <p key={index} className="text-gray-800">
                        <span className="font-medium">{experience.company}</span>
                        {experience.position && <span className="text-gray-500"> - {experience.position}</span>}
                        <span className="ml-2 text-xs text-gray-400">{experience.dates}</span>
                      </p>
                    ))}
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-bold uppercase text-gray-500">
                      Skills ({Object.keys(parsedData.skills).length} categories)
                    </p>
                    {Object.entries(parsedData.skills).slice(0, 3).map(([category, skills]) => (
                      <p key={category} className="text-gray-700">
                        <span className="font-medium">{category}:</span>{' '}
                        {(Array.isArray(skills) ? skills : [skills]).slice(0, 5).join(', ')}
                        {Array.isArray(skills) && skills.length > 5 ? ` +${skills.length - 5} more` : ''}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="mb-2 block text-sm font-medium text-slate-700">Job Description</label>
                <textarea
                  value={jobDescription}
                  onChange={(event) => {
                    setJobDescription(event.target.value)
                    setJobDescriptionError('')
                    setSaveStatus(null)
                  }}
                  placeholder="Paste the job description here before saving to the dashboard."
                  className={`h-40 w-full resize-none rounded-2xl border p-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 ${
                    jobDescriptionError ? 'border-red-400' : 'border-slate-300'
                  }`}
                />
                <p className="mt-2 text-xs text-slate-500">
                  This is stored with the saved application so you can view the original JD later from the dashboard.
                </p>
                {jobDescriptionError && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{jobDescriptionError}</span>
                  </div>
                )}
              </div>

              {downloadError && (
                <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {downloadError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={handleDownload}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" />
                  Download DOCX
                </button>

                <button
                  onClick={handleDownloadPdfFile}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-3 font-medium text-white transition-colors hover:bg-emerald-800"
                >
                  <Download className="h-4 w-4" />
                  Download PDF File
                </button>
              </div>

              <button
                onClick={handleSaveToTracker}
                disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-medium transition-colors ${
                  saveStatus === 'saved'
                    ? 'cursor-default bg-green-100 text-green-700'
                    : saveStatus === 'error'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : saveStatus === 'saving'
                        ? 'cursor-not-allowed bg-gray-100 text-gray-500'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
          </>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <div className="mb-4 text-5xl">Document</div>
            <p className="text-sm text-gray-500">
              Paste your Claude JSON on the left and click <strong>Parse JSON</strong> to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
