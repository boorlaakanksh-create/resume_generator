import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  ImageRun,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
  convertInchesToTwip
} from 'docx'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'
import awsDeveloperLogoUrl from '../assets/certifications/aws-developer-associate.png'
import azureDeveloperLogoUrl from '../assets/certifications/azure-developer-associate.png'

const FONT = 'Calibri'
const PDF_FONT = 'helvetica'
const RIGHT_TAB = convertInchesToTwip(7.2)
const DEFAULT_DOCX_LAYOUT = {
  bodySize: 22,
  smallSize: 22,
  nameSize: 32,
  headingSize: 24,
  logoSize: 0
}
const JAVA_8_DOCX_LAYOUT = {
  bodySize: 20,
  smallSize: 20,
  nameSize: 28,
  headingSize: 20,
  logoSize: 55
}

const CERTIFICATION_LOGOS = [
  {
    pattern: /aws certified developer|aws.*developer/i,
    url: awsDeveloperLogoUrl
  },
  {
    pattern: /azure developer|microsoft.*azure.*developer/i,
    url: azureDeveloperLogoUrl
  }
]

function getDocxLayout(resumeData) {
  return resumeData.profileId === 'java-full-stack-8yr' ? JAVA_8_DOCX_LAYOUT : DEFAULT_DOCX_LAYOUT
}

function valueToText(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join(' ')
  if (typeof value === 'object') {
    if (value.text) return valueToText(value.text)
    if (value.summary) return valueToText(value.summary)
    if (value.description) return valueToText(value.description)
    if (value.point) return valueToText(value.point)
    return Object.values(value).map(valueToText).filter(Boolean).join(' ')
  }
  return String(value)
}

function parseFormattedText(text) {
  const safeText = valueToText(text)
  if (!safeText) return [{ text: '', bold: false }]

  const runs = []
  const boldRegex = /\*\*(.*?)\*\*/g
  let lastIndex = 0
  let match

  while ((match = boldRegex.exec(safeText)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: safeText.substring(lastIndex, match.index), bold: false })
    }

    runs.push({ text: match[1], bold: true })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < safeText.length) {
    runs.push({ text: safeText.substring(lastIndex), bold: false })
  }

  if (runs.length === 0) runs.push({ text: safeText, bold: false })
  return runs
}

function buildTextRuns(text, options = {}) {
  const layout = options.layout || DEFAULT_DOCX_LAYOUT
  return parseFormattedText(text).map((run) => new TextRun({
    text: run.text,
    bold: run.bold || options.bold,
    size: options.size || layout.bodySize,
    font: FONT,
    color: '000000'
  }))
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean)
  const text = valueToText(value)
  return text ? [text] : []
}

function ensureFullStop(value) {
  const text = valueToText(value).trim()
  if (!text) return ''
  return /[.!?]$/.test(text) ? text : `${text}.`
}

function normalizeSummaryBullets(value) {
  const cleanSummaryItem = (item) => valueToText(item).replace(/;/g, ',').replace(/[,:]+$/, '').trim()

  if (Array.isArray(value)) return normalizeList(value).map(cleanSummaryItem).filter(Boolean)

  return valueToText(value)
    .split(/\s*(?:;|\n|(?:^|\s)[•-]\s+|\d+\.\s+)/)
    .map((item) => cleanSummaryItem(item.trim().replace(/^[-•]\s*/, '')))
    .filter(Boolean)
}

function createSectionHeader(text, layout = DEFAULT_DOCX_LAYOUT) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT,
        size: layout.headingSize,
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

