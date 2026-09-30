import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import PageLoader from './components/PageLoader.jsx'
import { ADMIN_PATH, COORDINATOR_PATH } from './config.js'
import RegisterPage from './pages/RegisterPage.jsx'

// Loaded only when someone opens the admin path, so students never download the admin code.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const CoordinatorApp = lazy(() => import('./coordinator/CoordinatorApp.jsx'))
const ViewerApp = lazy(() => import('./viewer/ViewerApp.jsx'))

export default function App() {
  return (
    <Routes>
      <Route
        path="/*"
        element={
          <Suspense fallback={<PageLoader />}>
            <ViewerApp />
          </Suspense>
        }
      />
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
    </Routes>
  )
}
