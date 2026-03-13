import Order from '../models/Order.js';
import OrderDetail from '../models/OrderDetail.js';
import Ticket from '../models/Ticket.js';
import ShowSeat from '../models/ShowSeat.js';

/**
 * Scan database for PAID orders and broadcast sold seats to socket rooms.
 * Optionally accepts `concertId` to limit to a single concert.
 */
export const syncSoldSeats = async (req, res, next) => {
  try {
    const concertId = req.body?.concertId || req.query?.concertId || null;

    // Find paid orders (optionally filtered by concert)
    const orderQuery = { status: 'PAID' };
    if (concertId) orderQuery.concert = concertId;
    const orders = await Order.find(orderQuery).select('_id concert');
    if (!orders || orders.length === 0) {
      return res.json({ success: true, message: 'No paid orders found', data: { count: 0 } });
    }

    const orderIds = orders.map(o => o._id);

    // Get order details and populate ticket.showSeat
    const details = await OrderDetail.find({ order: { $in: orderIds } }).populate({ path: 'ticket', populate: { path: 'showSeat' } });

    const seatIdsByConcert = {};
    for (const d of details) {
      if (!d.ticket || !d.ticket.showSeat) continue;
      const showSeat = d.ticket.showSeat;
      const showSeatId = showSeat._id ? showSeat._id.toString() : showSeat.toString();
      const cId = showSeat.concert ? (showSeat.concert._id || showSeat.concert).toString() : (d.ticket.concert ? d.ticket.concert.toString() : null);
      if (!cId) continue;
      seatIdsByConcert[cId] = seatIdsByConcert[cId] || new Set();
      seatIdsByConcert[cId].add(showSeatId);
    }

    // Persist showSeat.status = 'SOLD' for these seats and emit socket events
    const io = req.app && typeof req.app.get === 'function' ? req.app.get('io') : null;
    for (const [cId, seatSet] of Object.entries(seatIdsByConcert)) {
      const seatIds = Array.from(seatSet);
      // Update DB to ensure seats are marked SOLD
      await ShowSeat.updateMany({ _id: { $in: seatIds } }, { status: 'SOLD', lock_expire_time: null, locked_by: null });

      if (io) {
        io.to(`concert:${cId}`).emit('seats-status-changed', { seatIds, status: 'SOLD' });
      }
    }

    // Return summary
    const summary = Object.fromEntries(Object.entries(seatIdsByConcert).map(([k, s]) => [k, Array.from(s)]));
    res.json({ success: true, message: 'Broadcasted sold seats', data: { summary } });
  } catch (err) {
    next(err);
  }
};

export default { syncSoldSeats };
