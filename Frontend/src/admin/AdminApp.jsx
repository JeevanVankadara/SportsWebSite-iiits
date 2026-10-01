import { Route, Routes } from 'react-router'
import { adminSession } from '../api/client.js'
import { adminAuth } from '../api/endpoints.js'
import AuthProvider from '../auth/AuthProvider.jsx'
import RequireAuth from '../auth/RequireAuth.jsx'
import { ADMIN_PATH } from '../config.js'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import './admin.css'
import AdminLayout from './AdminLayout.jsx'
import SuperAdminOnly from './components/SuperAdminOnly.jsx'
import AdminsPage from './pages/AdminsPage.jsx'
import FriendliesPage from './pages/FriendliesPage.jsx'
import FriendlyFormPage from './pages/FriendlyFormPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SportPage from './pages/SportPage.jsx'
import TournamentFormPage from './pages/TournamentFormPage.jsx'
import TournamentPage from './pages/TournamentPage.jsx'

// Everything below the secret admin path. The path itself is the sign-in page.
export default function AdminApp() {
  return (
    <AuthProvider session={adminSession} auth={adminAuth}>
      <title>Admin · IIITS Sports</title>
      <meta name="robots" content="noindex, nofollow" />
      <Routes>
        <Route index element={<LoginPage />} />
        <Route
          element={
            <RequireAuth signInPath={ADMIN_PATH}>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tournaments/new" element={<SuperAdminOnly><TournamentFormPage /></SuperAdminOnly>} />
          <Route path="tournaments/:id" element={<TournamentPage />} />
          <Route path="tournaments/:id/edit" element={<SuperAdminOnly><TournamentFormPage /></SuperAdminOnly>} />
          <Route path="admins" element={<SuperAdminOnly><AdminsPage /></SuperAdminOnly>} />
          <Route path="friendlies" element={<SuperAdminOnly><FriendliesPage /></SuperAdminOnly>} />
          <Route path="friendlies/new" element={<SuperAdminOnly><FriendlyFormPage /></SuperAdminOnly>} />
          <Route path="tournaments/:id/sports/:gameId/*" element={<SportPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}
