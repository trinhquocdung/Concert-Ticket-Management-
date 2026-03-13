import mongoose from 'mongoose';

/**
 * Concert Model - Main event entity
 */

const concertSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 5000
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  genre: {
    type: String, // pop, rock, jazz, EDM, classical, etc.
    trim: true
  },
  // Multiple performance slots
  performances: [{
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    ticket_classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TicketClass' }]
  }],
  start_time: {
    type: Date,
    required: true
  },
  end_time: {
    type: Date
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUB', 'SOLDOUT', 'CANCEL', 'COMPLETED'],
    default: 'DRAFT'
  },
  thumbnail: {
    type: String // URL to event poster/thumbnail
  },
  images: [{
    type: String // Gallery images
  }],
  venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  artists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artist'
  }],
  // Policies
  policies: {
    minAge: { type: Number, default: 0 },
    refundPolicy: { type: String, default: '100% refund if cancelled 7 days before event' },
    rules: [String] // No cameras, No food, etc.
  },
  // Featured/Trending
  featured: { type: Boolean, default: false },
  trending: { type: Boolean, default: false },
  // Stats
  totalTickets: { type: Number, default: 0 },
  soldTickets: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 }
}, { timestamps: true });

// Indexes
concertSchema.index({ status: 1, start_time: 1 });
concertSchema.index({ organizer: 1 });
concertSchema.index({ category: 1 });
concertSchema.index({ title: 'text', description: 'text' });
concertSchema.index({ featured: 1, trending: 1 });

// Virtual for availability percentage
concertSchema.virtual('availabilityPercent').get(function() {
  if (this.totalTickets === 0) return 100;
  return Math.round(((this.totalTickets - this.soldTickets) / this.totalTickets) * 100);
});

// Method: updateInfo
concertSchema.methods.updateInfo = function(data) {
  Object.assign(this, data);
  return this.save();
};

// Method: Check if event is upcoming
concertSchema.methods.isUpcoming = function() {
  return this.start_time > new Date() && this.status === 'PUB';
};

const Concert = mongoose.model('Concert', concertSchema);
export default Concert;
