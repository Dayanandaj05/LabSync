// src/routes/adminUsers.js
const express = require('express');
const router = express.Router();

const jwtAuth = require('../middleware/jwtAuth');
const User = require('../models/User');
const Log = require('../models/Log');

// Protect all routes and require admin role
router.use(jwtAuth);
router.use((req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  next();
});

// list pending users
router.get('/pending', async (req, res) => {
  try {
    const pending = await User.find({ status: 'Pending' }).select('-password').lean();
    return res.json({ pending });
  } catch (err) {
    console.error('[ADMIN USERS] fetch pending error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// approve user
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.status = 'Approved';
    user.rejectReason = '';
    await user.save();

    await Log.create({ action: 'AdminApprovedUser', user: req.user.id, meta: { admin: req.user.email, userId: id } });
    return res.json({ message: 'User approved' });
  } catch (err) {
    console.error('[ADMIN USERS] approve error', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// reject user
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.status = 'Rejected';
    user.rejectReason = reason || '';
    await user.save();

    await Log.create({ action: 'AdminRejectedUser', user: req.user.id, meta: { admin: req.user.email, userId: id, reason: user.rejectReason } });
    return res.json({ message: 'User rejected' });
  } catch (err) {
    console.error('[ADMIN USERS] reject error', err);
    return res.status(500).json({ error: 'server error' });
  }
  
});
// DEBUG ROUTE — LIST ALL USERS
router.get('/all', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    return res.json({ users });
  } catch (err) {
    console.error('[ADMIN USERS] error in /all', err);
    return res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
