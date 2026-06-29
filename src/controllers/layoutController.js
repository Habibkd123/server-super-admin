// ─── src/controllers/layoutController.js ──────────────────────────────────────
// Controller for Layout, Homepage Builder, and Page List endpoints
// Rules 11–19, 23, 24, 34: Layout validation, versioning, audit logging, and snapshots

const { z } = require('zod');
const LayoutConfig = require('../models/LayoutConfig');
const LayoutVersion = require('../models/LayoutVersion');
const { writeAuditLog } = require('../middleware/auditLogger');
const {
  validateSectionIds,
  validateOrderUniqueness,
} = require('../utils/validators');

// ─── Input Validation Schemas (Rules 11–16) ───────────────────────────────────

const pageValidator = z.object({
  id: z.string().min(1),
  label: z.string().min(1, 'Page label cannot be empty').max(100),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  isCustom: z.boolean().default(false),
  slug: z.string().optional(),
  content: z.string().optional().or(z.literal('')),
  sections: z.array(z.lazy(() => sectionValidator)).optional(),
});

const sectionValidator = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(100),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  title: z.string().max(200).optional().or(z.literal('')),
  subtitle: z.string().max(300).optional().or(z.literal('')),
  backgroundImage: z.string().optional().or(z.literal('')),
  videoUrl: z.string().optional().or(z.literal('')),
  animationType: z.enum(['fade', 'slide', 'zoom', 'fade-up', 'none']).default('fade-up'),
  type: z.string().optional(),
  variation: z.string().optional(),
  design: z.any().optional(),
});

const updateLayoutSchema = z.object({
  layoutType: z
    .enum(['modern', 'classic', 'corporate', 'education', 'premium', 'minimal', 'creative'])
    .optional(),
  navigation: z
    .object({
      navLogo: z.string().optional().or(z.literal('')),
      headerStyle: z.string().optional(),
      megaMenu: z.boolean().optional(),
      stickyHeader: z.boolean().optional(),
      transparentHeader: z.boolean().optional(),
      topBar: z
        .object({
          show: z.boolean(),
          phone: z.string().max(20).optional().or(z.literal('')),
          email: z.string().email().optional().or(z.literal('')),
        })
        .optional(),
      admissionButton: z
        .object({
          show: z.boolean(),
          text: z.string().max(50),
          link: z.string().optional().or(z.literal('')),
        })
        .optional(),
      loginButton: z
        .object({
          show: z.boolean(),
          text: z.string().max(50),
          link: z.string().optional().or(z.literal('')),
        })
        .optional(),
      socialIcons: z
        .object({
          facebook: z.string().url().optional().or(z.literal('')),
          twitter: z.string().url().optional().or(z.literal('')),
          instagram: z.string().url().optional().or(z.literal('')),
          youtube: z.string().url().optional().or(z.literal('')),
        })
        .optional(),
    })
    .optional(),
  footer: z
    .object({
      layoutType: z.string().optional(),
      copyrightText: z.string().max(200).optional(),
      showNewsletter: z.boolean().optional(),
      showMap: z.boolean().optional(),
    })
    .optional(),
  pages: z.array(pageValidator).optional(),
  homepageSections: z.array(sectionValidator).optional(),
  widgets: z
    .object({
      noticeBoard: z
        .object({ show: z.boolean(), title: z.string().max(100) })
        .optional(),
      eventCalendar: z
        .object({ show: z.boolean(), title: z.string().max(100) })
        .optional(),
      downloads: z
        .object({ show: z.boolean(), title: z.string().max(100) })
        .optional(),
      faq: z
        .object({ show: z.boolean(), title: z.string().max(100) })
        .optional(),
    })
    .optional(),
});

// ─── Snapshot Helpers (Rules 19, 24, 34) ─────────────────────────────────────

const snapshotLayout = async (existingLayout, actorEmail) => {
  if (!existingLayout) return;

  const versionCount = await LayoutVersion.countDocuments({
    projectId: existingLayout.projectId,
  });

  await LayoutVersion.create({
    projectId: existingLayout.projectId,
    version: versionCount + 1,
    savedBy: actorEmail || 'system',
    snapshot: existingLayout.toObject(),
  });

  // Keep only last 20 versions (rolling backup — Rule 34)
  const versions = await LayoutVersion.find({ projectId: existingLayout.projectId })
    .sort({ version: -1 })
    .select('_id');

  if (versions.length > 20) {
    const toDelete = versions.slice(20).map((v) => v._id);
    await LayoutVersion.deleteMany({ _id: { $in: toDelete } });
  }
};

// ─── GET /api/layout/:projectId — PUBLIC (via apiKeyMiddleware) ──────────────

