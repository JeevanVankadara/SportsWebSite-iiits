import { Player } from '../models/Player.js';

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Finds players by username, name or roll number, e.g. to pick referees or fill in a slip.
// Guests (added for one match only) never show up, so they cannot be picked anywhere else.
export function searchPlayers(text) {
  const search = typeof text === 'string' ? text.trim().slice(0, 50) : '';
  const pattern = new RegExp(escapeRegex(search), 'i');
  const filter = { is_guest: { $ne: true } };
  if (search) filter.$or = [{ username: pattern }, { name: pattern }, { roll_number: pattern }];
  return Player.find(filter, 'name username roll_number').sort({ username: 1 }).limit(20);
}

const USERNAME_MAX = 30;

/**
 * A username from the name on the Google account: "Ravi Kumar" -> ravikumar. When that is taken the
 * next free one of ravikumar2, ravikumar3, ... is used. Only letters and digits, so it can never
 * look like a guest's placeholder ("guest_...").
 */
export async function freeUsername({ firstName, lastName, email }) {
  const clean = (text) => text.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
  let base = clean(`${firstName}${lastName}`);
  if (base.length < 3) base = clean(email.split('@')[0]);
  if (base.length < 3) base = `player${base}`;
  // Leaves room for the number at the end.
  base = base.slice(0, USERNAME_MAX - 4);

  const taken = new Set(
    (await Player.find({ username: new RegExp(`^${base}\\d*$`) }, 'username').lean()).map((p) => p.username),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    if (!taken.has(`${base}${n}`)) return `${base}${n}`;
  }
}
