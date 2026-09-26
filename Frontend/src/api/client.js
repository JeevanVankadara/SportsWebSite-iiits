import { API_URL } from '../config.js'

const TOKEN_KEY = 'iiits-sports-admin-token'

// The token lives in memory and is mirrored to localStorage so a reload keeps the admin signed in.
let token = readStoredToken()
let handleUnauthorized = () => {}

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getToken() {
  return token
}

export function setToken(value) {
  token = value
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage is blocked (e.g. strict privacy settings): the session lasts until the tab closes.
  }
}

// Called when the server rejects the saved token, so the admin can be sent back to sign in.
export function setUnauthorizedHandler(handler) {
  handleUnauthorized = handler
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export async function request(path, { method = 'GET', body } = {}) {
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
}
