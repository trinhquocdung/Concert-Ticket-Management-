import mongoose from 'mongoose';

/**
 * EventZone Model - Event-specific zone shapes drawn over venue seats
 * 
 * NEW ARCHITECTURE:
 * - Venue has only Seats (physical positions, reusable template)
 * - For each Event, organizer DRAWS polygon shapes over the seat map
 * - Seats that fall WITHIN each polygon get assigned to that ticket class
 * - Supports complex shapes: L-shapes, irregular polygons, cut-outs
 * 
 * How it works:
 * 1. Organizer creates event, selects venue
 * 2. Sees the venue's seat map (all seats shown)
 * 3. Draws polygon shapes by clicking points on the canvas
 * 4. Assigns each shape to a ticket class (determines color & price)
 * 5. Configures custom row labels for each zone
 * 6. System calculates which seats are inside each polygon
 */
const eventZoneSchema = new mongoose.Schema({
  concert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Concert',
    required: true
  },
  ticketClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TicketClass',
    required: true
  },
  // Zone display name
  name: {
    type: String,
    required: true,
    trim: true // "VIP Left", "Premium Center", etc.
  },
  // Color for zone background (usually from ticket class)
  color: {
    type: String,
    default: '#3B82F6'
  },
  
  // ============ POLYGON SHAPE ============
  // Array of points forming the zone boundary
  // Organizer draws this by clicking on canvas
  // Complex shapes like L, T, irregular polygons are supported
  polygonPoints: [{
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  }],
  
  // ============ ROW LABELS ============
  // Custom row labels for this zone in this event
  // E.g., { "1": "AT", "2": "BT", "3": "CT" }
  // Row numbers are determined by seat positions within the zone
  rowLabelMapping: {
    type: Map,
    of: String,
    default: new Map()
  },
  
  // Row label position (which side to show labels)
  rowLabelSide: {
    type: String,
    enum: ['LEFT', 'RIGHT', 'BOTH', 'NONE'],
    default: 'LEFT'
  },
  
  // Column label suffix (AP, BP, CP on the right side)
  columnLabelSuffix: {
    type: String,
    trim: true // "P" for AP, BP, CP... or "T" for AT, BT, CT...
  },
  
  // ============ FLOOR & SECTION ============
  floor: {
    type: String,
    trim: true // "TẦNG 1", "TẦNG 2"
  },
  section: {
    type: String,
    enum: ['LEFT', 'CENTER', 'RIGHT'],
    default: 'CENTER'
  },
  
  // ============ METADATA ============
  sortOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Cached seat IDs that fall within this zone (computed when zone is saved)
  seatIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat'
  }],
  
  // Stats (computed)
  seatCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Indexes
eventZoneSchema.index({ concert: 1 });
eventZoneSchema.index({ concert: 1, ticketClass: 1 });
eventZoneSchema.index({ concert: 1, floor: 1 });

/**
 * Point-in-Polygon Algorithm (Ray Casting)
 * Checks if a point (x, y) is inside a polygon defined by points array
 */
eventZoneSchema.methods.containsPoint = function(x, y) {
  const points = this.polygonPoints;
  if (!points || points.length < 3) return false;
  
  let inside = false;
  const n = points.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

/**
 * Check if a seat is inside this zone
 */
eventZoneSchema.methods.containsSeat = function(seat) {
  // Check center point of seat
  return this.containsPoint(seat.x, seat.y);
};

/**
 * Calculate and cache which seats from venue fall within this zone
 */
eventZoneSchema.methods.calculateSeats = async function(venueSeats) {
  const seatsInZone = venueSeats.filter(seat => this.containsSeat(seat));
  this.seatIds = seatsInZone.map(s => s._id);
  this.seatCount = seatsInZone.length;
  return seatsInZone;
};

/**
 * Get custom row label for a row number
 */
eventZoneSchema.methods.getRowLabel = function(rowNumber) {
  const customLabel = this.rowLabelMapping?.get(String(rowNumber));
  if (customLabel) return customLabel;
  
  // Default: convert to letter
  if (rowNumber <= 26) {
    return String.fromCharCode(64 + rowNumber);
  }
  // For rows > 26: AA, AB, etc.
  const first = String.fromCharCode(64 + Math.floor((rowNumber - 1) / 26));
  const second = String.fromCharCode(65 + ((rowNumber - 1) % 26));
  return first + second;
};

/**
 * Get seat display label
 */
eventZoneSchema.methods.getSeatLabel = function(rowNumber, seatNumber) {
  const rowLabel = this.getRowLabel(rowNumber);
  return `${rowLabel}${seatNumber}`;
};

/**
 * Static: Get all zones for a concert
 */
eventZoneSchema.statics.getZonesForConcert = async function(concertId) {
  return this.find({ concert: concertId, isActive: true })
    .populate('ticketClass')
    .sort({ floor: 1, section: 1, sortOrder: 1 });
};

/**
 * Static: Calculate seats for all zones in a concert
 */
eventZoneSchema.statics.calculateAllZoneSeats = async function(concertId, venueSeats) {
  const zones = await this.find({ concert: concertId, isActive: true });
  
  for (const zone of zones) {
    await zone.calculateSeats(venueSeats);
    await zone.save();
  }
  
  return zones;
};

// Enable virtuals and transform Map for JSON
eventZoneSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Convert Map to plain object for JSON serialization
    if (ret.rowLabelMapping instanceof Map) {
      ret.rowLabelMapping = Object.fromEntries(ret.rowLabelMapping);
    }
    return ret;
  }
});
eventZoneSchema.set('toObject', { virtuals: true });

const EventZone = mongoose.model('EventZone', eventZoneSchema);
export default EventZone;
