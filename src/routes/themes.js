// ─── src/routes/themes.js ─────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const {
  getTheme,
  updateTheme,
  getThemeAsAdmin,
  getThemeVersions,
  rollbackTheme,
} = require('../controllers/themesController');
const { authMiddleware } = require('../middleware/auth');
const { apiKeyMiddleware } = require('../middleware/apiKey');
const { publicRateLimiter } = require('../middleware/rateLimiter');
const { projectWriteLimiter, adminRateLimiter } = require('../middleware/projectRateLimiter');

// GET /api/theme/:projectId — PUBLIC (school apps fetch this via apiKey)
router.get('/:projectId', publicRateLimiter, apiKeyMiddleware, getTheme);

// GET /api/theme/:projectId/admin — JWT protected (for super admin editor)
router.get('/:projectId/admin', authMiddleware, adminRateLimiter, getThemeAsAdmin);

// GET /api/theme/:projectId/versions — JWT protected (version history)
router.get('/:projectId/versions', authMiddleware, adminRateLimiter, getThemeVersions);

// PUT /api/theme/:projectId — JWT protected + per-project write rate limit
router.put('/:projectId', authMiddleware, projectWriteLimiter, updateTheme);

// POST /api/theme/:projectId/rollback/:version — JWT protected (restore previous version)
router.post('/:projectId/rollback/:version', authMiddleware, projectWriteLimiter, rollbackTheme);

module.exports = router;
