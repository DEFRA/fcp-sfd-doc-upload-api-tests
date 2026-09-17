import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import fs from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { buildInitiatePayload } from '../../fixtures/initiate-payload.js'

import {
  createLargeFile,
  cleanupLargeFile
} from '../../fixtures/large-file-helper.js'

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
  this.uploadResponse = response
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

      if (body.data && body.data.uploadStatus !== 'pending') {
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

When(
  'I upload a {string} of type {string} to the CDP Uploader',
  async function (filename, contentType) {
    const fileBuffer = fs.readFileSync(`fixtures/files/${filename}`)
    const formData = new FormData()
    formData.append(
      'file-upload-1',
      new Blob([fileBuffer], { type: contentType }),
      filename
    )

    const response = await fetch(this.uploadUrl, {
      method: 'POST',
      body: formData,
      redirect: 'manual'
    })

    assert.equal(response.status, 302, `Expected 302, got ${response.status}`)
  }
)

Then(
  'the response should contain the correct file metadata for {string}',
  function (expectedFilename) {
    const form = this.statusResponse.data.form
    const firstFile = Object.values(form)[0]

    assert.ok(firstFile.fileId, 'Expected a fileId')
    assert.ok(firstFile.checksumSha256, 'Expected a checksum')
    assert.equal(firstFile.filename, expectedFilename)

    this.fileId = firstFile.fileId
  }
)

When(
  'I upload a {string} of type {string} to the CDP Uploader as an unsupported file',
  async function (filename, contentType) {
    const fileBuffer = fs.readFileSync(`fixtures/files/${filename}`)
    const formData = new FormData()
    formData.append(
      'file-upload-1',
      new Blob([fileBuffer], { type: contentType }),
      filename
    )

    this.uploadResponse = await fetch(this.uploadUrl, {
      method: 'POST',
      body: formData,
      redirect: 'manual'
    })
  }
)

When(
  'I check the status endpoint for the unsupported upload',
  async function () {
    this.statusResponse = await fetch(`${this.baseUrl}${this.statusUrl}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    })
  }
)

Then(
  'the status response should indicate the unsupported upload was not accepted',
  function () {
    assert.equal(
      this.statusResponse.data.uploadStatus,
      'failure',
      `Expected uploadStatus 'failure', got '${this.statusResponse.data.uploadStatus}'`
    )

    const form = this.statusResponse.data.form
    const firstFile = Object.values(form)[0]

    assert.equal(
      firstFile.fileStatus,
      'rejected',
      `Expected fileStatus 'rejected', got '${firstFile.fileStatus}'`
    )
    assert.equal(
      firstFile.hasError,
      true,
      `Expected hasError true on rejected file, got: ${firstFile.hasError}`
    )
    assert.ok(
      firstFile.errorMessage &&
        firstFile.errorMessage.toLowerCase().includes('must be'),
      `Expected a meaningful rejection message, got: "${firstFile.errorMessage}"`
    )
  }
)

Given(
  'I have metadata with an invalid {word} of {int}',
  function (fieldName, invalidValue) {
    const payload = buildInitiatePayload()
    payload.metadata[fieldName.toLowerCase()] = invalidValue
    this.invalidInitiatePayload = payload
  }
)

When(
  'I attempt to initiate an upload session with the invalid metadata',
  async function () {
    this.initiateResponse = await fetch(
      `${this.baseUrl}/api/v1/uploader/initiate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.invalidInitiatePayload)
      }
    )
  }
)

Then(
  'the initiate response status should be {int}',
  async function (expectedStatus) {
    assert.equal(
      this.initiateResponse.status,
      expectedStatus,
      `Expected ${expectedStatus}, got ${this.initiateResponse.status}`
    )
    this.initiateResponseBody = await this.initiateResponse.json()
  }
)

Then(
  'the response should indicate the {word} field failed validation',
  function (fieldName) {
    assert.equal(
      this.initiateResponseBody.error,
      'Bad Request',
      `Expected 'Bad Request', got '${this.initiateResponseBody.error}'`
    )
    assert.ok(
      this.initiateResponseBody.message
        .toLowerCase()
        .includes(fieldName.toLowerCase()),
      `Expected message to mention '${fieldName}', got: "${this.initiateResponseBody.message}"`
    )
    assert.ok(
      this.initiateResponseBody.validation.keys.includes(
        `metadata.${fieldName.toLowerCase()}`
      ),
      `Expected validation.keys to include 'metadata.${fieldName.toLowerCase()}', got: ${JSON.stringify(this.initiateResponseBody.validation.keys)}`
    )
  }
)

When(
  'I upload a {int} MB file to the CDP Uploader',
  { timeout: 120 * 1000 },
  async function (sizeInMB) {
    const filePath = createLargeFile(sizeInMB)
    const fileBuffer = fs.readFileSync(filePath)

    const formData = new FormData()
    formData.append(
      'file-upload-1',
      new Blob([fileBuffer], { type: 'application/pdf' }),
      `large-file-${sizeInMB}mb.pdf`
    )

    this.uploadResponse = await fetch(this.uploadUrl, {
      method: 'POST',
      body: formData,
      redirect: 'manual'
    })

    // Cleanup so we don't fill tmp with junk
    cleanupLargeFile(filePath)
  }
)

