import { Router } from 'express';
import { syncSoldSeats } from '../controllers/system.controller.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roles.js';

const router = Router();

// Only authenticated admins should call this in production; allow auth for convenience
router.post('/sync-sold-seats', authenticate, isAdmin, syncSoldSeats);

export default router;
