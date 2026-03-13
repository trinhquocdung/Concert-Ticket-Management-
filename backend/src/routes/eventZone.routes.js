import { Router } from 'express';
import {
  getEventZones,
  createEventZone,
  updateEventZone,
  deleteEventZone,
  generateEventSeats,
  getEventSeatMap,
  batchSaveZones
} from '../controllers/eventZone.controller.js';
import { authenticate } from '../middleware/auth.js';
import { isOrganizerOrAdmin } from '../middleware/roles.js';

const router = Router();

/**
 * EventZone Routes - Polygon-based zone drawing
 * Base path: /api/concerts
 * 
 * Workflow:
 * 1. Organizer draws polygon zones on venue seat map
 * 2. Each zone is assigned to a ticket class (for pricing/color)
 * 3. System calculates which seats fall within each polygon
 * 4. ShowSeats generated with proper class and custom labels
 */

// Public routes
router.get('/:concertId/zones', getEventZones);
router.get('/:concertId/seatmap', getEventSeatMap);

// Protected routes - Organizer or Admin
router.post('/:concertId/zones', authenticate, isOrganizerOrAdmin, createEventZone);
router.post('/:concertId/zones/batch', authenticate, isOrganizerOrAdmin, batchSaveZones);
router.post('/:concertId/zones/generate-seats', authenticate, isOrganizerOrAdmin, generateEventSeats);
router.put('/:concertId/zones/:zoneId', authenticate, isOrganizerOrAdmin, updateEventZone);
router.delete('/:concertId/zones/:zoneId', authenticate, isOrganizerOrAdmin, deleteEventZone);

export default router;
