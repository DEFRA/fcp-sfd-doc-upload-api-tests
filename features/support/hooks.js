import 'dotenv/config'
import { Before, setDefaultTimeout } from '@cucumber/cucumber'
import { getAuthToken } from '../../fixtures/auth.js'

setDefaultTimeout(60 * 1000) // 60 seconds

Before(async function () {
  this.token = await getAuthToken()
})
