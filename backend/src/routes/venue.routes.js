import { Router } from 'express';
import {
  getVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue,
  getVenueSeats,
  saveVenueSeats,
  addSeats,
  deleteSeats,
  updateSeat,
  getVenueCapacity,
  generateSeats,
  // Zone management
  getVenueZones,
  createZone,
  updateZone,
  deleteZone,
  getZoneWithSeats,
  generateZoneSeats,
  saveVenueLayout,
  getVenueLayout
} from '../controllers/venue.controller.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roles.js';

const router = Router();

/**
 * Venue Routes
 * Base path: /api/venues
 * 
 * NEW STRUCTURE:
 * - Venues have Zones (physical areas with shapes/bounds)
 * - Zones contain Seats (physical seat layout templates)
 * - EventZones link zones to events with custom colors, labels, pricing
 * - ShowSeats track seat availability per event
 */

// Public routes - Venue
router.get('/', getVenues);
router.get('/:id', getVenueById);
router.get('/:id/layout', getVenueLayout);
router.get('/:id/seats', getVenueSeats);
router.get('/:id/capacity', getVenueCapacity);

// Public routes - Zones
router.get('/:id/zones', getVenueZones);
router.get('/:id/zones/:zoneId', getZoneWithSeats);

// Admin routes - Venue CRUD
router.post('/', authenticate, isAdmin, createVenue);
router.put('/:id', authenticate, isAdmin, updateVenue);
router.delete('/:id', authenticate, isAdmin, deleteVenue);
router.put('/:id/layout', authenticate, isAdmin, saveVenueLayout);

// Admin routes - Zone Management
router.post('/:id/zones', authenticate, isAdmin, createZone);
router.put('/:id/zones/:zoneId', authenticate, isAdmin, updateZone);
router.delete('/:id/zones/:zoneId', authenticate, isAdmin, deleteZone);
router.post('/:id/zones/:zoneId/generate-seats', authenticate, isAdmin, generateZoneSeats);

// Admin routes - Seat Management
router.post('/:id/seats', authenticate, isAdmin, addSeats);
router.put('/:id/seats', authenticate, isAdmin, saveVenueSeats);
router.delete('/:id/seats', authenticate, isAdmin, deleteSeats);
router.put('/:id/seats/:seatId', authenticate, isAdmin, updateSeat);
router.post('/:id/generate-seats', authenticate, isAdmin, generateSeats);

export default router;
