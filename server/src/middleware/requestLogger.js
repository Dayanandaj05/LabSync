// src/middleware/requestLogger.js
module.exports = function requestLogger(req, res, next) {
  const now = new Date().toISOString();
  console.log(`[REQ] ${now} ${req.method} ${req.originalUrl} - body keys: ${Object.keys(req.body || {})}`);
  const start = Date.now();

  // Hook into res.end to log when response finishes
  const _end = res.end;
  res.end = function (...args) {
    const ms = Date.now() - start;
    console.log(`[RES] ${now} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
    _end.apply(res, args);
  };
  next();
};
