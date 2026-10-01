import { MIN_PASSWORD_LENGTH, Player } from '../../models/Player.js';
import { isReservedIdentity } from '../../services/guestPlayer.service.js';
import { HttpError } from '../../utils/httpError.js';
import { requireText } from '../../utils/validation.js';

const DUPLICATE_MESSAGES = {
  email: 'An account with this email already exists',
  roll_number: 'An account with this roll number already exists',
  username: 'This username is taken. Try another one.',
};

// POST /api/players/register — body: { name, email, roll_number, username, password }
export async function registerPlayer(req, res) {
  const body = req.body ?? {};
  const { password } = body;
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  // bcrypt only uses the first 72 bytes of a password.
  if (Buffer.byteLength(password) > 72) throw new HttpError(400, 'Password must be 72 characters or fewer');

  const player = new Player({
    name: requireText(body.name, 'Name'),
    email: requireText(body.email, 'Email'),
    roll_number: requireText(body.roll_number, 'Roll number'),
    username: requireText(body.username, 'Username'),
  });
  // The password is hashed only after the other fields pass, as hashing is deliberately slow.
  await player.validate({ pathsToSkip: ['password_hash'] });
  // These forms are kept for guest players (services/guestPlayer.service.js).
  if (isReservedIdentity(player)) {
    throw new HttpError(400, 'Usernames starting with "guest_", roll numbers starting with "GUEST-" and @guest.invalid emails are reserved');
  }

  // Checked up front for a clear message; the unique indexes still guard against two sign-ups at once.
  const clash = await Player.findOne({
    $or: [{ email: player.email }, { roll_number: player.roll_number }, { username: player.username }],
  });
  if (clash) {
    const field = ['email', 'roll_number', 'username'].find((key) => clash[key] === player[key]);
    throw new HttpError(409, DUPLICATE_MESSAGES[field]);
  }

  player.password_hash = await Player.hashPassword(password);
  try {
    await player.save();
  } catch (err) {
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern ?? {})[0];
      throw new HttpError(409, DUPLICATE_MESSAGES[field] ?? 'An account with these details already exists');
    }
    throw err;
  }

  res.status(201).json({ player });
}
