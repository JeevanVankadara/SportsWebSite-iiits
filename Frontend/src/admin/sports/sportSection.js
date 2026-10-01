import { adminPath } from '../../config.js'

// What every sport section shares with its pages:
// { tournament, sport, basePath, houseName(id), breadcrumbs(...extra) }.
// A friendly match is a hidden one-match tournament (Backend models/Tournament.js, is_friendly), so its
// pages sit under "Friendly matches" instead of a tournament, and it has no sport home page.
export function sportSection(tournament, sport) {
  const basePath = adminPath(`tournaments/${tournament._id}/sports/${sport._id}`)
  const houses = new Map(tournament.houses.map((house) => [house._id, house.house_name]))

  return {
    tournament,
    sport,
    basePath,
    houseName: (houseId) => houses.get(houseId) ?? 'Removed house',
    breadcrumbs: (...extra) => {
      const pages = extra.filter(Boolean)
      if (tournament.is_friendly) return [{ label: 'Friendly matches', to: adminPath('friendlies') }, ...pages]
      return [
        { label: 'Dashboard', to: adminPath('dashboard') },
        { label: tournament.tournament_name, to: adminPath(`tournaments/${tournament._id}`) },
        pages.length ? { label: sport.game_name, to: basePath } : { label: sport.game_name },
        ...pages,
      ]
    },
  }
}
