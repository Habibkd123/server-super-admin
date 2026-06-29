// ─── src/models/LayoutVersion.js ──────────────────────────────────────────────
// Stores a point-in-time snapshot of a LayoutConfig document before every overwrite
// Rules 19, 24, 34: Layout versioning + backup before applying updates

const mongoose = require('mongoose');

const layoutVersionSchema = new mongoose.Schema(
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

    // Actor who triggered the change that created this snapshot
    savedBy: { type: String, default: '' },

    // Full snapshot of the layout config at this point in time
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'snapshotAt', updatedAt: false },
  }
);

// Compound index: efficient lookup of versions for a project, newest-first
layoutVersionSchema.index({ projectId: 1, version: -1 });

module.exports = mongoose.model('LayoutVersion', layoutVersionSchema);
