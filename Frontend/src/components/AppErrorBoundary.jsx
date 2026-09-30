import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="app-recovery" role="alert">
      <h1>Let’s get you back to the game.</h1>
      <p>The page couldn’t finish loading. Reload to recover.</p>
      <p>If you were submitting a score, check the latest scorecard before entering it again.</p>
      <button type="button" onClick={() => window.location.reload()}>Reload page</button>
      <a href="/">Back to scores</a>
    </main>
  }
}
