const express = require('express');
const router = express.Router();

const jwtAuth = require('../middleware/jwtAuth');
const Booking = require('../models/Booking');
const User = require('../models/User'); // Needed to get student email
const Log = require('../models/Log');
const { sendMail } = require('../utils/mailer'); // Import mailer

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
    // Find 'Pending' bookings
    // 1. Populate 'lab' to get the lab code (e.g. 'CC')
    // 2. Populate 'createdBy' to get the student's email for notifications
    const pending = await Booking.find({ status: 'Pending' })
      .populate('lab')
      .populate('createdBy', 'email') 
      .sort({ createdAt: -1 })
      .lean();

    // Map to a cleaner format
    const formatted = pending.map(b => ({
      ...b,
      labCode: b.lab ? b.lab.code : 'Unknown Lab',
      creatorEmail: b.createdBy ? b.createdBy.email : 'unknown@test.com'
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
    // We need to populate createdBy to get the email address
    const booking = await Booking.findById(req.params.id).populate('createdBy');
    
    if (!booking) return res.status(404).json({ error: 'not found' });

    booking.status = 'Approved';
    await booking.save();

    // ✅ SEND EMAIL TO STUDENT
    if (booking.createdBy && booking.createdBy.email) {
      sendMail(
        booking.createdBy.email,
        'Booking Approved! ✅',
        `Great news! Your booking for ${booking.date} (Period ${booking.period}) has been APPROVED.`
      );
    }

    // Log the action
    await Log.create({
      action: 'AdminApprovedBooking',
      user: req.user.id,
      meta: { bookingId: booking._id }
    });

    res.json({ message: 'Approved' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// ------------------------------------
// REJECT BOOKING
// ------------------------------------
router.put('/bookings/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    
    // Populate createdBy to get email
    const booking = await Booking.findById(req.params.id).populate('createdBy');

    if (!booking) return res.status(404).json({ error: 'not found' });

    booking.status = 'Rejected';
    booking.adminReason = reason || 'Rejected';
    await booking.save();

    // ✅ SEND EMAIL TO STUDENT
    if (booking.createdBy && booking.createdBy.email) {
      sendMail(
        booking.createdBy.email,
        'Booking Rejected ❌',
        `Your booking for ${booking.date} (Period ${booking.period}) was REJECTED.\n\nReason: ${reason}`
      );
    }

    // Log the action
    await Log.create({
      action: 'AdminRejectedBooking',
      user: req.user.id,
      meta: { bookingId: booking._id, reason: booking.adminReason }
    });

    res.json({ message: 'Rejected' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;