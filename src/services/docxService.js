import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
  convertInchesToTwip
} from 'docx'
import { saveAs } from 'file-saver'

const FONT = 'Liberation Serif'
const BODY_SIZE = 22
const SMALL_SIZE = 20
const NAME_SIZE = 32
const HEADING_SIZE = 20
const RIGHT_TAB = convertInchesToTwip(7.2)

function parseFormattedText(text) {
  if (!text) return [{ text: '', bold: false }]

  const runs = []
  const boldRegex = /\*\*(.*?)\*\*/g
  let lastIndex = 0
  let match

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: text.substring(lastIndex, match.index), bold: false })
    }

    runs.push({ text: match[1], bold: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    runs.push({ text: text.substring(lastIndex), bold: false })
  }

  if (runs.length === 0) runs.push({ text, bold: false })
  return runs
}

function buildTextRuns(text, options = {}) {
  return parseFormattedText(text).map((run) => new TextRun({
    text: run.text,
    bold: run.bold || options.bold,
    size: options.size || BODY_SIZE,
    font: FONT,
    color: '000000'
  }))
}

function createSectionHeader(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT,
        size: HEADING_SIZE,
        bold: true,
        color: '000000'
      })
    ],
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 6,
        color: '000000'
      }
    },
    spacing: {
      before: 180,
      after: 70
    }
  })
}

function createBulletParagraph(text, isLastBullet = false) {
  return new Paragraph({
    children: buildTextRuns(text),
    bullet: { level: 0 },
    indent: {
      left: convertInchesToTwip(0.23),
      hanging: convertInchesToTwip(0.18)
    },
    spacing: {
      before: 0,
      after: isLastBullet ? 120 : 40,
      line: 240
    },
    alignment: AlignmentType.BOTH
  })
}

function buildCertificationText(certification) {
  const parts = [certification.name]
  if (certification.status) parts.push(`Status: ${certification.status}`)
  if (certification.credentialId) parts.push(`Credential ID: ${certification.credentialId}`)
  if (certification.certificationNumber) parts.push(`Certification Number: ${certification.certificationNumber}`)
  if (certification.earnedOn) parts.push(`Earned On: ${certification.earnedOn}`)
  return parts.join(' | ')
}

function buildPlainText(text) {
  return parseFormattedText(text)
    .map((run) => run.text)
    .join('')
}

let jsPdfModulePromise = null

async function loadJsPdf() {
  if (!jsPdfModulePromise) {
    jsPdfModulePromise = import(/* @vite-ignore */ 'https://esm.sh/jspdf@2.5.2')
  }

  const module = await jsPdfModulePromise
  return module.jsPDF || module.default?.jsPDF || module.default
}

