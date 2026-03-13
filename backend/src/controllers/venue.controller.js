import Venue from '../models/Venue.js';
import Zone from '../models/Zone.js';
import Seat from '../models/Seat.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Venue Controller
 * Handles venue, zone, and seat layout management
 * 
 * NEW STRUCTURE:
 * - Venues contain Zones (physical areas with shapes/bounds)
 * - Zones contain Seats (physical layout templates)
 * - EventZones link zones to events with custom colors, labels, pricing
 * - ShowSeats track seat availability per event
 */

/**
 * @desc    Get all venues
 * @route   GET /api/venues
 * @access  Public
 */
export const getVenues = async (req, res, next) => {
  try {
    const { search, city, page = 1, limit = 20 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [venues, total] = await Promise.all([
      Venue.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Venue.countDocuments(query)
    ]);

    // Add seat count to each venue
    const venuesWithSeats = await Promise.all(
      venues.map(async (venue) => {
        const seatCount = await Seat.countDocuments({ venue: venue._id });
        return {
          ...venue.toObject(),
          seatCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        venues: venuesWithSeats,
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
 * @desc    Get single venue with seats
 * @route   GET /api/venues/:id
 * @access  Public
 */
export const getVenueById = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    const seatCount = await Seat.countDocuments({ venue: venue._id });

    res.json({
      success: true,
      data: {
        venue: {
          ...venue.toObject(),
          seatCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new venue
 * @route   POST /api/venues
 * @access  Admin
 */
export const createVenue = async (req, res, next) => {
  try {
    const { name, address, city, total_capacity, map_image, description, facilities, google_maps_url, contact } = req.body;

    const venue = await Venue.create({
      name,
      address,
      city,
      total_capacity,
      map_image,
      description,
      facilities,
      google_maps_url,
      contact
    });

    res.status(201).json({
      success: true,
      message: 'Venue created successfully',
      data: venue
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update venue
 * @route   PUT /api/venues/:id
 * @access  Admin
 */
export const updateVenue = async (req, res, next) => {
  try {
    const venue = await Venue.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    res.json({
      success: true,
      message: 'Venue updated successfully',
      data: venue
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete venue and all its seats
 * @route   DELETE /api/venues/:id
 * @access  Admin
 */
export const deleteVenue = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    // Delete all seats belonging to this venue
    await Seat.deleteMany({ venue: venue._id });
    await Venue.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Venue and all seats deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all seats for a venue
 * @route   GET /api/venues/:id/seats
 * @access  Public
 */
export const getVenueSeats = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    const seats = await Seat.find({ venue: venue._id }).sort({ row: 1, number: 1 });

    // Group by row for easier rendering
    const seatsByRow = seats.reduce((acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = [];
      acc[seat.row].push(seat);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        venue: {
          _id: venue._id,
          name: venue.name,
          total_capacity: venue.total_capacity
        },
        seats,
        seatsByRow,
        totalSeats: seats.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Save all seats for a venue (replace existing)
 * @route   PUT /api/venues/:id/seats
 * @access  Admin
 */
export const saveVenueSeats = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    const { seats: newSeats } = req.body;

    if (!newSeats || !Array.isArray(newSeats)) {
      throw new ApiError(400, 'Please provide seats array');
    }

    // Validate against venue capacity
    if (newSeats.length > venue.total_capacity) {
      throw new ApiError(400, 
        `Cannot save ${newSeats.length} seats. ` +
        `Exceeds venue capacity of ${venue.total_capacity}.`
      );
    }

    // Delete all existing seats
    await Seat.deleteMany({ venue: venue._id });

    // Insert new seats if any
    let insertedSeats = [];
    if (newSeats.length > 0) {
      const seatsToInsert = newSeats.map((s, idx) => ({
        venue: venue._id,
        zone: s.zone || null, // Optional zone
        row: s.row || String(Math.floor(idx / 20) + 1), // Default row
        rowNumber: s.rowNumber || Math.floor(idx / 20) + 1,
        number: s.number || (idx % 20) + 1,
        label: s.label || `${s.row || Math.floor(idx / 20) + 1}-${s.number || (idx % 20) + 1}`,
        seatType: s.seatType || 'NORMAL',
        isActive: s.isActive !== false,
        x: s.x || 0,
        y: s.y || 0,
        rotation: s.rotation || 0
      }));

      insertedSeats = await Seat.insertMany(seatsToInsert);
    }

    res.json({
      success: true,
      message: `Saved ${insertedSeats.length} seats`,
      data: { 
        seatCount: insertedSeats.length,
        venueCapacity: venue.total_capacity,
        remainingCapacity: venue.total_capacity - insertedSeats.length
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(400, 'Duplicate seat detected (same row and number)');
    }
    next(error);
  }
};

/**
 * @desc    Add seats to venue
 * @route   POST /api/venues/:id/seats
 * @access  Admin
 */
export const addSeats = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    const { seats: newSeats } = req.body;

    if (!newSeats || !Array.isArray(newSeats) || newSeats.length === 0) {
      throw new ApiError(400, 'Please provide seats array');
    }

    // Check current seat count
    const currentSeatCount = await Seat.countDocuments({ venue: venue._id });
    const newTotalSeats = currentSeatCount + newSeats.length;

    if (newTotalSeats > venue.total_capacity) {
      const remaining = venue.total_capacity - currentSeatCount;
      throw new ApiError(400, 
        `Cannot add ${newSeats.length} seats. ` +
        `Only ${remaining} seats can be added (current: ${currentSeatCount}, capacity: ${venue.total_capacity}).`
      );
    }

    const seatsToInsert = newSeats.map(s => ({
      venue: venue._id,
      row: s.row,
      number: s.number,
      label: s.label || `${s.row}${s.number}`,
      seatType: s.seatType || 'NORMAL',
      isActive: s.isActive !== false,
      x: s.x || 0,
      y: s.y || 0,
      rotation: s.rotation || 0
    }));

    const insertedSeats = await Seat.insertMany(seatsToInsert, { ordered: false });

    res.status(201).json({
      success: true,
      message: `Added ${insertedSeats.length} seats`,
      data: { 
        insertedCount: insertedSeats.length,
        totalSeats: newTotalSeats,
        venueCapacity: venue.total_capacity
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(400, 'Some seats already exist (duplicate row/number)');
    }
    next(error);
  }
};

/**
 * @desc    Delete specific seats
 * @route   DELETE /api/venues/:id/seats
 * @access  Admin
 */
export const deleteSeats = async (req, res, next) => {
  try {
    const { seatIds } = req.body;

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      throw new ApiError(400, 'Please provide seatIds array');
    }

    const result = await Seat.deleteMany({
      _id: { $in: seatIds },
      venue: req.params.id
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} seats`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update seat properties
 * @route   PUT /api/venues/:id/seats/:seatId
 * @access  Admin
 */
export const updateSeat = async (req, res, next) => {
  try {
    const { seatType, isActive, x, y, rotation, label } = req.body;
    
    const seat = await Seat.findOneAndUpdate(
      { _id: req.params.seatId, venue: req.params.id },
      { seatType, isActive, x, y, rotation, label },
      { new: true, runValidators: true }
    );

    if (!seat) {
      throw new ApiError(404, 'Seat not found');
    }

    res.json({
      success: true,
      message: 'Seat updated successfully',
      data: seat
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get venue capacity info
 * @route   GET /api/venues/:id/capacity
 * @access  Public
 */
export const getVenueCapacity = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    const seatCount = await Seat.countDocuments({ venue: venue._id });

    res.json({
      success: true,
      data: {
        venueId: venue._id,
        venueName: venue.name,
        venueCapacity: venue.total_capacity,
        seatsCreated: seatCount,
        remainingCapacity: venue.total_capacity - seatCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate seats in a grid pattern
 * @route   POST /api/venues/:id/generate-seats
 * @access  Admin
 */
export const generateSeats = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    const { 
      rows, 
      seatsPerRow, 
      startRow = 'A',
      startNumber = 1,
      spacing = 35,
      startX = 100,
      startY = 100,
      clearExisting = false,
      zoneId // Optional: generate seats for a specific zone
    } = req.body;

    if (!rows || !seatsPerRow) {
      throw new ApiError(400, 'Please provide rows and seatsPerRow');
    }

    const totalNewSeats = rows * seatsPerRow;

    // Check capacity
    let currentSeatCount = 0;
    if (!clearExisting) {
      currentSeatCount = await Seat.countDocuments({ venue: venue._id });
    }

    if (currentSeatCount + totalNewSeats > venue.total_capacity) {
      throw new ApiError(400, 
        `Cannot generate ${totalNewSeats} seats. ` +
        `Would exceed venue capacity of ${venue.total_capacity}. ` +
        `Currently have ${currentSeatCount} seats.`
      );
    }

    // Verify zone exists if provided
    let zone = null;
    if (zoneId) {
      zone = await Zone.findOne({ _id: zoneId, venue: venue._id });
      if (!zone) {
        throw new ApiError(404, 'Zone not found in this venue');
      }
    }

    // Clear existing if requested
    if (clearExisting) {
      if (zoneId) {
        await Seat.deleteMany({ venue: venue._id, zone: zoneId });
      } else {
        await Seat.deleteMany({ venue: venue._id });
      }
    }

    // Generate seats
    const seatsToCreate = [];
    const startCharCode = startRow.charCodeAt(0);

    for (let r = 0; r < rows; r++) {
      const rowLabel = String.fromCharCode(startCharCode + r);
      const rowNumber = r + 1;
      for (let n = 0; n < seatsPerRow; n++) {
        const seatNumber = startNumber + n;
        seatsToCreate.push({
          venue: venue._id,
          zone: zoneId || null,
          row: rowLabel,
          rowNumber: rowNumber,
          number: seatNumber,
          label: `${rowLabel}${seatNumber}`,
          seatType: 'NORMAL',
          isActive: true,
          x: startX + n * spacing,
          y: startY + r * spacing,
          rotation: 0
        });
      }
    }

    const insertedSeats = await Seat.insertMany(seatsToCreate);

    res.status(201).json({
      success: true,
      message: `Generated ${insertedSeats.length} seats`,
      data: {
        seatCount: insertedSeats.length,
        venueCapacity: venue.total_capacity
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(400, 'Duplicate seats detected. Try clearing existing seats first.');
    }
    next(error);
  }
};

// ==================== ZONE MANAGEMENT ====================

/**
 * @desc    Get all zones for a venue
 * @route   GET /api/venues/:id/zones
 * @access  Public
 */
export const getVenueZones = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    const zones = await Zone.find({ venue: venue._id, isActive: true })
      .sort({ floor: 1, section: 1, sortOrder: 1 });

    // Get seat count per zone
    const zonesWithSeats = await Promise.all(
      zones.map(async (zone) => {
        const seatCount = await Seat.countDocuments({ zone: zone._id });
        return {
          ...zone.toObject(),
          seatCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        venue: {
          _id: venue._id,
          name: venue.name,
          canvas: venue.canvas,
          stage: venue.stage,
          floors: venue.floors
        },
        zones: zonesWithSeats
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new zone
 * @route   POST /api/venues/:id/zones
 * @access  Admin
 */
export const createZone = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    const {
      name,
      color,
      shapeType,
      bounds,
      polygonPoints,
      floor,
      section,
      rows,
      seats,
      labelPosition,
      rowLabelsPosition,
      colLabelsPosition,
      description,
      sortOrder
    } = req.body;

    if (!name) {
      throw new ApiError(400, 'Zone name is required');
    }

    const zone = await Zone.create({
      venue: venue._id,
      name,
      color: color || '#3B82F6',
      shapeType: shapeType || 'RECTANGLE',
      bounds: bounds || { x: 0, y: 0, width: 200, height: 150 },
      polygonPoints: polygonPoints || [],
      floor,
      section: section || 'CENTER',
      rows: rows || { count: 10, startNumber: 1, labelStyle: 'ALPHA' },
      seats: seats || { perRow: 10, spacing: 30, rowSpacing: 35, startSide: 'LEFT' },
      labelPosition,
      rowLabelsPosition,
      colLabelsPosition,
      description,
      sortOrder: sortOrder || 0
    });

    res.status(201).json({
      success: true,
      message: 'Zone created successfully',
      data: zone
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(400, 'Zone with this name already exists in venue');
    }
    next(error);
  }
};

/**
 * @desc    Update a zone
 * @route   PUT /api/venues/:id/zones/:zoneId
 * @access  Admin
 */
export const updateZone = async (req, res, next) => {
  try {
    const zone = await Zone.findOneAndUpdate(
      { _id: req.params.zoneId, venue: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!zone) {
      throw new ApiError(404, 'Zone not found');
    }

    res.json({
      success: true,
      message: 'Zone updated successfully',
      data: zone
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(400, 'Zone with this name already exists in venue');
    }
    next(error);
  }
};

/**
 * @desc    Delete a zone and its seats
 * @route   DELETE /api/venues/:id/zones/:zoneId
 * @access  Admin
 */
export const deleteZone = async (req, res, next) => {
  try {
    const zone = await Zone.findOne({ _id: req.params.zoneId, venue: req.params.id });

    if (!zone) {
      throw new ApiError(404, 'Zone not found');
    }

    // Delete all seats in this zone
    await Seat.deleteMany({ zone: zone._id });
    await Zone.findByIdAndDelete(zone._id);

    res.json({
      success: true,
      message: 'Zone and all its seats deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get zone with its seats
 * @route   GET /api/venues/:id/zones/:zoneId
 * @access  Public
 */
export const getZoneWithSeats = async (req, res, next) => {
  try {
    const zone = await Zone.findOne({ _id: req.params.zoneId, venue: req.params.id });

    if (!zone) {
      throw new ApiError(404, 'Zone not found');
    }

    const seats = await Seat.find({ zone: zone._id })
      .sort({ rowNumber: 1, number: 1 });

    // Group seats by row
    const seatsByRow = seats.reduce((acc, seat) => {
      const rowKey = seat.rowNumber || seat.row;
      if (!acc[rowKey]) acc[rowKey] = [];
      acc[rowKey].push(seat);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        zone,
        seats,
        seatsByRow,
        totalSeats: seats.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate seats for a zone based on zone configuration
 * @route   POST /api/venues/:id/zones/:zoneId/generate-seats
 * @access  Admin
 */
export const generateZoneSeats = async (req, res, next) => {
  try {
    const zone = await Zone.findOne({ _id: req.params.zoneId, venue: req.params.id });

    if (!zone) {
      throw new ApiError(404, 'Zone not found');
    }

    const venue = await Venue.findById(req.params.id);
    const { clearExisting = true } = req.body;

    // Calculate total seats to generate
    const rowCount = zone.rows.count;
    const seatsPerRow = zone.seats.perRow;
    const totalSeats = rowCount * seatsPerRow;

    // Check venue capacity
    let currentSeatCount = 0;
    if (!clearExisting) {
      currentSeatCount = await Seat.countDocuments({ venue: venue._id });
    } else {
      const zoneSeatCount = await Seat.countDocuments({ zone: zone._id });
      currentSeatCount = await Seat.countDocuments({ venue: venue._id }) - zoneSeatCount;
    }

    if (currentSeatCount + totalSeats > venue.total_capacity) {
      throw new ApiError(400, 
        `Cannot generate ${totalSeats} seats. Would exceed venue capacity of ${venue.total_capacity}.`
      );
    }

    // Clear existing zone seats if requested
    if (clearExisting) {
      await Seat.deleteMany({ zone: zone._id });
    }

    // Generate seats based on zone configuration
    const seatsToCreate = [];
    const spacing = zone.seats.spacing;
    const rowSpacing = zone.seats.rowSpacing;
    const startX = zone.bounds.x + spacing;
    const startY = zone.bounds.y + rowSpacing;

    for (let r = 0; r < rowCount; r++) {
      const rowNumber = zone.rows.startNumber + r;
      const rowLabel = zone.getDefaultRowLabel(rowNumber);
      
      for (let n = 0; n < seatsPerRow; n++) {
        const seatNumber = n + 1;
        
        // Calculate position based on startSide
        let xPos;
        if (zone.seats.startSide === 'RIGHT') {
          xPos = startX + (seatsPerRow - 1 - n) * spacing;
        } else if (zone.seats.startSide === 'CENTER') {
          const offset = (n - (seatsPerRow - 1) / 2) * spacing;
          xPos = zone.bounds.x + zone.bounds.width / 2 + offset;
        } else {
          xPos = startX + n * spacing;
        }

        seatsToCreate.push({
          venue: venue._id,
          zone: zone._id,
          rowNumber: rowNumber,
          row: rowLabel,
          number: seatNumber,
          label: `${rowLabel}${seatNumber}`,
          seatType: 'NORMAL',
          isActive: true,
          x: xPos,
          y: startY + r * rowSpacing,
          colNumber: n + 1
        });
      }
    }

    const insertedSeats = await Seat.insertMany(seatsToCreate);

    res.status(201).json({
      success: true,
      message: `Generated ${insertedSeats.length} seats for zone ${zone.name}`,
      data: {
        zone: zone.name,
        seatCount: insertedSeats.length,
        rows: rowCount,
        seatsPerRow: seatsPerRow
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
 * @desc    Save complete venue layout (zones and seats)
 * @route   PUT /api/venues/:id/layout
 * @access  Admin
 */
export const saveVenueLayout = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    const { canvas, stage, floors, zones } = req.body;

    // Update venue canvas settings
    if (canvas) venue.canvas = canvas;
    if (stage) venue.stage = stage;
    if (floors) venue.floors = floors;
    await venue.save();

    // Update zones if provided
    if (zones && Array.isArray(zones)) {
      for (const zoneData of zones) {
        if (zoneData._id) {
          // Update existing zone
          await Zone.findByIdAndUpdate(zoneData._id, zoneData, { runValidators: true });
        } else {
          // Create new zone
          await Zone.create({ ...zoneData, venue: venue._id });
        }
      }
    }

    // Fetch updated zones
    const updatedZones = await Zone.find({ venue: venue._id, isActive: true })
      .sort({ floor: 1, section: 1, sortOrder: 1 });

    res.json({
      success: true,
      message: 'Venue layout saved successfully',
      data: {
        venue: {
          _id: venue._id,
          name: venue.name,
          canvas: venue.canvas,
          stage: venue.stage,
          floors: venue.floors
        },
        zones: updatedZones
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get complete venue layout (zones, seats grouped)
 * @route   GET /api/venues/:id/layout
 * @access  Public
 */
export const getVenueLayout = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      throw new ApiError(404, 'Venue not found');
    }

    const zones = await Zone.find({ venue: venue._id, isActive: true })
      .sort({ floor: 1, section: 1, sortOrder: 1 });

    // Get seats grouped by zone
    const zonesWithSeats = await Promise.all(
      zones.map(async (zone) => {
        const seats = await Seat.find({ zone: zone._id })
          .sort({ rowNumber: 1, number: 1 });
        
        // Group seats by row
        const seatsByRow = seats.reduce((acc, seat) => {
          const rowKey = seat.rowNumber || 1;
          if (!acc[rowKey]) acc[rowKey] = [];
          acc[rowKey].push(seat);
          return acc;
        }, {});

        return {
          ...zone.toObject(),
          seats,
          seatsByRow,
          seatCount: seats.length
        };
      })
    );

    // Group zones by floor
    const zonesByFloor = zonesWithSeats.reduce((acc, zone) => {
      const floor = zone.floor || 'Default';
      if (!acc[floor]) acc[floor] = [];
      acc[floor].push(zone);
      return acc;
    }, {});

    const totalSeats = zonesWithSeats.reduce((sum, z) => sum + z.seatCount, 0);

    res.json({
      success: true,
      data: {
        venue: {
          _id: venue._id,
          name: venue.name,
          address: venue.address,
          city: venue.city,
          total_capacity: venue.total_capacity,
          canvas: venue.canvas,
          stage: venue.stage,
          floors: venue.floors
        },
        zones: zonesWithSeats,
        zonesByFloor,
        totalSeats,
        zoneCount: zones.length
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
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
};
