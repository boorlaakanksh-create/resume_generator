import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

function parseStoredValue(value) {
  return typeof value === 'string' ? JSON.parse(value) : value
}

function buildMetadata(record) {
  const { resumeJson, jobDescription, ...meta } = record
  return {
    ...meta,
    hasJobDescription: Boolean(jobDescription?.trim())
  }
}

async function readMetadataRecord(id) {
  const metadata = await redis.get(`appmeta:${id}`)
  if (metadata) return parseStoredValue(metadata)

  const fullRecord = await redis.get(`app:${id}`)
  if (!fullRecord) return null

  const parsedRecord = parseStoredValue(fullRecord)
  const fallbackMetadata = buildMetadata(parsedRecord)
  await redis.set(`appmeta:${id}`, JSON.stringify(fallbackMetadata))
  return fallbackMetadata
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method === 'GET') {
    const { id } = req.query

    if (id) {
      const record = await redis.get(`app:${id}`)
      if (!record) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(parseStoredValue(record))
    }

    const ids = await redis.lrange('app:index', 0, -1)
    if (!ids || ids.length === 0) return res.status(200).json([])

    const metadata = await Promise.all(ids.map((recordId) => readMetadataRecord(recordId)))
    return res.status(200).json(metadata.filter(Boolean))
  }

  if (req.method === 'POST') {
    const { fileName, company, role, profileId, profileLabel, resumeJson, jobDescription } = req.body

    if (!fileName || !resumeJson) {
      return res.status(400).json({ error: 'fileName and resumeJson are required' })
    }

    const id = Date.now().toString()
    const date = new Date().toISOString()
    const metadataRecord = {
      id,
      fileName,
      company: company || '',
      role: role || '',
      profileId: profileId || '',
      profileLabel: profileLabel || '',
      date,
      hasJobDescription: Boolean(jobDescription?.trim())
    }
    const fullRecord = {
      ...metadataRecord,
      jobDescription: jobDescription || '',
      resumeJson
    }

    await redis.set(`app:${id}`, JSON.stringify(fullRecord))
    await redis.set(`appmeta:${id}`, JSON.stringify(metadataRecord))
    await redis.lpush('app:index', id)

    return res.status(201).json({ id })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id is required' })

    await redis.del(`app:${id}`)
    await redis.del(`appmeta:${id}`)
    await redis.lrem('app:index', 0, id)

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
