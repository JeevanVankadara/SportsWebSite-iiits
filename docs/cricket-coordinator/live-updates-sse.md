# Live scores for students: server-sent events (notes for later)

Not built yet. This records how the first cricket prototype (the `Cricket.zip` trial app) pushed live scores,
and how to add the same to this project when the student pages are built.

## How the prototype did it

**Viewer page** (`viewer.html`)
1. Loads the match once: `GET /api/match/:token`.
2. If the match is not over, opens `new EventSource('/sse/:token')` and listens for:
   - `score_update`: the whole match as JSON; the page re-draws everything from it.
   - `match_complete`: the final state; the page re-draws and closes the connection.
3. The browser reconnects by itself if the connection drops.

**Server** (`controllers/sseController.js`)
- Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`,
  `X-Accel-Buffering: no` (stops Nginx buffering), then `res.flushHeaders()`.
- Writes `: connected` at once and `: heartbeat` every 25 s, so proxies do not close an idle connection.
- Keeps `Map<token, Set<res>>` of open connections and removes one on `req.on('close')`.

**After every scoring change** (`matchController.js` → `cacheService.js`)
1. Loads the populated match.
2. `SET match:<token>:state` in Redis for 1 day (the cache behind `GET /api/match/:token`).
3. `PUBLISH match:<token>` with the JSON. One shared Redis subscriber forwards it to that match's open
   connections. It subscribes when the first viewer of a match connects and unsubscribes when the last one leaves.

The public link used a random `shareToken` (uuid) instead of the match id.

## How to add it here

| Point | Plan |
|---|---|
| Route | `GET /api/cricket/fixtures/:id/live` (public). Fixture reads are already public, so no share token is needed |
| Payload | The same JSON as `GET /api/cricket/fixtures/:id`: `{ fixture, innings }`. Always the full state, never a diff, so a reconnect is always correct |
| When to send | After every co-ordinator action. They all end in `refereeDetail(fixture._id)` (`controllers/co-ordinators/cricket/access.js`), which is the one place to publish from |
| Events | `score_update` on every change; `match_complete` when `fixture.status` becomes `completed` |
| Fan-out | Start with an in-process `EventEmitter`. Add Redis pub/sub only when the API runs on more than one server; with one server, Redis adds nothing |
| Caching | Not needed at first: the innings document already holds the rebuilt scorecard, so a read is two small queries |
| Proxies | Keep `X-Accel-Buffering: no` and the 25 s heartbeat. Do not add compression middleware to this route (it buffers the stream) |
| Badminton | The same route shape works: publish after each badminton referee action too |
