// ─── src/models/ThemeVersion.js ───────────────────────────────────────────────
// Stores a point-in-time snapshot of a Theme document before every overwrite
// Rules 24, 34: Version history + backup before applying updates

const mongoose = require('mongoose');

const themeVersionSchema = new mongoose.Schema(
  {
    // Which project this version belongs to
    projectId: {
      type: String,
      required: true,
      index: true,
    },

    // Sequential version number (incremented per project)
    version: {
      type: Number,
      required: true,
    },

    // Actor who triggered the change that made us snapshot this
    savedBy: { type: String, default: '' },

    // Full snapshot of the theme at this point in time
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'snapshotAt', updatedAt: false },
  }
);

// Compound index: efficient lookup of all versions for a project, ordered newest-first
themeVersionSchema.index({ projectId: 1, version: -1 });

// Keep only the last 20 versions per project — TTL based on count is handled in controller
module.exports = mongoose.model('ThemeVersion', themeVersionSchema);
