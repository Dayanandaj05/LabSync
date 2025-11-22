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

    // ✅ ROBUST MAINTENANCE CHECK (String Comparison)
    const targetDate = date; // "YYYY-MM-DD"

    const labsRaw = await Lab.find().lean();
    
    const labs = labsRaw.map(l => {
      const maintenance = (l.maintenanceLog || []).find(m => {
        const mStart = new Date(m.start).toISOString().slice(0, 10);
        const mEnd = new Date(m.end).toISOString().slice(0, 10);
        return targetDate >= mStart && targetDate <= mEnd;
      });

      return {
        _id: l._id,
        code: l.code,
        name: l.name,
        isMaintenance: !!maintenance,
        maintenanceReason: maintenance ? maintenance.reason : null
      };
    });

    const bookings = await Booking.find({ date }).populate('lab').sort({ status: 1 }).lean();

    res.json({
      date,
      labs,
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
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Server Error' }); 
  }
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

    const labs = await Lab.find().select('maintenanceLog').lean();
    const statusMap = {}; 

    // 1. Bookings
    bookings.forEach(b => {
      if (!statusMap[b.date]) statusMap[b.date] = { hasExam: false, hasReview: false, hasMaintenance: false, count: 0 };
      statusMap[b.date].count++;
      if (['Test', 'Exam'].includes(b.type)) statusMap[b.date].hasExam = true;
      if (['Project Review', 'Review'].includes(b.type)) statusMap[b.date].hasReview = true;
    });

    // 2. Maintenance (Fixed Date Logic)
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dStr = d.toISOString().slice(0, 10);
      if (!statusMap[dStr]) statusMap[dStr] = { hasExam: false, hasReview: false, hasMaintenance: false, count: 0 };
      
      const isMaintenance = labs.some(l => (l.maintenanceLog || []).some(m => {
        const mStart = new Date(m.start).toISOString().slice(0, 10);
        const mEnd = new Date(m.end).toISOString().slice(0, 10);
        return dStr >= mStart && dStr <= mEnd;
      }));

      if (isMaintenance) statusMap[dStr].hasMaintenance = true;
    }

    res.json({ statusMap });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.get('/upcoming-tests', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const tests = await Booking.find({ 
      type: { $in: ['Test', 'Exam', 'Project Review', 'Workshop'] },
      date: { $gte: today }
    }).populate('lab', 'code').sort({ date: 1 }).limit(5);
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