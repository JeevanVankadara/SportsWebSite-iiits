import { createContext, use } from 'react'

export const KabaddiContext = createContext(null)

export function useKabaddi() {
  const context = use(KabaddiContext)
  if (!context) throw new Error('useKabaddi must be used inside KabaddiRoutes')
  return context
}
