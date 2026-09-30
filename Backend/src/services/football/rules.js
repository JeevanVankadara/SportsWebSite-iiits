// Football rules and pure computation functions. No database calls.

/**
 * Calculates current scores from the events list.
 * Note: An own_goal scored by a player of team1 counts as a goal for team2, and vice versa.
 */
export function calculateScore(events = []) {
  let team1Score = 0;
  let team2Score = 0;

  for (const event of events) {
    if (event.type !== 'goal') continue;

    if (event.goal_type === 'own_goal') {
      // Awarded to the opposing side
      if (event.team === 'team1') team2Score += 1;
      else team1Score += 1;
    } else {
      if (event.team === 'team1') team1Score += 1;
      else team2Score += 1;
    }
  }

  return { team1_score: team1Score, team2_score: team2Score };
}

/**
 * Determine winner from scores.
 */
export function determineWinner(team1Score, team2Score) {
  if (team1Score > team2Score) return 'team1';
  if (team2Score > team1Score) return 'team2';
  return 'draw';
}

/**
 * Given a team's lineup (starters & bench) and chronological events,
 * computes the current status of each player: 'on_pitch', 'bench', or 'sent_off'.
 * Without rolling substitutions, a player taken off cannot come back on.
 */
export function computeRosterState(starters = [], bench = [], events = [], team, { rollingSubs = true } = {}) {
  const onPitch = new Set(starters.map((id) => String(id)));
  const onBench = new Set(bench.map((id) => String(id)));
  const sentOff = new Set();

  for (const event of events) {
    if (event.team !== team) continue;

    if (event.type === 'substitution') {
      const outId = event.player_out ? String(event.player_out) : null;
      const inId = event.player_in ? String(event.player_in) : null;

      if (outId && onPitch.has(outId)) {
        onPitch.delete(outId);
        if (rollingSubs) onBench.add(outId);
      }
      if (inId && onBench.has(inId)) {
        onBench.delete(inId);
        onPitch.add(inId);
      }
    } else if (event.type === 'red_card' || (event.type === 'yellow_card' && event.card_type === 'second_yellow')) {
      const playerId = event.player ? String(event.player) : null;
      if (playerId) {
        onPitch.delete(playerId);
        onBench.delete(playerId);
        sentOff.add(playerId);
      }
    }
  }

  return {
    on_pitch: Array.from(onPitch),
    bench: Array.from(onBench),
    sent_off: Array.from(sentOff),
  };
}

/**
 * Returns total yellow and red cards for a specific player from events.
 */
export function countPlayerCards(events = [], playerId) {
  const targetId = String(playerId);
  let yellows = 0;
  let reds = 0;

  for (const event of events) {
    if (event.player && String(event.player) === targetId) {
      if (event.type === 'yellow_card') {
        yellows += 1;
        if (event.card_type === 'second_yellow') reds += 1;
      } else if (event.type === 'red_card') {
        reds += 1;
      }
    }
  }

  return { yellows, reds };
}

/**
 * Calculates current total elapsed seconds from the clock document.
 */
export function computeElapsedSeconds(clock, now = new Date()) {
  if (!clock) return 0;
  let elapsed = clock.elapsed_seconds || 0;
  if (clock.is_running && clock.resumed_at) {
    const diff = Math.max(0, Math.floor((now.getTime() - new Date(clock.resumed_at).getTime()) / 1000));
    elapsed += diff;
  }
  return elapsed;
}
