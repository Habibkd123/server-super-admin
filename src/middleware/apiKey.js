// ─── src/middleware/apiKey.js ─────────────────────────────────────────────────
// ApiKey validation middleware for public GET /api/theme/:projectId
// Rule 4:  API Key strictly scoped to its own project
// Rule 21: Reject suspended/inactive/deleted projects
// Rule 22: Optional domain header validation when allowedDomains is set

const bcrypt = require('bcryptjs');
const Project = require('../models/Project');

const apiKeyMiddleware = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Step 1: Extract raw API key from header
    const incomingKey = req.headers['x-api-key'];
    if (!incomingKey) {
      return res.status(401).json({
        success: false,
        message: 'Missing x-api-key header.',
      });
    }

    // Step 2: Look up project by projectId slug (not _id)
    // Must explicitly select apiKey (excluded from default queries via select:false)
    const project = await Project.findOne({ projectId }).select('+apiKey');
    if (!project) {
      // Rule 31: Do not reveal whether project exists or not — uniform message
      return res.status(401).json({
        success: false,
        message: 'Invalid API Key or project.',
      });
    }

    // Step 3: Rule 21 — Status checks BEFORE expensive bcrypt operation
    if (project.status === 'deleted') {
      return res.status(401).json({
        success: false,
        message: 'Invalid API Key or project.',
      });
    }
    if (project.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Project access is disabled. Contact the Super Admin.',
      });
    }
    if (project.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Project is temporarily suspended. Contact the Super Admin.',
      });
    }

    // Step 4: Rule 4 — Timing-safe bcrypt compare
    // This ensures API Key from Project A cannot authenticate for Project B
    const isValid = await bcrypt.compare(incomingKey, project.apiKey);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API Key or project.',
      });
    }

    // Step 5: Rule 22 — Optional domain validation
    // If project has registered allowedDomains, validate the requesting domain
    if (project.allowedDomains && project.allowedDomains.length > 0) {
      // For server-side calls (Next.js → Express), check x-forwarded-host or host header
      const requestDomain =
        req.headers['x-project-domain'] ||
        req.headers['x-forwarded-host'] ||
        req.headers['host'] ||
        '';

      const normalised = requestDomain.toLowerCase().replace(/:\d+$/, ''); // strip port
      const isAllowed = project.allowedDomains.some((d) =>
        normalised === d.toLowerCase().replace(/:\d+$/, '')
      );

      // Also allow Origin header if present (browser-side calls)
      const origin = req.headers['origin'] || '';
      const originDomain = origin.replace(/^https?:\/\//, '').replace(/:\d+$/, '').toLowerCase();
      const originAllowed =
        !origin || project.allowedDomains.some((d) => originDomain === d.toLowerCase().replace(/^https?:\/\//, '').replace(/:\d+$/, ''));

      if (!isAllowed && !originAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Request origin is not registered for this project.',
        });
      }
    }

    // Attach verified project context (never expose apiKey hash)
    req.project = {
      projectId: project.projectId,
      projectName: project.projectName,
      domain: project.domain,
      status: project.status,
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { apiKeyMiddleware };
