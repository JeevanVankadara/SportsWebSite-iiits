import { Link } from 'react-router'
import { COORDINATOR_PATH } from '../config.js'

// Placeholder until the students' live score dashboard is built.
export default function HomePage() {
  return (
    <main className="simple-page">
      <img src="/iiits-logo.jpg" alt="IIIT Sri City logo" className="simple-page-logo" width="435" height="459" />
      <h1>IIITS Sports</h1>
      <p>Live scores from inter-UG and inter-club tournaments will show up here soon.</p>
      <Link to="/register" className="btn btn-primary">
        Register as a player
      </Link>
      <Link to={COORDINATOR_PATH} className="simple-page-link">
        Co-ordinator sign in
      </Link>
    </main>
  )
}