When('I upload two files under separate field names', async function () {
  const fileBuffer = fs.readFileSync('fixtures/files/test-document.pdf')
  const formData = new FormData()

  formData.append(
    'file-upload-1',
    new Blob([fileBuffer], { type: 'application/pdf' }),
    'test-document-1.pdf'
  )
  formData.append(
    'file-upload-2',
    new Blob([fileBuffer], { type: 'application/pdf' }),
    'test-document-2.pdf'
  )

  const response = await fetch(this.uploadUrl, {
    method: 'POST',
    body: formData,
    redirect: 'manual'
  })

  assert.equal(response.status, 302, `Expected 302, got ${response.status}`)
})

When('I upload two files under the same field name', async function () {
  const fileBuffer = fs.readFileSync('fixtures/files/test-document.pdf')
  const formData = new FormData()

  formData.append(
    'file-upload-1',
    new Blob([fileBuffer], { type: 'application/pdf' }),
    'test-document-1.pdf'
  )
  formData.append(
    'file-upload-1',
    new Blob([fileBuffer], { type: 'application/pdf' }),
    'test-document-2.pdf'
  )

  const response = await fetch(this.uploadUrl, {
    method: 'POST',
    body: formData,
    redirect: 'manual'
  })

  assert.equal(response.status, 302, `Expected 302, got ${response.status}`)
})

Then('both files should be present in the status response', function () {
  const form = this.statusResponse.data.form

  // Handle both shapes: separate field names OR array under one field name
  let fileCount = 0
  for (const value of Object.values(form)) {
    if (Array.isArray(value)) {
      fileCount += value.length
    } else if (typeof value === 'object' && value.fileId) {
      fileCount += 1
    }
  }

  assert.equal(fileCount, 2, `Expected 2 files in response, got ${fileCount}`)
})

When('I upload 5 small files under separate field names', async function () {
  const fileBuffer = fs.readFileSync('fixtures/files/test-document.pdf')
  const formData = new FormData()

  for (let i = 1; i <= 5; i++) {
    formData.append(
      `file-upload-${i}`,
      new Blob([fileBuffer], { type: 'application/pdf' }),
      `test-document-${i}.pdf`
    )
  }

  const response = await fetch(this.uploadUrl, {
    method: 'POST',
    body: formData,
    redirect: 'manual'
  })

  assert.equal(response.status, 302, `Expected 302, got ${response.status}`)
})

Then('all 5 files should be present in the status response', function () {
  const form = this.statusResponse.data.form

  let fileCount = 0
  for (const value of Object.values(form)) {
    if (Array.isArray(value)) {
      fileCount += value.length
    } else if (typeof value === 'object' && value.fileId) {
      fileCount += 1
    }
  }

  assert.equal(fileCount, 5, `Expected 5 files in response, got ${fileCount}`)
})

When('I attempt to retrieve a blob for a malformed fileId', async function () {
  this.blobResponse = await fetch(
    `${this.baseUrl}/api/v1/blob/00000000-0000-0000-0000-000000000000`,
    { headers: { Authorization: `Bearer ${this.token}` } }
  )
})

When('I attempt to retrieve a blob for an unknown fileId', async function () {
  this.blobResponse = await fetch(
    `${this.baseUrl}/api/v1/blob/${randomUUID()}`,
    {
      headers: { Authorization: `Bearer ${this.token}` }
    }
  )
})

Then('the blob response status should be {int}', function (expectedStatus) {
  assert.equal(
    this.blobResponse.status,
    expectedStatus,
    `Expected ${expectedStatus}, got ${this.blobResponse.status}`
  )
})

When(
  'I attempt to check the status for a malformed uploadId',
  async function () {
    this.statusResponse = await fetch(
      `${this.baseUrl}/api/v1/uploader/status/00000000-0000-0000-0000-000000000000`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    )
  }
)

