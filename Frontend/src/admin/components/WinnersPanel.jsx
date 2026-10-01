import { useEffect, useState } from 'react'
import { tournamentsApi } from '../../api/endpoints.js'
import Alert from '../../components/Alert.jsx'

const idOf = (value) => (value?._id ?? value ? String(value?._id ?? value) : '')

// The winner and runner-up the admin declares for one sport of a tournament, once its matches are
// over. Viewers see them at the top of that sport's page. Used by every sport's admin home page.
export default function WinnersPanel({ tournament, sport }) {
  const initial = tournament.winners?.find((row) => idOf(row.game) === sport._id)
  const [saved, setSaved] = useState({ winner: idOf(initial?.winner), runnerUp: idOf(initial?.runner_up) })
  const [winner, setWinner] = useState(saved.winner)
  const [runnerUp, setRunnerUp] = useState(saved.runnerUp)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const changed = winner !== saved.winner || runnerUp !== saved.runnerUp

  // The page's tournament was loaded when the admin entered this sport, so it can be older than
  // the last save. Read the current winners once when the panel opens.
  useEffect(() => {
    let ignore = false
    tournamentsApi.get(tournament._id).then(
      ({ tournament: latest }) => {
        if (ignore) return
        const row = latest.winners?.find((item) => idOf(item.game) === sport._id)
        const now = { winner: idOf(row?.winner), runnerUp: idOf(row?.runner_up) }
        setSaved(now)
        setWinner(now.winner)
        setRunnerUp(now.runnerUp)
      },
      () => {}, // Keep what the page already had; saving still works.
    )
    return () => {
      ignore = true
    }
  }, [tournament._id, sport._id])

  async function save(next) {
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const { tournament: updated } = await tournamentsApi.setWinners(tournament._id, {
        game: sport._id,
        winner: next.winner || null,
        runner_up: next.runnerUp || null,
      })
      const row = updated.winners?.find((item) => idOf(item.game) === sport._id)
      const now = { winner: idOf(row?.winner), runnerUp: idOf(row?.runner_up) }
      setSaved(now)
      setWinner(now.winner)
      setRunnerUp(now.runnerUp)
      setNotice(now.winner ? 'Winners saved. Viewers see them at the top of this sport’s page.' : 'Winners cleared.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function submit(event) {
    event.preventDefault()
    save({ winner, runnerUp })
  }

  function clear() {
    if (window.confirm(`Clear the ${sport.game_name} winners?`)) save({ winner: '', runnerUp: '' })
  }

  const houseOptions = (other) =>
    tournament.houses.map((house) => (
      <option key={house._id} value={house._id} disabled={house._id === other}>
        {house.house_name}
      </option>
    ))

  return (
    <form className="panel form-stack" onSubmit={submit}>
      <div>
        <h2 className="panel-title">{sport.game_name} winners</h2>
        <p className="field-hint">
          This is not a match. Once all the {sport.game_name} matches are over, pick the house that won{' '}
          {sport.game_name} overall and the runner-up. They are shown at the top of the {sport.game_name} page for
          everyone. To add a match, use the Fixtures tab.
        </p>
      </div>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Winner</span>
          <select
            className="input"
            value={winner}
            onChange={(event) => {
              setWinner(event.target.value)
              // A runner-up needs a winner.
              if (!event.target.value) setRunnerUp('')
            }}
          >
            <option value="">Not decided</option>
            {houseOptions(runnerUp)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">
            Runner-up <span className="optional">optional</span>
          </span>
          <select
            className="input"
            value={runnerUp}
            onChange={(event) => setRunnerUp(event.target.value)}
            disabled={!winner}
          >
            <option value="">Not decided</option>
            {houseOptions(winner)}
          </select>
        </label>
      </div>
      {error && <Alert>{error}</Alert>}
      {notice && !changed && <p className="field-hint" role="status">{notice}</p>}
      <div className="form-actions">
        {saved.winner && (
          <button type="button" className="btn btn-ghost" onClick={clear} disabled={busy}>
            Clear winners
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy || !changed || (!winner && !saved.winner)}>
          {busy ? 'Saving…' : 'Save winners'}
        </button>
      </div>
    </form>
  )
}
