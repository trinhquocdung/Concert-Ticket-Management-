import mongoose from 'mongoose';

/**
 * OrderDetail Model - Line items in an order
 */
const orderDetailSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  price_snapshot: {
    type: Number,
    required: true,
    min: 0 // Price at time of purchase
  },
  // Snapshot of ticket info for historical records
  ticket_info: {
    concert_title: String,
    ticket_class: String,
    seat_label: String,
    zone_name: String
  }
}, { timestamps: true });

// Indexes
orderDetailSchema.index({ order: 1 });
orderDetailSchema.index({ ticket: 1 });

const OrderDetail = mongoose.model('OrderDetail', orderDetailSchema);
export default OrderDetail;
