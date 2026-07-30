const express = require('express');
const router = express.Router();
const controller = require('./WorkflowController');
const { authenticate } = require('../../shared/middleware/auth');

/**
 * Generic Workflow Engine Routes
 *
 * All routes require a valid JWT (issued by Docqube).
 * No role-based authorization is applied here — task ownership is enforced
 * by jBPM via the groups/kieGroups claims in the JWT payload.
 *
 * Base path (mounted in app.js): /api/v1/workflow
 */
router.use(authenticate);

// ── Start a new workflow process instance ─────────────────────────────────────
// Body: { workflowCode, businessRecordId, variables, tenantId? }
router.post('/instances', controller.startProcess);

// ── Get live workflow state for an instance ───────────────────────────────────
// Fetches from jBPM and syncs WorkflowInstance in PostgreSQL
router.get('/instances/:instanceId/state', controller.getState);

// ── Get active Human Tasks for an instance ────────────────────────────────────
router.get('/instances/:instanceId/tasks', controller.getActiveTasks);

// ── Complete a specific Human Task ───────────────────────────────────────────
// Body: { outputVariables: {} }
router.post('/instances/:instanceId/tasks/:taskId/complete', controller.completeTask);

module.exports = router;
