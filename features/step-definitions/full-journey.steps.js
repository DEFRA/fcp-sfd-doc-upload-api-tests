import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import fs from 'node:fs'
import { buildInitiatePayload } from '../../fixtures/initiate-payload.js'

Given('I initiate an upload session with valid metadata', async function () {
  const payload = buildInitiatePayload()

  const response = await fetch(`${this.baseUrl}/api/v1/uploader/initiate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  assert.equal(response.status, 200, `Initiate failed: ${response.status}`)

  const body = await response.json()
  this.uploadId = body.data.uploadId
  this.uploadUrl = body.data.uploadUrl
  this.statusUrl = body.data.statusUrl
})

When('I upload a real PDF file to the CDP Uploader', async function () {
  const fileBuffer = fs.readFileSync('fixtures/files/test-document.pdf')
  const formData = new FormData()
  formData.append(
    'file-upload-1',
    new Blob([fileBuffer], { type: 'application/pdf' }),
    'test-document.pdf'
  )

  const response = await fetch(this.uploadUrl, {
    method: 'POST',
    body: formData,
    redirect: 'manual'
  })

  assert.equal(response.status, 302, `Expected 302, got ${response.status}`)
})

When(
  'I poll the status endpoint until the upload completes',
  async function () {
    const maxAttempts = 20
    const delayMs = 1000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.baseUrl}${this.statusUrl}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      })
      const body = await response.json()

      if (body.data.uploadStatus === 'failure') {
        throw new Error(`Upload ended with status: ${body.data.uploadStatus}`)
      }

      if (body.data.uploadStatus !== 'pending') {
        this.statusResponse = body
        return
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    throw new Error('Upload did not complete within timeout')
  }
)

Then('the upload status should be {string}', function (expectedStatus) {
  assert.equal(this.statusResponse.data.uploadStatus, expectedStatus)
})

Then('the response should contain the correct file metadata', function () {
  const form = this.statusResponse.data.form
  const firstFile = Object.values(form)[0]

  assert.ok(firstFile.fileId, 'Expected a fileId')
  assert.ok(firstFile.checksumSha256, 'Expected a checksum')
  assert.equal(firstFile.filename, 'test-document.pdf')

  this.fileId = firstFile.fileId
})

Then(
  'I should be able to retrieve a presigned download URL',
  async function () {
    const response = await fetch(`${this.baseUrl}/api/v1/blob/${this.fileId}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    })

    assert.equal(response.status, 200)

    const body = await response.json()
    assert.ok(body.data.url.startsWith('https://'), 'Expected a presigned URL')
    this.presignedUrl = body.data.url
  }
)

Then(
  'the file should be downloadable from the presigned URL',
  async function () {
    const response = await fetch(this.presignedUrl)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/pdf')
  }
)
