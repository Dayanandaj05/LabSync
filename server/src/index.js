// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const requestLogger = require('./middleware/requestLogger');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: '*' } });

// 🔒 FORCE correct file resolution (prevents MongoDB admin.js shadowing)
const publicRoutes = require('./routes/public');
const bookingRoutes = require('./routes/bookings');
const adminUserRoutes = require('./routes/adminUsers');
const adminRoutes = require('./routes/admin'); // <-- Important: variable!
const authRoutes = require('./routes/auth');

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/labsync';

// ---------------------------
// 🚀 SERVER STARTUP
// ---------------------------
(async () => {
  console.log('[SERVER] Starting LabSync backend...');
  await connectDB(MONGO_URI);

  // ---------------------------
  // 🔧 MIDDLEWARE
  // ---------------------------
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  // ---------------------------
  // 🔥 ROUTE ORDER MATTERS
  // ---------------------------

  // 1️⃣ PUBLIC routes (no login)
  app.use('/api/public', publicRoutes);

  // 2️⃣ AUTH routes (login/register)
  app.use('/api/auth', authRoutes);

  // 3️⃣ Admin USER management
  app.use('/api/admin/users', adminUserRoutes);

  // 4️⃣ NORMAL booking create/view
  app.use('/api/bookings', bookingRoutes);

  // 5️⃣ Admin BOOKING + LAB management (must come AFTER /admin/users)
  app.use('/api/admin', adminRoutes);

  // ---------------------------
  // 🔌 SOCKET.IO LOGGING
  // ---------------------------
  io.on('connection', (socket) => {
    console.log('[SOCKET] Client connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('[SOCKET] Client disconnected:', socket.id);
    });
  });

  // ---------------------------
  // 🚀 START SERVER
  // ---------------------------
  http.listen(PORT, () => {
    console.log(`[SERVER] Listening on port ${PORT}`);
  });
})();
