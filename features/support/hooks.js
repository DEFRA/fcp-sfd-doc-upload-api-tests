import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import {
  After,
  Before,
  BeforeAll,
  Status,
  setDefaultTimeout
} from '@cucumber/cucumber'
import { getAuthToken } from '../../fixtures/auth.js'
import { TRACE_HEADER } from '../../fixtures/api-client.js'
import { RUN_ID } from '../../fixtures/run-id.js'

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
  this.traceId = `qa-${RUN_ID}-${randomUUID().slice(0, 8)}`
  this.token = await getAuthToken()
})

// On failure, print what is needed to find the scenario in the service logs: search for
// trace.id in CDP Kibana/OpenSearch. The same details are attached to the Allure report.
After(async function ({ result, pickle }) {
  if (result?.status !== Status.FAILED) {
    return
  }

  const ids = Object.entries({
    uploadId: this.uploadId,
    fileId: this.fileId,
    reference: this.crmReference
  })
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)

  const details = [
    `scenario: ${pickle.name}`,
    `trace.id (${TRACE_HEADER}): ${this.traceId}`,
    ...ids
  ].join('\n')

  process.stdout.write(`\nFAILED - ${details.replaceAll('\n', ' | ')}\n`)
  await this.attach(details, 'text/plain')
})
