// ─── src/models/AuditLog.js ───────────────────────────────────────────────────
// Immutable audit trail for all Create/Update/Delete/Publish actions
// Rule 23: Log every action with actor, projectId, action, timestamp, IP, userAgent

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // Who performed the action (Super Admin ID or 'system')
    actorId: { type: String, required: true },
    actorEmail: { type: String, default: '' },

    // Which project was affected
    projectId: { type: String, required: true, index: true },

    // What happened
    action: {
      type: String,
      required: true,
      enum: [
        'PROJECT_CREATE',
        'PROJECT_UPDATE',
        'PROJECT_DELETE',
        'PROJECT_RESTORE',
        'PROJECT_SUSPEND',
        'API_KEY_REGENERATE',
        'THEME_UPDATE',
        'THEME_ROLLBACK',
        'LAYOUT_UPDATE',
        'LAYOUT_ROLLBACK',
        'LAYOUT_PUBLISH',
      ],
      index: true,
    },

    // Which resource type was affected
    resource: {
      type: String,
      enum: ['project', 'theme', 'layout'],
      required: true,
    },

    // Short human-readable summary of what changed (never raw data)
    summary: { type: String, default: '' },

    // Request metadata for security forensics
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  {
    // createdAt only — audit logs are immutable, never updated
    timestamps: { createdAt: 'timestamp', updatedAt: false },
  }
);

// Prevent any update operations on audit logs — immutable by design
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are immutable and cannot be modified.'));
  }
  next();
});

// TTL index: auto-expire old audit logs after 2 years (optional, comment out to keep forever)
// auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
