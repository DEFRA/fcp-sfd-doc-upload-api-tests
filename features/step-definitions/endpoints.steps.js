import { When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import { randomUUID } from 'crypto'

const resolvePath = (path) => path.replace('{randomUuid}', randomUUID())

When('I send a GET request to {string}', async function (path) {
  this.response = await fetch(`${this.baseUrl}${resolvePath(path)}`, {
    headers: { Authorization: `Bearer ${this.token}` }
  })
  this.responseBody = await this.response.json().catch(() => null)
})

When(
  'I send a GET request to {string} without an auth token',
  async function (path) {
    this.response = await fetch(`${this.baseUrl}${resolvePath(path)}`)
    this.responseBody = await this.response.json().catch(() => null)
  }
)

Then('the response status should be {int}', function (expectedStatus) {
  assert.equal(
    this.response.status,
    expectedStatus,
    `Expected ${expectedStatus}, got ${this.response.status}. Body: ${JSON.stringify(this.responseBody)}`
  )
})

Then('the response data should be an empty array', function () {
  assert.deepEqual(
    this.responseBody.data,
    [],
    `Expected an empty data array, got: ${JSON.stringify(this.responseBody.data)}`
  )
})
