const express = require('express');
const router = express.Router();
const Lab = require('../models/Lab');
const Booking = require('../models/Booking');
const Log = require('../models/Log');
const Announcement = require('../models/Announcement');

// GET /grid-data
router.get('/grid-data', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date required' });

    const labs = await Lab.find().lean();
    const bookings = await Booking.find({ date }).populate('lab').sort({ status: 1 }).lean();

    res.json({
      date,
      labs: labs.map(l => ({ _id: l._id, code: l.code, name: l.name })),
      bookings: bookings.map(b => ({
        _id: b._id,
        labCode: b.lab?.code,
        period: b.period,
        status: b.status,
        role: b.role,
        creatorName: b.creatorName,
        purpose: b.purpose,
        type: b.type, 
        waitlistCount: b.waitlist ? b.waitlist.length : 0 
      }))
    });
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// GET CALENDAR STATUS
router.get('/calendar-status', async (req, res) => {
  try {
    const { start, days } = req.query;
    const startDate = new Date(start || new Date());
    const numDays = parseInt(days) || 14;
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + numDays);

    const bookings = await Booking.find({ 
      date: { $gte: startDate.toISOString().slice(0, 10), $lt: endDate.toISOString().slice(0, 10) },
      status: 'Approved'
    }).lean();

    const statusMap = {}; 

    bookings.forEach(b => {
      if (!statusMap[b.date]) statusMap[b.date] = { hasExam: false, hasReview: false, count: 0 };
      statusMap[b.date].count++;
      if (['Test', 'Exam'].includes(b.type)) statusMap[b.date].hasExam = true;
      if (['Project Review', 'Review'].includes(b.type)) statusMap[b.date].hasReview = true;
    });

    res.json({ statusMap });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

// ✅ UPDATED: Return ALL tests (Past & Future) for History View
router.get('/upcoming-tests', async (req, res) => {
  try {
    const tests = await Booking.find({ 
      type: { $in: ['Test', 'Exam', 'Project Review', 'Workshop'] }
    })
    .populate('lab', 'code')
    .sort({ date: 1 }); // Sort Oldest to Newest
    
    res.json({ tests });
  } catch (err) { res.status(500).json({ error: 'error' }); }
});

router.get('/logs', async (req, res) => {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(50).populate('user', 'name').lean();
    res.json({ logs });
});
router.get('/announcements', async (req, res) => {
    const announcements = await Announcement.find({ active: true }).sort({ createdAt: -1 }).limit(5);
    res.json({ announcements });
});

module.exports = router;