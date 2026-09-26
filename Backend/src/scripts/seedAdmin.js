// Creates an admin account, or resets the password when the username already exists.
// Run from the Backend folder: npm run seed:admin
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { connectDB, disconnectDB } from '../config/db.js';
import { Admin } from '../models/Admin.js';

const MIN_PASSWORD_LENGTH = 8;

async function ask(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

// Reads a line without echoing it, so the password never shows on screen. Terminals that
// are not TTYs (e.g. Git Bash without winpty) fall back to a normal, visible prompt.
function askHidden(question) {
  if (!stdin.isTTY) return ask(question);

  return new Promise((resolve, reject) => {
    let value = '';

    const finish = (error) => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') return finish();
        if (char === '\u0003') return finish(new Error('Cancelled.')); // Ctrl+C
        if (char === '\b' || char === '\u007f') value = value.slice(0, -1); // Backspace
        else if (char >= ' ') value += char;
      }
    };

    stdout.write(question);
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function main() {
  const username = (await ask('Admin username: ')).trim().toLowerCase();
  if (!username) throw new Error('Username is required.');

  const password = await askHidden('Password: ');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if ((await askHidden('Confirm password: ')) !== password) {
    throw new Error('Passwords do not match.');
  }

  await connectDB();
  const existing = await Admin.findOne({ username });
  const admin = existing ?? new Admin({ username });
  admin.password_hash = await Admin.hashPassword(password);
  await admin.save();

  console.log(existing ? `Password updated for "${username}".` : `Admin "${username}" created.`);
}

try {
  await main();
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
