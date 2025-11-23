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

    // 1. Notify the user being cancelled
    if (booking.createdBy?.email) {
      sendMail(
        booking.createdBy.email,
        'Booking Cancelled ⚠️',
        `Your booking for ${booking.lab?.code || 'Lab'} on ${booking.date} (Period ${booking.period}) was cancelled by Admin.`
      );
    }

    // 2. Capture details before delete to find replacements
    const { lab, date, period } = booking;

    // 3. Delete the booking
    await Booking.deleteOne({ _id: booking._id });
    
    // 4. Log the action
    await Log.create({ action: 'AdminCancelledBooking', user: req.user.id, meta: { bookingId: booking._id, lab: lab.code, date, period } });

    // 5. Check for Pending requests on this same slot
    const pendingReplacement = await Booking.findOne({ 
        lab: lab._id, 
        date: date, 
        period: period, 
        status: 'Pending' 
    });

    let message = 'Booking cancelled successfully.';
    if (pendingReplacement) {
        message += ` ⚠️ NOTE: There is a Pending request from ${pendingReplacement.creatorName} for this slot. check "Pending" tab.`;
    }

    res.json({ message });
  } catch (err) {
    console.error(err);
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
// STATS (Updated with Subject Counts)
// ------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    
    // 1. Lab Usage
    const bookingsByLab = await Booking.aggregate([
      { $lookup: { from: 'labs', localField: 'lab', foreignField: '_id', as: 'labInfo' } },
      { $unwind: '$labInfo' },
      { $group: { _id: '$labInfo.code', count: { $sum: 1 } } }
    ]);

    // 2. Role Activity
    const bookingsByRole = await Booking.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // ✅ 3. NEW: Subject Usage (Approved Only)
    const bookingsBySubject = await Booking.aggregate([
      { $match: { status: 'Approved', subject: { $ne: null } } }, // Only approved & valid subject
      { $lookup: { from: 'subjects', localField: 'subject', foreignField: '_id', as: 'subInfo' } },
      { $unwind: '$subInfo' },
      { $group: { _id: '$subInfo.code', name: { $first: '$subInfo.name' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } } // Highest usage first
    ]);

    res.json({ totalUsers, totalBookings, bookingsByLab, bookingsByRole, bookingsBySubject });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Stats failed" });
  }
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
// ------------------------------------
// EXPORT CSV REPORT
// ------------------------------------
router.get('/export-csv', async (req, res) => {
  try {
    // 1. Fetch all bookings with full details
    const bookings = await Booking.find()
      .populate('lab', 'code')
      .populate('createdBy', 'name email')
      .populate('subject', 'code name')
      .sort({ date: -1, period: 1 }) // Sort by Date (Newest First)
      .lean();

    // 2. Define CSV Headers
    let csv = 'Date,Period,Lab,User Name,User Email,Role,Type,Subject,Purpose,Status,Created At\n';

    // 3. Map Data to CSV Rows
    bookings.forEach(b => {
      // Handle null/undefined values gracefully
      const date = b.date || 'N/A';
      const period = b.period || 'N/A';
      const lab = b.lab?.code || 'Deleted Lab';
      const user = b.creatorName || 'Unknown';
      const email = b.createdBy?.email || 'N/A';
      const role = b.role || 'N/A';
      const type = b.type || 'Regular';
      
      // Subject: Handle null (e.g. generic student booking)
      const subject = b.subject ? `${b.subject.code} - ${b.subject.name}` : 'N/A';
      
      // Purpose: Escape quotes and wrap in quotes to handle commas inside the text
      // e.g. "Lab 1, Group A" -> """Lab 1, Group A"""
      const cleanPurpose = b.purpose ? `"${b.purpose.replace(/"/g, '""')}"` : '""';
      
      const status = b.status;
      const createdAt = b.createdAt ? new Date(b.createdAt).toISOString().slice(0,10) : 'N/A';

      // Append Row
      csv += `${date},${period},${lab},${user},${email},${role},${type},${subject},${cleanPurpose},${status},${createdAt}\n`;
    });

    // 4. Send File
    const filename = `LabSync_Report_${new Date().toISOString().slice(0,10)}.csv`;
    
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.send(csv);

  } catch (err) {
    console.error("CSV Export Error:", err);
    res.status(500).send("Failed to generate CSV report.");
  }
});
// ------------------------------------
// ANNOUNCEMENT MANAGEMENT
// ------------------------------------

// 1. GET ALL (For Admin Table)
router.get('/announcements', async (req, res) => {
  try {
    const list = await Announcement.find().sort({ createdAt: -1 });
    res.json({ announcements: list });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// 2. UPDATE (Toggle Active or Change Expiry)
router.put('/announcements/:id', async (req, res) => {
  try {
    const { active, extendDays } = req.body;
    const update = {};
    
    if (active !== undefined) update.active = active;
    
    if (extendDays) {
      const announcement = await Announcement.findById(req.params.id);
      if (announcement) {
        const currentExpiry = new Date(announcement.expiresAt);
        currentExpiry.setDate(currentExpiry.getDate() + parseInt(extendDays));
        update.expiresAt = currentExpiry;
      }
    }

    await Announcement.findByIdAndUpdate(req.params.id, update);
    res.json({ message: 'Updated successfully' });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// 3. DELETE
router.delete('/announcements/:id', async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});
module.exports = router;