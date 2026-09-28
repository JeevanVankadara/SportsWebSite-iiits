import { connectDB, disconnectDB } from '../config/db.js';
import { Admin } from '../models/Admin.js';
import { Player } from '../models/Player.js';

const ADMIN_CREDENTIALS = {
  username: 'adminAli',
  password: 'Ali@123',
};

const COMMON_PLAYER_PASSWORD = 'password@123';

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

async function seed() {
  await connectDB();
  console.log('--- Starting Database Seeding ---');

  // 1. Seed Admin
  const adminUsername = ADMIN_CREDENTIALS.username.toLowerCase();
  const adminPasswordHash = await Admin.hashPassword(ADMIN_CREDENTIALS.password);

  const existingAdmin = await Admin.findOne({ username: adminUsername });
  if (existingAdmin) {
    existingAdmin.password_hash = adminPasswordHash;
    await existingAdmin.save();
    console.log(`✓ Admin "${adminUsername}" updated with new password.`);
  } else {
    await Admin.create({
      username: adminUsername,
      password_hash: adminPasswordHash,
    });
    console.log(`✓ Admin "${adminUsername}" created.`);
  }

  // 2. Hash player password once
  console.log(`Hashing player password "${COMMON_PLAYER_PASSWORD}"...`);
  const playerPasswordHash = await Player.hashPassword(COMMON_PLAYER_PASSWORD);

  // 3. Seed 40 Players
  console.log(`Upserting ${NAMES.length} players...`);
  let createdCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < NAMES.length; i++) {
    const name = NAMES[i];
    const rollNumber = `S202300100${String(i + 1).padStart(2, '0')}`;
    const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
    const username = `${cleanName.slice(0, 10)}${i + 1}`;
    const email = `${username}@iiits.in`;

    const filter = {
      $or: [{ roll_number: rollNumber }, { email }, { username }],
    };

    const existingPlayer = await Player.findOne(filter);
    if (existingPlayer) {
      existingPlayer.name = name;
      existingPlayer.roll_number = rollNumber;
      existingPlayer.email = email;
      existingPlayer.username = username;
      existingPlayer.password_hash = playerPasswordHash;
      await existingPlayer.save();
      updatedCount++;
    } else {
      await Player.create({
        name,
        roll_number: rollNumber,
        email,
        username,
        password_hash: playerPasswordHash,
      });
      createdCount++;
    }
  }

  console.log(`✓ Players seeded successfully: ${createdCount} created, ${updatedCount} updated.`);
  console.log('--- Seeding Completed ---');
}

try {
  await seed();
} catch (err) {
  console.error('Seeding failed:', err);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
