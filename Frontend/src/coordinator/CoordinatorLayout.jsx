import { Link, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../auth/authContext.js'
import { COORDINATOR_PATH, coordinatorPath } from '../config.js'

export default function CoordinatorLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate(COORDINATOR_PATH, { replace: true })
  }

  return (
    <>
      <header className="co-header">
        <div className="co-header-inner">
          <Link to={coordinatorPath('games')} className="co-brand">
            <img src="/iiits-logo.jpg" alt="" className="co-brand-logo" width="435" height="459" />
            <span className="co-brand-name">IIITS Sports</span>
            <span className="co-brand-tag">Co-ordinator</span>
          </Link>
          <div className="co-account">
            <span className="co-account-name">{user?.name}</span>
            <button type="button" className="co-btn co-btn-ghost co-btn-sm" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="co-main">
        <Outlet />
      </main>
    </>
  )
}
