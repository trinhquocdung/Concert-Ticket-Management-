import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Order Model - Customer orders
 */
const orderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    unique: true,
    required: true
  },
  concert: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Concert',
    required: true
  },
  // Which performance (subdocument _id from Concert.performances) this order is for
  performance: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  service_fee: {
    type: Number,
    default: 0,
    min: 0
  },
  discount_amount: {
    type: Number,
    default: 0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'EXPIRED'],
    default: 'PENDING'
  },
  voucher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voucher',
    default: null
  },
  // Customer info snapshot
  customer_info: {
    fullName: String,
    email: String,
    phone: String
  },
  // For cancellation/refund
  cancellation: {
    requested_at: Date,
    reason: String,
    processed_at: Date,
    processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    refund_amount: Number,
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'] }
  },
  // Payment method used (for reference)
  payment_method: String,
  // Expire time for pending orders
  expires_at: Date
}, { timestamps: true });

// Indexes
orderSchema.index({ customer: 1, status: 1 });
orderSchema.index({ code: 1 });
orderSchema.index({ concert: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ expires_at: 1 });

// Generate order code before saving
orderSchema.pre('save', function(next) {
  if (!this.code) {
    this.code = 'ORD' + Date.now().toString(36).toUpperCase() + 
                crypto.randomBytes(3).toString('hex').toUpperCase();
  }
  // Set expiration for pending orders (15 minutes)
  if (this.isNew && this.status === 'PENDING') {
    this.expires_at = new Date(Date.now() + 5 * 60 * 1000);
  }
  next();
});

// Calculate total from order details
orderSchema.methods.calculateTotal = async function() {
  const OrderDetail = mongoose.model('OrderDetail');
  const details = await OrderDetail.find({ order: this._id });
  
  this.subtotal = details.reduce((sum, d) => sum + d.price_snapshot, 0);
  this.service_fee = Math.round(this.subtotal * 0.05); // 5% service fee
  
  if (this.voucher) {
    const Voucher = mongoose.model('Voucher');
    const voucher = await Voucher.findById(this.voucher);
    if (voucher) {
      const validation = voucher.isValid(this.subtotal, this.customer);
      if (validation.valid) {
        this.discount_amount = voucher.calculateDiscount(this.subtotal);
      }
    }
  }
  
  this.total_amount = this.subtotal + this.service_fee - this.discount_amount;
  return this.save();
};

// Mark order as paid
orderSchema.methods.markPaid = function() {
  this.status = 'PAID';
  this.expires_at = null;
  return this.save();
};

// Cancel order
orderSchema.methods.cancel = async function(reason = '') {
  if (!['PENDING', 'PAID'].includes(this.status)) {
    throw new Error('Cannot cancel order with status: ' + this.status);
  }

  const previousStatus = this.status;
  this.status = 'CANCELLED';
  this.cancellation = {
    requested_at: new Date(),
    reason,
    processed_at: null,
    processed_by: null,
    refund_amount: null,
    status: previousStatus === 'PAID' ? 'PENDING' : 'APPROVED'
  };

  // Only release seats and cancel tickets immediately if order was NOT paid.
  // For paid orders we keep seats reserved until admin processes the refund approval.
  if (previousStatus !== 'PAID') {
    const Ticket = mongoose.model('Ticket');
    const ShowSeat = mongoose.model('ShowSeat');
    const OrderDetail = mongoose.model('OrderDetail');

    const details = await OrderDetail.find({ order: this._id }).populate('ticket');
    for (const detail of details) {
      if (detail.ticket) {
        await Ticket.findByIdAndUpdate(detail.ticket._id, { status: 'CANCELLED' });
        if (detail.ticket.showSeat) {
          await ShowSeat.findByIdAndUpdate(detail.ticket.showSeat, { status: 'AVAILABLE' });
        }
      }
    }
  }

  return this.save();
};

// Static: Expire old pending orders
orderSchema.statics.expirePendingOrders = async function() {
  const expiredOrders = await this.find({
    status: 'PENDING',
    expires_at: { $lt: new Date() }
  });
  
  for (const order of expiredOrders) {
    await order.cancel('Order expired');
    order.status = 'EXPIRED';
    await order.save();
  }
  
  return expiredOrders.length;
};

const Order = mongoose.model('Order', orderSchema);
export default Order;
