import { useEffect, useState } from 'react'
import { getToken, setToken, setUnauthorizedHandler } from '../../api/client.js'
import { adminApi } from '../../api/endpoints.js'
import { AuthContext } from './authContext.js'

const SIGNED_OUT = { status: 'signed-out', admin: null }

export default function AuthProvider({ children }) {
  // A token saved by an earlier visit has to be checked with the server before it is trusted.
  const [session, setSession] = useState(() => (getToken() ? { status: 'checking', admin: null } : SIGNED_OUT))

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null)
      setSession(SIGNED_OUT)
    })
    return () => setUnauthorizedHandler(() => {})
  }, [])

  useEffect(() => {
    if (!getToken()) return
    let ignore = false
    adminApi.me().then(
      ({ admin }) => {
        if (!ignore) setSession({ status: 'signed-in', admin })
      },
      () => {
        if (!ignore) setSession(SIGNED_OUT)
      },
    )
    return () => {
      ignore = true
    }
  }, [])

  async function signIn(username, password) {
    const { token, admin } = await adminApi.login(username, password)
    setToken(token)
    setSession({ status: 'signed-in', admin })
  }

  function signOut() {
    setToken(null)
    setSession(SIGNED_OUT)
  }

  return <AuthContext value={{ ...session, signIn, signOut }}>{children}</AuthContext>
}
