const express = require('express');
const router = express.Router();
const controller = require('./ContractRequestController');
const { authenticate, authorize } = require('../../../shared/middleware/auth');
const validate = require('../../../shared/middleware/validate');
const {
  createContractRequestSchema,
  updateContractRequestSchema,
  decisionSchema,
} = require('./contractRequestValidator');

// All routes require authentication
router.use(authenticate);

// ── Standard CRUD ────────────────────────────────────────────────────────────
router.get('/',    controller.getAll);
router.get('/:id', controller.getById);

router.post(
  '/',
  authorize('BUSINESS_USER', 'SUPER_ADMIN'),
  validate(createContractRequestSchema),
  controller.createRequest
);

router.put(
  '/:id',
  validate(updateContractRequestSchema),
  controller.updateRequest
);

router.delete('/:id', controller.deleteRequest);

// ── Workflow Decision ─────────────────────────────────────────────────────────
// Only reviewer roles may call this endpoint.
// SUPER_ADMIN is intentionally excluded — admins should not bypass the workflow.
router.post(
  '/:id/decision',
  authorize('DEPARTMENT_HEAD', 'PROCUREMENT', 'LEGAL'),
  validate(decisionSchema),
  controller.processDecision
);

module.exports = router;
