import { coordinatorPlayersApi } from '../../api/endpoints.js'
import { GuestContext } from './guestContext.js'

// Lets every PlayerSlot inside add a guest (someone without an account) for this one match.
export function GuestScope({ sport, fixtureId, children }) {
  const addGuest = (name) => coordinatorPlayersApi.addGuest(sport, fixtureId, name).then(({ player }) => player)
  return <GuestContext value={addGuest}>{children}</GuestContext>
}
