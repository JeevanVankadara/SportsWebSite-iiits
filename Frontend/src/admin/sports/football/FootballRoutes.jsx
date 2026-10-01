import { Route, Routes } from 'react-router'
import NotFoundPage from '../../../pages/NotFoundPage.jsx'
import SportHome from '../SportHome.jsx'
import { sportSection } from '../sportSection.js'
import './football.css'
import { FootballContext } from './footballContext.js'
import FootballHomePage from './FootballHomePage.jsx'
import FixtureFormPage from './FixtureFormPage.jsx'
import FixturePage from './FixturePage.jsx'

export default function FootballRoutes({ tournament, sport }) {
  const value = sportSection(tournament, sport)

  return (
    <FootballContext value={value}>
      <Routes>
        <Route
          index
          element={
            <SportHome tournament={tournament}>
              <FootballHomePage />
            </SportHome>
          }
        />
        <Route path="fixtures/new" element={<FixtureFormPage />} />
        <Route path="fixtures/:fixtureId" element={<FixturePage />} />
        <Route path="fixtures/:fixtureId/edit" element={<FixtureFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </FootballContext>
  )
}
