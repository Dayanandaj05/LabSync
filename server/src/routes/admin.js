const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Announcement = require('../models/Announcement'); 
const Log = require('../models/Log');
const { sendMail } = require('../utils/mailer');

router.use(jwtAuth);
router.use((req, res, next) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  next();
});

// --- STANDARD ROUTES ---

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

// ------------------------------------
// ✅ NEW: EXPORT CSV
// ------------------------------------
router.get('/export-csv', async (req, res) => {
  try {
    const bookings = await Booking.find().populate('lab').populate('createdBy', 'name email').sort({ date: -1 }).lean();
    
    // Manually build CSV string to avoid external dependencies
    const header = 'Date,Period,Lab,User,Email,Role,Purpose,Status,Type\n';
    const rows = bookings.map(b => {
      const safe = (text) => `"${(text || '').replace(/"/g, '""')}"`; // Escape quotes
      return [
        b.date,
        b.period,
        b.lab?.code || 'Unknown',
        safe(b.createdBy?.name || 'Unknown'),
        safe(b.createdBy?.email || 'Unknown'),
        b.role,
        safe(b.purpose),
        b.status,
        b.type || 'Regular'
      ].join(',');
    }).join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment('labsync_report.csv');
    return res.send(header + rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// ------------------------------------
// ✅ NEW: MANAGE ANNOUNCEMENTS
// ------------------------------------
router.post('/announcements', async (req, res) => {
  try {
    const { message, type } = req.body;
    await Announcement.create({ message, type, createdBy: req.user.id });
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
// USER & BOOKING MANAGEMENT
// ------------------------------------
router.delete('/bookings/:id', async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate('createdBy').populate('lab');
    if(!booking) return res.status(404).json({error:'Not found'});
    if(booking.createdBy?.email) sendMail(booking.createdBy.email, 'Cancelled', 'Your booking was cancelled by Admin.');
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