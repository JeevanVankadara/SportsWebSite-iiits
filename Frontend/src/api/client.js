import { API_URL } from '../config.js'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Limit credential persistence to the current tab. Backend authorization remains authoritative.
export function createSession(storageKey) {
  let token = readStoredToken()
  let handleUnauthorized = () => {}

  function readStoredToken() {
    try {
      const saved = sessionStorage.getItem(storageKey)
      localStorage.removeItem(storageKey)
      return saved
    } catch {
      return null
    }
  }

  return {
    getToken: () => token,

    setToken(value) {
      token = value
      try {
        if (value) sessionStorage.setItem(storageKey, value)
        else sessionStorage.removeItem(storageKey)
        localStorage.removeItem(storageKey)
      } catch {
        // Storage is blocked (e.g. strict privacy settings): the session lasts until the tab closes.
      }
    },

    // Called when the server rejects the saved token, so the person can be sent back to sign in.
    setUnauthorizedHandler(handler) {
      handleUnauthorized = handler
    },

    async request(path, { method = 'GET', body } = {}) {
      assertApiPath(path)
      const sentToken = token
      const headers = {}
      if (body !== undefined) headers['Content-Type'] = 'application/json'
      if (sentToken) headers.Authorization = `Bearer ${sentToken}`

      let response
      try {
        response = await fetch(`${API_URL}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          credentials: 'omit',
          redirect: 'error',
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
        })
      } catch {
        throw new ApiError(0, method === 'GET'
          ? 'Could not reach the server. Check your connection and try again.'
          : 'Connection interrupted. Refresh to check whether your change was saved before trying again.')
      }

      if (response.status === 401 && sentToken && token === sentToken) {
          token = null
          try { sessionStorage.removeItem(storageKey); localStorage.removeItem(storageKey) } catch { /* Memory is already cleared. */ }
          handleUnauthorized()
      }
      const data = await readResponse(response)
      if (!response.ok) {
        throw new ApiError(response.status, data?.message ?? `Request failed (${response.status}). Please try again.`)
      }
      return data
    },
  }
}

export const adminSession = createSession('iiits-sports-admin-token')
export const coordinatorSession = createSession('iiits-sports-coordinator-token')

function assertApiPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/api/') || /[\\\r\n]/.test(path))
    throw new ApiError(0, 'Invalid API request.')
}

async function readResponse(response) {
  if (response.status === 204) return null
  try { return await response.json() }
  catch {
    throw new ApiError(response.ok ? 502 : response.status, 'The server returned an unreadable response. Refresh to check the latest state before trying again.')
  }
}

// Public viewer reads never inherit an admin/co-ordinator token.
export async function publicRequest(path) {
  assertApiPath(path)
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      signal: AbortSignal.timeout(15000),
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
    })
  } catch {
    throw new ApiError(
      0,
      'The scoreboard is temporarily unavailable. Please try again.',
    )
  }
  const data = await readResponse(response)
  if (!response.ok)
    throw new ApiError(
      response.status,
      data?.message ?? 'Could not load this scoreboard.',
    )
  return data
}
