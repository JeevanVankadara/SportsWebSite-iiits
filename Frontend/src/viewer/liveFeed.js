import { useEffect, useState } from 'react'
import { deliveryValue, overNumber } from './cricketLiveData.js'
import { houseName } from './data.js'

const idOf = item => String(item?._id ?? item ?? '')
export const liveInning = data => data?.detail?.innings?.find(row => row.status === 'live')
export const shortName = (name = '') => {
  const parts = String(name).trim().split(/\s+/)
  return parts.length > 1 ? `${parts[0][0]} ${parts.slice(1).join(' ')}` : name
}
function playerMap(fixture) {
  return new Map(['team1', 'team2'].flatMap(team => [...(fixture[`${team}_players`] ?? []), ...(fixture[`${team}_substitutes`] ?? [])]).map(player => [idOf(player), player]))
}
const pick = (list, seed) => list[Math.abs(seed) % list.length]
export function ballKind(token) {
  const text = String(token)
  if (/W\s*$/.test(text)) return 'wicket'
  if (text.startsWith('wd')) return 'wide'
  if (text.startsWith('nb')) return 'noball'
  if (text === '6') return 'six'
  if (text === '4') return 'four'
  if (text === '0') return 'dot'
  return 'run'
}
const WORD = { six: 'SIX!', four: 'FOUR!', wicket: 'OUT!', wide: 'WIDE', noball: 'NO BALL', dot: 'DOT', run: '' }
const TEXT = {
  dot: ['{bo} to {ba}, no run. Solid defence back to the bowler.', '{bo} to {ba}, dot ball. Beaten on the outside edge!', '{bo} to {ba}, no run. Good length, gets behind it.'],
  run: ['{bo} to {ba}, {n} run{s}, worked into the gap.', '{bo} to {ba}, {n} run{s}, nudged away and they scamper through.', '{bo} to {ba}, {n} run{s}, placed neatly on the leg side.'],
  four: ['FOUR! {ba} times it beautifully, races away to the rope off {bo}!', 'FOUR! Cracked through the covers by {ba}. No chance for the fielder.', 'FOUR! {ba} pulls it hard, that is a clean strike off {bo}.'],
  six: ['SIX! {ba} launches {bo} high over the ropes. Massive!', 'SIX! Down the ground, that has gone miles. {ba} is in the zone!', 'SIX! {ba} clears the front leg and sends it into the crowd.'],
  wicket: ['OUT! {ba} has to go. {bo} strikes and the celebration begins!', 'WICKET! {bo} gets the breakthrough, {ba} is walking back.', 'OUT! Big moment. {bo} removes {ba}.'],
  wide: ['{bo} sprays it wide of the tramline, extra run.'],
  noball: ['No ball from {bo}! Free hit coming up.'],
}
function textFor(kind, token, names, seed) {
  const n = deliveryValue(token).runs
  return pick(TEXT[kind], seed).replace('{bo}', names.bo).replace('{ba}', names.ba).replace('{n}', n).replace('{s}', n === 1 ? '' : 's')
}
export function snapshot(data, inning) {
  const rows = new Map((inning.batting ?? []).map(row => [idOf(row.player), { ...row }]))
  return { id: idOf(inning), overNo: overNumber(inning), thisOver: [...(inning.this_over ?? [])], striker: idOf(inning.striker), bowler: idOf(inning.bowler), rows, players: playerMap(data.fixture), legal: inning.legal_balls, count: inning.ball_count, runs: inning.runs, wickets: inning.wickets }
}
export function isCorrection(prev, next) {
  return next.legal < prev.legal || next.runs < prev.runs || next.wickets < prev.wickets ||
    (next.count != null && prev.count != null && next.count < prev.count) ||
    (next.overNo === prev.overNo && prev.thisOver.some((token, index) => next.thisOver[index] !== token))
}
let serial = 0
export function build(prev, next, inning) {
  if (isCorrection(prev, next)) return []
  const events = []
  const overAdvanced = next.overNo !== prev.overNo
  const tokens = overAdvanced ? next.thisOver : next.thisOver.slice(prev.thisOver.length)
  // A snapshot does not identify every delivery's participants. Avoid attributing a batch incorrectly.
  const names = tokens.length === 1 && !overAdvanced
    ? { bo: shortName(next.players.get(prev.bowler)?.name ?? 'The bowler'), ba: shortName(next.players.get(prev.striker)?.name ?? 'The batter') }
    : { bo: 'The bowler', ba: 'The batter' }
  let legalBefore = overAdvanced ? 0 : prev.thisOver.filter(t => deliveryValue(t).legal).length
  if (overAdvanced && prev.thisOver.filter(token => deliveryValue(token).legal).length === 6) {
    const total = prev.thisOver.reduce((n, t) => n + deliveryValue(t).runs, 0)
    events.push({ kind: 'over-end', over: prev.overNo, text: `End of over ${prev.overNo}: ${total} run${total === 1 ? '' : 's'}.`, runs: inning.runs, wickets: inning.wickets })
  }
  const missed = next.count != null && prev.count != null ? next.count - prev.count - tokens.length : 0
  if (missed > 0 || next.overNo > prev.overNo + 1) events.push({ kind: 'sync', text: 'Scores refreshed. Some earlier deliveries were not supplied in the latest update.' })
  tokens.forEach(token => {
    const kind = ballKind(token)
    if (deliveryValue(token).legal) legalBefore += 1
    const seed = ++serial
    let out = null
    if (kind === 'wicket') {
      const fall = inning.fall_of_wickets?.at(-1)
      const outId = fall?.player ? idOf(fall.player) : prev.striker
      const row = next.rows.get(outId) ?? {}
      out = { id: outId, name: next.players.get(outId)?.name ?? names.ba, runs: row.runs ?? 0, balls: row.balls ?? 0, fours: row.fours ?? 0, sixes: row.sixes ?? 0, kind: row.dismissal?.kind, bowler: names.bo }
    }
    events.push({ kind, token, over: `${next.overNo - 1}.${legalBefore}`, word: WORD[kind], text: textFor(kind, token, out ? { ...names, ba: shortName(out.name) } : names, seed), out })
  })
  next.rows.forEach((striker, id) => {
    const before = prev.rows.get(id)
    if (before) [50, 100, 150, 200].forEach(mark => {
      if ((before.runs ?? 0) < mark && (striker.runs ?? 0) >= mark) events.push({ kind: 'milestone', mark, over: `${next.overNo - 1}.${legalBefore}`, word: mark === 50 ? 'FIFTY!' : mark === 100 ? 'HUNDRED!' : `${mark}!`, id, name: next.players.get(id)?.name, text: `${shortName(next.players.get(id)?.name)} reaches ${mark} off ${striker.balls ?? 0} balls.`, stats: { runs: striker.runs, balls: striker.balls, fours: striker.fours, sixes: striker.sixes } })
    })
  })
  return events.map(event => ({ ...event, uid: ++serial, at: Date.now() }))
}
function seedFeed(next) {
  const names = { bo: shortName(next.players.get(next.bowler)?.name ?? 'The bowler'), ba: 'the batter' }
  let legal = 0
  return next.thisOver.map((token, index) => {
    if (deliveryValue(token).legal) legal += 1
    const kind = ballKind(token)
    return { uid: ++serial, kind, token, over: `${next.overNo - 1}.${legal}`, word: WORD[kind], text: textFor(kind, token, names, index + next.legal), seeded: true, at: 0 }
  }).reverse()
}

