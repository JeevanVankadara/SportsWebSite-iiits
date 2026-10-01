import { Router } from 'express';
import {
  createFixture,
  deleteFixture,
  setFixtureDecision,
  updateFixture,
} from '../../controllers/admin/volleyball/fixture.controller.js';
import { getFixture, getStandings, listFixtures, streamFixture } from '../../controllers/user/volleyball/volleyball.controller.js';
import { requireSportAdmin } from '../../middleware/auth.js';

// Mounted at /api/volleyball
const router = Router();
// The super admin, or an admin the super admin gave volleyball to.
const sportAdmin = requireSportAdmin('volleyball');

// Public
router.get('/tournaments/:tournamentId/fixtures', listFixtures);
router.get('/tournaments/:tournamentId/standings', getStandings);
router.get('/fixtures/:id', getFixture);
router.get('/fixtures/:id/stream', streamFixture);

// Admin: like every other sport, the admin only manages the fixture and the final decision.
// The match itself (rules, lineups and scoring) is run by the assigned referee.
router.post('/tournaments/:tournamentId/fixtures', sportAdmin, createFixture);
router.patch('/fixtures/:id', sportAdmin, updateFixture);
router.delete('/fixtures/:id', sportAdmin, deleteFixture);
router.put('/fixtures/:id/decision', sportAdmin, setFixtureDecision);

export default router;
