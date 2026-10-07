import { strict as assert } from 'assert'

// GET /api/v1/metadata/sbi/{sbi} returns one page of records, newest first, with a
// page object holding hasMore and nextCursor. The test SBI is shared and keeps growing,
// so a run reads at most this many pages rather than the whole set.
const MAX_PAGES = 5

export const getMetadataRecords = async ({
  baseUrl,
  token,
  sbi,
  maxPages = MAX_PAGES
}) => {
  const records = []
  let after

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
    const query = after ? `?after=${after}` : ''
    const url = `${baseUrl}/api/v1/metadata/sbi/${sbi}${query}`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })

    assert.equal(response.status, 200, `Expected 200, got ${response.status}`)

    const body = await response.json()
    assert.ok(Array.isArray(body.data), 'Expected data to be an array')
    assert.ok(body.page, 'Expected the response to include a page object')
    assert.equal(
      body.page.count,
      body.data.length,
      `Expected page.count ${body.page.count} to equal the ${body.data.length} records returned`
    )

    records.push(...body.data)

    if (!body.page.hasMore) {
      break
    }

    after = body.page.nextCursor
  }

  return records
}
