import Voucher from '../models/Voucher.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Voucher Controller
 * Handles discount voucher operations
 */

/**
 * @desc    Get all vouchers
 * @route   GET /api/vouchers
 * @access  Private (Admin/Organizer)
 */
export const getVouchers = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status === 'active') {
      query.active = true;
      query.valid_from = { $lte: new Date() };
      query.valid_until = { $gte: new Date() };
    } else if (status === 'expired') {
      query.valid_until = { $lt: new Date() };
    }
    if (type) query.discount_type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [vouchers, total] = await Promise.all([
      Voucher.find(query)
        .populate('concerts', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Voucher.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        vouchers,
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
 * @desc    Get voucher by code (public - for applying)
 * @route   GET /api/vouchers/code/:code
 * @access  Private
 */
export const getVoucherByCode = async (req, res, next) => {
  try {
    const voucher = await Voucher.findOne({ 
      code: req.params.code.toUpperCase() 
    }).populate('concerts', 'title');

    if (!voucher) {
      throw new ApiError(404, 'Voucher not found');
    }

    res.json({
      success: true,
      data: voucher
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate voucher
 * @route   POST /api/vouchers/validate
 * @access  Private
 */
export const validateVoucher = async (req, res, next) => {
  try {
    const { code, concertId, totalAmount } = req.body;

    const voucher = await Voucher.findOne({ code: code.toUpperCase() });

    if (!voucher) {
      return res.json({
        success: false,
        valid: false,
        message: 'Voucher not found'
      });
    }

    // Check if voucher is active
    if (!voucher.active) {
      return res.json({
        success: false,
        valid: false,
        message: 'Voucher is not active'
      });
    }

    // Check date validity
    const now = new Date();
    if (now < voucher.valid_from || now > voucher.valid_until) {
      return res.json({
        success: false,
        valid: false,
        message: 'Voucher has expired or not yet valid'
      });
    }

    // Check usage limit
    if (voucher.max_uses && voucher.used_count >= voucher.max_uses) {
      return res.json({
        success: false,
        valid: false,
        message: 'Voucher usage limit reached'
      });
    }

    // Check applicable concerts
    if (voucher.concerts && voucher.concerts.length > 0) {
      if (!voucher.concerts.includes(concertId)) {
        return res.json({
          success: false,
          valid: false,
          message: 'Voucher not applicable for this concert'
        });
      }
    }

    // Check minimum purchase
    if (voucher.min_purchase && totalAmount < voucher.min_purchase) {
      return res.json({
        success: false,
        valid: false,
        message: `Minimum purchase amount is ${voucher.min_purchase.toLocaleString()} VND`
      });
    }

    // Calculate discount
    let discount = 0;
    if (voucher.discount_type === 'PERCENTAGE') {
      discount = totalAmount * (voucher.discount_value / 100);
      if (voucher.max_discount) {
        discount = Math.min(discount, voucher.max_discount);
      }
    } else {
      discount = voucher.discount_value;
    }

    res.json({
      success: true,
      valid: true,
      message: 'Voucher is valid',
      data: {
        voucher: {
          code: voucher.code,
          discount_type: voucher.discount_type,
          discount_value: voucher.discount_value,
          max_discount: voucher.max_discount,
          usage_limit: voucher.usage_limit
        },
        calculated_discount: discount,
        final_amount: totalAmount - discount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create voucher
 * @route   POST /api/vouchers
 * @access  Private (Admin/Organizer)
 */
export const createVoucher = async (req, res, next) => {
  try {
    const {
      code,
      discount_type,
      discount_value,
      max_discount,
      min_purchase,
      usage_limit,
      valid_from,
      valid_until,
      concerts,
      description
    } = req.body;

    // Check if code exists
    const existing = await Voucher.findOne({ code: code.toUpperCase() });
    if (existing) {
      throw new ApiError(400, 'Voucher code already exists');
    }

    const voucher = new Voucher({
      code: code.toUpperCase(),
      discount_type,
      discount_value,
      max_discount,
      min_purchase,
      usage_limit,
      valid_from,
      valid_until,
      concerts,
      description,
      created_by: req.user._id
    });

    await voucher.save();

    res.status(201).json({
      success: true,
      message: 'Voucher created successfully',
      data: voucher
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update voucher
 * @route   PUT /api/vouchers/:id
 * @access  Private (Admin/Organizer)
 */
export const updateVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      throw new ApiError(404, 'Voucher not found');
    }

    // Don't allow changing code
    delete req.body.code;

    const updated = await Voucher.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Voucher updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete voucher
 * @route   DELETE /api/vouchers/:id
 * @access  Private (Admin)
 */
export const deleteVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      throw new ApiError(404, 'Voucher not found');
    }

    if (voucher.used_count > 0) {
      // Soft delete - just deactivate
      voucher.active = false;
      await voucher.save();
      return res.json({
        success: true,
        message: 'Voucher deactivated (has usage history)'
      });
    }

    await voucher.deleteOne();

    res.json({
      success: true,
      message: 'Voucher deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle voucher active status
 * @route   PATCH /api/vouchers/:id/toggle
 * @access  Private (Admin/Organizer)
 */
export const toggleVoucher = async (req, res, next) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      throw new ApiError(404, 'Voucher not found');
    }

    voucher.active = !voucher.active;
    await voucher.save();

    res.json({
      success: true,
      message: `Voucher ${voucher.active ? 'activated' : 'deactivated'}`,
      data: voucher
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getVouchers,
  getVoucherByCode,
  validateVoucher,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  toggleVoucher
};
