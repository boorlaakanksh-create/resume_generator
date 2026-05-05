import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    TabStopType,
    convertInchesToTwip,
    BorderStyle,
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

    if (runs.length === 0) {
        runs.push({ text: text, bold: false });
    }

    return runs;
}

// Handles both MM/YYYY and YYYY-MM formats
function formatYear(dateStr) {
    if (!dateStr) return '';
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // MM/YYYY (education dates like "12/2023")
    if (/^\d{2}\/\d{4}$/.test(dateStr)) {
        const [month, year] = dateStr.split('/');
        return `${months[parseInt(month) - 1]} ${year}`;
    }

    // YYYY-MM
    if (/^\d{4}-\d{2}$/.test(dateStr)) {
        const [year, month] = dateStr.split('-');
        return `${months[parseInt(month) - 1]} ${year}`;
    }

    return dateStr;
}

function sectionHeader(text) {
    return new Paragraph({
        children: [
            new TextRun({
                text,
                size: 24,
                bold: true,
                font: 'Times New Roman',
                color: '000000'
            })
        ],
        alignment: AlignmentType.LEFT,
        spacing: { before: 240, after: 120 },
        border: {
            bottom: {
                color: '000000',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 4
            }
        }
    });
}

const docxService = {
    async generateResume(resumeData, fileNameBase = 'Karne_Saibhargav_Resume') {
        const sections = [];
        const personalInfo = resumeData.personalInfo || {};

        // 1. NAME
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: personalInfo.name || 'Saibhargav Karne',
                        size: 52,
                        bold: true,
                        font: 'Times New Roman',
                        color: '000000'
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 80 }
            })
        );

        // 2. CONTACT LINE
        const contactChildren = [];
        const addSep = () => {
            if (contactChildren.length > 0) {
                contactChildren.push(new TextRun({
                    text: ' | ',
                    size: 22,
                    font: 'Times New Roman',
                    color: '000000'
                }));
            }
        };

        const displayLocation = resumeData.contactLocation || personalInfo.location;
        if (displayLocation) {
            contactChildren.push(new TextRun({
                text: displayLocation,
                size: 22,
                font: 'Times New Roman',
                color: '000000'
            }));
        }

        if (personalInfo.phone) {
            addSep();
            contactChildren.push(new TextRun({
                text: personalInfo.phone,
                size: 22,
                font: 'Times New Roman',
                color: '000000'
            }));
        }

        if (personalInfo.email) {
            addSep();
            contactChildren.push(new ExternalHyperlink({
                children: [new TextRun({
                    text: personalInfo.email,
                    size: 22,
                    font: 'Times New Roman',
                    style: 'Hyperlink'
                })],
                link: `mailto:${personalInfo.email}`
            }));
        }

        const addLink = (url, display) => {
            if (!url) return;
            addSep();
            const cleanDisplay = display || url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
            const cleanLink = url.startsWith('http') ? url : `https://${url}`;
            contactChildren.push(new ExternalHyperlink({
                children: [new TextRun({
                    text: cleanDisplay,
                    size: 22,
                    font: 'Times New Roman',
                    style: 'Hyperlink'
                })],
                link: cleanLink
            }));
        };

        addLink(personalInfo.linkedin);
        addLink(personalInfo.github);
        addLink(personalInfo.website);

        sections.push(
            new Paragraph({
                children: contactChildren,
                alignment: AlignmentType.CENTER,
                spacing: { after: 240 }
            })
        );

        // 3. PROFESSIONAL SUMMARY
        if (resumeData.summary) {
            sections.push(sectionHeader('PROFESSIONAL SUMMARY'));

            const summaryRuns = parseFormattedText(resumeData.summary);
            sections.push(
                new Paragraph({
                    children: summaryRuns.map(run =>
                        new TextRun({
                            text: run.text,
                            size: 22,
                            font: 'Times New Roman',
                            color: '000000',
                            bold: run.bold
                        })
                    ),
                    spacing: { after: 120, line: 276 }
                })
            );
        }

        // 4. EMPLOYMENT HISTORY
        if (resumeData.experience && resumeData.experience.length > 0) {
            sections.push(sectionHeader('EMPLOYMENT HISTORY'));

            resumeData.experience.forEach((exp, index) => {
                const titleChildren = [
                    new TextRun({
                        text: exp.company,
                        bold: true,
                        size: 22,
                        font: 'Times New Roman',
                        color: '000000'
                    })
                ];

                if (exp.location) {
                    titleChildren.push(new TextRun({
                        text: `, ${exp.location}`,
                        size: 22,
                        font: 'Times New Roman',
                        color: '000000'
                    }));
                }

                const dateStr = exp.dates || exp.period;
                if (dateStr) {
                    titleChildren.push(new TextRun({ text: '\t' }));
                    titleChildren.push(new TextRun({
                        text: dateStr,
                        size: 22,
                        font: 'Times New Roman',
                        color: '000000'
                    }));
                }

                sections.push(
                    new Paragraph({
                        children: titleChildren,
                        tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(7.5) }],
                        spacing: { before: 120, after: exp.position ? 40 : 100 }
                    })
                );

                if (exp.position) {
                    sections.push(
                        new Paragraph({
                            children: [new TextRun({
                                text: exp.position,
                                italics: true,
                                size: 22,
                                font: 'Times New Roman',
                                color: '000000'
                            })],
                            spacing: { before: 0, after: 80 }
                        })
                    );
                }

                const achievements = exp.achievements || exp.bullets || exp.responsibilities || [];
                achievements.forEach((achievement, achIndex) => {
                    const isLastBullet = achIndex === achievements.length - 1;
                    const isLastJob = index === resumeData.experience.length - 1;
                    const achievementRuns = parseFormattedText(achievement);

                    sections.push(
                        new Paragraph({
                            children: achievementRuns.map(run =>
                                new TextRun({
                                    text: run.text,
                                    size: 22,
                                    font: 'Times New Roman',
                                    color: '000000',
                                    bold: run.bold
                                })
                            ),
                            bullet: { level: 0 },
                            indent: {
                                left: convertInchesToTwip(0.25),
                                hanging: convertInchesToTwip(0.25)
                            },
                            spacing: {
                                after: (isLastBullet && !isLastJob) ? 200 : 60,
                                line: 260
                            }
                        })
                    );
                });
            });
        }

        // 5. TECHNICAL SKILLS & TOOLS
        if (resumeData.skills && Object.keys(resumeData.skills).length > 0) {
            sections.push(sectionHeader('TECHNICAL SKILLS & TOOLS'));

            Object.entries(resumeData.skills).forEach(([category, skills]) => {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `${category}: `,
                                bold: true,
                                size: 22,
                                font: 'Times New Roman',
                                color: '000000'
                            }),
                            new TextRun({
                                text: Array.isArray(skills) ? skills.join(', ') : skills,
                                size: 22,
                                font: 'Times New Roman',
                                color: '000000'
                            })
                        ],
                        spacing: { after: 100 }
                    })
                );
            });
        }

        // 6. EDUCATION
        if (resumeData.education && resumeData.education.length > 0) {
            sections.push(sectionHeader('EDUCATION'));

            resumeData.education.forEach((edu, index) => {
                const degreeText = edu.field
                    ? `${edu.degree} in ${edu.field}`
                    : edu.degree;

                const schoolChildren = [
                    new TextRun({
                        text: edu.school,
                        bold: true,
                        size: 22,
                        font: 'Times New Roman',
                        color: '000000'
                    }),
                    new TextRun({
                        text: ' | ',
                        size: 22,
                        font: 'Times New Roman',
                        color: '000000'
                    }),
                    new TextRun({
                        text: degreeText,
                        italics: true,
                        size: 22,
                        font: 'Times New Roman',
                        color: '000000'
                    })
                ];

                if (edu.year) {
                    schoolChildren.push(new TextRun({ text: '\t' }));
                    schoolChildren.push(new TextRun({
                        text: formatYear(edu.year),
                        bold: true,
                        size: 22,
                        font: 'Times New Roman',
                        color: '000000'
                    }));
                }

                sections.push(
                    new Paragraph({
                        children: schoolChildren,
                        tabStops: [{ type: TabStopType.RIGHT, position: convertInchesToTwip(7.5) }],
                        spacing: { before: 120, after: 80 }
                    })
                );

                if (edu.gpa) {
                    sections.push(
                        new Paragraph({
                            children: [new TextRun({
                                text: `GPA: ${edu.gpa}`,
                                size: 22,
                                font: 'Times New Roman',
                                color: '000000'
                            })],
                            spacing: { after: index === resumeData.education.length - 1 ? 100 : 200 }
                        })
                    );
                }
            });
        }

        // BUILD DOCUMENT
        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: convertInchesToTwip(0.5),
                            bottom: convertInchesToTwip(0.5),
                            left: convertInchesToTwip(0.5),
                            right: convertInchesToTwip(0.5)
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
