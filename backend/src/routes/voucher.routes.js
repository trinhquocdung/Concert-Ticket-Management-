import express from 'express';
import {
  getVouchers,
  getVoucherByCode,
  validateVoucher,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  toggleVoucher
} from '../controllers/voucher.controller.js';
import { protect } from '../middleware/auth.js';
import { isOrganizerOrAdmin, isAdmin } from '../middleware/roles.js';

const router = express.Router();

// Protected routes
router.use(protect);

// Validate voucher (for checkout)
router.post('/validate', validateVoucher);

// Get voucher by code
router.get('/code/:code', getVoucherByCode);

// Admin/Organizer routes
router.get('/', isOrganizerOrAdmin, getVouchers);
router.post('/', isOrganizerOrAdmin, createVoucher);
router.put('/:id', isOrganizerOrAdmin, updateVoucher);
router.patch('/:id/toggle', isOrganizerOrAdmin, toggleVoucher);
router.delete('/:id', isAdmin, deleteVoucher);

export default router;
