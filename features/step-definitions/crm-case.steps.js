import { Given, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import { randomUUID } from 'node:crypto'
import { buildInitiatePayload } from '../../fixtures/initiate-payload.js'
import {
  isCrmConfigured,
  waitForCases,
  waitForMetadata,
  findMetadataByOnlineSubmission
} from '../../fixtures/crm.js'

/**
 * Builds a failure message that identifies the records involved, so a failure
 * can be followed up directly in Dataverse rather than reproduced first.
 */
const describeCrmState = async (
  world,
  { onlineSubmissionId, files, problems }
) => {
  const lines = [
    'CRM metadata attachment check failed.',
    '',
    `  upload reference:    ${world.crmReference}`,
    `  uploadId:            ${world.uploadId}`,
    `  incidentid:          ${world.crmCase.incidentid}`,
    `  case title:          ${world.crmCase.title}`,
    `  online submission:   ${onlineSubmissionId}`,
    '',
    `  uploaded files (${files.length}):`,
    ...files.map((file) => `    - ${file.filename} ${file.fileId}`),
    '',
    '  problems:',
    ...problems.map((problem) => `    - ${problem}`),
    ''
  ]

  try {
    const attached = await findMetadataByOnlineSubmission(onlineSubmissionId)

    lines.push(
      `  metadata actually attached to that submission (${attached.length}):`
    )
    lines.push(
      ...attached.map(
        (record) =>
          `    - ${record.rpa_name} blobFileId=${record.rpa_blobfileid} id=${record.rpa_activitymetadataid} createdon=${record.createdon}`
      )
    )
  } catch (error) {
    lines.push(`  could not list attached metadata: ${error.message}`)
  }

  return lines.join('\n')
}

Given('read-only CRM access is configured', function () {
  if (!isCrmConfigured()) {
    return 'skipped'
  }
})

Given(
  'I initiate an upload session with a unique CRM test reference',
  async function () {
    const payload = buildInitiatePayload()

    // fcp-sfd-object-processor builds the CRM case title as
    // "{reference} - CRN {crn} - {date}", so a unique reference is what lets
    // this run find its own case, and only its own case.
    this.crmReference = `QA-FLS1-156-${randomUUID()}`
    payload.metadata.reference = this.crmReference

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

Then(
  'exactly one CRM case should exist for the test reference',
  { timeout: 300 * 1000 },
  async function () {
    const cases = await waitForCases(this.crmReference)

    assert.ok(
      cases.length > 0,
      `No CRM case appeared for reference ${this.crmReference}`
    )

    assert.equal(
      cases.length,
      1,
      [
        `Expected exactly 1 CRM case for reference ${this.crmReference}, got ${cases.length}.`,
        'Cases found:',
        ...cases.map(
          (found) =>
            `  - incidentid=${found.incidentid} createdon=${found.createdon} title="${found.title}"`
        )
      ].join('\n')
    )

    this.crmCase = cases[0]
  }
)

Then('the CRM case should have exactly one online submission', function () {
  const submissions = this.crmCase.incident_rpa_onlinesubmissions ?? []

  assert.equal(
    submissions.length,
    1,
    `Expected exactly 1 online submission on case ${this.crmCase.incidentid}, got ${submissions.length}`
  )

  this.crmOnlineSubmissionId = submissions[0].activityid
})

Then(
  'every uploaded file should have metadata attached to that case',
  { timeout: 300 * 1000 },
  async function () {
    const submissions = this.crmCase.incident_rpa_onlinesubmissions ?? []

    assert.equal(
      submissions.length,
      1,
      `Expected exactly 1 online submission on case ${this.crmCase.incidentid}, got ${submissions.length}`
    )

    const onlineSubmissionId = submissions[0].activityid
    const files = Object.values(this.statusResponse.data.form)

    assert.ok(files.length > 1, 'Expected more than one uploaded file')

    const problems = []

    for (const file of files) {
      const records = await waitForMetadata(file.fileId)

      if (records.length !== 1) {
        problems.push(
          `file ${file.filename} (fileId ${file.fileId}): expected 1 metadata record, found ${records.length}`
        )
        continue
      }

      const attachedTo = records[0]._rpa_relatedonlinesubmissionid_value

      if (attachedTo !== onlineSubmissionId) {
        problems.push(
          `file ${file.filename} (fileId ${file.fileId}): attached to online submission ${attachedTo}, expected ${onlineSubmissionId}`
        )
      }
    }

    if (problems.length > 0) {
      throw new assert.AssertionError({
        message: await describeCrmState(this, {
          onlineSubmissionId,
          files,
          problems
        }),
        actual: `${files.length - problems.length} of ${files.length} files correctly attached`,
        expected: `${files.length} of ${files.length} files correctly attached`,
        operator: 'crm-metadata-attachment'
      })
    }
  }
)
