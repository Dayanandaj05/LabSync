const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const Booking = require('../models/Booking');
const User = require('../models/User'); 
const Lab = require('../models/Lab');
const Subject = require('../models/Subject'); 
const Announcement = require('../models/Announcement'); 
const Log = require('../models/Log');
const { sendMail } = require('../utils/mailer');

router.use(jwtAuth);
router.use((req, res, next) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  next();
});

// ------------------------------------
// GET PENDING BOOKINGS
// ------------------------------------
router.get('/bookings/pending', async (req, res) => {
    try {
        const pending = await Booking.find({ status: 'Pending' })
            .populate('lab')
            .populate('createdBy', 'email')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ pending: pending.map(b => ({...b, labCode: b.lab?.code, creatorEmail: b.createdBy?.email})) });
    } catch (err) { res.status(500).json({ error: 'server error' }); }
});

// ------------------------------------
// CANCEL BOOKING (Delete)
// ------------------------------------
router.delete('/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('createdBy').populate('lab'); 
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.createdBy?.email) {
      sendMail(
        booking.createdBy.email,
        'Booking Cancelled ⚠️',
        `Your booking for ${booking.lab?.code || 'Lab'} on ${booking.date} was cancelled by an Admin.`
      );
    }

    await Booking.deleteOne({ _id: booking._id });
    await Log.create({ action: 'AdminCancelledBooking', user: req.user.id, meta: { bookingId: booking._id } });
    res.json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ------------------------------------
// GET ALL USERS (Admin list view)
// ------------------------------------
router.get('/users', async (req, res) => {
  try {
    // ✅ FIX: Removed 'classGroup' from select. 
    // '-password' automatically includes all other fields.
    const users = await User.find().select('-password').sort({ name: 1 }); 
    res.json({ users });
  } catch (err) {
    console.error("Error fetching users:", err); // Log exact error to console
    res.status(500).json({ error: 'Server error fetching user list' });
  }
});

// ------------------------------------
// GET BOOKINGS FOR SPECIFIC USER
// ------------------------------------
router.get('/users/:id/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find({ createdBy: req.params.id })
      .populate('lab', 'code name')
      .sort({ date: -1, period: 1 });
      
    // Format lab data for frontend display
    const formattedBookings = bookings.map(b => ({
        ...b.toObject(), 
        lab: { code: b.lab?.code, name: b.lab?.name } 
    }));

    res.json({ bookings: formattedBookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching user bookings' });
  }
});

// ------------------------------------
// ADMIN HISTORY
// ------------------------------------
router.get('/bookings/history', async (req, res) => {
    try {
      const history = await Booking.find({ status: { $ne: 'Pending' } }).populate('lab').populate('createdBy', 'name email').sort({ updatedAt: -1 }).limit(50).lean();
      res.json({ history: history.map(b => ({...b, labCode: b.lab?.code, creatorName: b.createdBy?.name, creatorEmail: b.createdBy?.email})) });
    } catch (err) { res.status(500).json({ error: 'server error' }); }
});

// ------------------------------------
// APPROVE / REJECT BOOKING
// ------------------------------------
router.put('/bookings/:id/approve', async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id).populate('createdBy');
      if (!booking) return res.status(404).json({ error: 'not found' });
      booking.status = 'Approved';
      await booking.save();
      res.json({message:'Approved'});
    } catch (e) { res.status(500).json({ error: 'server error' }); }
});

router.put('/bookings/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'not found' });
    booking.status = 'Rejected';
    booking.adminReason = reason || '';
    await booking.save();
    res.json({message:'Rejected'});
  } catch (e) { res.status(500).json({ error: 'server error' }); }
});

// ------------------------------------
// STATS
// ------------------------------------
router.get('/stats', async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    
    // Simple Aggregation for Charts
    const bookingsByLab = await Booking.aggregate([
      { $lookup: { from: 'labs', localField: 'lab', foreignField: '_id', as: 'labInfo' } },
      { $unwind: '$labInfo' },
      { $group: { _id: '$labInfo.code', count: { $sum: 1 } } }
    ]);

    const bookingsByRole = await Booking.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    res.json({ totalUsers, totalBookings, bookingsByLab, bookingsByRole });
});

// ------------------------------------
// SUBJECTS
// ------------------------------------
router.post('/subjects', async (req, res) => {
  try {
    const { code, name } = req.body;
    await Subject.create({ code, name });
    res.json({ message: "Subject added" });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ code: 1 });
    res.json({ subjects });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.delete('/subjects/:id', async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

router.post('/reset-semester', async (req, res) => {
  try {
    await Subject.deleteMany({});
    res.json({ message: "Reset" });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// ------------------------------------
// ANNOUNCEMENTS & MAINTENANCE
// ------------------------------------
router.post('/announcements', async (req, res) => {
    try {
        const { message, type, daysActive } = req.body;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (daysActive || 7));
        await Announcement.create({ message, type, expiresAt, createdBy: req.user.id });
        res.json({ message: 'Posted' });
    } catch (e) { res.status(500).json({error:'err'}); }
});

router.post('/labs/maintenance', async (req, res) => {
    try {
        const { labCode, startDate, endDate, reason } = req.body;
        const lab = await Lab.findOne({code:labCode});
        if(!lab) return res.status(404).json({error:'Lab not found'});
        
        // Cancel existing
        await Booking.deleteMany({ 
            lab: lab._id, 
            date: { $gte: startDate, $lte: endDate }
        });
        
        lab.maintenanceLog.push({ start: startDate, end: endDate, reason });
        await lab.save();
        res.json({ message: 'Maintenance Set' });
    } catch (e) { res.status(500).json({error:'err'}); }
});

module.exports = router;