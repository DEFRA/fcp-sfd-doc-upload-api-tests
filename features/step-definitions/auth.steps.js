import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import { buildInitiatePayload } from '../../fixtures/initiate-payload.js'

Given('I have no auth token', function () {
  this.authTestToken = null
})

Given('I have an invalid auth token', function () {
  this.authTestToken = 'this-is-not-a-real-token'
})

When('I attempt to initiate an upload session', async function () {
  const headers = { 'Content-Type': 'application/json' }
  if (this.authTestToken) {
    headers.Authorization = `Bearer ${this.authTestToken}`
  }

  this.authResponse = await fetch(`${this.baseUrl}/api/v1/uploader/initiate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(buildInitiatePayload())
  })
})

When('I attempt to check the status of a fake upload', async function () {
  const headers = {}
  if (this.authTestToken) {
    headers.Authorization = `Bearer ${this.authTestToken}`
  }

  this.authResponse = await fetch(
    `${this.baseUrl}/api/v1/uploader/status/00000000-0000-0000-0000-000000000000`,
    { headers }
  )
})

When('I attempt to retrieve a blob for a fake file id', async function () {
  const headers = {}
  if (this.authTestToken) {
    headers.Authorization = `Bearer ${this.authTestToken}`
  }

  this.authResponse = await fetch(
    `${this.baseUrl}/api/v1/blob/00000000-0000-0000-0000-000000000000`,
    { headers }
  )
})

Then('the auth response status should be {int}', function (expectedStatus) {
  assert.equal(
    this.authResponse.status,
    expectedStatus,
    `Expected ${expectedStatus}, got ${this.authResponse.status}`
  )
})
