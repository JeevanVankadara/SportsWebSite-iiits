import { Navigate, useLocation } from 'react-router'
import PageLoader from '../../components/PageLoader.jsx'
import { ADMIN_PATH } from '../../config.js'
import { useAuth } from './authContext.js'

// Sends anyone who is not signed in to the admin sign-in page, then back here after signing in.
export default function RequireAdmin({ children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'checking') return <PageLoader />
  if (status === 'signed-out') {
    return <Navigate to={ADMIN_PATH} replace state={{ from: location.pathname }} />
  }
  return children
}
