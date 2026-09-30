// Seeds 30 mock players (with realistic per-sport stats) into the configured database.
// Safe to run again: players are matched by roll number, email or username and updated.
// Uses a separate roll-number range (S2023002xxxx) so it never clashes with seed:data.
// Run from the Backend folder: npm run seed:players
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Player } from '../models/Player.js';

const COMMON_PLAYER_PASSWORD = 'password@123';

const NAMES = [
  'Aadhya Reddy',
  'Abhinav Kaul',
  'Aditya Ranganathan',
  'Amritha Nair',
  'Ayaan Sheikh',
  'Chirag Bansal',
  'Devika Menon',
  'Farhan Qureshi',
  'Gaurav Sethi',
  'Ishita Chauhan',
  'Karthik Subramanian',
  'Keerthana Rao',
  'Manish Tiwari',
  'Naveen Kumar',
  'Neha Bhardwaj',
  'Nitya Balakrishnan',
  'Omkar Deshpande',
  'Prateek Saxena',
  'Priya Ranjan',
  'Rachana Shetty',
  'Ravi Teja',
  'Rishabh Jain',
  'Sanya Kapoor',
  'Shaurya Malviya',
  'Sneha Reddy',
  'Tanvi Deshmukh',
  'Ujjwal Rathore',
  'Vaishnavi Iyer',
  'Vivaan Chopra',
  'Zoya Ahmed',
];

// Deterministic but varied mock stats so the data looks realistic.
function mockSports(i) {
  const bPlayed = 5 + (i % 6);
  const fPlayed = 4 + (i % 5);
  const cPlayed = 6 + (i % 5);
  return {
    badminton: {
      played: bPlayed,
      won: Math.max(0, bPlayed - (i % 4)),
    },
    football: {
      played: fPlayed,
      won: Math.max(0, fPlayed - (i % 3)),
      goals: i % 7,
      yellow_cards: i % 3,
      red_cards: i % 9 === 0 ? 1 : 0,
    },
    cricket: {
      played: cPlayed,
      won: Math.max(0, cPlayed - (i % 4)),
      runs: 15 + ((i * 37) % 260),
      wickets: i % 6,
    },
  };
}

async function seed() {
  await connectDB();
  console.log('--- Seeding mock players ---');

  console.log(`Hashing player password "${COMMON_PLAYER_PASSWORD}"...`);
  const playerPasswordHash = await Player.hashPassword(COMMON_PLAYER_PASSWORD);

  console.log(`Upserting ${NAMES.length} players...`);
  let createdCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < NAMES.length; i++) {
    const name = NAMES[i];
    const rollNumber = `S2023002${String(i + 1).padStart(4, '0')}`;
    const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
    const username = `${cleanName.slice(0, 12)}${i + 1}`;
    const email = `${username}@iiits.in`;
    const sports = mockSports(i);

    const filter = { $or: [{ roll_number: rollNumber }, { email }, { username }] };
    const existingPlayer = await Player.findOne(filter);

    if (existingPlayer) {
      existingPlayer.name = name;
      existingPlayer.roll_number = rollNumber;
      existingPlayer.email = email;
      existingPlayer.username = username;
      existingPlayer.password_hash = playerPasswordHash;
      existingPlayer.sports = sports;
      await existingPlayer.save();
      updatedCount++;
    } else {
      await Player.create({
        name,
        roll_number: rollNumber,
        email,
        username,
        password_hash: playerPasswordHash,
        sports,
      });
      createdCount++;
    }
  }

  const total = await Player.countDocuments();
  console.log(`✓ Mock players seeded: ${createdCount} created, ${updatedCount} updated.`);
  console.log(`  Total players now in "${mongoose.connection.name}": ${total}`);
  console.log('--- Seeding completed ---');
}

try {
  await seed();
} catch (err) {
  console.error('Seeding failed:', err);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
