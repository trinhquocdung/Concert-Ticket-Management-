import mongoose from 'mongoose';

/**
 * ShowSeat Model - Maps seats to concerts with availability status
 * 
 * Each concert has its own seat availability and can have custom display labels.
 * The display label comes from EventZone's rowLabelMapping for this event.
 */
const showSeatSchema = new mongoose.Schema({
  concert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Concert',
    required: true
  },
  // Optional reference to a specific performance (subdocument _id inside Concert.performances)
  performance: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  seat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat',
    required: true
  },
  // Reference to EventZone for this seat's zone in this event
  eventZone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventZone'
  },
  ticketClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TicketClass'
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'LOCKED', 'SOLD'],
    default: 'AVAILABLE'
  },
  lock_expire_time: {
    type: Date // When the lock expires (for 10-min hold)
  },
  locked_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  price: {
    type: Number,
    min: 0
  },
  // Custom display label for this event (e.g., "AT1" instead of "A1")
  // Computed from EventZone.rowLabelMapping when ShowSeats are created
  displayLabel: {
    type: String,
    trim: true
  },
  // Custom row label for this event (e.g., "AT" instead of "A")
  displayRowLabel: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Compound unique index: each seat can only exist once per concert/performance
// performance may be null for legacy single-show usage. This index prevents duplicates for the same concert+seat+performance.
showSeatSchema.index({ concert: 1, seat: 1, performance: 1 }, { unique: true });
showSeatSchema.index({ concert: 1, status: 1 });
showSeatSchema.index({ lock_expire_time: 1 });
showSeatSchema.index({ locked_by: 1 });

// Lock seat for purchase (10 minutes hold)
showSeatSchema.methods.lock = function(userId, minutes = 10) {
  if (this.status !== 'AVAILABLE') {
    throw new Error('Seat is not available');
  }
  this.status = 'LOCKED';
  this.locked_by = userId;
  this.lock_expire_time = new Date(Date.now() + minutes * 60 * 1000);
  return this.save();
};

// Release locked seat
showSeatSchema.methods.release = function() {
  this.status = 'AVAILABLE';
  this.locked_by = null;
  this.lock_expire_time = null;
  return this.save();
};

// Mark as sold
showSeatSchema.methods.markSold = function() {
  this.status = 'SOLD';
  this.locked_by = null;
  this.lock_expire_time = null;
  return this.save();
};

// Static method: Release expired locks
showSeatSchema.statics.releaseExpiredLocks = async function() {
  const now = new Date();
  const result = await this.updateMany(
    { status: 'LOCKED', lock_expire_time: { $lt: now } },
    { status: 'AVAILABLE', locked_by: null, lock_expire_time: null }
  );
  return result.modifiedCount;
};

const ShowSeat = mongoose.model('ShowSeat', showSeatSchema);
export default ShowSeat;
