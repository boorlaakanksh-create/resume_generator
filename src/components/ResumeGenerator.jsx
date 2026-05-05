import { useState } from 'react'
import { CheckCircle, AlertCircle, Download, Save, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import docxService from '../services/docxService'
import { PROFILE } from '../data/profile'

function camelToSpaces(str) {
  return str.replace(/([A-Z])/g, ' $1').trim()
}

function parseFileName(fileName) {
  // Format: Karne_Saibhargav_CompanyName_RoleName...
  const parts = fileName.split('_')
  if (parts.length < 3) return { company: fileName, role: '' }
  const company = camelToSpaces(parts[2] || '')
  const role = parts.slice(3).map(camelToSpaces).join(' ')
  return { company, role }
}

export default function ResumeGenerator() {
  const [rawJson, setRawJson] = useState('')
  const [parseError, setParseError] = useState('')
  const [parsedData, setParsedData] = useState(null)
  const [showPreview, setShowPreview] = useState(true)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'saving' | 'saved' | 'error'
  const [downloadError, setDownloadError] = useState('')

  const handleParse = () => {
    setParseError('')
    setSaveStatus(null)

    if (!rawJson.trim()) {
      setParseError('Paste your JSON from Claude first')
      return
    }

    try {
      let jsonStr = rawJson.trim()
      // Strip markdown code block if present
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
        setParseError('skills must be a JSON object (not an array)')
        return
      }

      if (!Array.isArray(parsed.workExperience)) {
        setParseError('workExperience must be an array')
        return
      }

      setParsedData(parsed)
    } catch (err) {
      setParseError(`Invalid JSON: ${err.message}`)
    }
  }

  const buildResumeData = () => ({
    personalInfo: PROFILE,
    contactLocation: parsedData.contactLocation || 'Dallas, TX',
    summary: parsedData.professionalSummary,
    skills: parsedData.skills,
    experience: parsedData.workExperience,
    education: PROFILE.education
  })

  const handleDownload = async () => {
    setDownloadError('')
    try {
      const resumeData = buildResumeData()
      await docxService.generateResume(resumeData, parsedData.resumeMeta.fileName)
    } catch (err) {
      console.error(err)
      setDownloadError('Failed to generate DOCX. Please try again.')
    }
  }

  const handleSaveToTracker = async () => {
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
          resumeJson: parsedData
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
    setParseError('')
    setParsedData(null)
    setSaveStatus(null)
    setDownloadError('')
  }

  const { company, role } = parsedData ? parseFileName(parsedData.resumeMeta.fileName) : {}

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left — Input */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Paste JSON from Claude</h2>
          <p className="text-sm text-gray-500 mb-4">
            Paste the full JSON block. Markdown code fences are stripped automatically.
          </p>

          <textarea
            value={rawJson}
            onChange={(e) => {
              setRawJson(e.target.value)
              setParseError('')
              if (parsedData) {
                setParsedData(null)
                setSaveStatus(null)
              }
            }}
            placeholder='{ "resumeMeta": { "fileName": "Karne_Saibhargav_Company_Role" }, ... }'
            className={`w-full h-56 border rounded-lg p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              parseError ? 'border-red-400' : parsedData ? 'border-green-400' : 'border-gray-300'
            }`}
          />

          {parseError && (
            <div className="flex items-start gap-2 mt-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {parsedData && (
            <div className="flex items-center gap-2 mt-2 text-green-700 text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>
                Valid — {parsedData.workExperience.length} jobs, {Object.keys(parsedData.skills).length} skill categories
              </span>
            </div>
          )}

          <button
            onClick={parsedData ? handleReset : handleParse}
            className={`mt-4 w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
              parsedData
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {parsedData ? (
              <span className="flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Reset
              </span>
            ) : 'Parse JSON'}
          </button>
        </div>

        {/* Profile summary (always shown) */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">Hardcoded Profile</p>
          <div className="space-y-1 text-sm text-indigo-900">
            <p><span className="font-medium">Name:</span> {PROFILE.name}</p>
            <p><span className="font-medium">Phone:</span> {PROFILE.phone}</p>
            <p><span className="font-medium">Email:</span> {PROFILE.email}</p>
            <p><span className="font-medium">Education:</span> UNT (M.S.) + JNTUH (B.E.)</p>
          </div>
        </div>
      </div>

      {/* Right — Preview & Actions */}
      <div className="space-y-6">
        {parsedData ? (
          <>
            {/* Resume meta */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">File Name</p>
                  <p className="font-mono text-sm text-gray-800">{parsedData.resumeMeta.fileName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Location</p>
                  <p className="text-sm text-gray-800">{parsedData.contactLocation || 'Dallas, TX'}</p>
                </div>
              </div>

              {(company || role) && (
                <div className="flex gap-4 text-sm bg-gray-50 rounded-lg p-3">
                  {company && <span><span className="text-gray-500">Company:</span> <span className="font-medium">{company}</span></span>}
                  {role && <span><span className="text-gray-500">Role:</span> <span className="font-medium">{role}</span></span>}
                </div>
              )}
            </div>

            {/* Collapsible preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">Content Preview</span>
                {showPreview
                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                  : <ChevronRight className="w-4 h-4 text-gray-400" />
                }
              </button>

              {showPreview && (
                <div className="border-t px-6 py-4 space-y-4 bg-gray-50 max-h-80 overflow-y-auto text-sm">
                  {/* Summary */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Summary</p>
                    <p className="text-gray-800 leading-relaxed">
                      {parsedData.professionalSummary.replace(/\*\*/g, '').slice(0, 220)}
                      {parsedData.professionalSummary.length > 220 ? '…' : ''}
                    </p>
                  </div>

                  {/* Jobs */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Employment ({parsedData.workExperience.length} roles)</p>
                    {parsedData.workExperience.map((exp, i) => (
                      <p key={i} className="text-gray-800">
                        <span className="font-medium">{exp.company}</span>
                        {exp.position && <span className="text-gray-500"> — {exp.position}</span>}
                        <span className="text-gray-400 text-xs ml-2">{exp.dates}</span>
                      </p>
                    ))}
                  </div>

                  {/* Skills */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                      Skills ({Object.keys(parsedData.skills).length} categories)
                    </p>
                    {Object.entries(parsedData.skills).slice(0, 3).map(([cat, skills]) => (
                      <p key={cat} className="text-gray-700">
                        <span className="font-medium">{cat}:</span>{' '}
                        {(Array.isArray(skills) ? skills : [skills]).slice(0, 5).join(', ')}
                        {Array.isArray(skills) && skills.length > 5 ? ` +${skills.length - 5} more` : ''}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {downloadError && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {downloadError}
                </div>
              )}

              <button
                onClick={handleDownload}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download DOCX
              </button>

              <button
                onClick={handleSaveToTracker}
                disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  saveStatus === 'saved'
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : saveStatus === 'error'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : saveStatus === 'saving'
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {saveStatus === 'saved' ? (
                  <><CheckCircle className="w-4 h-4" /> Saved to Tracker</>
                ) : saveStatus === 'saving' ? (
                  'Saving…'
                ) : saveStatus === 'error' ? (
                  'Save Failed — Retry'
                ) : (
                  <><Save className="w-4 h-4" /> Save to Job Tracker</>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 h-64 flex flex-col items-center justify-center text-center p-8">
            <div className="text-5xl mb-4">📄</div>
            <p className="text-gray-500 text-sm">Paste your Claude JSON on the left and click <strong>Parse JSON</strong> to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
