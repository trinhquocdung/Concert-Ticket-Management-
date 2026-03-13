import { Router } from 'express';
import {
  lockSeats,
  releaseSeats,
  createOrder,
  getMyOrders,
  getOrderById,
  downloadTickets,
  getOrderByCode,
  finalizeSeats,
  attachLockedSeats,
  cancelOrder,
  getCancellationRequests,
  getAllOrders,
  processRefund,
  getOrderStats
} from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roles.js';

const router = Router();

/**
 * Order Routes
 * Base path: /api/orders
 */

// All routes require authentication
router.use(authenticate);

// Booking flow
router.post('/lock-seats', lockSeats);
router.post('/release-seats', releaseSeats);
router.post('/', createOrder);

// User orders
router.get('/', getMyOrders);
router.get('/code/:code', getOrderByCode);
router.get('/:id', getOrderById);
router.get('/:id/ticket', downloadTickets);
router.post('/:id/cancel', cancelOrder);
router.post('/:id/finalize-seats', finalizeSeats);
router.post('/:id/attach-locked-seats', attachLockedSeats);

// Admin routes
router.get('/admin/all', isAdmin, getAllOrders);
router.get('/admin/cancellations', isAdmin, getCancellationRequests);
router.get('/admin/stats', isAdmin, getOrderStats);
router.put('/:id/refund', isAdmin, processRefund);

export default router;
