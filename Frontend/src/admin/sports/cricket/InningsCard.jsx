import {
  dismissalText,
  inningsTitle,
  oversText,
  playerName,
  runRate,
  strikeRate,
} from '../../../sports/cricket/format.js'

// Read-only scorecard of one innings: batting, extras, fall of wickets and bowling.
export default function InningsCard({ innings, fixture, names, players }) {
  const batted = new Set(innings.batting.map((row) => String(row.player)))
  const didNotBat = fixture[`${innings.batting_team}_players`].filter((player) => !batted.has(player._id))
  const { extras } = innings

  return (
    <section className="panel cr-card">
      <header className="cr-card-head">
        <div>
          <p className="cr-card-title">{inningsTitle(innings)}</p>
          <p className="cr-card-team">{names[innings.batting_team]}</p>
        </div>
        <p className="cr-card-score">
          {innings.runs}/{innings.wickets}
          <small>
            {oversText(innings.legal_balls)} ov · RR {runRate(innings.runs, innings.legal_balls)}
          </small>
        </p>
      </header>
      {innings.target && <p className="cr-card-note">Target {innings.target}</p>}

      <div className="table-scroll">
        <table className="cr-table">
          <thead>
            <tr>
              <th scope="col" className="cr-name">
                Batter
              </th>
              <th scope="col">R</th>
              <th scope="col">B</th>
              <th scope="col">4s</th>
              <th scope="col">6s</th>
              <th scope="col">SR</th>
            </tr>
          </thead>
          <tbody>
            {innings.batting.map((row) => (
              <tr key={row.player}>
                <th scope="row" className="cr-name">
                  {playerName(players, row.player)}
                  <small>
                    {row.dismissal
                      ? dismissalText(row.dismissal, players)
                      : row.status === 'batting'
                        ? 'batting'
                        : 'not out'}
                  </small>
                </th>
                <td className="cr-strong">{row.runs}</td>
                <td>{row.balls}</td>
                <td>{row.fours}</td>
                <td>{row.sixes}</td>
                <td>{strikeRate(row.runs, row.balls)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="cr-card-line">
        <strong>Extras {extras.total}</strong> (wd {extras.wides}, nb {extras.no_balls}, b {extras.byes}, lb {extras.leg_byes})
      </p>
      {innings.super_over === 0 && didNotBat.length > 0 && (
        <p className="cr-card-line">
          <strong>Did not bat:</strong> {didNotBat.map((player) => player.name).join(', ')}
        </p>
      )}
      {innings.fall_of_wickets.length > 0 && (
        <p className="cr-card-line">
          <strong>Fall of wickets:</strong>{' '}
          {innings.fall_of_wickets
            .map((item) => `${item.runs}-${item.wicket_no} (${playerName(players, item.player)}, ${oversText(item.balls)})`)
            .join(', ')}
        </p>
      )}
      {innings.powerplay_overs > 0 && (
        <p className="cr-card-line">
          <strong>Powerplay (overs 1–{innings.powerplay_overs}):</strong> {innings.powerplay.runs}/{innings.powerplay.wickets}
        </p>
      )}

      <div className="table-scroll">
        <table className="cr-table">
          <thead>
            <tr>
              <th scope="col" className="cr-name">
                Bowler
              </th>
              <th scope="col">O</th>
              <th scope="col">M</th>
              <th scope="col">R</th>
              <th scope="col">W</th>
              <th scope="col">Econ</th>
              <th scope="col">Wd</th>
              <th scope="col">NB</th>
            </tr>
          </thead>
          <tbody>
            {innings.bowling.map((row) => (
              <tr key={row.player}>
                <th scope="row" className="cr-name">
                  {playerName(players, row.player)}
                </th>
                <td>{oversText(row.balls)}</td>
                <td>{row.maidens}</td>
                <td>{row.runs}</td>
                <td className="cr-strong">{row.wickets}</td>
                <td>{runRate(row.runs, row.balls)}</td>
                <td>{row.wides}</td>
                <td>{row.no_balls}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
