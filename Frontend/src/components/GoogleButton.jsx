import { useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID } from '../config.js'

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'
export const COLLEGE_DOMAIN = 'iiits.in'

let scriptPromise = null

// Google's sign-in script, loaded once and only on the pages that show the button.
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = resolve
    script.onerror = () => {
      scriptPromise = null
      script.remove()
      reject(new Error('Could not load Google sign-in. Check your connection and refresh the page.'))
    }
    document.head.append(script)
  })
  return scriptPromise
}

// Google's own "Sign in with Google" button. onCredential(credential) gets the ID token Google signs;
// the backend checks it and lets in only @iiits.in accounts.
// text: 'signin_with' | 'signup_with' | 'continue_with'. theme: 'outline' | 'filled_black' | 'filled_blue'.
export default function GoogleButton({ onCredential, text = 'signin_with', theme = 'outline', className }) {
  const container = useRef(null)
  const handler = useRef(onCredential)
  const [error, setError] = useState('')

  useEffect(() => {
    handler.current = onCredential
  })

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    let cancelled = false
    loadGoogleScript().then(
      () => {
        const element = container.current
        if (cancelled || !element) return
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => handler.current(response.credential),
          // Only offers the college accounts in Google's account chooser; the backend still checks.
          hd: COLLEGE_DOMAIN,
          ux_mode: 'popup',
          auto_select: false,
        })
        window.google.accounts.id.renderButton(element, {
          type: 'standard',
          theme,
          size: 'large',
          text,
          shape: 'pill',
          logo_alignment: 'left',
          width: Math.min(Math.max(element.clientWidth, 220), 400),
        })
      },
      (err) => {
        if (!cancelled) setError(err.message)
      },
    )
    return () => {
      cancelled = true
    }
  }, [text, theme])

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className={className} role="alert">
        Google sign-in is not set up yet. Please contact the sports admin.
      </p>
    )
  }
  if (error) {
    return (
      <p className={className} role="alert">
        {error}
      </p>
    )
  }
  return <div ref={container} className={className} style={{ minHeight: 44, width: '100%', display: 'flex', justifyContent: 'center' }} />
}
