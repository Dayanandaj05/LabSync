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

// =============================================================================
// 1. BOOKING MANAGEMENT
// =============================================================================

// GET PENDING
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

// CANCEL BOOKING
router.delete('/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('createdBy').populate('lab'); 
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.createdBy?.email) {
      sendMail(
        booking.createdBy.email,
        'Booking Cancelled ⚠️',
        `Your booking for ${booking.lab?.code || 'Lab'} on ${booking.date} (Period ${booking.period}) was cancelled by Admin.`
      );
    }

    const { lab, date, period } = booking;
    await Booking.deleteOne({ _id: booking._id });
    await Log.create({ action: 'AdminCancelledBooking', user: req.user.id, meta: { bookingId: booking._id, lab: lab?.code, date, period } });

    // Check for Waitlist / Pending replacement
    const pendingReplacement = await Booking.findOne({ 
        lab: lab?._id, 
        date: date, 
        period: period, 
        status: 'Pending' 
    });

    let message = 'Booking cancelled successfully.';
    if (pendingReplacement) {
        message += ` ⚠️ NOTE: There is a Pending request from ${pendingReplacement.creatorName} for this slot.`;
    }

    req.app.get('io').emit('bookingUpdate', { action: 'delete' });
    res.json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PROMOTE WAITLIST USER (Force Swap)
router.post('/bookings/:id/promote', async (req, res) => {
  try {
    const { userId } = req.body; 
    const booking = await Booking.findById(req.params.id).populate('lab').populate('createdBy');
    
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

    // Notify OLD owner
    if (booking.createdBy && booking.createdBy.email) {
      sendMail(
        booking.createdBy.email,
        'Booking Re-assigned ⚠️',
        `Your booking for ${booking.lab?.code} on ${booking.date} (Period ${booking.period}) has been re-assigned to another user by the Admin.`
      );
    }

    // Notify NEW owner
    sendMail(
      targetUser.email,
      'You have been Promoted! 🎉',
      `Good news! You have been moved from the waitlist to confirmed for ${booking.lab?.code} on ${booking.date} (Period ${booking.period}).`
    );

    // Update Booking
    booking.createdBy = targetUser._id;
    booking.creatorName = targetUser.name;
    booking.role = targetUser.role;
    booking.status = 'Approved'; 
    booking.purpose = `(Promoted) ${booking.purpose}`; 
    
    // Remove promoted user from waitlist
    booking.waitlist = booking.waitlist.filter(w => w.user.toString() !== userId);

    await booking.save();
    
    await Log.create({ 
        action: 'AdminPromotedWaitlist', 
        user: req.user.id, 
        meta: { bookingId: booking._id, newOwner: targetUser.email, lab: booking.lab?.code } 
    });

    req.app.get('io').emit('bookingUpdate', { action: 'promote' });

    res.json({ message: 'User promoted successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during promotion' });
  }
});

// APPROVE
router.put('/bookings/:id/approve', async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id).populate('createdBy');
      if (!booking) return res.status(404).json({ error: 'not found' });
      booking.status = 'Approved';
      await booking.save();
      req.app.get('io').emit('bookingUpdate', { action: 'approve' });
      res.json({message:'Approved'});
    } catch (e) { res.status(500).json({ error: 'server error' }); }
});

// REJECT
router.put('/bookings/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'not found' });
    booking.status = 'Rejected';
    booking.adminReason = reason || '';
    await booking.save();
    req.app.get('io').emit('bookingUpdate', { action: 'reject' });
    res.json({message:'Rejected'});
  } catch (e) { res.status(500).json({ error: 'server error' }); }
});

// HISTORY
router.get('/bookings/history', async (req, res) => {
    try {
      const history = await Booking.find({ status: { $ne: 'Pending' } })
          .populate('lab')
          .populate('createdBy', 'name email')
          .sort({ updatedAt: -1 })
          .limit(50)
          .lean();
      res.json({ 
          history: history.map(b => ({
              ...b, 
              labCode: b.lab?.code, 
              creatorName: b.createdBy?.name, 
              creatorEmail: b.createdBy?.email,
              waitlist: b.waitlist || [] 
          })) 
      });
    } catch (err) { res.status(500).json({ error: 'server error' }); }
});

// =============================================================================
// 2. USER MANAGEMENT
// =============================================================================

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ name: 1 }); 
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching user list' });
  }
});

