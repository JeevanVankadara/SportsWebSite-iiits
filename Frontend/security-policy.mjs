// Shared by production HTML, Vite preview, and hosts supporting a _headers file.
export function securityHeaders(apiUrl = '') {
  let apiOrigin = ''
  if (apiUrl.trim()) {
    const url = new URL(apiUrl)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
      throw new Error('VITE_API_URL must be an HTTP(S) URL without credentials, query or fragment.')
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
      throw new Error('Production API connections must use HTTPS.')
    apiOrigin = ` ${url.origin}`
  }
  return {
    'Content-Security-Policy': `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'${apiOrigin}; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  }
}
