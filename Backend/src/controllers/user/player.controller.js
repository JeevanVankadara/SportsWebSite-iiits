import { FIRST_BATCH_YEAR, isValidRollNumber, Player } from '../../models/Player.js';
import { verifyCollegeAccount } from '../../services/googleAuth.service.js';
import { freeUsername } from '../../services/player.service.js';
import { HttpError } from '../../utils/httpError.js';

// Players sign up with their college Google account. Google gives the name and email; the player
// types only their roll number, once. The username is made from the name (services/player.service.js).

function playerName({ firstName, lastName, fullName, email }) {
  return [firstName, lastName].filter(Boolean).join(' ') || fullName || email.split('@')[0];
}

function findAccount({ googleId, email }) {
  return Player.findOne({ $or: [{ google_id: googleId }, { email }], is_guest: { $ne: true } });
}

function parseRollNumber(value) {
  const rollNumber = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!isValidRollNumber(rollNumber)) {
    throw new HttpError(
      400,
      `Enter a valid roll number: S, the batch year (${FIRST_BATCH_YEAR} or later) and 7 digits, e.g. S20230010250`,
    );
  }
  return rollNumber;
}

// POST /api/players/google — body: { credential }
// Called right after the Google button: says whether this account is already registered, so the page
// knows whether to ask for the roll number.
export async function checkGoogleAccount(req, res) {
  const account = await verifyCollegeAccount(req.body?.credential);
  const player = await findAccount(account);
  res.json({
    registered: Boolean(player),
    player: player ?? null,
    profile: { name: playerName(account), email: account.email },
  });
}

// POST /api/players/register — body: { credential, roll_number }
export async function registerPlayer(req, res) {
  const account = await verifyCollegeAccount(req.body?.credential);
  const rollNumber = parseRollNumber(req.body?.roll_number);

  const existing = await findAccount(account);
  if (existing) throw new HttpError(409, `You are already registered as @${existing.username}`);
  if (await Player.exists({ roll_number: rollNumber })) {
    throw new HttpError(409, 'An account with this roll number already exists');
  }

  // Two people with the same name signing up at once can pick the same free username; try again then.
  for (let attempt = 0; ; attempt += 1) {
    const player = new Player({
      name: playerName(account),
      email: account.email,
      roll_number: rollNumber,
      username: await freeUsername(account),
      google_id: account.googleId,
    });
    try {
      await player.save();
      return res.status(201).json({ player });
    } catch (err) {
      const field = err?.code === 11000 ? Object.keys(err.keyPattern ?? {})[0] : null;
      if (field === 'username' && attempt < 3) continue;
      if (field === 'roll_number') throw new HttpError(409, 'An account with this roll number already exists');
      if (field) throw new HttpError(409, 'You are already registered. Sign in instead.');
      throw err;
    }
  }
}
