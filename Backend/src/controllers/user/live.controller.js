import { Tournament } from '../../models/Tournament.js';
import { HttpError } from '../../utils/httpError.js';
import { isObjectId } from '../../utils/validation.js';
import { fixtureListQuery as badmintonList } from './badminton/badminton.controller.js';
import { fixtureListQuery as cricketList } from './cricket/cricket.controller.js';
import { fixtureListQuery as footballList } from './football/football.controller.js';
import { fixtureListQuery as kabaddiList } from './kabaddi/kabaddi.controller.js';
import { fixtureListQuery as volleyballList } from './volleyball/volleyball.controller.js';

// Each sport's fixture list query, by the sport's route name. Also used for friendly matches.
export const FIXTURE_LISTS = { cricket: cricketList, football: footballList, badminton: badmintonList, kabaddi: kabaddiList, volleyball: volleyballList };
const MAX_KNOWN = 100;

// GET /api/live/fixtures?known=id1,id2 — the home page's once-a-minute refresh of its live cards.
// Returns every live fixture of every sport, plus the current state of the `known` fixtures (the
// ones the page shows as live), so a match that has just finished is updated too. Each fixture has
// the same fields as the sport's fixture list, plus `sport` and `tournamentId`.
export async function liveFixtures(req, res) {
  const raw = typeof req.query.known === 'string' && req.query.known ? req.query.known.split(',') : [];
  if (raw.length > MAX_KNOWN) throw new HttpError(400, `At most ${MAX_KNOWN} known fixtures`);
  const known = raw.filter((id) => isObjectId(id));
  const filter = known.length ? { $or: [{ status: 'live' }, { _id: { $in: known } }] } : { status: 'live' };
  // Friendly matches are shown to the super admin only, not on the public site.
  filter.tournament = { $nin: await Tournament.distinct('_id', { is_friendly: true }) };

  const lists = await Promise.all(
    Object.entries(FIXTURE_LISTS).map(async ([sport, query]) =>
      (await query(filter)).map((fixture) => ({
        ...fixture.toJSON(),
        sport,
        tournamentId: String(fixture.tournament),
      })),
    ),
  );
  res.json({ fixtures: lists.flat() });
}
