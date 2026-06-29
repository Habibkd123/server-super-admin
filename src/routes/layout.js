// ─── src/routes/layout.js ─────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const {
  getLayout,
  getLayoutAsAdmin,
  updateLayout,
  getLayoutVersions,
  rollbackLayout,
} = require('../controllers/layoutController');
const { authMiddleware } = require('../middleware/auth');
const { apiKeyMiddleware } = require('../middleware/apiKey');
const { publicRateLimiter } = require('../middleware/rateLimiter');
const { projectWriteLimiter, adminRateLimiter } = require('../middleware/projectRateLimiter');

// GET /api/layout/:projectId — PUBLIC (school apps fetch layout config)
router.get('/:projectId', publicRateLimiter, apiKeyMiddleware, getLayout);

// GET /api/layout/:projectId/admin — JWT protected (for layout builder UI)
router.get('/:projectId/admin', authMiddleware, adminRateLimiter, getLayoutAsAdmin);

// GET /api/layout/:projectId/versions — JWT protected (version history)
router.get('/:projectId/versions', authMiddleware, adminRateLimiter, getLayoutVersions);

// PUT /api/layout/:projectId — JWT protected + per-project write rate limit
router.put('/:projectId', authMiddleware, projectWriteLimiter, updateLayout);

// POST /api/layout/:projectId/rollback/:version — JWT protected (restore previous version)
router.post('/:projectId/rollback/:version', authMiddleware, projectWriteLimiter, rollbackLayout);

module.exports = router;
