import { BadmintonMatch } from '../../models/sports/badminton/BadmintonMatch.js';
import { checkLineupPlayers } from '../guestPlayer.service.js';
import { HttpError } from '../../utils/httpError.js';
import { refreshPlayerStats } from './playerStats.service.js';
import { playersPerSide } from './rules.js';

// Saves one house's slip: the players for each match, as checked by parseSlip.
// With submit, the slip is marked as handed in; once both houses' slips are in, the lineup is locked
// and play can start. The referee can still correct a slip later; if players of a finished match
// change, everyone involved has their played/won record recounted.
export async function saveSlip(fixture, team, { lineup, submit }) {
  const matches = await BadmintonMatch.find({ fixture: fixture._id }).sort({ match_no: 1 });
  if (matches.length === 0) throw new HttpError(409, 'Set the match order before filling in the slips');

  await checkLineupPlayers(fixture, [...new Set(lineup.flatMap((entry) => entry.players))]);

  const field = `${team}_players`;
  const byId = new Map(matches.map((match) => [String(match._id), match]));
  const recount = [];

  for (const entry of lineup) {
    const match = byId.get(entry.match);
    if (!match) throw new HttpError(400, 'A match on the slip is not part of this fixture');
    const size = playersPerSide(match.type);
    if (entry.players.length > size) {
      throw new HttpError(400, `Match ${match.match_no} is ${match.type}: pick at most ${size} player(s) per house`);
    }
    if (match.status === 'completed') recount.push(...match[field], ...entry.players);
    match[field] = entry.players;
  }

  if (submit) {
    const incomplete = matches.find(
      (match) => match.status !== 'not_played' && match[field].length !== playersPerSide(match.type),
    );
    if (incomplete) {
      throw new HttpError(
        400,
        `Match ${incomplete.match_no} needs ${playersPerSide(incomplete.type)} player(s) before the slip can be submitted`,
      );
    }
  }

  await Promise.all(matches.filter((match) => match.isModified()).map((match) => match.save()));

  if (submit) {
    const submittedAt = `slips.${team}_submitted_at`;
    if (!fixture.get(submittedAt)) fixture.set(submittedAt, new Date());
    if (fixture.slips.team1_submitted_at && fixture.slips.team2_submitted_at) {
      fixture.lineup_locked_at ??= new Date();
    }
    await fixture.save();
  }

  if (recount.length > 0) await refreshPlayerStats(recount);
}
