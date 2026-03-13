import express from 'express';
import {
  getPaymentStatus,
  getPaymentHistory,
  processRefund
} from '../controllers/payment.controller.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roles.js';

const router = express.Router();

/**
 * Public routes (payment gateway callbacks)
 */
// VNPay removed; MoMo callbacks are handled at app-level (/api/payment)

/**
 * Protected routes
 */
router.use(protect);

// Payment creation is handled by MoMo controller at `/api/payment`

// Get payment status
router.get('/:id/status', getPaymentStatus);

// Get payment history
router.get('/history', getPaymentHistory);

/**
 * Admin routes
 */
// Process refund
router.post('/:id/refund', isAdmin, processRefund);

export default router;
