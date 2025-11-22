const express = require('express');
const router = express.Router();
const Lab = require('../models/Lab');
const Booking = require('../models/Booking');
const Log = require('../models/Log');

// ---------------------------------------------
// GET /api/public/grid-data?date=YYYY-MM-DD
// Returns Labs + Bookings for the Grid UI
// ---------------------------------------------
router.get('/grid-data', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date required (YYYY-MM-DD)' });

    // 1. Get All Labs (Rows)
    const labs = await Lab.find().lean();

    // 2. Get All Bookings for Date (Cells)
    const bookings = await Booking.find({ date }).populate('lab').lean();

    // 3. Send combined data
    res.json({
      date,
      labs: labs.map(l => ({ 
        _id: l._id, 
        code: l.code, 
        name: l.name, 
        capacity: l.capacity, 
        blocked: l.blocked 
      })),
      bookings: bookings.map(b => ({
        _id: b._id,
        labCode: b.lab?.code, // populated from .populate('lab')
        period: b.period,
        status: b.status,
        role: b.role,
        creatorName: b.creatorName,
        purpose: b.purpose
      }))
    });

  } catch (err) {
    console.error('[ERROR] GET /grid-data', err);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ---------------------------------------------
// GET /api/public/logs (For Admin UI)
// ---------------------------------------------
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await Log.find().sort({ timestamp: -1 }).limit(limit).lean();
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;