function createBulletParagraph(text, isLastBullet = false, layout = DEFAULT_DOCX_LAYOUT) {
  return new Paragraph({
    children: buildTextRuns(ensureFullStop(text), { layout }),
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

async function getCertificationLogoRuns(certifications = [], layout = DEFAULT_DOCX_LAYOUT) {
  if (!layout.logoSize || certifications.length === 0) return []

  const certificationText = certifications.map((certification) => valueToText(certification.name || certification)).join(' | ')
  const matchingLogos = CERTIFICATION_LOGOS.filter((logo) => logo.pattern.test(certificationText))

  return Promise.all(matchingLogos.map(async (logo) => {
    const response = await fetch(logo.url)
    const data = await response.arrayBuffer()
    return new ImageRun({
      data,
      transformation: {
        width: layout.logoSize,
        height: layout.logoSize
      }
    })
  }))
}

async function getCertificationLogoBytes(certifications = [], enabled = false) {
  if (!enabled || certifications.length === 0) return []

  const certificationText = certifications.map((certification) => valueToText(certification.name || certification)).join(' | ')
  const matchingLogos = CERTIFICATION_LOGOS.filter((logo) => logo.pattern.test(certificationText))

  return Promise.all(matchingLogos.map(async (logo) => {
    const response = await fetch(logo.url)
    const data = await response.arrayBuffer()
    return new Uint8Array(data)
  }))
}

function getProjectTitle(project) {
  return valueToText(project.name || project.title || project.projectName)
}

function getProjectContext(project) {
  return valueToText(project.context || project.description || project.type)
}

function getProjectDates(project) {
  return valueToText(project.dates || project.period || project.year)
}

function buildPlainText(text) {
  return parseFormattedText(text)
    .map((run) => run.text)
    .join('')
}

const docxService = {
  async generateResume(resumeData, fileNameBase = 'Akanksh_Resume') {
    const sections = []
    const personalInfo = resumeData.personalInfo || {}
    const layout = getDocxLayout(resumeData)
    const logoRuns = await getCertificationLogoRuns(resumeData.certifications, layout)

    if (logoRuns.length > 0) {
      sections.push(
        new Paragraph({
          children: logoRuns.flatMap((logoRun, index) => (
            index === 0 ? [logoRun] : [new TextRun({ text: '  ', font: FONT, size: layout.smallSize }), logoRun]
          )),
          alignment: AlignmentType.RIGHT,
          spacing: { after: 0 }
        })
      )
    }

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: personalInfo.name || 'Akanksh B',
            font: FONT,
            size: layout.nameSize,
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
        contactChildren.push(new TextRun({ text: ' | ', font: FONT, size: layout.smallSize, color: '000000' }))
      }
    }

    if (personalInfo.phone) {
      contactChildren.push(new TextRun({ text: personalInfo.phone, font: FONT, size: layout.smallSize, color: '000000' }))
    }

    if (personalInfo.email) {
      pushSeparator()
      contactChildren.push(new ExternalHyperlink({
        children: [
          new TextRun({
            text: personalInfo.email,
            font: FONT,
            size: layout.smallSize,
            style: 'Hyperlink'
          })
        ],
        link: `mailto:${personalInfo.email}`
      }))
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
            size: layout.smallSize,
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
              size: layout.bodySize,
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
      sections.push(createSectionHeader('PROFESSIONAL SUMMARY', layout))
      if (resumeData.summaryFormat === 'paragraph') {
        sections.push(
          new Paragraph({
            children: buildTextRuns(resumeData.summary, { layout }),
            spacing: { after: 100, line: 240 },
            alignment: AlignmentType.BOTH
          })
        )
      } else {
        const summaryItems = normalizeSummaryBullets(resumeData.summary)
        summaryItems.forEach((summaryItem, index) => {
          sections.push(createBulletParagraph(summaryItem, index === summaryItems.length - 1, layout))
        })
      }
    }

    if (resumeData.skills && Object.keys(resumeData.skills).length > 0) {
      sections.push(createSectionHeader('TECHNICAL SKILLS', layout))

      Object.entries(resumeData.skills).forEach(([category, skills]) => {
        const skillText = Array.isArray(skills) ? skills.join(', ') : skills
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${category}: `,
                font: FONT,
                size: layout.bodySize,
                bold: true,
                color: '000000'
              }),
              new TextRun({
                text: skillText,
                font: FONT,
                size: layout.bodySize,
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
      sections.push(createSectionHeader('PROFESSIONAL EXPERIENCE', layout))

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
                size: layout.bodySize,
                bold: true,
                color: '000000'
              }),
              new TextRun({
                text: experience.position && experience.company ? ', ' : '',
                font: FONT,
                size: layout.bodySize,
                color: '000000'
              }),
              new TextRun({
                text: experience.company || '',
                font: FONT,
                size: layout.bodySize,
                italics: true,
                color: '000000'
              }),
              ...(dateLocation
                ? [
                    new TextRun({ text: '\t', font: FONT, size: layout.bodySize }),
                    new TextRun({
                      text: dateLocation,
                      font: FONT,
                      size: layout.smallSize,
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
          sections.push(createBulletParagraph(achievement, index === achievements.length - 1, layout))
        })
      })
    }

    if (resumeData.academicProjects?.length > 0) {
      sections.push(createSectionHeader('ACADEMIC PROJECTS', layout))

      resumeData.academicProjects.forEach((project) => {
        const title = getProjectTitle(project)
        const context = getProjectContext(project)
        const dates = getProjectDates(project)

        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                font: FONT,
                size: layout.bodySize,
                bold: true,
                color: '000000'
              }),
              new TextRun({
                text: title && context ? ', ' : '',
                font: FONT,
                size: layout.bodySize,
                color: '000000'
              }),
              new TextRun({
                text: context,
                font: FONT,
                size: layout.bodySize,
                italics: true,
                color: '000000'
              }),
              ...(dates
                ? [
                    new TextRun({ text: '\t', font: FONT, size: layout.bodySize }),
                    new TextRun({
                      text: dates,
                      font: FONT,
                      size: layout.smallSize,
                      color: '000000'
                    })
                  ]
                : [])
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
            spacing: { before: 80, after: 40 }
          })
        )

        const achievements = normalizeList(project.achievements || project.bullets || project.responsibilities || project.details)
        achievements.forEach((achievement, index) => {
          sections.push(createBulletParagraph(achievement, index === achievements.length - 1, layout))
        })
      })
    }

    if (resumeData.education?.length > 0) {
      sections.push(createSectionHeader('EDUCATION', layout))

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
                size: layout.bodySize,
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
                size: layout.bodySize,
                color: '000000'
              }),
              ...(detailLine
                ? [
                    new TextRun({ text: '\t', font: FONT, size: layout.bodySize }),
                    new TextRun({
                      text: detailLine,
                      font: FONT,
                      size: layout.smallSize,
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
      sections.push(createSectionHeader('CERTIFICATIONS', layout))

      resumeData.certifications.forEach((certification, index) => {
        sections.push(createBulletParagraph(buildCertificationText(certification), index === resumeData.certifications.length - 1, layout))
      })
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: FONT,
              size: layout.bodySize,
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

  async generateResumePdfFile(resumeData, fileNameBase = 'Akanksh_Resume') {
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
    const isJava8Resume = resumeData.profileId === 'java-full-stack-8yr'
    const logoBytes = await getCertificationLogoBytes(resumeData.certifications, isJava8Resume)

    const buildRichLines = (text, maxWidth, size = 11) => {
      const segments = parseFormattedText(text || '')
      const allTokens = []
      segments.forEach(({ text: segText, bold }) => {
        segText.split(/(\s+)/).forEach(part => {
          if (!part.length) return
          doc.setFont(PDF_FONT, bold ? 'bold' : 'normal')
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
        doc.setFont(PDF_FONT, 'bold')
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
          doc.setFont(PDF_FONT, bold ? 'bold' : 'normal')
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
      doc.setFont(PDF_FONT, 'bold')
      doc.setFontSize(12)
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

      doc.setFont(PDF_FONT, 'normal')
      doc.setFontSize(11)
      doc.text(leftLines, marginLeft, cursorY)
      doc.text(rightLines, rightColumnX, cursorY, { align: 'right' })
      cursorY += lineCount * 14 + 4
    }

    const drawBullets = (items) => {
      const size = 11
      const lineH = 14
      items.forEach((item) => {
        const richLines = buildRichLines(ensureFullStop(item), contentWidth - 16, size)
        ensureSpace(richLines.length * lineH + 4)
        doc.setFont(PDF_FONT, 'normal')
        doc.setFontSize(size)
        doc.text('•', marginLeft + 4, cursorY)
        richLines.forEach((line, li) => {
          let x = marginLeft + 14
          const y = cursorY + li * lineH
          line.forEach(({ text: t, bold, width: tw }) => {
            doc.setFont(PDF_FONT, bold ? 'bold' : 'normal')
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
    ;[personalInfo.linkedin, personalInfo.github, personalInfo.website]
      .filter(Boolean)
      .forEach((item) => contactParts.push(item.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')))

    if (logoBytes.length > 0) {
      const logoSize = 42
      const gap = 8
      logoBytes.forEach((logo, index) => {
        const x = rightColumnX - ((logoBytes.length - index) * logoSize) - ((logoBytes.length - index - 1) * gap)
        doc.addImage(logo, 'PNG', x, 30, logoSize, logoSize)
      })
    }

    doc.setFont(PDF_FONT, 'bold')
    doc.setFontSize(isJava8Resume ? 14 : 16)
    doc.text(personalInfo.name || 'Akanksh B', pageWidth / 2, cursorY, { align: 'center' })
    cursorY += 16

    doc.setFont(PDF_FONT, 'normal')
    doc.setFontSize(isJava8Resume ? 10 : 11)
    doc.text(contactParts.join(' | '), pageWidth / 2, cursorY, { align: 'center', maxWidth: contentWidth })
    cursorY += 16

    if (resumeData.jobTitle) {
      doc.setFont(PDF_FONT, 'bolditalic')
      doc.setFontSize(isJava8Resume ? 10 : 11)
      doc.text(resumeData.jobTitle, pageWidth / 2, cursorY, { align: 'center' })
      cursorY += 18
    }

    if (resumeData.summary) {
      drawSectionHeader('PROFESSIONAL SUMMARY')
      if (resumeData.summaryFormat === 'paragraph') {
        drawWrappedText(resumeData.summary, { lineHeight: 14, after: 4 })
      } else {
        drawBullets(normalizeSummaryBullets(resumeData.summary))
      }
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

    if (resumeData.academicProjects?.length > 0) {
      drawSectionHeader('ACADEMIC PROJECTS')
      resumeData.academicProjects.forEach((project) => {
        const title = getProjectTitle(project)
        const context = getProjectContext(project)
        const leftText = `${title}${title && context ? ', ' : ''}${context}`
        drawEntryHeader(leftText, getProjectDates(project))
        drawBullets(normalizeList(project.achievements || project.bullets || project.responsibilities || project.details))
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
  },

  async generateCoverLetterPdf(resumeData, coverLetterParagraphs, fileNameBase = 'Akanksh_Resume') {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginLeft = 72
    const marginRight = 72
    const contentWidth = pageWidth - marginLeft - marginRight
    const bottomMargin = 72
    let cursorY = 80

    const ensureSpace = (heightNeeded = 24) => {
      if (cursorY + heightNeeded <= pageHeight - bottomMargin) return
      doc.addPage()
      cursorY = 72
    }

    const drawRichParagraph = (text, options = {}) => {
      const size = options.size || 11
      const lineHeight = options.lineHeight || 16
      const segments = parseFormattedText(text || '')
      const tokens = []

      segments.forEach(({ text: segmentText, bold }) => {
        segmentText.split(/(\s+)/).forEach((part) => {
          if (!part.length) return
          doc.setFont(PDF_FONT, bold ? 'bold' : 'normal')
          doc.setFontSize(size)
          tokens.push({
            text: part,
            bold,
            isSpace: /^\s+$/.test(part),
            width: doc.getTextWidth(part)
          })
        })
      })

      const lines = []
      let currentLine = []
      let currentWidth = 0

      tokens.forEach((token) => {
        if (token.isSpace) {
          if (currentLine.length > 0) {
            currentLine.push(token)
            currentWidth += token.width
          }
          return
        }

        if (currentWidth + token.width > contentWidth && currentLine.length > 0) {
          while (currentLine.length && currentLine[currentLine.length - 1].isSpace) currentLine.pop()
          lines.push(currentLine)
          currentLine = [token]
          currentWidth = token.width
          return
        }

        currentLine.push(token)
        currentWidth += token.width
      })

      while (currentLine.length && currentLine[currentLine.length - 1].isSpace) currentLine.pop()
      if (currentLine.length) lines.push(currentLine)

      ensureSpace(lines.length * lineHeight + (options.after || 0))
      lines.forEach((line, lineIndex) => {
        let x = marginLeft
        line.forEach((token) => {
          doc.setFont(PDF_FONT, token.bold ? 'bold' : 'normal')
          doc.setFontSize(size)
          doc.text(token.text, x, cursorY + lineIndex * lineHeight)
          x += token.width
        })
      })
      cursorY += lines.length * lineHeight + (options.after || 0)
    }

    const personalInfo = resumeData.personalInfo || {}
    const contactParts = []
    if (personalInfo.phone) contactParts.push(personalInfo.phone)
    if (personalInfo.email) contactParts.push(personalInfo.email)
    if (resumeData.contactLocation) contactParts.push(resumeData.contactLocation)

    doc.setFont(PDF_FONT, 'bold')
    doc.setFontSize(16)
    doc.text(personalInfo.name || 'Akanksh B', marginLeft, cursorY)
    cursorY += 22

    doc.setFont(PDF_FONT, 'normal')
    doc.setFontSize(10)
    doc.text(contactParts.join(' | '), marginLeft, cursorY, { maxWidth: contentWidth })
    cursorY += 36

    doc.setFontSize(11)
    doc.text(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), marginLeft, cursorY)
    cursorY += 28

    doc.text('Dear Hiring Manager,', marginLeft, cursorY)
    cursorY += 22

    const paragraphs = Array.isArray(coverLetterParagraphs) ? coverLetterParagraphs : [coverLetterParagraphs]
    paragraphs.filter(Boolean).forEach((paragraph) => {
      drawRichParagraph(paragraph, { after: 14 })
    })

    cursorY += 8
    ensureSpace(64)
    doc.setFont(PDF_FONT, 'normal')
    doc.setFontSize(11)
    doc.text('Sincerely,', marginLeft, cursorY)
    cursorY += 36
    doc.setFont(PDF_FONT, 'bold')
    doc.text(personalInfo.name || 'Akanksh B', marginLeft, cursorY)

    doc.save(`${fileNameBase}_CoverLetter.pdf`)
  }
}

export default docxService
