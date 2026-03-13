import mongoose from 'mongoose';

/**
 * Venue Model - Represents event locations
 * 
 * The venue contains the base seat layout that can be reused across events.
 * Event-specific customizations (zone colors, pricing, labels) are handled
 * by EventZone model.
 */
const venueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    trim: true
  },
  total_capacity: {
    type: Number,
    required: true,
    min: 1
  },
  map_image: {
    type: String // URL to venue seating map image
  },
  google_maps_url: String,
  
  // Canvas dimensions for seat map editor
  canvas: {
    width: { type: Number, default: 1200 },
    height: { type: Number, default: 800 }
  },
  
  // Stage configuration
  stage: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 400 },
    height: { type: Number, default: 80 },
    label: { type: String, default: 'STAGE' }
  },
  
  // Floor/Level definitions (TẦNG 1, TẦNG 2, etc.)
  floors: [{
    name: { type: String, required: true }, // "TẦNG 1", "TẦNG 2"
    order: { type: Number, default: 0 },
    // Bounding area for this floor on canvas
    bounds: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      width: { type: Number, default: 1200 },
      height: { type: Number, default: 400 }
    }
  }],
  
  // Default row label style
  rowLabelStyle: {
    type: String,
    enum: ['ALPHA', 'NUMERIC', 'CUSTOM'], // A,B,C or 1,2,3 or custom
    default: 'ALPHA'
  }
}, { timestamps: true });

venueSchema.index({ name: 'text', address: 'text' });
venueSchema.index({ city: 1 });

const Venue = mongoose.model('Venue', venueSchema);
export default Venue;