const getLayout = async (req, res, next) => {
  try {
    const { projectId } = req.project; // set by apiKeyMiddleware — Rule 3

    let layout = await LayoutConfig.findOne({ projectId });
    if (!layout) {
      layout = await LayoutConfig.create({ projectId });
    }

    return res.status(200).json({
      success: true,
      projectId,
      layoutConfig: layout,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/layout/:projectId/admin — JWT PROTECTED (for builder UI) ───────

const getLayoutAsAdmin = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    let layout = await LayoutConfig.findOne({ projectId });
    if (!layout) {
      layout = await LayoutConfig.create({ projectId });
    }

    return res.status(200).json({
      success: true,
      data: layout,
    });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/layout/:projectId — JWT PROTECTED (Super Admin update) ─────────

const updateLayout = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Rule 11: Zod schema validation
    const result = updateLayoutSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        success: false,
        message: result.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('. '),
      });
    }

    const data = result.data;

    // Rule 12: Section ID allowlist validation
    if (data.homepageSections) {
      const sectionError = validateSectionIds(data.homepageSections);
      if (sectionError) {
        return res.status(422).json({ success: false, message: sectionError });
      }

      // Rule 16: Duplicate order validation for homepage sections
      const orderError = validateOrderUniqueness(data.homepageSections, 'homepage sections');
      if (orderError) {
        return res.status(422).json({ success: false, message: orderError });
      }
    }

    // Rule 16: Duplicate order validation for pages
    if (data.pages) {
      const pageOrderError = validateOrderUniqueness(data.pages, 'pages');
      if (pageOrderError) {
        return res.status(422).json({ success: false, message: pageOrderError });
      }
    }

    // Rules 19, 24, 34: Snapshot existing layout BEFORE overwriting
    const existingLayout = await LayoutConfig.findOne({ projectId });
    await snapshotLayout(existingLayout, req.admin?.email);

    // Rule 19: Increment layout version counter on every update
    const nextVersion = (existingLayout?.layoutVersion || 0) + 1;

    // Upsert layout configuration
    const layout = await LayoutConfig.findOneAndUpdate(
      { projectId },
      { $set: { ...data, projectId, layoutVersion: nextVersion } },
      { new: true, upsert: true, runValidators: true }
    );

    // Rule 23: Write immutable audit log entry
    await writeAuditLog(
      {
        actorId: req.admin.id,
        actorEmail: req.admin.email,
        projectId,
        action: 'LAYOUT_UPDATE',
        resource: 'layout',
        summary: `Layout updated for project "${projectId}" → version ${nextVersion}. Fields: ${Object.keys(data).join(', ')}`,
      },
      req
    );

    console.log(`[Layout] Updated layout for project: ${projectId} → v${nextVersion} by: ${req.admin.email}`);

    return res.status(200).json({
      success: true,
      message: `Layout for "${projectId}" updated successfully.`,
      data: layout,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/layout/:projectId/versions — JWT PROTECTED (Rule 19/24) ────────

const getLayoutVersions = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const versions = await LayoutVersion.find({ projectId })
      .sort({ version: -1 })
      .select('version savedBy snapshotAt')
      .limit(20);

    return res.status(200).json({
      success: true,
      projectId,
      versions,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/layout/:projectId/rollback/:version — JWT PROTECTED ───────────
// Rule 19: Rollback layout to a previous version

const rollbackLayout = async (req, res, next) => {
  try {
    const { projectId, version } = req.params;
    const versionNum = parseInt(version, 10);

    if (isNaN(versionNum) || versionNum < 1) {
      return res.status(400).json({ success: false, message: 'Invalid version number.' });
    }

    const versionDoc = await LayoutVersion.findOne({ projectId, version: versionNum });
    if (!versionDoc) {
      return res.status(404).json({
        success: false,
        message: `Layout version ${versionNum} not found for project "${projectId}".`,
      });
    }

    // Snapshot current layout before rollback (makes rollback itself reversible)
    const currentLayout = await LayoutConfig.findOne({ projectId });
    await snapshotLayout(currentLayout, req.admin?.email);

    const { _id, __v, projectId: _pid, layoutVersion: _v, ...restoredData } = versionDoc.snapshot;
    const nextVersion = (currentLayout?.layoutVersion || 0) + 1;

    const layout = await LayoutConfig.findOneAndUpdate(
      { projectId },
      { $set: { ...restoredData, projectId, layoutVersion: nextVersion } },
      { new: true, upsert: true, runValidators: true }
    );

    // Rule 23: Audit log the rollback
    await writeAuditLog(
      {
        actorId: req.admin.id,
        actorEmail: req.admin.email,
        projectId,
        action: 'LAYOUT_ROLLBACK',
        resource: 'layout',
        summary: `Layout rolled back to version ${versionNum} for project "${projectId}"`,
      },
      req
    );

    console.log(`[Layout] Rolled back to v${versionNum} for project: ${projectId} by: ${req.admin.email}`);

    return res.status(200).json({
      success: true,
      message: `Layout restored to version ${versionNum}.`,
      data: layout,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLayout,
  getLayoutAsAdmin,
  updateLayout,
  getLayoutVersions,
  rollbackLayout,
};
