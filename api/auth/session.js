import { assertAuthConfigured, getSessionFromRequest } from '../_lib/auth.js'

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!assertAuthConfigured(res)) return

  const session = getSessionFromRequest(req)
  if (!session) {
    return res.status(200).json({ authenticated: false })
  }

  return res.status(200).json({
    authenticated: true,
    user: {
      email: session.sub
    }
  })
}
