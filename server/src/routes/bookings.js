const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Lab = require('../models/Lab');
const Log = require('../models/Log');
const jwtAuth = require('../middleware/jwtAuth');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');
const crypto = require('crypto');

const isPast = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
};

router.post('/', jwtAuth, async (req, res) => {
  try {
    const { labCode, date, period, purpose, type } = req.body;

    if (!labCode || !date || !period) return res.status(400).json({ error: 'Missing fields' });
    if (isPast(date)) return res.status(400).json({ error: 'Cannot book dates in the past.' });

    const user = await User.findById(req.user.id);
    if (!user || user.status !== 'Approved') return res.status(403).json({ error: 'Account not approved' });

    const lab = await Lab.findOne({ code: labCode });
    if (!lab) return res.status(404).json({ error: 'Lab not found' });

    // ✅ FIX: ROBUST MAINTENANCE CHECK
    const isUnderMaintenance = (lab.maintenanceLog || []).some(m => {
      const mStart = new Date(m.start).toISOString().slice(0, 10);
      const mEnd = new Date(m.end).toISOString().slice(0, 10);
      return date >= mStart && date <= mEnd;
    });

    if (isUnderMaintenance) {
      return res.status(403).json({ error: `Lab ${labCode} is under maintenance on ${date}.` });
    }

    const existingBooking = await Booking.findOne({ 
      lab: lab._id, date, period, status: 'Approved' 
    }).populate('createdBy');

    if (existingBooking) {
      if (user.role === 'Admin') {
        if (existingBooking.createdBy?.email) {
          sendMail(existingBooking.createdBy.email, 'Booking Cancelled ⚠️', `Your booking was overridden by Admin.`);
        }
        await Booking.deleteOne({ _id: existingBooking._id });
        await Log.create({ action: 'AdminOverrideBooking', user: user._id, meta: { prev: existingBooking._id, lab: labCode } });
      } else if (user.role === 'Staff' && type === 'Test') {
        // Allow pending conflict
      } else {
        return res.status(400).json({ error: 'Slot already booked' });
      }
    }

    const initialStatus = user.role === 'Admin' ? 'Approved' : 'Pending';
    
    const booking = await Booking.create({
      lab: lab._id, date, period, createdBy: user._id, creatorName: user.name, role: user.role,
      purpose: purpose || '', type: type || 'Regular', status: initialStatus,
      priority: (user.role === 'Admin' ? 3 : user.role === 'Staff' ? 2 : 1)
    });

    if (initialStatus === 'Pending') {
      if (existingBooking && user.role === 'Staff' && type === 'Test') {
         sendMail(user.email, 'Conflict Detected ⚠️', `Your Test request overlaps with an existing booking.`);
         sendMail('admin@test.com', 'CONFLICT: Test Request 🔴', `Staff ${user.name} requested TEST on booked slot.`);
      } else {
         sendMail('admin@test.com', 'New Booking Request', `${user.name} requested ${labCode} P${period}.`);
      }
    }

    await Log.create({ 
      action: initialStatus === 'Approved' ? 'BookingAutoApproved' : 'BookingCreated_Pending', 
      user: user._id, 
      meta: { bookingId: booking._id, lab: labCode, period, date } 
    });

    return res.json({ message: initialStatus === 'Approved' ? 'Booked!' : 'Request sent.', booking });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/recurring', jwtAuth, async (req, res) => {
  try {
    if (req.user.role === 'Student') return res.status(403).json({ error: 'Students cannot create bulk bookings' });

    const { labCode, dates, periods, purpose, type } = req.body; 
    
    if (!dates || !Array.isArray(dates) || dates.length === 0) return res.status(400).json({ error: 'No dates selected' });
    if (!periods || !Array.isArray(periods) || periods.length === 0) return res.status(400).json({ error: 'No periods selected' });
    if (dates.some(d => isPast(d))) return res.status(400).json({ error: 'Cannot book past dates.' });

    const lab = await Lab.findOne({ code: labCode });
    if (!lab) return res.status(404).json({ error: 'Lab not found' });

    const recurrenceId = crypto.randomUUID();
    let successCount = 0;
    let conflictCount = 0;

    for (const date of dates) {
      // Check Maintenance for each date
      const isUnderMaintenance = (lab.maintenanceLog || []).some(m => {
        const mStart = new Date(m.start).toISOString().slice(0, 10);
        const mEnd = new Date(m.end).toISOString().slice(0, 10);
        return date >= mStart && date <= mEnd;
      });
      
      if (isUnderMaintenance) {
        conflictCount++; // Treat maintenance blocks as conflicts
        continue;
      }

      for (const period of periods) {
        const existing = await Booking.findOne({ lab: lab._id, date, period, status: 'Approved' });
        
        if (existing) {
          if (req.user.role === 'Admin') {
             await Booking.deleteOne({ _id: existing._id });
          } else if (req.user.role === 'Staff' && type === 'Test') {
             conflictCount++;
          } else {
             continue; 
          }
        }

        await Booking.create({
          lab: lab._id, date, period, createdBy: req.user.id, creatorName: req.user.name,
          role: req.user.role, purpose, type: type || 'Regular', status: req.user.role === 'Admin' ? 'Approved' : 'Pending',
          isRecurring: true, recurrenceId
        });
        successCount++;
      }
    }

    await Log.create({ action: 'BulkBooking', user: req.user.id, meta: { success: successCount, conflicts: conflictCount, type } });
    res.json({ message: `Processed ${successCount} slots. (${conflictCount} conflicts flagged for review)` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ... (Keep Waitlist/Delete/History routes as is) ...
router.post('/:id/waitlist', jwtAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (booking.waitlist.some(w => w.user.toString() === req.user.id)) return res.status(400).json({ error: 'Already on waitlist' });
    booking.waitlist.push({ user: req.user.id, email: req.user.email });
    await booking.save();
    res.json({ message: 'Added to waitlist' });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.delete('/:id', jwtAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('lab');
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (booking.createdBy.toString() !== req.user.id && req.user.role !== 'Admin') return res.status(403).json({ error: 'Unauthorized' });
    if (booking.waitlist?.length > 0) booking.waitlist.forEach(w => sendMail(w.email, 'Slot Open!', `Slot ${booking.lab.code} ${booking.date} is open.`));
    await Booking.deleteOne({ _id: booking._id });
    res.json({ message: 'Cancelled' });
  } catch (err) { res.status(500).json({ error: 'Error' }); }
});

router.get('/my-history', jwtAuth, async (req, res) => {
  try {
    const bookings = await Booking.find({ createdBy: req.user.id }).populate('lab', 'code').sort({ date: -1 });
    res.json({ bookings });
  } catch(e) { res.status(500).json({error:'err'}); }
});

module.exports = router;