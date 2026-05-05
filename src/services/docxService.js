import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    TabStopType,
    convertInchesToTwip,
    ExternalHyperlink
} from 'docx';
import { saveAs } from 'file-saver';

function parseFormattedText(text) {
    if (!text) return [{ text: '', bold: false }];
    const runs = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            runs.push({ text: text.substring(lastIndex, match.index), bold: false });
        }
        runs.push({ text: match[1], bold: true });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        runs.push({ text: text.substring(lastIndex), bold: false });
    }
    if (runs.length === 0) runs.push({ text, bold: false });
    return runs;
}

function sectionHeader(text) {
    return new Paragraph({
        children: [
            new TextRun({
                text,
                size: 22,
                bold: true,
                font: 'Times New Roman',
                color: '000000'
            })
        ],
        alignment: AlignmentType.LEFT,
        spacing: { before: 200, after: 80 }
    });
}

const FONT = 'Times New Roman';
const SIZE = 22; // 11pt in half-points

const docxService = {
    async generateResume(resumeData, fileNameBase = 'Karne_Saibhargav_Resume') {
        const sections = [];
        const personalInfo = resumeData.personalInfo || {};

        // 1. NAME — large, bold, centered
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: personalInfo.name || 'Saibhargav Karne',
                        size: 56,        // ~28pt
                        bold: true,
                        font: FONT,
                        color: '000000'
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 80 }
            })
        );

        // 2. CONTACT LINE — centered, items separated by spaces/tabs
        const contactParts = [];
        const addContactText = (text) => {
            if (contactParts.length > 0) {
                contactParts.push(new TextRun({ text: '    ', size: SIZE, font: FONT }));
            }
            contactParts.push(new TextRun({ text, size: SIZE, font: FONT, color: '000000' }));
        };

        if (personalInfo.phone) addContactText(personalInfo.phone);

        if (personalInfo.email) {
            if (contactParts.length > 0) contactParts.push(new TextRun({ text: '    ', size: SIZE, font: FONT }));
            contactParts.push(new ExternalHyperlink({
                children: [new TextRun({ text: personalInfo.email, size: SIZE, font: FONT, style: 'Hyperlink' })],
                link: `mailto:${personalInfo.email}`
            }));
        }

        const addLinkContact = (url, display) => {
            if (!url) return;
            if (contactParts.length > 0) contactParts.push(new TextRun({ text: '    ', size: SIZE, font: FONT }));
            const cleanDisplay = display || url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
            const cleanLink = url.startsWith('http') ? url : `https://${url}`;
            contactParts.push(new ExternalHyperlink({
                children: [new TextRun({ text: cleanDisplay, size: SIZE, font: FONT, style: 'Hyperlink' })],
                link: cleanLink
            }));
        };

        addLinkContact(personalInfo.linkedin);
        addLinkContact(personalInfo.github);
        addLinkContact(personalInfo.website);

        sections.push(
            new Paragraph({
                children: contactParts,
                alignment: AlignmentType.CENTER,
                spacing: { after: 160 }
            })
        );

        // 3. JOB TITLE / TAGLINE — bold, left-aligned (e.g. "Machine Learning Data Engineer")
        if (resumeData.jobTitle || resumeData.tagline) {
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: resumeData.jobTitle || resumeData.tagline,
                            size: SIZE,
                            bold: true,
                            font: FONT,
                            color: '000000'
                        })
                    ],
                    alignment: AlignmentType.LEFT,
                    spacing: { before: 0, after: 80 }
                })
            );
        }

        // 4. SUMMARY — plain paragraph, no section header label
        if (resumeData.summary) {
            const summaryRuns = parseFormattedText(resumeData.summary);
            sections.push(
                new Paragraph({
                    children: summaryRuns.map(run =>
                        new TextRun({ text: run.text, size: SIZE, font: FONT, color: '000000', bold: run.bold })
                    ),
                    alignment: AlignmentType.BOTH,
                    spacing: { after: 160, line: 276 }
                })
            );
        }

        // 5. SKILLS
        if (resumeData.skills && Object.keys(resumeData.skills).length > 0) {
            sections.push(sectionHeader('SKILLS'));

            Object.entries(resumeData.skills).forEach(([category, skills]) => {
                const skillText = Array.isArray(skills) ? skills.join(', ') : skills;
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `${category}:`,
                                bold: true,
                                size: SIZE,
                                font: FONT,
                                color: '000000'
                            }),
                            new TextRun({
                                // no space — matches PDF style "Data Engineering:ETL..."
                                text: skillText,
                                size: SIZE,
                                font: FONT,
                                color: '000000'
                            })
                        ],
                        alignment: AlignmentType.BOTH,
                        spacing: { after: 60, line: 276 }
                    })
                );
            });
        }

        // 6. PROFESSIONAL EXPERIENCE
        if (resumeData.experience && resumeData.experience.length > 0) {
            sections.push(sectionHeader('PROFESSIONAL EXPERIENCE'));

            resumeData.experience.forEach((exp, index) => {
                // Role (bold), Company (normal) on left | Date | Location on right
                const entryChildren = [];

                if (exp.position) {
                    entryChildren.push(new TextRun({ text: exp.position, bold: true, size: SIZE, font: FONT, color: '000000' }));
                    entryChildren.push(new TextRun({ text: ', ', size: SIZE, font: FONT, color: '000000' }));
                }

                entryChildren.push(new TextRun({ text: exp.company || '', size: SIZE, font: FONT, color: '000000' }));

                // Right-aligned date + location
                const dateStr = exp.dates || exp.period || '';
                const location = exp.location || '';
                const rightText = [dateStr, location].filter(Boolean).join(' | ');
                if (rightText) {
                    entryChildren.push(new TextRun({ text: '\t', size: SIZE, font: FONT }));
                    entryChildren.push(new TextRun({ text: rightText, size: SIZE, font: FONT, color: '000000' }));
                }

                sections.push(
                    new Paragraph({
                        children: entryChildren,
                        tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(7.5) }],
                        spacing: { before: 160, after: 60 }
                    })
                );

                // Bullet points
                const achievements = exp.achievements || exp.bullets || exp.responsibilities || [];
                achievements.forEach((achievement, achIndex) => {
                    const isLastBullet = achIndex === achievements.length - 1;
                    const isLastJob = index === resumeData.experience.length - 1;
                    const achievementRuns = parseFormattedText(achievement);

                    sections.push(
                        new Paragraph({
                            children: achievementRuns.map(run =>
                                new TextRun({ text: run.text, size: SIZE, font: FONT, color: '000000', bold: run.bold })
                            ),
                            bullet: { level: 0 },
                            indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.25) },
                            spacing: { after: (isLastBullet && !isLastJob) ? 160 : 60, line: 276 }
                        })
                    );
                });
            });
        }

        // 7. EDUCATION
        if (resumeData.education && resumeData.education.length > 0) {
            sections.push(sectionHeader('EDUCATION'));

            resumeData.education.forEach((edu) => {
                // "Master of Science in Information Systems and Technology(CGPA: 3.8)" — bold, inline GPA
                const degreeText = edu.field ? `${edu.degree} in ${edu.field}` : edu.degree;
                const degreeWithGpa = edu.gpa ? `${degreeText}(CGPA: ${edu.gpa})` : degreeText;

                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: degreeWithGpa,
                                bold: true,
                                size: SIZE,
                                font: FONT,
                                color: '000000'
                            })
                        ],
                        spacing: { before: 120, after: 40 }
                    })
                );

                // School name on left, date | location on right
                const schoolChildren = [
                    new TextRun({ text: edu.school || '', size: SIZE, font: FONT, color: '000000' })
                ];

                const eduDateStr = edu.year || edu.dates || '';
                const eduLocation = edu.location || '';
                const eduRight = [eduDateStr, eduLocation].filter(Boolean).join(' | ');
                if (eduRight) {
                    schoolChildren.push(new TextRun({ text: '\t', size: SIZE, font: FONT }));
                    schoolChildren.push(new TextRun({ text: eduRight, size: SIZE, font: FONT, color: '000000' }));
                }

                sections.push(
                    new Paragraph({
                        children: schoolChildren,
                        tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(7.5) }],
                        spacing: { after: 100 }
                    })
                );
            });
        }

        // BUILD DOCUMENT
        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: convertInchesToTwip(0.75),
                            bottom: convertInchesToTwip(0.75),
                            left: convertInchesToTwip(1.0),
                            right: convertInchesToTwip(1.0)
                        }
                    }
                },
                children: sections
            }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${fileNameBase}.docx`);
    }
};

export default docxService;