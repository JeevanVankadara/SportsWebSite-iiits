import { Route, Routes } from 'react-router'
import { adminPath } from '../../../config.js'
import NotFoundPage from '../../../pages/NotFoundPage.jsx'
import './volleyball.css'
import { VolleyballContext } from './volleyballContext.js'
import VolleyballHomePage from './VolleyballHomePage.jsx'
import FixtureFormPage from './FixtureFormPage.jsx'
import FixturePage from './FixturePage.jsx'

export default function VolleyballRoutes({ tournament, sport }) {
  const basePath = adminPath(`tournaments/${tournament._id}/sports/${sport._id}`)
  const houses = new Map(tournament.houses.map((house) => [house._id, house.house_name]))

  const value = {
    tournament,
    sport,
    basePath,
    houseName: (houseId) => houses.get(houseId) ?? 'Removed house',
    breadcrumbs: (...extra) => [
      { label: 'Dashboard', to: adminPath('dashboard') },
      { label: tournament.tournament_name, to: adminPath(`tournaments/${tournament._id}`) },
      extra.length ? { label: 'Volleyball', to: basePath } : { label: 'Volleyball' },
      ...extra.filter(Boolean),
    ],
  }

  return (
    <VolleyballContext value={value}>
      <Routes>
        <Route index element={<VolleyballHomePage />} />
        <Route path="fixtures/new" element={<FixtureFormPage />} />
        <Route path="fixtures/:fixtureId" element={<FixturePage />} />
        <Route path="fixtures/:fixtureId/edit" element={<FixtureFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </VolleyballContext>
  )
}
