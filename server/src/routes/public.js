const express = require('express');
const router = express.Router();
const Lab = require('../models/Lab');
const Booking = require('../models/Booking');
const Log = require('../models/Log');
const Subject = require('../models/Subject'); 
const Announcement = require('../models/Announcement');

// 1. GRID DATA
router.get('/grid-data', async (req, res) => {
  try {
    const { date } = req.query; 
    if (!date) return res.status(400).json({ error: 'Date required' });

    const labs = await Lab.find().lean();
    
    // Check Maintenance
    const processedLabs = labs.map(l => {
        const isMaintenance = (l.maintenanceLog || []).some(log => {
            const start = new Date(log.start).toISOString().slice(0, 10);
            const end = new Date(log.end).toISOString().slice(0, 10);
            return date >= start && date <= end;
        });

        return { 
            ...l, 
            isMaintenance, 
            maintenanceReason: isMaintenance ? (l.maintenanceLog.find(m => {
                const start = new Date(m.start).toISOString().slice(0, 10);
                const end = new Date(m.end).toISOString().slice(0, 10);
                return date >= start && date <= end;
            })?.reason || "Scheduled") : null
        };
    });

    // ✅ FIX: Populate Waitlist Users so Admins can see names
    const bookings = await Booking.find({ date })
        .populate('lab')
        .populate('subject')
        .populate('waitlist.user', 'name email classGroup') // <--- NEW
        .sort({ status: 1 })
        .lean();

    res.json({
      date,
      labs: processedLabs, 
      bookings: bookings.map(b => ({
        _id: b._id, 
        labCode: b.lab?.code, 
        period: b.period, 
        status: b.status, 
        role: b.role,
        creatorName: b.creatorName, 
        purpose: b.purpose, 
        type: b.type, 
        subjectCode: b.subject?.code,
        waitlist: b.waitlist // <--- Pass the waitlist array to frontend
      }))
    });
  } catch (err) { 
      console.error(err);
      res.status(500).json({ error: 'Server Error' }); 
  }
});

// ... (Keep the rest of the file exactly as it was: /subjects, /upcoming-tests, /calendar-status, /announcements, /logs)
// Just replace the top route (/grid-data) with the code above.

router.get('/subjects', async (req, res) => {
  try { const subjects = await Subject.find({ active: true }).sort({ code: 1 }); res.json({ subjects }); } catch (err) { res.status(500).json({ error: 'Error' }); }
});

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
    const tests = await Booking.find(query).populate('lab', 'code').sort({ date: 1 }).limit(100); 
    res.json({ tests });
  } catch (err) { res.status(500).json({ error: 'error' }); }
});

router.get('/calendar-status', async (req, res) => {
  try {
    const { start, days } = req.query;
    const d = new Date(start || new Date());
    const endDateObj = new Date(d); 
    endDateObj.setDate(d.getDate() + (parseInt(days)||14));
    const end = endDateObj.toISOString().slice(0, 10);

    const bookings = await Booking.find({ date: { $gte: start, $lt: end }, status: 'Approved' }).lean();
    const labs = await Lab.find().lean();
    const statusMap = {}; 
    const markDate = (dateStr, type) => {
        if (!statusMap[dateStr]) statusMap[dateStr] = { hasExam: false, hasReview: false, hasMaintenance: false, count: 0 };
        if (type === 'Booking') statusMap[dateStr].count++;
        if (type === 'Test') statusMap[dateStr].hasExam = true;
        if (type === 'Review') statusMap[dateStr].hasReview = true;
        if (type === 'Maintenance') statusMap[dateStr].hasMaintenance = true;
    };
    bookings.forEach(b => {
        let type = 'Booking';
        if (['Test', 'Exam'].includes(b.type)) type = 'Test';
        if (['Project Review'].includes(b.type)) type = 'Review';
        markDate(b.date, type);
    });
    const curr = new Date(start);
    const last = new Date(end);
    while(curr <= last) {
        const currStr = curr.toISOString().slice(0, 10);
        const isMaint = labs.some(l => (l.maintenanceLog || []).some(log => {
             const s = new Date(log.start).toISOString().slice(0,10);
             const e = new Date(log.end).toISOString().slice(0,10);
             return currStr >= s && currStr <= e;
        }));
        if(isMaint) markDate(currStr, 'Maintenance');
        curr.setDate(curr.getDate() + 1);
    }
    res.json({ statusMap });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.get('/announcements', async (req, res) => {
    try {
        const now = new Date();
        const announcements = await Announcement.find({ active: true, expiresAt: { $gt: now } }).sort({ createdAt: -1 }).limit(5);
        res.json({ announcements });
    } catch (err) { res.status(500).json({ error: 'Error fetching announcements' }); }
});

router.get('/logs', async (req, res) => {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(20).populate('user', 'name').lean();
    res.json({ logs });
});

module.exports = router;