// src/routes/admin.js
const express = require('express');
const router = express.Router();

const jwtAuth = require('../middleware/jwtAuth');
const Booking = require('../models/Booking');
const Lab = require('../models/Lab');
const Log = require('../models/Log');

// 🔒 ALL admin routes must use JWT auth
router.use(jwtAuth);

// 🔒 Only Admin can enter
router.use((req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
});

// GET pending bookings
router.get('/bookings/pending', async (req, res) => {
  try {
    const pending = await Booking.find({ status: 'Pending' }).sort({ createdAt: -1 });
    res.json({ pending });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// Approve booking
router.put('/bookings/:id/approve', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'not found' });

    booking.status = 'Approved';
    await booking.save();

    await Log.create({
      action: 'AdminApprovedBooking',
      user: req.user.id,
      meta: { bookingId: booking._id }
    });

    res.json({ message: 'Approved' });
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
});

// Reject booking
router.put('/bookings/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'not found' });

    booking.status = 'Rejected';
    booking.adminReason = reason || 'Rejected';
    await booking.save();

    await Log.create({
      action: 'AdminRejectedBooking',
      user: req.user.id,
      meta: { bookingId: booking._id, reason: booking.adminReason }
    });

    res.json({ message: 'Rejected' });
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
});

// Block lab
router.post('/labs/block', async (req, res) => {
  try {
    const { labCode, date, periods, reason } = req.body;
    const lab = await Lab.findOne({ code: labCode });

    lab.blocked.push({ date, periods, reason });
    await lab.save();

    await Log.create({
      action: 'LabBlocked',
      user: req.user.id,
      meta: { labCode, date, periods, reason }
    });

    res.json({ message: 'Lab blocked' });
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
