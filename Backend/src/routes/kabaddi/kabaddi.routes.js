import { Router } from 'express';
import {
  clockControl,
  createEvent,
  createFixture,
  deleteFixture,
  endMatch,
  removeEvent,
  saveConfig,
  saveFirstRaid,
  saveTeamLineup,
  setFixtureDecision,
  undoEvent,
  updateFixture,
} from '../../controllers/admin/kabaddi/fixture.controller.js';
import { getFixture, getStandings, listFixtures } from '../../controllers/user/kabaddi/kabaddi.controller.js';
import { requireAdmin } from '../../middleware/auth.js';

// Mounted at /api/kabaddi
const router = Router();

// Public
router.get('/tournaments/:tournamentId/fixtures', listFixtures);
router.get('/tournaments/:tournamentId/standings', getStandings);
router.get('/fixtures/:id', getFixture);

// Admin
router.post('/tournaments/:tournamentId/fixtures', requireAdmin, createFixture);
router.patch('/fixtures/:id', requireAdmin, updateFixture);
router.delete('/fixtures/:id', requireAdmin, deleteFixture);
router.put('/fixtures/:id/decision', requireAdmin, setFixtureDecision);
router.put('/fixtures/:id/config', requireAdmin, saveConfig);
router.put('/fixtures/:id/slips/:team', requireAdmin, saveTeamLineup);
router.put('/fixtures/:id/first-raid', requireAdmin, saveFirstRaid);
router.post('/fixtures/:id/clock', requireAdmin, clockControl);
router.post('/fixtures/:id/finish', requireAdmin, endMatch);
router.post('/fixtures/:id/events', requireAdmin, createEvent);
router.post('/fixtures/:id/undo', requireAdmin, undoEvent);
router.delete('/fixtures/:id/events/:eventId', requireAdmin, removeEvent);

export default router;
