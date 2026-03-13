import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import crypto from 'crypto';

/**
 * Auth Controller
 * Handles user registration, login, password reset, etc.
 */

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { username, email, password, fullName, phone, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      throw new ApiError(400, 'User with this email or username already exists');
    }

    // Create user (only allow CUS role for public registration)
    const user = await User.create({
      username,
      email,
      password_hash: password,
      fullName,
      phone,
      role: 'CUS', // Force customer role for public registration
      emailVerified: false,
      verificationToken: crypto.randomBytes(32).toString('hex')
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    // TODO: Send verification email

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: {
        user: user.toPublicJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Please provide email and password');
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password_hash');

    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Check if account is locked
    if (!user.status) {
      throw new ApiError(403, 'Your account has been locked. Please contact support.');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toPublicJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      success: true,
      data: user.toPublicJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/auth/me
 * @access  Private
 */
export const updateMe = async (req, res, next) => {
  try {
    const allowedFields = ['fullName', 'phone', 'avatar'];
    const updates = {};

    // Only allow specific fields to be updated
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle role-specific fields
    if (req.user.role === 'CUS' && req.body.customer) {
      updates.customer = { ...req.user.customer, ...req.body.customer };
    }
    if (req.user.role === 'ORG' && req.body.organizer) {
      updates.organizer = { ...req.user.organizer, ...req.body.organizer };
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user.toPublicJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ApiError(400, 'Please provide current and new password');
    }

    if (newPassword.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters');
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password_hash');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    // Update password
    user.password_hash = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password - Send reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    // TODO: Send reset email with token

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
      // In development, return token for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password with token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters');
    }

    // Hash token to compare
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    // Update password
    user.password_hash = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      throw new ApiError(400, 'Invalid verification token');
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout (client-side token removal)
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
  // JWT is stateless, so logout is handled client-side
  // This endpoint can be used for any server-side cleanup if needed
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

/**
 * @desc    Sync Clerk user with backend database
 * @route   POST /api/auth/clerk-sync
 * @access  Public (with Clerk token)
 */
export const clerkSync = async (req, res, next) => {
  try {
    const { clerkId, email, username, fullName, phone, avatar } = req.body;

    if (!clerkId || !email) {
      throw new ApiError(400, 'Clerk ID and email are required');
    }

    // Find existing user by clerkId or email
    let user = await User.findOne({
      $or: [{ clerkId }, { email }]
    });

    if (user) {
      // Update existing user
      user.clerkId = clerkId;
      user.fullName = fullName || user.fullName;
      user.phone = phone || user.phone;
      user.avatar = avatar || user.avatar;
      user.email_verified = true; // Clerk handles email verification
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        clerkId,
        email,
        username: username || email.split('@')[0],
        fullName: fullName || 'New User',
        phone: phone || '',
        avatar,
        role: 'CUS', // Default role for new users
        status: true,
        email_verified: true,
        password_hash: crypto.randomBytes(32).toString('hex'), // Random password (not used with Clerk)
      });
    }

    // Generate backend JWT token
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'User synced successfully',
      data: {
        user: user.toPublicJSON(),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  logout,
  clerkSync
};
