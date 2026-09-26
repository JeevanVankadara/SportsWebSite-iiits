import { Router } from 'express';
import { listGames } from '../controllers/game.controller.js';

const router = Router();

router.get('/', listGames);

export default router;
