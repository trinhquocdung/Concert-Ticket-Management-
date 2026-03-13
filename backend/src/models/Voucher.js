import mongoose from 'mongoose';

/**
 * Voucher Model - Discount codes
 */
const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discount_type: {
    type: String,
    enum: ['PERCENTAGE', 'FIXED'],
    default: 'PERCENTAGE'
  },
  discount_value: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  max_amount: {
    type: Number, // Maximum discount amount
    default: null
  },
  min_order_amount: {
    type: Number, // Minimum order to use voucher
    default: 0
  },
  usage_limit: { type: Number, default: 100 }, // Total number of times voucher can be used
  valid_from: {
    type: Date,
    default: Date.now
  },
  valid_until: {
    type: Date,
    required: true
  },
  usage_limit: {
    type: Number,
    default: null // null = unlimited
  },
  used_count: {
    type: Number,
    default: 0
  },
  // Optional: limit to specific concerts
  concerts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Concert'
  }],
  // Optional: limit to specific users
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  description: String,
  active: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Indexes
voucherSchema.index({ code: 1 });
voucherSchema.index({ valid_until: 1 });
voucherSchema.index({ active: 1 });

// Check if voucher is valid
voucherSchema.methods.isValid = function(orderAmount = 0, userId = null, concertId = null) {
  const now = new Date();
  
  if (!this.active) return { valid: false, message: 'Voucher is inactive' };
  if (this.valid_from > now) return { valid: false, message: 'Voucher not yet active' };
  if (this.valid_until < now) return { valid: false, message: 'Voucher expired' };
  if (this.usage_limit !== null && this.used_count >= this.usage_limit) {
    return { valid: false, message: 'Voucher usage limit reached' };
  }
  if (orderAmount < this.min_order_amount) {
    return { valid: false, message: `Minimum order amount: ${this.min_order_amount}` };
  }
  if (this.users.length > 0 && userId && !this.users.includes(userId)) {
    return { valid: false, message: 'Voucher not available for your account' };
  }
  if (this.concerts.length > 0 && concertId && !this.concerts.includes(concertId)) {
    return { valid: false, message: 'Voucher not valid for this concert' };
  }
  
  return { valid: true };
};

// Calculate discount amount
voucherSchema.methods.calculateDiscount = function(amount) {
  let discount = (amount * this.discount_percent) / 100;
  
  if (this.max_amount !== null && discount > this.max_amount) {
    discount = this.max_amount;
  }
  
  return Math.round(discount);
};

// Use voucher
voucherSchema.methods.use = function() {
  this.used_count += 1;
  return this.save();
};

const Voucher = mongoose.model('Voucher', voucherSchema);
export default Voucher;
