import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import config from './config/index.js';
import Order from './models/Order.js';

// Connect to database
await connectDB();

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io for real-time features
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigins || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Attach io to express app so routes/controllers can emit events
app.set('io', io);

// Periodic expiration job: expire pending orders and release seats
const startOrderExpiryJob = () => {
  const intervalMs = 60 * 1000; // run every 60 seconds
  setInterval(async () => {
    try {
      const count = await Order.expirePendingOrders();
      if (count && count > 0) console.log(`Order expiry job: expired ${count} pending orders`);
    } catch (err) {
      console.error('Order expiry job error', err);
    }
  }, intervalMs);
};

startOrderExpiryJob();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-concert', (concertId) => {
    socket.join(`concert:${concertId}`);
  });

  socket.on('join-user', (userId) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
  });

  socket.on('leave-user', (userId) => {
    if (!userId) return;
    socket.leave(`user:${userId}`);
  });

  socket.on('leave-concert', (concertId) => {
    socket.leave(`concert:${concertId}`);
  });

  socket.on('seat-selecting', (data) => {
    const { concertId, seatIds, userId } = data;
    socket.to(`concert:${concertId}`).emit('seats-being-selected', { seatIds, userId, socketId: socket.id });
  });

  socket.on('seats-locked', (data) => {
    const { concertId, seatIds, userId, lockedUntil } = data;
    io.to(`concert:${concertId}`).emit('seats-status-changed', { seatIds, status: 'LOCKED', userId, lockedUntil });
  });

  socket.on('seats-released', (data) => {
    const { concertId, seatIds } = data;
    io.to(`concert:${concertId}`).emit('seats-status-changed', { seatIds, status: 'AVAILABLE' });
  });

  socket.on('seats-sold', (data) => {
    const { concertId, seatIds } = data;
    io.to(`concert:${concertId}`).emit('seats-status-changed', { seatIds, status: 'SOLD' });
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Helper to emit to a room from other modules
export const emitToRoom = (room, event, data) => io.to(room).emit(event, data);

// Start server
const PORT = config.port || 5000;

httpServer.listen(PORT, () => {
  console.log(`QuickShow Ticket API Server running on port ${PORT} - Environment: ${config.nodeEnv || 'development'}`);
  console.log(`Health: http://localhost:${PORT}/health  •  API: http://localhost:${PORT}/api  •  Socket.io: ws://localhost:${PORT}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  try { io.close(); } catch (e) { /* ignore */ }
  httpServer.close(() => { console.log('HTTP server closed'); process.exit(0); });
  setTimeout(() => { console.error('Could not close connections in time, forcefully shutting down'); process.exit(1); }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err); process.exit(1); });
process.on('unhandledRejection', (reason, promise) => { console.error('Unhandled Rejection at:', promise, 'reason:', reason); });

export { io };
export default httpServer;
