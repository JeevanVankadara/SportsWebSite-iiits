import { connectDB, disconnectDB } from '../config/db.js';
import { Player } from '../models/Player.js';
import { KabaddiFixture } from '../models/sports/kabaddi/KabaddiFixture.js';
import { refreshPlayerStats } from '../services/kabaddi/playerStats.service.js';
import { replayMatch } from '../services/kabaddi/rules.js';
import mongoose from 'mongoose';

// Tournament & House IDs
const TOURNAMENT_ID = '6abed67fecda7d05a905f595'; // Inter-ug
const TEAM1_ID = '6abed67fecda7d05a905f599';      // UG-4
const TEAM2_ID = '6abed67fecda7d05a905f596';      // UG-1
const OLD_FIXTURE_ID = '6abf823c9145d659525509b1'; // Test match to delete

// UG4 Players
const UG4_PLAYERS = {
  banush: '6abf808a9145d65952550918',   // BANUSH JETTI (S20230010109)
  tejesh: '6abf85be9145d65952551858',   // VENKATA TEJESH MADALA (S20230010137)
  abhyas: '6abfa8519145d65952555e59',   // Abhyas
  ganesh: '6abfa8449145d65952555e27',   // Ganesh
  srimanth: '6abf87bb9145d65952551b68', // Srimanth Reddy Nagolu (S20230010160)
  sujan: '6abfa8449145d65952555e26',    // SUJAN KUMAR ANKIDI (S20230020279)
  nikhil: '6abfa85c9145d65952555e5b',   // Nikhil
};

// 7 dummy defender ObjectIds for event calculations
const DUMMY_DEFENDERS = Array.from({ length: 7 }, () => new mongoose.Types.ObjectId());

export function buildKabaddiEvents() {
  const events = [];

  function addRaid(raiderId, pts) {
    const touched = [];
    for (let i = 0; i < pts; i++) {
      touched.push(DUMMY_DEFENDERS[i % DUMMY_DEFENDERS.length]);
    }
    events.push({
      type: 'raid',
      half: 'first_half',
      team: 'team1',
      raider: raiderId,
      touched,
      stepped_out: [],
      bonus: false,
    });
  }

  function addTackle(tacklerId, count) {
    for (let i = 0; i < count; i++) {
      events.push({
        type: 'tackle',
        half: 'first_half',
        team: 'team2',
        tackler: tacklerId,
        raider: DUMMY_DEFENDERS[0],
      });
    }
  }

  // 1. Banush Jetti: 15 raid points
  addRaid(UG4_PLAYERS.banush, 5);
  addRaid(UG4_PLAYERS.banush, 5);
  addRaid(UG4_PLAYERS.banush, 5);

  // 2. Venkata Tejesh: 7 raid points
  addRaid(UG4_PLAYERS.tejesh, 4);
  addRaid(UG4_PLAYERS.tejesh, 3);

  // 3. Abhyas: 6 raid points
  addRaid(UG4_PLAYERS.abhyas, 3);
  addRaid(UG4_PLAYERS.abhyas, 3);

  // 4. Ganesh: 8 raid points, 3 tackle points
  addRaid(UG4_PLAYERS.ganesh, 4);
  addRaid(UG4_PLAYERS.ganesh, 4);
  addTackle(UG4_PLAYERS.ganesh, 3);

  // 5. Sujan: 2 raid points, 4 tackle points
  addRaid(UG4_PLAYERS.sujan, 2);
  addTackle(UG4_PLAYERS.sujan, 4);

  // 6. Srimanth: 3 tackle points
  addTackle(UG4_PLAYERS.srimanth, 3);

  // 7. Extras: 4 points
  events.push({
    type: 'technical',
    half: 'first_half',
    team: 'team1',
    points: 4,
    note: 'Extras',
  });

  // 8. All-out points: 6 points
  events.push({
    type: 'technical',
    half: 'second_half',
    team: 'team1',
    points: 6,
    note: 'All-out points',
  });

  // 9. UG1: 47 points (no individual player events recorded)
  events.push({
    type: 'technical',
    half: 'completed',
    team: 'team2',
    points: 47,
    note: 'No individual player data recorded',
  });

  return events;
}

