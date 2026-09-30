import { Router } from 'express';
import {
  clockControl,
  createEvent,
  decideFixture,
  endMatch,
  getFixture,
  myFixtures,
  saveConfig,
  saveFirstRaid,
  saveTeamLineup,
  undoEvent,
} from '../../controllers/co-ordinators/kabaddi/fixture.controller.js';
import { requireCoordinator } from '../../middleware/auth.js';

// Mounted at /api/coordinator/kabaddi
const router = Router();
router.use(requireCoordinator);

router.get('/fixtures', myFixtures);
router.get('/fixtures/:id', getFixture);
router.put('/fixtures/:id/config', saveConfig);
router.put('/fixtures/:id/slips/:team', saveTeamLineup);
router.put('/fixtures/:id/first-raid', saveFirstRaid);
router.put('/fixtures/:id/decision', decideFixture);

router.post('/fixtures/:id/clock', clockControl);
router.post('/fixtures/:id/finish', endMatch);
router.post('/fixtures/:id/events', createEvent);
router.post('/fixtures/:id/undo', undoEvent);

export default router;
