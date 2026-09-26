import { Player } from '../models/Player.js';

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Finds players by username, name or roll number, e.g. to pick referees or fill in a slip.
export function searchPlayers(text) {
  const search = typeof text === 'string' ? text.trim().slice(0, 50) : '';
  const pattern = new RegExp(escapeRegex(search), 'i');
  const filter = search ? { $or: [{ username: pattern }, { name: pattern }, { roll_number: pattern }] } : {};
  return Player.find(filter, 'name username roll_number').sort({ username: 1 }).limit(20);
}
