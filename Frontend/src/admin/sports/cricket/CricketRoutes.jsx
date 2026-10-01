import { Route, Routes } from 'react-router'
import NotFoundPage from '../../../pages/NotFoundPage.jsx'
import SportHome from '../SportHome.jsx'
import { sportSection } from '../sportSection.js'
import './cricket.css'
import { CricketContext } from './cricketContext.js'
import CricketHomePage from './CricketHomePage.jsx'
import FixtureFormPage from './FixtureFormPage.jsx'
import FixturePage from './FixturePage.jsx'

// Cricket section of one tournament: fixtures, the points table with net run rate, and scorecards.
export default function CricketRoutes({ tournament, sport }) {
  const value = sportSection(tournament, sport)

  return (
    <CricketContext value={value}>
      <Routes>
        <Route
          index
          element={
            <SportHome tournament={tournament}>
              <CricketHomePage />
            </SportHome>
          }
        />
        <Route path="fixtures/new" element={<FixtureFormPage />} />
        <Route path="fixtures/:fixtureId" element={<FixturePage />} />
        <Route path="fixtures/:fixtureId/edit" element={<FixtureFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </CricketContext>
  )
}
