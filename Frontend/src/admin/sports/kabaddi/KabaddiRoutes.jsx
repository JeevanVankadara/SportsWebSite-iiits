import { Route, Routes } from 'react-router'
import { adminPath } from '../../../config.js'
import NotFoundPage from '../../../pages/NotFoundPage.jsx'
import './kabaddi.css'
import { KabaddiContext } from './kabaddiContext.js'
import KabaddiHomePage from './KabaddiHomePage.jsx'
import FixtureFormPage from './FixtureFormPage.jsx'
import FixturePage from './FixturePage.jsx'

export default function KabaddiRoutes({ tournament, sport }) {
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
      extra.length ? { label: 'Kabaddi', to: basePath } : { label: 'Kabaddi' },
      ...extra.filter(Boolean),
    ],
  }

  return (
    <KabaddiContext value={value}>
      <Routes>
        <Route index element={<KabaddiHomePage />} />
        <Route path="fixtures/new" element={<FixtureFormPage />} />
        <Route path="fixtures/:fixtureId" element={<FixturePage />} />
        <Route path="fixtures/:fixtureId/edit" element={<FixtureFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </KabaddiContext>
  )
}
