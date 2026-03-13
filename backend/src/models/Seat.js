import mongoose from 'mongoose';

/**
 * Seat Model - Physical seats within a VENUE
 * 
 * This is the seat layout template for the venue.
 * Seats belong to zones and inherit zone's default row labeling.
 * Event-specific customizations (labels, colors) are handled by EventZone.
 * Seat availability per event is tracked in ShowSeat.
 */
const seatSchema = new mongoose.Schema({
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true
  },
  // Zone is optional - with polygon-based EventZones, seats don't need a venue zone
  zone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone'
  },
  // Row number (1, 2, 3, etc.) - display label comes from zone/event config
  rowNumber: {
    type: Number,
    min: 1
  },
  // For backwards compatibility, keep row as string (can be computed from rowNumber)
  row: {
    type: String,
    trim: true // A, B, C, etc. - default label
  },
  number: {
    type: Number,
    required: true,
    min: 1
  },
  // Default label (can be overridden per event via EventZone.rowLabelMapping)
  label: {
    type: String,
    trim: true // Custom label like "A1", "VIP-1", etc.
  },
  seatType: {
    type: String,
    enum: ['NORMAL', 'WHEELCHAIR', 'RESTRICTED', 'AISLE'],
    default: 'NORMAL' // Physical seat type (accessibility, etc.)
  },
  isActive: {
    type: Boolean,
    default: true // Can be deactivated for maintenance
  },
  // Visual position on canvas (in pixels) - relative to zone or absolute
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  rotation: { type: Number, default: 0 }, // Rotation angle in degrees
  
  // Column position (for column labels like AP, BP, CP on the right side)
  colNumber: {
    type: Number,
    min: 1
  }
}, { timestamps: true });

// Compound unique index: each seat is unique within a venue by row and number
seatSchema.index({ venue: 1, row: 1, number: 1 }, { unique: true, sparse: true });
seatSchema.index({ venue: 1 }); // For fetching all seats of a venue
seatSchema.index({ zone: 1 }); // For fetching all seats of a zone

// Pre-save: generate default label if not provided
seatSchema.pre('save', async function(next) {
  if (!this.label && this.row) {
    this.label = `${this.row}${this.number}`;
  }
  next();
});

// Enable virtuals in JSON
seatSchema.set('toJSON', { virtuals: true });
seatSchema.set('toObject', { virtuals: true });

const Seat = mongoose.model('Seat', seatSchema);
export default Seat;
