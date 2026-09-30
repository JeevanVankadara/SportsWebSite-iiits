import { createContext, use } from 'react'

export const FootballContext = createContext(null)

export function useFootball() {
  const context = use(FootballContext)
  if (!context) throw new Error('useFootball must be used inside FootballRoutes')
  return context
}
