import Artist from '../models/Artist.js';
import Concert from '../models/Concert.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Artist Controller
 * Handles artist/performer operations
 */

/**
 * @desc    Get all artists
 * @route   GET /api/artists
 * @access  Public
 */
export const getArtists = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [artists, total] = await Promise.all([
      Artist.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Artist.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        artists,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get artist by ID
 * @route   GET /api/artists/:id
 * @access  Public
 */
export const getArtistById = async (req, res, next) => {
  try {
    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      throw new ApiError(404, 'Artist not found');
    }

    // Get upcoming and ongoing concerts for this artist
    const concerts = await Concert.find({
      artists: artist._id,
      $or: [
        { end_time: { $gte: new Date() } },
        { end_time: null, start_time: { $gte: new Date() } }
      ],
      status: 'PUBLISHED'
    })
      .populate('venue', 'name city')
      .sort({ start_time: 1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        artist,
        upcoming_concerts: concerts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get artist by slug
 * @route   GET /api/artists/slug/:slug
 * @access  Public
 */
export const getArtistBySlug = async (req, res, next) => {
  try {
    const artist = await Artist.findOne({ slug: req.params.slug });

    if (!artist) {
      throw new ApiError(404, 'Artist not found');
    }

    const concerts = await Concert.find({
      artists: artist._id,
      $or: [
        { end_time: { $gte: new Date() } },
        { end_time: null, start_time: { $gte: new Date() } }
      ],
      status: 'PUBLISHED'
    })
      .populate('venue', 'name city')
      .sort({ start_time: 1 });

    res.json({
      success: true,
      data: {
        artist,
        upcoming_concerts: concerts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create artist
 * @route   POST /api/artists
 * @access  Private (Admin/Organizer)
 */
export const createArtist = async (req, res, next) => {
  try {
    const { name, bio } = req.body;

    const artist = new Artist({
      name,
      bio
    });

    await artist.save();

    res.status(201).json({
      success: true,
      message: 'Artist created successfully',
      data: artist
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update artist
 * @route   PUT /api/artists/:id
 * @access  Private (Admin/Organizer)
 */
export const updateArtist = async (req, res, next) => {
  try {
    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      throw new ApiError(404, 'Artist not found');
    }

    const { name, bio } = req.body;
    
    const updated = await Artist.findByIdAndUpdate(
      req.params.id,
      { name, bio, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Artist updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete artist
 * @route   DELETE /api/artists/:id
 * @access  Private (Admin)
 */
export const deleteArtist = async (req, res, next) => {
  try {
    const artist = await Artist.findById(req.params.id);

    if (!artist) {
      throw new ApiError(404, 'Artist not found');
    }

    // Check if artist has concerts
    const concertCount = await Concert.countDocuments({ artists: artist._id });
    if (concertCount > 0) {
      throw new ApiError(400, `Cannot delete artist. Has ${concertCount} associated concert(s).`);
    }

    await artist.deleteOne();

    res.json({
      success: true,
      message: 'Artist deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get popular artists
 * @route   GET /api/artists/popular
 * @access  Public
 */
export const getPopularArtists = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get artists with most upcoming and ongoing concerts
    const popularArtists = await Concert.aggregate([
      { $match: { $or: [{ end_time: { $gte: new Date() } }, { end_time: null, start_time: { $gte: new Date() } }], status: 'PUBLISHED' } },
      { $unwind: '$artists' },
      { $group: { _id: '$artists', concert_count: { $sum: 1 } } },
      { $sort: { concert_count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'artists',
          localField: '_id',
          foreignField: '_id',
          as: 'artist'
        }
      },
      { $unwind: '$artist' },
      {
        $project: {
          _id: '$artist._id',
          name: '$artist.name',
          bio: '$artist.bio',
          upcoming_concerts: '$concert_count'
        }
      }
    ]);

    res.json({
      success: true,
      data: popularArtists
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getArtists,
  getArtistById,
  getArtistBySlug,
  createArtist,
  updateArtist,
  deleteArtist,
  getPopularArtists
};
