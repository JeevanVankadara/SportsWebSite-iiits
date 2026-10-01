import { Navigate } from 'react-router'
import { adminPath } from '../../config.js'

// The sport's home page (fixtures, points table, winners); a friendly goes back to the friendlies list.
export default function SportHome({ tournament, children }) {
  return tournament.is_friendly ? <Navigate to={adminPath('friendlies')} replace /> : children
}
