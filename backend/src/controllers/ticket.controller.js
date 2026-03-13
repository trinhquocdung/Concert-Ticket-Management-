import Ticket from '../models/Ticket.js';
import Order from '../models/Order.js';
import OrderDetail from '../models/OrderDetail.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Ticket Controller
 * Handles ticket operations, check-in, etc.
 */

/**
 * @desc    Get user's tickets
 * @route   GET /api/tickets
 * @access  Private
 */
export const getMyTickets = async (req, res, next) => {
  try {
    const { status, concert, page = 1, limit = 20 } = req.query;

    const query = { customer: req.user._id };
    if (status) query.status = status;
    if (concert) query.concert = concert;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('concert', 'title thumbnail start_time venue')
        .populate('ticketClass', 'name price')
        .populate({
          path: 'showSeat',
          populate: { path: 'seat', select: 'row number' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Ticket.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        tickets,
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
 * @desc    Get ticket by ID
 * @route   GET /api/tickets/:id
 * @access  Private
 */
export const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('concert')
      .populate('ticketClass')
      .populate({
        path: 'showSeat',
        populate: [
          { path: 'seat' },
          { path: 'ticketClass' }
        ]
      })
      .populate('customer', 'username fullName email');

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found');
    }

    // Check ownership (unless staff/admin)
    if (!['ADMIN', 'STAFF'].includes(req.user.role) && 
        ticket.customer._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Generate QR data
    const qrData = ticket.generateQR();

    res.json({
      success: true,
      data: {
        ticket,
        qrData
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get ticket by code (for verification)
 * @route   GET /api/tickets/code/:code
 * @access  Private (Staff/Admin)
 */
export const getTicketByCode = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ ticket_code: req.params.code })
      .populate('concert', 'title start_time venue')
      .populate('ticketClass', 'name')
      .populate({
        path: 'showSeat',
        populate: { path: 'seat' }
      })
      .populate('customer', 'username fullName');

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found');
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify ticket by QR hash (for check-in)
 * @route   POST /api/tickets/verify
 * @access  Private (Staff/Admin)
 */
export const verifyTicket = async (req, res, next) => {
  try {
    const { qrHash, ticketCode } = req.body;

    if (!qrHash && !ticketCode) {
      throw new ApiError(400, 'Please provide qrHash or ticketCode');
    }

    const query = qrHash ? { qr_hash: qrHash } : { ticket_code: ticketCode };

    const ticket = await Ticket.findOne(query)
      .populate('concert', 'title start_time')
      .populate('ticketClass', 'name')
      .populate({
        path: 'showSeat',
        populate: { path: 'seat' }
      })
      .populate('customer', 'username fullName');

    if (!ticket) {
      return res.json({
        success: false,
        valid: false,
        message: 'Ticket not found'
      });
    }

    const isValid = ticket.status === 'VALID';

    res.json({
      success: true,
      valid: isValid,
      message: isValid ? 'Ticket is valid' : `Ticket status: ${ticket.status}`,
      data: {
        ticket,
        canCheckIn: isValid
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check-in ticket (scan at entrance)
 * @route   POST /api/tickets/:id/check-in
 * @access  Private (Staff/Admin)
 */
export const checkInTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('concert', 'title start_time')
      .populate('customer', 'username fullName');

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found');
    }

    if (ticket.status !== 'VALID') {
      throw new ApiError(400, `Cannot check in. Ticket status: ${ticket.status}`);
    }

    // Check if concert is today or within valid check-in window
    const now = new Date();
    const concertDate = new Date(ticket.concert.start_time);
    const hoursBefore = (concertDate - now) / (1000 * 60 * 60);

    if (hoursBefore > 6) {
      throw new ApiError(400, 'Check-in not yet available. Opens 6 hours before event.');
    }

    // Perform check-in
    await ticket.checkIn(req.user._id);

    res.json({
      success: true,
      message: 'Check-in successful!',
      data: {
        ticket,
        checkedInAt: ticket.checked_in_at,
        checkedInBy: req.user.username
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check-in by QR code
 * @route   POST /api/tickets/check-in-qr
 * @access  Private (Staff/Admin)
 */
export const checkInByQR = async (req, res, next) => {
  try {
    const { qrHash, ticketCode } = req.body;

    const query = qrHash ? { qr_hash: qrHash } : { ticket_code: ticketCode };
    const ticket = await Ticket.findOne(query)
      .populate('concert', 'title start_time')
      .populate('customer', 'username fullName');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Invalid QR code or ticket not found'
      });
    }

    if (ticket.status !== 'VALID') {
      return res.status(400).json({
        success: false,
        message: ticket.status === 'USED' 
          ? `Ticket already used at ${ticket.checked_in_at}` 
          : `Ticket status: ${ticket.status}`,
        data: { ticket }
      });
    }

    await ticket.checkIn(req.user._id);

    res.json({
      success: true,
      message: '✅ Check-in successful!',
      data: {
        customerName: ticket.customer?.fullName || ticket.customer?.username,
        concert: ticket.concert.title,
        checkedInAt: ticket.checked_in_at
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get check-in list for concert
 * @route   GET /api/tickets/concert/:concertId/check-in-list
 * @access  Private (Staff/Admin/Organizer)
 */
export const getCheckInList = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;

    const query = { concert: req.params.concertId };
    
    if (status === 'checked-in') {
      query.status = 'USED';
    } else if (status === 'pending') {
      query.status = 'VALID';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let tickets = await Ticket.find(query)
      .populate('customer', 'username fullName email phone')
      .populate('ticketClass', 'name')
      .populate({
        path: 'showSeat',
        populate: { path: 'seat' }
      })
      .sort({ checked_in_at: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      tickets = tickets.filter(t => 
        t.customer?.fullName?.toLowerCase().includes(searchLower) ||
        t.customer?.email?.toLowerCase().includes(searchLower) ||
        t.ticket_code.toLowerCase().includes(searchLower)
      );
    }

    // Get stats
    const stats = await Ticket.aggregate([
      { $match: { concert: req.params.concertId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Ticket.countDocuments(query);

    res.json({
      success: true,
      data: {
        tickets,
        stats: {
          total: stats.reduce((sum, s) => sum + s.count, 0),
          checkedIn: stats.find(s => s._id === 'USED')?.count || 0,
          pending: stats.find(s => s._id === 'VALID')?.count || 0,
          refunded: stats.find(s => s._id === 'REFUNDED')?.count || 0
        },
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
 * @desc    Download ticket as data (for PDF generation on client)
 * @route   GET /api/tickets/:id/download
 * @access  Private
 */
export const downloadTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate({
        path: 'concert',
        populate: { path: 'venue', select: 'name address' }
      })
      .populate('ticketClass', 'name price')
      .populate({
        path: 'showSeat',
        populate: { path: 'seat' }
      })
      .populate('customer', 'fullName email phone');

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found');
    }

    // Check ownership
    if (req.user.role !== 'ADMIN' && ticket.customer._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Access denied');
    }

    // Find the order for this ticket
    const orderDetail = await OrderDetail.findOne({ ticket: ticket._id }).populate('order');

    const qrData = ticket.generateQR();

    res.json({
      success: true,
      data: {
        ticket: {
          code: ticket.ticket_code,
          status: ticket.status,
          qrData: qrData.qr_data
        },
        concert: {
          title: ticket.concert.title,
          date: ticket.concert.start_time,
          venue: ticket.concert.venue
        },
        seat: {
          zone: ticket.ticketClass?.name,
          row: ticket.showSeat?.seat?.row,
          number: ticket.showSeat?.seat?.number,
          label: ticket.showSeat?.seat?.label
        },
        customer: {
          name: ticket.customer.fullName,
          email: ticket.customer.email
        },
        order: orderDetail?.order ? {
          code: orderDetail.order.code,
          total: orderDetail.order.total_amount,
          paidAt: orderDetail.order.updatedAt
        } : null,
        // benefits removed from ticketClass
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getMyTickets,
  getTicketById,
  getTicketByCode,
  verifyTicket,
  checkInTicket,
  checkInByQR,
  getCheckInList,
  downloadTicket
};
