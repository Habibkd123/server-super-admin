// ─── src/routes/audit.js ──────────────────────────────────────────────────────
// Audit log query endpoint — JWT protected, Super Admin only
// Rule 23: Provide access to audit history for a project

const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { authMiddleware } = require('../middleware/auth');
const { adminRateLimiter } = require('../middleware/projectRateLimiter');

// GET /api/audit/:projectId — paginated audit log for a project
router.get('/:projectId', authMiddleware, adminRateLimiter, async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Pagination: ?page=1&limit=50
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    // Optional filter by action type: ?action=THEME_UPDATE
    const filter = { projectId };
    if (req.query.action) {
      filter.action = req.query.action;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      projectId,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      logs,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/audit — All audit logs across all projects (Super Admin dashboard)
router.get('/', authMiddleware, adminRateLimiter, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.projectId) filter.projectId = req.query.projectId;
    if (req.query.resource) filter.resource = req.query.resource;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      logs,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
