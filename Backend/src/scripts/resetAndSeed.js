import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Admin } from '../models/Admin.js';
import { Player } from '../models/Player.js';
import { ensurePredefinedGames } from '../models/Game.js';

const ADMIN_USERNAME = 'AdminAli';
const ADMIN_PASSWORD = 'Admin@20005';

const STUDENT_PASSWORD = 'Password@123';

const NAMES = [
  'Aarav Sharma',
  'Aditi Rao',
  'Akhil Reddy',
  'Ananya Iyer',
  'Anirudh Verma',
  'Arjun Nair',
  'Bhavya Patel',
  'Chetan Joshi',
  'Deepak Kumar',
  'Divya Menon',
  'Gautam Singhania',
  'Harini Murugan',
  'Ishaan Gupta',
  'Jeevan Vankadara',
  'Kavya Pillai',
  'Kiran Teja',
  'Lakshmi Narayanan',
  'Madhavan Sundaram',
  'Meera Krishnan',
  'Nikhil Chawla',
  'Pranav Bhatt',
  'Pooja Hegde',
  'Rahul Dravid',
  'Rhea Chakraborty',
  'Rohan Mehta',
  'Sahil Kulkarni',
  'Sai Manoj',
  'Sakshi Agarwal',
  'Sameer Khan',
  'Sanjay Dutt',
  'Shreya Ghoshal',
  'Siddharth Malhotra',
  'Sneha Roy',
  'Surya Teja',
  'Tanmay Bhat',
  'Tarun Kumar',
  'Utkarsh Pandey',
  'Varun Dhawan',
  'Vikramaditya Rao',
  'Yashwanth Reddy',
];

async function resetAndSeed() {
  await connectDB();
  console.log(`Connected to database: ${mongoose.connection.name}`);

  // 1. Remove all data currently present in MongoDB
  console.log('--- Step 1: Removing all existing collections / data ---');
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    await mongoose.connection.db.dropCollection(col.name);
    console.log(`  Dropped collection: ${col.name}`);
  }
  console.log('✓ All existing data removed from database.');

  // 2. Predefined games
  console.log('--- Step 2: Ensuring predefined games ---');
  await ensurePredefinedGames();
  console.log('✓ Predefined games created.');

  // 3. Create Admin
  console.log('--- Step 3: Creating Admin ---');
  const adminPasswordHash = await Admin.hashPassword(ADMIN_PASSWORD);
  const admin = await Admin.create({
    username: ADMIN_USERNAME,
    password_hash: adminPasswordHash,
  });
  console.log(`✓ Admin created: username="${admin.username}"`);

  // 4. Create 40 Students (Players)
  console.log(`--- Step 4: Inserting 40 students with password "${STUDENT_PASSWORD}" ---`);
  const studentPasswordHash = await Player.hashPassword(STUDENT_PASSWORD);

  const playersToInsert = NAMES.slice(0, 40).map((name, i) => {
    const rollNumber = `S202300100${String(i + 1).padStart(2, '0')}`;
    const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
    const username = `${cleanName.slice(0, 10)}${i + 1}`;
    const email = `${username}@iiits.in`;

    return {
      name,
      roll_number: rollNumber,
      username,
      email,
      password_hash: studentPasswordHash,
    };
  });

  const createdPlayers = await Player.insertMany(playersToInsert);
  console.log(`✓ Successfully inserted ${createdPlayers.length} students.`);

  // 5. Verification
  console.log('--- Step 5: Verification ---');
  const adminDoc = await Admin.findOne({ username: ADMIN_USERNAME.toLowerCase() }).select('+password_hash');
  const adminPwValid = await adminDoc.verifyPassword(ADMIN_PASSWORD);
  console.log(`  Admin "${adminDoc.username}" password verification: ${adminPwValid ? 'PASSED' : 'FAILED'}`);

  const samplePlayer = await Player.findOne({ roll_number: 'S20230010001' }).select('+password_hash');
  const playerPwValid = await samplePlayer.verifyPassword(STUDENT_PASSWORD);
  console.log(`  Sample student "${samplePlayer.name}" (${samplePlayer.username}) password verification: ${playerPwValid ? 'PASSED' : 'FAILED'}`);

  console.log('--- Summary ---');
  console.log(`  Database: ${mongoose.connection.name}`);
  console.log(`  Admins: ${await Admin.countDocuments()}`);
  console.log(`  Players / Students: ${await Player.countDocuments()}`);
  console.log('✓ Reset and seed completed successfully!');
}

try {
  await resetAndSeed();
} catch (err) {
  console.error('Error during reset and seed:', err);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
