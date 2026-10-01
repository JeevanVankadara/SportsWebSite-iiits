import mongoose from 'mongoose';
import { Player } from '../models/Player.js';
import { HttpError } from '../utils/httpError.js';
import { ensureAllExist } from '../utils/validation.js';

// Guest players: a name a referee adds for one match only, for someone who has no account.
//
// A guest is an ordinary Player document, so lineups, scoring events, stats and live updates keep
// working with player ids as they always have. What makes it "this match only":
//  - is_guest + guest_for { sport, fixture } mark it;
//  - it is left out of player search, so it cannot be picked anywhere else;
//  - a lineup may name a guest only if the guest belongs to that fixture (checkLineupPlayers);
//  - it cannot be a referee, cannot sign in, and is deleted with its fixture.
// The unique email / roll number / username of a Player get reserved placeholder values, which
// registration refuses (isReservedIdentity), so no index changes are needed.

const GUEST_EMAIL_DOMAIN = '@guest.invalid';
const GUEST_ROLL_PREFIX = 'GUEST-';
const GUEST_USERNAME_PREFIX = 'guest_';
// Not a bcrypt hash, so no password can ever match it.
const NO_PASSWORD = '!guest';

export const GUEST_NAME_MAX = 80;

// Registration must not be able to claim the placeholder values guests use.
export function isReservedIdentity({ email, roll_number: rollNumber, username }) {
  return (
    String(email ?? '').toLowerCase().endsWith(GUEST_EMAIL_DOMAIN) ||
    String(rollNumber ?? '').toUpperCase().startsWith(GUEST_ROLL_PREFIX) ||
    String(username ?? '').toLowerCase().startsWith(GUEST_USERNAME_PREFIX)
  );
}

// How to name a player in an error message: guests have no username worth showing.
export function playerLabel(player) {
  if (!player) return 'A player';
  return player.is_guest ? player.name : `${player.name} (@${player.username})`;
}

function guestName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (name.length < 2) throw new HttpError(400, 'Enter the player’s name (at least 2 characters)');
  if (name.length > GUEST_NAME_MAX) throw new HttpError(400, `Name must be ${GUEST_NAME_MAX} characters or fewer`);
  return name;
}

/**
 * Adds a guest for one fixture, or returns the fixture's existing guest with the same name
 * (ignoring case), so adding the same person twice does not make two of them.
 */
export async function createGuest(sport, fixture, rawName) {
  if (fixture.status === 'completed') throw new HttpError(409, 'This match is over');
  const name = guestName(rawName);

  const existing = await Player.findOne(
    { is_guest: true, 'guest_for.fixture': fixture._id, name },
    'name username roll_number is_guest',
  ).collation({ locale: 'en', strength: 2 });
  if (existing) return existing;

  const _id = new mongoose.Types.ObjectId();
  const guest = await Player.create({
    _id,
    name,
    email: `guest.${_id}${GUEST_EMAIL_DOMAIN}`,
    roll_number: `${GUEST_ROLL_PREFIX}${_id}`,
    username: `${GUEST_USERNAME_PREFIX}${_id}`,
    password_hash: NO_PASSWORD,
    is_guest: true,
    guest_for: { sport, fixture: fixture._id },
  });
  return { _id: guest._id, name: guest.name, username: guest.username, roll_number: guest.roll_number, is_guest: true };
}

/**
 * Lineup check for every sport: all the players exist, and any guest among them was added for
 * this very fixture. Replaces a plain ensureAllExist(Player, ids, 'players').
 */
export async function checkLineupPlayers(fixture, ids) {
  await ensureAllExist(Player, ids, 'players');
  const foreign = await Player.findOne(
    { _id: { $in: ids }, is_guest: true, 'guest_for.fixture': { $ne: fixture._id } },
    'name',
  );
  if (foreign) {
    throw new HttpError(400, `${foreign.name} was added as a guest for another match only. Add them again for this match.`);
  }
}

// Referees sign in to run a match, so they must be real accounts.
export async function ensureNoGuests(ids) {
  const guest = ids.length ? await Player.findOne({ _id: { $in: ids }, is_guest: true }, 'name') : null;
  if (guest) throw new HttpError(400, `${guest.name} is a guest player and cannot be a referee`);
}

// Called when fixtures are deleted: their guests go with them.
export async function deleteGuestsOf(fixtureIds) {
  if (fixtureIds.length) await Player.deleteMany({ is_guest: true, 'guest_for.fixture': { $in: fixtureIds } });
}
