import '@fontsource-variable/inter'
import '@fontsource/bebas-neue'
import { Route, Routes } from 'react-router'
import { coordinatorSession } from '../api/client.js'
import { coordinatorAuth } from '../api/endpoints.js'
import AuthProvider from '../auth/AuthProvider.jsx'
import RequireAuth from '../auth/RequireAuth.jsx'
import { COORDINATOR_PATH } from '../config.js'
import './coordinator.css'
import CoordinatorLayout from './CoordinatorLayout.jsx'
import GamesPage from './pages/GamesPage.jsx'
import SignInPage from './pages/SignInPage.jsx'
import { CoNotFound } from './components/ui.jsx'
import BadmintonFixturePage from './sports/badminton/BadmintonFixturePage.jsx'
import FootballFixturePage from './sports/football/FootballFixturePage.jsx'
import CricketFixturePage from './sports/cricket/CricketFixturePage.jsx'
import KabaddiFixturePage from './sports/kabaddi/KabaddiFixturePage.jsx'

// Co-ordinator (referee) area. Each sport keeps its screens in its own folder under sports/.
export default function CoordinatorApp() {
  return (
    <AuthProvider session={coordinatorSession} auth={coordinatorAuth}>
      <title>Co-ordinator · IIITS Sports</title>
      <meta name="robots" content="noindex, nofollow" />
      <div className="co-app">
        <Routes>
          <Route index element={<SignInPage />} />
          <Route
            element={
              <RequireAuth signInPath={COORDINATOR_PATH}>
                <CoordinatorLayout />
              </RequireAuth>
            }
          >
            <Route path="games" element={<GamesPage />} />
            <Route path="badminton/:fixtureId" element={<BadmintonFixturePage />} />
            <Route path="football/:fixtureId" element={<FootballFixturePage />} />
            <Route path="cricket/:fixtureId" element={<CricketFixturePage />} />
            <Route path="kabaddi/:fixtureId" element={<KabaddiFixturePage />} />
          </Route>
          <Route path="*" element={<CoNotFound />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}
