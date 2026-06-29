// ─── src/routes/auth.js ───────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/login — rate limited to prevent brute force
router.post('/login', authRateLimiter, login);

// GET /api/auth/me — get current admin profile (JWT protected)
router.get('/me', authMiddleware, getMe);

module.exports = router;
