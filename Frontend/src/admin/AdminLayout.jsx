import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { ADMIN_PATH, adminPath } from '../config.js'
import { useAuth } from '../auth/authContext.js'
import { isSuperAdmin } from './permissions.js'

const NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard' },
  { path: 'tournaments/new', label: 'Add tournament', superOnly: true },
  { path: 'friendlies', label: 'Friendly matches', superOnly: true },
  { path: 'admins', label: 'Admins', superOnly: true },
]

export default function AdminLayout() {
  const { user: admin, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // Tournament, sport and edit pages are reached from the dashboard, so they keep Dashboard highlighted.
  const activePath =
    NAV_ITEMS.find((item) => item.superOnly && (pathname === adminPath(item.path) || pathname.startsWith(`${adminPath(item.path)}/`)))
      ?.path ?? 'dashboard'
  const navItems = NAV_ITEMS.filter((item) => !item.superOnly || isSuperAdmin(admin))

  function handleSignOut() {
    signOut()
    navigate(ADMIN_PATH, { replace: true })
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-inner">
          <Link to={adminPath('dashboard')} className="brand">
            <img src="/iiits-logo.jpg" alt="" className="brand-logo" width="435" height="459" />
            <span className="brand-name">IIITS Sports</span>
            <span className="brand-tag">Admin</span>
          </Link>

          <nav className="admin-nav" aria-label="Admin sections">
            {navItems.map((item) => {
              const isActive = item.path === activePath
              return (
                <Link
                  key={item.path}
                  to={adminPath(item.path)}
                  className={`admin-nav-link${isActive ? ' active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="admin-account">
            <span className="admin-username">
              {admin?.username}
              {isSuperAdmin(admin) && ' · super admin'}
            </span>
            <button type="button" className="btn btn-sm btn-on-blue" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
