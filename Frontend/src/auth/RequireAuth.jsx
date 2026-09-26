import { Navigate, useLocation } from 'react-router'
import PageLoader from '../components/PageLoader.jsx'
import { useAuth } from './authContext.js'

// Sends anyone who is not signed in to the sign-in page, then back here after signing in.
export default function RequireAuth({ signInPath, children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'checking') return <PageLoader />
  if (status === 'signed-out') {
    return <Navigate to={signInPath} replace state={{ from: location.pathname }} />
  }
  return children
}
