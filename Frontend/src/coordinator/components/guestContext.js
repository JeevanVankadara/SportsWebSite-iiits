import { createContext, useContext } from 'react'

// Holds addGuest(name) -> Promise<player> for the match a GuestScope wraps.
export const GuestContext = createContext(null)

// The add-a-guest function of the surrounding GuestScope, or null outside one.
export const useAddGuest = () => useContext(GuestContext)
