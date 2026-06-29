// ─── src/controllers/projectsController.js ───────────────────────────────────
// Full CRUD for school ERP projects
// Rules 5, 6, 21, 23, 31: Hashed secrets, RBAC, status checks, audit logging

const bcrypt = require('bcryptjs');
const { z } = require('zod');
const Project = require('../models/Project');
const Theme = require('../models/Theme');
const LayoutConfig = require('../models/LayoutConfig');
const { writeAuditLog } = require('../middleware/auditLogger');
const { generateApiKey } = require('../utils/generateApiKey');

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createProjectSchema = z.object({
  projectId: z
    .string()
    .min(3, 'projectId must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9_-]+$/, 'projectId must be lowercase letters, numbers, underscores, or dashes'),
  projectName: z.string().min(2, 'Project name is required').max(100),
  domain: z.string().optional().or(z.literal('')),
  allowedDomains: z.array(z.string()).optional(),
});

const updateProjectSchema = z.object({
  projectName: z.string().min(2).max(100).optional(),
  domain: z.string().optional().or(z.literal('')),
  allowedDomains: z.array(z.string()).optional(),
  // Rule 21: Status can be active, inactive, or suspended
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

// POST /api/projects — Create new project + generate apiKey
const createProject = async (req, res, next) => {
  try {
    const result = createProjectSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.errors.map((e) => e.message).join('. '),
      });
    }

    const { projectId, projectName, domain, allowedDomains } = result.data;

    // Check for duplicate projectId
    const existing = await Project.findOne({ projectId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `projectId "${projectId}" is already taken. Choose a different slug.`,
      });
    }

    // Rule 5: Generate plain apiKey — will be shown to admin ONCE
    const plainApiKey = generateApiKey();

    // Rule 5: Hash the apiKey — only the hash goes to DB
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedApiKey = await bcrypt.hash(plainApiKey, rounds);

    // Create project with hashed key
    const project = await Project.create({
      projectId,
      projectName,
      apiKey: hashedApiKey,
      domain: domain || '',
      allowedDomains: allowedDomains || [],
      createdBy: req.admin.id,
    });

    // Create default theme + default layout for this project
    await Theme.create({ projectId });
    await LayoutConfig.create({ projectId });

    // Rule 23: Audit log project creation
    await writeAuditLog(
      {
        actorId: req.admin.id,
        actorEmail: req.admin.email,
        projectId,
        action: 'PROJECT_CREATE',
        resource: 'project',
        summary: `Project "${projectName}" (${projectId}) created`,
      },
      req
    );

    console.log(`[Projects] Created project: ${projectId} by admin: ${req.admin.email}`);

    // Rule 5: Return plain apiKey here — this is the ONLY time it is ever shown
    return res.status(201).json({
      success: true,
      message: `Project "${projectName}" created successfully. Save the API Key — it will NOT be shown again.`,
      data: {
        project: project.toJSON(), // apiKey hash stripped by toJSON()
        apiKey: plainApiKey,       // ← PLAIN KEY — shown only once
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/projects — List all non-deleted projects
const listProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ status: { $ne: 'deleted' } })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    return res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/projects/:id — Single project by MongoDB _id
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      status: { $ne: 'deleted' },
    }).populate('createdBy', 'name email');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    return res.status(200).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

// PUT /api/projects/:id — Update project name, domain, or status
const updateProject = async (req, res, next) => {
  try {
    const result = updateProjectSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.errors.map((e) => e.message).join('. '),
      });
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: 'deleted' } },
      { $set: result.data },
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Rule 23: Audit log
    const action = result.data.status === 'suspended'
      ? 'PROJECT_SUSPEND'
      : 'PROJECT_UPDATE';

    await writeAuditLog(
      {
        actorId: req.admin.id,
        actorEmail: req.admin.email,
        projectId: project.projectId,
        action,
        resource: 'project',
        summary: `Project "${project.projectName}" updated. Fields: ${Object.keys(result.data).join(', ')}`,
      },
      req
    );

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      data: project,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/projects/:id — Soft delete (status = 'deleted')
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: 'deleted' } },
      { $set: { status: 'deleted' } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Rule 23: Audit log soft delete
    await writeAuditLog(
      {
        actorId: req.admin.id,
        actorEmail: req.admin.email,
        projectId: project.projectId,
        action: 'PROJECT_DELETE',
        resource: 'project',
        summary: `Project "${project.projectName}" (${project.projectId}) soft deleted`,
      },
      req
    );

    console.log(`[Projects] Soft deleted: ${project.projectId} by: ${req.admin.email}`);

    return res.status(200).json({
      success: true,
      message: `Project "${project.projectName}" has been deleted.`,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/projects/:id/regenerate-key — Regenerate API key for a project
const regenerateApiKey = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      status: { $ne: 'deleted' },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Rule 5: Generate and hash new API key
    const plainApiKey = generateApiKey();
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedApiKey = await bcrypt.hash(plainApiKey, rounds);

    project.apiKey = hashedApiKey;
    await project.save();

    // Rule 23: Audit log key regeneration
    await writeAuditLog(
      {
        actorId: req.admin.id,
        actorEmail: req.admin.email,
        projectId: project.projectId,
        action: 'API_KEY_REGENERATE',
        resource: 'project',
        summary: `API key regenerated for project "${project.projectName}" (${project.projectId})`,
      },
      req
    );

    console.log(`[Projects] API key regenerated for: ${project.projectId} by: ${req.admin.email}`);

    return res.status(200).json({
      success: true,
      message: 'API Key regenerated. Update it in your school application immediately.',
      data: {
        projectId: project.projectId,
        apiKey: plainApiKey, // ← shown only once
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  regenerateApiKey,
};
