import {
  dismissalText,
  inningsTitle,
  oversText,
  playerName,
  runRate,
  strikeRate,
} from '../../../sports/cricket/format.js'
import { CoEmpty } from '../../components/ui.jsx'

// Full scorecard of every innings, the match first and then any super overs.
export default function Scorecard({ fixture, innings, names, players }) {
  if (innings.length === 0) {
    return <CoEmpty title="No balls bowled yet" text="The scorecard fills in ball by ball." />
  }
  return (
    <div className="co-cr-cards">
      {innings.map((inn) => (
        <InningsScorecard key={inn._id} inn={inn} fixture={fixture} names={names} players={players} />
      ))}
    </div>
  )
}

function InningsScorecard({ inn, fixture, names, players }) {
  const batted = new Set(inn.batting.map((row) => String(row.player)))
  const didNotBat = fixture[`${inn.batting_team}_players`].filter((player) => !batted.has(player._id))
  const { extras } = inn

  return (
    <section className={`co-panel co-cr-card${inn.super_over > 0 ? ' is-super' : ''}`}>
      <header className="co-cr-card-head">
        <div>
          <p className="co-eyebrow">{inningsTitle(inn)}</p>
          <h3 className="co-display co-cr-live-team">{names[inn.batting_team]}</h3>
        </div>
        <p className="co-cr-card-score">
          <span className="co-display">
            {inn.runs}/{inn.wickets}
          </span>
          <small>
            {oversText(inn.legal_balls)} ov · RR {runRate(inn.runs, inn.legal_balls)}
          </small>
        </p>
      </header>

      <div className="co-cr-scroll">
        <table className="co-cr-table">
          <thead>
            <tr>
              <th scope="col" className="co-cr-name">
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
            {inn.batting.map((row) => (
              <tr key={row.player}>
                <th scope="row" className="co-cr-name">
                  {playerName(players, row.player)}
                  <small>
                    {row.dismissal
                      ? dismissalText(row.dismissal, players)
                      : row.status === 'batting'
                        ? 'batting'
                        : 'not out'}
                  </small>
                </th>
                <td className="co-cr-strong">{row.runs}</td>
                <td>{row.balls}</td>
                <td>{row.fours}</td>
                <td>{row.sixes}</td>
                <td>{strikeRate(row.runs, row.balls)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="co-cr-line">
        <strong>Extras {extras.total}</strong> (wd {extras.wides}, nb {extras.no_balls}, b {extras.byes}, lb {extras.leg_byes})
      </p>
      {inn.super_over === 0 && didNotBat.length > 0 && (
        <p className="co-cr-line">
          <strong>Did not bat:</strong> {didNotBat.map((player) => player.name).join(', ')}
        </p>
      )}
      {inn.fall_of_wickets.length > 0 && (
        <p className="co-cr-line">
          <strong>Fall of wickets:</strong>{' '}
          {inn.fall_of_wickets
            .map((item) => `${item.runs}-${item.wicket_no} (${playerName(players, item.player)}, ${oversText(item.balls)})`)
            .join(', ')}
        </p>
      )}
      {inn.powerplay_overs > 0 && (
        <p className="co-cr-line">
          <strong>Powerplay (overs 1–{inn.powerplay_overs}):</strong> {inn.powerplay.runs}/{inn.powerplay.wickets}
        </p>
      )}

      <div className="co-cr-scroll">
        <table className="co-cr-table">
          <thead>
            <tr>
              <th scope="col" className="co-cr-name">
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
            {inn.bowling.map((row) => (
              <tr key={row.player}>
                <th scope="row" className="co-cr-name">
                  {playerName(players, row.player)}
                </th>
                <td>{oversText(row.balls)}</td>
                <td>{row.maidens}</td>
                <td>{row.runs}</td>
                <td className="co-cr-strong">{row.wickets}</td>
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
