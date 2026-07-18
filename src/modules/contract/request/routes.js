const express = require('express');
const router = express.Router();
const controller = require('./ContractRequestController');
const { authenticate } = require('../../../shared/middleware/auth');
const validate = require('../../../shared/middleware/validate');
const { createContractRequestSchema, updateContractRequestSchema } = require('./contractRequestValidator');

// All routes require authentication
router.use(authenticate);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', validate(createContractRequestSchema), controller.createRequest);
router.put('/:id', validate(updateContractRequestSchema), controller.updateRequest);
router.delete('/:id', controller.deleteRequest);

module.exports = router;
