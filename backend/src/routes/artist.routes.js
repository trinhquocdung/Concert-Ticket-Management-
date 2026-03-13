import express from 'express';
import {
  getArtists,
  getArtistById,
  getArtistBySlug,
  createArtist,
  updateArtist,
  deleteArtist,
  getPopularArtists
} from '../controllers/artist.controller.js';
import { protect } from '../middleware/auth.js';
import { isOrganizerOrAdmin, isAdmin } from '../middleware/roles.js';

const router = express.Router();

// Public routes
router.get('/', getArtists);
router.get('/popular', getPopularArtists);
router.get('/slug/:slug', getArtistBySlug);
router.get('/:id', getArtistById);

// Protected routes (Admin/Organizer)
router.post('/', protect, isOrganizerOrAdmin, createArtist);
router.put('/:id', protect, isOrganizerOrAdmin, updateArtist);
router.delete('/:id', protect, isAdmin, deleteArtist);

export default router;
