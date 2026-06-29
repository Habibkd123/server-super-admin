// ─── src/routes/projects.js ───────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  regenerateApiKey,
} = require('../controllers/projectsController');
const { authMiddleware } = require('../middleware/auth');

// All project routes require JWT — no public access
router.use(authMiddleware);

router.post('/', createProject);
router.get('/', listProjects);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Regenerate API key for a project (new key shown once, old key invalidated)
router.post('/:id/regenerate-key', regenerateApiKey);

module.exports = router;
