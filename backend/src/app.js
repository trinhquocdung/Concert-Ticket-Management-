import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import concertRoutes from './routes/concert.routes.js';
import venueRoutes from './routes/venue.routes.js';
import orderRoutes from './routes/order.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import { createPayment } from './controllers/momo.controller.js';
import voucherRoutes from './routes/voucher.routes.js';
import artistRoutes from './routes/artist.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import categoryRoutes from './routes/category.routes.js';
import eventZoneRoutes from './routes/eventZone.routes.js';
import systemRoutes from './routes/system.routes.js';

// Import error handler
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(express.json());
/**
 * Middleware
 */

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
  origin: config.corsOrigins || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting (disabled in development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting entirely in development
    if (config.nodeEnv === 'development') return true;
    // Skip rate limiting for payment callbacks (MoMo endpoints)
      return req.path.includes('/payment') || req.path.includes('/payments/momo');
  }
});

app.use('/api/', limiter);

// More strict rate limit for auth routes (disabled in development)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  },
  skip: () => config.nodeEnv === 'development' // Skip in development
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'QuickShow Ticket API',
    version: '1.0.0',
    environment: config.nodeEnv
  });
});

// Dev-only: debug payment config presence
if (config.nodeEnv === 'development') {
  app.get('/api/debug/payments', (req, res) => {
    res.json({
      momoConfigured: !!process.env.MOMO_PARTNER_CODE
    });
  });
}

/**
 * API Routes
 */
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/concerts', concertRoutes);
app.use('/api/concerts', eventZoneRoutes); // Event zone routes nested under concerts
app.use('/api/venues', venueRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/system', systemRoutes);
app.post('/api/payment', createPayment);
// MoMo check-status endpoint used by frontend polling
import { checkMoMoStatus } from './controllers/momo.controller.js';
app.post('/api/payment/momo/check-status', checkMoMoStatus);
// MoMo IPN (callback) endpoint
import { momoIPN } from './controllers/momo.controller.js';
app.post('/api/payment/momo/ipn', momoIPN);
/**
 * 404 Handler
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

/**
 * Global Error Handler
 */
app.use(errorHandler);

export default app;
