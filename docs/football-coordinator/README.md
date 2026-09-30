# Football co-ordinator (referee) dashboard

What a football co-ordinator can see and do after the admin creates a fixture, as built.
Sign-in, access and "who is a co-ordinator" work exactly as for badminton: see [the badminton README](../badminton-coordinator/README.md#1-who-is-a-co-ordinator).

---

## 1. Terms

| Word | Meaning | Where |
|---|---|---|
| **Fixture** | One football match, house vs house, with referees | `football_fixtures` |
| **Match settings** | Players per side, max substitutes, half length, extra-time half length | `config` |
| **Lineup (slip)** | A house's starters (exactly the players per side) and bench (up to the max substitutes) | `team1_lineup`, `team2_lineup` |
| **Clock** | Current period, elapsed seconds, running or paused, stoppage time | `clock` |
| **Event** | A goal, yellow card, red card or substitution, with its minute and period | `events[]` |

```
Tournament ── houses[] ──┐
FootballFixture ─────────┘  referees[], config, clock,
                             team1/2_lineup { starters[], bench[] } → Player,
                             events[] (score and player stats are rebuilt from these after every change)
```

---

## 2. Running a fixture (`/coordinator/football/:fixtureId`)

Steps: **Match settings → Lineups → Match center**, then read-only once it is over.

### Match settings
- Players per side (default 8), max substitutes (default 5), half length (default 20 minutes) and extra-time half length (0 = no extra time).
- Can be changed until kick-off. Once a lineup is submitted, the squad size must still fit it (change the lineup first).
- **Rolling substitutions** on: a player taken off can come back on. Off: once off, they stay off.

### Lineups
- One tab per house. Pick exactly the players-per-side starters and up to the max substitutes, by **username**, name or roll number.
- A player can be named only once in the whole fixture: players already picked for either house are hidden from the search, and the server refuses a clash.
- Lineups lock once both houses have submitted. They can still be corrected from **Correct the lineups** during the match.

### Match center
- **Clock:** kick off, pause, resume, add stoppage time, adjust the time, and move to the next period
  (1st half → half time → 2nd half → extra time, if set → full time). The match cannot start until both lineups are in.
  The clock stops at each break and starts again with the next half; it cannot be resumed during a break.
- **Quick actions** (after kick-off): goal (regular, penalty or own goal, with an optional assist), yellow card, red card, substitution.
  - Goals are picked by the house they count for. For an own goal, the scorer is chosen from the other house.
  - A new goal or assist must come from a player on the pitch; a substitution swaps a player on the pitch for one on the bench.
  - A player sent off (red card or second yellow) cannot get another card or come back on.
  - Each event records the minute and period; events can be edited or deleted until the match is over. An edited event keeps its period.
- The score is always recalculated from the goal events.
- **Finish match** closes the fixture. After that only the admin can change it.

### Abandoning
**Abandon the match** at the bottom asks who gets the match (either house or a draw) and a note, then closes the fixture.
Only the admin can change it after that. If the admin removes the decision, a match stopped before full time reopens where it stopped (clock paused); one that reached full time is decided by the goals again.

---

## 3. Player records

`sports.football = { played, won, goals, yellow_cards, red_cards }`, rebuilt from completed fixtures. Starters and substitutes who came on count as played; unused substitutes do not. Own goals do not count as goals.

---

## 4. Points table

Win 3, draw 1, loss 0 (`TABLE_POINTS` in `models/sports/football/constants.js`).
