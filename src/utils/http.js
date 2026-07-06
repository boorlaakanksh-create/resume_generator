export async function readJsonResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  const rawText = await response.text()

  if (!rawText) return { data: null, rawText: '' }
  if (contentType.includes('application/json')) return { data: JSON.parse(rawText), rawText }
  return { data: null, rawText }
}

export function buildApiUnavailableMessage(rawText) {
  if (rawText.includes('<!doctype html') || rawText.includes('<html')) {
    return 'Auth API is not running in this local Vite session. Use the deployed app or Vercel dev so /api routes are available.'
  }

  return 'Auth API is unavailable. Verify your Vercel/serverless routes and environment variables.'
}
