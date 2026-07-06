import { Redis } from '@upstash/redis'
import { requireAuthenticatedSession } from './_lib/auth.js'

let redis

function getRedis() {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    throw new Error('Redis is not configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.')
  }

  redis = new Redis({ url, token })
  return redis
}

function getRequestBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') return JSON.parse(req.body)
  return req.body
}

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

function parseLimit(value) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return 25
  return Math.min(Math.max(parsed, 1), 100)
}

async function readMetadataRecord(id) {
  const redis = getRedis()
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (!requireAuthenticatedSession(req, res)) return

  try {
    const redis = getRedis()

    if (req.method === 'GET') {
      const { id, cursor, limit, fields } = req.query

      if (id) {
        if (fields === 'jd') {
          const storedJobDescription = await redis.get(`appjd:${id}`)
          if (typeof storedJobDescription === 'string') {
            return res.status(200).json({ jobDescription: storedJobDescription })
          }

          const legacyRecord = await redis.get(`app:${id}`)
          if (!legacyRecord) return res.status(404).json({ error: 'Not found' })

          const parsedLegacyRecord = parseStoredValue(legacyRecord)
          return res.status(200).json({ jobDescription: parsedLegacyRecord.jobDescription || '' })
        }

        if (fields === 'resume') {
          const [metadata, resumeJson] = await Promise.all([
            readMetadataRecord(id),
            redis.get(`appresume:${id}`)
          ])

          if (metadata && resumeJson) {
            return res.status(200).json({
              id: metadata.id,
              fileName: metadata.fileName,
              profileId: metadata.profileId,
              profileLabel: metadata.profileLabel,
              resumeJson: parseStoredValue(resumeJson)
            })
          }

          const legacyRecord = await redis.get(`app:${id}`)
          if (!legacyRecord) return res.status(404).json({ error: 'Not found' })

          const parsedLegacyRecord = parseStoredValue(legacyRecord)
          return res.status(200).json({
            id: parsedLegacyRecord.id,
            fileName: parsedLegacyRecord.fileName,
            profileId: parsedLegacyRecord.profileId,
            profileLabel: parsedLegacyRecord.profileLabel,
            resumeJson: parsedLegacyRecord.resumeJson
          })
        }

        const record = await redis.get(`app:${id}`)
        if (!record) return res.status(404).json({ error: 'Not found' })
        return res.status(200).json(parseStoredValue(record))
      }

      const pageLimit = parseLimit(limit)
      const startIndex = Math.max(Number.parseInt(cursor, 10) || 0, 0)
      const endIndex = startIndex + pageLimit - 1

      const [ids, total] = await Promise.all([
        redis.lrange('app:index', startIndex, endIndex),
        redis.llen('app:index')
      ])

      if (!ids || ids.length === 0) {
        return res.status(200).json({
          items: [],
          total,
          nextCursor: null,
          hasMore: false
        })
      }

      const metadata = await Promise.all(ids.map((recordId) => readMetadataRecord(recordId)))
      const items = metadata.filter(Boolean)
      const nextCursor = startIndex + ids.length

      return res.status(200).json({
        items,
        total,
        nextCursor: nextCursor < total ? nextCursor : null,
        hasMore: nextCursor < total
      })
    }

    if (req.method === 'POST') {
      const { fileName, company, role, profileId, profileLabel, resumeJson, jobDescription } = getRequestBody(req)

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
      await redis.set(`appresume:${id}`, JSON.stringify(resumeJson))
      if (jobDescription?.trim()) {
        await redis.set(`appjd:${id}`, jobDescription)
      }
      await redis.set(`appmeta:${id}`, JSON.stringify(metadataRecord))
      await redis.lpush('app:index', id)

      return res.status(201).json({ id })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'id is required' })

      await redis.del(`app:${id}`)
      await redis.del(`appresume:${id}`)
      await redis.del(`appjd:${id}`)
      await redis.del(`appmeta:${id}`)
      await redis.lrem('app:index', 0, id)

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Tracker API error:', error)
    return res.status(500).json({
      error: error.message || 'Tracker API failed'
    })
  }
}
