// Football labels, helpers, and formatters shared across admin and coordinator screens.

export const PERIOD_LABELS = {
  not_started: 'Pre-Match',
  first_half: '1st Half',
  half_time: 'Half Time',
  second_half: '2nd Half',
  extra_time_first_half: 'Extra Time 1H',
  extra_time_half_time: 'ET Break',
  extra_time_second_half: 'Extra Time 2H',
  penalties: 'Penalties',
  completed: 'Full Time',
};

export const EVENT_TYPE_LABELS = {
  goal: 'Goal',
  yellow_card: 'Yellow Card',
  red_card: 'Red Card',
  substitution: 'Sub',
};

export const GOAL_TYPE_LABELS = {
  regular: 'Goal',
  penalty: 'Penalty (P)',
  own_goal: 'Own Goal (OG)',
};

export function houseName(tournament, houseId) {
  return tournament?.houses.find((house) => house._id === houseId)?.house_name ?? 'Removed house';
}

export function fixtureResultText(fixture, team1, team2) {
  if (fixture.status === 'scheduled') return 'Not kicked off';
  if (fixture.status === 'live') {
    return `${team1} ${fixture.team1_score} – ${fixture.team2_score} ${team2} (${PERIOD_LABELS[fixture.clock?.period] || 'Live'})`;
  }
  if (fixture.result === 'draw') return `Draw ${fixture.team1_score} – ${fixture.team2_score}`;
  const winner = fixture.result === 'team1' ? team1 : team2;
  return `${winner} won ${Math.max(fixture.team1_score, fixture.team2_score)} – ${Math.min(fixture.team1_score, fixture.team2_score)}`;
}

/**
 * Calculates current elapsed seconds for the ticking match clock.
 */
export function calculateCurrentSeconds(clock, nowMs = Date.now()) {
  if (!clock) return 0;
  let seconds = clock.elapsed_seconds || 0;
  if (clock.is_running && clock.resumed_at) {
    const diff = Math.max(0, Math.floor((nowMs - new Date(clock.resumed_at).getTime()) / 1000));
    seconds += diff;
  }
  return seconds;
}

/**
 * Formats total seconds into MM:SS.
 */
export function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
