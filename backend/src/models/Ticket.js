import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Ticket Model - E-tickets generated after purchase
 */
const ticketSchema = new mongoose.Schema({
  showSeat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShowSeat',
    required: true
  },
  ticketClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TicketClass',
    required: true
  },
  concert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Concert',
    required: true
  },
  // Reference to the specific performance subdocument (_id) inside Concert.performances
  performance: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticket_code: {
    type: String,
    unique: true,
    required: true
  },
  qr_hash: {
    type: String,
    unique: true
  },
  status: {
    type: String,
    enum: ['VALID', 'USED', 'REFUNDED', 'CANCELLED'],
    default: 'VALID'
  },
  checked_in_at: Date,
  checked_in_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Staff who checked in
  }
}, { timestamps: true });

// Indexes
ticketSchema.index({ ticket_code: 1 });
ticketSchema.index({ qr_hash: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ concert: 1, customer: 1 });

// Generate unique ticket code before saving
ticketSchema.pre('save', function(next) {
  if (!this.ticket_code) {
    this.ticket_code = 'TKT' + Date.now().toString(36).toUpperCase() + 
                       crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  if (!this.qr_hash) {
    this.qr_hash = crypto.createHash('sha256')
      .update(this.ticket_code + Date.now().toString())
      .digest('hex');
  }
  next();
});

// Method: Generate QR code data
ticketSchema.methods.generateQR = function() {
  return {
    ticket_code: this.ticket_code,
    qr_hash: this.qr_hash,
    qr_data: JSON.stringify({
      code: this.ticket_code,
      hash: this.qr_hash
    })
  };
};

// Method: Check in ticket
ticketSchema.methods.checkIn = function(staffId) {
  if (this.status !== 'VALID') {
    throw new Error(`Cannot check in. Ticket status: ${this.status}`);
  }
  this.status = 'USED';
  this.checked_in_at = new Date();
  this.checked_in_by = staffId;
  return this.save();
};

// Method: Refund ticket
ticketSchema.methods.refund = function() {
  if (this.status !== 'VALID') {
    throw new Error(`Cannot refund. Ticket status: ${this.status}`);
  }
  this.status = 'REFUNDED';
  return this.save();
};

const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket;
