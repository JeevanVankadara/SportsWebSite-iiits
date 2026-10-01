import { Player } from '../../models/Player.js';
import { TEAMS } from '../../models/sports/cricket/constants.js';
import { checkLineupPlayers, playerLabel } from '../guestPlayer.service.js';
import { HttpError } from '../../utils/httpError.js';
import { setupComplete } from './rules.js';

function ensureNotStarted(fixture, message) {
  if (fixture.status !== 'scheduled') throw new HttpError(409, message);
}

// Saves the overs, powerplay and both squads (see parseSetup). A player may appear only once in the
// whole fixture: in one playing XI or as one house's substitute.
export async function saveSetup(fixture, { overs, powerplay_overs: powerplayOvers, squads }) {
  ensureNotStarted(fixture, 'The squads are locked once the first innings starts');

  const named = TEAMS.flatMap((team) => [...squads[team].players, ...squads[team].substitutes]);
  const seen = new Set();
  let repeated = null;
  for (const id of named) {
    if (seen.has(id)) {
      repeated = id;
      break;
    }
    seen.add(id);
  }
  if (repeated) {
    const who = playerLabel(await Player.findById(repeated, 'name username is_guest'));
    throw new HttpError(400, `${who} is named more than once. A player can play for one house only.`);
  }
  await checkLineupPlayers(fixture, named);

  fixture.set({
    overs,
    powerplay_overs: powerplayOvers,
    team1_players: squads.team1.players,
    team1_substitutes: squads.team1.substitutes,
    team2_players: squads.team2.players,
    team2_substitutes: squads.team2.substitutes,
  });
  await fixture.save();
}

export async function saveToss(fixture, toss) {
  ensureNotStarted(fixture, 'The toss cannot change after play has started');
  if (!setupComplete(fixture)) {
    throw new HttpError(409, 'Finish the setup first: the overs and 11 players for each house');
  }
  fixture.toss = toss;
  await fixture.save();
}
