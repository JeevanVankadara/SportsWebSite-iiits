// The short line shown next to a player's name in pickers and lineups: their @username, or, for a
// guest added for one match only (no account), a note saying so.
export const playerHandle = (player) => (player?.is_guest ? 'guest · this match only' : `@${player?.username ?? ''}`)
