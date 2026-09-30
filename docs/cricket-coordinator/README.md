# Cricket co-ordinator (referee) dashboard

What a cricket co-ordinator can see and do after the admin creates a fixture, as built.
Sign-in, access and "who is a co-ordinator" work exactly as for badminton: see [the badminton README](../badminton-coordinator/README.md#1-who-is-a-co-ordinator).

Related: [live-updates-sse.md](live-updates-sse.md), notes for showing live scores to students later.

---

## 1. Terms

| Word | Meaning | Collection |
|---|---|---|
| **Fixture** | One cricket match, house vs house, with referees | `cricket_fixtures` |
| **Innings** | One side batting: innings 1 and 2, then 3 & 4 for a super over, 5 & 6 for a second one | `cricket_innings` |
| **Ball** | One delivery. The source every total is rebuilt from | `cricket_balls` |
| **Playing XI** | Exactly 11 players per house; they bat, bowl and field | `teamN_players` |
| **Substitutes** | Up to 3 per house; they can only field (catches, run outs) | `teamN_substitutes` |

```
Tournament ── houses[] ──┐
CricketFixture ──────────┘  referees[], team1/2_players[], team1/2_substitutes[] → Player
  └─ CricketInnings  (live crease state + scorecard, rebuilt from the balls after every change)
       └─ CricketBall (kind, runs, wicket, and who was at the crease before it: what Undo restores)
```

---

## 2. Running a fixture (`/coordinator/cricket/:fixtureId`)

Steps: **Setup → Toss → Play**, then read-only once it is over.

### Setup
- Overs per innings (1–50) and powerplay overs (0 to the overs).
- Each house's playing XI (exactly 11) and up to 3 substitutes, picked by **username**, name or roll number.
- A player can be named only once in the whole fixture. Players already picked are hidden from the search, and the server refuses a clash: *"Ravi (@ravi) is named more than once. A player can play for one house only."*
- It can be saved part-filled. The toss needs 11 on both sides. Squads lock when the first innings starts.

### Toss
Who won it and whether they bat or bowl. It decides who bats first; it can change until play starts.

### Play (tabs: Live | Scorecard)
Pick the striker, non-striker and bowler, then score ball by ball:

| Tap | Counts |
|---|---|
| 0 1 2 3 4 6 | Runs off the bat |
| Wide → Wd, Wd+1 … Wd+4 | 1 wide + the runs taken, all extras, charged to the bowler, not a ball faced |
| No ball → NB, NB+1 … NB+6, runs off the bat / byes / leg byes | 1 no-ball + the runs; a ball faced; **next ball is a free hit** |
| Bye / Leg bye → 1–4 | Extras; not charged to the bowler |
| Wicket | Bowled, caught, lbw, stumped, hit wicket, run out (who, and runs completed) |

- Each extra can also carry a wicket on the same ball: stumped, hit wicket or run out off a wide; only run out off a no-ball, bye or leg bye.
- **Free hit:** stays on through wides and no-balls; only run out is allowed.
- Batters cross on odd runs and change ends after the over. After a catch, the new batter takes strike. **Swap strike** fixes anything unusual.
- After a wicket the **New batter** list opens (players yet to bat). A batter who has not been part of a ball yet can be changed.
- After each over the **Bowler** list opens, showing each bowler's overs, runs and wickets. The bowler of the last over is greyed out: nobody bowls two overs in a row (the server refuses it too). There is no limit on overs per bowler.
- **Undo** takes back the last ball, up to 2 in a row, including the batters, bowler and free hit as they were.
- When the innings is over (overs done, all out at 10 wickets, or target reached) a banner shows **End innings** / **Finish match**. Until it is tapped, Undo still works.
- Two referees tapping the same ball cannot count it twice: every ball carries the ball count the screen showed.

### Tie and super over
- Scores level after both innings: **Start super over** or **Finish as tie** (1 point each).
- In a super over the side that batted second bats first; 1 over, and the innings stops at **2 wickets**. The screen has an amber frame and shows wickets left and balls left.
- Level again: another super over, or finish as a tie.

### Abandoning
**Abandon the match**: the referee chooses a house or **No result** and writes a note. The fixture closes; the admin can remove the decision.

---

## 3. Points table and net run rate

Worked out on every request from completed fixtures (`services/cricket/standings.service.js`).

| Column | Rule |
|---|---|
| Pts | Win 2, tie 1, no result 1, loss 0. A super-over win is a win |
| NRR | (runs scored × 6 / balls faced) − (runs conceded × 6 / balls bowled), over all matches |

- Overs are counted in balls, so 12.3 overs is 12.5 overs.
- A side bowled out counts its full quota of overs (all out for 45 in 6.3 of 10 overs = 45 in 10 overs).
- Super overs and abandoned matches give points but are left out of NRR.
- Ranking: points, then NRR, then head-to-head when exactly two houses are level, then name.

Example (10 overs): UG-1 82/5 in 10 overs; UG-2 83/4 in 8.2 overs (50 balls). UG-2: 83×6/50 − 82/10 = **+1.760**; UG-1: **−1.760**.

---

## 4. API (`/api/coordinator/cricket`)

Every action answers with `{ fixture, innings, tournament }`.

| Method & path | Body |
|---|---|
| `GET /fixtures`, `GET /fixtures/:id` | |
| `PUT /fixtures/:id/setup` | `{ overs, powerplay_overs, team1: { players, substitutes }, team2: { … } }` |
| `PUT /fixtures/:id/toss` | `{ winner: 'team1' \| 'team2', decision: 'bat' \| 'bowl' }` |
| `POST /fixtures/:id/innings` | `{ striker, non_striker, bowler }`: next innings or super over |
| `POST /fixtures/:id/accept-tie` | |
| `PUT /fixtures/:id/decision` | `{ result_type: 'abandoned', result: 'team1' \| 'team2' \| 'no_result', note }` |
| `POST /innings/:id/balls` | `{ expected_balls, kind, runs, nb_runs_as?, wicket?: { kind, player_out?, fielder? } }` |
| `POST /innings/:id/undo` | `{ expected_balls }` |
| `PUT /innings/:id/batter`, `PUT /innings/:id/bowler` | `{ player, slot? }` / `{ player }` |
| `POST /innings/:id/swap-strike`, `POST /innings/:id/end` | |

`kind` is `run`, `wide`, `no_ball`, `bye` or `leg_bye`. `runs` never includes the 1-run wide or no-ball penalty.

Public and admin (`/api/cricket`): `GET /tournaments/:id/fixtures`, `GET /tournaments/:id/standings`, `GET /fixtures/:id`; admin `POST /tournaments/:id/fixtures`, `PATCH` / `DELETE /fixtures/:id`, `PUT /fixtures/:id/decision`.

Code: `Backend/src/{models,services,controllers/*,routes}/…/cricket/`, `Frontend/src/{admin,coordinator}/sports/cricket/`, `Frontend/src/sports/cricket/format.js`.