const docxService = {
  async generateResume(resumeData, fileNameBase = 'Karne_Saibhargav_Resume') {
    const sections = []
    const personalInfo = resumeData.personalInfo || {}

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: personalInfo.name || 'Saibhargav Karne',
            font: FONT,
            size: NAME_SIZE,
            bold: true,
            color: '000000'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 }
      })
    )

    const contactChildren = []
    const pushSeparator = () => {
      if (contactChildren.length > 0) {
        contactChildren.push(new TextRun({ text: ' | ', font: FONT, size: SMALL_SIZE, color: '000000' }))
      }
    }

    if (personalInfo.phone) {
      contactChildren.push(new TextRun({ text: personalInfo.phone, font: FONT, size: SMALL_SIZE, color: '000000' }))
    }

    if (personalInfo.email) {
      pushSeparator()
      contactChildren.push(new ExternalHyperlink({
        children: [
          new TextRun({
            text: personalInfo.email,
            font: FONT,
            size: SMALL_SIZE,
            style: 'Hyperlink'
          })
        ],
        link: `mailto:${personalInfo.email}`
      }))
    }

    if (resumeData.contactLocation) {
      pushSeparator()
      contactChildren.push(new TextRun({ text: resumeData.contactLocation, font: FONT, size: SMALL_SIZE, color: '000000' }))
    }

    const links = [
      personalInfo.linkedin,
      personalInfo.github,
      personalInfo.website
    ].filter(Boolean)

    links.forEach((url) => {
      pushSeparator()
      const cleanDisplay = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
      contactChildren.push(new ExternalHyperlink({
        children: [
          new TextRun({
            text: cleanDisplay,
            font: FONT,
            size: SMALL_SIZE,
            style: 'Hyperlink'
          })
        ],
        link: url.startsWith('http') ? url : `https://${url}`
      }))
    })

    sections.push(
      new Paragraph({
        children: contactChildren,
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 }
      })
    )

    if (resumeData.jobTitle) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: resumeData.jobTitle,
              font: FONT,
              size: BODY_SIZE,
              bold: true,
              italics: true,
              color: '000000'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 }
        })
      )
    }

    if (resumeData.summary) {
      sections.push(createSectionHeader('PROFESSIONAL SUMMARY'))
      sections.push(
        new Paragraph({
          children: buildTextRuns(resumeData.summary),
          spacing: { after: 100, line: 240 },
          alignment: AlignmentType.BOTH
        })
      )
    }

    if (resumeData.skills && Object.keys(resumeData.skills).length > 0) {
      sections.push(createSectionHeader('TECHNICAL SKILLS'))

      Object.entries(resumeData.skills).forEach(([category, skills]) => {
        const skillText = Array.isArray(skills) ? skills.join(', ') : skills
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${category}: `,
                font: FONT,
                size: BODY_SIZE,
                bold: true,
                color: '000000'
              }),
              new TextRun({
                text: skillText,
                font: FONT,
                size: BODY_SIZE,
                color: '000000'
              })
            ],
            spacing: { after: 30, line: 220 },
            alignment: AlignmentType.BOTH
          })
        )
      })
    }

    if (resumeData.experience?.length > 0) {
      sections.push(createSectionHeader('PROFESSIONAL EXPERIENCE'))

      resumeData.experience.forEach((experience) => {
        const dateLocation = [experience.dates || experience.period || '', experience.location || '']
          .filter(Boolean)
          .join(' | ')

        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: experience.position || '',
                font: FONT,
                size: BODY_SIZE,
                bold: true,
                color: '000000'
              }),
              new TextRun({
                text: experience.position && experience.company ? ', ' : '',
                font: FONT,
                size: BODY_SIZE,
                color: '000000'
              }),
              new TextRun({
                text: experience.company || '',
                font: FONT,
                size: BODY_SIZE,
                italics: true,
                color: '000000'
              }),
              ...(dateLocation
                ? [
                    new TextRun({ text: '\t', font: FONT, size: BODY_SIZE }),
                    new TextRun({
                      text: dateLocation,
                      font: FONT,
                      size: SMALL_SIZE,
                      color: '000000'
                    })
                  ]
                : [])
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
            spacing: { before: 80, after: 40 }
          })
        )

        const achievements = experience.achievements || experience.bullets || experience.responsibilities || []
        achievements.forEach((achievement, index) => {
          sections.push(createBulletParagraph(achievement, index === achievements.length - 1))
        })
      })
    }

    if (resumeData.education?.length > 0) {
      sections.push(createSectionHeader('EDUCATION'))

      resumeData.education.forEach((education) => {
        const degreeText = education.field ? `${education.degree} in ${education.field}` : education.degree
        const degreeLine = education.gpa ? `${degreeText} (GPA: ${education.gpa})` : degreeText
        const detailLine = [education.year || education.dates || '', education.location || '']
          .filter(Boolean)
          .join(' | ')

        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: degreeLine,
                font: FONT,
                size: BODY_SIZE,
                bold: true,
                color: '000000'
              })
            ],
            spacing: { before: 60, after: 20 }
          })
        )

        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: education.school || '',
                font: FONT,
                size: BODY_SIZE,
                color: '000000'
              }),
              ...(detailLine
                ? [
                    new TextRun({ text: '\t', font: FONT, size: BODY_SIZE }),
                    new TextRun({
                      text: detailLine,
                      font: FONT,
                      size: SMALL_SIZE,
                      color: '000000'
                    })
                  ]
                : [])
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
            spacing: { after: 60 }
          })
        )
      })
    }

    if (resumeData.certifications?.length > 0) {
      sections.push(createSectionHeader('CERTIFICATIONS'))

      resumeData.certifications.forEach((certification, index) => {
        sections.push(createBulletParagraph(buildCertificationText(certification), index === resumeData.certifications.length - 1))
      })
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: FONT,
              size: BODY_SIZE,
              color: '000000'
            },
            paragraph: {
              spacing: {
                line: 240
              }
            }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.55),
              bottom: convertInchesToTwip(0.55),
              left: convertInchesToTwip(0.65),
              right: convertInchesToTwip(0.65)
            }
          }
        },
        children: sections
      }]
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `${fileNameBase}.docx`)
  },

  async generateResumePdfFile(resumeData, fileNameBase = 'Karne_Saibhargav_Resume') {
    const jsPDF = await loadJsPdf()
    const doc = new jsPDF({
      unit: 'pt',
      format: 'letter'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginLeft = 48
    const marginRight = 48
    const contentWidth = pageWidth - marginLeft - marginRight
    const bottomMargin = 48
    const rightColumnX = pageWidth - marginRight
    let cursorY = 44

    const buildRichLines = (text, maxWidth, size = 11) => {
      const segments = parseFormattedText(text || '')
      const allTokens = []
      segments.forEach(({ text: segText, bold }) => {
        segText.split(/(\s+)/).forEach(part => {
          if (!part.length) return
          doc.setFont('times', bold ? 'bold' : 'normal')
          doc.setFontSize(size)
          allTokens.push({ text: part, bold, isSpace: /^\s+$/.test(part), width: doc.getTextWidth(part) })
        })
      })
      const lines = []
      let cur = []
      let curW = 0
      allTokens.forEach(tok => {
        if (tok.isSpace) {
          if (cur.length > 0) { cur.push(tok); curW += tok.width }
        } else if (curW + tok.width > maxWidth && cur.length > 0) {
          while (cur.length && cur[cur.length - 1].isSpace) cur.pop()
          lines.push(cur)
          cur = [tok]; curW = tok.width
        } else {
          cur.push(tok); curW += tok.width
          // If a single token alone exceeds maxWidth, flush it as its own line
          if (cur.length === 1 && curW > maxWidth) {
            lines.push(cur)
            cur = []; curW = 0
          }
        }
      })
      while (cur.length && cur[cur.length - 1].isSpace) cur.pop()
      if (cur.length) lines.push(cur)
      return lines
    }

    const ensureSpace = (heightNeeded = 24) => {
      if (cursorY + heightNeeded <= pageHeight - bottomMargin) return
      doc.addPage()
      cursorY = 44
    }

    const drawWrappedText = (text, {
      x = marginLeft,
      width = contentWidth,
      size = 11,
      style = 'normal',
      align = 'left',
      lineHeight = 15,
      before = 0,
      after = 0
    } = {}) => {
      if (!text) return
      cursorY += before
      doc.setFontSize(size)
      if (style === 'bold') {
        doc.setFont('times', 'bold')
        const lines = doc.splitTextToSize(buildPlainText(text), width)
        ensureSpace(lines.length * lineHeight + after)
        doc.text(lines, x, cursorY, { align, maxWidth: width })
        cursorY += lines.length * lineHeight + after
        return
      }
      const richLines = buildRichLines(text, width, size)
      ensureSpace(richLines.length * lineHeight + after)
      richLines.forEach((line, li) => {
        const y = cursorY + li * lineHeight
        let rx = x
        if (align === 'center') { const tw = line.reduce((s, t) => s + t.width, 0); rx = x + (width - tw) / 2 }
        else if (align === 'right') { const tw = line.reduce((s, t) => s + t.width, 0); rx = x + width - tw }
        line.forEach(({ text: t, bold, width: tw }) => {
          doc.setFont('times', bold ? 'bold' : 'normal')
          doc.setFontSize(size)
          doc.text(t, rx, y)
          rx += tw
        })
      })
      cursorY += richLines.length * lineHeight + after
    }

    const drawSectionHeader = (text) => {
      ensureSpace(26)
      cursorY += 10
      doc.setFont('times', 'bold')
      doc.setFontSize(10)
      doc.text(text, marginLeft, cursorY)
      cursorY += 4
      doc.setLineWidth(0.8)
      doc.line(marginLeft, cursorY, rightColumnX, cursorY)
      cursorY += 10
    }

    const drawEntryHeader = (leftText, rightText) => {
      const leftLines = doc.splitTextToSize(leftText || '', contentWidth - 150)
      const rightLines = doc.splitTextToSize(rightText || '', 140)
      const lineCount = Math.max(leftLines.length, rightLines.length)
      ensureSpace(lineCount * 14 + 8)

      doc.setFont('times', 'normal')
      doc.setFontSize(11)
      doc.text(leftLines, marginLeft, cursorY)
      doc.text(rightLines, rightColumnX, cursorY, { align: 'right' })
      cursorY += lineCount * 14 + 4
    }

    const drawBullets = (items) => {
      const size = 11
      const lineH = 14
      items.forEach((item) => {
        const richLines = buildRichLines(item, contentWidth - 16, size)
        ensureSpace(richLines.length * lineH + 4)
        doc.setFont('times', 'normal')
        doc.setFontSize(size)
        doc.text('•', marginLeft + 4, cursorY)
        richLines.forEach((line, li) => {
          let x = marginLeft + 14
          const y = cursorY + li * lineH
          line.forEach(({ text: t, bold, width: tw }) => {
            doc.setFont('times', bold ? 'bold' : 'normal')
            doc.setFontSize(size)
            doc.text(t, x, y)
            x += tw
          })
        })
        cursorY += richLines.length * lineH + 2
      })
      cursorY += 4
    }

    const personalInfo = resumeData.personalInfo || {}
    const contactParts = []

    if (personalInfo.phone) contactParts.push(personalInfo.phone)
    if (personalInfo.email) contactParts.push(personalInfo.email)
    if (resumeData.contactLocation) contactParts.push(resumeData.contactLocation)
    ;[personalInfo.linkedin, personalInfo.github, personalInfo.website]
      .filter(Boolean)
      .forEach((item) => contactParts.push(item.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')))

    doc.setFont('times', 'bold')
    doc.setFontSize(16)
    doc.text(personalInfo.name || 'Saibhargav Karne', pageWidth / 2, cursorY, { align: 'center' })
    cursorY += 16

    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.text(contactParts.join(' | '), pageWidth / 2, cursorY, { align: 'center', maxWidth: contentWidth })
    cursorY += 16

    if (resumeData.jobTitle) {
      doc.setFont('times', 'bolditalic')
      doc.setFontSize(11)
      doc.text(resumeData.jobTitle, pageWidth / 2, cursorY, { align: 'center' })
      cursorY += 18
    }

    if (resumeData.summary) {
      drawSectionHeader('PROFESSIONAL SUMMARY')
      drawWrappedText(resumeData.summary, { lineHeight: 14, after: 4 })
    }

    if (resumeData.skills && Object.keys(resumeData.skills).length > 0) {
      drawSectionHeader('TECHNICAL SKILLS')
      Object.entries(resumeData.skills).forEach(([category, skills]) => {
        const skillText = Array.isArray(skills) ? skills.join(', ') : skills
        drawWrappedText(`**${category}**: ${skillText}`, { lineHeight: 14, after: 2 })
      })
    }

    if (resumeData.experience?.length > 0) {
      drawSectionHeader('PROFESSIONAL EXPERIENCE')
      resumeData.experience.forEach((experience) => {
        const leftText = `${experience.position || ''}${experience.position && experience.company ? ', ' : ''}${experience.company || ''}`
        const rightText = [experience.dates || experience.period || '', experience.location || ''].filter(Boolean).join(' | ')
        drawEntryHeader(leftText, rightText)
        drawBullets(experience.achievements || experience.bullets || experience.responsibilities || [])
      })
    }

    if (resumeData.education?.length > 0) {
      drawSectionHeader('EDUCATION')
      resumeData.education.forEach((education) => {
        const degreeText = education.field ? `${education.degree} in ${education.field}` : education.degree
        const degreeLine = education.gpa ? `${degreeText} (GPA: ${education.gpa})` : degreeText
        drawWrappedText(degreeLine, { style: 'bold', after: 2 })
        const rightText = [education.year || education.dates || '', education.location || ''].filter(Boolean).join(' | ')
        drawEntryHeader(education.school || '', rightText)
      })
    }

    if (resumeData.certifications?.length > 0) {
      drawSectionHeader('CERTIFICATIONS')
      drawBullets(resumeData.certifications.map(buildCertificationText))
    }

    doc.save(`${fileNameBase}.pdf`)
  }
}

export default docxService
