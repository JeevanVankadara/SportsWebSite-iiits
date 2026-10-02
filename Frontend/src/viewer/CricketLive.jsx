import { useState } from 'react'
import { Link } from 'react-router'
import { Activity } from 'lucide-react'
import PlayerAvatar from './PlayerAvatar.jsx'
import { SportCelebration, CountUp, SegToggle } from './Fx.jsx'
import { liveInning, shortName } from './liveFeed.js'
import { idOf, houseName, resultLine } from './data.js'
import { firstName, oversText, runRate, strikeRate } from '../sports/cricket/format.js'
import { deliveryValue, overNumber, partnership } from './cricketLiveData.js'

function PlayerName({ player }) {
  if (!player?._id) return <strong>Player to be announced</strong>
  const preview = new URLSearchParams(window.location.search).get('preview') === '1'
  return <Link to={`/players/${idOf(player)}${preview ? '?preview=1' : ''}`}>{firstName(player.name) || player.name}</Link>
}

export function CricketLiveHeader({ data, live }) {
  const inning = liveInning(data)
  const event = live?.event
  if (!inning) return <p>Waiting for the innings to begin.</p>
  const batting = houseName(data.tournament, data.fixture[inning.batting_team])
  const remaining = Math.max(0, (inning.overs ?? data.fixture.overs ?? 0) * 6 - inning.legal_balls)
  const needed = inning.target != null ? Math.max(0, inning.target - inning.runs) : null
  const lastBall = inning.this_over?.at(-1) ?? inning.over_history?.at(-1)?.balls?.at(-1)
  const lastKind = lastBall == null ? '' : String(lastBall).includes('W') ? 'wicket' : ['4', '6'].includes(String(lastBall)) ? 'boundary' : ''
  return <div className="st-fx-hero" data-event={event?.kind}>
    <SportCelebration event={event} sport="cricket" />
    <div className="st-cx-left">
      <div>
        <span className="st-cx-name" data-tip={`${batting} are batting`}>{batting}<em>P{inning.innings_no ?? 1}</em></span>
        <div className="st-cx-score"><strong><CountUp value={inning.runs} />-{inning.wickets}</strong><small>{oversText(inning.legal_balls)}</small></div>
      </div>
    </div>
    <span className="st-cx-slash" aria-hidden="true" />
    <div className="st-cx-last" data-kind={lastKind} aria-label="Last ball">{lastBall == null ? '-' : String(lastBall)}</div>
    <div className="st-cx-centre"><b>{resultLine(data.fixture, data.tournament)}</b></div>
    <div className="st-cx-right">
      <div className="st-cx-rates">
        <span data-tip="Current run rate">CRR :<b>{runRate(inning.runs, inning.legal_balls)}</b></span>
        {needed != null && remaining > 0 && <span data-tip="Required run rate">RRR :<b>{runRate(needed, remaining)}</b></span>}
      </div>
      <p className="st-cx-need">
        <span className="st-cx-long">{needed != null ? `${batting} need ${needed} runs in ${remaining} balls` : `${remaining} balls remaining · ${inning.overs ?? data.fixture.overs} overs`}</span>
        <span className="st-cx-short">{inning.target != null ? `Target : ${inning.target}` : `${remaining} balls left`}</span>
      </p>
    </div>
  </div>
}

export function OverStrip({ inning }) {
  const history = inning.over_history ?? inning.observed_overs ?? []
  const rows = history.length ? history : [{ number: overNumber(inning), balls: inning.this_over ?? [] }]
  return <section className="st-overs-panel"><div className="st-live-section-title"><h3>Over by over</h3><span>Dots · runs · extras · wickets</span></div><div className="st-overs-scroll">{rows.map(over => {
    const legal = over.balls.filter(ball => deliveryValue(ball).legal).length
    const total = over.balls.reduce((n, ball) => n + deliveryValue(ball).runs, 0)
    return <div className="st-numbered-over" key={over.number}><span>Over <b>{over.number}</b></span><div>{over.balls.map((ball, index) => <b key={index} data-tip={`Delivery ${index + 1}: ${ball === '0' ? 'dot' : ball}`} className={String(ball).includes('W') ? 'is-wicket' : ['4', '6'].includes(String(ball)) ? 'is-boundary' : ''}>{ball === '0' ? '•' : ball}</b>)}{Array.from({ length: Math.max(0, 6 - legal) }, (_, index) => <i key={index} aria-label="Delivery yet to be bowled" />)}</div><strong>= {total}</strong>{legal < 6 && over.number !== overNumber(inning) && <small>Partial</small>}</div>
  })}</div>{!inning.over_history && <p className="st-live-note">Only overs received while this page is open are available. Earlier delivery history is not supplied by the API.</p>}</section>
}

