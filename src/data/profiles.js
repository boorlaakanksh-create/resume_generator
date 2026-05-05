const DATA_ENGINEERING_EDUCATION = [
  {
    school: 'University of North Texas',
    degree: 'M.S.',
    field: 'Information Systems and Technology',
    year: '12/2023',
    location: 'Denton, TX',
    gpa: '3.8'
  }
]

const D365_EDUCATION = [
  {
    school: 'University of North Texas',
    degree: 'Masters',
    field: 'Information Systems and Technology',
    year: 'Aug 2022 - Dec 2023',
    location: 'Denton, TX',
    gpa: '3.8'
  },
  {
    school: 'JNTUH - TKR College of Engineering and Technology',
    degree: 'Bachelors',
    field: 'Computer Science and Engineering',
    year: 'June 2017 - May 2021',
    location: 'Hyderabad, India',
    gpa: '3.6'
  }
]

const D365_CERTIFICATIONS = [
  {
    name: 'Microsoft Certified: Power Platform Fundamentals',
    status: 'Active (Online Verifiable)',
    credentialId: '1A0F2BF590189A86',
    certificationNumber: '8A0CLF-623514',
    earnedOn: 'October 8, 2024'
  },
  {
    name: 'Microsoft Certified: Power Platform Functional Consultant',
    status: 'Active (Online Verifiable)',
    credentialId: 'C16B0ED725B5AF0',
    certificationNumber: 'I99185-217455',
    earnedOn: 'January 5, 2025'
  }
]

export const RESUME_PROFILES = [
  {
    id: 'data-engineer-4yr',
    label: 'Data Engineer - 4 Years',
    shortLabel: 'Data Engineer 4yr',
    summary: 'Current data engineering profile for Python, SQL, AWS, Azure, Spark, and ETL-heavy roles.',
    personalInfo: {
      name: 'Saibhargav Karne',
      phone: '9402270810',
      email: 'sbk080@yahoo.com',
      linkedin: 'https://www.linkedin.com/in/saibhargavkarne/'
    },
    education: DATA_ENGINEERING_EDUCATION,
    certifications: [],
    clientProjects: []
  },
  {
    id: 'd365-power-platform-6yr',
    label: 'D365 & Power Platform - 6 Years',
    shortLabel: 'D365 Power Platform 6yr',
    summary: 'Power Platform Developer with 5+ years of experience and 2+ years focused on Power Automate, Canvas Apps, Dataverse, SAP integration, and enterprise workflow automation.',
    personalInfo: {
      name: 'Saibhargav Karne',
      phone: '(940) 368-1088',
      email: 'saibhargavkarne08@gmail.com',
      linkedin: 'https://www.linkedin.com/in/sbkarne/'
    },
    education: D365_EDUCATION,
    certifications: D365_CERTIFICATIONS,
    clientProjects: [
      'Kraft Heinz - PO Management',
      'Microsoft - SLOP (Store Level Operational Processes)',
      'Microsoft - Contract Coverage',
      'Accenture / Adidas - Retail Store Performance Tracker',
      'Accenture / Adidas - D365 Marketing Application',
      'Airen Technologies - Customer Onboarding Process'
    ]
  },
  {
    id: 'd365-power-platform-10yr',
    label: 'D365 & Power Platform - 10 Years',
    shortLabel: 'D365 Power Platform 10yr',
    summary: 'Senior Microsoft Dynamics 365 and Power Platform specialist with 9+ years across Dynamics 365 CE, Dataverse, Model-Driven Apps, Canvas Apps, Power Pages, Azure integrations, ALM, and enterprise CRM support.',
    personalInfo: {
      name: 'Saibhargav Karne',
      phone: '(469) 666-7274',
      email: 'saibhargav5088@gmail.com',
      linkedin: 'https://www.linkedin.com/in/sbkarne/'
    },
    education: [
      {
        school: 'Bachelors',
        degree: 'Computer Science and Engineering',
        field: '',
        year: '2016',
        location: '',
        gpa: ''
      }
    ],
    certifications: [
      {
        name: 'Microsoft Certified: Power Platform Developer Associate',
        status: 'Active (Online Verifiable)',
        credentialId: '1A0F2BF590189A86',
        certificationNumber: '8A0CLF-623514',
        earnedOn: 'October 8, 2024'
      },
      {
        name: 'Microsoft Certified: Power Platform Functional Consultant',
        status: 'Active (Online Verifiable)',
        credentialId: 'C16B0ED725B5AF0',
        certificationNumber: 'I99185-217455',
        earnedOn: 'January 5, 2025'
      }
    ],
    clientProjects: [
      'Microsoft (Aptly Technology Corporation) - Enterprise Dynamics 365 CE platform',
      'C&S Wholesale Grocers - Legacy CRM modernization',
      'Sun Powered Productions - Dynamics 365 CE implementation and upgrade',
      'Deloitte - Multi-region Dynamics CRM enterprise delivery'
    ]
  }
]

export const DEFAULT_PROFILE_ID = RESUME_PROFILES[0].id

export function getProfileById(profileId) {
  return RESUME_PROFILES.find((profile) => profile.id === profileId) || RESUME_PROFILES[0]
}
