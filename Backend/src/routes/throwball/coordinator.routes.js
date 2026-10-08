import { Router } from 'express';
import {
  createSubstitution,
  decideFixture,
  editSet,
  finish,
  getFixture,
  myFixtures,
  nextSet,
  saveConfig,
  saveTeamLineup,
  score,
  start,
  undoEvent,
  addGuest,
} from '../../controllers/co-ordinators/throwball/fixture.controller.js';
import { requireCoordinator } from '../../middleware/auth.js';

// Mounted at /api/coordinator/throwball
const router = Router();
router.use(requireCoordinator);

router.get('/fixtures', myFixtures);
router.get('/fixtures/:id', getFixture);
router.post('/fixtures/:id/guests', addGuest);
router.put('/fixtures/:id/config', saveConfig);
router.put('/fixtures/:id/slips/:team', saveTeamLineup);
router.put('/fixtures/:id/decision', decideFixture);

router.post('/fixtures/:id/start', start);
router.post('/fixtures/:id/score', score);
router.post('/fixtures/:id/next-set', nextSet);
router.post('/fixtures/:id/finish', finish);
router.post('/fixtures/:id/substitution', createSubstitution);
router.post('/fixtures/:id/undo', undoEvent);
router.put('/fixtures/:id/sets/:setId', editSet);

export default router;
