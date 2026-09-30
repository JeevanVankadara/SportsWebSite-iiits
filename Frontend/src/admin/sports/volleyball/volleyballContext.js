import { createContext, use } from 'react'

export const VolleyballContext = createContext(null)

export function useVolleyball() {
  const context = use(VolleyballContext)
  if (!context) throw new Error('useVolleyball must be used inside VolleyballRoutes')
  return context
}
