// src/routes/public.js
const express = require('express');
const router = express.Router();
const Lab = require('../models/Lab');
const Booking = require('../models/Booking');
const Log = require('../models/Log');


// GET /api/public/free-labs?date=YYYY-MM-DD
router.get('/free-labs', async (req, res) => {
  try {
    console.log('[HANDLER] GET /api/public/free-labs');
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

    const labs = await Lab.find().lean();
    const bookings = await Booking.find({ date, status: 'Approved' }).lean();

    const allPeriods = Array.from({length: 10}, (_,i)=>i+1); // default 10 periods

    const free = labs.map(lab => {
  const bookedPeriods = bookings
    .filter(b => b.lab.toString() === lab._id.toString())
    .map(b => b.period);

  // remove blocked periods
  const blockedPeriods = (lab.blocked || [])
    .filter(b => new Date(b.date).toISOString().slice(0,10) === date)
    .flatMap(b => b.periods);

  const allPeriods = Array.from({length: 10}, (_,i)=>i+1);

  const freePeriods = allPeriods.filter(
    p => !bookedPeriods.includes(p) && !blockedPeriods.includes(p)
  );

  return { lab: lab.code, name: lab.name, freePeriods };
});


    console.log('[HANDLER] free-labs result built');
    await Log.create({ action: 'ViewedFreeLabs', meta: { date, countLabs: labs.length }});
    res.json({ date, free });
  } catch (err) {
    console.error('[ERROR] GET /api/public/free-labs', err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/public/logs?limit=50
router.get('/logs', async (req, res) => {
  try {
    console.log('[HANDLER] GET /api/public/logs');
    const limit = parseInt(req.query.limit) || 50;
    const logs = await Log.find().sort({ timestamp: -1 }).limit(limit).lean();
    res.json({ logs });
  } catch (err) {
    console.error('[ERROR] GET /api/public/logs', err);
    res.status(500).json({ error: 'server error' });
  }
});

// ---------------------------------------------
// GET /api/public/bookings?date=YYYY-MM-DD
// Full booking details for timetable UI
// ---------------------------------------------
router.get('/bookings', async (req, res) => {
  try {
    const date = req.query.date;
    if (!date) {
      return res.status(400).json({ error: 'date query required' });
    }

    // Find all bookings for that date (Approved + Pending)
    const bookings = await Booking.find({ date })
      .populate('lab')   // load lab.code + lab.name
      .lean();

    const shaped = bookings.map(b => ({
      bookingId: b._id,
      lab: b.lab?.code || null,
      labId: b.lab?._id || null,
      period: b.period,
      creatorName: b.creatorName,
      role: b.role,
      purpose: b.purpose,
      status: b.status,
      adminReason: b.adminReason || "",
    }));

    res.json({
      date,
      bookings: shaped
    });

  } catch (err) {
    console.error("[PUBLIC] GET /bookings error", err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
