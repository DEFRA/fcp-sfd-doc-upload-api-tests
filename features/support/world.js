import 'dotenv/config'
import { setWorldConstructor } from '@cucumber/cucumber'

class UploadWorld {
  constructor() {
    this.baseUrl = process.env.OBJECT_PROCESSOR_URL
    this.token = null
    this.uploadId = null
    this.uploadUrl = null
    this.statusUrl = null
    this.fileId = null
    this.statusResponse = null
    this.presignedUrl = null
    this.callbackPayload = null
    this.callbackResponse = null
    this.callbackResponseBody = null
    this.secondCallbackResponse = null
    this.secondCallbackResponseBody = null
    this.authTestToken = null
    this.authResponse = null
    this.uploadResponse = null
    this.invalidInitiatePayload = null
    this.initiateResponse = null
    this.blobResponse = null
    this.specialReference = null
  }
}

setWorldConstructor(UploadWorld)
