const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Lab = require('../models/Lab');
const jwtAuth = require('../middleware/jwtAuth');
const User = require('../models/User');
const crypto = require('crypto');

const isPast = (dateStr) => new Date(dateStr) < new Date().setHours(0,0,0,0);

// 1. CREATE BOOKING (Single)
router.post('/', jwtAuth, async (req, res) => {
  try {
    const { labCode, date, period, purpose, type, subjectId, showInBanner, bannerColor } = req.body;

    if (!labCode || !date || !period) return res.status(400).json({ error: 'Missing fields' });
    if (isPast(date)) return res.status(400).json({ error: 'Cannot book past dates.' });
    
    const bookingDate = new Date(date);
    if (bookingDate.getDay() === 0 && (type === 'Test' || type === 'Exam')) {
      return res.status(400).json({ error: 'Tests and exams cannot be scheduled on Sundays.' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.status !== 'Approved') return res.status(403).json({ error: 'Account not approved' });

    if (user.role === 'Staff' && !subjectId) return res.status(400).json({ error: 'Staff must select a Subject.' });

    const lab = await Lab.findOne({ code: labCode });
    if (!lab) return res.status(404).json({ error: 'Lab not found' });

    const isUnderMaintenance = (lab.maintenanceLog || []).some(m => date >= new Date(m.start).toISOString().slice(0,10) && date <= new Date(m.end).toISOString().slice(0,10));
    if (isUnderMaintenance) return res.status(403).json({ error: `Lab under maintenance.` });

    const existingBooking = await Booking.findOne({ lab: lab._id, date, period, status: 'Approved' }).populate('createdBy');

    if (existingBooking) {
      if (user.role === 'Admin') {
        await Booking.deleteOne({ _id: existingBooking._id }); 
      } else if (user.role === 'Staff' && type === 'Test') {
      } else {
        return res.status(400).json({ error: 'Slot already booked' });
      }
    }

    const initialStatus = user.role === 'Admin' ? 'Approved' : 'Pending';
    
    const booking = await Booking.create({
      lab: lab._id, date, period, createdBy: user._id, creatorName: user.name, role: user.role,
      purpose: purpose || '', type: type || 'Regular', status: initialStatus,
      subject: subjectId || null, showInBanner: showInBanner || false, bannerColor: bannerColor || 'blue',
      priority: (user.role === 'Admin' ? 3 : user.role === 'Staff' ? 2 : 1)
    });

    req.app.get('io').emit('bookingUpdate', { labCode, date, period, action: 'create' });
    res.json({ message: initialStatus === 'Approved' ? 'Booked!' : 'Request sent.', booking });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// 2. JOIN WAITLIST
router.post('/:id/waitlist', jwtAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const alreadyWaiting = booking.waitlist.some(w => w.user.toString() === req.user.id);
    if (alreadyWaiting) return res.status(400).json({ error: 'You are already on the waitlist.' });
    booking.waitlist.push({ user: req.user.id, email: req.user.email, requestedAt: new Date() });
    await booking.save();
    res.json({ message: 'Added to waitlist' });
  } catch (err) { res.status(500).json({ error: 'Waitlist failed' }); }
});

// 3. RECURRING / BATCH BOOKING
router.post('/recurring', jwtAuth, async (req, res) => {
  try {
    if (req.user.role === 'Student') return res.status(403).json({ error: 'Students cannot create bulk bookings' });

    const { batch, labCode, dates, periods, purpose, type, subjectId, showInBanner, bannerColor } = req.body; 
    
    // ✅ CRITICAL FIX: Check if it's a Batch OR a Regular Recurring request
    // Previous code failed because it always checked for 'dates' and 'periods'
    if (!batch && (!dates?.length || !periods?.length)) {
        return res.status(400).json({ error: 'Invalid data: Missing dates or periods' });
    }

    if (!batch && req.user.role === 'Staff' && !subjectId) {
        return res.status(400).json({ error: 'Staff must select a Subject.' });
    }

    let bookingsToProcess = [];

    // MODE A: Batch Queue (New)
    if (batch && Array.isArray(batch)) {
        bookingsToProcess = batch.map(item => ({
            labCode: item.labCode,
            dates: [item.date], // Backend needs array
            periods: item.periods,
            purpose: item.purpose,
            type: item.type,
            subjectId: item.subjectId,
            showInBanner: true, 
            bannerColor: item.type === 'Semester Exam' ? 'red' : 'indigo'
        }));
    } 
    // MODE B: Standard Recurring (Old)
    else {
        const lab = await Lab.findOne({ code: labCode });
        if (!lab) return res.status(404).json({ error: 'Lab not found' });

        bookingsToProcess.push({
            labCode, dates, periods, purpose, type, subjectId, showInBanner, bannerColor
        });
    }

    let successCount = 0;
    const recurrenceId = crypto.randomUUID();

    // Process List
    for (const entry of bookingsToProcess) {
        const targetLab = await Lab.findOne({ code: entry.labCode });
        if(!targetLab) continue;

        for (const date of entry.dates) {
            // Sunday Check for Tests/Exams
            const bookingDate = new Date(date);
            if (bookingDate.getDay() === 0 && (entry.type === 'Test' || entry.type === 'Exam' || entry.type === 'Semester Exam')) {
              continue; // Skip Sunday bookings for tests/exams
            }
            
            // Maintenance Check
            const isMaintenance = (targetLab.maintenanceLog || []).some(m => 
                date >= new Date(m.start).toISOString().slice(0,10) && 
                date <= new Date(m.end).toISOString().slice(0,10)
            );
            if (isMaintenance) continue;

            for (const period of entry.periods) {
                // Conflict Check
                const existing = await Booking.findOne({ lab: targetLab._id, date, period, status: 'Approved' });
                if (existing) {
                    if (req.user.role === 'Admin') await Booking.deleteOne({ _id: existing._id });
                    else continue; // Skip if staff conflict
                }

                await Booking.create({
                    lab: targetLab._id, date, period, 
                    createdBy: req.user.id, creatorName: req.user.name, role: req.user.role, 
                    purpose: entry.purpose, type: entry.type || 'Regular', 
                    status: req.user.role === 'Admin' ? 'Approved' : 'Pending',
                    isRecurring: true, recurrenceId, 
                    subject: entry.subjectId || null, 
                    showInBanner: entry.showInBanner || false, 
                    bannerColor: entry.bannerColor || 'blue'
                });
                successCount++;
            }
        }
    }
    
    req.app.get('io').emit('bookingUpdate', { action: 'recurring' });
    res.json({ message: `Processed ${successCount} slots.` });

  } catch (err) { 
      console.error(err);
      res.status(500).json({ error: 'Server error' }); 
  }
});

// 4. DELETE BOOKING
router.delete('/:id', jwtAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('lab');
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (booking.createdBy.toString() !== req.user.id && req.user.role !== 'Admin') return res.status(403).json({ error: 'Unauthorized' });
    await Booking.deleteOne({ _id: booking._id });
    req.app.get('io').emit('bookingUpdate', { action: 'delete' });
    res.json({ message: 'Cancelled' });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

// 5. MY HISTORY
router.get('/my-history', jwtAuth, async (req, res) => {
  try {
    const bookings = await Booking.find({ createdBy: req.user.id }).populate('lab', 'code').populate('subject', 'code name').sort({ date: -1 });
    res.json({ bookings });
  } catch(e) { res.status(500).json({error:'err'}); }
});

module.exports = router;