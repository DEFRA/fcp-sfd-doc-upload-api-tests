import 'dotenv/config'

const EXPIRY_MARGIN_MS = 60 * 1000
const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600
const TOKEN_REQUEST_TIMEOUT_MS = 15 * 1000

let cachedToken = null
let tokenRequest = null

const requestToken = async () => {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.COGNITO_CLIENT_ID,
    client_secret: process.env.COGNITO_CLIENT_SECRET
  })

  if (process.env.COGNITO_SCOPE) {
    params.append('scope', process.env.COGNITO_SCOPE)
  }

  const response = await fetch(process.env.COGNITO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
    signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to get Cognito token: ${response.status} - ${text}`)
  }

  const data = await response.json()
  const lifetimeSeconds = data.expires_in ?? DEFAULT_TOKEN_LIFETIME_SECONDS

  return {
    value: data.access_token,
    expiresAt: Date.now() + lifetimeSeconds * 1000 - EXPIRY_MARGIN_MS
  }
}

// One token is shared by every scenario in the run and replaced shortly before it
// expires. Concurrent callers share a single in-flight request.
export const getAuthToken = async () => {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value
  }

  tokenRequest ??= requestToken()
    .then((token) => {
      cachedToken = token
      return token
    })
    .finally(() => {
      tokenRequest = null
    })

  return (await tokenRequest).value
}