// Ball-by-ball commentary is derived from successive live snapshots; the API supplies no commentary of its own.
export function useLiveFeed(data) {
  const [state, setState] = useState({ seen: null, snap: null, event: null, feed: [] })
  if (data !== state.seen) {
    const inning = liveInning(data) ?? data?.detail?.innings?.at(-1)
    if (!inning) setState({ seen: data, snap: null, event: null, feed: [] })
    else {
      const next = snapshot(data, inning)
      if (!state.snap || state.snap.id !== next.id) setState({ seen: data, snap: next, event: null, feed: seedFeed(next) })
      else if (isCorrection(state.snap, next)) setState({ seen: data, snap: next, event: null, feed: seedFeed(next) })
      else {
        const events = build(state.snap, next, inning)
        const celebrations = events.filter(e => !['over-end', 'sync'].includes(e.kind))
        setState({ seen: data, snap: next, event: celebrations.length ? { ...celebrations.at(-1), sequence: celebrations } : state.event, feed: events.length ? [...[...events].reverse(), ...state.feed].slice(0, 90) : state.feed })
      }
    }
  }
  return { event: state.event, feed: state.feed }
}

// Heuristic estimate: projects the final score from run rate and wickets in hand.
export function winProbability(inning, fixture) {
  if (!inning) return null
  const maxBalls = (inning.overs ?? fixture.overs ?? 0) * 6
  const left = Math.max(0, maxBalls - inning.legal_balls)
  const crr = inning.legal_balls ? inning.runs / (inning.legal_balls / 6) : 6
  const projected = inning.runs + (left / 6) * Math.max(crr, 5) * (0.5 + 0.05 * (10 - inning.wickets))
  const target = inning.target ?? (maxBalls / 6) * 7.5 + 1
  const batting = 1 / (1 + Math.exp(-(projected - target) / (7 + (left / 6) * 1.4)))
  const value = inning.target != null && inning.runs >= inning.target ? 1 : Math.min(0.99, Math.max(0.01, batting))
  return { batting: Math.round(value * 100), chase: inning.target != null }
}

