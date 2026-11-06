const DEFAULT_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 30 * 1000

// fetch with a timeout, so a hung service fails the scenario with a clear error
// rather than waiting for the Cucumber step timeout.
export const request = (
  url,
  { timeoutMs = DEFAULT_TIMEOUT_MS, ...options } = {}
) => fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) })

export const bearer = (token) => ({ Authorization: `Bearer ${token}` })

// Calls the object processor as the scenario's authenticated client. Pass
// `headers` to add to or override the defaults, or `json` for a JSON body.
export const apiRequest = (
  world,
  path,
  { json, headers = {}, ...options } = {}
) =>
  request(`${world.baseUrl}${path}`, {
    ...options,
    headers: {
      ...bearer(world.token),
      ...(json === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers
    },
    ...(json === undefined ? {} : { body: JSON.stringify(json) })
  })

// Calls the object processor with exactly the given headers, for auth tests.
export const unauthenticatedRequest = (
  world,
  path,
  { json, headers = {}, ...options } = {}
) =>
  request(`${world.baseUrl}${path}`, {
    ...options,
    headers: {
      ...(json === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers
    },
    ...(json === undefined ? {} : { body: JSON.stringify(json) })
  })
