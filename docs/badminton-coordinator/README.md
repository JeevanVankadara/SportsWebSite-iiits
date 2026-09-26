# Badminton co-ordinator (referee) dashboard

What a badminton co-ordinator can see and do after the admin creates a fixture, as built.

---

## 1. Who is a co-ordinator

| Point | Rule |
|---|---|
| Account | A co-ordinator is a normal **player account** (registered at `/register`). There is no separate co-ordinator sign-up and no general player sign-in. |
| Becoming one | The admin adds the player as a **referee** when creating or editing a fixture (`fixture.referees`). |
| Sign-in | At `/coordinator`, with their player username and password. The home page links to it. |
| Scope | A co-ordinator can open **only the fixtures they referee**. Other fixtures answer "not found". |
| Several referees | A fixture can have several referees. **Any** of them can do every step below. |
| Timing | The fixture's date and time is only an announcement. Nothing in the app checks it. |
| After the fixture | While a fixture is going on, its referees can change anything in it. **Once it is over, it is read-only for them**; only the admin can correct it. |

---

## 2. Co-ordinator home (`/coordinator/games`)

One section per sport the co-ordinator has fixtures in (Badminton now; each new sport adds its own section).
The Badminton section shows Live / Upcoming / Completed counts and a card for every fixture they referee:
tournament, `House 1 vs House 2`, matches won, status and announced time. A card opens the fixture.

---

## 3. Running a fixture (`/coordinator/badminton/:fixtureId`)

The page shows a scoreboard (matches won) and three steps: **Match order → Slips → Play**.

### Step 1: Match order

For each match, in playing order:

| Field | Options | Stored in |
|---|---|---|
| Type | Singles / Doubles | `match.type` |
| Sets | 1 set / best of 3 | `match.sets_count` |
| Points per set | 21 / 15 / 11 | `match.points_to_win`, `match.point_cap` (30 / 21 / 15) |

- Default order: S, S, D, S, D, best of 3 to 21. Between 1 and 9 matches.
- Saving creates the `badminton_matches` documents and the summary in `fixture.matches`.
- Matches that have not started can be changed, added or removed at any time. Started matches cannot.

### Step 2: Slips

- One slip per house (tabs). For each match the referee picks the players by **username, name or roll number**: 1 per house for singles, 2 for doubles.
- **Save draft** keeps a partly filled slip. **Submit slip** needs every match filled in.
- When **both** slips are submitted, `fixture.lineup_locked_at` is set and play can start.
- The referee can still correct a slip afterwards ("Correct the slips"). If players of a finished match change, their played/won records are recounted.
- The app does not stop a player from appearing for both houses; the referees take care of that.

### Step 3: Play

Matches are played **in slip order**. The next match shows its players and a **Start match N** button.

The scoring screen for the match in play:

```
 § NOW PLAYING
 MATCH 2 · SINGLES                                SET 2 of 3
 ┌──────────────────────┐   ┌──────────────────────┐
 │ UG-1                 │   │ UG-4                 │
 │ R. Kumar             │   │ A. Singh             │
 │         18           │   │         16           │
 │   [ − ]   [  +  ]    │   │   [ − ]   [  +  ]    │
 │   Sets won 1         │   │   Sets won 0         │
 └──────────────────────┘   └──────────────────────┘
  S1 21–15 ✎   S2 18–16 ✎
```

- **+ / −** beside each house change the score of the set in play by one.
- **✎** opens a small form to type the correct score of any set of the match, for miscalculations.
- When a score wins the set (e.g. 21–17, 22–20, or 30–29 at the cap), **+** stops for that set and a banner appears:
  - `UG-1 wins set 2` → **Next set** closes the set and opens the next one.
  - `UG-1 wins the match` → **Finish match** closes the match.
  Until the button is tapped, **−** or **✎** can still fix the set.
- Set rules:

  | Points per set | Set won at | Cap (next point wins) |
  |---|---|---|
  | 21 | 21+ with a 2-point lead | 30 (at 29–29) |
  | 15 | 15+ with a 2-point lead | 21 (at 20–20) |
  | 11 | 11+ with a 2-point lead | 15 (at 14–14) |

- Every tap sends the score the screen showed. If another referee changed it in the meantime, the tap is refused and the screen reloads, so a rally is never counted twice.
- Scores of finished matches can be corrected from **All matches** (✎) while the fixture is going on. A finished match must still have a winner after the change; the result, fixture score, points table and player records follow.
- The service (who serves) is not tracked.

### End of the fixture

- The fixture ends when a house can no longer be caught (e.g. 3–0, 3–1, or 3 wins in the first 4 matches). Remaining matches become **not played**.
- If every match is played and the wins are equal (possible only with a drawn abandoned match), the fixture is a **draw**.
- The points table updates automatically: win 2, draw 1, loss 0; ties broken by head-to-head, match difference, set difference, points difference.
- The page then shows **Full time** with the result and becomes read-only for the referee.

---

## 4. Abandoning

| What | How | Effect |
|---|---|---|
| A match | **Abandon match** on the match in play, or **Abandon (e.g. walkover)** on the next match. Choose `House 1 wins` / `House 2 wins` / `Draw` and write a note (required). | The match is saved as abandoned with that decision. Points already played stay and count in points difference. The fixture continues. |
| The whole fixture | **Abandon the whole fixture**, same decision and note. | Unfinished matches become not played, the fixture closes with that result and the table updates. |

---

## 5. Who can do what

| Action | Co-ordinator (referee of that fixture) | Admin |
|---|---|---|
| Create / edit / delete a fixture, assign referees | ✗ | ✓ |
| Match order, slips, lineup corrections | ✓ while the fixture is going on | ✗ |
| Start matches, + / −, ✎, Next set, Finish match | ✓ while the fixture is going on | ✗ |
| Abandon a match or the fixture | ✓ while the fixture is going on | ✓ |
| Correct results after the fixture is over | ✗ | ✓ |

---

## 6. API (`/api/coordinator`)

All routes need a co-ordinator token and only work on fixtures the player referees; changes stop once the fixture is over.

| Method & path | Does |
|---|---|
| `POST /login`, `GET /me` | Sign in with a player account |
| `GET /players?search=` | Find players for the slips |
| `GET /badminton/fixtures` | My badminton fixtures |
| `GET /badminton/fixtures/:id` | Fixture, matches with players and sets, tournament |
| `PUT /badminton/fixtures/:id/order` | `{ plan: [{ type, sets_count, points_to_win }] }` |
| `PUT /badminton/fixtures/:id/slips/:team` | `{ lineup: [{ match, players }], submit }` |
| `PUT /badminton/fixtures/:id/decision` | Abandon the fixture: `{ result_type: 'abandoned', result, note }` |
| `POST /badminton/matches/:id/start` | Start the next match |
| `POST /badminton/matches/:id/score` | `{ team, change: 1 \| -1, expected: { team1_points, team2_points } }` |
| `POST /badminton/matches/:id/next-set` | Close the won set, open the next |
| `POST /badminton/matches/:id/finish` | Close the last set and the match |
| `POST /badminton/matches/:id/abandon` | `{ winner: 'team1' \| 'team2' \| 'draw', note }` |
| `PUT /badminton/sets/:id` | ✎ `{ team1_points, team2_points }` |

Code: `Backend/src/controllers/co-ordinators/badminton/`, `Backend/src/routes/badminton/coordinator.routes.js`,
`Backend/src/services/badminton/` (`scoring.service.js`, `lineup.service.js`), and `Frontend/src/coordinator/sports/badminton/`.

---

## 7. Later

- Live scores for students (the student page will read the same data).
