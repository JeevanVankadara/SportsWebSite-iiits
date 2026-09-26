import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// { status: 'checking' | 'signed-in' | 'signed-out', user, signIn, signOut } for the current area.
export function useAuth() {
  return useContext(AuthContext)
}
