import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import { createHash, randomUUID } from 'node:crypto'
import {
  REDIRECT_PATH,
  buildInitiatePayload
} from '../../fixtures/initiate-payload.js'
import { getMetadataRecords } from '../../fixtures/metadata-by-sbi.js'
import { apiRequest, request } from '../../fixtures/api-client.js'
import {
  buildLargeFile,
  expectRedirect,
  initiateUpload,
  listFiles,
  pollUntilComplete,
  postFiles,
  readFixture
} from '../../fixtures/uploader.js'

const MALFORMED_ID = '00000000-0000-0000-0000-000000000000'

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')

const uploadedFiles = (world) => listFiles(world.statusBody.data.form)

const assertFilesPresent = (world, expectedFilenames) => {
  const files = uploadedFiles(world)

  assert.equal(
    files.length,
    expectedFilenames.length,
    `Expected ${expectedFilenames.length} files in response, got ${files.length}`
  )
  assert.deepEqual(
    files.map((file) => file.filename).sort(),
    [...expectedFilenames].sort()
  )
  assert.equal(
    new Set(files.map((file) => file.fileId)).size,
    files.length,
    'Expected every file to have its own fileId'
  )
}

const assertFileMetadata = (world, expectedFilename) => {
  const [firstFile] = uploadedFiles(world)

  assert.ok(firstFile.fileId, 'Expected a fileId')
  assert.ok(firstFile.checksumSha256, 'Expected a checksum')
  assert.equal(firstFile.filename, expectedFilename)

  world.fileId = firstFile.fileId
}

Given('I initiate an upload session with valid metadata', async function () {
  await initiateUpload(this)
})

When('I upload a real PDF file to the CDP Uploader', async function () {
  this.uploadResponse = await postFiles(this, [
    {
      filename: 'test-document.pdf',
      content: readFixture('test-document.pdf'),
      type: 'application/pdf'
    }
  ])

  expectRedirect(this.uploadResponse)
})

When(
  'I poll the status endpoint until the upload completes',
  async function () {
    this.statusBody = await pollUntilComplete(this)
  }
)

Then('the upload status should be {string}', function (expectedStatus) {
  assert.equal(this.statusBody.data.uploadStatus, expectedStatus)
})

Then('the response should contain the correct file metadata', function () {
  assertFileMetadata(this, 'test-document.pdf')
})

Then(
  'I should be able to retrieve a presigned download URL',
  async function () {
    const response = await apiRequest(this, `/api/v1/blob/${this.fileId}`)

    assert.equal(response.status, 200)

    const body = await response.json()
    assert.ok(body.data.url.startsWith('https://'), 'Expected a presigned URL')
    this.presignedUrl = body.data.url
  }
)

Then(
  'the file should be downloadable from the presigned URL',
  async function () {
    const response = await request(this.presignedUrl)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/pdf')
  }
)

When(
  'I upload a {string} of type {string} to the CDP Uploader',
  async function (filename, contentType) {
    const response = await postFiles(this, [
      { filename, content: readFixture(filename), type: contentType }
    ])

    expectRedirect(response)
  }
)

Then(
  'the response should contain the correct file metadata for {string}',
  function (expectedFilename) {
    assertFileMetadata(this, expectedFilename)
  }
)

When(
  'I upload a {string} of type {string} to the CDP Uploader as an unsupported file',
  async function (filename, contentType) {
    this.uploadResponse = await postFiles(this, [
      { filename, content: readFixture(filename), type: contentType }
    ])
  }
)

