import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// { status: 'checking' | 'signed-in' | 'signed-out', admin, signIn, signOut }
export function useAuth() {
  return useContext(AuthContext)
}
