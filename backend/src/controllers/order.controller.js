import Order from '../models/Order.js';
import OrderDetail from '../models/OrderDetail.js';
import Ticket from '../models/Ticket.js';
import ShowSeat from '../models/ShowSeat.js';
import TicketClass from '../models/TicketClass.js';
import Concert from '../models/Concert.js';
import Voucher from '../models/Voucher.js';
import Payment from '../models/Payment.js';
import { ApiError } from '../middleware/errorHandler.js';
import crypto from 'crypto';
import mailer from '../utils/mailer.js';

/**
 * Order Controller
 * Handles ticket booking, order management
 */

/**
 * @desc    Lock seats for booking (Step 1)
 * @route   POST /api/orders/lock-seats
 * @access  Private
 */
export const lockSeats = async (req, res, next) => {
  try {
    const { concertId, seatIds, performanceId } = req.body;

    if (!concertId || !seatIds || seatIds.length === 0) {
      throw new ApiError(400, 'Please provide concertId and seatIds');
    }

    if (seatIds.length > 10) {
      throw new ApiError(400, 'Maximum 10 seats per booking');
    }

    // Release any expired locks first
    await ShowSeat.releaseExpiredLocks();

    // Check if concert exists and is published
    const concert = await Concert.findById(concertId);
    if (!concert || concert.status !== 'PUB') {
      throw new ApiError(404, 'Concert not found or not available');
    }

    // Validate performance
    if (!performanceId) {
      throw new ApiError(400, 'Please provide performanceId');
    }
    const perf = concert.performances && concert.performances.id ? concert.performances.id(performanceId) : null;
    if (!perf) {
      throw new ApiError(404, 'Performance not found for this concert');
    }
    // build performance end datetime (use endTime if available, otherwise startTime)
    const buildDateTime = (perfDoc, timeStr) => {
      const d = new Date(perfDoc.date);
      if (!timeStr) return d;
      const parts = String(timeStr).split(':').map(Number);
      const hh = parts[0] || 0; const mm = parts[1] || 0;
      d.setHours(hh, mm, 0, 0);
      return d;
    };
    const perfEnd = buildDateTime(perf, perf.endTime || perf.startTime);
    if (perfEnd < new Date()) {
      throw new ApiError(400, 'Cannot reserve seats for a past performance');
    }

    // Lock seats
    const lockedSeats = [];
    const failedSeats = [];

    for (const seatId of seatIds) {
      const showSeat = await ShowSeat.findOne({
        _id: seatId,
        concert: concertId
      }).populate('seat ticketClass');

      if (!showSeat) {
        failedSeats.push({ seatId, reason: 'Seat not found' });
        continue;
      }

      if (showSeat.status !== 'AVAILABLE') {
        failedSeats.push({ 
          seatId, 
          reason: showSeat.status === 'SOLD' ? 'Seat already sold' : 'Seat is being held by another user' 
        });
        continue;
      }

      // Check ticket class sale window
      if (showSeat.ticketClass) {
        if (typeof showSeat.ticketClass.isSalesOpen === 'function' && !showSeat.ticketClass.isSalesOpen()) {
          failedSeats.push({ seatId, reason: `Sales for "${showSeat.ticketClass.name}" are closed` });
          continue;
        }
      }

      try {
        // attach performance info when locking (locks are per showSeat object only here)
        await showSeat.lock(req.user._id, 10); // 10 minute lock
        lockedSeats.push({
          showSeatId: showSeat._id,
          seatId: showSeat.seat._id,
          row: showSeat.seat.row,
          number: showSeat.seat.number,
          label: showSeat.seat.label,
          price: showSeat.price
        });
      } catch (err) {
        failedSeats.push({ seatId, reason: err.message });
      }
    }

    if (lockedSeats.length === 0) {
      throw new ApiError(400, 'Could not lock any seats', failedSeats);
    }

    // Calculate totals
    const subtotal = lockedSeats.reduce((sum, seat) => sum + seat.price, 0);
    const serviceFee = Math.round(subtotal * 0.05);
    const total = subtotal + serviceFee;

    res.json({
      success: true,
      message: `Locked ${lockedSeats.length} seats for 10 minutes`,
      data: {
        lockedSeats,
        failedSeats: failedSeats.length > 0 ? failedSeats : undefined,
        pricing: {
          subtotal,
          serviceFee,
          total
        },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Release locked seats
 * @route   POST /api/orders/release-seats
 * @access  Private
 */
export const releaseSeats = async (req, res, next) => {
  try {
    const { seatIds } = req.body;

    const result = await ShowSeat.updateMany(
      {
        _id: { $in: seatIds },
        locked_by: req.user._id,
        status: 'LOCKED'
      },
      {
        status: 'AVAILABLE',
        locked_by: null,
        lock_expire_time: null
      }
    );

    res.json({
      success: true,
      message: `Released ${result.modifiedCount} seats`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create order (Step 2 - after locking seats)
 * @route   POST /api/orders
 * @access  Private
 */
export const createOrder = async (req, res, next) => {
  try {
    const { concertId, seatIds, voucherCode, customerInfo, performanceId } = req.body;

    if (!concertId || !seatIds || seatIds.length === 0) {
      throw new ApiError(400, 'Please provide concertId and seatIds');
    }

    // Verify performance provided and valid
    if (!performanceId) {
      throw new ApiError(400, 'Please provide performanceId');
    }

    const concert = await Concert.findById(concertId);
    if (!concert) {
      throw new ApiError(404, 'Concert not found');
    }
    const perf = concert.performances && concert.performances.id ? concert.performances.id(performanceId) : null;
    if (!perf) {
      throw new ApiError(404, 'Performance not found for this concert');
    }
    const buildDateTime = (perfDoc, timeStr) => {
      const d = new Date(perfDoc.date);
      if (!timeStr) return d;
      const parts = String(timeStr).split(':').map(Number);
      const hh = parts[0] || 0; const mm = parts[1] || 0;
      d.setHours(hh, mm, 0, 0);
      return d;
    };
    const perfEnd = buildDateTime(perf, perf.endTime || perf.startTime);
    if (perfEnd < new Date()) {
      throw new ApiError(400, 'Cannot create order for a past performance');
    }

    // Verify all seats are locked by this user. If some seats are AVAILABLE, try to lock them atomically now.
    let showSeats = await ShowSeat.find({
      _id: { $in: seatIds },
      concert: concertId
    }).populate('seat ticketClass');

    // If some seats are missing (not assigned), fail early
    if (showSeats.length !== seatIds.length) {
      throw new ApiError(400, 'Some seats are not valid for this concert. Please reselect.');
    }

    // Attempt to ensure each seat is locked by this user. For seats that are AVAILABLE, try to atomically lock them.
    const seatsToLock = showSeats.filter(ss => ss.status === 'AVAILABLE');
    const failedToLock = [];
    for (const ss of seatsToLock) {
      const updated = await ShowSeat.findOneAndUpdate(
        { _id: ss._id, status: 'AVAILABLE' },
        { status: 'LOCKED', locked_by: req.user._id, lock_expire_time: new Date(Date.now() + 10 * 60 * 1000) },
        { new: true }
      ).populate('seat ticketClass');
      if (!updated) {
        failedToLock.push(ss._id.toString());
      }
    }

    // Refresh showSeats after attempted locks
    showSeats = await ShowSeat.find({
      _id: { $in: seatIds },
      concert: concertId,
    }).populate('seat ticketClass');

    // Determine seats that are now locked by this user
    const lockedByUser = showSeats.filter(ss => ss.status === 'LOCKED' && ss.locked_by && ss.locked_by.toString() === req.user._id.toString());

    if (lockedByUser.length !== seatIds.length) {
      // Build list of problematic seats for clearer error
      const notLocked = seatIds.filter(id => !lockedByUser.find(s => s._id.toString() === id.toString()));
      throw new ApiError(400, 'Some seats are no longer reserved for you. Please select again.', notLocked);
    }

    // concert already fetched above

    // Calculate totals
    let subtotal = showSeats.reduce((sum, ss) => sum + (ss.price || 0), 0);
    const serviceFee = Math.round(subtotal * 0.05);
    let discount = 0;
    let voucher = null;

    // Apply voucher if provided
    if (voucherCode) {
      voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() });
      if (voucher) {
        const validation = voucher.isValid(subtotal, req.user._id, concertId);
        if (validation.valid) {
          discount = voucher.calculateDiscount(subtotal);
        } else {
          // Voucher invalid but don't fail the order
          voucher = null;
        }
      }
    }

    const total = subtotal + serviceFee - discount;
    const orderCode = 'ORD' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    // Create order
    const order = await Order.create({
      code: orderCode,
      customer: req.user._id,
      concert: concertId,
      performance: performanceId,
      subtotal,
      service_fee: serviceFee,
      discount_amount: discount,
      total_amount: total,
      voucher: voucher?._id,
      customer_info: customerInfo || {
        fullName: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone
      },
      status: 'PENDING'
    });

    // Create tickets and order details
    for (const showSeat of showSeats) {
      // Ensure ticket class is still on sale before creating order
      if (showSeat.ticketClass && typeof showSeat.ticketClass.isSalesOpen === 'function' && !showSeat.ticketClass.isSalesOpen()) {
        throw new ApiError(400, `Ticket class ${showSeat.ticketClass.name} is no longer on sale`);
      }
      // Create ticket (attach performance)
      const ticket = await Ticket.create({
        showSeat: showSeat._id,
        ticketClass: showSeat.ticketClass?._id,
        concert: concertId,
        performance: performanceId,
        customer: req.user._id,
        ticket_code: 'TKT' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase(),
        qr_hash: crypto.createHash('sha256').update(Date.now().toString() + showSeat._id.toString()).digest('hex'),
        status: 'VALID'
      });

      // Create order detail
      await OrderDetail.create({
        order: order._id,
        ticket: ticket._id,
        price_snapshot: showSeat.price || 0,
        ticket_info: {
          concert_title: concert.title,
          ticket_class: showSeat.ticketClass?.name,
          seat_label: showSeat.seat?.label,
          zone_name: showSeat.ticketClass?.zone?.name
        }
      });
    }

    // Update voucher usage
    if (voucher) {
      await voucher.use();
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully. Please complete payment within 15 minutes.',
      data: {
        order: {
          _id: order._id,
          code: order.code,
          subtotal: order.subtotal,
          serviceFee: order.service_fee,
          discount: order.discount_amount,
          total: order.total_amount,
          status: order.status,
          expiresAt: order.expires_at
        },
        concert: {
          _id: concert._id,
          title: concert.title,
          start_time: concert.start_time
        },
        performance: perf,
        tickets: showSeats.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's orders
 * @route   GET /api/orders
 * @access  Private
 */
export const getMyOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { customer: req.user._id };
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('concert', 'title thumbnail start_time venue')
        .populate('voucher', 'code discount_percent')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);

    // Fetch order details (line items) for these orders so frontend can display event info
    const orderIds = orders.map(o => o._id);
    const orderDetails = await OrderDetail.find({ order: { $in: orderIds } });

    // Map orderId -> details
    const detailsByOrder = orderDetails.reduce((acc, d) => {
      const id = d.order.toString();
      if (!acc[id]) acc[id] = [];
      acc[id].push(d);
      return acc;
    }, {});

    // Attach a simplified `items` array to each order for client consumption
    const ordersWithItems = orders.map(o => {
      const items = (detailsByOrder[o._id.toString()] || []).map(d => ({
        ticketClass: d.ticket_info?.ticket_class || null,
        quantity: 1,
        price: d.price_snapshot || 0,
        // event info: prefer order.concert populated fields
        event: {
          name: d.ticket_info?.concert_title || o.concert?.title || 'Event',
          image: o.concert?.thumbnail || null
        },
        ticket_info: d.ticket_info || {}
      }));

      return Object.assign({}, o.toObject(), { items });
    });

    res.json({
      success: true,
      data: {
        orders: ordersWithItems,
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
 * @desc    Get order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('concert')
      .populate('voucher')
      .populate('customer', 'username email fullName phone');

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    // Check ownership (unless admin)
    if (req.user.role !== 'ADMIN' && order.customer._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Get order details with tickets
    const orderDetails = await OrderDetail.find({ order: order._id })
      .populate({
        path: 'ticket',
        populate: {
          path: 'showSeat',
          populate: { path: 'seat' }
        }
      });

    // Get payment info
    const payment = await Payment.findOne({ order: order._id });

    res.json({
      success: true,
      data: {
        order,
        orderDetails,
        payment
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get order by code
 * @route   GET /api/orders/code/:code
 * @access  Private
 */
export const getOrderByCode = async (req, res, next) => {
  try {
    const order = await Order.findOne({ code: req.params.code })
      .populate('concert')
      .populate('customer', 'username email fullName');

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    // Check ownership (unless admin/staff)
    if (!['ADMIN', 'STAFF'].includes(req.user.role) && 
        order.customer._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    const orderDetails = await OrderDetail.find({ order: order._id })
      .populate('ticket');

    res.json({
      success: true,
      data: { order, orderDetails }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Finalize seats for an order (mark as SOLD and emit socket updates)
 * @route   POST /api/orders/:id/finalize-seats
 * @access  Private (owner or admin)
 */
export const finalizeSeats = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate('customer');
    if (!order) throw new ApiError(404, 'Order not found');

    if (req.user.role !== 'ADMIN' && order.customer._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    const orderDetails = await OrderDetail.find({ order: order._id }).populate({ path: 'ticket', populate: { path: 'showSeat' } });

    const seatIdsByConcert = {};
    for (const detail of orderDetails) {
      if (detail.ticket && detail.ticket.showSeat) {
        const showSeat = detail.ticket.showSeat;
        const showSeatId = showSeat._id ? showSeat._id : showSeat;
        await ShowSeat.findByIdAndUpdate(showSeatId, { status: 'SOLD', lock_expire_time: null, locked_by: null });

        const concertId = showSeat.concert ? (showSeat.concert._id || showSeat.concert) : null;
        if (concertId) {
          seatIdsByConcert[concertId] = seatIdsByConcert[concertId] || [];
          seatIdsByConcert[concertId].push(showSeatId.toString());
        }
      }
    }

    // Emit socket updates per concert
    if (req && req.app && typeof req.app.get === 'function') {
      const io = req.app.get('io');
      if (io) {
        for (const [concertId, seatIds] of Object.entries(seatIdsByConcert)) {
          io.to(`concert:${concertId}`).emit('seats-status-changed', { seatIds, status: 'SOLD' });
        }
      }
    }

    res.json({ success: true, message: 'Seats finalized and broadcast' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Attach locked seats to an order: create tickets & orderDetails from showSeats locked by the customer
 * @route   POST /api/orders/:id/attach-locked-seats
 * @access  Private (owner or admin)
 */
export const attachLockedSeats = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId).populate('customer');
    if (!order) throw new ApiError(404, 'Order not found');

    if (req.user.role !== 'ADMIN' && order.customer._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Find showSeats locked by this user for the concert and still valid
    const now = new Date();
    const lockedSeats = await ShowSeat.find({
      concert: order.concert,
      locked_by: order.customer._id,
      status: 'LOCKED',
      lock_expire_time: { $gt: now }
    }).populate('seat ticketClass');

    if (!lockedSeats || lockedSeats.length === 0) {
      return res.status(400).json({ success: false, message: 'No locked seats found for this order/customer' });
    }

    const concertDoc = await Concert.findById(order.concert);
    const seatIdsByConcert = {};
    const createdDetails = [];

    for (const showSeat of lockedSeats) {
      // create ticket
      const ticket = await Ticket.create({
        showSeat: showSeat._id,
        ticketClass: showSeat.ticketClass?._id,
        concert: order.concert,
        customer: order.customer._id,
        ticket_code: 'TKT' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase(),
        qr_hash: crypto.createHash('sha256').update(Date.now().toString() + showSeat._id.toString()).digest('hex'),
        status: 'VALID'
      });

      const detail = await OrderDetail.create({
        order: order._id,
        ticket: ticket._id,
        price_snapshot: showSeat.price || 0,
        ticket_info: {
          concert_title: concertDoc?.title || '',
          ticket_class: showSeat.ticketClass?.name,
          seat_label: showSeat.displayLabel || showSeat.seat?.label,
          zone_name: showSeat.ticketClass?.zone?.name
        }
      });

      // mark showSeat SOLD now that payment presumably completed
      await ShowSeat.findByIdAndUpdate(showSeat._id, { status: 'SOLD', lock_expire_time: null, locked_by: null });

      const concertId = showSeat.concert ? (showSeat.concert._id || showSeat.concert) : null;
      if (concertId) {
        seatIdsByConcert[concertId] = seatIdsByConcert[concertId] || [];
        seatIdsByConcert[concertId].push(showSeat._id.toString());
      }

      createdDetails.push(detail);
    }

    // Emit socket updates per concert
    if (req && req.app && typeof req.app.get === 'function') {
      const io = req.app.get('io');
      if (io) {
        for (const [concertId, seatIds] of Object.entries(seatIdsByConcert)) {
          io.to(`concert:${concertId}`).emit('seats-status-changed', { seatIds, status: 'SOLD' });
        }
      }
    }

    // Return fresh populated orderDetails for client
    const populated = await OrderDetail.find({ order: order._id }).populate({ path: 'ticket', populate: { path: 'showSeat', populate: { path: 'seat' } } });
    res.json({ success: true, message: 'Attached locked seats to order', data: { orderDetails: populated } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download e-ticket PDF for an order
 * @route   GET /api/orders/:id/ticket
 * @access  Private
 */
export const downloadTickets = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('customer');
    if (!order) throw new ApiError(404, 'Order not found');

    // Check ownership
    if (req.user.role !== 'ADMIN' && order.customer._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    const pdfBuffer = await mailer.generateTicketPdfBuffer(order._id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${order.code}-tickets.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel order (request refund)
 * @route   POST /api/orders/:id/cancel
 * @access  Private
 */
export const cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id)
      .populate('concert');

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    // Check ownership
    if (req.user.role !== 'ADMIN' && order.customer.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Check if order can be cancelled
    if (!['PENDING', 'PAID'].includes(order.status)) {
      throw new ApiError(400, `Cannot cancel order with status: ${order.status}`);
    }

    // Calculate refund based on concert date using hour thresholds:
    //  - >= 168 hours (7 days): 100%
    //  - >= 72 hours (3 days): 50%
    //  - < 48 hours: 0%
    const now = new Date();
    const concertDate = new Date(order.concert.start_time);
    const hoursUntilConcert = Math.floor((concertDate - now) / (1000 * 60 * 60));

    let refundPercent = 0;
    let refundMessage = '';

    if (hoursUntilConcert >= 168) {
      refundPercent = 100;
      refundMessage = '100% refund (>=7 days before event)';
    } else if (hoursUntilConcert >= 72) {
      refundPercent = 50;
      refundMessage = '50% refund (>=3 days before event)';
    } else if (hoursUntilConcert < 48) {
      refundPercent = 0;
      refundMessage = 'No refund available (<48 hours before event)';
    } else {
      // Default conservative: no refund for 48-72h window
      refundPercent = 0;
      refundMessage = 'No refund available (48-72 hours before event)';
    }

    // If order is PAID, create a cancellation request only (admin must approve)
    if (order.status === 'PAID') {
      order.cancellation = {
        requested_at: new Date(),
        reason,
        processed_at: null,
        processed_by: null,
        refund_amount: Math.round(order.total_amount * (refundPercent / 100)),
        status: 'PENDING'
      };
      // Keep order.status as PAID until admin processes the refund
      await order.save();

      return res.json({
        success: true,
        message: `Cancellation request submitted. ${refundMessage}`,
        data: {
          order,
          refundAmount: order.cancellation.refund_amount,
          refundStatus: order.cancellation.status
        }
      });
    }

    // For non-paid orders (PENDING), cancel immediately and release seats
    await order.cancel(reason);

    // Update cancellation info for immediate cancellations
    order.cancellation = {
      ...order.cancellation,
      reason,
      refund_amount: Math.round(order.total_amount * (refundPercent / 100)),
      status: 'APPROVED',
      processed_at: new Date(),
      processed_by: req.user._id
    };
    await order.save();

    res.json({
      success: true,
      message: `Order cancelled. ${refundMessage}`,
      data: {
        order,
        refundAmount: order.cancellation.refund_amount,
        refundStatus: order.cancellation.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get cancellation requests for admin
 * @route   GET /api/orders/admin/cancellations
 * @access  Admin
 */
export const getCancellationRequests = async (req, res, next) => {
  try {
    const { cancellationStatus = 'PENDING', page = 1, limit = 20 } = req.query;
    const query = { 'cancellation.status': cancellationStatus === 'all' ? { $exists: true } : cancellationStatus };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query).populate('customer', 'fullName email').populate('concert', 'title start_time').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);

    // Map to a simplified shape expected by admin UI
    const mapped = orders.map(o => ({
      _id: o._id,
      order_code: o.code,
      concert: { title: o.concert?.title, start_time: o.concert?.start_time },
      total_amount: o.total_amount,
      customer: { fullName: o.customer?.fullName, email: o.customer?.email },
      cancellation_requested_at: o.cancellation?.requested_at,
      cancellation_reason: o.cancellation?.reason,
      cancellation_status: o.cancellation?.status
    }));

    res.json({ success: true, data: { orders: mapped, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all orders (Admin)
 * @route   GET /api/orders/admin/all
 * @access  Admin
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const {
      status,
      concert,
      customer,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (concert) query.concert = concert;
    if (customer) query.customer = customer;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'username email fullName')
        .populate('concert', 'title start_time')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        orders,
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
 * @desc    Process refund request (Admin)
 * @route   PUT /api/orders/:id/refund
 * @access  Admin
 */
// Notify user via socket (if available)
function notifyUser(req, userId, payload) {
  try {
    if (req && req.app && typeof req.app.get === 'function') {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${userId}`).emit('order-cancellation-processed', payload);
      }
    }
  } catch (e) {
    console.error('Failed to emit socket notification:', e);
  }
}

export const processRefund = async (req, res, next) => {
  try {
    const { approve, refundAmount } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (!order.cancellation || order.cancellation.status !== 'PENDING') {
      throw new ApiError(400, 'No pending refund request for this order');
    }

    order.cancellation.processed_at = new Date();
    order.cancellation.processed_by = req.user._id;

    if (approve) {
      order.cancellation.status = 'APPROVED';
      order.cancellation.refund_amount = refundAmount || order.cancellation.refund_amount || 0;
      order.cancellation.processed_at = new Date();
      order.cancellation.processed_by = req.user._id;

      // Attempt to process refund in DB and mark payment refunded (gateway integration would be here)
      const payment = await Payment.findOne({ order: order._id });
      if (payment) {
        try {
          const refundTransId = `REF${Date.now()}`;
          await payment.processRefund(order.cancellation.refund_amount || 0, req.body.adminNote || 'Refund processed by admin', refundTransId);
        } catch (e) {
          console.error('Failed to mark payment refunded:', e);
          // proceed but log error
        }
      }

      // Mark tickets cancelled and release show seats
      try {
        const details = await OrderDetail.find({ order: order._id }).populate({ path: 'ticket', populate: { path: 'showSeat' } });
        for (const d of details) {
          if (d.ticket) {
            await Ticket.findByIdAndUpdate(d.ticket._id, { status: 'CANCELLED' });
            if (d.ticket.showSeat) {
              await ShowSeat.findByIdAndUpdate(d.ticket.showSeat._id || d.ticket.showSeat, { status: 'AVAILABLE', locked_by: null, lock_expire_time: null });
            }
          }
        }
      } catch (e) {
        console.error('Failed to release seats after refund approval:', e);
      }

      order.status = 'REFUNDED';
    } else {
      order.cancellation.status = 'REJECTED';
      order.cancellation.processed_at = new Date();
      order.cancellation.processed_by = req.user._id;
      order.status = 'PAID'; // Revert status
    }

    // Save admin note if provided
    if (req.body.adminNote) order.cancellation.admin_note = req.body.adminNote;

    await order.save();

    // Notify customer via socket (if connected)
    try {
      const payload = {
        orderId: order._id,
        orderCode: order.code,
        cancellation: order.cancellation,
        status: order.status,
        message: approve ? 'Refund approved' : 'Refund rejected'
      };
      notifyUser(req, order.customer, payload);
    } catch (e) {
      console.error('Failed to notify user about refund:', e);
    }

    res.json({
      success: true,
      message: approve ? 'Refund approved' : 'Refund rejected',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// Helper: notify user via socket (if available)
// (removed duplicate - moved above)

/**
 * @desc    Get order statistics
 * @route   GET /api/orders/admin/stats
 * @access  Admin
 */
export const getOrderStats = async (req, res, next) => {
  try {
    const { startDate, endDate, concert } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    if (concert) matchStage.concert = concert;

    const [
      totalStats,
      statusStats,
      revenueByDay,
      topConcerts
    ] = await Promise.all([
      // Total stats
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, '$total_amount', 0] } },
            avgOrderValue: { $avg: '$total_amount' }
          }
        }
      ]),
      // By status
      Order.aggregate([
        { $match: matchStage },
        { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$total_amount' } } }
      ]),
      // Revenue by day (last 30 days)
      Order.aggregate([
        {
          $match: {
            status: 'PAID',
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total_amount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      // Top concerts by revenue
      Order.aggregate([
        { $match: { ...matchStage, status: 'PAID' } },
        {
          $group: {
            _id: '$concert',
            revenue: { $sum: '$total_amount' },
            ticketsSold: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'concerts',
            localField: '_id',
            foreignField: '_id',
            as: 'concert'
          }
        },
        { $unwind: '$concert' }
      ])
    ]);

    res.json({
      success: true,
      data: {
        summary: totalStats[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 },
        byStatus: statusStats,
        revenueByDay,
        topConcerts
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  lockSeats,
  releaseSeats,
  createOrder,
  getMyOrders,
  getOrderById,
  getOrderByCode,
  finalizeSeats,
  downloadTickets,
  cancelOrder,
  getAllOrders,
  processRefund,
  getOrderStats
};
