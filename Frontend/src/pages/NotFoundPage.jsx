import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <main className="simple-page">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="btn btn-primary">
        Go to home
      </Link>
    </main>
  )
}
