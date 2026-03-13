import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import all models
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import Zone from '../models/Zone.js';
import Seat from '../models/Seat.js';
import Artist from '../models/Artist.js';
import Concert from '../models/Concert.js';
import Category from '../models/Category.js';
import TicketClass from '../models/TicketClass.js';
import ShowSeat from '../models/ShowSeat.js';
import Voucher from '../models/Voucher.js';
import Order from '../models/Order.js';
import OrderDetail from '../models/OrderDetail.js';
import Payment from '../models/Payment.js';
import Ticket from '../models/Ticket.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshow_ticket';

/**
 * Clear ALL collections in database
 */
async function clearDatabase() {
  console.log('🧹 Clearing ALL database collections...');
  await Promise.all([
    User.deleteMany({}),
    Venue.deleteMany({}),
    Zone.deleteMany({}),
    Seat.deleteMany({}),
    Artist.deleteMany({}),
    Concert.deleteMany({}),
    Category.deleteMany({}),
    TicketClass.deleteMany({}),
    ShowSeat.deleteMany({}),
    Voucher.deleteMany({}),
    Order.deleteMany({}),
    OrderDetail.deleteMany({}),
    Payment.deleteMany({}),
    Ticket.deleteMany({})
  ]);
  console.log('✅ All collections cleared');
}

/**
 * Create Admin Account Only
 */
async function createAdmin() {
  console.log('👤 Creating admin account...');
  
  // Don't hash here - the User model's pre-save hook will hash it automatically
  const admin = await User.create({
    username: 'admin',
    email: 'admin@gmail.com',
    password_hash: 'admin123',  // Will be auto-hashed by model
    fullName: 'Administrator',
    phone: '0901234567',
    role: 'ADMIN',
    status: true,
    emailVerified: true
  });

  console.log('✅ Admin account created');
  return admin;
}

/**
 * Main seed function
 */
async function seed() {
  try {
    console.log('🚀 Starting database setup...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    await clearDatabase();
    await createAdmin();
    
    console.log('\n' + '═'.repeat(50));
    console.log('🎉 Database setup complete!\n');
    console.log('🔐 Admin Account:');
    console.log('   • Email:    admin@gmail.com');
    console.log('   • Password: admin123');
    console.log('═'.repeat(50));
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

seed();
