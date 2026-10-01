import { Route, Routes } from 'react-router'
import NotFoundPage from '../../../pages/NotFoundPage.jsx'
import SportHome from '../SportHome.jsx'
import { sportSection } from '../sportSection.js'
import './volleyball.css'
import { VolleyballContext } from './volleyballContext.js'
import VolleyballHomePage from './VolleyballHomePage.jsx'
import FixtureFormPage from './FixtureFormPage.jsx'
import FixturePage from './FixturePage.jsx'

export default function VolleyballRoutes({ tournament, sport }) {
  const value = sportSection(tournament, sport)

  return (
    <VolleyballContext value={value}>
      <Routes>
        <Route
          index
          element={
            <SportHome tournament={tournament}>
              <VolleyballHomePage />
            </SportHome>
          }
        />
        <Route path="fixtures/new" element={<FixtureFormPage />} />
        <Route path="fixtures/:fixtureId" element={<FixturePage />} />
        <Route path="fixtures/:fixtureId/edit" element={<FixtureFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </VolleyballContext>
  )
}
