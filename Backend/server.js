import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { connectDB } from './src/config/db.js';
import { env } from './src/config/env.js';
import { errorHandler, notFound } from './src/middleware/errorHandler.js';
import { ensurePredefinedGames } from './src/models/Game.js';
import { migrateUpcomingTournaments } from './src/models/Tournament.js';
import adminRoutes from './src/routes/admin.routes.js';
import badmintonRoutes from './src/routes/badminton/badminton.routes.js';
import badmintonCoordinatorRoutes from './src/routes/badminton/coordinator.routes.js';
import coordinatorRoutes from './src/routes/coordinator.routes.js';
import footballRoutes from './src/routes/football/football.routes.js';
import footballCoordinatorRoutes from './src/routes/football/coordinator.routes.js';
import cricketCoordinatorRoutes from './src/routes/cricket/coordinator.routes.js';
import cricketRoutes from './src/routes/cricket/cricket.routes.js';
import gameRoutes from './src/routes/game.routes.js';
import kabaddiCoordinatorRoutes from './src/routes/kabaddi/coordinator.routes.js';
import kabaddiRoutes from './src/routes/kabaddi/kabaddi.routes.js';
import playerRoutes from './src/routes/player.routes.js';
import tournamentRoutes from './src/routes/tournament.routes.js';

const app = express();

if (env.trustProxy) app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.clientOrigins }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.use('/api/admin', adminRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/badminton', badmintonRoutes);
app.use('/api/coordinator/badminton', badmintonCoordinatorRoutes);
app.use('/api/football', footballRoutes);
app.use('/api/coordinator/football', footballCoordinatorRoutes);
app.use('/api/cricket', cricketRoutes);
app.use('/api/coordinator/cricket', cricketCoordinatorRoutes);
app.use('/api/kabaddi', kabaddiRoutes);
app.use('/api/coordinator/kabaddi', kabaddiCoordinatorRoutes);
app.use('/api/coordinator', coordinatorRoutes);

app.use(notFound);
app.use(errorHandler);

try {
  await connectDB();
  await ensurePredefinedGames();
  await migrateUpcomingTournaments();
} catch (err) {
  console.error(`Could not prepare the database: ${err.message}`);
  process.exit(1);
}

app.listen(env.port, (error) => {
  if (error) {
    console.error(`Could not start the server: ${error.message}`);
    process.exit(1);
  }
  console.log(`API listening on http://localhost:${env.port}`);
});
