# Student site (public live scores): how it should look

What students see at `/`, sport by sport. **Not built yet.** Today `/` is a placeholder with *Register as a player* and *Co-ordinator sign in*; this document is the plan for replacing it.

Everything here is read-only and needs no sign-in. The data already exists: every sport has public read APIs (section 7), used today by the admin screens.

Related: [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) (section 7 for frontend rules), [cricket live updates](../cricket-coordinator/live-updates-sse.md) (how scores will be pushed later), and the referee guides for [badminton](../badminton-coordinator/README.md), [cricket](../cricket-coordinator/README.md) and [football](../football-coordinator/README.md).

---

## 1. Principles

| | |
|---|---|
| **Phone first** | Most students open it on a phone at the ground. Design for 360–430px wide; desktop just gets more columns. |
| **Glanceable** | The score and who is winning must be readable in one second: big numbers, house names, a clear status. |
| **Live first** | Anything live sits at the top of every list. Finished results next, upcoming last. |
| **Same shape for every sport** | Tournament → sport → *Fixtures / Points table* → one fixture. Only the fixture card and fixture page differ per sport. |
| **Nothing private** | Show player **names** only. Never show email or roll number, even though some API answers include them. Usernames are not needed either. |
| **Honest states** | Every screen has a loading, empty, error (*Try again*) and "not started yet" state (section 3.6). |

## 2. Look and feel

Use the **dark scoreboard theme** the co-ordinator area already has (`coordinator/coordinator.css`, inspired by the IIT Bombay Gymkhana sports site): dark navy background, Bebas Neue for team names and scores, Inter for text, blue accent, green for "won", amber for warnings, red for "live".

- Reuse the `--co-*` tokens by moving them to a shared file (for example `src/theme/scoreboard.css`) instead of copying them. The student pages get their own prefix, `st-…`, in the same way the admin uses plain names and the co-ordinator uses `co-…`.
- The admin's light theme stays admin-only.
- Numbers use `font-variant-numeric: tabular-nums` so scores don't jump as they change.
- Live marker: a small pulsing red dot plus the word **LIVE** (never colour alone).
- Winners: house name in the accent colour plus a ✓ or "won" (never colour alone).
- Touch targets at least 44px; no hover-only information.

---

## 3. Pages shared by every sport

### 3.1 Site map

| Path | Page |
|---|---|
| `/` | Home: live now, and the tournaments |
| `/t/:tournamentId` | One tournament: its sports and houses |
| `/t/:tournamentId/:sport` | One sport: **Fixtures** and **Points table** tabs (`?tab=table`) |
| `/t/:tournamentId/:sport/:fixtureId` | One fixture (section 4, 5 or 6) |
| `/register` | Player sign-up (exists) |

`:sport` is the lower-case game name (`badminton`, `cricket`, `football`), so links are readable and shareable.

### 3.2 Header (every page)

```
┌──────────────────────────────────────────────┐
│ [logo] IIITS SPORTS            [Register]    │
│        Campus live scores                    │
└──────────────────────────────────────────────┘
```

- Logo and name go to `/`.
- **Register** goes to `/register`. The co-ordinator sign-in is a small link in the footer, not in the header: students are not referees.
- Below the header, a breadcrumb on inner pages: `Inter-UG › Cricket › Blue vs Red`.

### 3.3 Home `/`

```
LIVE NOW ● 2
┌ Cricket · Inter-UG ─────────────── ● LIVE ┐
│ BLUE HOUSE        124/3 (14.2)            │
│ RED HOUSE         Yet to bat              │
│ Blue chose to bat                         │
└───────────────────────────────────────────┘
┌ Football · Inter-UG ────────── ● 2nd half ┐
│ GREEN   2 – 1   YELLOW            63'     │
└───────────────────────────────────────────┘

TOURNAMENTS
┌ Inter-UG ─────────────────────── Live ────┐
│ 12 Sep – 30 Sep · 4 houses                │
│ [Badminton] [Cricket] [Football]          │
└───────────────────────────────────────────┘
```

- **Live now**: every live fixture across all live tournaments, using each sport's fixture card (sections 4.1, 5.1, 6.1) with the sport and tournament on top. Hidden when nothing is live.
- **Tournaments**: live ones first, then completed. Each card shows the name, dates, number of houses and a chip per sport linking to that sport's page.
- Empty site: *"No tournaments yet. Scores will show up here once the sports admin creates one."*

### 3.4 Tournament `/t/:tournamentId`

- Title, dates, status (Live / Completed).
- One tile per sport: sport name, live count (● 1 live), next fixture time, and the current leader of its points table.
- The houses of the tournament as chips.

