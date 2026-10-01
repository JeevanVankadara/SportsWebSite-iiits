import { Route, Routes } from 'react-router'
import NotFoundPage from '../../../pages/NotFoundPage.jsx'
import SportHome from '../SportHome.jsx'
import { sportSection } from '../sportSection.js'
import './badminton.css'
import { BadmintonContext } from './badmintonContext.js'
import BadmintonHomePage from './BadmintonHomePage.jsx'
import FixtureFormPage from './FixtureFormPage.jsx'
import FixturePage from './FixturePage.jsx'

// Badminton section of one tournament: fixtures, the points table and result corrections.
export default function BadmintonRoutes({ tournament, sport }) {
  const value = sportSection(tournament, sport)

  return (
    <BadmintonContext value={value}>
      <Routes>
        <Route
          index
          element={
            <SportHome tournament={tournament}>
              <BadmintonHomePage />
            </SportHome>
          }
        />
        <Route path="fixtures/new" element={<FixtureFormPage />} />
        <Route path="fixtures/:fixtureId" element={<FixturePage />} />
        <Route path="fixtures/:fixtureId/edit" element={<FixtureFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BadmintonContext>
  )
}
