import 'dotenv/config'
import { ProxyAgent, fetch as undiciFetch } from 'undici'

// Dataverse is an external host, so calls to it leave through the CDP Squid
// proxy, which listens on http://localhost:3128 in every deployed container.
// The agent is applied per request rather than globally, so the internal
// hosts the rest of this suite talks to are left alone.
//
// The proxy could instead be picked up automatically by setting
// NODE_USE_ENV_PROXY=1, but that must be set before the Node process starts,
// and this suite loads its configuration from .env after that point. Reading
// the value explicitly keeps the two consistent. HTTPS_PROXY is the name CDP
// now sets; CDP_HTTPS_PROXY is its supported legacy name.
const proxyUrl =
  process.env.HTTPS_PROXY ??
  process.env.CDP_HTTPS_PROXY ??
  process.env.HTTP_PROXY
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined

const crmFetch = (url, options = {}) =>
  undiciFetch(url, dispatcher ? { ...options, dispatcher } : options)

/**
 * The CRM scenarios need read access to Dataverse, which not every runner is
 * configured for. Steps use this to skip rather than fail when the
 * credentials are absent.
 */
export const isCrmConfigured = () =>
  Boolean(
    process.env.CRM_API_BASE_URL &&
      process.env.CRM_AUTH_ENDPOINT &&
      process.env.CRM_AUTH_CLIENT_ID &&
      process.env.CRM_AUTH_CLIENT_SECRET &&
      process.env.CRM_AUTH_SCOPE
  )

let cachedToken = null
let cachedTokenExpiry = 0

const TOKEN_EXPIRY_MARGIN_MS = 60 * 1000

export const getCrmToken = async () => {
  if (cachedToken && Date.now() < cachedTokenExpiry) {
    return cachedToken
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.CRM_AUTH_CLIENT_ID,
    client_secret: process.env.CRM_AUTH_CLIENT_SECRET,
    scope: process.env.CRM_AUTH_SCOPE
  })

  const response = await crmFetch(process.env.CRM_AUTH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to get CRM token: ${response.status} - ${text}`)
  }

  const data = await response.json()
  cachedToken = data.access_token
  cachedTokenExpiry =
    Date.now() + data.expires_in * 1000 - TOKEN_EXPIRY_MARGIN_MS

  return cachedToken
}

const query = async (path) => {
  const token = await getCrmToken()

  const response = await crmFetch(`${process.env.CRM_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Dataverse query failed: ${response.status} - ${text}`)
  }

  const body = await response.json()
  return body.value ?? []
}

/**
 * Finds cases whose title begins with the given prefix. The CRM case title is
 * built by fcp-sfd-object-processor as "{reference} - CRN {crn} - {date}", so
 * a unique reference set at initiate gives each test run its own handle on
 * the case it produced.
 */
export const findCasesByTitlePrefix = async (prefix) => {
  const filter = encodeURIComponent(`startswith(title,'${prefix}')`)
  const select = encodeURIComponent('incidentid,title,createdon')
  const expand = encodeURIComponent(
    'incident_rpa_onlinesubmissions($select=activityid,rpa_onlinesubmissionid)'
  )

  return query(
    `/incidents?$filter=${filter}&$select=${select}&$expand=${expand}`
  )
}

const METADATA_SELECT =
  'rpa_activitymetadataid,rpa_name,rpa_blobfileid,createdon,_rpa_relatedonlinesubmissionid_value'

export const findMetadataByFileId = async (fileId) => {
  const filter = encodeURIComponent(`rpa_blobfileid eq '${fileId}'`)
  const select = encodeURIComponent(METADATA_SELECT)

  return query(`/rpa_activitymetadatas?$filter=${filter}&$select=${select}`)
}

/**
 * Everything currently attached to an online submission, whichever file it
 * came from. Used to describe the real state when an expected metadata
 * record is missing, rather than only reporting the absence.
 */
export const findMetadataByOnlineSubmission = async (onlineSubmissionId) => {
  const filter = encodeURIComponent(
    `_rpa_relatedonlinesubmissionid_value eq ${onlineSubmissionId}`
  )
  const select = encodeURIComponent(METADATA_SELECT)

  return query(`/rpa_activitymetadatas?$filter=${filter}&$select=${select}`)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Metadata for the files after the first is written once the case exists, so
 * it can lag the case by some seconds. Polls until the record appears, then
 * gives up and lets the caller report what was actually found.
 */
export const waitForMetadata = async (
  fileId,
  { timeoutMs = 90000, intervalMs = 5000 } = {}
) => {
  const deadline = Date.now() + timeoutMs

  let records = await findMetadataByFileId(fileId)

  while (records.length === 0 && Date.now() < deadline) {
    await sleep(intervalMs)
    records = await findMetadataByFileId(fileId)
  }

  return records
}

/**
 * Case creation happens asynchronously, off a queue, so a case is not visible
 * the moment the upload status turns to success.
 *
 * Returning on the first sighting would make a duplicate assertion racy: the
 * defect under test creates the second case on a later redelivery, which can
 * land seconds after the first. So once a case appears the query is left to
 * settle, and the final count is the one returned.
 */
export const waitForCases = async (
  prefix,
  { timeoutMs = 120000, intervalMs = 5000, settleMs = 30000 } = {}
) => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const cases = await findCasesByTitlePrefix(prefix)

    if (cases.length > 0) {
      await sleep(settleMs)
      return findCasesByTitlePrefix(prefix)
    }

    await sleep(intervalMs)
  }

  return []
}