router.get('/users/:id/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find({ createdBy: req.params.id })
      .populate('lab', 'code name')
      .sort({ date: -1, period: 1 });
      
    const formattedBookings = bookings.map(b => ({
        ...b.toObject(), 
        lab: { code: b.lab?.code, name: b.lab?.name } 
    }));

    res.json({ bookings: formattedBookings });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// =============================================================================
// 3. LAB & MAINTENANCE MANAGEMENT
// =============================================================================

// GET ALL LABS (Includes Maintenance Logs)
router.get('/labs', async (req, res) => {
    try {
        const labs = await Lab.find().lean();
        res.json({ labs });
    } catch (e) { res.status(500).json({error:'err'}); }
});

// CREATE MAINTENANCE BLOCK
router.post('/labs/maintenance', async (req, res) => {
    try {
        const { labCode, startDate, endDate, reason } = req.body;
        const lab = await Lab.findOne({code:labCode});
        if(!lab) return res.status(404).json({error:'Lab not found'});
        
        // Cancel existing bookings in this range
        await Booking.deleteMany({ 
            lab: lab._id, 
            date: { $gte: startDate, $lte: endDate }
        });
        
        lab.maintenanceLog.push({ start: startDate, end: endDate, reason });
        await lab.save();
        
        req.app.get('io').emit('bookingUpdate', { action: 'maintenance' });
        res.json({ message: 'Maintenance Set' });
    } catch (e) { res.status(500).json({error:'err'}); }
});

// DELETE MAINTENANCE BLOCK
router.delete('/labs/maintenance/:labCode/:logId', async (req, res) => {
    try {
        const { labCode, logId } = req.params;
        const lab = await Lab.findOne({ code: labCode });
        if (!lab) return res.status(404).json({ error: 'Lab not found' });

        // Remove specific log
        lab.maintenanceLog = lab.maintenanceLog.filter(log => log._id.toString() !== logId);
        await lab.save();

        req.app.get('io').emit('bookingUpdate', { action: 'maintenance_removed' });
        res.json({ message: 'Maintenance block removed' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error' });
    }
});

// =============================================================================
// 4. SUBJECTS, ANNOUNCEMENTS & DATA
// =============================================================================

// STATS
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    
    const bookingsByLab = await Booking.aggregate([
      { $lookup: { from: 'labs', localField: 'lab', foreignField: '_id', as: 'labInfo' } },
      { $unwind: '$labInfo' },
      { $group: { _id: '$labInfo.code', count: { $sum: 1 } } }
    ]);

    const bookingsByRole = await Booking.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const bookingsBySubject = await Booking.aggregate([
      { $match: { status: 'Approved', subject: { $ne: null } } },
      { $lookup: { from: 'subjects', localField: 'subject', foreignField: '_id', as: 'subInfo' } },
      { $unwind: '$subInfo' },
      { $group: { _id: '$subInfo.code', name: { $first: '$subInfo.name' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ totalUsers, totalBookings, bookingsByLab, bookingsByRole, bookingsBySubject });
  } catch (err) {
    res.status(500).json({ error: "Stats failed" });
  }
});

// SUBJECTS CRUD
router.post('/subjects', async (req, res) => {
  try { await Subject.create(req.body); res.json({ message: "Subject added" }); } catch (err) { res.status(500).json({ error: "Failed" }); }
});
router.get('/subjects', async (req, res) => {
  try { const subjects = await Subject.find().sort({ code: 1 }); res.json({ subjects }); } catch (err) { res.status(500).json({ error: "Failed" }); }
});
router.delete('/subjects/:id', async (req, res) => {
  try { await Subject.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); } catch (err) { res.status(500).json({ error: "Failed" }); }
});
router.post('/reset-semester', async (req, res) => {
  try { await Subject.deleteMany({}); res.json({ message: "Reset" }); } catch (err) { res.status(500).json({ error: "Failed" }); }
});

// ANNOUNCEMENTS CRUD
router.get('/announcements', async (req, res) => {
  try { const list = await Announcement.find().sort({ createdAt: -1 }); res.json({ announcements: list }); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});
router.post('/announcements', async (req, res) => {
    try {
        const { message, type, daysActive } = req.body;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (daysActive || 7));
        await Announcement.create({ message, type, expiresAt, createdBy: req.user.id });
        res.json({ message: 'Posted' });
    } catch (e) { res.status(500).json({error:'err'}); }
});
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
router.delete('/announcements/:id', async (req, res) => {
  try { await Announcement.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted successfully' }); } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// SORTED DATA ENDPOINTS
router.get('/data/labs', async (req, res) => {
  try {
    const { sortBy = 'code', order = 'asc' } = req.query;
    const sortOrder = order === 'desc' ? -1 : 1;
    const labs = await Lab.find().sort({ [sortBy]: sortOrder }).lean();
    res.json({ labs });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch labs' }); }
});

router.get('/data/users', async (req, res) => {
  try {
    const { role, sortBy = 'name', order = 'asc' } = req.query;
    const filter = role && role !== 'All' ? { role } : {};
    const sortOrder = order === 'desc' ? -1 : 1;
    const users = await User.find(filter).select('-password').sort({ [sortBy]: sortOrder }).lean();
    res.json({ users });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

router.get('/data/bookings', async (req, res) => {
  try {
    const { lab, role, status, user, subject, startDate, endDate, sortBy = 'date', order = 'desc' } = req.query;
    const filter = {};
    if (lab && lab !== 'All') {
      const labDoc = await Lab.findOne({ code: lab });
      if (labDoc) filter.lab = labDoc._id;
    }
    if (role && role !== 'All') filter.role = role;
    if (status && status !== 'All') filter.status = status;
    if (user && user !== 'All') filter.createdBy = user;
    if (subject && subject !== 'All') filter.subject = subject;
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    } else if (endDate) {
      filter.date = { $lte: endDate };
    }
    
    const sortOrder = order === 'desc' ? -1 : 1;
    const bookings = await Booking.find(filter)
      .populate('lab', 'code name')
      .populate('createdBy', 'name email')
      .populate('subject', 'code name')
      .sort({ [sortBy]: sortOrder })
      .lean();
    
    res.json({ bookings: bookings.map(b => ({...b, labCode: b.lab?.code, creatorName: b.createdBy?.name})) });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch bookings' }); }
});

// EXPORT CSV
router.get('/export-csv', async (req, res) => {
  try {
    const { lab, role, status, user, subject, startDate, endDate, sortBy = 'date', order = 'desc' } = req.query;
    const filter = {};
    if (lab && lab !== 'All') {
      const labDoc = await Lab.findOne({ code: lab });
      if (labDoc) filter.lab = labDoc._id;
    }
    if (role && role !== 'All') filter.role = role;
    if (status && status !== 'All') filter.status = status;
    if (user && user !== 'All') filter.createdBy = user;
    if (subject && subject !== 'All') filter.subject = subject;
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    } else if (endDate) {
      filter.date = { $lte: endDate };
    }
    
    const sortOrder = order === 'desc' ? -1 : 1;
    const bookings = await Booking.find(filter)
      .populate('lab', 'code')
      .populate('createdBy', 'name email')
      .populate('subject', 'code name')
      .sort({ [sortBy]: sortOrder })
      .lean();

    let csv = 'Date,Period,Lab,User Name,User Email,Role,Type,Subject,Purpose,Status,Created At\n';

    bookings.forEach(b => {
      const cleanPurpose = b.purpose ? `"${b.purpose.replace(/"/g, '""')}"` : '""';
      csv += `${b.date||'N/A'},${b.period||'N/A'},${b.lab?.code||'N/A'},${b.creatorName||'N/A'},${b.createdBy?.email||'N/A'},${b.role||'N/A'},${b.type||'N/A'},${b.subject?.code||'N/A'},${cleanPurpose},${b.status},${b.createdAt}\n`;
    });

    const filename = `LabSync_Report_${new Date().toISOString().slice(0,10)}.csv`;
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);

  } catch (err) {
    res.status(500).send("Failed to generate CSV report.");
  }
});

// EXPORT PDF
router.get('/export-pdf', async (req, res) => {
  try {
    const puppeteer = require('puppeteer');
    const { lab, role, status, user, subject, startDate, endDate, sortBy = 'date', order = 'desc' } = req.query;
    const filter = {};
    if (lab && lab !== 'All') {
      const labDoc = await Lab.findOne({ code: lab });
      if (labDoc) filter.lab = labDoc._id;
    }
    if (role && role !== 'All') filter.role = role;
    if (status && status !== 'All') filter.status = status;
    if (user && user !== 'All') filter.createdBy = user;
    if (subject && subject !== 'All') filter.subject = subject;
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    } else if (endDate) {
      filter.date = { $lte: endDate };
    }
    
    const sortOrder = order === 'desc' ? -1 : 1;
    const bookings = await Booking.find(filter)
      .populate('lab', 'code')
      .populate('createdBy', 'name email')
      .populate('subject', 'code name')
      .sort({ [sortBy]: sortOrder })
      .lean();

    let html = `
    <html><head><style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      h1 { color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f8f9fa; font-weight: bold; }
      tr:nth-child(even) { background-color: #f9f9f9; }
      .approved { color: #059669; font-weight: bold; }
      .rejected { color: #dc2626; font-weight: bold; }
      .pending { color: #d97706; font-weight: bold; }
    </style></head><body>
    <h1>LabSync Report - ${new Date().toLocaleDateString()}</h1>
    <p>Total Records: ${bookings.length}</p>
    <table>
      <tr><th>Date</th><th>Period</th><th>Lab</th><th>User</th><th>Role</th><th>Subject</th><th>Status</th></tr>`;

    bookings.forEach(b => {
      const statusClass = b.status === 'Approved' ? 'approved' : b.status === 'Rejected' ? 'rejected' : 'pending';
      html += `<tr>
        <td>${b.date || 'N/A'}</td>
        <td>${b.period || 'N/A'}</td>
        <td>${b.lab?.code || 'N/A'}</td>
        <td>${b.creatorName || 'N/A'}</td>
        <td>${b.role || 'N/A'}</td>
        <td>${b.subject?.code || 'N/A'}</td>
        <td class="${statusClass}">${b.status}</td>
      </tr>`;
    });

    html += '</table></body></html>';

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const filename = `LabSync_Report_${new Date().toISOString().slice(0,10)}.pdf`;
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdf);

  } catch (err) {
    res.status(500).send("Failed to generate PDF report.");
  }
});

module.exports = router;