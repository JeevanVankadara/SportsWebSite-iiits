import { Route, Routes } from 'react-router'
import { adminPath } from '../../../config.js'
import NotFoundPage from '../../../pages/NotFoundPage.jsx'
import './badminton.css'
import { BadmintonContext } from './badmintonContext.js'
import BadmintonHomePage from './BadmintonHomePage.jsx'
import FixtureFormPage from './FixtureFormPage.jsx'
import FixturePage from './FixturePage.jsx'

// Badminton section of one tournament: fixtures, the points table and result corrections.
export default function BadmintonRoutes({ tournament, sport }) {
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
      extra.length ? { label: 'Badminton', to: basePath } : { label: 'Badminton' },
      ...extra,
    ],
  }

  return (
    <BadmintonContext value={value}>
      <Routes>
        <Route index element={<BadmintonHomePage />} />
        <Route path="fixtures/new" element={<FixtureFormPage />} />
        <Route path="fixtures/:fixtureId" element={<FixturePage />} />
        <Route path="fixtures/:fixtureId/edit" element={<FixtureFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BadmintonContext>
  )
}
