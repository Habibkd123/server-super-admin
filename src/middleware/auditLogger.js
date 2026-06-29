// ─── src/middleware/auditLogger.js ────────────────────────────────────────────
// Middleware factory for writing audit log entries after a successful response
// Rule 23: Log every CUD action with actorId, projectId, action, IP, userAgent, timestamp

const AuditLog = require('../models/AuditLog');

/**
 * Creates an async audit log entry. Fire-and-forget — never blocks the response.
 * @param {object} params
 * @param {string} params.actorId   - Admin ID (from req.admin.id)
 * @param {string} params.actorEmail
 * @param {string} params.projectId
 * @param {string} params.action    - Must match AuditLog enum
 * @param {string} params.resource  - 'project' | 'theme' | 'layout'
 * @param {string} params.summary   - Human-readable summary, NO raw DB data
 * @param {object} req              - Express request for IP + userAgent
 */
const writeAuditLog = async ({ actorId, actorEmail, projectId, action, resource, summary }, req) => {
  try {
    await AuditLog.create({
      actorId: String(actorId),
      actorEmail: actorEmail || '',
      projectId: String(projectId),
      action,
      resource,
      summary: summary || '',
      ipAddress: req?.ip || req?.connection?.remoteAddress || '',
      userAgent: req?.headers?.['user-agent'] || '',
    });
  } catch (err) {
    // NEVER let audit log failure block the main response
    // Log server-side only — do not surface to client
    console.error('[AuditLog] Failed to write audit entry:', err.message);
  }
};

module.exports = { writeAuditLog };
