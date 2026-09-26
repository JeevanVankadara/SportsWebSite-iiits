import { Route, Routes } from 'react-router'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import './admin.css'
import AdminLayout from './AdminLayout.jsx'
import AuthProvider from './auth/AuthProvider.jsx'
import RequireAdmin from './auth/RequireAdmin.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SportPage from './pages/SportPage.jsx'
import TournamentFormPage from './pages/TournamentFormPage.jsx'
import TournamentPage from './pages/TournamentPage.jsx'

// Everything below the secret admin path. The path itself is the sign-in page.
export default function AdminApp() {
  return (
    <AuthProvider>
      <title>Admin · IIITS Sports</title>
      <meta name="robots" content="noindex, nofollow" />
      <Routes>
        <Route index element={<LoginPage />} />
        <Route
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tournaments/new" element={<TournamentFormPage />} />
          <Route path="tournaments/:id" element={<TournamentPage />} />
          <Route path="tournaments/:id/edit" element={<TournamentFormPage />} />
          <Route path="tournaments/:id/sports/:gameId" element={<SportPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}
