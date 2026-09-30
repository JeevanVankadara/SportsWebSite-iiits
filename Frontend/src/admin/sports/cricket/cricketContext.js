import { createContext, useContext } from 'react'

export const CricketContext = createContext(null)

// { tournament, sport, basePath, houseName(id), breadcrumbs(...extra) } for the cricket pages.
export function useCricket() {
  return useContext(CricketContext)
}