### 3.5 Sport `/t/:tournamentId/:sport`

Two tabs, **Fixtures** and **Points table**, the same as the admin's sport page.

**Fixtures tab**: three groups, each with a count: **Live**, **Results** (newest first), **Upcoming** (soonest first; "Time not announced" at the end). Each item is the sport's fixture card, and tapping it opens the fixture page.

**Points table tab**: the sport's table (sections 4.4, 5.4, 6.4) with:
- A short legend under the table for every abbreviation and the points rule (e.g. *Win 3 · Draw 1 · Loss 0*).
- Only the first columns fixed on phones; the rest scroll sideways inside the table, never the page.
- A note when nothing is finished yet: *"The table fills in as fixtures finish."*

### 3.6 States every page needs

| State | Shows |
|---|---|
| Loading | The page skeleton (grey blocks where the cards go), not a blank page |
| Error | *"Couldn't load the scores."* + **Try again** |
| Not found | *"This fixture doesn't exist any more."* + link back to the sport |
| Not started | The fixture page with the teams and time, and *"Not started yet"* where the score goes |
| Abandoned | A banner: *"Abandoned: awarded to Blue House"* (or draw / no result) with the referee's note |
| Removed house | A fixture whose house was removed shows "Removed house" instead of crashing |

### 3.7 Staying up to date

- **Now (no server change):** while a page shows anything live, re-fetch every 10 seconds, and stop when the tab is hidden (`document.visibilityState`). Show "Updated 5 s ago" in small text.
- **Later:** server-sent events as planned in [live-updates-sse.md](../cricket-coordinator/live-updates-sse.md). The pages must not change: they already redraw from the full fixture JSON.

---

## 4. Badminton

A **fixture** is a house against a house, made of several **matches** (singles or doubles, up to 9). Each match is best of 1 or 3 **sets** to 21, 15 or 11 points. The house that wins more matches wins the fixture.

### 4.1 Fixture card

```
┌ Badminton ─────────────────────── ● LIVE ┐
│ BLUE HOUSE     2 – 1     RED HOUSE       │
│                matches                   │
│ Match 4 · Doubles · Set 2: 14 – 11       │
└──────────────────────────────────────────┘
```

| Part | From |
|---|---|
| Houses and matches won | `team1`, `team2`, `team1_matches_won`, `team2_matches_won` |
| Status | `status` (+ `result_type: abandoned`) |
| Live line | The live match: its number, type and the live set's points |
| Finished line | "Blue won 3–2" or "Drawn 2–2" |
| Upcoming line | Date and time, or "Time not announced"; the number of matches once the order is set |

### 4.2 Fixture page

```
§ BADMINTON · INTER-UG
BLUE HOUSE      2 – 1      RED HOUSE
               MATCHES WON
● Live · Referees: Anil, Priya

MATCHES
 1 Singles   A. Rao        21 18 21   ✓
             K. Das        15 21 12
 2 Doubles   S. Iyer / R. Nair   21 19
             M. Joshi / T. Pillai 17 21  … 8   ● live
 3 Singles   Not played yet
```

- **Header**: sport and tournament, the two houses with matches won, status, date and time, referees' names.
- **Matches list**, in `match_no` order. Each match shows:
  - Its number, **Singles/Doubles**, and the format (e.g. "Best of 3 to 21").
  - Each side's player names (both names for doubles).
  - The points of every set, the set winner's number in bold, and a ✓ on the winning side.
  - Status: *Up next*, **● Live** (with the live set highlighted), *Won by Blue*, *Not played* (abandoned fixtures), or *Abandoned* with the note.
- The live match is expanded and scrolled into view; finished matches can be collapsed on phones.
- **Before the slips are in**: the match list with types only and "Players to be announced".

### 4.3 Live details

- Live set: a large `14 – 11` with the set number ("Set 2 of 3").
- Game point / match point is a nice extra later; it can be worked out from `points_to_win` and `point_cap`.

### 4.4 Points table

| Column | Meaning | From |
|---|---|---|
| # | Position | row order |
| House | | `house_name` |
| P W D L | Fixtures played, won, drawn, lost | `played`, `won`, `drawn`, `lost` |
| M | Matches won–lost | `matches_won`, `matches_lost` |
| S | Sets won–lost | `sets_won`, `sets_lost` |
| Pts diff | Points scored minus conceded | `points_scored`, `points_conceded` |
| **Pts** | Table points | `points` |

