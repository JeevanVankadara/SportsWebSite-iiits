import { Route, Routes } from 'react-router'
import NotFoundPage from '../../../pages/NotFoundPage.jsx'
import SportHome from '../SportHome.jsx'
import { sportSection } from '../sportSection.js'
import './kabaddi.css'
import { KabaddiContext } from './kabaddiContext.js'
import KabaddiHomePage from './KabaddiHomePage.jsx'
import FixtureFormPage from './FixtureFormPage.jsx'
import FixturePage from './FixturePage.jsx'

export default function KabaddiRoutes({ tournament, sport }) {
  const value = sportSection(tournament, sport)

  return (
    <KabaddiContext value={value}>
      <Routes>
        <Route
          index
          element={
            <SportHome tournament={tournament}>
              <KabaddiHomePage />
            </SportHome>
          }
        />
        <Route path="fixtures/new" element={<FixtureFormPage />} />
        <Route path="fixtures/:fixtureId" element={<FixturePage />} />
        <Route path="fixtures/:fixtureId/edit" element={<FixtureFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </KabaddiContext>
  )
}
