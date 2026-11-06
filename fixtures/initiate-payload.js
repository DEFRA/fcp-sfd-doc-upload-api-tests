import { RUN_ID } from './run-id.js'

export const REDIRECT_PATH = '/document-upload/complete'

let counter = 0

export const buildInitiatePayload = () => {
  counter += 1
  const sbi = Number(process.env.TEST_USER_SBI)
  const crn = Number(process.env.TEST_USER_CRN)
  const frn = Number(process.env.TEST_USER_FRN)
  const submissionId = `test-${RUN_ID}-${String(counter).padStart(3, '0')}`

  return {
    redirect: REDIRECT_PATH,
    metadata: {
      sbi,
      crn,
      frn,
      submissionId,
      uosr: `${sbi}_${submissionId}`,
      type: 'CS_Agreement_Evidence',
      reference: `Automated test run ${submissionId}`,
      service: 'fcp-sfd-frontend'
    }
  }
}
