import Concert from '../models/Concert.js';
import Category from '../models/Category.js';
import TicketClass from '../models/TicketClass.js';
import ShowSeat from '../models/ShowSeat.js';
import Seat from '../models/Seat.js';
import Venue from '../models/Venue.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Concert Controller
 * Handles concert/event management
 * 
 * NEW STRUCTURE:
 * - Seats belong to Venues directly
 * - TicketClasses belong to Concerts (pricing tiers with colors)
 * - ShowSeat links Seat + Concert + TicketClass (seat assignment/painting)
 */

/**
 * @desc    Get all concerts (public, with filters)
 * @route   GET /api/concerts
 * @access  Public
 */
export const getConcerts = async (req, res, next) => {
  try {
    const rawQuery = req.query || {};
    let {
      page = 1,
      limit = 12,
      category,
      genre,
      status = 'PUB',
      search,
      startDate,
      endDate,
      venue,
      city,
      artist,
      featured,
      trending,
      sortBy = 'start_time',
      sortOrder = 'asc'
    } = rawQuery;

    // Support sortBy with leading '-' (e.g. -base_price)
    if (typeof sortBy === 'string' && sortBy.startsWith('-')) {
      sortOrder = 'desc';
      sortBy = sortBy.substring(1);
    }

    const query = {};

    // For public (no user or customer), only show published concerts
    if (!req.user || req.user.role === 'CUS') {
      query.status = 'PUB';
      // Show events that have at least one future performance OR (no performances) and haven't ended yet
      // - If `performances` array exists, check any performance.date >= now
      // - Otherwise, fallback to top-level end_time/start_time
      const now = new Date();
      query.$or = [
        { 'performances.date': { $gte: now } },
        { end_time: { $gte: now } },
        { end_time: null, start_time: { $gte: now } }
      ];
    } else {
      if (status && status !== 'all') {
        query.status = status;
      }
    }

    if (category) {
      // allow comma-separated category slugs/ids for multi-select
      const parts = String(category).split(',').map(p => p.trim()).filter(Boolean);
      const ids = [];
      for (const p of parts) {
        if (p.match(/^[0-9a-fA-F]{24}$/)) {
          ids.push(p);
        } else {
          const cat = await Category.findOne({ slug: p });
          if (cat) ids.push(cat._id);
        }
      }
      if (ids.length === 1) query.category = ids[0];
      else if (ids.length > 1) query.category = { $in: ids };
    }

    if (genre) {
      query.genre = { $regex: genre, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.start_time = query.start_time || {};
      const parseDateOnlyToLocal = (s) => {
        if (!s) return null;
        // Expecting YYYY-MM-DD or ISO; prefer explicit parse for date-only strings
        const parts = String(s).split('-').map(Number);
        if (parts.length >= 3 && parts.every(p => !Number.isNaN(p))) {
          const [y, m, d] = parts;
          return new Date(y, m - 1, d, 0, 0, 0, 0);
        }
        return new Date(s);
      };
      if (startDate) {
        const sd = parseDateOnlyToLocal(startDate);
        sd.setHours(0,0,0,0);
        query.start_time.$gte = sd;
      }
      if (endDate) {
        const ed = parseDateOnlyToLocal(endDate);
        ed.setHours(23,59,59,999);
        query.start_time.$lte = ed;
      }
    }

    if (venue) query.venue = venue;
    // filter by city (find venues in the city and restrict concerts to those venues)
    if (city) {
      const venuesInCity = await Venue.find({ city: { $regex: city, $options: 'i' } }).select('_id');
      const venueIds = venuesInCity.map(v => v._id);
      if (venueIds.length > 0) query.venue = { $in: venueIds };
      else query.venue = null; // no venues -> no concerts
    }
    if (artist) query.artists = artist;
    if (featured === 'true') query.featured = true;
    if (trending === 'true') query.trending = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [concerts, total] = await Promise.all([
      Concert.find(query)
        .populate('category', 'name slug icon color')
        .populate('venue', 'name address city')
        .populate('artists', 'name bio')
        .populate('organizer', 'username organizer.company_name')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Concert.countDocuments(query)
    ]);

    // Get price range for each concert
    const concertsWithPrices = await Promise.all(
      concerts.map(async (concert) => {
        const ticketClasses = await TicketClass.find({ concert: concert._id });
        const prices = ticketClasses.map(tc => tc.price);
        return {
          ...concert.toObject(),
          priceRange: {
            min: prices.length ? Math.min(...prices) : 0,
            max: prices.length ? Math.max(...prices) : 0
          },
          ticketClasses: ticketClasses.map(tc => ({
            _id: tc._id,
            name: tc.name,
            price: tc.price,
            color: tc.color,
            available: tc.available_qty
          }))
        };
      })
    );

    res.json({
      success: true,
      data: {
        concerts: concertsWithPrices,
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
 * @desc    Get single concert by ID
 * @route   GET /api/concerts/:id
 * @access  Public
 */
export const getConcertById = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.id)
      .populate('category', 'name slug icon color')
      .populate('venue')
      .populate('artists')
      .populate('organizer', 'username fullName organizer');

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    // Increment view count
    concert.viewCount += 1;
    await concert.save();

    // Get ticket classes (pricing tiers)
    const ticketClasses = await TicketClass.find({ concert: concert._id })
      .sort({ sortOrder: 1, price: -1 });

    // Get seat availability summary by ticket class
    const seatStats = await ShowSeat.aggregate([
      { $match: { concert: concert._id } },
      {
        $group: {
          _id: '$ticketClass',
          total: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] }
          },
          sold: {
            $sum: { $cond: [{ $eq: ['$status', 'SOLD'] }, 1, 0] }
          },
          locked: {
            $sum: { $cond: [{ $eq: ['$status', 'LOCKED'] }, 1, 0] }
          }
        }
      }
    ]);

    // Merge stats with ticket classes
    const ticketClassesWithStats = ticketClasses.map(tc => {
      const stats = seatStats.find(s => s._id?.toString() === tc._id.toString()) || {
        total: 0, available: 0, sold: 0, locked: 0
      };
      return {
        ...tc.toObject(),
        seatStats: stats
      };
    });

    // Enrich performances with computed start/end datetimes and whether in past
    const now = new Date();
    const enrichedPerformances = (concert.performances || []).map(p => {
      const startDt = (function() {
        try {
          const d = new Date(p.date);
          if (p.startTime) {
            const parts = String(p.startTime).split(':').map(Number);
            d.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
          }
          return d;
        } catch (e) { return new Date(p.date); }
      })();
      const endDt = (function() {
        try {
          const d = new Date(p.date);
          if (p.endTime) {
            const parts = String(p.endTime).split(':').map(Number);
            d.setHours(parts[0] || 0, parts[1] || 0, 0, 0);
          } else if (p.startTime) {
            const parts = String(p.startTime).split(':').map(Number);
            d.setHours((parts[0] || 0) + 4, parts[1] || 0, 0, 0);
          }
          return d;
        } catch (e) { return new Date(p.date); }
      })();
      return {
        _id: p._id,
        date: p.date,
        startTime: p.startTime,
        endTime: p.endTime,
        ticket_classes: p.ticket_classes,
        startDateTime: startDt,
        endDateTime: endDt,
        isPast: endDt < now
      };
    });

    // replace performances in returned concert object with enriched version
    const concertObj = concert.toObject();
    concertObj.performances = enrichedPerformances;

    res.json({
      success: true,
      data: {
        concert: concertObj,
        ticketClasses: ticketClassesWithStats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new concert
 * @route   POST /api/concerts
 * @access  Admin, Organizer
 */
export const createConcert = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      genre,
      start_time,
      end_time,
      venue,
      artists,
      thumbnail,
      images,
      policies,
      ticketClasses // Array of { name, price, color }
    } = req.body;

    // Verify venue exists
    const venueDoc = await Venue.findById(venue);
    if (!venueDoc) {
      throw new ApiError(404, 'Venue not found');
    }

    // If performances provided but top-level start_time/end_time missing,
    // derive them from the first performance (local date + startTime/endTime)
    const performancesPayload = req.body.performances || [];
    let derivedStart = start_time;
    let derivedEnd = end_time;
    if ((!start_time || !end_time) && performancesPayload.length > 0) {
      const first = performancesPayload[0];
      if (first && first.date) {
        try {
          const d = new Date(first.date);
          const y = d.getFullYear();
          const m = d.getMonth();
          const day = d.getDate();
          if (!derivedStart && first.startTime) {
            const [hh, mm] = first.startTime.split(':').map(Number);
            derivedStart = new Date(y, m, day, hh || 0, mm || 0).toISOString();
          }
          if (!derivedEnd && first.endTime) {
            const [hh, mm] = first.endTime.split(':').map(Number);
            derivedEnd = new Date(y, m, day, hh || 0, mm || 0).toISOString();
          }
        } catch (err) {
          // ignore parse errors here; Mongoose will validate later
        }
      }
    }

    // Create concert
    const concert = await Concert.create({
      title,
      description,
      category,
      genre,
      start_time: derivedStart,
      end_time: derivedEnd,
      venue,
      organizer: req.user._id,
      artists: artists || [],
      thumbnail,
      images: images || [],
      policies: policies || {},
      performances: performancesPayload,
      status: req.user.role === 'ADMIN' ? 'PUB' : 'DRAFT'
    });

    // Create ticket classes if provided
    if (ticketClasses && ticketClasses.length > 0) {
      for (let i = 0; i < ticketClasses.length; i++) {
        const tc = ticketClasses[i];
        await TicketClass.create({
          concert: concert._id,
          name: tc.name,
          color: tc.color || '#3B82F6',
          price: tc.price,
          quota: tc.quota || 0,
          open_time: tc.open_time,
          close_time: tc.close_time,
          sortOrder: i
        });
      }
    }

    // Note: ShowSeats are created when admin "paints" seats with ticket classes
    // via the Event Zone Painter

    res.status(201).json({
      success: true,
      message: 'Concert created successfully',
      data: concert
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update concert
 * @route   PUT /api/concerts/:id
 * @access  Admin, Organizer (own concerts)
 */
export const updateConcert = async (req, res, next) => {
  try {
    let concert = await Concert.findById(req.params.id);

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    // Check ownership for organizers
    if (req.user.role === 'ORG' && concert.organizer.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You can only update your own concerts');
    }

    const allowedUpdates = [
      'title', 'description', 'category', 'genre',
      'start_time', 'end_time', 'thumbnail', 'images',
      'policies', 'artists', 'featured', 'trending',
      'performances'
    ];

    if (req.user.role === 'ADMIN') {
      allowedUpdates.push('status', 'venue');
    }

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // If performances are provided in the update payload, derive top-level start_time/end_time
    if (req.body.performances && Array.isArray(req.body.performances) && req.body.performances.length > 0) {
      const first = req.body.performances[0];
      if (first && first.date) {
        try {
          const d = new Date(first.date);
          const y = d.getFullYear();
          const m = d.getMonth();
          const day = d.getDate();
          if (first.startTime && !updates.start_time) {
            const [hh, mm] = String(first.startTime).split(':').map(Number);
            updates.start_time = new Date(y, m, day, hh || 0, mm || 0).toISOString();
          }
          if (first.endTime && !updates.end_time) {
            const [hh, mm] = String(first.endTime).split(':').map(Number);
            updates.end_time = new Date(y, m, day, hh || 0, mm || 0).toISOString();
          }
        } catch (err) {
          // ignore parse errors; validation will catch invalid values
        }
      }
    }

    concert = await Concert.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('category venue artists organizer');

    res.json({
      success: true,
      message: 'Concert updated successfully',
      data: concert
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete concert
 * @route   DELETE /api/concerts/:id
 * @access  Admin
 */
export const deleteConcert = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.id);

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    const soldSeats = await ShowSeat.countDocuments({
      concert: concert._id,
      status: 'SOLD'
    });

    if (soldSeats > 0) {
      throw new ApiError(400, 'Cannot delete concert with sold tickets. Cancel it instead.');
    }

    await Promise.all([
      TicketClass.deleteMany({ concert: concert._id }),
      ShowSeat.deleteMany({ concert: concert._id }),
      Concert.findByIdAndDelete(concert._id)
    ]);

    res.json({
      success: true,
      message: 'Concert deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get concert seats/seating map with ticket class colors
 * @route   GET /api/concerts/:id/seats
 * @access  Public
 */
export const getConcertSeats = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.id).populate('venue');

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    // Get all venue seats
    const venueSeats = await Seat.find({ venue: concert.venue._id });

    // Get ticket classes for this concert
    const ticketClasses = await TicketClass.find({ concert: concert._id });

    // Get show seats (seat assignments)
    // If caller provided a `performanceId` query param, prefer show seats for that performance.
    // This prevents locks/sales from other performances (past shows) affecting the current one.
    const performanceId = req.query.performanceId || null;
    const showSeatFilter = { concert: concert._id };
    if (performanceId) showSeatFilter.performance = performanceId;

    // Include ticketClass sale window fields so we can enforce sale-window when returning seats
    let showSeats = await ShowSeat.find(showSeatFilter)
      .populate('seat')
      .populate('ticketClass', 'name price color open_time close_time')
      .populate('locked_by', '_id');

    // If client requested a performance but no per-performance showSeats exist yet,
    // fall back to global showSeats for the concert to preserve backward compatibility.
    if (performanceId && (!showSeats || showSeats.length === 0)) {
      showSeats = await ShowSeat.find({ concert: concert._id })
        .populate('seat')
        .populate('ticketClass', 'name price color open_time close_time')
        .populate('locked_by', '_id');
    }

    // Create a map for quick lookup
    const showSeatMap = {};
    showSeats.forEach(ss => {
      // include locked_by id and whether locked by current requester
      const lockedById = ss.locked_by ? ss.locked_by._id || ss.locked_by : null;
      const lockedByCurrentUser = req.user ? (lockedById && req.user._id.toString() === lockedById.toString()) : false;
      // compute effective status later; keep original object available
      showSeatMap[ss.seat._id.toString()] = { ...ss.toObject(), lockedById, lockedByCurrentUser };
    });

    // Build seat map with assignment info
    const seatMap = venueSeats.map(seat => {
      const showSeat = showSeatMap[seat._id.toString()];
      return {
        _id: seat._id,
        row: seat.row,
        number: seat.number,
        label: seat.label,
        x: seat.x,
        y: seat.y,
        rotation: seat.rotation,
        seatType: seat.seatType,
        isActive: seat.isActive,
        // Show seat assignment info (if assigned to this concert)
        showSeatId: showSeat?._id,
        // If the assigned ticketClass has a closed sale window, mark returned status as LOCKED so UI treats it as unavailable
        status: (function() {
          const s = showSeat?.status || 'UNASSIGNED';
          const tc = showSeat?.ticketClass;
          if (tc && (tc.open_time || tc.close_time)) {
            const now = new Date();
            if ((tc.open_time && new Date(tc.open_time) > now) || (tc.close_time && new Date(tc.close_time) < now)) {
              return 'LOCKED';
            }
          }
          return s;
        })(),
        lockedById: showSeat?.lockedById || null,
        lockedByCurrentUser: showSeat?.lockedByCurrentUser || false,
        ticketClass: showSeat?.ticketClass ? {
          _id: showSeat.ticketClass._id,
          name: showSeat.ticketClass.name,
          price: showSeat.ticketClass.price,
          color: showSeat.ticketClass.color
        } : null,
        price: showSeat?.price || showSeat?.ticketClass?.price || 0
      };
    }).sort((a, b) => {
      // Sort by row first, then by seat number within each row
      const rowCompare = String(a.row).localeCompare(String(b.row));
      if (rowCompare !== 0) return rowCompare;
      return a.number - b.number;
    });
    // Recompute stats based on effective returned statuses
    const returnedAvailable = showSeats.filter(ss => {
      const tc = ss.ticketClass;
      const now = new Date();
      if (tc && (tc.open_time || tc.close_time)) {
        if ((tc.open_time && new Date(tc.open_time) > now) || (tc.close_time && new Date(tc.close_time) < now)) {
          return false;
        }
      }
      return ss.status === 'AVAILABLE';
    }).length;

    res.json({
      success: true,
      data: {
        venue: {
          _id: concert.venue._id,
          name: concert.venue.name,
          total_capacity: concert.venue.total_capacity
        },
        ticketClasses,
        seats: seatMap,
        stats: {
          total: venueSeats.length,
          assigned: showSeats.length,
          unassigned: venueSeats.length - showSeats.length,
          available: returnedAvailable,
          sold: showSeats.filter(ss => ss.status === 'SOLD').length,
          locked: showSeats.filter(ss => ss.status === 'LOCKED').length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign seats to ticket class ("paint" seats)
 * @route   POST /api/concerts/:id/assign-seats
 * @access  Admin, Organizer
 */
export const assignSeatsToTicketClass = async (req, res, next) => {
  try {
    const { ticketClassId, seatIds } = req.body;

    const concert = await Concert.findById(req.params.id);
    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    // Check ownership for organizers
    if (req.user.role === 'ORG' && concert.organizer.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You can only update your own concerts');
    }

    const ticketClass = await TicketClass.findOne({
      _id: ticketClassId,
      concert: concert._id
    });

    if (!ticketClass) {
      throw new ApiError(404, 'Ticket class not found');
    }

    // Verify all seats belong to the concert's venue
    const seats = await Seat.find({
      _id: { $in: seatIds },
      venue: concert.venue
    });

    if (seats.length !== seatIds.length) {
      throw new ApiError(400, 'Some seats do not belong to this venue');
    }

    // Create or update show seats
    // Create or update show seats. If the concert has multiple performances, create per-performance showSeats
    const operations = [];
    if (Array.isArray(concert.performances) && concert.performances.length > 0) {
      // create/upsert a ShowSeat per performance
      for (const seatId of seatIds) {
        for (const p of concert.performances) {
          const perfId = p._id;
          operations.push({
            updateOne: {
              filter: { concert: concert._id, seat: seatId, performance: perfId },
              update: {
                $set: {
                  ticketClass: ticketClass._id,
                  price: ticketClass.price,
                  status: 'AVAILABLE',
                  performance: perfId
                }
              },
              upsert: true
            }
          });
        }
      }
    } else {
      // legacy: single show-level showSeat
      for (const seatId of seatIds) {
        operations.push({
          updateOne: {
            filter: { concert: concert._id, seat: seatId },
            update: {
              $set: {
                ticketClass: ticketClass._id,
                price: ticketClass.price,
                status: 'AVAILABLE'
              }
            },
            upsert: true
          }
        });
      }
    }

    if (operations.length > 0) await ShowSeat.bulkWrite(operations);

    // Update ticket class quota
    const assignedCount = await ShowSeat.countDocuments({
      concert: concert._id,
      ticketClass: ticketClass._id
    });
    ticketClass.quota = assignedCount;
    await ticketClass.save();

    // Update concert total tickets
    const totalAssigned = await ShowSeat.countDocuments({ concert: concert._id });
    concert.totalTickets = totalAssigned;
    await concert.save();

    res.json({
      success: true,
      message: `Assigned ${seatIds.length} seats to ${ticketClass.name}`,
      data: {
        ticketClass: {
          ...ticketClass.toObject(),
          quota: assignedCount
        },
        totalAssigned
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove seat assignments (unassign from ticket class)
 * @route   DELETE /api/concerts/:id/assign-seats
 * @access  Admin, Organizer
 */
export const unassignSeats = async (req, res, next) => {
  try {
    const { seatIds } = req.body;

    const concert = await Concert.findById(req.params.id);
    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    if (req.user.role === 'ORG' && concert.organizer.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You can only update your own concerts');
    }

    // Check if any seats are sold
    const soldSeats = await ShowSeat.countDocuments({
      concert: concert._id,
      seat: { $in: seatIds },
      status: 'SOLD'
    });

    if (soldSeats > 0) {
      throw new ApiError(400, 'Cannot unassign seats that have been sold');
    }

    // Delete show seats
    const result = await ShowSeat.deleteMany({
      concert: concert._id,
      seat: { $in: seatIds }
    });

    // Update ticket class quotas
    const ticketClasses = await TicketClass.find({ concert: concert._id });
    for (const tc of ticketClasses) {
      const count = await ShowSeat.countDocuments({
        concert: concert._id,
        ticketClass: tc._id
      });
      tc.quota = count;
      await tc.save();
    }

    // Update concert total
    const totalAssigned = await ShowSeat.countDocuments({ concert: concert._id });
    concert.totalTickets = totalAssigned;
    await concert.save();

    res.json({
      success: true,
      message: `Unassigned ${result.deletedCount} seats`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Publish concert
 * @route   PUT /api/concerts/:id/publish
 * @access  Admin
 */
export const publishConcert = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.id);

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    if (concert.status === 'PUB') {
      throw new ApiError(400, 'Concert is already published');
    }

    // Check if seats are assigned
    const assignedSeats = await ShowSeat.countDocuments({ concert: concert._id });
    if (assignedSeats === 0) {
      throw new ApiError(400, 'Cannot publish concert without assigning seats to ticket classes');
    }

    concert.status = 'PUB';
    await concert.save();

    res.json({
      success: true,
      message: 'Concert published successfully',
      data: concert
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel concert
 * @route   PUT /api/concerts/:id/cancel
 * @access  Admin
 */
export const cancelConcert = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.id);

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    concert.status = 'CANCEL';
    await concert.save();

    res.json({
      success: true,
      message: 'Concert cancelled. Customer notifications will be sent.',
      data: concert
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organizer's concerts
 * @route   GET /api/concerts/my-concerts
 * @access  Organizer
 */
export const getMyConcerts = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = { organizer: req.user._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [concerts, total] = await Promise.all([
      Concert.find(query)
        .populate('venue', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Concert.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        concerts,
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
 * @desc    Get featured/trending concerts
 * @route   GET /api/concerts/featured
 * @access  Public
 */
export const getFeaturedConcerts = async (req, res, next) => {
  try {
    const { type = 'featured', limit = 6 } = req.query;

    const query = {
      status: 'PUB',
      $or: [
        { end_time: { $gte: new Date() } },
        { end_time: null, start_time: { $gte: new Date() } }
      ]
    };

    if (type === 'featured') {
      query.featured = true;
    } else if (type === 'trending') {
      query.trending = true;
    }

    const concerts = await Concert.find(query)
      .populate('venue', 'name address')
      .populate('artists', 'name image')
      .sort({ viewCount: -1, start_time: 1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: concerts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add ticket class to concert
 * @route   POST /api/concerts/:id/ticket-classes
 * @access  Admin, Organizer
 */
export const addTicketClass = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.id);

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    if (req.user.role === 'ORG' && concert.organizer.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You can only update your own concerts');
    }

    const { name, color, price, open_time, close_time } = req.body;

    // Get max sortOrder
    const maxOrder = await TicketClass.findOne({ concert: concert._id })
      .sort({ sortOrder: -1 })
      .select('sortOrder');

    const ticketClass = await TicketClass.create({
      concert: concert._id,
      name,
      color: color || '#3B82F6',
      price,
      quota: 0,
      // description/benefits removed
      open_time,
      close_time,
      sortOrder: (maxOrder?.sortOrder || 0) + 1
    });

    res.status(201).json({
      success: true,
      message: 'Ticket class created',
      data: ticketClass
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update ticket class
 * @route   PUT /api/concerts/:id/ticket-classes/:ticketClassId
 * @access  Admin, Organizer
 */
export const updateTicketClass = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.id);

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    if (req.user.role === 'ORG' && concert.organizer.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You can only update your own concerts');
    }

    const ticketClass = await TicketClass.findOneAndUpdate(
      { _id: req.params.ticketClassId, concert: concert._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!ticketClass) {
      throw new ApiError(404, 'Ticket class not found');
    }

    // Update prices in ShowSeats if price changed
    let updatedSeatCount = 0;
    if (req.body.price !== undefined) {
      // By default only update AVAILABLE seats. Admin may include LOCKED seats
      // by setting query param `includeLocked=true` or sending `includeLocked` in body.
      const includeLocked = (req.query.includeLocked === 'true') || (req.body.includeLocked === true);
      const statuses = includeLocked ? ['AVAILABLE', 'LOCKED'] : ['AVAILABLE'];

      // Find affected show seats first so we can emit their IDs to clients
      const affectedSeats = await ShowSeat.find(
        { concert: concert._id, ticketClass: ticketClass._id, status: { $in: statuses } }
      ).select('_id').lean();
      const seatIds = affectedSeats.map(s => s._id.toString());

      const result = await ShowSeat.updateMany(
        { concert: concert._id, ticketClass: ticketClass._id, status: { $in: statuses } },
        { $set: { price: req.body.price } }
      );
      updatedSeatCount = result.modifiedCount || result.nModified || 0;

      // Emit socket event to notify connected clients viewing this concert
      try {
        const io = req.app && req.app.get && req.app.get('io');
        if (io && seatIds.length > 0) {
          io.to(`concert:${concert._id}`).emit('seats-price-updated', {
            seatIds,
            ticketClassId: ticketClass._id,
            price: req.body.price,
            updatedSeatCount
          });
        }
      } catch (err) {
        // do not fail the request if socket emit fails
        console.error('Failed to emit seats-price-updated', err);
      }
    }

    // Emit sale window updates if open_time/close_time changed
    if (req.body.open_time !== undefined || req.body.close_time !== undefined) {
      try {
        const affectedSeats = await ShowSeat.find({ concert: concert._id, ticketClass: ticketClass._id }).select('_id').lean();
        const seatIds = affectedSeats.map(s => s._id.toString());
        const io = req.app && req.app.get && req.app.get('io');
        if (io) {
          io.to(`concert:${concert._id}`).emit('seats-sale-window-updated', {
            seatIds,
            ticketClassId: ticketClass._id,
            open_time: ticketClass.open_time,
            close_time: ticketClass.close_time
          });
        }
      } catch (err) {
        console.error('Failed to emit seats-sale-window-updated', err);
      }
    }

    res.json({
      success: true,
      message: 'Ticket class updated',
      data: {
        ticketClass,
        updatedSeatCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete ticket class
 * @route   DELETE /api/concerts/:id/ticket-classes/:ticketClassId
 * @access  Admin, Organizer
 */
export const deleteTicketClass = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.id);

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    if (req.user.role === 'ORG' && concert.organizer.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'You can only update your own concerts');
    }

    // Check if any seats are sold with this ticket class
    const soldSeats = await ShowSeat.countDocuments({
      concert: concert._id,
      ticketClass: req.params.ticketClassId,
      status: 'SOLD'
    });

    if (soldSeats > 0) {
      throw new ApiError(400, 'Cannot delete ticket class with sold seats');
    }

    // Unassign seats from this ticket class
    await ShowSeat.deleteMany({
      concert: concert._id,
      ticketClass: req.params.ticketClassId
    });

    // Delete ticket class
    await TicketClass.findOneAndDelete({
      _id: req.params.ticketClassId,
      concert: concert._id
    });

    res.json({
      success: true,
      message: 'Ticket class deleted'
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getConcerts,
  getConcertById,
  createConcert,
  updateConcert,
  deleteConcert,
  getConcertSeats,
  assignSeatsToTicketClass,
  unassignSeats,
  publishConcert,
  cancelConcert,
  getMyConcerts,
  getFeaturedConcerts,
  addTicketClass,
  updateTicketClass,
  deleteTicketClass
};
