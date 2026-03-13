import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/roles.js';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
} from '../controllers/category.controller.js';

const router = express.Router();

// Public routes
router.get('/', getCategories);
router.get('/:idOrSlug', getCategoryById);

// Admin only routes
router.post('/', authenticate, authorize('ADMIN'), createCategory);
router.put('/reorder', authenticate, authorize('ADMIN'), reorderCategories);
router.put('/:id', authenticate, authorize('ADMIN'), updateCategory);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteCategory);

export default router;
