import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'
import { securityHeaders } from '../security-policy.mjs'

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' })
const originalFetch = globalThis.fetch
try {
  const { snapshot, build, isCorrection, ballKind } = await server.ssrLoadModule('/src/viewer/liveFeed.js')
  const { createSession, publicRequest } = await server.ssrLoadModule('/src/api/client.js')
  const fixture = { team1_players: [{ _id: 'a', name: 'A Batter' }, { _id: 'b', name: 'B Batter' }], team2_players: [{ _id: 'c', name: 'C Bowler' }] }
  const base = { _id: 'i', status: 'live', runs: 49, wickets: 0, legal_balls: 2, ball_count: 2, this_over_no: 1, this_over: ['1', '0'], striker: 'a', bowler: 'c', batting: [{ player: 'a', runs: 49, balls: 20 }], fall_of_wickets: [] }
  const snap = inning => snapshot({ fixture }, inning)
  await test('a scored boundary and milestone are distinct ordered events; duplicates do not replay', () => {
    const next = { ...base, runs: 53, legal_balls: 3, ball_count: 3, this_over: ['1', '0', '4'], batting: [{ player: 'a', runs: 53, balls: 21 }] }
    assert.deepEqual(build(snap(base), snap(next), next).map(event => event.kind), ['four', 'milestone'])
    assert.equal(build(snap(next), snap(next), next).length, 0)
  })
  await test('six, wicket, and extras labels map to their correct event', () => {
    for (const [label, kind] of [['6', 'six'], ['4', 'four'], ['W', 'wicket'], ['1 W', 'wicket'], ['wd+2', 'wide'], ['nb+4', 'noball'], ['4lb', 'run']]) assert.equal(ballKind(label), kind)
  })
  await test('undo and corrected tokens do not create celebrations', () => {
    const undo = { ...base, legal_balls: 1, ball_count: 1, this_over: ['1'] }
    assert.equal(isCorrection(snap(base), snap(undo)), true)
    assert.deepEqual(build(snap(base), snap(undo), undo), [])
    assert.equal(isCorrection(snap(base), snap({ ...base, this_over: ['1', '6'] })), true)
  })
  await test('a final delivery and a non-striker milestone survive snapshot changes', () => {
    const final = { ...base, status: 'completed', runs: 55, legal_balls: 3, ball_count: 3, this_over: ['1', '0', '6'], striker: 'b', batting: [{ player: 'a', runs: 55, balls: 21 }] }
    assert.deepEqual(build(snap(base), snap(final), final).map(event => event.kind), ['six', 'milestone'])
  })
  await test('missing overs are acknowledged without fabricating a complete over', () => {
    const next = { ...base, this_over_no: 3, this_over: ['6'], legal_balls: 13, ball_count: 13 }
    const events = build(snap(base), snap(next), next)
    assert.ok(events.some(event => event.kind === 'sync'))
    assert.ok(!events.some(event => event.kind === 'over-end'))
  })
  await test('public reads omit credentials, disable caching and reject invalid destinations', async () => {
    let options
    globalThis.fetch = async (_url, value) => { options = value; return Response.json({ ok: true }) }
    await publicRequest('/api/tournaments')
    assert.equal(options.credentials, 'omit')
    assert.equal(options.redirect, 'error')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.headers?.Authorization, undefined)
    await assert.rejects(publicRequest('https://untrusted.example/api/'), /Invalid API request/)
  })
  await test('HTML and disconnected responses fail safely', async () => {
    globalThis.fetch = async () => new Response('<html>proxy error</html>')
    await assert.rejects(publicRequest('/api/tournaments'), /unreadable response/)
    globalThis.fetch = async () => { throw new TypeError('Network failure') }
    const session = createSession('test-session')
    await assert.rejects(session.request('/api/score', { method: 'POST', body: { runs: 4 } }), /whether your change was saved/)
  })
  await test('a delayed unauthorized response cannot clear a newer login', async () => {
    const session = createSession('test-session')
    session.setToken('old')
    let finish
    globalThis.fetch = () => new Promise(resolve => { finish = resolve })
    const request = session.request('/api/admin/me')
    session.setToken('new')
    finish(Response.json({ message: 'Expired' }, { status: 401 }))
    await assert.rejects(request, /Expired/)
    assert.equal(session.getToken(), 'new')
    globalThis.fetch = async () => Response.json({ message: 'Expired' }, { status: 401 })
    await assert.rejects(session.request('/api/admin/me'), /Expired/)
    assert.equal(session.getToken(), null)
  })
  await test('production CSP excludes executable inline code and untrusted API origins', () => {
    const headers = securityHeaders('https://scores.example/api')
    assert.match(headers['Content-Security-Policy'], /script-src 'self';/)
    assert.match(headers['Content-Security-Policy'], /connect-src 'self' https:\/\/scores.example;/)
    assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/)
    assert.equal(headers['X-Content-Type-Options'], 'nosniff')
    assert.throws(() => securityHeaders('https://scores.example/\n;script-src *'), /HTTP/)
    assert.throws(() => securityHeaders('http://scores.example'), /HTTPS/)
    assert.throws(() => securityHeaders('https://user:pass@scores.example'), /credentials/)
  })
} finally {
  globalThis.fetch = originalFetch
  await server.close()
}
