// Simple in-memory rate limiter (per IP). For production, use redis-backed limiter.
const windowMs = (process.env.RATE_WINDOW_MIN || 15) * 60 * 1000; // default 15 minutes
const maxRequests = process.env.RATE_MAX_REQUESTS || 500;
const hits = new Map();

module.exports = (req, res, next) => {
  try {
    const key = req.ip;
    const now = Date.now();
    const entry = hits.get(key) || { count: 0, start: now };
    if (now - entry.start > windowMs) {
      entry.count = 1;
      entry.start = now;
    } else {
      entry.count += 1;
    }
    hits.set(key, entry);
    if (entry.count > maxRequests) {
      return res.status(429).json({ message: "Too many requests. Try later." });
    }
    next();
  } catch (err) {
    next(err);
  }
};
