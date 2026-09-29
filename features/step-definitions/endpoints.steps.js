import { When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'

When('I send a GET request to {string}', async function (path) {
  this.response = await fetch(`${this.baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${this.token}` }
  })
  this.responseBody = await this.response.json().catch(() => null)
})

When(
  'I send a GET request to {string} without an auth token',
  async function (path) {
    this.response = await fetch(`${this.baseUrl}${path}`)
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
