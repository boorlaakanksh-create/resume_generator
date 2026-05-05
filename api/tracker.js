import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

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
      const parsed = typeof record === 'string' ? JSON.parse(record) : record
      return res.status(200).json(parsed)
    }

    const ids = await redis.lrange('app:index', 0, -1)
    if (!ids || ids.length === 0) return res.status(200).json([])

    const records = await Promise.all(ids.map((recordId) => redis.get(`app:${recordId}`)))
    const metadata = records
      .filter(Boolean)
      .map((recordValue) => {
        const record = typeof recordValue === 'string' ? JSON.parse(recordValue) : recordValue
        const { resumeJson, ...meta } = record
        return meta
      })

    return res.status(200).json(metadata)
  }

  if (req.method === 'POST') {
    const { fileName, company, role, profileId, profileLabel, resumeJson } = req.body

    if (!fileName || !resumeJson) {
      return res.status(400).json({ error: 'fileName and resumeJson are required' })
    }

    const id = Date.now().toString()
    const date = new Date().toISOString()
    const record = {
      id,
      fileName,
      company: company || '',
      role: role || '',
      profileId: profileId || '',
      profileLabel: profileLabel || '',
      date,
      resumeJson
    }

    await redis.set(`app:${id}`, JSON.stringify(record))
    await redis.lpush('app:index', id)

    return res.status(201).json({ id })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'id is required' })

    await redis.del(`app:${id}`)
    await redis.lrem('app:index', 0, id)

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
