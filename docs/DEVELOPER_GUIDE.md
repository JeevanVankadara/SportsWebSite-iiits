# IIITS Sports: developer guide

How this project is built and the rules we follow, so that everyone adds features the same way.
Badminton is the finished example; section 8 is a step-by-step checklist for adding the next sport (e.g. cricket).

**Read first:** sections 1–4 (what it is, running it, where things are).
**Before writing backend code:** section 5. **Before writing frontend code:** section 7.
**Adding a sport:** sections 6 and 8.

Related: [docs/badminton-coordinator/README.md](badminton-coordinator/README.md) and [docs/cricket-coordinator/README.md](cricket-coordinator/README.md): what a referee can do in each sport, screen by screen.

---

## 1. What the app is

A website for college tournaments (inter-UG now, inter-club later) that shows live scores to students.
It has three areas, each with its own sign-in and its own code folder:

| Area | Who | URL | Status |
|---|---|---|---|
| **Admin** | Sports admin | Secret path, `/control-room` by default | Built: tournaments, houses, sports, badminton and cricket fixtures, points tables, result corrections |
| **Co-ordinator** | Referees (players picked by the admin for a fixture) | `/coordinator` | Built for badminton (match order, slips, live scoring) and cricket (squads, toss, ball-by-ball scoring, super over) |
| **Users** | Students | `/` | Placeholder page; live scores come later |

Players register once at `/register` (name, college email, roll number, username, password). The same account is used when a player is made a referee.

---

## 2. Tech stack

| Part | What | Version | Notes |
|---|---|---|---|
| Backend | Node.js + Express | Express 5 | `async` handlers can simply `throw`; Express 5 passes the error on |
| Database | MongoDB + Mongoose | Mongoose 9 | Local MongoDB or Atlas |
| Auth | JWT (`jsonwebtoken`), `bcryptjs` | | Separate tokens for admin and co-ordinator |
| Security | `helmet`, `cors`, `express-rate-limit` | | Sign-in is rate limited |
| Frontend | React + Vite | React 19, Vite 8 | Plain CSS, no UI library |
| Routing | React Router | 7 | v8 needs Node 22.22+; moving later is a version bump |
| Fonts | `@fontsource/bebas-neue`, `@fontsource-variable/inter` | | Only loaded by the co-ordinator area |

