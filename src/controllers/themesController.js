// ─── src/controllers/themesController.js ─────────────────────────────────────
// Theme read (public + apiKey) and write (JWT protected) endpoints
// Rules 7, 8, 10, 23, 24, 32, 34: Schema validation, color validation, font allowlist,
// audit logging, version snapshots, and pre-update backup

const { z } = require('zod');
const Theme = require('../models/Theme');
const ThemeVersion = require('../models/ThemeVersion');
const { writeAuditLog } = require('../middleware/auditLogger');
const {
  isValidColor,
  validateFontFamily,
  ALLOWED_FONT_FAMILIES,
} = require('../utils/validators');

// ─── Color Validator (HEX + RGB + HSL) (Rule 8) ──────────────────────────────
const colorField = z
  .string()
  .refine((v) => isValidColor(v), {
    message: 'Must be a valid color (HEX #RRGGBB, RGB, or HSL format)',
  })
  .optional();

// ─── Theme Update Schema (Rule 7: Schema Integrity) ───────────────────────────
const updateThemeSchema = z.object({
  schoolId: z.string().optional(),
  school_id: z.string().optional(),
  primaryColor: colorField,
  secondaryColor: colorField,
  accentColor: colorField,
  backgroundColor: colorField,
  textColor: colorField,
  sidebarColor: colorField,
  navbarColor: colorField,
  buttonColor: colorField,
  logo: z.string().url('Logo must be a valid URL').optional().or(z.literal('')),
  favicon: z.string().url('Favicon must be a valid URL').optional().or(z.literal('')),
  footerLogo: z.string().url().optional().or(z.literal('')),
  loginBackground: z.string().url().optional().or(z.literal('')),
  dashboardBackground: z.string().url().optional().or(z.literal('')),
  loader: z.string().url().optional().or(z.literal('')),
  // Rule 10: Font family validated against approved list in controller
  fontFamily: z.string().max(100).optional(),
  headingFont: z.string().max(100).optional(),
  fontSize: z.string().max(20).optional(),
  borderRadius: z.string().max(20).optional(),
  shadows: z.enum(['none', 'sm', 'md', 'lg']).optional(),
  iconsStyle: z.enum(['lucide', 'heroicons', 'fontawesome', 'material']).optional(),
  darkMode: z.boolean().optional(),
  customCSS: z.string().max(50000).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Snapshot current theme before overwriting (Rules 24, 34)
const snapshotTheme = async (existingTheme, actorEmail) => {
  if (!existingTheme) return; // Nothing to snapshot if theme doesn't exist yet

  // Count existing versions to generate next version number
  const versionCount = await ThemeVersion.countDocuments({
    projectId: existingTheme.projectId,
  });

  await ThemeVersion.create({
    projectId: existingTheme.projectId,
    version: versionCount + 1,
    savedBy: actorEmail || 'system',
    snapshot: existingTheme.toObject(),
  });

  // Rule 34: Keep only the last 20 versions per project (rolling backup)
  const versions = await ThemeVersion.find({ projectId: existingTheme.projectId })
    .sort({ version: -1 })
    .select('_id');

  if (versions.length > 20) {
    const toDelete = versions.slice(20).map((v) => v._id);
    await ThemeVersion.deleteMany({ _id: { $in: toDelete } });
  }
};

// ─── GET /api/theme/:projectId — PUBLIC (requires x-api-key) ─────────────────
const getTheme = async (req, res, next) => {
  try {
    const { projectId } = req.project; // set by apiKeyMiddleware

    // Rule 3: Query ONLY by the verified projectId — never allow cross-project access
    const theme = await Theme.findOne({ projectId });

    if (!theme) {
      return res.status(200).json({
        success: true,
        projectId,
        theme: getDefaultTheme(),
      });
    }

    return res.status(200).json({
      success: true,
      projectId,
      theme: serializeTheme(theme),
    });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/theme/:projectId — JWT PROTECTED ────────────────────────────────
const updateTheme = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Rule 7: Zod schema validation
    const result = updateThemeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        success: false,
        message: result.error.errors
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join('. '),
      });
    }

    const data = result.data;

    // Rule 10: Font family allowlist validation
    if (data.fontFamily) {
      const fontError = validateFontFamily(data.fontFamily);
      if (fontError) {
        return res.status(422).json({
          success: false,
          message: fontError,
          allowedFonts: [...ALLOWED_FONT_FAMILIES],
        });
      }
    }
    if (data.headingFont) {
      const headingFontError = validateFontFamily(data.headingFont);
      if (headingFontError) {
        return res.status(422).json({
          success: false,
          message: `headingFont: ${headingFontError}`,
          allowedFonts: [...ALLOWED_FONT_FAMILIES],
        });
      }
    }

    // Rules 24, 34: Snapshot existing theme BEFORE overwriting
    const existingTheme = await Theme.findOne({ projectId });
    await snapshotTheme(existingTheme, req.admin?.email);

    // Upsert — create theme doc if it doesn't exist, update if it does
    const effectiveSchoolId = data.schoolId || data.school_id || existingTheme?.schoolId || '';
    const theme = await Theme.findOneAndUpdate(
      { projectId },
      { $set: { ...data, projectId, schoolId: effectiveSchoolId } },
      { new: true, upsert: true, runValidators: true }
    );

    // Rule 23: Write immutable audit log entry
    await writeAuditLog(
      {
        actorId: req.admin.id,
        actorEmail: req.admin.email,
        projectId,
        action: 'THEME_UPDATE',
        resource: 'theme',
        summary: `Theme updated for project "${projectId}". Fields changed: ${Object.keys(data).join(', ')}`,
      },
      req
    );

    console.log(`[Themes] Updated theme for project: ${projectId} by admin: ${req.admin.email}`);

    return res.status(200).json({
      success: true,
      message: `Theme for "${projectId}" updated successfully.`,
      data: {
        projectId: theme.projectId,
        schoolId: theme.schoolId || effectiveSchoolId,
        school_id: theme.schoolId || effectiveSchoolId,
        theme: serializeTheme(theme),
        updatedAt: theme.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/theme/:projectId/admin — JWT PROTECTED (for editor UI) ─────────
const getThemeAsAdmin = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Rule 3: Strictly scoped to requested projectId
    const theme = await Theme.findOne({ projectId });

    if (!theme) {
      return res.status(200).json({
        success: true,
        data: { projectId, ...getDefaultTheme() },
      });
    }

    return res.status(200).json({ success: true, data: theme });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/theme/:projectId/versions — JWT PROTECTED ───────────────────────
// Rule 24: View version history for rollback
const getThemeVersions = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const versions = await ThemeVersion.find({ projectId })
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

// ─── POST /api/theme/:projectId/rollback/:version — JWT PROTECTED ─────────────
// Rule 24: Restore a specific theme version
const rollbackTheme = async (req, res, next) => {
  try {
    const { projectId, version } = req.params;
    const versionNum = parseInt(version, 10);

    if (isNaN(versionNum) || versionNum < 1) {
      return res.status(400).json({ success: false, message: 'Invalid version number.' });
    }

    const versionDoc = await ThemeVersion.findOne({ projectId, version: versionNum });
    if (!versionDoc) {
      return res.status(404).json({
        success: false,
        message: `Version ${versionNum} not found for project "${projectId}".`,
      });
    }

    // Snapshot current state before rollback (so the rollback itself is reversible)
    const currentTheme = await Theme.findOne({ projectId });
    await snapshotTheme(currentTheme, req.admin?.email);

    // Restore the snapshot — exclude Mongoose metadata fields
    const { _id, __v, projectId: _pid, ...restoredData } = versionDoc.snapshot;

    const theme = await Theme.findOneAndUpdate(
      { projectId },
      { $set: { ...restoredData, projectId } },
      { new: true, upsert: true, runValidators: true }
    );

    // Rule 23: Audit log the rollback
    await writeAuditLog(
      {
        actorId: req.admin.id,
        actorEmail: req.admin.email,
        projectId,
        action: 'THEME_ROLLBACK',
        resource: 'theme',
        summary: `Theme rolled back to version ${versionNum} for project "${projectId}"`,
      },
      req
    );

    console.log(`[Themes] Rolled back to v${versionNum} for project: ${projectId} by: ${req.admin.email}`);

    return res.status(200).json({
      success: true,
      message: `Theme restored to version ${versionNum}.`,
      data: { projectId, theme: serializeTheme(theme) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Serializers / Helpers ────────────────────────────────────────────────────

function serializeTheme(theme) {
  return {
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    accentColor: theme.accentColor,
    backgroundColor: theme.backgroundColor,
    textColor: theme.textColor,
    sidebarColor: theme.sidebarColor,
    navbarColor: theme.navbarColor,
    buttonColor: theme.buttonColor,
    logo: theme.logo,
    favicon: theme.favicon,
    footerLogo: theme.footerLogo,
    loginBackground: theme.loginBackground,
    dashboardBackground: theme.dashboardBackground,
    loader: theme.loader,
    fontFamily: theme.fontFamily,
    headingFont: theme.headingFont,
    fontSize: theme.fontSize,
    borderRadius: theme.borderRadius,
    shadows: theme.shadows,
    iconsStyle: theme.iconsStyle,
    darkMode: theme.darkMode,
    customCSS: theme.customCSS,
  };
}

function getDefaultTheme() {
  return {
    primaryColor: '#e63946',
    secondaryColor: '#457b9d',
    accentColor: '#f1faee',
    backgroundColor: '#ffffff',
    textColor: '#1d3557',
    sidebarColor: '#1d3557',
    navbarColor: '#e63946',
    buttonColor: '#e63946',
    logo: '',
    favicon: '',
    footerLogo: '',
    loginBackground: '',
    dashboardBackground: '',
    loader: '',
    fontFamily: 'Inter, sans-serif',
    headingFont: 'Poppins, sans-serif',
    fontSize: '14px',
    borderRadius: '8px',
    shadows: 'md',
    iconsStyle: 'lucide',
    darkMode: false,
    customCSS: '',
  };
}

module.exports = {
  getTheme,
  updateTheme,
  getThemeAsAdmin,
  getThemeVersions,
  rollbackTheme,
};
