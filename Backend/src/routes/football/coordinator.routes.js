import { Router } from 'express';
import {
  decideFixture,
  getFixture,
  myFixtures,
  saveConfig,
  saveTeamLineup,
  addGuest,
} from '../../controllers/co-ordinators/football/fixture.controller.js';
import {
  clockControl,
  createEvent,
  editEvent,
  endMatch,
  removeEvent,
} from '../../controllers/co-ordinators/football/match.controller.js';
import { requireCoordinator } from '../../middleware/auth.js';

// Mounted at /api/coordinator/football
const router = Router();
router.use(requireCoordinator);

router.get('/fixtures', myFixtures);
router.get('/fixtures/:id', getFixture);
router.post('/fixtures/:id/guests', addGuest);
router.put('/fixtures/:id/config', saveConfig);
router.put('/fixtures/:id/slips/:team', saveTeamLineup);
router.put('/fixtures/:id/decision', decideFixture);

router.post('/fixtures/:id/clock', clockControl);
router.post('/fixtures/:id/finish', endMatch);

router.post('/fixtures/:id/events', createEvent);
router.put('/fixtures/:id/events/:eventId', editEvent);
router.delete('/fixtures/:id/events/:eventId', removeEvent);

export default router;
