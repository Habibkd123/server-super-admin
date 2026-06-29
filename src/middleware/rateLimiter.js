// ─── src/middleware/rateLimiter.js ────────────────────────────────────────────
// Rate limiting for public endpoints — 100 requests per minute per IP

const rateLimit = require('express-rate-limit');

const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 100,            // max 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in a moment.',
  },
  // Use req.ip which respects X-Forwarded-For behind proxies (Vercel, Railway, etc.)
  keyGenerator: (req) => req.ip,
});

// Stricter limiter for auth endpoint — prevent brute force
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Try again after 15 minutes.',
  },
});

module.exports = { publicRateLimiter, authRateLimiter };
