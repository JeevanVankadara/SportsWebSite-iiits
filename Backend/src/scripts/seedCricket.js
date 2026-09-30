// Demo data for trying cricket: players, and a fixture whose referee has entered the squads
// and is about to do the toss. Safe to run again: existing players are kept, and the demo fixture
// is set back to "squads entered, toss next" (only while it has not started).
// Run from the Backend folder: npm run seed:cricket
// Options (defaults shown): -- --referee mani --tournament Inter-ug --team1 UG-1 --team2 UG-2 --overs 10 --powerplay 3
import { parseArgs } from 'node:util';
import { connectDB, disconnectDB } from '../config/db.js';
import { Player } from '../models/Player.js';
import { CricketFixture } from '../models/sports/cricket/CricketFixture.js';
import { Tournament } from '../models/Tournament.js';
import { findCricketGame } from '../services/cricket/fixture.service.js';
import { saveSetup } from '../services/cricket/setup.service.js';
import { parseSetup } from '../services/cricket/validators.js';

const { values: options } = parseArgs({
  options: {
    referee: { type: 'string', default: 'mani' },
    tournament: { type: 'string', default: 'Inter-ug' },
    team1: { type: 'string', default: 'UG-1' },
    team2: { type: 'string', default: 'UG-2' },
    overs: { type: 'string', default: '10' },
    powerplay: { type: 'string', default: '3' },
  },
});
const REFEREE = options.referee;
const TOURNAMENT = options.tournament;
const HOUSES = [options.team1, options.team2];
const OVERS = Number(options.overs);
const POWERPLAY = Number(options.powerplay);
const PASSWORD = 'password123';

// The first 13 players go to team 1 and the next 13 to team 2: 11 playing and 2 substitutes each.
const SQUADS = {
  team1: [
    'Arjun Sharma', 'Rohit Verma', 'Dev Nair', 'Aditya Singh', 'Rahul Mehta', 'Siddharth Joshi',
    'Nikhil Das', 'Ankit Saxena', 'Pranav Reddy', 'Kunal Bose', 'Varun Kapoor', 'Tarun Rao', 'Mohit Jain',
  ],
  team2: [
    'Karan Patel', 'Suresh Iyer', 'Manish Gupta', 'Vikram Rao', 'Amit Tiwari', 'Ravi Kumar',
    'Deepak Pandey', 'Harish Pillai', 'Shubham Yadav', 'Abhishek Roy', 'Yash Malhotra', 'Sahil Khan', 'Gautam Sen',
  ],
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

async function ensurePlayers(passwordHash) {
  const players = {};
  let created = 0;
  let index = 0;
  for (const [team, names] of Object.entries(SQUADS)) {
    players[team] = [];
    for (const name of names) {
      index += 1;
      const username = name.toLowerCase().replace(' ', '.');
      let player = await Player.findOne({ username });
      if (!player) {
        player = await Player.create({
          name,
          username,
          email: `${username}@demo.iiits.in`,
          roll_number: `DEMO${String(index).padStart(3, '0')}`,
          password_hash: passwordHash,
        });
        created += 1;
      }
      players[team].push(player);
    }
  }
  return { players, created };
}

async function seed() {
  const tournament = await Tournament.findOne({ tournament_name: TOURNAMENT });
  if (!tournament) return fail(`No tournament called "${TOURNAMENT}"`);
  const cricket = await findCricketGame();
  if (!cricket || !tournament.games.some((id) => id.equals(cricket._id))) {
    return fail(`Cricket is not one of ${TOURNAMENT}'s sports`);
  }
  const houses = HOUSES.map((name) => tournament.houses.find((house) => house.house_name === name));
  if (houses.some((house) => !house)) return fail(`${TOURNAMENT} needs houses ${HOUSES.join(' and ')}`);
  const referee = await Player.findOne({ username: REFEREE });
  if (!referee) return fail(`No player with username "${REFEREE}"`);

  const { players, created } = await ensurePlayers(await Player.hashPassword(PASSWORD));

  let fixture = await CricketFixture.findOne({
    tournament: tournament._id,
    team1: houses[0]._id,
    team2: houses[1]._id,
    referees: referee._id,
  });
  if (fixture && fixture.status !== 'scheduled') {
    return fail('The demo fixture has already started. Delete it from the admin page to seed a fresh one.');
  }
  fixture ??= new CricketFixture({
    tournament: tournament._id,
    team1: houses[0]._id,
    team2: houses[1]._id,
    referees: [referee._id],
  });
  fixture.scheduled_at = new Date();
  fixture.toss = undefined;
  await fixture.save();

  const squad = (team) => ({
    players: players[team].slice(0, 11).map((player) => String(player._id)),
    substitutes: players[team].slice(11).map((player) => String(player._id)),
  });
  await saveSetup(
    fixture,
    parseSetup({ overs: OVERS, powerplay_overs: POWERPLAY, team1: squad('team1'), team2: squad('team2') }),
  );

  console.log(`Players: ${created} created, ${26 - created} already there (password for new ones: ${PASSWORD})`);
  console.log(`Fixture ${houses[0].house_name} vs ${houses[1].house_name} in ${TOURNAMENT}: ${OVERS} over(s), powerplay ${POWERPLAY},`);
  console.log(`11 players + 2 substitutes per house, toss not done yet. Referee: ${referee.name} (@${referee.username})`);
  console.log(`Open it at /coordinator/cricket/${fixture._id}`);
}

await connectDB();
try {
  await seed();
} finally {
  await disconnectDB();
}
