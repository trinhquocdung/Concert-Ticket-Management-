import crypto from 'crypto';
import querystring from 'querystring';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import OrderDetail from '../models/OrderDetail.js';
import ShowSeat from '../models/ShowSeat.js';
import Ticket from '../models/Ticket.js';
import { ApiError } from '../middleware/errorHandler.js';
import config from '../config/index.js';
import axios from 'axios'; 
import mailer from '../utils/mailer.js';
/**
 * Payment Controller
 * Generic payment helpers and MoMo flows are handled in `momo.controller.js`.
 * VNPay has been removed from the codebase.
 */

// VNPay support removed. MoMo handlers live in `momo.controller.js`.

/**
 * @desc    Create Stripe PaymentIntent for inline card payments
 * @route   POST /api/payments/create-intent
 * @access  Private
 */
// Stripe integration removed. Card-payments are no longer handled via Stripe.

/**
 * @desc    Create MoMo payment URL
 */
/**
 * @desc    MoMo IPN handler
 * @route   POST /api/payments/momo/ipn
 * @access  Public (MoMo servers)
 */



/**
 * @desc    Stripe webhook handler
 * @route   POST /api/payments/stripe/webhook
 * @access  Public (Stripe)
 */
// Stripe webhook handler removed.


/**
 * @desc    Get payment status
 * @route   GET /api/payments/:id/status
 * @access  Private
 */
export const getPaymentStatus = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('order', 'code status total_amount');

    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }

    res.json({
      success: true,
      data: {
        payment: {
          id: payment._id,
          status: payment.status,
          method: payment.method,
          amount: payment.amount,
          paidAt: payment.paid_at
        },
        order: payment.order
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment history
 * @route   GET /api/payments/history
 * @access  Private
 */
export const getPaymentHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get user's orders first
    const orders = await Order.find({ customer: req.user._id }).select('_id');
    const orderIds = orders.map(o => o._id);

    const [payments, total] = await Promise.all([
      Payment.find({ order: { $in: orderIds } })
        .populate('order', 'code total_amount status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments({ order: { $in: orderIds } })
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Process refund
 * @route   POST /api/payments/:id/refund
 * @access  Private (Admin)
 */
export const processRefund = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;

    const payment = await Payment.findById(req.params.id).populate('order');

    if (!payment) {
      throw new ApiError(404, 'Payment not found');
    }

    if (payment.status !== 'COMPLETED') {
      throw new ApiError(400, 'Can only refund completed payments');
    }

    const refundAmount = amount || payment.amount;
    
    if (refundAmount > payment.amount) {
      throw new ApiError(400, 'Refund amount cannot exceed payment amount');
    }

    // In production, call payment gateway refund API
    // For now, just update status

    payment.status = refundAmount === payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    payment.refund_amount = refundAmount;
    payment.refund_reason = reason;
    payment.refunded_at = new Date();
    await payment.save();

    // Update order
    const order = payment.order;
    order.status = 'REFUNDED';
    order.refund_amount = refundAmount;
    await order.save();

    // Update tickets
    await Ticket.updateMany(
      { concert: order.concert },
      { status: 'REFUNDED' }
    );

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Generate tickets after successful payment
 */
async function generateTickets(orderId, req = null) {
  const orderDetails = await OrderDetail.find({ order: orderId })
    .populate({
      path: 'showSeat',
      populate: { path: 'ticketClass' }
    });

  const order = await Order.findById(orderId);

  const seatIdsByConcert = {};

  for (const detail of orderDetails) {
    // Create ticket
    const ticket = new Ticket({
      concert: order.concert,
      customer: order.customer,
      ticketClass: detail.showSeat.ticketClass._id,
      showSeat: detail.showSeat._id,
      price: detail.price
    });

    await ticket.save();

    // Update order detail
    detail.ticket = ticket._id;
    await detail.save();

    // Update showSeat status
    await ShowSeat.findByIdAndUpdate(detail.showSeat._id, { status: 'SOLD', lock_expire_time: null, locked_by: null });

    const showSeat = detail.showSeat;
    const concertId = showSeat.concert ? (showSeat.concert._id || showSeat.concert) : null;
    if (concertId) {
      seatIdsByConcert[concertId] = seatIdsByConcert[concertId] || [];
      seatIdsByConcert[concertId].push(detail.showSeat._id.toString());
    }
  }

  // Emit socket updates per concert so connected clients update seat chart
  if (req && req.app && typeof req.app.get === 'function') {
    const io = req.app.get('io');
    if (io) {
      for (const [concertId, seatIds] of Object.entries(seatIdsByConcert)) {
        io.to(`concert:${concertId}`).emit('seats-status-changed', { seatIds, status: 'SOLD' });
      }
    }
  }

  console.log(`Generated ${orderDetails.length} tickets for order ${order.code}`);
}

/**
 * Helper: Release seats when order expires or fails
 */
async function releaseOrderSeats(orderId) {
  const orderDetails = await OrderDetail.find({ order: orderId });
  
  for (const detail of orderDetails) {
    await ShowSeat.findByIdAndUpdate(detail.showSeat, {
      status: 'AVAILABLE',
      $unset: { locked_by: '', locked_until: '' }
    });
  }
}

// Removed VNPay helpers

export default {
  getPaymentStatus,
  getPaymentHistory,
  processRefund
};
