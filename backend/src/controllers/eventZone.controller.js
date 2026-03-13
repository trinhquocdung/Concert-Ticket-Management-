import Concert from '../models/Concert.js';
import EventZone from '../models/EventZone.js';
import TicketClass from '../models/TicketClass.js';
import Seat from '../models/Seat.js';
import ShowSeat from '../models/ShowSeat.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * EventZone Controller - Polygon-based zone drawing
 * 
 * Workflow:
 * 1. Event created, venue selected
 * 2. Organizer sees venue seat map
 * 3. Draws polygon shapes by clicking points
 * 4. Assigns each polygon to a ticket class
 * 5. System calculates which seats are inside each polygon
 * 6. ShowSeats generated with proper ticket class and labels
 */

/**
 * @desc    Get all event zones for a concert
 * @route   GET /api/concerts/:concertId/zones
 * @access  Public
 */
export const getEventZones = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.concertId).populate('venue');

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    const eventZones = await EventZone.find({ concert: concert._id, isActive: true })
      .populate('ticketClass')
      .sort({ floor: 1, section: 1, sortOrder: 1 });

    // Get ticket classes for reference
    const ticketClasses = await TicketClass.find({ concert: concert._id })
      .sort({ sortOrder: 1 });

    res.json({
      success: true,
      data: {
        concert: {
          _id: concert._id,
          title: concert.title,
          venue: concert.venue
        },
        eventZones,
        ticketClasses
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new event zone (draw polygon)
 * @route   POST /api/concerts/:concertId/zones
 * @access  Organizer/Admin
 */
export const createEventZone = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.concertId);

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    // Verify permission
    if (concert.organizer.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'Not authorized to configure this event');
    }

    const {
      name,
      ticketClassId,
      color,
      polygonPoints,
      rowLabelMapping,
      rowLabelSide,
      columnLabelSuffix,
      floor,
      section,
      sortOrder
    } = req.body;

    if (!name || !ticketClassId || !polygonPoints || polygonPoints.length < 3) {
      throw new ApiError(400, 'Name, ticket class, and at least 3 polygon points are required');
    }

    // Validate ticket class
    const ticketClass = await TicketClass.findOne({
      _id: ticketClassId,
      concert: concert._id
    });
    if (!ticketClass) {
      throw new ApiError(400, 'Ticket class not found');
    }

    // Get venue seats to calculate which fall within the polygon
    const venueSeats = await Seat.find({ venue: concert.venue, isActive: true });

    // Create event zone
    const eventZone = new EventZone({
      concert: concert._id,
      ticketClass: ticketClass._id,
      name,
      color: color || ticketClass.color,
      polygonPoints,
      rowLabelMapping: rowLabelMapping ? new Map(Object.entries(rowLabelMapping)) : new Map(),
      rowLabelSide: rowLabelSide || 'LEFT',
      columnLabelSuffix,
      floor,
      section: section || 'CENTER',
      sortOrder: sortOrder || 0
    });

    // Calculate which seats are inside this zone
    await eventZone.calculateSeats(venueSeats);
    await eventZone.save();

    await eventZone.populate('ticketClass');

    res.status(201).json({
      success: true,
      message: `Zone "${name}" created with ${eventZone.seatCount} seats`,
      data: eventZone
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an event zone
 * @route   PUT /api/concerts/:concertId/zones/:zoneId
 * @access  Organizer/Admin
 */
export const updateEventZone = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.concertId);

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    // Verify permission
    if (concert.organizer.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'Not authorized to configure this event');
    }

    const eventZone = await EventZone.findOne({
      _id: req.params.zoneId,
      concert: concert._id
    });

    if (!eventZone) {
      throw new ApiError(404, 'Event zone not found');
    }

    const {
      name,
      ticketClassId,
      color,
      polygonPoints,
      rowLabelMapping,
      rowLabelSide,
      columnLabelSuffix,
      floor,
      section,
      sortOrder,
      isActive
    } = req.body;

    // Update fields
    if (name) eventZone.name = name;
    if (color) eventZone.color = color;
    if (rowLabelSide) eventZone.rowLabelSide = rowLabelSide;
    if (columnLabelSuffix !== undefined) eventZone.columnLabelSuffix = columnLabelSuffix;
    if (floor !== undefined) eventZone.floor = floor;
    if (section) eventZone.section = section;
    if (sortOrder !== undefined) eventZone.sortOrder = sortOrder;
    if (isActive !== undefined) eventZone.isActive = isActive;

    if (rowLabelMapping) {
      eventZone.rowLabelMapping = new Map(Object.entries(rowLabelMapping));
    }

    // Update ticket class if changed
    if (ticketClassId && ticketClassId !== eventZone.ticketClass.toString()) {
      const ticketClass = await TicketClass.findOne({
        _id: ticketClassId,
        concert: concert._id
      });
      if (!ticketClass) {
        throw new ApiError(400, 'Ticket class not found');
      }
      eventZone.ticketClass = ticketClass._id;
      if (!color) eventZone.color = ticketClass.color;
    }

    // Recalculate seats if polygon changed
    if (polygonPoints && polygonPoints.length >= 3) {
      eventZone.polygonPoints = polygonPoints;
      const venueSeats = await Seat.find({ venue: concert.venue, isActive: true });
      await eventZone.calculateSeats(venueSeats);
    }

    await eventZone.save();
    await eventZone.populate('ticketClass');

    res.json({
      success: true,
      message: 'Zone updated successfully',
      data: eventZone
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an event zone
 * @route   DELETE /api/concerts/:concertId/zones/:zoneId
 * @access  Organizer/Admin
 */
export const deleteEventZone = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.concertId);

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    // Verify permission
    if (concert.organizer.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'Not authorized to configure this event');
    }

    const eventZone = await EventZone.findOneAndDelete({
      _id: req.params.zoneId,
      concert: concert._id
    });

    if (!eventZone) {
      throw new ApiError(404, 'Event zone not found');
    }

    // Also delete show seats for this zone
    await ShowSeat.deleteMany({
      concert: concert._id,
      eventZone: req.params.zoneId
    });

    res.json({
      success: true,
      message: 'Zone deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate ShowSeats from all event zones
 * @route   POST /api/concerts/:concertId/zones/generate-seats
 * @access  Organizer/Admin
 */
export const generateEventSeats = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.concertId);

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    // Verify permission
    if (concert.organizer.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'Not authorized to configure this event');
    }

    const { clearExisting = true } = req.body;

    // Clear existing show seats
    if (clearExisting) {
      await ShowSeat.deleteMany({ concert: concert._id });
    }

    // Get all event zones
    const eventZones = await EventZone.find({ concert: concert._id, isActive: true })
      .populate('ticketClass');

    if (eventZones.length === 0) {
      throw new ApiError(400, 'No zones configured. Draw zones on the seat map first.');
    }

    // Get venue seats
    const venueSeats = await Seat.find({ venue: concert.venue, isActive: true });

    // Recalculate zone seats (in case venue seats changed)
    for (const zone of eventZones) {
      await zone.calculateSeats(venueSeats);
      await zone.save();
    }

    // Group seats by zone (a seat can only belong to one zone)
    // Later zones take priority over earlier ones
    const seatToZoneMap = new Map();
    
    for (const zone of eventZones) {
      for (const seatId of zone.seatIds) {
        seatToZoneMap.set(seatId.toString(), zone);
      }
    }

    // Create ShowSeats
    const showSeatsToCreate = [];
    const seatMap = new Map(venueSeats.map(s => [s._id.toString(), s]));

    for (const [seatIdStr, zone] of seatToZoneMap) {
      const seat = seatMap.get(seatIdStr);
      if (!seat) continue;

      // Calculate row label
      const rowLabel = zone.getRowLabel(seat.rowNumber || 1);
      const displayLabel = zone.getSeatLabel(seat.rowNumber || 1, seat.number);

      showSeatsToCreate.push({
        concert: concert._id,
        seat: seat._id,
        eventZone: zone._id,
        ticketClass: zone.ticketClass._id,
        status: 'AVAILABLE',
        price: zone.ticketClass.price,
        displayRowLabel: rowLabel,
        displayLabel: displayLabel
      });
    }

    if (showSeatsToCreate.length > 0) {
      await ShowSeat.insertMany(showSeatsToCreate, { ordered: false });
    }

    // Update concert stats
    concert.totalTickets = showSeatsToCreate.length;
    await concert.save();

    // Update ticket class quotas
    for (const zone of eventZones) {
      const count = await ShowSeat.countDocuments({
        concert: concert._id,
        ticketClass: zone.ticketClass._id
      });
      await TicketClass.findByIdAndUpdate(zone.ticketClass._id, { quota: count });
    }

    // Get zone stats
    const zoneStats = await Promise.all(eventZones.map(async zone => ({
      zoneName: zone.name,
      ticketClass: zone.ticketClass.name,
      seatCount: zone.seatCount,
      color: zone.color
    })));

    res.status(201).json({
      success: true,
      message: `Generated ${showSeatsToCreate.length} show seats`,
      data: {
        totalSeats: showSeatsToCreate.length,
        zoneStats
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(400, 'Duplicate seats detected. Try clearing existing seats first.');
    }
    next(error);
  }
};

/**
 * @desc    Get complete seat map for an event (for display)
 * @route   GET /api/concerts/:concertId/seatmap
 * @access  Public
 */
export const getEventSeatMap = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.concertId)
      .populate('venue');

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    // Get venue info
    const venue = concert.venue;

    // Get all venue seats (the base map)
    const venueSeats = await Seat.find({ venue: venue._id, isActive: true })
      .sort({ rowNumber: 1, number: 1 });

    // Get event zones
    const eventZones = await EventZone.find({ concert: concert._id, isActive: true })
      .populate('ticketClass')
      .sort({ floor: 1, section: 1, sortOrder: 1 });

    // Get show seats (if generated)
    const showSeats = await ShowSeat.find({ concert: concert._id });
    const showSeatMap = new Map(showSeats.map(ss => [ss.seat.toString(), ss]));

    // Build seat data with status
    const seatsWithStatus = venueSeats.map(seat => {
      const showSeat = showSeatMap.get(seat._id.toString());
      return {
        _id: seat._id,
        x: seat.x,
        y: seat.y,
        row: seat.row,
        rowNumber: seat.rowNumber,
        number: seat.number,
        label: showSeat?.displayLabel || seat.label,
        status: showSeat?.status || 'UNASSIGNED',
        ticketClass: showSeat?.ticketClass,
        eventZone: showSeat?.eventZone,
        price: showSeat?.price
      };
    });

    // Group by zone for display
    const seatsByZone = {};
    for (const zone of eventZones) {
      seatsByZone[zone._id] = {
        zone: {
          _id: zone._id,
          name: zone.name,
          color: zone.color,
          floor: zone.floor,
          section: zone.section,
          polygonPoints: zone.polygonPoints,
          ticketClass: zone.ticketClass,
          rowLabelMapping: zone.rowLabelMapping,
          rowLabelSide: zone.rowLabelSide
        },
        seats: seatsWithStatus.filter(s => 
          s.eventZone?.toString() === zone._id.toString()
        )
      };
    }

    // Get ticket class legend
    const ticketClasses = await TicketClass.find({ concert: concert._id })
      .sort({ sortOrder: 1 });

    // Stats
    const stats = {
      totalVenueSeats: venueSeats.length,
      assignedSeats: showSeats.length,
      unassignedSeats: venueSeats.length - showSeats.length,
      available: showSeats.filter(s => s.status === 'AVAILABLE').length,
      locked: showSeats.filter(s => s.status === 'LOCKED').length,
      sold: showSeats.filter(s => s.status === 'SOLD').length
    };

    res.json({
      success: true,
      data: {
        concert: {
          _id: concert._id,
          title: concert.title,
          start_time: concert.start_time,
          venue: {
            _id: venue._id,
            name: venue.name,
            canvas: venue.canvas,
            stage: venue.stage
          }
        },
        venueSeats: seatsWithStatus,
        eventZones: eventZones.map(z => ({
          _id: z._id,
          name: z.name,
          color: z.color,
          floor: z.floor,
          section: z.section,
          polygonPoints: z.polygonPoints,
          ticketClass: z.ticketClass,
          seatCount: z.seatCount,
          rowLabelMapping: Object.fromEntries(z.rowLabelMapping || new Map()),
          rowLabelSide: z.rowLabelSide
        })),
        seatsByZone,
        ticketClasses: ticketClasses.map(tc => ({
          _id: tc._id,
          name: tc.name,
          color: tc.color,
          price: tc.price,
          quota: tc.quota,
          available_qty: tc.available_qty
        })),
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Batch create/update zones
 * @route   POST /api/concerts/:concertId/zones/batch
 * @access  Organizer/Admin
 */
export const batchSaveZones = async (req, res, next) => {
  try {
    const concert = await Concert.findById(req.params.concertId);

    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }

    // Verify permission
    if (concert.organizer.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'Not authorized to configure this event');
    }

    const { zones, deleteZoneIds } = req.body;

    // Delete specified zones
    if (deleteZoneIds && deleteZoneIds.length > 0) {
      await EventZone.deleteMany({
        _id: { $in: deleteZoneIds },
        concert: concert._id
      });
    }

    // Get venue seats for calculation
    const venueSeats = await Seat.find({ venue: concert.venue, isActive: true });

    const results = [];

    // Create or update zones
    for (const zoneData of zones || []) {
      let eventZone;

      if (zoneData._id) {
        // Update existing
        eventZone = await EventZone.findOne({
          _id: zoneData._id,
          concert: concert._id
        });
        if (eventZone) {
          Object.assign(eventZone, {
            name: zoneData.name,
            ticketClass: zoneData.ticketClassId,
            color: zoneData.color,
            polygonPoints: zoneData.polygonPoints,
            rowLabelMapping: zoneData.rowLabelMapping ? 
              new Map(Object.entries(zoneData.rowLabelMapping)) : eventZone.rowLabelMapping,
            rowLabelSide: zoneData.rowLabelSide,
            columnLabelSuffix: zoneData.columnLabelSuffix,
            floor: zoneData.floor,
            section: zoneData.section,
            sortOrder: zoneData.sortOrder
          });
        }
      } else {
        // Create new
        eventZone = new EventZone({
          concert: concert._id,
          ticketClass: zoneData.ticketClassId,
          name: zoneData.name,
          color: zoneData.color,
          polygonPoints: zoneData.polygonPoints,
          rowLabelMapping: zoneData.rowLabelMapping ? 
            new Map(Object.entries(zoneData.rowLabelMapping)) : new Map(),
          rowLabelSide: zoneData.rowLabelSide || 'LEFT',
          columnLabelSuffix: zoneData.columnLabelSuffix,
          floor: zoneData.floor,
          section: zoneData.section || 'CENTER',
          sortOrder: zoneData.sortOrder || 0
        });
      }

      if (eventZone) {
        await eventZone.calculateSeats(venueSeats);
        await eventZone.save();
        results.push(eventZone);
      }
    }

    res.json({
      success: true,
      message: `Saved ${results.length} zones`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getEventZones,
  createEventZone,
  updateEventZone,
  deleteEventZone,
  generateEventSeats,
  getEventSeatMap,
  batchSaveZones
};