export async function run({ execute = false } = {}) {
  await connectDB();

  console.log(`\n=== Kabaddi Match Seeding (${execute ? 'EXECUTE' : 'DRY RUN'}) ===\n`);

  // Verify players exist
  for (const [key, id] of Object.entries(UG4_PLAYERS)) {
    const p = await Player.findById(id).lean();
    if (!p) throw new Error(`Player ${key} (${id}) not found!`);
    console.log(`Verified UG4 player: ${key.padEnd(10)} -> ${p.name} (${p.roll_no || 'GUEST'})`);
  }

  const events = buildKabaddiEvents();

  const fixtureData = {
    tournament: TOURNAMENT_ID,
    team1: TEAM1_ID,
    team2: TEAM2_ID,
    status: 'completed',
    result: 'team1',
    result_type: 'normal',
    decision_note: 'UG-4 won 58 - 47. No player data recorded for UG-1.',
    team1_lineup: {
      starters: Object.values(UG4_PLAYERS),
      bench: [],
    },
    team2_lineup: {
      starters: [],
      bench: [],
    },
    clock: {
      period: 'completed',
      is_running: false,
      elapsed_seconds: 2400,
    },
    events,
  };

  const replayed = replayMatch(fixtureData);
  fixtureData.team1_score = replayed.score.team1;
  fixtureData.team2_score = replayed.score.team2;

  console.log('\n--- Calculated Scores ---');
  console.log(`Team 1 (UG4): ${fixtureData.team1_score}`);
  console.log(`Team 2 (UG1): ${fixtureData.team2_score}`);

  console.log('\n--- Player Stats (UG4) ---');
  for (const [key, id] of Object.entries(UG4_PLAYERS)) {
    const stats = replayed.players[id] || { raid_points: 0, tackle_points: 0 };
    console.log(`  ${key.padEnd(10)}: raid_points=${stats.raid_points}, tackle_points=${stats.tackle_points}, total=${stats.raid_points + stats.tackle_points}`);
  }

  if (!execute) {
    console.log('\n[DRY RUN COMPLETE] No changes were made to the database.');
    await disconnectDB();
    return;
  }

  // Execute changes
  console.log('\n[EXECUTING] Deleting old fixture...');
  const deleted = await KabaddiFixture.findByIdAndDelete(OLD_FIXTURE_ID);
  console.log(`Deleted fixture ${OLD_FIXTURE_ID}:`, !!deleted);

  console.log('[EXECUTING] Inserting new Kabaddi fixture...');
  const newFixture = await KabaddiFixture.create(fixtureData);
  console.log(`Created new fixture with ID: ${newFixture._id}`);

  console.log('[EXECUTING] Refreshing player stats for all UG4 players...');
  await refreshPlayerStats(Object.values(UG4_PLAYERS));

  // Also refresh any players from the old fixture starters if any
  if (deleted?.team2_lineup?.starters?.length) {
    console.log('[EXECUTING] Refreshing player stats for previous fixture participants...');
    await refreshPlayerStats(deleted.team2_lineup.starters);
  }

  console.log('\n[SUCCESS] Seeding completed successfully!');
  await disconnectDB();
}

export async function verify() {
  await connectDB();
  console.log('\n=== VERIFYING KABADDI DATA IN DB ===\n');
  const fixtures = await KabaddiFixture.find({ tournament: TOURNAMENT_ID }).lean();
  console.log(`Found ${fixtures.length} fixture(s) in tournament:`);
  for (const f of fixtures) {
    console.log(`  ID: ${f._id} | Status: ${f.status} | Score: UG4 ${f.team1_score} – ${f.team2_score} UG1 | Result: ${f.result} | Decision: ${f.decision_note}`);
  }

  console.log('\n--- UG4 Player Profiles in DB ---');
  for (const [key, id] of Object.entries(UG4_PLAYERS)) {
    const p = await Player.findById(id).lean();
    const k = p?.sports?.kabaddi || {};
    console.log(`  ${(p?.name || key).padEnd(25)} -> Played: ${k.played}, Won: ${k.won}, Raid: ${k.raid_points}, Tackle: ${k.tackle_points}, Total: ${k.points}`);
  }
  await disconnectDB();
}

if (process.argv[1]?.endsWith('seedKabaddiMatch.js')) {
  if (process.argv.includes('--verify')) {
    verify().catch(err => { console.error('Error:', err); process.exit(1); });
  } else {
    const isExecute = process.argv.includes('--execute');
    run({ execute: isExecute }).catch((err) => {
      console.error('Error:', err);
      process.exit(1);
    });
  }
}
