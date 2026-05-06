import { assertAuthConfigured, clearSessionCookie } from '../_lib/auth.js'

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!assertAuthConfigured(res)) return

  res.setHeader('Set-Cookie', clearSessionCookie(req))
  return res.status(200).json({ success: true })
}
