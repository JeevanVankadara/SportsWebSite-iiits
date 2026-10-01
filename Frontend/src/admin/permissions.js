// What the signed-in admin may do. The backend checks the same rules (middleware/auth.js); this only
// hides what would be refused anyway.

// The sports an admin can be given, as the backend names them (models/Admin.js SPORT_KEYS).
export const SPORTS = [
  { key: 'cricket', label: 'Cricket' },
  { key: 'badminton', label: 'Badminton' },
  { key: 'football', label: 'Football' },
  { key: 'kabaddi', label: 'Kabaddi' },
  { key: 'volleyball', label: 'Volleyball' },
]

// The super admin manages tournaments and the other admins, and every sport.
export function isSuperAdmin(admin) {
  return admin?.role === 'super_admin'
}

// sportName: a game_name such as 'Cricket', or a key such as 'cricket'.
export function canManageSport(admin, sportName) {
  return isSuperAdmin(admin) || Boolean(admin?.sports?.includes(String(sportName).toLowerCase()))
}

export function sportLabels(keys) {
  return SPORTS.filter((sport) => keys.includes(sport.key)).map((sport) => sport.label)
}
