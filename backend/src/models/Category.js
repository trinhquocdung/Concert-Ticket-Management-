import mongoose from 'mongoose';

/**
 * Category Model - Event categories
 * Replaces hardcoded categories with dynamic management
 */
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0 // For sorting in UI
  }
}, { timestamps: true });

// Generate slug from name before saving
categorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1, order: 1 });

const Category = mongoose.model('Category', categorySchema);
export default Category;
