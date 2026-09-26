import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import PageLoader from './components/PageLoader.jsx'
import { ADMIN_PATH, COORDINATOR_PATH } from './config.js'
import HomePage from './pages/HomePage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'

// Loaded only when someone opens the admin path, so students never download the admin code.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const CoordinatorApp = lazy(() => import('./coordinator/CoordinatorApp.jsx'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path={`${ADMIN_PATH}/*`}
        element={
          <Suspense fallback={<PageLoader />}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route
        path={`${COORDINATOR_PATH}/*`}
        element={
          <Suspense fallback={<PageLoader />}>
            <CoordinatorApp />
          </Suspense>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
