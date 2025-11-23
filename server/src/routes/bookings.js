const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Lab = require('../models/Lab');
const Log = require('../models/Log');
const jwtAuth = require('../middleware/jwtAuth');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');
const crypto = require('crypto');

const isPast = (dateStr) => new Date(dateStr) < new Date().setHours(0,0,0,0);

// CREATE BOOKING
router.post('/', jwtAuth, async (req, res) => {
  try {
    const { labCode, date, period, purpose, type, subjectId, showInBanner, bannerColor } = req.body;

    if (!labCode || !date || !period) return res.status(400).json({ error: 'Missing fields' });
    if (isPast(date)) return res.status(400).json({ error: 'Cannot book past dates.' });

    const user = await User.findById(req.user.id);
    if (!user || user.status !== 'Approved') return res.status(403).json({ error: 'Account not approved' });

    // ✅ STAFF VALIDATION
    if (user.role === 'Staff' && !subjectId) return res.status(400).json({ error: 'Staff must select a Subject.' });

    const lab = await Lab.findOne({ code: labCode });
    if (!lab) return res.status(404).json({ error: 'Lab not found' });

    const isUnderMaintenance = (lab.maintenanceLog || []).some(m => date >= new Date(m.start).toISOString().slice(0,10) && date <= new Date(m.end).toISOString().slice(0,10));
    if (isUnderMaintenance) return res.status(403).json({ error: `Lab under maintenance.` });

    const existingBooking = await Booking.findOne({ lab: lab._id, date, period, status: 'Approved' }).populate('createdBy');

    if (existingBooking) {
      if (user.role === 'Admin') {
        await Booking.deleteOne({ _id: existingBooking._id }); // Admin Override
      } else if (user.role === 'Staff' && type === 'Test') {
        // Allow Conflict Request
      } else {
        return res.status(400).json({ error: 'Slot booked' });
      }
    }

    const initialStatus = user.role === 'Admin' ? 'Approved' : 'Pending';
    
    const booking = await Booking.create({
      lab: lab._id, date, period, createdBy: user._id, creatorName: user.name, role: user.role,
      purpose: purpose || '', type: type || 'Regular', status: initialStatus,
      subject: subjectId || null, showInBanner: showInBanner || false, bannerColor: bannerColor || 'blue',
      priority: (user.role === 'Admin' ? 3 : user.role === 'Staff' ? 2 : 1)
    });

    res.json({ message: initialStatus === 'Approved' ? 'Booked!' : 'Request sent.', booking });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// RECURRING BOOKING
router.post('/recurring', jwtAuth, async (req, res) => {
  try {
    if (req.user.role === 'Student') return res.status(403).json({ error: 'Students cannot create bulk bookings' });

    const { labCode, dates, periods, purpose, type, subjectId, showInBanner, bannerColor } = req.body; 
    
    if (!dates?.length || !periods?.length) return res.status(400).json({ error: 'Invalid data' });
    if (req.user.role === 'Staff' && !subjectId) return res.status(400).json({ error: 'Staff must select a Subject.' });

    const lab = await Lab.findOne({ code: labCode });
    const recurrenceId = crypto.randomUUID();
    let successCount = 0;

    for (const date of dates) {
      const isMaintenance = (lab.maintenanceLog || []).some(m => date >= new Date(m.start).toISOString().slice(0,10) && date <= new Date(m.end).toISOString().slice(0,10));
      if (isMaintenance) continue;

      for (const period of periods) {
        const existing = await Booking.findOne({ lab: lab._id, date, period, status: 'Approved' });
        if (existing) {
          if (req.user.role === 'Admin') await Booking.deleteOne({ _id: existing._id });
          else continue;
        }

        await Booking.create({
          lab: lab._id, date, period, createdBy: req.user.id, creatorName: req.user.name,
          role: req.user.role, purpose, type: type || 'Regular', status: req.user.role === 'Admin' ? 'Approved' : 'Pending',
          isRecurring: true, recurrenceId, subject: subjectId || null, showInBanner: showInBanner || false, bannerColor: bannerColor || 'blue'
        });
        successCount++;
      }
    }
    res.json({ message: `Processed ${successCount} slots.` });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE BOOKING
router.delete('/:id', jwtAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('lab');
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (booking.createdBy.toString() !== req.user.id && req.user.role !== 'Admin') return res.status(403).json({ error: 'Unauthorized' });
    await Booking.deleteOne({ _id: booking._id });
    res.json({ message: 'Cancelled' });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

// MY HISTORY
router.get('/my-history', jwtAuth, async (req, res) => {
  try {
    const bookings = await Booking.find({ createdBy: req.user.id }).populate('lab', 'code').populate('subject', 'code name').sort({ date: -1 });
    res.json({ bookings });
  } catch(e) { res.status(500).json({error:'err'}); }
});

module.exports = router;