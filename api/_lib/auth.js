import crypto from 'node:crypto'

const SESSION_COOKIE_NAME = 'resume_app_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest()
}

function timingSafeStringEqual(left, right) {
  return crypto.timingSafeEqual(sha256(String(left)), sha256(String(right)))
}

function getAuthConfig() {
  return {
    email: process.env.AUTH_LOGIN_EMAIL || '',
    password: process.env.AUTH_LOGIN_PASSWORD || '',
    sessionSecret: process.env.AUTH_SESSION_SECRET || ''
  }
}

function isSecureRequest(req) {
  return process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https'
}

function serializeCookie(name, value, req, maxAgeSeconds) {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAgeSeconds}`]
  if (isSecureRequest(req)) parts.push('Secure')
  return parts.join('; ')
}

function parseCookies(headerValue = '') {
  return headerValue
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=')
      if (separatorIndex === -1) return cookies
      cookies[part.slice(0, separatorIndex)] = decodeURIComponent(part.slice(separatorIndex + 1))
      return cookies
    }, {})
}

function signPayload(encodedPayload, secret) {
  return crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

export function isAuthConfigured() {
  const { email, password, sessionSecret } = getAuthConfig()
  return Boolean(email && password && sessionSecret)
}

export function verifyCredentials(email, password) {
  const config = getAuthConfig()
  if (!config.email || !config.password) return false

  return timingSafeStringEqual(email.trim().toLowerCase(), config.email.trim().toLowerCase()) &&
    timingSafeStringEqual(password, config.password)
}

export function createSessionCookie(req, email) {
  const { sessionSecret } = getAuthConfig()
  const payload = {
    sub: email.trim().toLowerCase(),
    exp: Date.now() + SESSION_TTL_SECONDS * 1000
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = signPayload(encodedPayload, sessionSecret)
  return serializeCookie(SESSION_COOKIE_NAME, `${encodedPayload}.${signature}`, req, SESSION_TTL_SECONDS)
}

export function clearSessionCookie(req) {
  return serializeCookie(SESSION_COOKIE_NAME, '', req, 0)
}

export function getSessionFromRequest(req) {
  const { sessionSecret } = getAuthConfig()
  const token = parseCookies(req.headers.cookie || '')[SESSION_COOKIE_NAME]
  if (!token || !sessionSecret) return null

  const [encodedPayload, providedSignature] = token.split('.')
  if (!encodedPayload || !providedSignature) return null

  const expectedSignature = signPayload(encodedPayload, sessionSecret)
  if (!timingSafeStringEqual(providedSignature, expectedSignature)) return null

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload))
    if (!payload?.sub || !payload?.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function requireAuthenticatedSession(req, res) {
  if (!isAuthConfigured()) return { sub: 'unconfigured-auth' }

  const session = getSessionFromRequest(req)
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }

  return session
}