When(
  'I attempt to check the status for an unknown uploadId',
  async function () {
    this.statusResponse = await fetch(
      `${this.baseUrl}/api/v1/uploader/status/${randomUUID()}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    )
  }
)

Then(
  'the status endpoint response status should be {int}',
  function (expectedStatus) {
    assert.equal(
      this.statusResponse.status,
      expectedStatus,
      `Expected ${expectedStatus}, got ${this.statusResponse.status}`
    )
  }
)

Given(
  'I initiate an upload session with a special-character reference',
  async function () {
    const payload = buildInitiatePayload()
    payload.metadata.reference =
      'Test reference with ünïcodé & special/chars! (2026)'
    this.specialReference = payload.metadata.reference

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
  }
)

Then('the reference should be preserved in the status response', function () {
  assert.equal(
    this.statusResponse.data.metadata.reference,
    this.specialReference,
    `Expected reference to be preserved, got: ${this.statusResponse.data.metadata.reference}`
  )
})

Then(
  'the uploaded file should be retrievable via the SBI metadata endpoint',
  async function () {
    const sbi = process.env.TEST_USER_SBI || process.env.EXT_TEST_TEST_USER_SBI

    const response = await fetch(`${this.baseUrl}/api/v1/metadata/sbi/${sbi}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    })

    assert.equal(response.status, 200, `Expected 200, got ${response.status}`)

    const body = await response.json()
    assert.ok(Array.isArray(body.data), 'Expected data to be an array')

    const matchingRecord = body.data.find(
      (record) => record.file.fileId === this.fileId
    )
    assert.ok(
      matchingRecord,
      `Expected to find persisted record for fileId ${this.fileId}`
    )

    assert.equal(
      matchingRecord.file.fileStatus,
      'complete',
      'Expected fileStatus to be complete'
    )
    assert.equal(
      matchingRecord.metadata.type,
      'CS_Agreement_Evidence',
      'Expected type to match'
    )
    assert.ok(
      matchingRecord.metadata.submissionId,
      'Expected submissionId to be present'
    )
  }
)

Then(
  'the upload response should redirect to the requested redirect path',
  function () {
    const { redirect } = buildInitiatePayload()
    const location = this.uploadResponse.headers.get('location')

    assert.ok(
      location && location.endsWith(redirect),
      `Expected Location header to end with '${redirect}', got '${location}'`
    )
  }
)

Then(
  'the downloaded file should match the uploaded file byte for byte',
  async function () {
    const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')
    const expected = fs.readFileSync('fixtures/files/test-document.pdf')

    const response = await fetch(this.presignedUrl)
    assert.equal(response.status, 200)
    const downloaded = Buffer.from(await response.arrayBuffer())

    assert.equal(
      downloaded.length,
      expected.length,
      `Expected ${expected.length} bytes, got ${downloaded.length}`
    )
    assert.equal(sha256(downloaded), sha256(expected))
  }
)

When('I check the upload status before uploading a file', async function () {
  const response = await fetch(`${this.baseUrl}${this.statusUrl}`, {
    headers: { Authorization: `Bearer ${this.token}` }
  })

  assert.equal(response.status, 200, `Expected 200, got ${response.status}`)
  this.statusResponse = await response.json()
})

Then(
  'the upload should be pending at stage {string} with no errors',
  function (expectedStage) {
    const { uploadStatus, stage, errors } = this.statusResponse.data

    assert.equal(uploadStatus, 'pending')
    assert.equal(stage, expectedStage)
    assert.equal(errors, null)
  }
)

Then(
  'the status response metadata should not contain a journeyId',
  function () {
    const { metadata } = this.statusResponse.data

    assert.ok(metadata, 'Expected metadata in the status response')
    assert.ok(
      !('journeyId' in metadata),
      `Expected no journeyId in status metadata, got: ${JSON.stringify(metadata)}`
    )
  }
)

When(
  'I upload an executable disguised as a PDF to the CDP Uploader',
  async function () {
    // Minimal DOS header with a PE signature, so content sniffing sees an executable
    const fileBuffer = Buffer.alloc(1024)
    fileBuffer.write('MZ', 0, 'ascii')
    fileBuffer.writeUInt32LE(0x80, 0x3c)
    fileBuffer.write('PE\0\0', 0x80, 'binary')

    const formData = new FormData()
    formData.append(
      'file-upload-1',
      new Blob([fileBuffer], { type: 'application/pdf' }),
      'disguised-executable.pdf'
    )

    this.uploadResponse = await fetch(this.uploadUrl, {
      method: 'POST',
      body: formData,
      redirect: 'manual'
    })
  }
)

When(
  'I upload the EICAR anti-virus test file to the CDP Uploader',
  async function () {
    // Assembled at runtime so the repository never contains the complete signature
    const eicar = [
      'X5O!P%@AP[4\\PZX54(P^)7CC)7}$',
      'EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
    ].join('')

    const formData = new FormData()
    formData.append(
      'file-upload-1',
      new Blob([eicar], { type: 'text/plain' }),
      'eicar-test-file.txt'
    )

    this.uploadResponse = await fetch(this.uploadUrl, {
      method: 'POST',
      body: formData,
      redirect: 'manual'
    })
  }
)

Then('the upload should be rejected by the scanner', function () {
  const { uploadStatus, stage, errors, form } = this.statusResponse.data

  assert.equal(uploadStatus, 'failure')
  assert.equal(stage, 'rejected-by-scanner')
  assert.ok(
    Array.isArray(errors) && errors.length > 0,
    `Expected scanner errors, got: ${JSON.stringify(errors)}`
  )

  const firstFile = Object.values(form)[0]
  assert.equal(firstFile.fileStatus, 'rejected')
  assert.equal(firstFile.hasError, true)
})
