const express = require('express');
const router = express.Router();
const Lab = require('../models/Lab');
const Booking = require('../models/Booking');
const Log = require('../models/Log');
const Subject = require('../models/Subject'); 
const Announcement = require('../models/Announcement');

// GRID DATA
router.get('/grid-data', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date required' });

    const labs = await Lab.find().lean();
    const bookings = await Booking.find({ date }).populate('lab').populate('subject').sort({ status: 1 }).lean();

    res.json({
      date,
      labs: labs.map(l => ({ ...l, isMaintenance: false })), 
      bookings: bookings.map(b => ({
        _id: b._id, labCode: b.lab?.code, period: b.period, status: b.status, role: b.role,
        creatorName: b.creatorName, purpose: b.purpose, type: b.type, subjectCode: b.subject?.code
      }))
    });
  } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

// ✅ GET SUBJECTS
router.get('/subjects', async (req, res) => {
  try { const subjects = await Subject.find({ active: true }).sort({ code: 1 }); res.json({ subjects }); } catch (err) { res.status(500).json({ error: 'Error' }); }
});

// ✅ UPCOMING (Banner)
router.get('/upcoming-tests', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const query = {
      date: { $gte: today },
      $or: [
        { type: { $in: ['Test', 'Exam', 'Project Review', 'Workshop'] } },
        { showInBanner: true }
      ]
    };
    const tests = await Booking.find(query).populate('lab', 'code').sort({ date: 1 }).limit(10); 
    res.json({ tests });
  } catch (err) { res.status(500).json({ error: 'error' }); }
});

// CALENDAR DOTS
router.get('/calendar-status', async (req, res) => {
  try {
    const { start, days } = req.query;
    const startDate = new Date(start || new Date());
    const endDate = new Date(startDate); endDate.setDate(startDate.getDate() + (parseInt(days)||14));
    const bookings = await Booking.find({ date: { $gte: startDate.toISOString().slice(0,10), $lt: endDate.toISOString().slice(0,10) }, status: 'Approved' }).lean();
    const statusMap = {}; 
    bookings.forEach(b => {
      if (!statusMap[b.date]) statusMap[b.date] = { hasExam: false, hasReview: false, count: 0 };
      statusMap[b.date].count++;
      if (['Test', 'Exam'].includes(b.type)) statusMap[b.date].hasExam = true;
      if (['Project Review'].includes(b.type)) statusMap[b.date].hasReview = true;
    });
    res.json({ statusMap });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.get('/announcements', async (req, res) => {
    const announcements = await Announcement.find({ active: true }).sort({ createdAt: -1 }).limit(5);
    res.json({ announcements });
});

router.get('/logs', async (req, res) => {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(20).populate('user', 'name').lean();
    res.json({ logs });
});

module.exports = router;