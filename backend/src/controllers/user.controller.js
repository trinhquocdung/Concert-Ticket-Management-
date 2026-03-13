import User from '../models/User.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * User Controller
 * Handles user management (Admin functions)
 */

/**
 * @desc    Get all users (with pagination and filters)
 * @route   GET /api/users
 * @access  Admin
 */
export const getUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filter by role
    if (role) {
      query.role = role;
    }

    // Filter by status
    if (status !== undefined) {
      query.status = status === 'true';
    }

    // Search by username, email, or fullName
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password_hash')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users,
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
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Admin
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password_hash');

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new user (Admin can create any role)
 * @route   POST /api/users
 * @access  Admin
 */
export const createUser = async (req, res, next) => {
  try {
    const { username, email, password, fullName, phone, role, status } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      throw new ApiError(400, 'User with this email or username already exists');
    }

    const user = await User.create({
      username,
      email,
      password_hash: password,
      fullName,
      phone,
      role: role || 'CUS',
      status: status !== undefined ? status : true,
      emailVerified: true // Admin-created users are pre-verified
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user.toPublicJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Admin
 */
export const updateUser = async (req, res, next) => {
  try {
    const { fullName, phone, role, status, customer, staff, organizer } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Update fields
    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (status !== undefined) user.status = status;

    // Update role-specific fields
    if (customer && user.role === 'CUS') {
      user.customer = { ...user.customer, ...customer };
    }
    if (staff && user.role === 'STAFF') {
      user.staff = { ...user.staff, ...staff };
    }
    if (organizer && user.role === 'ORG') {
      user.organizer = { ...user.organizer, ...organizer };
    }

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user.toPublicJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Admin
 */
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      throw new ApiError(400, 'You cannot delete your own account');
    }

    // Prevent deleting other admins
    if (user.role === 'ADMIN' && req.user.role === 'ADMIN') {
      throw new ApiError(400, 'You cannot delete another admin');
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lock/Unlock user account
 * @route   PUT /api/users/:id/status
 * @access  Admin
 */
export const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Prevent locking yourself
    if (user._id.toString() === req.user._id.toString()) {
      throw new ApiError(400, 'You cannot lock your own account');
    }

    // Prevent locking other admins
    if (user.role === 'ADMIN') {
      throw new ApiError(400, 'You cannot lock an admin account');
    }

    user.status = !user.status;
    await user.save();

    res.json({
      success: true,
      message: `User account ${user.status ? 'unlocked' : 'locked'} successfully`,
      data: { status: user.status }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset user password (Admin)
 * @route   PUT /api/users/:id/reset-password
 * @access  Admin
 */
export const resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters');
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    user.password_hash = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user statistics
 * @route   GET /api/users/stats
 * @access  Admin
 */
export const getUserStats = async (req, res, next) => {
  try {
    const [totalUsers, roleStats, statusStats, recentUsers] = await Promise.all([
      User.countDocuments(),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('username email role createdAt')
    ]);

    res.json({
      success: true,
      data: {
        total: totalUsers,
        byRole: roleStats.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
        byStatus: {
          active: statusStats.find(s => s._id === true)?.count || 0,
          locked: statusStats.find(s => s._id === false)?.count || 0
        },
        recentUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetUserPassword,
  getUserStats
};
