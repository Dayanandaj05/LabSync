const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Lab = require('../models/Lab');
const Log = require('../models/Log');
const jwtAuth = require('../middleware/jwtAuth');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer'); // ✅ Import Mailer

// -------------------------------
// CREATE BOOKING
// -------------------------------
router.post('/', jwtAuth, async (req, res) => {
  try {
    const { labCode, date, period, purpose } = req.body;

    if (!labCode || !date || !period) {
      return res.status(400).json({ error: 'labCode, date, period required' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.status !== 'Approved') {
      return res.status(403).json({ error: 'Account not approved' });
    }

    const lab = await Lab.findOne({ code: labCode });
    if (!lab) return res.status(404).json({ error: 'Lab not found' });

    // Check Blocked
    const blocked = (lab.blocked || []).some(b => {
      const sameDate = new Date(b.date).toISOString().slice(0, 10) === date;
      return sameDate && b.periods.includes(period);
    });
    if (blocked) return res.status(403).json({ error: 'Slot blocked' });

    // Status Logic
    const initialStatus = user.role === 'Admin' ? 'Approved' : 'Pending';
    const priorityMap = { Admin: 3, Staff: 2, Student: 1 };

    const booking = await Booking.create({
      lab: lab._id,
      date,
      period,
      createdBy: user._id,
      creatorName: user.name,
      role: user.role,
      purpose: purpose || '',
      status: initialStatus,
      priority: priorityMap[user.role] || 1
    });

    // Logging
    await Log.create({
      action: initialStatus === 'Approved' ? 'BookingAutoApproved' : 'BookingCreated_Pending',
      user: user._id,
      meta: { bookingId: booking._id }
    });

    // ✅ EMAIL NOTIFICATION
    if (initialStatus === 'Pending') {
      // Notify Admin (Hardcoded admin email for now)
      sendMail(
        'admin@test.com', 
        `New Booking Request: ${user.name}`,
        `User ${user.name} (${user.role}) requested Lab ${labCode} for Period ${period} on ${date}.\n\nPurpose: ${purpose}\n\nPlease check the dashboard.`
      );
    }

    return res.json({
      message: initialStatus === 'Approved' ? 'Slot booked successfully!' : 'Request sent to Admin.',
      booking: booking
    });

  } catch (err) {
    console.error('[ERROR] POST /api/bookings', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET booking details
router.get('/details', async (req, res) => {
  try {
    const { labCode, date, period } = req.query;
    if (!labCode || !date || !period) return res.status(400).json({ error: 'missing params' });

    const lab = await Lab.findOne({ code: labCode });
    if (!lab) return res.status(404).json({ error: 'Lab not found' });

    const booking = await Booking.findOne({ lab: lab._id, date, period: Number(period) }).lean();

    if (!booking) return res.json({ empty: true, message: 'No booking' });

    res.json({
      empty: false,
      booking: {
        id: booking._id,
        creatorName: booking.creatorName,
        role: booking.role,
        purpose: booking.purpose,
        status: booking.status,
        adminReason: booking.adminReason || '',
        createdAt: booking.createdAt,
      },
    });

  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;