Legend: *Win 2 · Draw 1 · Loss 0* (`table_points` from the API, don't hard-code it).

---

## 5. Cricket

A **fixture** is one limited-overs match (1–50 overs) between two houses, with a toss, two **innings**, and super overs if it's tied. Results can be a win by runs or wickets, a tie, a super over win, or no result.

### 5.1 Fixture card

```
┌ Cricket · 10 overs ────────────── ● LIVE ┐
│ BLUE HOUSE        124/3 (14.2)           │
│ RED HOUSE         Yet to bat             │
│ Blue need … / Blue chose to bat          │
└──────────────────────────────────────────┘
```

| Part | Shows |
|---|---|
| Each house | Score as `runs/wickets (overs)`, or "Yet to bat" |
| Live line | Chase: "Red need 38 from 29 balls". First innings: the toss ("Blue chose to bat") |
| Finished line | "Blue won by 24 runs" / "by 6 wickets" / "Match tied" / "won the super over" / "No result" |
| Upcoming | Time, or "Time not announced"; the overs once the referee has set them |

### 5.2 Fixture page

Tabs: **Live** (only while live) | **Scorecard** | **Squads**.

**Header**: both houses with their scores (super over scores underneath when played), the result line, the overs and powerplay, the toss, date and referees.

**Live tab**
```
BLUE HOUSE 124/3  (14.2 ov)      CRR 8.65
Target 160 · Need 36 from 34 balls · RRR 6.35

BATTING            R   B   4s  6s   SR
A. Rao *          45  30   5   2   150.0
K. Das            12  10   1   0   120.0

BOWLING            O   M   R   W   Econ
M. Joshi          2.2  0  21   1   9.00

THIS OVER   1  4  Wd  0  W  ·
FREE HIT
```
- Striker marked with `*`.
- **This over** as ball chips: dot, runs, `4`, `6`, `Wd`, `Nb`, `B`, `Lb`, and `W` in red.
- A **FREE HIT** badge when `free_hit` is on.
- CRR always; target, runs needed, balls left and RRR in the chase.
- A powerplay marker while the powerplay overs are running.

**Scorecard tab**: one card per innings, in order (super overs labelled "Super over 1 – Blue"):
- Batting: each batter's dismissal text ("c Das b Joshi", "run out (Nair)", "not out"), R, B, 4s, 6s, SR.
- Extras: `Extras 9 (wd 5, nb 2, b 1, lb 1)`.
- Total: `124/3 (14.2 ov)` and "Did not bat: …".
- Fall of wickets: `1-12 (Rao, 2.3 ov), 2-45 …`.
- Bowling: O, M, R, W, Econ, wides and no balls.
- Powerplay score.

**Squads tab**: each house's playing XI and substitutes (names only).

### 5.3 Special cases to show clearly

| Case | Show |
|---|---|
| Tie → super over | "Match tied · Super over" banner, then super over innings under the main ones |
| No result / abandoned | Banner with the referee's decision and note; the scorecard up to where it stopped |
| Innings over, next not started | "Innings break · Red need 160 to win" |

### 5.4 Points table

| Column | Meaning | From |
|---|---|---|
| # House | | |
| P W L T NR | Played, won, lost, tied, no result | `played`, `won`, `lost`, `tied`, `no_result` |
| **NRR** | Net run rate, 3 decimals with sign (`+1.254`) | `nrr` |
| **Pts** | | `points` |

Legend: *Win 2 · Tie 1 · No result 1 · Loss 0* and *"NRR: runs per over scored minus runs per over conceded. A side bowled out counts its full overs."*

---

## 6. Football

A **fixture** is one match between two houses, with a set number of players per side (e.g. 7-a-side), two halves, optional extra time, and a log of goals, cards and substitutions.

### 6.1 Fixture card

```
┌ Football · 7-a-side ───────── ● 2nd half ┐
│ GREEN HOUSE     2 – 1     YELLOW HOUSE   │
│ 63'                                      │
│ ⚽ Rao 12', Das 55' · ⚽ Iyer 40'          │
└──────────────────────────────────────────┘
```

| Part | From |
|---|---|
| Score | `team1_score`, `team2_score` |
| Period and minute | `clock.period` (1st half, Half time, 2nd half, Extra time, Full time) and the running clock (section 6.3) |
| Scorers | Goal events: "(P)" for penalties, "(OG)" for own goals, listed under the house the goal counts for |
| Finished | "Green won 2–1" / "Draw 1–1" / abandoned banner |

### 6.2 Fixture page

```
§ FOOTBALL · INTER-UG
GREEN HOUSE      2 – 1      YELLOW HOUSE
            ● 2ND HALF · 63:12 +2'

TIMELINE
 12'  ⚽  Rao (Green)              assist: Das
 30'  🟨  Iyer (Yellow)
 40'  ⚽  Iyer (Yellow)            penalty
 HT   ── Half time 1–1 ──
 55'  ⚽  Das (Green)
 58'  🔁  Green: Nair ➔ Pillai
 61'  🟥  Joshi (Yellow)           second yellow

LINEUPS
 GREEN (7)              YELLOW (6 on pitch)
 Rao ⚽                  Iyer ⚽ 🟨
 Das ⚽                  Joshi 🟥
 Pillai ↑58'            …
 Bench: Nair ↓58', …
```

- **Header**: houses and score, the period and clock, stoppage time as `+2'`, the format (7-a-side, 20 min halves), date and referees.
- **Timeline**, in match order: minute, an icon for the event, player and house, and the detail (assist, penalty, own goal, card reason). Show a divider row at half time, the end of normal time and full time, with the score at that point.
- **Lineups**, one column per house:
  - Starters, then the bench.
  - Icons next to each name for goals ⚽, cards 🟨/🟥, and subbed on ↑ / off ↓ with the minute.
  - A house down to fewer players after a red card shows "(6 on pitch)".
- **Before kick-off**: the lineups once both are submitted, otherwise "Lineups to be announced".

### 6.3 The clock

- The clock runs in the browser from `clock.elapsed_seconds` and `clock.resumed_at` (the same sum as `calculateCurrentSeconds` in `src/sports/football/format.js`), so it ticks every second without re-fetching.
- It is paused when `clock.is_running` is false. Show "Half time" or "Paused", not a frozen number with no label.
- Show minutes only on cards (`63'`) and minutes:seconds on the fixture page.

### 6.4 Points table

| Column | Meaning | From |
|---|---|---|
| # House | | |
| P W D L | Played, won, drawn, lost | `played`, `won`, `drawn`, `lost` |
| GF GA GD | Goals for, against, difference | `goals_for`, `goals_against`, `goal_diff` |
| **Pts** | | `points` |

Legend: *Win 3 · Draw 1 · Loss 0*. Houses level on points are split by their match against each other (when exactly two are level), then goal difference, then goals scored.

---

## 7. Data: which API each page uses

All public, no sign-in. `:sport` is `badminton`, `cricket` or `football`.

| Page | Calls |
|---|---|
| Home | `GET /api/tournaments`, then `GET /api/:sport/tournaments/:id/fixtures` for each sport of each live tournament |
| Tournament | `GET /api/tournaments/:id` (houses and sports) |
| Sport → Fixtures | `GET /api/:sport/tournaments/:id/fixtures` |
| Sport → Points table | `GET /api/:sport/tournaments/:id/standings` |
| Fixture | `GET /api/:sport/fixtures/:fixtureId` |

What each fixture answer contains:

| Sport | Answer |
|---|---|
| Badminton | `{ fixture, matches, tournament }`: matches with players and sets |
| Cricket | `{ fixture, innings }`: the scorecard lives in the innings |
| Football | `{ fixture, tournament }`: lineups and events are inside the fixture |

Notes for building:
- House names come from `tournament.houses` (`_id` → `house_name`); fixtures only store the ids.
- Add the calls to a new `publicApi` group in `src/api/endpoints.js`. They use plain `request`, with no session.
- The home page makes many calls. If it gets slow, add one `GET /api/live` that returns every live fixture, instead of doing more work in the browser.
- Before launch, stop the public endpoints sending `roll_number` (the football fixture list includes it for referees today).

## 8. Where the code goes

```
src/pages/                 HomePage.jsx (replaces the placeholder), TournamentPage.jsx, SportPage.jsx
src/public/components/     Header, FixtureGroups, PointsTable shell, LiveDot, StatusBadge, Skeleton
src/public/sports/<sport>/ FixtureCard.jsx, FixturePage.jsx, PointsTable.jsx, <sport>.css
src/sports/<sport>/format.js  shared labels and helpers, already used by admin and co-ordinator
```

- Like the admin and co-ordinator areas, each sport keeps its screens in its own folder. `SportPage` picks the sport's components with a plain `if` on the game name (the same pattern as `admin/pages/SportPage.jsx`).
- A new sport adds a folder here, a fixture card, a fixture page and a table. Nothing else changes.

## 9. Done when

- [ ] Every page works at 360px wide with no sideways page scroll.
- [ ] Every page has loading, empty, error and not-found states.
- [ ] Live fixtures refresh on their own and stop refreshing in a hidden tab.
- [ ] No email or roll number appears anywhere, including in API answers the pages use.
- [ ] Abandoned fixtures show the decision and note in all three sports.
- [ ] The points table legends come from the API's `table_points` where the API sends it.
- [ ] `npm run lint` and `npm run build` pass.
