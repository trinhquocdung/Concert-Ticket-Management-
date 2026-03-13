import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Model - Simplified
 * Handles all user types: ADMIN, STAFF, ORG (Organizer), CUS (Customer)
 */
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  clerkId: {
    type: String,
    sparse: true,
    unique: true,
    index: true
  },
  password_hash: {
    type: String,
    required: true,
    select: false
  },
  fullName: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['ADMIN', 'STAFF', 'ORG', 'CUS'],
    default: 'CUS'
  },
  status: {
    type: Boolean,
    default: true // true = Active, false = Locked
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Role-specific fields (embedded)
  // For Customer (CUS)
  customer: {
    dob: Date,
    address: String,
    loyalty_points: { type: Number, default: 0 },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Concert' }]
  },
  
  // For Staff
  staff: {
    employee_code: String,
    shift: String,
    assigned_events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Concert' }]
  },
  
  // For Organizer (ORG)
  organizer: {
    company_name: String,
    tax_code: String,
    description: String, // Description about the organizer
    verified: { type: Boolean, default: false }
  }
  
}, { timestamps: true });

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ username: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password_hash')) return next();
  this.password_hash = await bcrypt.hash(this.password_hash, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

// Get public profile (hide sensitive info)
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    fullName: this.fullName,
    phone: this.phone,
    avatar: this.avatar,
    role: this.role,
    status: this.status,
    emailVerified: this.emailVerified,
    customer: this.role === 'CUS' ? this.customer : undefined,
    staff: this.role === 'STAFF' ? this.staff : undefined,
    organizer: this.role === 'ORG' ? this.organizer : undefined,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);
export default User;
