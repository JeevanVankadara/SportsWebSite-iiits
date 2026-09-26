import { createContext, useContext } from 'react'

export const BadmintonContext = createContext(null)

// { tournament, sport, basePath, houseName(id), breadcrumbs(...extra) } for the badminton pages.
export function useBadminton() {
  return useContext(BadmintonContext)
}
