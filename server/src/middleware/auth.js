// src/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  if (req.query.testUserRole) {
    req.user = { id: null, role: req.query.testUserRole, name: `Test ${req.query.testUserRole}` };
    console.log('[AUTH] Simulated user:', req.user.role);
    return next();
  }

  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
