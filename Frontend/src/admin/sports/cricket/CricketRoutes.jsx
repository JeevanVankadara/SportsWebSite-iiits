import { Route, Routes } from 'react-router'
import { adminPath } from '../../../config.js'
import NotFoundPage from '../../../pages/NotFoundPage.jsx'
import './cricket.css'
import { CricketContext } from './cricketContext.js'
import CricketHomePage from './CricketHomePage.jsx'
import FixtureFormPage from './FixtureFormPage.jsx'
import FixturePage from './FixturePage.jsx'

// Cricket section of one tournament: fixtures, the points table with net run rate, and scorecards.
export default function CricketRoutes({ tournament, sport }) {
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
      extra.length ? { label: 'Cricket', to: basePath } : { label: 'Cricket' },
      ...extra,
    ],
  }

  return (
    <CricketContext value={value}>
      <Routes>
        <Route index element={<CricketHomePage />} />
        <Route path="fixtures/new" element={<FixtureFormPage />} />
        <Route path="fixtures/:fixtureId" element={<FixturePage />} />
        <Route path="fixtures/:fixtureId/edit" element={<FixtureFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </CricketContext>
  )
}
