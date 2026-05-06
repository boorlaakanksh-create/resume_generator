import { assertAuthConfigured, createSessionCookie, verifyCredentials } from '../_lib/auth.js'

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export default async function handler(req, res) {
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

  const { email = '', password = '' } = req.body || {}
  const isValid = verifyCredentials(email, password)

  if (!isValid) {
    await wait(350)
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  res.setHeader('Set-Cookie', createSessionCookie(req, email))
  return res.status(200).json({
    user: {
      email: email.trim().toLowerCase()
    }
  })
}
