// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const Log = require('../models/Log'); // existing log model used earlier

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const SALT_ROUNDS = 10;

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = new User({ name, email: email.toLowerCase(), password: hashed, role, status: 'Pending' });
    await user.save();

    await Log.create({ action: 'UserRegistered', meta: { userId: user._id, email: user.email } });

    return res.json({ message: 'Registration submitted, awaiting admin approval' });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  console.log('👉 [LOGIN ATTEMPT] Request Body:', req.body); // Check what frontend sent

  try {
    const { email, password } = req.body;
    
    // 1. Check if data arrived
    if (!email || !password) {
      console.log('❌ [LOGIN FAIL] Missing email or password');
      return res.status(400).json({ error: 'Missing fields' });
    }

    // 2. Find User
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`❌ [LOGIN FAIL] User not found: ${email}`);
      return res.status(401).json({ error: 'User does not exist' });
    }

    // 3. Check Status
    if (user.status !== 'Approved') {
        console.log(`❌ [LOGIN FAIL] Status is ${user.status}`);
        return res.status(403).json({ error: `Account status: ${user.status}` });
    }

    // 4. Check Password
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      console.log('❌ [LOGIN FAIL] Password mismatch');
      return res.status(401).json({ error: 'Wrong password' });
    }

    // 5. Success
    console.log('✅ [LOGIN SUCCESS] User logged in:', user.email);
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: '8h' }
    );

    return res.json({ 
      message: 'Login successful', 
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role } 
    });

  } catch (err) {
    console.error('💥 [LOGIN ERROR]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});



module.exports = router;
