// ─── src/middleware/projectRateLimiter.js ─────────────────────────────────────
// Per-project write rate limiter — keyed by projectId, not IP
// Rule 26: Rate limits on all authenticated write endpoints

const rateLimit = require('express-rate-limit');

/**
 * Write limiter: 20 write operations per projectId per minute.
 * Prevents a single Super Admin session from flooding write endpoints.
 * Key: projectId from URL params (so per-project isolation is maintained)
 */
const projectWriteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // Key by projectId so limits are per-project, not per-IP
  keyGenerator: (req) => {
    const projectId = req.params?.projectId || req.body?.projectId || 'unknown';
    return `project:${projectId}`;
  },
  message: {
    success: false,
    message: 'Too many write operations for this project. Please wait before making more changes.',
  },
  // Skip on GET requests — only limit write methods
  skip: (req) => req.method === 'GET',
});

/**
 * Admin-level rate limiter: 60 authenticated requests per minute per admin IP.
 * Prevents brute-force / flooding of admin-only endpoints.
 */
const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: {
    success: false,
    message: 'Too many requests from this admin session. Please slow down.',
  },
});

module.exports = { projectWriteLimiter, adminRateLimiter };
