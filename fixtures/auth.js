import 'dotenv/config'

export const getAuthToken = async () => {
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
    body: params
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to get Cognito token: ${response.status} - ${text}`)
  }

  const data = await response.json()
  return data.access_token
}