Then(
  'the status response should indicate the unsupported upload was not accepted',
  function () {
    const { uploadStatus, form } = this.statusBody.data

    assert.equal(
      uploadStatus,
      'failure',
      `Expected uploadStatus 'failure', got '${uploadStatus}'`
    )

    const [firstFile] = listFiles(form)

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
    this.initiateResponse = await apiRequest(
      this,
      '/api/v1/uploader/initiate',
      {
        method: 'POST',
        json: this.invalidInitiatePayload
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
    this.uploadResponse = await postFiles(
      this,
      [
        {
          filename: `large-file-${sizeInMB}mb.pdf`,
          content: buildLargeFile(sizeInMB),
          type: 'application/pdf'
        }
      ],
      { timeoutMs: 110 * 1000 }
    )
  }
)

When('I upload two files under separate field names', async function () {
  const content = readFixture('test-document.pdf')
  this.uploadedFilenames = ['test-document-1.pdf', 'test-document-2.pdf']

  expectRedirect(
    await postFiles(
      this,
      this.uploadedFilenames.map((filename) => ({
        filename,
        content,
        type: 'application/pdf'
      }))
    )
  )
})

When('I upload two files under the same field name', async function () {
  const content = readFixture('test-document.pdf')
  this.uploadedFilenames = ['test-document-1.pdf', 'test-document-2.pdf']

  expectRedirect(
    await postFiles(
      this,
      this.uploadedFilenames.map((filename) => ({
        field: 'file-upload-1',
        filename,
        content,
        type: 'application/pdf'
      }))
    )
  )
})

Then('both files should be present in the status response', function () {
  assertFilesPresent(this, this.uploadedFilenames)
})

When('I upload 5 small files under separate field names', async function () {
  const content = readFixture('test-document.pdf')
  this.uploadedFilenames = [1, 2, 3, 4, 5].map((n) => `test-document-${n}.pdf`)

  expectRedirect(
    await postFiles(
      this,
      this.uploadedFilenames.map((filename) => ({
        filename,
        content,
        type: 'application/pdf'
      }))
    )
  )
})

Then('all 5 files should be present in the status response', function () {
  assertFilesPresent(this, this.uploadedFilenames)
})

When('I attempt to retrieve a blob for a malformed fileId', async function () {
  this.blobResponse = await apiRequest(this, `/api/v1/blob/${MALFORMED_ID}`)
})

When('I attempt to retrieve a blob for an unknown fileId', async function () {
  this.blobResponse = await apiRequest(this, `/api/v1/blob/${randomUUID()}`)
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
    this.statusResponse = await apiRequest(
      this,
      `/api/v1/uploader/status/${MALFORMED_ID}`
    )
  }
)

When(
  'I attempt to check the status for an unknown uploadId',
  async function () {
    this.statusResponse = await apiRequest(
      this,
      `/api/v1/uploader/status/${randomUUID()}`
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
    this.specialReference =
      'Test reference with Ã¼nÃ¯codÃ© & special/chars! (2026)'

    await initiateUpload(this, (payload) => {
      payload.metadata.reference = this.specialReference
    })
  }
)

Then('the reference should be preserved in the status response', function () {
  assert.equal(
    this.statusBody.data.metadata.reference,
    this.specialReference,
    `Expected reference to be preserved, got: ${this.statusBody.data.metadata.reference}`
  )
})

Then(
  'the uploaded file should be retrievable via the SBI metadata endpoint',
  async function () {
    const isUploadedFile = (record) => record.file.fileId === this.fileId
    const records = await getMetadataRecords({
      baseUrl: this.baseUrl,
      token: this.token,
      sbi: process.env.TEST_USER_SBI,
      until: isUploadedFile
    })

    const matchingRecord = records.find(isUploadedFile)
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
    const location = this.uploadResponse.headers.get('location')

    assert.ok(
      location && location.endsWith(REDIRECT_PATH),
      `Expected Location header to end with '${REDIRECT_PATH}', got '${location}'`
    )
  }
)

Then(
  'the downloaded file should match the uploaded file byte for byte',
  async function () {
    const expected = readFixture('test-document.pdf')

    const response = await request(this.presignedUrl)
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
  const response = await apiRequest(this, this.statusUrl)

  assert.equal(response.status, 200, `Expected 200, got ${response.status}`)
  this.statusBody = await response.json()
})

Then(
  'the upload should be pending at stage {string} with no errors',
  function (expectedStage) {
    const { uploadStatus, stage, errors } = this.statusBody.data

    assert.equal(uploadStatus, 'pending')
    assert.equal(stage, expectedStage)
    assert.equal(errors, null)
  }
)

Then(
  'the status response metadata should not contain a journeyId',
  function () {
    const { metadata } = this.statusBody.data

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
    const content = Buffer.alloc(1024)
    content.write('MZ', 0, 'ascii')
    content.writeUInt32LE(0x80, 0x3c)
    content.write('PE\0\0', 0x80, 'binary')

    this.uploadResponse = await postFiles(this, [
      {
        filename: 'disguised-executable.pdf',
        content,
        type: 'application/pdf'
      }
    ])
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

    this.uploadResponse = await postFiles(this, [
      { filename: 'eicar-test-file.txt', content: eicar, type: 'text/plain' }
    ])
  }
)

Then('the upload should be rejected by the scanner', function () {
  const { uploadStatus, stage, errors, form } = this.statusBody.data

  assert.equal(uploadStatus, 'failure')
  assert.equal(stage, 'rejected-by-scanner')
  assert.ok(
    Array.isArray(errors) && errors.length > 0,
    `Expected scanner errors, got: ${JSON.stringify(errors)}`
  )

  const [firstFile] = listFiles(form)
  assert.equal(firstFile.fileStatus, 'rejected')
  assert.equal(firstFile.hasError, true)
})
