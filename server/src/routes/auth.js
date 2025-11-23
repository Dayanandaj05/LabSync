// server/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const Log = require('../models/Log');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const SALT_ROUNDS = 10;

// Register
router.post('/register', async (req, res) => {
  try {
    // ✅ Extract classGroup
    const { name, email, password, role, classGroup } = req.body;
    
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    
    // ✅ Save classGroup (default to N/A if not student)
    const finalGroup = role === 'Student' ? (classGroup || 'N/A') : 'N/A';

    const user = new User({ 
      name, 
      email: email.toLowerCase(), 
      password: hashed, 
      role, 
      classGroup: finalGroup, 
      status: 'Pending' 
    });
    
    await user.save();

    await Log.create({ action: 'UserRegistered', meta: { userId: user._id, email: user.email } });

    return res.json({ message: 'Registration submitted, awaiting admin approval' });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'User does not exist' });

    if (user.status !== 'Approved') return res.status(403).json({ error: `Account status: ${user.status}` });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Wrong password' });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: '8h' }
    );

    return res.json({ 
      message: 'Login successful', 
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;