const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const User = require('../models/User');
const Log = require('../models/Log');

router.use(jwtAuth);
router.use((req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only' });
  next();
});

// PENDING USERS
router.get('/pending', async (req, res) => {
  try {
    const pending = await User.find({ status: 'Pending' }).select('-password').lean();
    return res.json({ pending });
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
});

// ✅ NEW: USER HISTORY
router.get('/history', async (req, res) => {
  try {
    const history = await User.find({ status: { $ne: 'Pending' } })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'server error' });
  }
});

// APPROVE
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.status = 'Approved';
    user.rejectReason = '';
    await user.save();

    await Log.create({ action: 'AdminApprovedUser', user: req.user.id, meta: { admin: req.user.email, userId: id } });
    return res.json({ message: 'User approved' });
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
});

// REJECT
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.status = 'Rejected';
    user.rejectReason = reason || '';
    await user.save();

    await Log.create({ action: 'AdminRejectedUser', user: req.user.id, meta: { admin: req.user.email, userId: id, reason: user.rejectReason } });
    return res.json({ message: 'User rejected' });
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;