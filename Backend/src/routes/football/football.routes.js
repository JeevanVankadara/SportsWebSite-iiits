import { Router } from 'express';
import {
  createFixture,
  deleteFixture,
  setFixtureDecision,
  updateFixture,
} from '../../controllers/admin/football/fixture.controller.js';
import { getFixture, getStandings, listFixtures, streamFixture } from '../../controllers/user/football/football.controller.js';
import { requireSportAdmin } from '../../middleware/auth.js';

// Mounted at /api/football
const router = Router();
// The super admin, or an admin the super admin gave football to.
const sportAdmin = requireSportAdmin('football');

// Public
router.get('/tournaments/:tournamentId/fixtures', listFixtures);
router.get('/tournaments/:tournamentId/standings', getStandings);
router.get('/fixtures/:id', getFixture);
router.get('/fixtures/:id/stream', streamFixture);

// Admin
router.post('/tournaments/:tournamentId/fixtures', sportAdmin, createFixture);
router.patch('/fixtures/:id', sportAdmin, updateFixture);
router.delete('/fixtures/:id', sportAdmin, deleteFixture);
router.put('/fixtures/:id/decision', sportAdmin, setFixtureDecision);

export default router;
