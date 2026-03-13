import mongoose from 'mongoose';

/**
 * Artist Model - Performers/bands
 * Simplified: only name and bio
 */
const artistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  bio: {
    type: String,
    maxlength: 2000
  }
}, { timestamps: true });

artistSchema.index({ name: 'text' });

const Artist = mongoose.model('Artist', artistSchema);
export default Artist;
