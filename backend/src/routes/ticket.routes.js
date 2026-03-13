import express from 'express';
import {
  getMyTickets,
  getTicketById,
  getTicketByCode,
  verifyTicket,
  checkInTicket,
  checkInByQR,
  getCheckInList,
  downloadTicket
} from '../controllers/ticket.controller.js';
import { protect } from '../middleware/auth.js';
import { isStaffOrHigher } from '../middleware/roles.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * Customer routes
 */
// Get my tickets
router.get('/', getMyTickets);

// Get single ticket
router.get('/:id', getTicketById);

// Download ticket data (for PDF generation)
router.get('/:id/download', downloadTicket);

/**
 * Staff/Admin routes
 */
// Get ticket by code
router.get('/code/:code', isStaffOrHigher, getTicketByCode);

// Verify ticket (before check-in)
router.post('/verify', isStaffOrHigher, verifyTicket);

// Check-in by ticket ID
router.post('/:id/check-in', isStaffOrHigher, checkInTicket);

// Check-in by QR code
router.post('/check-in-qr', isStaffOrHigher, checkInByQR);

// Get check-in list for concert
router.get('/concert/:concertId/check-in-list', isStaffOrHigher, getCheckInList);

export default router;