Node: 20.19+ or 22.12+ (Vite 8's requirement).

---

## 3. Running it locally

### 3.1 First time

1. Install MongoDB locally (or use an Atlas connection string).
2. Backend settings: copy `Backend/.env.example` to `Backend/.env` and fill it in:

   | Variable | Needed | Meaning |
   |---|---|---|
   | `MONGODB_URI` | yes | e.g. `mongodb://127.0.0.1:27017/iiits_sports` |
   | `JWT_SECRET` | yes | At least 32 random characters (the example file shows a command to make one) |
   | `PORT` | no | Default `4000` |
   | `JWT_EXPIRES_IN` | no | How long a sign-in lasts, default `1d` |
   | `CLIENT_ORIGIN` | no | Frontend address(es) allowed to call the API, default `http://localhost:5173` |
   | `TRUST_PROXY` | no | `true` behind Nginx / Render / Railway |

3. Frontend settings (optional): `Frontend/.env.example` → `Frontend/.env`.

   | Variable | Meaning |
   |---|---|
   | `VITE_API_URL` | Backend address. Leave empty locally: Vite forwards `/api` to `http://localhost:4000` (`vite.config.js`). |
   | `VITE_ADMIN_PATH` | The admin's secret path, default `/control-room`. It is hidden, not secret (it ends up in the JS bundle); the password is the real protection. |

4. Install packages in both folders: `npm install` inside `Backend/` and inside `Frontend/`.
5. Create the first admin (asks for a username and password; run again to reset a password):
   ```bash
   npm --prefix Backend run seed:admin
   ```

**Never commit `.env` files.** The root `.gitignore` already ignores them; only the `.env.example` files are committed.

### 3.2 Every day

```bash
npm --prefix Backend run dev
```
```bash
npm --prefix Frontend run dev
```

- Always start the backend with **`npm run dev`** (`node --watch`). Plain `node server.js` does not reload on changes, and you will be testing old code without noticing.
- Open http://localhost:5173. Admin: http://localhost:5173/control-room. Co-ordinator: http://localhost:5173/coordinator.
- To try it on a phone on the same Wi-Fi: `npm --prefix Frontend run dev -- --host` and open the Network URL it prints. This works because of the Vite proxy (keep `VITE_API_URL` empty).
- On startup the backend adds the predefined sports (Cricket, Badminton) if missing, and turns old "upcoming" tournaments into "live" ones.

### 3.3 Trying the whole badminton flow

1. Register 5–6 players at `/register`.
2. Admin: create a tournament with Badminton ticked and at least two houses.
3. Admin: open the tournament → **Badminton** → **Add fixture**; pick two houses and one of the players as referee.
4. Sign in as that player at `/coordinator` → open the fixture → match order → both slips → play.
5. Admin: watch the fixture and the **Points table** tab update.

The admin and co-ordinator sessions are stored separately, so you can be signed in to both in the same browser.

---

## 4. Project layout

```
Backend/
  server.js                      app setup: middleware, route mounting, DB connect, startup tasks
  src/
    config/        db.js, env.js (reads and checks .env)
    middleware/    auth.js (tokens, requireAdmin, requireCoordinator), errorHandler.js
    models/        Admin, Player, Tournament (+ embedded houses), Game, Rules, schemaOptions
      sports/<sport>/            one folder per sport: its collections and constants
    services/      business logic, no Express objects (req/res) in here
      player.service.js          shared player search
      <sport>/                   rules, validators, and the logic of that sport
    controllers/   turn an HTTP request into a service call and a JSON answer, split by who calls them:
      admin/                     admin actions (+ admin/<sport>/)
      co-ordinators/             referee actions (+ co-ordinators/<sport>/)
      user/                      public reads and player sign-up (+ user/<sport>/)
      tournament.controller.js, game.controller.js   (common: public reads + admin writes)
    routes/        URL -> middleware -> controller (+ routes/<sport>/)
    scripts/       one-off command-line scripts (seedAdmin.js)
    utils/         httpError.js, validation.js (shared request checks)

Frontend/src/
  main.jsx, App.jsx              entry and top-level routes (admin and co-ordinator areas are lazy-loaded)
  config.js                      API_URL, ADMIN_PATH / adminPath(), COORDINATOR_PATH / coordinatorPath()
  index.css                      global tokens, buttons, forms, sign-in pages, toast
  api/        client.js (sessions + fetch wrapper), endpoints.js (every API call, grouped by area)
  auth/       AuthProvider, RequireAuth, useAuth (shared by admin and co-ordinator)
  hooks/      useResource (load data for a key)
  components/ shared UI: Alert, PageLoader, PasswordInput, Toast
  utils/      dates.js (date formatting)
  sports/<sport>/format.js       labels and rules of a sport shared by admin and co-ordinator screens
  pages/      public pages: Home, Register, NotFound
  admin/      admin area: AdminApp (routes), layout, pages/, components/, admin.css
    sports/<sport>/              the admin screens of one sport
  coordinator/  co-ordinator area: CoordinatorApp (routes), layout, pages/, components/, coordinator.css
    sports/<sport>/              the referee screens of one sport

docs/                            this guide and per-sport docs
```

**Import rule:** `admin/` and `coordinator/` never import from each other. Anything both need goes in a shared folder
(`api/`, `auth/`, `hooks/`, `components/`, `utils/`, `sports/<sport>/`).

---

## 5. Backend in detail

### 5.1 How a request flows

```
HTTP request
  → server.js: helmet, cors, express.json({ limit: '100kb' })
  → routes/…            picks the controller; adds requireAdmin / requireCoordinator where needed
  → middleware/auth.js  checks the token, sets req.admin or req.player
  → controllers/…       reads req, checks input (validators), calls services
  → services/…          business rules, database reads and writes
  → models/…            Mongoose schemas (field rules, indexes)
  ← res.json({ … })     or a thrown HttpError → middleware/errorHandler.js → { message } with a status
```

### 5.2 Conventions (please keep them)

| Topic | Rule |
|---|---|
| Field names | `snake_case` everywhere (`tournament_name`, `team1_players`), same in the API and the database |
| Ids | Mongo `_id` is the id (`tournament_id` in the design = `_id`) |
| Timestamps | Every schema uses `schemaOptions`: `created_at` / `updated_at`, and no `__v` in responses |
| Responses | Wrapped by name: `{ tournament }`, `{ tournaments }`, `{ fixture, matches }`. Delete answers `204` with no body |
| Errors | `throw new HttpError(status, 'Message a person can act on')`. The client shows `message` as is, so write it for the admin or referee, not for developers |
| Status codes | `400` bad input, `401` not signed in, `403` wrong role, `404` not found (also for things the user may not see), `409` not allowed in the current state |
| Input checks | Reuse `utils/validation.js` (`requireText`, `optionalDate`, `optionalIdList`, `ensureAllExist`, `findByIdOr404`, `saveUnique`) and the sport's `validators.js` |
| Partial updates | `PATCH` only changes fields that were sent (`undefined` = not sent, `null` = clear) |
| Business logic | Lives in `services/`, never in controllers or routes. Controllers stay short |
| Derived numbers | **Recalculate from the source data, never add/subtract counters.** E.g. a fixture's matches won are rebuilt from its matches, and a player's played/won are recounted. Then corrections can never leave numbers wrong |
| Comments | Explain *why* or a rule, not what the next line does. Match the style of the file you are in |
| Time | The fixture date/time is for announcements only. Never block or allow anything based on time |

### 5.3 Sign-in and roles

| Role | Token role | Signs in at | Guard | Sets |
|---|---|---|---|---|
| Admin | `admin` | `POST /api/admin/login` | `requireAdmin` | `req.admin` |
| Co-ordinator | `coordinator` | `POST /api/coordinator/login` (player username + password) | `requireCoordinator` | `req.player` |

- Tokens are JWT (HS256) signed with `JWT_SECRET`, valid for `JWT_EXPIRES_IN`, sent as `Authorization: Bearer <token>`.
- Failed sign-ins are limited to 10 per 15 minutes per IP (successful ones do not count). Player sign-up allows 100 per 15 minutes, because the whole campus shares one IP.
- **Reads that students will need are public** (`GET` tournaments, games, fixtures, points table). Writes need a role.
- A co-ordinator may only touch fixtures where they are in `referees`, and only until the fixture is over. See `controllers/co-ordinators/badminton/access.js` (`refereeFixture`, `ensureOpen`). Other fixtures answer `404`.

### 5.4 Shared data model

| Collection | Model file | Fields | Notes |
|---|---|---|---|
| `admins` | `models/Admin.js` | `username`, `password_hash` | Created only by `seed:admin` |
| `players` | `models/Player.js` | `name`, `email`, `roll_number`, `username`, `password_hash`, `sports.<sport>` | Unique email, roll number, username. `sports.badminton = { played, won }` |
| `tournaments` | `models/Tournament.js` | `tournament_name`, `games[]` → Game, `houses[] { _id, house_name }`, `status` (`live` / `completed`), `start_date`, `end_date` | Houses are **embedded**: they belong to one tournament. Max 30, names unique within the tournament |
| `games` | `models/Game.js` | `game_name`, `rules` → Rules | Only `PREDEFINED_GAMES` (Cricket, Badminton) are offered |
| `rules` | `models/Rules.js` | `set_of_rules[]` | Kept for later sport details |

Passwords are hashed with bcrypt (cost 12) and never returned (`select: false` + `toJSON` removes them).

### 5.5 Common API

| Method & path | Who | Does |
|---|---|---|
| `POST /api/admin/login`, `GET /api/admin/me` | public / admin | Admin sign-in |
| `GET /api/tournaments[?status=live]`, `GET /api/tournaments/:id` | public | Tournaments with sports |
| `POST`, `PATCH /:id`, `DELETE /:id` `/api/tournaments` | admin | Manage tournaments (body: `tournament_name`, `status`, dates, `games`, `houses`) |
| `GET /api/games` | public | The predefined sports |
| `POST /api/players/register` | public | Player sign-up |
| `GET /api/players?search=` | admin | Find players (to pick referees) |
| `POST /api/coordinator/login`, `GET /api/coordinator/me`, `GET /api/coordinator/players?search=` | public / co-ordinator | Co-ordinator sign-in and player search |

Deleting a tournament also deletes its badminton fixtures. Removing a house or a sport from a tournament is refused while fixtures use it (`assertTournamentEditAllowed`).

---

## 6. Badminton: the reference implementation

### 6.1 Terms

| Word | Meaning | Collection |
|---|---|---|
| **Fixture** | House vs house (`team1` vs `team2`), with referees | `badminton_fixtures` |
| **Match** | One singles or doubles match inside a fixture (usually 5) | `badminton_matches` |
| **Set** | One set of a match (1 or 3 per match) | `badminton_sets` |
| **Match order** | Type, sets and points of each match, set by the referee before play | fields on matches |
| **Slip** | A house's list of players for every match, entered by the referee | `team1_players` / `team2_players` |
| **Lineup locked** | Both slips submitted; play can start | `fixture.lineup_locked_at` |
| **Clinched** | A house can no longer be caught, so remaining matches are not played | `status: not_played` |

### 6.2 Why three collections

Each set is a small document, so a live score change only updates that tiny document. Matches and sets can be queried directly (e.g. all matches of a player). The fixture keeps a summary (`match_count`, `matches[]` with type and sets count, matches won) so lists do not need to load every set.

```
Tournament ── houses[] ──┐
                         │ team1 / team2 = house _id
BadmintonFixture ────────┘ referees[] → Player
  └─ BadmintonMatch (match_no, type, sets_count, points_to_win, point_cap, team1_players[], team2_players[])
       └─ BadmintonSet (set_no, team1_points, team2_points, status, winner)
```

### 6.3 Status of each piece

| Piece | Statuses | Moves when |
|---|---|---|
| Fixture | `scheduled` → `live` → `completed` | First match starts → a house clinches, all matches are played, or the fixture is abandoned |
| Match | `pending` → `live` → `completed`, or `not_played` | Start match → Finish / Abandon; `not_played` when the fixture was already decided |
| Set | `live` → `completed` | Next set / Finish match / Abandon closes it |

`result_type` (`normal` / `abandoned`) plus a required `note` records a referee's decision on a match or the whole fixture. A match `winner` of `null` on a completed match means it was declared a draw.

### 6.4 Where each rule lives

| File | Contains |
|---|---|
| `models/sports/badminton/constants.js` | All option lists: match types, 1/3 sets, 21/15/11 points, caps (21→30, 15→21, 11→15), statuses, table points (win 2, draw 1) |
| `services/badminton/rules.js` | **Pure functions**, no database: `setWinner`, `invalidSetScore`, `setsToWin`, `fixtureOutcome`, `playersPerSide` |
| `services/badminton/validators.js` | Checks request bodies and turns them into clean values: `parsePlan`, `parseSlip`, `parseScoreChange`, `parseSetScore`, `parseAbandonDecision`, `validateMatchResult`, `validateFixtureDecision` |
| `services/badminton/fixture.service.js` | `saveMatchOrder`, `recomputeFixture`, admin result entry and clearing, fixture decisions, cascade delete, tournament-edit guard, `loadFixtureDetail` |
| `services/badminton/lineup.service.js` | `saveSlip` (slips and the lineup lock) |
| `services/badminton/scoring.service.js` | Live scoring: `startMatch`, `changeScore`, `startNextSet`, `finishMatch`, `abandonMatch`, `editSetScore` |
| `services/badminton/standings.service.js` | `computeStandings` (points table) |
| `services/badminton/playerStats.service.js` | `refreshPlayerStats` (recounts `players.sports.badminton`) |

### 6.5 Patterns to copy

1. **Pure rules, then validators, then services.** Scoring rules never touch the database, so they are easy to reason about and reuse (the frontend mirrors `setWinner` in `sports/badminton/format.js` for instant feedback; the server always decides).
2. **Recompute, don't increment.** After any change to a match, `recomputeFixture(fixture)` rebuilds matches won, status and result from the matches, marks matches `not_played` (or re-opens them after a correction), and saves. `refreshPlayerStats(players)` recounts played/won from completed matches.
3. **Clinch rule** (`fixtureOutcome`): a house has won when `its wins > other's wins + matches left`. Equal wins with nothing left = draw.
4. **The set in play has no stored winner.** Whether it is won is worked out from its score. It is only closed when the referee taps Next set / Finish match, so a wrong point can still be fixed with − or ✎.
5. **No double counting.** A `+`/`−` request carries the score the referee's screen showed (`expected`). The update is a conditional `findOneAndUpdate` on that exact score; if it changed meanwhile, the server answers `409` and the screen reloads.
6. **Validate everything before writing anything.** E.g. `saveSlip` checks every line of the slip before saving any match, and a match result is checked by `validateMatchResult` before `recordMatchResult` replaces its sets. When several documents must change, write them in an order where a failure leaves nothing half-done.
7. **Every referee action answers with the whole fixture** (`{ fixture, matches, tournament }`), and the page simply replaces what it shows. No client-side score maths to get out of sync.

### 6.6 Points table

Worked out on every request from completed fixtures (`computeStandings`), so it always matches the latest results.

| Column | Formula |
|---|---|
| P / W / D / L | Completed fixtures played / won / drawn / lost |
| Pts | W × 2 + D × 1 |
| MD | Matches won − matches lost |
| SD | Sets won − sets lost |
| PD | Rally points scored − conceded (all sets, including cut-short sets of abandoned matches) |

Ranking: Pts, then **if exactly two houses are level, their head-to-head result**, then MD, SD, PD, then name.
The head-to-head check is applied again after every step (as in BWF team events).

### 6.7 Badminton API

Public (`/api/badminton`): `GET /tournaments/:tournamentId/fixtures`, `GET /tournaments/:tournamentId/standings`, `GET /fixtures/:id`.

Admin (`/api/badminton`):

| Method & path | Body |
|---|---|
| `POST /tournaments/:tournamentId/fixtures` | `{ team1, team2, referees: [playerId], scheduled_at }` |
| `PATCH /fixtures/:id` | same fields (houses only while `scheduled`) |
| `DELETE /fixtures/:id` | deletes the fixture, its matches and sets, recounts players |
| `PUT /fixtures/:id/decision` | `{ result_type: 'abandoned', result: 'team1' \| 'team2' \| 'draw', note }` or `{ result_type: 'normal' }` |
| `PUT /matches/:id/result` | `{ result_type, sets: [{ team1_points, team2_points }], winner, note }` (enter or correct) |
| `DELETE /matches/:id/result` | clear the last finished match |

Co-ordinator (`/api/coordinator/badminton`): see [the co-ordinator README](badminton-coordinator/README.md#6-api-apicoordinator).

---

## 7. Frontend in detail

### 7.1 Areas and routes

`App.jsx` has four entries. The admin and co-ordinator areas are **lazy-loaded**, so students never download their code:

| Path | Component | Contains |
|---|---|---|
| `/` , `/register` | `pages/` | Home, player sign-up |
| `ADMIN_PATH/*` | `admin/AdminApp.jsx` | `''` sign-in, `dashboard`, `tournaments/new`, `tournaments/:id`, `tournaments/:id/edit`, `tournaments/:id/sports/:gameId/*` |
| `/coordinator/*` | `coordinator/CoordinatorApp.jsx` | `''` sign-in, `games`, `badminton/:fixtureId` |

Build paths with `adminPath('…')` and `coordinatorPath('…')` from `config.js`, never by hand.

Per sport, the admin's `pages/SportPage.jsx` hands over to that sport's routes (`admin/sports/badminton/BadmintonRoutes.jsx`: home with Fixtures / Points table tabs, `fixtures/new`, `fixtures/:fixtureId`, `fixtures/:fixtureId/edit`).

### 7.2 Talking to the API

- `api/client.js`: `createSession(storageKey)` gives `{ getToken, setToken, setUnauthorizedHandler, request }`.
  There are two: `adminSession` and `coordinatorSession`. `request()` adds the token, turns failures into `ApiError(status, message)`, and signs the user out on `401`.
- `api/endpoints.js`: **every** API call lives here, grouped by area (`tournamentsApi`, `badmintonApi`, `coordinatorBadmintonApi`, …). Components never call `fetch` directly.

### 7.3 Sign-in

`auth/AuthProvider.jsx` takes a `session` and an `auth` object (`login → { token, user }`, `me → user`) and provides `useAuth()`:
`{ status: 'checking' | 'signed-in' | 'signed-out', user, signIn, signOut }`. Wrap protected routes in `<RequireAuth signInPath={…}>`.

### 7.4 Loading and changing data

- Load with `useResource(key, load)` from `hooks/useResource.js`: returns `{ data, error, setData, retry }`. `data` is `null` while loading.
  Show `<PageLoader />` while loading and an error block with **Try again** on failure.
- After a change, **use the server's answer** to update the screen (`setData(response)`), instead of changing local copies by hand.
- On the referee page, all actions go through one `run(action)` helper: it disables buttons while busy, replaces the data with the answer, shows errors in a `<Toast>`, and reloads on `409`.

### 7.5 React rules (checked by `npm run lint`)

The lint config includes the React Compiler rules. The ones you will meet, and the pattern we use:

| Rule | Pattern |
|---|---|
| No `setState` directly inside `useEffect` | Set state only in the `.then()` / callback of the async work; use `useResource` |
| Ignore results after unmount | `let ignore = false … return () => { ignore = true }` in effects |
| Effect needs the latest callback without re-running | `useEffectEvent` (see `components/Toast.jsx`, `hooks/useResource.js`) |
| Reset a form when switching item | Give it a `key` (`<FixtureForm key={fixtureId ?? 'new'} />`) instead of syncing state in an effect |
| No components created during render | Choose a component with a plain `if`, not from a lookup table built at render time |
| A file that exports components exports only components | Put contexts and hooks in a separate `.js` file (`authContext.js`, `badmintonContext.js`) |

### 7.6 Styling

- **Plain CSS, mobile first.** Base styles are for phones; `@media (min-width: …)` adds the desktop layout.
- Inputs use 16px text (stops iPhones zooming in), and buttons are at least 36–44px high (56px for score buttons).
- **Admin**: light, blue theme. Tokens in `index.css` (`--blue-*`, `--color-*`), admin layout in `admin/admin.css`, sport screens in `admin/sports/<sport>/badminton.css`.
- **Co-ordinator**: dark scoreboard theme inspired by the IIT Bombay Gymkhana sports site. Everything is scoped under `.co-app` in `coordinator/coordinator.css` (tokens `--co-*`, classes `co-*`); sport screens in `coordinator/sports/<sport>/*.css`. Headings use Bebas Neue (`.co-display`), labels use `.co-eyebrow` (`§ 01 — …`).
- Reuse existing classes before adding new ones; new class names follow the file's prefix (`co-…` in the co-ordinator area).

---

## 8. Adding a new sport (checklist)

Example: **Cricket**. Replace `cricket` / `Cricket` with your sport. Keep every sport in its own folders; never put cricket code in a badminton file.

### 8.1 Design first

Write `docs/<sport>-coordinator/README.md` like the badminton one: terms, what the referee does step by step, what is saved where, how the table is calculated (for cricket: NRR), and open questions. Agree on it before coding.

### 8.2 Backend

1. **Sport list**: make sure the name is in `PREDEFINED_GAMES` (`models/Game.js`). Cricket already is.
2. **Models**: `models/sports/cricket/` with `constants.js` and one file per collection (`CricketFixture.js`, …). Use `schemaOptions`, `snake_case`, and collection names `cricket_*` (third argument of `mongoose.model`). Fixtures reference `tournament`, `team1` / `team2` (house ids) and `referees` → Player.
3. **Player history**: add `cricket: { type: <record schema>, default: () => ({}) }` under `sports` in `models/Player.js`, plus a `services/cricket/playerStats.service.js` that **recounts** it.
4. **Services** in `services/cricket/`:
   - `rules.js`: pure scoring functions (no database).
   - `validators.js`: `parse…` functions for every request body.
   - `fixture.service.js`: `loadFixtureDetail`, `recomputeFixture` (rebuild from source), `deleteFixtures`, `assertTournamentEditAllowed`.
   - `scoring.service.js`, `standings.service.js`: the live flow and the points table.
5. **Controllers**:
   - `controllers/admin/cricket/`: create / edit / delete fixtures, result corrections.
   - `controllers/user/cricket/`: public reads (fixtures, one fixture, table).
   - `controllers/co-ordinators/cricket/`: `access.js` (copy the badminton one: referee check + `ensureOpen`) and the referee actions.
6. **Routes**: `routes/cricket/cricket.routes.js` (public + admin, mount at `/api/cricket`) and `routes/cricket/coordinator.routes.js` (mount at `/api/coordinator/cricket`, `router.use(requireCoordinator)`). Mount both in `server.js`.
7. **Tournament hooks** in `controllers/tournament.controller.js`: call cricket's `assertTournamentEditAllowed` next to the badminton one, and its `deleteFixtures({ tournament })` when a tournament is deleted.

### 8.3 Frontend

8. **API**: add `cricketApi` and `coordinatorCricketApi` to `api/endpoints.js`.
9. **Shared helpers**: `sports/cricket/format.js` (labels, options, rules mirror used by both areas).
10. **Admin screens**: `admin/sports/cricket/` with a `CricketRoutes.jsx` (copy the badminton structure), then add the branch in `admin/pages/SportPage.jsx`:
    ```jsx
    if (sport?.game_name.toLowerCase() === 'cricket') {
      return <CricketRoutes tournament={tournament} sport={sport} />
    }
    ```
11. **Co-ordinator screens**: `coordinator/sports/cricket/` with `CricketAssignments.jsx` (the home-page section) and `CricketFixturePage.jsx`. Then:
    - add `<CricketAssignments sectionNumber="03" />` in `coordinator/pages/GamesPage.jsx`;
    - add `<Route path="cricket/:fixtureId" element={<CricketFixturePage />} />` in `coordinator/CoordinatorApp.jsx`.
12. **Styles**: one CSS file per sport folder, using the area's tokens (`--co-*` for co-ordinator).

### 8.4 Before you open a pull request

- `npm --prefix Frontend run lint` and `npm --prefix Frontend run build` pass.
- Backend files parse: `node --check <file>` (or just start `npm run dev` and watch for errors).
- Walk through the full flow once (section 3.3 for your sport), on a phone-width window too.
- No `.env`, no secrets, no `node_modules`, no `dist` in the commit.
- Update your sport's README if the behaviour changed.

---

## 9. Glossary

| Word | Meaning |
|---|---|
| House | A team inside one tournament (e.g. UG-1). Stored inside the tournament |
| Referee / co-ordinator | A player assigned to a fixture who runs it from `/coordinator` |
| Fixture | One house against another in a sport |
| Slip | The paper list of players a house hands to the referee |
| Clinch | One house can no longer be caught; remaining matches are not played |
| Abandoned | Stopped early and decided by the referee with a note (winner or draw) |
| MD / SD / PD | Match, set and points difference (badminton's tie-breakers) |
