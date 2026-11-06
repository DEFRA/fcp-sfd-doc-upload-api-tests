const DEFAULT_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 30 * 1000

// fetch with a timeout, so a hung service fails the scenario with a clear error
// rather than waiting for the Cucumber step timeout.
export const request = (
  url,
  { timeoutMs = DEFAULT_TIMEOUT_MS, ...options } = {}
) => fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) })

// CDP's tracing plugin logs this header's value as trace.id on every log line for the call,
// so a failed scenario can be found in the service logs. The service rejects values over 50 characters.
export const TRACE_HEADER = process.env.TRACING_HEADER || 'x-cdp-request-id'

export const traceHeaders = (traceId) =>
  traceId ? { [TRACE_HEADER]: traceId } : {}

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
      ...traceHeaders(world.traceId),
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
      ...traceHeaders(world.traceId),
      ...(json === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers
    },
    ...(json === undefined ? {} : { body: JSON.stringify(json) })
  })
