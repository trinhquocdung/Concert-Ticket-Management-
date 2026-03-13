import mongoose from 'mongoose';

/**
 * Zone Model - Represents seating zones within a venue
 * E.g., Zone A, Zone B, VIP Zone
 * 
 * Zones define the PHYSICAL areas in the venue with background shapes.
 * The actual pricing, colors per event are handled by EventZone model.
 * 
 * Zone shapes can be drawn as rectangles or custom polygons to paint
 * the background area representing a ticket section.
 */
const zoneSchema = new mongoose.Schema({
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true // Zone A, VIP, etc.
  },
  // Default base price (can be overridden per event via EventZone)
  price: {
    type: Number,
    default: 0
  },
  // Default color (can be overridden per event via EventZone)
  color: {
    type: String,
    default: '#3B82F6'
  },
  
  // Zone shape type
  shapeType: {
    type: String,
    enum: ['RECTANGLE', 'POLYGON', 'IRREGULAR'],
    default: 'RECTANGLE'
  },
  
  // Rectangle bounds (for RECTANGLE shape)
  bounds: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 200 },
    height: { type: Number, default: 150 }
  },
  
  // Polygon points (for POLYGON/IRREGULAR shapes)
  // Array of {x, y} coordinates forming the zone boundary
  polygonPoints: [{
    x: { type: Number },
    y: { type: Number }
  }],
  
  // Floor this zone belongs to
  floor: {
    type: String,
    trim: true // "TẦNG 1", "TẦNG 2", etc.
  },
  
  // Section position (LEFT, CENTER, RIGHT)
  section: {
    type: String,
    enum: ['LEFT', 'CENTER', 'RIGHT'],
    default: 'CENTER'
  },
  
  // Row configuration for this zone
  rows: {
    count: { type: Number, default: 10 }, // Number of rows
    startNumber: { type: Number, default: 1 }, // First row number
    labelStyle: {
      type: String,
      enum: ['ALPHA', 'NUMERIC', 'CUSTOM'],
      default: 'ALPHA'
    },
    // Custom labels array (for CUSTOM labelStyle)
    // e.g., ["AT", "BT", "CT", "DT"] for rows 1-4
    customLabels: [String]
  },
  
  // Seat configuration for this zone
  seats: {
    perRow: { type: Number, default: 10 }, // Seats per row
    spacing: { type: Number, default: 30 }, // Pixel spacing between seats
    rowSpacing: { type: Number, default: 35 }, // Pixel spacing between rows
    startSide: {
      type: String,
      enum: ['LEFT', 'RIGHT', 'CENTER'],
      default: 'LEFT'
    }
  },
  
  // Position of zone label on canvas
  labelPosition: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  
  // Row labels position (left side indicators like AT, BT, CT)
  rowLabelsPosition: {
    type: String,
    enum: ['LEFT', 'RIGHT', 'BOTH', 'NONE'],
    default: 'LEFT'
  },
  
  // Column labels position (top side indicators like AP, BP, CP)
  colLabelsPosition: {
    type: String,
    enum: ['TOP', 'BOTTOM', 'BOTH', 'NONE'],
    default: 'NONE'
  },
  
  description: String,
  
  // Sort order for display
  sortOrder: {
    type: Number,
    default: 0
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

zoneSchema.index({ venue: 1, name: 1 }, { unique: true });
zoneSchema.index({ venue: 1, floor: 1 });

// Method: Get row label for a specific row number
zoneSchema.methods.getDefaultRowLabel = function(rowNumber) {
  const relativeRow = rowNumber - this.rows.startNumber + 1;
  
  if (this.rows.labelStyle === 'CUSTOM' && this.rows.customLabels.length >= relativeRow) {
    return this.rows.customLabels[relativeRow - 1];
  }
  
  if (this.rows.labelStyle === 'NUMERIC') {
    return String(rowNumber);
  }
  
  // ALPHA style: A, B, C, ..., Z, AA, AB, ...
  if (relativeRow <= 26) {
    return String.fromCharCode(64 + relativeRow);
  }
  const firstChar = String.fromCharCode(64 + Math.floor((relativeRow - 1) / 26));
  const secondChar = String.fromCharCode(65 + ((relativeRow - 1) % 26));
  return firstChar + secondChar;
};

// Method: Calculate total seats in this zone
zoneSchema.methods.getTotalSeats = function() {
  return this.rows.count * this.seats.perRow;
};

// Virtual: Total capacity
zoneSchema.virtual('capacity').get(function() {
  return this.rows.count * this.seats.perRow;
});

// Enable virtuals
zoneSchema.set('toJSON', { virtuals: true });
zoneSchema.set('toObject', { virtuals: true });

const Zone = mongoose.model('Zone', zoneSchema);
export default Zone;
