// Badminton scoring rules. Pure functions, shared by result entry now and live scoring later.

// Sets needed to win a match: 1 of 1, or 2 of 3.
export function setsToWin(setsCount) {
  return Math.floor(setsCount / 2) + 1;
}

// 'team1' or 'team2' once the score finishes the set, otherwise null.
// A set ends when a side reaches the target with a 2-point lead, or reaches the cap.
export function setWinner(team1Points, team2Points, pointsToWin, pointCap) {
  const high = Math.max(team1Points, team2Points);
  const finished = high === pointCap || (high >= pointsToWin && Math.abs(team1Points - team2Points) >= 2);
  if (!finished) return null;
  return team1Points > team2Points ? 'team1' : 'team2';
}

// Returns why a set score is impossible (e.g. 25-10 in a set to 21), or null if it can happen.
// Unfinished scores such as 15-12 are possible; whether they are allowed is up to the caller.
export function invalidSetScore(team1Points, team2Points, pointsToWin, pointCap) {
  const points = [team1Points, team2Points];
  if (!points.every((value) => Number.isInteger(value) && value >= 0)) {
    return 'Points must be whole numbers, 0 or more';
  }
  if (points.some((value) => value > pointCap)) return `No side can score more than ${pointCap} points`;

  const high = Math.max(...points);
  const low = Math.min(...points);
  const finished = high === pointCap || (high >= pointsToWin && high - low >= 2);
  if (!finished) return null;

  const possible =
    (high === pointsToWin && low <= pointsToWin - 2) || // e.g. 21-15
    (high > pointsToWin && high - low === 2) || // deuce, e.g. 23-21
    (high === pointCap && low === pointCap - 1); // cap, e.g. 30-29
  return possible ? null : `${team1Points}-${team2Points} is not a possible final score in a set to ${pointsToWin}`;
}

// Who has won the fixture so far, or null if it is still open. A house has won once the other
// cannot catch up even by winning every match still to be played (3-0, 3-1, 3-2 in a 5-match fixture).
// Equal wins with nothing left to play is a draw, which is possible when an abandoned match was drawn.
export function fixtureOutcome({ team1Won, team2Won, matchesLeft }) {
  if (team1Won > team2Won + matchesLeft) return 'team1';
  if (team2Won > team1Won + matchesLeft) return 'team2';
  if (matchesLeft === 0) return 'draw';
  return null;
}

// Players each house puts on court: 1 in singles, 2 in doubles.
export function playersPerSide(matchType) {
  return matchType === 'doubles' ? 2 : 1;
}
