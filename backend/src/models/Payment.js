import mongoose from 'mongoose';

/**
 * Payment Model - Payment transactions
 */
const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true // One payment per order
  },
  trans_id: {
    type: String,
    unique: true,
    required: true
  },
  method: {
    type: String,
    enum: ['MOMO', 'BANK', 'VISA', 'ZALOPAY', 'CASH', 'PAYPAL'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'COMPLETED', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  pay_time: {
    type: Date
  },
  // Gateway response data (for debugging)
  gateway_response: {
    type: mongoose.Schema.Types.Mixed
  },
  // Refund info
  refund: {
    amount: Number,
    reason: String,
    processed_at: Date,
    trans_id: String
  }
}, { timestamps: true });

// Indexes
paymentSchema.index({ order: 1 });
paymentSchema.index({ trans_id: 1 });
paymentSchema.index({ status: 1 });

// Mark payment as successful
paymentSchema.methods.markSuccess = async function(gatewayResponse = {}) {
  this.status = 'SUCCESS';
  this.pay_time = new Date();
  this.gateway_response = gatewayResponse;
  await this.save();
  
  // Update order status
  const Order = mongoose.model('Order');
  await Order.findByIdAndUpdate(this.order, { status: 'PAID' });
  
  return this;
};

// Mark payment as failed
paymentSchema.methods.markFailed = async function(gatewayResponse = {}) {
  this.status = 'FAILED';
  this.gateway_response = gatewayResponse;
  await this.save();
  
  // Cancel the order
  const Order = mongoose.model('Order');
  const order = await Order.findById(this.order);
  if (order) {
    await order.cancel('Payment failed');
  }
  
  return this;
};

// Process refund
paymentSchema.methods.processRefund = async function(amount, reason, transId) {
  this.status = 'REFUNDED';
  this.refund = {
    amount,
    reason,
    processed_at: new Date(),
    trans_id: transId
  };
  await this.save();
  
  // Update order status
  const Order = mongoose.model('Order');
  await Order.findByIdAndUpdate(this.order, { status: 'REFUNDED' });
  
  return this;
};

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
