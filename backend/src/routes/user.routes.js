import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetUserPassword,
  getUserStats
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roles.js';

const router = Router();

/**
 * User Routes
 * Base path: /api/users
 * All routes require Admin access
 */

// Apply authentication and admin check to all routes
router.use(authenticate, isAdmin);

// Stats route (must be before :id routes)
router.get('/stats', getUserStats);

// CRUD routes
router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

// Special actions
router.put('/:id/status', toggleUserStatus);
router.put('/:id/reset-password', resetUserPassword);

export default router;
