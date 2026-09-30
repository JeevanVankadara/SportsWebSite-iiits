# IIITS Sports viewer

Public, frontend-only viewer for the existing IIITS Sports APIs. The viewer is lazy-loaded from `src/App.jsx`; admin, co-ordinator and registration routes remain available.

## Run

From `Frontend`:

```sh
npm install
npm run dev
npm run lint
npm run verify:viewer
npm run build
```

Open `/` for published data. Development requests use the existing Vite proxy to `http://localhost:4000`. Production can set `VITE_API_URL` and must serve `index.html` for browser routes. For phone testing on the same Wi-Fi, use `npm run dev -- --host`.

Open `/?preview=1` for the clearly labeled design preview. Preview data is illustrative, preserved through viewer navigation, and never substituted automatically when the real API fails.

## Pages

| Route | Content |
| --- | --- |
| `/` | Match centre, live filters, tournaments, upcoming fixtures and illustrated player directory |
| `/fixtures` | All fixtures with status and sport filters |
| `/tournaments` | Tournament directory |
| `/t/:tournamentId` | Sports, houses and fixtures |
| `/t/:tournamentId/:sport` | Fixtures and points table |
| `/t/:tournamentId/:sport/:fixtureId` | Summary, scorecard/timeline/matches and squads |
| `/players` | Searchable college player directory and sport filters |
| `/players/:playerId` | Public participation, status, sport totals and fixture history |
| `/search?q=...` | Match and player search by name, house or sport |

Cricket includes current batters/bowler, batting and bowling tables, extras, fall of wickets, and over summaries. Football includes clock, timeline and squads. Badminton includes singles/doubles players and set scores. Standings retain each sport's own columns.

## Data and refresh

`viewerApi` uses a separate public request helper that never inherits an authenticated token. Viewer statistics derive from published fixture details; the authenticated player-search endpoint is not used. Only player names, house/sport participation and match statistics enter the public player index.

Live match centre and detail screens refresh every 10 seconds while visible. They retain the last successful scores on a refresh failure, prevent overlapping requests and provide retry controls. Loading, unavailable, empty, partial-data and scheduled states are explicit.

Player totals are a snapshot of the published fixtures loaded when the directory opens. They cover available public scorecards; they are not a complete student registry. Cricket super-over totals are excluded from regular player totals. Football own goals do not count as a scorer's goals. Pending/unplayed badminton matches do not count as matches played.

The current API has no public aggregated player endpoint, so the directory fetches fixture details. A future public summary endpoint can replace this work as historical fixture volume grows without changing the UI.

## Design and motion

CREX was inspected before implementation. Its score-first structure, compact navigation, horizontal match rail, filter hierarchy and neutral canvas informed this viewer. The existing institute logo is reused, with original fictional portrait artwork. No CREX logos or proprietary artwork are included.

Spacing uses a 4px rhythm. Typography prefers the system SF Pro font on Apple platforms, with bundled Inter elsewhere. Borders and focus rings use independent 1px/2px widths.

`PlayerPortraitMotion.jsx` uses a lazy-loaded Remotion Player for a short illustrated player entrance and replay control. `animations.jsx` uses Lottie Light for a decorative live pulse. Reduced-motion settings produce static visuals.

The viewer uses native modal search, keyboard-operated tabs, visible focus, labeled controls, a skip link, 44px touch targets and horizontally scrollable score tables. The phone layout uses an expandable navigation menu and a match rail with the next card visible.

## Verification

`scripts/verify-viewer.mjs` checks public-player privacy, sport totals, partial failures, independent standings errors, tournament/fixture consistency, scheduled scores and token isolation against mocked API responses. Browser checks cover desktop and phone layouts, search, profiles, keyboard tabs and all three sports. Live backend integration requires the existing backend and database to be running.

## Design decisions

- Keep live scores ahead of promotional content, following the CREX reference.
- Use status text alongside color and animation so a live state remains legible without motion.
- Keep match cards and standings compact; move dense data into individual match pages.
- Show squad membership as “In live squad,” which does not imply every named player is currently on the field.
- Make preview mode explicit so sample scores cannot be confused with published campus results.
- Load the Remotion portrait entrance separately on player profiles.


## September 30 visual revision

- Neutral light and dark themes with local persistence and a visible navbar switch.
- Floating pill navigation, curved cards and compact line icons.
- Original fictional athlete portrait atlas in `public/illustrations/players-atlas.png`. Six grayscale portraits generated with ImageGen, centered in a 3×2 grid. These are decorative illustrations, not player likenesses; variants do not infer a student’s gender.
- Profiles enter with a 36-frame Remotion animation, lazy loaded only on profile pages. Reduced motion uses the static portrait. The Lottie live indicator is neutral and pauses offscreen or in hidden tabs.
- Cricket live summary includes active batter and bowler figures, CRR, actual over tokens, and chase/RRR when available. Football uses recorded events and match clock. Badminton shows actual participant and set scores. No invented commentary, polls or win probabilities.
- Navigation pattern reference: https://21st.dev/@ayushmxxn/components/tubelight-navbar (Ayushmaan Singh, MIT). Source installation requires a 21st API key, so the floating pill pattern is implemented locally; 21st CLI review was run successfully.
- SF Pro is used when available on the operating system; Inter is the bundled cross-platform fallback.