function FeedItem({ item }) {
  if (item.kind === 'sync') return <li className="st-feed-item st-feed-over"><div><b>Score update</b><span>{item.text}</span></div></li>
  if (item.kind === 'over-end') return <li className="st-feed-item st-feed-over"><div><b>Over {item.over} complete</b><span>{item.text} Score {item.runs}/{item.wickets}</span></div></li>
  if (item.kind === 'milestone') return <li className="st-feed-item st-feed-milestone"><PlayerAvatar id={item.id} /><div><b>{item.word} {shortName(item.name)}</b><span>{item.stats.runs} ({item.stats.balls}) · {item.stats.fours} fours · {item.stats.sixes} sixes</span></div></li>
  return <li className={`st-feed-item st-feed-${item.kind}`}>
    <span className={`st-feed-ball st-ball-${item.kind}`}>{item.kind === 'wicket' ? 'W' : item.kind === 'dot' ? '•' : item.token}</span>
    <div><small>{item.over}</small><p>{item.text}</p>
      {item.out && <div className="st-out-card"><PlayerAvatar id={item.out.id} /><div><b>{shortName(item.out.name)} <em>{item.out.runs}({item.out.balls})</em></b><span>{item.out.kind ? item.out.kind.replace('_', ' ') : 'out'} {item.out.bowler}</span></div><div className="st-out-stats"><small>4s/6s</small><b>{item.out.fours}/{item.out.sixes}</b><small>SR</small><b>{strikeRate(item.out.runs, item.out.balls)}</b></div><span className="st-out-tag">OUT</span></div>}
    </div>
  </li>
}

function Commentary({ feed }) {
  const [filter, setFilter] = useState('all')
  const shown = feed.filter(item => filter === 'all' || (filter === 'wicket' && item.kind === 'wicket') || (filter === 'six' && item.kind === 'six') || (filter === 'four' && item.kind === 'four') || (filter === 'milestone' && item.kind === 'milestone'))
  return <section className="st-detail-panel st-fx-card st-commentary">
    <div className="st-live-section-title"><h2>Commentary</h2><span>Updates ball by ball</span></div>
    <SegToggle label="Commentary filter" value={filter} onChange={setFilter} options={[['all', 'All'], ['wicket', 'W'], ['six', '6s'], ['four', '4s'], ['milestone', 'Milestone']]} />
    {shown.length ? <ol className="st-feed">{shown.map(item => <FeedItem key={item.uid} item={item} />)}</ol> : <p className="st-live-note">Nothing here yet. New deliveries appear as they are scored.</p>}
    <p className="st-live-note">Commentary text is generated from the scored deliveries.</p>
  </section>
}

export default function CricketLive({ data, live }) {
  const inning = liveInning(data)
  if (!inning) return <div className="st-message">No innings in play right now.</div>
  const f = data.fixture
  const batting = houseName(data.tournament, f[inning.batting_team])
  const bowling = houseName(data.tournament, f[inning.bowling_team])
  const players = new Map(['team1', 'team2'].flatMap(team => [...(f[`${team}_players`] ?? []), ...(f[`${team}_substitutes`] ?? [])]).map(player => [idOf(player), player]))
  const batters = [inning.striker, inning.non_striker].filter(Boolean).map(id => ({ ...inning.batting?.find(row => idOf(row.player) === idOf(id)), player: id }))
  const bowler = inning.bowling?.find(row => idOf(row.player) === idOf(inning.bowler))
  const stand = partnership(inning)
  const fall = inning.fall_of_wickets?.at(-1)
  const fallRow = fall && inning.batting?.find(row => idOf(row.player) === idOf(fall.player))
  const lastWkt = fall && `${shortName(players.get(idOf(fall.player))?.name ?? 'Batter')} ${fallRow?.runs ?? 0}(${fallRow?.balls ?? 0})`

  return (
    <div className="st-cricket-live-layout">
      <div className="st-live-main">
        <section className="st-detail-panel st-crease-panel st-fx-card">
          <div className="st-live-section-title"><h2>At the crease</h2><span><Activity size={14} /> Live innings</span></div>
          <div className="st-active-players">
            {batters.map(row => <div className="st-active-player" key={idOf(row.player)}><PlayerAvatar id={idOf(row.player)} team={batting} /><div><small>{idOf(row.player) === idOf(inning.striker) ? 'On strike' : 'Non-striker'}</small><PlayerName player={players.get(idOf(row.player))} /><p><b><CountUp value={row.runs ?? 0} /></b> <span>({row.balls ?? 0})</span></p><small>{row.fours ?? 0} fours · {row.sixes ?? 0} sixes</small><small>SR {strikeRate(row.runs ?? 0, row.balls ?? 0)}</small></div></div>)}
            {bowler && <div className="st-active-player st-current-bowler"><PlayerAvatar id={idOf(bowler.player)} team={bowling} /><div><small>Bowling</small><PlayerName player={players.get(idOf(bowler.player))} /><p><b>{bowler.wickets}–{bowler.runs}</b> <span>({oversText(bowler.balls)})</span></p><small>Economy {runRate(bowler.runs, bowler.balls)}</small></div></div>}
          </div>
          {(stand || lastWkt) && <div className="st-partnership"><span>P'ship : <b>{stand ? `${stand.runs}(${stand.balls})` : '-'}</b></span>{lastWkt && <span>Last Wkt : <b>{lastWkt}</b></span>}</div>}
          {inning.free_hit && <div className="st-chase-line">Free hit · next delivery</div>}
          {inning.powerplay && <div className="st-chase-line">Powerplay in progress</div>}
          <OverStrip inning={inning} />
        </section>
        <Commentary feed={live?.feed ?? []} />
      </div>
    </div>
  )
}

