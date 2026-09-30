import { useState } from 'react'
import { Link } from 'react-router'
import { Activity, ArrowUpRight, Clock3 } from 'lucide-react'
import PlayerAvatar from './PlayerAvatar.jsx'
import { TeamLogo } from './Cartoon.jsx'
import { AnimatedBar, BallCelebration, CountUp, SegToggle } from './Fx.jsx'
import { liveInning, shortName, usePop, winProbability } from './liveFeed.js'
import { idOf, houseName, formatDate } from './data.js'
import { inningsTitle, oversText, runRate, strikeRate } from '../sports/cricket/format.js'
import { deliveryValue, overNumber, partnership } from './cricketLiveData.js'

function PlayerName({ player }) {
  if (!player?._id) return <strong>Player to be announced</strong>
  const preview = new URLSearchParams(window.location.search).get('preview') === '1'
  return <Link to={`/players/${idOf(player)}${preview ? '?preview=1' : ''}`}>{player.name}</Link>
}

const EVENT_LABEL = { six: 'SIX', four: 'FOUR', wicket: 'WICKET', wide: 'WIDE', noball: 'NO BALL', milestone: 'MILESTONE' }

export function CricketLiveHeader({ data, live }) {
  const inning = liveInning(data)
  const event = live?.event
  const chip = usePop(event?.uid)
  if (!inning) return <p>Waiting for the innings to begin.</p>
  const batting = houseName(data.tournament, data.fixture[inning.batting_team])
  const bowling = houseName(data.tournament, data.fixture[inning.bowling_team])
  const remaining = Math.max(0, (inning.overs ?? data.fixture.overs ?? 0) * 6 - inning.legal_balls)
  const needed = inning.target != null ? Math.max(0, inning.target - inning.runs) : null
  const last = inning.this_over?.at(-1)
  const centre = event && !event.seeded ? (event.kind === 'milestone' ? event.word : EVENT_LABEL[event.kind]) ?? 'LIVE' : last === '0' ? 'Dot ball' : last === '4' ? 'FOUR' : last === '6' ? 'SIX' : last?.includes('W') ? 'WICKET' : last ?? 'Ready to play'
  return <div className="st-live-score-hero st-fx-hero" data-event={event?.kind}>
    <BallCelebration event={event} />
    <div className="st-live-team">
      <TeamLogo name={batting} size={56} />
      <div>
        <span data-tip={`${batting} are batting`}>{batting}<small>{inningsTitle(inning)}</small></span>
        <strong><CountUp value={inning.runs} /><i>/{inning.wickets}</i> <small>{oversText(inning.legal_balls)} ov</small></strong>
      </div>
    </div>
    <div className="st-latest-delivery" aria-live="polite">
      <small>Latest delivery</small>
      <b ref={chip} data-kind={event?.kind}>{centre}</b>
    </div>
    <div className="st-live-rates">
      <div><span data-tip="Current run rate">CRR <b>{runRate(inning.runs, inning.legal_balls)}</b></span>{needed != null && remaining > 0 && <span data-tip="Required run rate">RRR <b>{runRate(needed, remaining)}</b></span>}</div>
      <p>{needed != null ? `${needed} runs needed in ${remaining} balls` : `${remaining} balls remaining · ${inning.overs ?? data.fixture.overs} overs`}</p>
      <small className="st-vs-line">vs <TeamLogo name={bowling} size={18} /> {bowling}</small>
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

function Probability({ inning, fixture, batting, bowling }) {
  const [view, setView] = useState('percent')
  const p = winProbability(inning, fixture)
  if (!p) return null
  const other = 100 - p.batting
  return <section className="st-detail-panel st-fx-card st-probability">
    <div className="st-live-section-title"><h2>Probability</h2><SegToggle label="Probability view" value={view} onChange={setView} options={[['percent', '% View'], ['number', 'Number View']]} /></div>
    <div className="st-prob-row">
      <span><TeamLogo name={batting} size={22} /> {batting}<b>{view === 'percent' ? <CountUp value={p.batting} suffix="%" /> : <CountUp value={p.batting / 100} decimals={2} suffix="x" />}</b></span>
      <span>{bowling} <TeamLogo name={bowling} size={22} /><b>{view === 'percent' ? <CountUp value={other} suffix="%" /> : <CountUp value={other / 100} decimals={2} suffix="x" />}</b></span>
    </div>
    <AnimatedBar percent={p.batting} />
    <p className="st-live-note">Estimate from run rate and wickets in hand{p.chase ? '' : ' against a par score'}. Updates every ball.</p>
  </section>
}

function FeedItem({ item }) {
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
  const maxBalls = (inning.overs ?? f.overs ?? 0) * 6
  const remaining = Math.max(0, maxBalls - inning.legal_balls)
  const rate = Number(runRate(inning.runs, inning.legal_balls))
  return <div className="st-cricket-live-layout"><div className="st-live-main">
    <section className="st-detail-panel st-crease-panel st-fx-card">
      <div className="st-live-section-title"><h2>At the crease</h2><span><Activity size={14} /> Live innings</span></div>
      <div className="st-active-players">
        {batters.map(row => <div className="st-active-player" key={idOf(row.player)}><PlayerAvatar id={idOf(row.player)} team={batting} /><div><small>{idOf(row.player) === idOf(inning.striker) ? 'On strike' : 'Non-striker'}</small><PlayerName player={players.get(idOf(row.player))} /><p><b><CountUp value={row.runs ?? 0} /></b> <span>({row.balls ?? 0})</span></p><small>{row.fours ?? 0} fours · {row.sixes ?? 0} sixes</small><small>SR {strikeRate(row.runs ?? 0, row.balls ?? 0)}</small></div></div>)}
        {bowler && <div className="st-active-player st-current-bowler"><PlayerAvatar id={idOf(bowler.player)} team={bowling} /><div><small>Bowling</small><PlayerName player={players.get(idOf(bowler.player))} /><p><b>{bowler.wickets}–{bowler.runs}</b> <span>({oversText(bowler.balls)})</span></p><small>Economy {runRate(bowler.runs, bowler.balls)}</small></div></div>}
      </div>
      {stand && <div className="st-partnership"><span>Partnership</span><strong>{stand.runs} <small>({stand.balls} balls)</small></strong></div>}
      {inning.free_hit && <div className="st-chase-line">Free hit · next delivery</div>}
      {inning.powerplay && <div className="st-chase-line">Powerplay in progress</div>}
      <OverStrip inning={inning} />
    </section>
    <Commentary feed={live?.feed ?? []} />
    <section className="st-detail-panel st-fx-card st-innings-snapshot"><div className="st-live-section-title"><h2>Innings snapshot</h2><span>{inningsTitle(inning)}</span></div><div className="st-snapshot-grid"><div><small>Boundaries</small><strong>{(inning.batting ?? []).reduce((n, row) => n + (row.fours ?? 0), 0)} <span>fours</span> · {(inning.batting ?? []).reduce((n, row) => n + (row.sixes ?? 0), 0)} <span>sixes</span></strong></div><div><small>Extras</small><strong>{inning.extras?.total ?? 0}</strong><p>Wd {inning.extras?.wides ?? 0} · Nb {inning.extras?.no_balls ?? 0} · B {inning.extras?.byes ?? 0} · Lb {inning.extras?.leg_byes ?? 0}</p></div></div>{inning.fall_of_wickets?.length > 0 && <div className="st-fall-row"><small>Fall of wickets</small>{inning.fall_of_wickets.map(row => <span key={row.wicket_no}><b>{row.runs}/{row.wicket_no}</b> · {oversText(row.balls)} ov</span>)}</div>}</section>
  </div><aside className="st-live-sidebar">
    <Probability inning={inning} fixture={f} batting={batting} bowling={bowling} />
    <section className="st-detail-panel st-fx-card st-progress-panel"><div className="st-live-section-title"><h2>Innings progress</h2><Clock3 size={18} /></div><div className="st-progress-value"><strong>{oversText(inning.legal_balls)}</strong><span>/ {inning.overs ?? f.overs} overs</span></div><AnimatedBar percent={Math.min(100, (inning.legal_balls / (maxBalls || 1)) * 100)} /><div className="st-detail-row"><span>Balls bowled</span><strong>{inning.legal_balls}</strong></div><div className="st-detail-row"><span>Balls remaining</span><strong>{remaining}</strong></div><div className="st-detail-row"><span>Current run rate</span><strong>{runRate(inning.runs, inning.legal_balls)}</strong></div></section>
    {inning.target == null && Number.isFinite(rate) && inning.legal_balls > 0 && <section className="st-detail-panel st-fx-card"><div className="st-live-section-title"><h2>Projected score</h2><ArrowUpRight size={18} /></div><p className="st-live-note">Estimate if the run rate stays constant.</p><div className="st-projection-grid">{[rate, Math.max(0, rate - 1), rate + 1].map((r, index) => <div key={index}><small>{r.toFixed(2)} RR{index === 0 ? ' · current' : ''}</small><strong>{Math.round(inning.runs + r * remaining / 6)}</strong></div>)}</div></section>}
    <section className="st-detail-panel st-fx-card"><h2>Match details</h2><div className="st-detail-row"><span>Format</span><strong>{f.overs} overs</strong></div><div className="st-detail-row"><span>Scheduled</span><strong>{formatDate(f.scheduled_at)}</strong></div><div className="st-detail-row"><span>Bowling side</span><strong>{bowling}</strong></div></section>
  </aside></div>
}
