import 'dotenv/config'
import { Before, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber'
import { getAuthToken } from '../../fixtures/auth.js'

const REQUIRED_ENV = [
  'OBJECT_PROCESSOR_URL',
  'COGNITO_TOKEN_URL',
  'COGNITO_CLIENT_ID',
  'COGNITO_CLIENT_SECRET',
  'TEST_USER_SBI',
  'TEST_USER_CRN',
  'TEST_USER_FRN',
  'TEST_S3_BUCKET'
]

setDefaultTimeout(60 * 1000) // 60 seconds

BeforeAll(function () {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. See .env.example.`
    )
  }
})

// The token is fetched once and reused, so this only calls Cognito on the first
// scenario and again when the token is close to expiring.
Before(async function () {
  this.token = await getAuthToken()
})
