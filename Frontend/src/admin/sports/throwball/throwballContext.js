import { createContext, use } from 'react'

export const ThrowballContext = createContext(null)

export function useThrowball() {
  const context = use(ThrowballContext)
  if (!context) throw new Error('useThrowball must be used inside ThrowballRoutes')
  return context
}
