import { Link } from 'react-router'
import { useAuth } from '../../auth/authContext.js'
import { adminPath } from '../../config.js'
import { isSuperAdmin } from '../permissions.js'
import { EmptyState } from './ui.jsx'

// Pages only the super admin may open (tournaments, admins). The backend refuses the same actions.
export default function SuperAdminOnly({ children }) {
  const { user: admin } = useAuth()
  if (isSuperAdmin(admin)) return children
  return (
    <EmptyState
      title="Only the super admin can do this"
      text="Ask the super admin if you need this changed."
      action={
        <Link to={adminPath('dashboard')} className="btn btn-secondary">
          Back to dashboard
        </Link>
      }
    />
  )
}
