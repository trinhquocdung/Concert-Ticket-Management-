import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * MongoDB Connection Configuration
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 8.x uses these defaults, but we explicitly set them
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Initialize database (create collections & default admin)
    await initializeDatabase();
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Initialize database - Create all collections and default admin account
 */
async function initializeDatabase() {
  try {
    // Import all models to ensure collections are registered
    const User = (await import('../models/User.js')).default;
    const Venue = (await import('../models/Venue.js')).default;
    const Zone = (await import('../models/Zone.js')).default;
    const Seat = (await import('../models/Seat.js')).default;
    const Artist = (await import('../models/Artist.js')).default;
    const Concert = (await import('../models/Concert.js')).default;
    const Category = (await import('../models/Category.js')).default;
    const TicketClass = (await import('../models/TicketClass.js')).default;
    const ShowSeat = (await import('../models/ShowSeat.js')).default;
    const Voucher = (await import('../models/Voucher.js')).default;
    const Order = (await import('../models/Order.js')).default;
    const OrderDetail = (await import('../models/OrderDetail.js')).default;
    const Payment = (await import('../models/Payment.js')).default;
    const Ticket = (await import('../models/Ticket.js')).default;

    // Create collections if they don't exist (this ensures indexes are created)
    const models = [User, Venue, Zone, Seat, Artist, Concert, Category, TicketClass, ShowSeat, Voucher, Order, OrderDetail, Payment, Ticket];
    
    for (const Model of models) {
      await Model.createCollection().catch(() => {});
      await Model.syncIndexes().catch(() => {});
    }
    
    console.log('✅ All collections initialized');

    // Create default admin account if it doesn't exist
    const adminExists = await User.findOne({ email: 'admin@gmail.com' });
    
    if (!adminExists) {
      //const passwordHash = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        email: 'admin@gmail.com',
        password_hash: 'admin123',
        fullName: 'Administrator',
        phone: '0901234567',
        role: 'ADMIN',
        status: true,
        emailVerified: true
      });
      console.log('✅ Default admin account created (admin@gmail.com / admin123)');
    }
  } catch (error) {
    console.error('⚠️ Database initialization warning:', error.message);
  }
}

export default connectDB;
