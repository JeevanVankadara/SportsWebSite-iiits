// Empties the whole database and keeps only the super admin (same username and password as before).
// A copy of every collection is saved first to Backend/backups/<date>/ as JSON.
// Run from the Backend folder: npm run seed:reset
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { Admin } from '../models/Admin.js';
import { ensurePredefinedGames } from '../models/Game.js';

const BACKUP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../backups');
const { EJSON } = mongoose.mongo.BSON;

async function backUp(db, collections) {
  const folder = path.join(BACKUP_ROOT, new Date().toISOString().replace(/[:.]/g, '-'));
  await mkdir(folder, { recursive: true });
  for (const { name } of collections) {
    const docs = await db.collection(name).find().toArray();
    await writeFile(path.join(folder, `${name}.json`), EJSON.stringify(docs, null, 2, { relaxed: false }));
    console.log(`  ${name}: ${docs.length} documents`);
  }
  return folder;
}

async function resetAndSeed() {
  await connectDB();
  const { db } = mongoose.connection;

  // Super admins, and admins from before roles existed (they could do everything). Added admins go.
  const superAdmins = await db
    .collection('admins')
    .find({ $or: [{ role: 'super_admin' }, { role: { $exists: false } }] })
    .toArray();
  if (!superAdmins.length) {
    throw new Error('No admin found to keep. Nothing was deleted. Create one with npm run seed:admin first.');
  }

  const collections = await db.listCollections({ type: 'collection' }).toArray();
  console.log('--- Step 1: Backing up every collection ---');
  const folder = await backUp(db, collections);
  console.log(`✓ Backup saved in ${folder}`);

  console.log('--- Step 2: Removing all data ---');
  for (const { name } of collections) {
    await db.dropCollection(name);
    console.log(`  Dropped ${name}`);
  }

  console.log('--- Step 3: Sports and the super admin ---');
  await ensurePredefinedGames();
  await Admin.syncIndexes();
  for (const { username, password_hash: passwordHash } of superAdmins) {
    await Admin.create({ username, password_hash: passwordHash, role: 'super_admin', sports: [] });
    console.log(`  Super admin "${username}" kept (same password as before)`);
  }

  console.log('✓ Done. Players now register with their college Google account at /register.');
}

try {
  await resetAndSeed();
} catch (err) {
  console.error('Reset failed:', err.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
