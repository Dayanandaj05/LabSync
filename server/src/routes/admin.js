const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Lab = require('../models/Lab'); // Imported Lab
const Announcement = require('../models/Announcement'); 
const Log = require('../models/Log');
const { sendMail } = require('../utils/mailer');

router.use(jwtAuth);
router.use((req, res, next) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  next();
});

// --- EXISTING ROUTES (Pending, History, Approve, Reject, Stats, CSV) ---
// (Assume standard routes exist here...)

router.get('/bookings/pending', async (req, res) => {
    const pending = await Booking.find({ status: 'Pending' }).populate('lab').populate('createdBy','email').sort({ createdAt: -1 }).lean();
    const formatted = pending.map(b => ({...b, labCode: b.lab?.code, creatorEmail: b.createdBy?.email}));
    res.json({ pending: formatted });
});

router.get('/bookings/history', async (req, res) => {
    const history = await Booking.find({ status: { $ne: 'Pending' } }).populate('lab').populate('createdBy', 'name email').sort({ updatedAt: -1 }).limit(50).lean();
    const formatted = history.map(b => ({...b, labCode: b.lab?.code, creatorName: b.createdBy?.name, creatorEmail: b.createdBy?.email}));
    res.json({ history: formatted });
});

router.put('/bookings/:id/approve', async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate('createdBy');
    if(!booking) return res.status(404).json({error:'not found'});
    booking.status = 'Approved';
    await booking.save();
    if(booking.createdBy?.email) sendMail(booking.createdBy.email, 'Approved', 'Your booking was approved.');
    await Log.create({ action: 'AdminApprovedBooking', user: req.user.id, meta: { bookingId: booking._id } });
    res.json({message:'Approved'});
});

router.put('/bookings/:id/reject', async (req, res) => {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id).populate('createdBy');
    if(!booking) return res.status(404).json({error:'not found'});
    booking.status = 'Rejected';
    booking.adminReason = reason;
    await booking.save();
    if(booking.createdBy?.email) sendMail(booking.createdBy.email, 'Rejected', `Booking rejected: ${reason}`);
    await Log.create({ action: 'AdminRejectedBooking', user: req.user.id, meta: { bookingId: booking._id } });
    res.json({message:'Rejected'});
});

router.get('/export-csv', async (req, res) => {
  try {
    const bookings = await Booking.find().populate('lab').populate('createdBy', 'name email').sort({ date: -1 }).lean();
    const header = 'Date,Period,Lab,User,Email,Role,Purpose,Status,Type\n';
    const rows = bookings.map(b => {
      const safe = (text) => `"${(text || '').replace(/"/g, '""')}"`; 
      return [b.date, b.period, b.lab?.code, safe(b.createdBy?.name), safe(b.createdBy?.email), b.role, safe(b.purpose), b.status, b.type].join(',');
    }).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment('labsync_report.csv');
    return res.send(header + rows);
  } catch (err) { res.status(500).json({ error: 'Export failed' }); }
});

// ------------------------------------
// ✅ UPDATED: ANNOUNCEMENTS WITH EXPIRY
// ------------------------------------
router.post('/announcements', async (req, res) => {
  try {
    const { message, type, daysActive } = req.body;
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (daysActive || 7)); // Default 7 days

    await Announcement.create({ 
      message, 
      type, 
      expiresAt,
      createdBy: req.user.id 
    });
    res.json({ message: 'Announcement posted' });
  } catch (err) { res.status(500).json({ error: 'Error posting announcement' }); }
});

router.delete('/announcements/:id', async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Error deleting' }); }
});

// ------------------------------------
// ✅ NEW: LAB MAINTENANCE (Cancel Duration)
// ------------------------------------
router.post('/labs/maintenance', async (req, res) => {
  try {
    const { labCode, startDate, endDate, reason } = req.body;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) return res.status(400).json({ error: "End date must be after start date" });

    const lab = await Lab.findOne({ code: labCode });
    if (!lab) return res.status(404).json({ error: "Lab not found" });

    // 1. Find all affected bookings (Approved or Pending)
    // Note: Bookings store date as String YYYY-MM-DD. We convert for check.
    // We fetch ALL bookings and filter in JS for precision, or rely on string comparison
    // Since strings are ISO YYYY-MM-DD, lexical comparison works for dates.
    
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const bookingsToCheck = await Booking.find({
      lab: lab._id,
      date: { $gte: startStr, $lte: endStr },
      status: { $ne: 'Rejected' } // Only care about Active/Pending
    }).populate('createdBy');

    let cancelledCount = 0;

    // 2. Iterate and Cancel conflicts
    for (const b of bookingsToCheck) {
      // Simple check: If date is in range, cancel it.
      // (Enhancement: check specific times if periods were mapped to times)
      // Here we assume "Maintenance" blocks the whole day/duration.
      
      if (b.createdBy?.email) {
        sendMail(
          b.createdBy.email,
          'URGENT: Lab Maintenance ⚠️',
          `Your booking for ${labCode} on ${b.date} (Period ${b.period}) has been cancelled due to emergency maintenance.\n\nReason: ${reason}`
        );
      }
      
      await Booking.deleteOne({ _id: b._id });
      cancelledCount++;
    }

    // 3. Log Maintenance in Lab
    lab.maintenanceLog.push({
      start,
      end,
      reason,
      cancelledCount
    });
    await lab.save();

    await Log.create({
      action: 'LabMaintenanceEnabled',
      user: req.user.id,
      meta: { lab: labCode, cancelled: cancelledCount, reason }
    });

    res.json({ message: `Maintenance enabled. ${cancelledCount} bookings cancelled and users notified.` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during maintenance block' });
  }
});

// ... (Keep User/Delete/Stats routes from previous version) ...
router.delete('/bookings/:id', async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate('createdBy').populate('lab');
    if(!booking) return res.status(404).json({error:'Not found'});
    if(booking.createdBy?.email) sendMail(booking.createdBy.email, 'Cancelled', 'Your booking was cancelled.');
    await Booking.deleteOne({_id:booking._id});
    res.json({message:'Cancelled'});
});

router.get('/users', async (req, res) => {
    const users = await User.find().select('-password');
    res.json({users});
});

router.get('/users/:id/bookings', async (req, res) => {
    const bookings = await Booking.find({createdBy:req.params.id}).populate('lab','code').sort({date:-1});
    res.json({bookings});
});

router.get('/stats', async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const bookingsByLab = await Booking.aggregate([{ $lookup: { from: 'labs', localField: 'lab', foreignField: '_id', as: 'labInfo' } }, { $unwind: '$labInfo' }, { $group: { _id: '$labInfo.code', count: { $sum: 1 } } }]);
    const bookingsByRole = await Booking.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    res.json({ totalUsers, totalBookings, bookingsByLab, bookingsByRole, topUser: {_id:'Admin',count:0} });
});

module.exports = router;