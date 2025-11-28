// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const requestLogger = require('./middleware/requestLogger');

const app = express();
const http = require('http').createServer(app);

// ---------------------------
// 🔌 SOCKET.IO SETUP (Must be initialized BEFORE app.set)
// ---------------------------
const io = require('socket.io')(http, { 
  cors: { 
    origin: process.env.CLIENT_URL || "http://localhost:5173", 
    methods: ["GET", "POST", "PUT", "DELETE"] 
  } 
});

// Now valid because 'io' is defined above
app.set('io', io);

// 🔒 FORCE correct file resolution (prevents MongoDB admin.js shadowing)
const publicRoutes = require('./routes/public');
const bookingRoutes = require('./routes/bookings');
const adminUserRoutes = require('./routes/adminUsers');
const adminRoutes = require('./routes/admin'); 
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
  // 🛠 EMERGENCY TOOLS
  // ---------------------------
  app.get('/api/emergency-reset', async (req, res) => {
    try {
      const bcrypt = require('bcrypt');
      const User = require('./models/User');
      const Booking = require('./models/Booking');

      // 1. WIPE DATABASE
      await User.deleteMany({});
      await Booking.deleteMany({});

      // 2. CREATE PASSWORD HASH
      const studentPass = await bcrypt.hash('test123', 10);
      const adminPass = await bcrypt.hash('admin123', 10);

      // 3. CREATE USERS
      await User.create([
        {
          name: 'Test Student',
          email: 'student@test.com',
          password: studentPass,
          role: 'Student',
          status: 'Approved'
        },
        {
          name: 'Super Admin',
          email: 'admin@test.com',
          password: adminPass,
          role: 'Admin',
          status: 'Approved'
        }
      ]);

      res.send(`
        <div style="padding: 40px; font-family: sans-serif; text-align: center;">
          <h1 style="color: green; font-size: 30px;">✅ SYSTEM RESET COMPLETE</h1>
          <p>Database wiped. Users recreated.</p>
          <div style="background: #f0f0f0; padding: 20px; display: inline-block; text-align: left; border-radius: 10px;">
            <h3 style="margin-top:0;">Login Credentials:</h3>
            <p><b>Admin:</b> admin@test.com / admin123</p>
            <p><b>Student:</b> student@test.com / test123</p>
          </div>
          <br/><br/>
          <a href="http://localhost:5173/login" style="background: blue; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Login</a>
        </div>
      `);
    } catch (err) {
      console.error(err);
      res.status(500).send(`<h1>Error</h1><pre>${err.message}</pre>`);
    }
  });

  app.get('/api/fix-password', async (req, res) => {
    try {
      const bcrypt = require('bcrypt');
      const User = require('./models/User');

      // 1. Define the password we want
      const rawPassword = 'test123';
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      // 2. Find and Update the Student
      let user = await User.findOne({ email: 'student@test.com' });
      
      if (!user) {
        // Create if missing
        user = await User.create({
          name: 'Test Student',
          email: 'student@test.com',
          password: hashedPassword,
          role: 'Student',
          status: 'Approved'
        });
        return res.send(`<h1>✅ User Created</h1><p>Created student@test.com with password: test123</p>`);
      } else {
        // Update existing
        user.password = hashedPassword;
        user.status = 'Approved'; // Ensure approved
        await user.save();
        return res.send(`<h1>✅ Password Fixed</h1><p>Updated <b>student@test.com</b>. You can now login with <b>test123</b>.</p>`);
      }

    } catch (err) {
      res.status(500).send(`Error: ${err.message}`);
    }
  });

  // ---------------------------
  // 🚀 START SERVER
  // ---------------------------
  http.listen(PORT, () => {
    console.log(`[SERVER] Listening on port ${PORT}`);
  });
})();