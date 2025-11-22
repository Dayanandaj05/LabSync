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

// ------------------------------------
// GET PENDING BOOKINGS
// ------------------------------------
router.get('/bookings/pending', async (req, res) => {
  try {
    // Find 'Pending' bookings and POPULATE the lab info so we can see the code (e.g., 'CC')
    const pending = await Booking.find({ status: 'Pending' })
      .populate('lab') // This fills in the 'lab' field with the full Lab object
      .sort({ createdAt: -1 })
      .lean();

    // Map to a cleaner format if needed, handling missing labs
    const formatted = pending.map(b => ({
      ...b,
      labCode: b.lab ? b.lab.code : 'Unknown Lab'
    }));

    res.json({ pending: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// ------------------------------------
// APPROVE BOOKING
// ------------------------------------
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

// ------------------------------------
// REJECT BOOKING
// ------------------------------------
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

module.exports = router;