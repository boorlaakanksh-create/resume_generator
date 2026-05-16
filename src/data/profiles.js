const AKANKSH_GRADUATE_EDUCATION = [
  {
    school: 'University of North Texas',
    degree: 'Master of Science',
    field: 'Information Systems & Technology',
    year: '05/2024',
    location: 'Denton, TX',
    gpa: ''
  },
  {
    school: 'Mahatma Gandhi Institute of Technology',
    degree: 'Bachelor of Technology',
    field: 'Information Technology',
    year: '06/2021',
    location: 'Hyderabad, India',
    gpa: ''
  }
]

const AKANKSH_DATA_EDUCATION = [
  {
    school: 'University of North Texas',
    degree: 'Master of Science',
    field: 'Information Systems & Technology',
    year: '08/2022 - 05/2024',
    location: 'Texas, USA',
    gpa: ''
  },
  {
    school: 'Mahatma Gandhi Institute of Technology',
    degree: 'Bachelor of Technology',
    field: 'Information Technology',
    year: '06/2017 - 06/2021',
    location: 'Hyderabad, India',
    gpa: ''
  }
]

const AWS_DATA_ENGINEER_CERTIFICATION = [
  {
    name: 'AWS Certified Data Engineer - Associate',
    status: '',
    credentialId: '',
    certificationNumber: '',
    earnedOn: ''
  }
]

export const RESUME_PROFILES = [
  {
    id: 'java-full-stack-10yr',
    label: 'Java Full Stack - 10 Years',
    shortLabel: 'Java Full Stack 10yr',
    summary: 'Senior backend-heavy Java full stack profile with Java 8-17, Spring Boot microservices, Kafka, AWS, Terraform, Cassandra, PostgreSQL, MongoDB, and supporting React/Angular experience.',
    personalInfo: {
      name: 'Akanksh B',
      phone: '+1 (669) 999-0358',
      email: 'bakanksh9999@gmail.com',
      linkedin: ''
    },
    education: [],
    certifications: [],
    clientProjects: [
      'Truist Bank - Java 17 Spring Boot microservices and AWS MSK event pipelines',
      'Charles Schwab - Trading and portfolio platform microservices',
      'M&T Bank - Monolith-to-microservices modernization',
      'Comcast - Media delivery backend services',
      'Centene - Healthcare claims processing systems'
    ]
  },
  {
    id: 'edi',
    label: 'EDI',
    shortLabel: 'EDI',
    summary: 'JD-tailored EDI profile across ANSI X12, EDIFACT, EDI/ERP platforms, trading partner onboarding, mappings, SAP IDocs where required, AS2/SFTP/FTP, production support, monitoring, documentation, and domain-specific enterprise integrations.',
    personalInfo: {
      name: 'Akanksh B',
      phone: '+1 (669) 999-0358',
      email: 'bakanksh9999@gmail.com',
      linkedin: ''
    },
    education: [],
    certifications: [],
    clientProjects: [
      'Dynamic client 1 - Current domain-specific US enterprise client selected from JD context',
      'Dynamic client 2 - Prior domain-specific US enterprise client selected for realistic role progression',
      'Dynamic client 3 - Prior domain-specific US enterprise client selected for timeline and background-check safety'
    ]
  },
  {
    id: 'java-full-stack-5yr',
    label: 'Java Full Stack - 5 Years',
    shortLabel: 'Java Full Stack 5yr',
    summary: 'Java full stack profile with 5+ years across React.js, Next.js, TypeScript, GraphQL, Node.js, Express.js, Java, Spring Boot APIs, microservices, GCP/AWS, CI/CD, and testing.',
    personalInfo: {
      name: 'Akanksh B',
      phone: '+1 (940) 977-1112',
      email: 'akankshb1111@gmail.com',
      linkedin: ''
    },
    education: AKANKSH_GRADUATE_EDUCATION,
    certifications: [],
    clientProjects: [
      'Comerica Bank - React, Next.js, GraphQL, Node.js, and Spring Boot full stack delivery',
      'KeyCorp Bank - React, TypeScript, GraphQL, REST, Node.js, and Express.js applications',
      'Capgemini - Java, React, Node.js, Express.js, SQL, NoSQL, and API-driven systems'
    ]
  },
  {
    id: 'java-full-stack-3yr',
    label: 'Java Full Stack - 3 Years',
    shortLabel: 'Java Full Stack 3yr',
    summary: 'Java full stack profile with 3+ years across React.js, JavaScript, TypeScript, Node.js, Express.js, Java, Spring Boot, REST APIs, GraphQL integration, SQL databases, CI/CD, and Agile delivery.',
    personalInfo: {
      name: 'Akanksh B',
      phone: '+1 (940) 977-1112',
      email: 'akankshb1111@gmail.com',
      linkedin: ''
    },
    education: AKANKSH_GRADUATE_EDUCATION,
    certifications: [],
    clientProjects: [
      'Comerica Bank - React, Next.js, GraphQL, Node.js, Express.js, and Spring Boot full stack delivery',
      'KeyCorp Bank - React, TypeScript, REST APIs, GraphQL integration, Node.js, Express.js, and CI/CD'
    ]
  },
  {
    id: 'data-engineer-3yr',
    label: 'Data Engineer - 3 Years',
    shortLabel: 'Data Engineer 3yr',
    summary: 'Data Engineer profile with 3 years across Python, PySpark, SQL, Apache Kafka, AWS Kinesis, AWS Glue, S3, Lambda, Redshift, Snowflake, BigQuery, Informatica, Airflow, and Control-M.',
    personalInfo: {
      name: 'Akanksh Boorla',
      phone: '',
      email: 'boorla.akanksh@gmail.com',
      linkedin: ''
    },
    education: AKANKSH_DATA_EDUCATION,
    certifications: AWS_DATA_ENGINEER_CERTIFICATION,
    clientProjects: [
      'JP Morgan Chase & Co. - AWS Glue, PySpark, S3, Kafka, Kinesis, Airflow, Redshift, and CloudWatch data pipelines',
      'Infosys BPM Ltd. - Informatica PowerCenter, Oracle, Snowflake, Python, SQL, PySpark, AWS S3, and Control-M ETL workflows'
    ]
  },
  {
    id: 'data-analyst-3yr',
    label: 'Data Analyst - 3 Years',
    shortLabel: 'Data Analyst 3yr',
    summary: 'Data Analyst profile with 3+ years across SQL, Python, Pandas, NumPy, AWS S3, AWS Lambda, Power BI, Tableau, Excel, data validation, reconciliation, KPI reporting, and report automation.',
    personalInfo: {
      name: 'Akanksh Boorla',
      phone: '',
      email: 'boorla.akanksh@gmail.com',
      linkedin: ''
    },
    education: AKANKSH_GRADUATE_EDUCATION,
    certifications: AWS_DATA_ENGINEER_CERTIFICATION,
    clientProjects: [
      'JP Morgan Chase & Co. - SQL, Python, AWS S3/Lambda, Power BI, Excel, KPI dashboards, data quality, and reconciliation',
      'Infosys BPM Ltd. - SQL, Python, Excel, Power BI, Tableau, reporting automation, and stakeholder analytics'
    ]
  }
]

export const DEFAULT_PROFILE_ID = RESUME_PROFILES[0].id

export function getProfileById(profileId) {
  return RESUME_PROFILES.find((profile) => profile.id === profileId) || RESUME_PROFILES[0]
}