const OUTCOMES = ['0', '0', '0', '1', '1', '1', '1', '2', '3', '4', '4', '4', '6', '6', 'W', 'wd', 'nb']
// Preview mode only: advances the existing demo innings by one delivery so the live UI can be seen moving.
export function advancePreview(data) {
  const next = structuredClone(data)
  const f = next.fixture
  const inning = next.detail.innings.find(row => row.status === 'live')
  if (!inning || f.status !== 'live') return data
  const token = OUTCOMES[Math.floor(Math.random() * OUTCOMES.length)]
  const value = deliveryValue(token)
  const batter = inning.batting.find(row => idOf(row.player) === idOf(inning.striker))
  let bowler = inning.bowling.find(row => idOf(row.player) === idOf(inning.bowler))
  if (!bowler) { bowler = { player: inning.bowler, balls: 0, runs: 0, wickets: 0, maidens: 0 }; inning.bowling.push(bowler) }
  inning.runs += value.runs
  bowler.runs += value.runs
  if (token === 'wd') inning.extras.wides += 1
  else if (token === 'nb') inning.extras.no_balls += 1
  else { inning.legal_balls += 1; bowler.balls += 1; batter.balls += 1; batter.runs += value.runs; if (token === '4') batter.fours += 1; if (token === '6') batter.sixes += 1 }
  inning.extras.total = inning.extras.wides + inning.extras.no_balls + inning.extras.byes + inning.extras.leg_byes
  const swap = () => { [inning.striker, inning.non_striker] = [inning.non_striker, inning.striker] }
  if (token === 'W') {
    inning.wickets += 1; bowler.wickets += 1
    batter.status = 'out'; batter.dismissal = { kind: ['bowled', 'caught', 'lbw'][inning.wickets % 3], bowler: inning.bowler }
    inning.fall_of_wickets.push({ wicket_no: inning.wickets, runs: inning.runs, balls: inning.legal_balls, player: inning.striker })
    const used = new Set(inning.batting.map(row => idOf(row.player)))
    const fresh = (f[`${inning.batting_team}_players`] ?? []).find(player => !used.has(idOf(player)))
    if (fresh) { inning.batting.push({ player: fresh._id, runs: 0, balls: 0, fours: 0, sixes: 0, status: 'batting' }); inning.striker = fresh._id }
  } else if (token !== 'wd' && token !== 'nb' && value.runs % 2 === 1) swap()
  inning.this_over.push(token)
  if (inning.this_over.filter(t => deliveryValue(t).legal).length >= 6) {
    inning.over_history = [...inning.over_history.filter(row => row.number !== inning.this_over_no), { number: inning.this_over_no, balls: inning.this_over }].slice(-8)
    inning.this_over = []
    inning.this_over_no += 1
    swap()
    const pool = f[`${inning.bowling_team}_players`] ?? []
    const index = pool.findIndex(player => idOf(player) === idOf(inning.bowler))
    if (pool.length) inning.bowler = pool[(index + 1) % pool.length]._id
  }
  const summary = f.innings.find(row => row.batting_team === inning.batting_team)
  if (summary) Object.assign(summary, { runs: inning.runs, wickets: inning.wickets, legal_balls: inning.legal_balls })
  return next
}

// Preview mode only: the demo football match scores now and then so the goal animation can be seen.
export function advancePreviewFootball(data) {
  const f = data.fixture
  if (f.status !== 'live') return data
  const next = structuredClone(data)
  const team = Math.random() < .5 ? 'team1' : 'team2'
  next.fixture[`${team}_score`] = (next.fixture[`${team}_score`] ?? 0) + 1
  return next
}

// Goals (football) and match wins (badminton) become a celebration event when the live score goes up.
export function useScoreEvent(data, sport) {
  const [state, setState] = useState({ seen: null, fixtureId: null, key: null, event: null })
  if (data !== state.seen) {
    const f = data?.fixture
    const fixtureId = f ? `${sport}:${idOf(f)}` : null
    let key = null
    if (f && f.status !== 'scheduled' && sport === 'football') key = [f.team1_score ?? 0, f.team2_score ?? 0]
    if (f && f.status !== 'scheduled' && sport === 'badminton') key = [f.team1_matches_won ?? 0, f.team2_matches_won ?? 0]
    const sameFixture = fixtureId === state.fixtureId
    const correction = key && state.key && (key[0] < state.key[0] || key[1] < state.key[1])
    let event = sameFixture && !correction ? state.event : null
    if (sameFixture && !correction && key && state.key && (key[0] > state.key[0] || key[1] > state.key[1])) {
      const team = key[0] > state.key[0] ? 'team1' : 'team2'
      // eslint-disable-next-line react-hooks/purity -- timestamp only orders preview-triggered events against real ones
      event = { uid: ++serial, at: Date.now(), kind: sport === 'football' ? 'goal' : 'point', word: sport === 'football' ? 'GOAL!' : 'SMASH!', team: houseName(data.tournament, f[team]) }
    }
    setState({ seen: data, fixtureId, key, event })
  }
  return state.event
}

export function usePreviewTicker(base, enabled, advance = advancePreview, intervalMs = 4200) {
  const [state, setState] = useState({ base, data: base })
  const current = state.base === base ? state.data : base
  useEffect(() => {
    if (!enabled || !base) return
    const timer = window.setInterval(() => setState(prev => ({ base, data: advance(prev.base === base ? prev.data : base) })), intervalMs)
    return () => window.clearInterval(timer)
  }, [base, enabled, advance, intervalMs])
  return enabled ? current : base
}
