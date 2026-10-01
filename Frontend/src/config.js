// Backend address, with or without a trailing /api. Empty means "same address as the page",
// which in development goes through the Vite proxy (see vite.config.js).
export const API_URL = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '').replace(/\/api$/, '')

// The admin sign-in page lives at this unlisted path; the rest of the admin area sits below it.
export const ADMIN_PATH = `/${(import.meta.env.VITE_ADMIN_PATH || 'control-room').trim().replace(/^\/+|\/+$/g, '')}`

export function adminPath(subpath = '') {
  return subpath ? `${ADMIN_PATH}/${subpath}` : ADMIN_PATH
}

// Co-ordinators (referees) sign in here with their player account.
export const COORDINATOR_PATH = '/coordinator'

export function coordinatorPath(subpath = '') {
  return subpath ? `${COORDINATOR_PATH}/${subpath}` : COORDINATOR_PATH
}

// OAuth client ID from Google Cloud Console (the same one as GOOGLE_CLIENT_ID in Backend/.env).
// Players register and referees sign in with their @iiits.in Google account.
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim()
