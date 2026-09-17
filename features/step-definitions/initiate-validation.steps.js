import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import { buildInitiatePayload } from '../../fixtures/initiate-payload.js'
import { setPath, deletePath } from '../../fixtures/object-path.js'

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

Given(
  'an initiate payload with {string} set to JSON {string}',
  function (path, rawValue) {
    this.invalidInitiatePayload = setPath(
      buildInitiatePayload(),
      path,
      JSON.parse(rawValue)
    )
  }
)

Given('an initiate payload without {string}', function (path) {
  this.invalidInitiatePayload = deletePath(buildInitiatePayload(), path)
})

const postInitiateWithAuthorization = (baseUrl, authorizationHeader) =>
  fetch(`${baseUrl}/api/v1/uploader/initiate`, {
    method: 'POST',
    headers: {
      Authorization: authorizationHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(buildInitiatePayload())
  })

When(
  'I attempt to initiate an upload session with the Authorization header {string}',
  async function (authorizationHeader) {
    this.authResponse = await postInitiateWithAuthorization(
      this.baseUrl,
      authorizationHeader
    )
  }
)

When(
  'I attempt to initiate an upload session with Basic credentials',
  async function () {
    const credentials = Buffer.from('test-user:not-a-real-password').toString(
      'base64'
    )
    this.authResponse = await postInitiateWithAuthorization(
      this.baseUrl,
      `Basic ${credentials}`
    )
  }
)

Then('the initiate validation error should reference {string}', function (key) {
  assert.equal(
    this.initiateResponseBody.error,
    'Bad Request',
    `Expected 'Bad Request', got '${this.initiateResponseBody.error}'`
  )
  assert.ok(
    this.initiateResponseBody.validation.keys.includes(key),
    `Expected validation.keys to include '${key}', got: ${JSON.stringify(this.initiateResponseBody.validation.keys)}`
  )
})

Then(
  'the initiate response should contain a valid upload session',
  function () {
    const { uploadId, uploadUrl, statusUrl } = this.initiateResponseBody.data

    assert.match(uploadId, UUID_V4, `Expected a UUID v4, got '${uploadId}'`)
    assert.ok(
      uploadUrl.endsWith(`/upload-and-scan/${uploadId}`),
      `Expected uploadUrl to end with /upload-and-scan/${uploadId}, got '${uploadUrl}'`
    )
    assert.equal(statusUrl, `/api/v1/uploader/status/${uploadId}`)
  }
)
