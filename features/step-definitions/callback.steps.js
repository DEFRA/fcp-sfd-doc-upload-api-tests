import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import { buildCallbackPayload } from '../../fixtures/callback-payload.js'

Given('a valid callback payload with a single complete file', function () {
  this.callbackPayload = buildCallbackPayload()
})

Given('a callback payload with the sbi field missing', function () {
  const payload = buildCallbackPayload()
  delete payload.metadata.sbi
  this.callbackPayload = payload
})

Given('a valid callback payload with an unexpected field added', function () {
  const payload = buildCallbackPayload()
  payload.unexpectedField = 'should not be here'
  this.callbackPayload = payload
})

When(
  'the callback payload is posted to the object processor',
  async function () {
    this.callbackResponse = await fetch(`${this.baseUrl}/api/v1/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(this.callbackPayload)
    })
    this.callbackResponseBody = await this.callbackResponse.json()
  }
)

When('the same callback payload is posted again', async function () {
  this.secondCallbackResponse = await fetch(`${this.baseUrl}/api/v1/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`
    },
    body: JSON.stringify(this.callbackPayload)
  })
  this.secondCallbackResponseBody = await this.secondCallbackResponse.json()
})

Then('the callback response status should be {int}', function (expectedStatus) {
  assert.equal(
    this.callbackResponse.status,
    expectedStatus,
    `Expected ${expectedStatus}, got ${this.callbackResponse.status}. Body: ${JSON.stringify(this.callbackResponseBody)}`
  )
})

Then('the callback response should confirm metadata was created', function () {
  assert.equal(this.callbackResponseBody.message, 'Metadata created')
  assert.ok(
    this.callbackResponseBody.count >= 1,
    'Expected count to be at least 1'
  )
  assert.ok(
    Array.isArray(this.callbackResponseBody.ids),
    'Expected ids to be an array'
  )
})

Then(
  'the second callback response status should be {int}',
  function (expectedStatus) {
    assert.equal(
      this.secondCallbackResponse.status,
      expectedStatus,
      `Expected ${expectedStatus}, got ${this.secondCallbackResponse.status}`
    )
  }
)

Then(
  'the second callback response should confirm the duplicate was ignored',
  function () {
    assert.equal(
      this.secondCallbackResponseBody.message,
      'Duplicate callback ignored'
    )
  }
)

Then(
  'only one record should exist in MongoDB for that fileId',
  async function () {
    const sbi = this.callbackPayload.metadata.sbi
    const fileId = this.callbackPayload.form['file-upload-1'].fileId

    const response = await fetch(`${this.baseUrl}/api/v1/metadata/sbi/${sbi}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    })

    assert.equal(response.status, 200, `Expected 200, got ${response.status}`)

    const body = await response.json()
    const matchingRecords = body.data.filter(
      (record) => record.file.fileId === fileId
    )

    assert.equal(
      matchingRecords.length,
      1,
      `Expected exactly 1 record for fileId ${fileId}, got ${matchingRecords.length}`
    )
  }
)

Then('the callback response should indicate a validation failure', function () {
  assert.notEqual(this.callbackResponseBody.message, 'Metadata created')
})

Then(
  'the callback response body should indicate validation failure',
  function () {
    assert.equal(
      this.callbackResponseBody.message,
      'Validation failure persisted',
      `Expected 'Validation failure persisted', got '${this.callbackResponseBody.message}'`
    )
  }
)
