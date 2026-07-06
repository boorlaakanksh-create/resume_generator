import { getSessionFromRequest, isAuthConfigured } from '../_lib/auth.js'

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  if (!isAuthConfigured()) {
    return res.status(200).json({
      authenticated: true,
      authConfigured: false,
      user: { email: 'auth-not-configured' }
    })
  }

  const session = getSessionFromRequest(req)
  return res.status(200).json({
    authenticated: Boolean(session),
    authConfigured: true,
    user: session ? { email: session.sub } : null
  })
}
