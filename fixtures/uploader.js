import fs from 'node:fs'
import { strict as assert } from 'node:assert'
import { apiRequest, request } from './api-client.js'
import { buildInitiatePayload } from './initiate-payload.js'

export const DEFAULT_FIELD = 'file-upload-1'

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 500
const POLL_TIMEOUT_MS = Number(process.env.POLL_TIMEOUT_MS) || 20 * 1000

const fixtureCache = new Map()

export const readFixture = (filename) => {
  if (!fixtureCache.has(filename)) {
    fixtureCache.set(filename, fs.readFileSync(`fixtures/files/${filename}`))
  }
  return fixtureCache.get(filename)
}

// The fixture PDF padded with spaces to the requested size, built in memory.
export const buildLargeFile = (sizeInMB) => {
  const pdf = readFixture('test-document.pdf')
  const buffer = Buffer.alloc(sizeInMB * 1024 * 1024, 0x20)
  pdf.copy(buffer, 0)
  return buffer
}

// Starts an upload session and stores its URLs on the world. The payload can be
// adjusted first, for example to set a unique reference.
export const initiateUpload = async (world, adjustPayload) => {
  const payload = buildInitiatePayload()
  adjustPayload?.(payload)

  const response = await apiRequest(world, '/api/v1/uploader/initiate', {
    method: 'POST',
    json: payload
  })
  const text = await response.text()
  assert.equal(
    response.status,
    200,
    `Initiate failed: ${response.status} ${text}`
  )

  const { data } = JSON.parse(text)
  world.uploadId = data.uploadId
  world.uploadUrl = data.uploadUrl
  world.statusUrl = data.statusUrl
  return payload
}

// files: [{ filename, content, type, field }]. Without a field, files are named
// file-upload-1, file-upload-2 and so on.
export const postFiles = (world, files, { timeoutMs } = {}) => {
  const formData = new FormData()
  files.forEach(({ field, filename, content, type }, index) => {
    formData.append(
      field ?? `file-upload-${index + 1}`,
      new Blob([content], { type }),
      filename
    )
  })

  return request(world.uploadUrl, {
    method: 'POST',
    body: formData,
    redirect: 'manual',
    timeoutMs
  })
}

export const expectRedirect = (response) =>
  assert.equal(response.status, 302, `Expected 302, got ${response.status}`)

export const listFiles = (form) => Object.values(form).flat()

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Polls the status endpoint until the upload leaves "pending". A 4xx fails
// immediately, since waiting will not fix it. A 5xx is retried, and the last
// status and body are reported if the upload never completes.
export const pollUntilComplete = async (world) => {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  let last = 'no response'

  while (Date.now() < deadline) {
    const response = await apiRequest(world, world.statusUrl)
    const text = await response.text()
    last = `${response.status} ${text}`

    if (response.status >= 400 && response.status < 500) {
      throw new Error(`Status endpoint returned ${last}`)
    }

    if (response.ok) {
      const body = JSON.parse(text)
      if (body.data && body.data.uploadStatus !== 'pending') {
        return body
      }
    }

    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error(
    `Upload did not complete within ${POLL_TIMEOUT_MS / 1000}s. Last status response: ${last}`
  )
}
