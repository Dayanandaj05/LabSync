// src/routes/bookings.js
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Lab = require('../models/Lab');
const Log = require('../models/Log');
const jwtAuth = require('../middleware/jwtAuth');
const User = require('../models/User');

// -------------------------------
// CREATE BOOKING
// -------------------------------
router.post('/', jwtAuth, async (req, res) => {
  try {
    console.log('[HANDLER] POST /api/bookings - start');

    const { labCode, date, period, purpose } = req.body;

    if (!labCode || !date || !period) {
      console.log('[VALIDATION] Missing fields');
      return res.status(400).json({ error: 'labCode, date, period required' });
    }

    // Get user from DB (ensure approved)
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('[AUTH] User not found');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.status !== 'Approved') {
      console.log('[AUTH] User not approved');
      return res.status(403).json({ error: 'Account not approved' });
    }

    // Get lab
    const lab = await Lab.findOne({ code: labCode });
    if (!lab) {
      console.log(`[NOTFOUND] Lab ${labCode} not found`);
      return res.status(404).json({ error: 'Lab not found' });
    }
    console.log(`[STEP] Lab found: ${lab.code}`);

    // Check if blocked
    const blocked = (lab.blocked || []).some(b => {
      const sameDate = new Date(b.date).toISOString().slice(0, 10) === date;
      return sameDate && b.periods.includes(period);
    });

    if (blocked) {
      console.log('[BLOCKED] Slot blocked for exams/placement');
      await Log.create({
        action: 'BookingAttemptBlocked',
        user: user._id,
        meta: { lab: lab.code, date, period }
      });
      return res.status(403).json({ error: 'slot blocked (exam/placement)' });
    }

    console.log('[STEP] Slot not blocked');

    // ✅ NEW LOGIC: Auto-Approve if Admin, otherwise Pending
    const priorityMap = { Admin: 3, Staff: 2, Student: 1 };
    const priority = priorityMap[user.role] || 1;
    
    // Admins get instant approval
    const initialStatus = user.role === 'Admin' ? 'Approved' : 'Pending';

    const booking = await Booking.create({
      lab: lab._id,
      date,
      period,
      createdBy: user._id,
      creatorName: user.name,
      role: user.role,
      purpose: purpose || '',
      status: initialStatus, // ⬅️ Dynamic Status
      priority
    });

    console.log(`[STEP] Booking created. Status: ${initialStatus}`);

    await Log.create({
      action: initialStatus === 'Approved' ? 'BookingAutoApproved' : 'BookingCreated_Pending',
      user: user._id,
      meta: { bookingId: booking._id }
    });

    return res.json({
      message: initialStatus === 'Approved' ? 'Slot booked successfully!' : 'Request sent to Admin.',
      booking: booking
    });

  } catch (err) {
    console.error('[ERROR] POST /api/bookings', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET booking details for a specific slot
router.get('/details', async (req, res) => {
  try {
    console.log('[HANDLER] GET /api/bookings/details');

    const { labCode, date, period } = req.query;

    if (!labCode || !date || !period) {
      return res.status(400).json({ error: 'labCode, date, period required' });
    }

    const lab = await Lab.findOne({ code: labCode });
    if (!lab) return res.status(404).json({ error: 'Lab not found' });

    const booking = await Booking.findOne({
      lab: lab._id,
      date,
      period: Number(period),
    }).lean();

    if (!booking) {
      return res.json({
        empty: true,
        message: 'No booking exists for this slot',
      });
    }

    res.json({
      empty: false,
      booking: {
        id: booking._id,
        creatorName: booking.creatorName,
        role: booking.role,
        purpose: booking.purpose,
        status: booking.status,
        adminReason: booking.adminReason || '',
        priority: booking.priority,
        createdAt: booking.createdAt,
      },
    });

  } catch (err) {
    console.error('[ERROR] GET /api/bookings/details', err);
    res.status(500).json({ error: 'server error' });
  }
});


module.exports = router;