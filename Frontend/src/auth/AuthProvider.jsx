import { useEffect, useState } from 'react'
import { AuthContext } from './authContext.js'

const SIGNED_OUT = { status: 'signed-out', user: null }

// Keeps track of who is signed in to one area of the site (admin or co-ordinator).
// session: from api/client.js. auth: { login(...credentials) -> { token, user }, me() -> user }.
export default function AuthProvider({ session, auth, children }) {
  // A token saved by an earlier visit has to be checked with the server before it is trusted.
  const [state, setState] = useState(() => (session.getToken() ? { status: 'checking', user: null } : SIGNED_OUT))

  useEffect(() => {
    session.setUnauthorizedHandler(() => {
      session.setToken(null)
      setState(SIGNED_OUT)
    })
    return () => session.setUnauthorizedHandler(() => {})
  }, [session])

  useEffect(() => {
    if (!session.getToken()) return
    let ignore = false
    auth.me().then(
      (user) => {
        if (!ignore) setState({ status: 'signed-in', user })
      },
      () => {
        if (!ignore) setState(SIGNED_OUT)
      },
    )
    return () => {
      ignore = true
    }
  }, [session, auth])

  // Admins: signIn(username, password). Co-ordinators: signIn(googleCredential).
  async function signIn(...credentials) {
    const { token, user } = await auth.login(...credentials)
    session.setToken(token)
    setState({ status: 'signed-in', user })
  }

  function signOut() {
    session.setToken(null)
    setState(SIGNED_OUT)
  }

  return <AuthContext value={{ ...state, signIn, signOut }}>{children}</AuthContext>
}
