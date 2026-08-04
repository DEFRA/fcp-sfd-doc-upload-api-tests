import 'dotenv/config'
import { randomUUID } from 'crypto'

let counter = 0

export const buildCallbackPayload = () => {
  counter += 1
  const submissionId = randomUUID()
  const fileId = randomUUID()
  const sbi = Number(process.env.TEST_USER_SBI)
  const crn = Number(process.env.TEST_USER_CRN)
  const frn = Number(process.env.TEST_USER_FRN)
  const reference = `TEST-REF-${String(counter).padStart(3, '0')}`

  return {
    uploadStatus: 'ready',
    metadata: {
      type: 'CS_Agreement_Evidence',
      sbi,
      crn,
      frn,
      submissionId,
      uosr: `${sbi}_${submissionId}`,
      reference,
      service: 'fcp-sfd-frontend'
    },
    form: {
      'file-upload-1': {
        fileId,
        filename: 'evidence.pdf',
        contentType: 'application/pdf',
        detectedContentType: 'application/pdf',
        fileStatus: 'complete',
        contentLength: 11264,
        checksumSha256: 'bng5jOVC6TxEgwTUlX4DikFtDEYEc8vQTsOP0ZAv21c=',
        s3Key: `scanned/folder/${fileId}`,
        s3Bucket: process.env.TEST_S3_BUCKET
      }
    }
  }
}
