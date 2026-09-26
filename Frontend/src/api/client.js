import { API_URL } from '../config.js'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// One signed-in area of the site (admin or co-ordinator). The token lives in memory and is mirrored
// to localStorage so a reload keeps the person signed in. Each area has its own key, so an admin and
// a co-ordinator can be signed in on the same browser.
export function createSession(storageKey) {
  let token = readStoredToken()
  let handleUnauthorized = () => {}

  function readStoredToken() {
    try {
      return localStorage.getItem(storageKey)
    } catch {
      return null
    }
  }

  return {
    getToken: () => token,

    setToken(value) {
      token = value
      try {
        if (value) localStorage.setItem(storageKey, value)
        else localStorage.removeItem(storageKey)
      } catch {
        // Storage is blocked (e.g. strict privacy settings): the session lasts until the tab closes.
      }
    },

    // Called when the server rejects the saved token, so the person can be sent back to sign in.
    setUnauthorizedHandler(handler) {
      handleUnauthorized = handler
    },

    async request(path, { method = 'GET', body } = {}) {
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
        })
      } catch {
        throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
      }

      const data = response.status === 204 ? null : await response.json().catch(() => null)
      if (!response.ok) {
        if (response.status === 401 && sentToken) handleUnauthorized()
        throw new ApiError(response.status, data?.message ?? `Request failed (${response.status}). Please try again.`)
      }
      return data
    },
  }
}

export const adminSession = createSession('iiits-sports-admin-token')
export const coordinatorSession = createSession('iiits-sports-coordinator-token')
