const Joi = require('joi');

const createContractRequestSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(1000).optional().allow(''),
  department: Joi.string().required(),
  vendor: Joi.string().required(),
  contract_type: Joi.string().required(),
  contract_value: Joi.number().min(0).optional(),
  contract_duration: Joi.number().integer().min(1).optional(),
  scope_of_work: Joi.string().required(),
});

const updateContractRequestSchema = Joi.object({
  title: Joi.string().min(3).max(255).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  department: Joi.string().optional(),
  vendor: Joi.string().optional(),
  contract_type: Joi.string().optional(),
  contract_value: Joi.number().min(0).optional(),
  contract_duration: Joi.number().integer().min(1).optional(),
  scope_of_work: Joi.string().optional(),
  status: Joi.string().valid('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'DEPT_HEAD_REVIEW', 'PROCUREMENT_REVIEW', 'LEGAL_REVIEW', 'SENT_BACK').optional(),
  assigned_to_group: Joi.string().optional().allow(null, ''),
  timeline: Joi.array().items(Joi.object({
    actor: Joi.string().required(),
    action: Joi.string().required(),
    date: Joi.string().required(),
    comment: Joi.string().allow('').optional(),
  })).optional(),
});

module.exports = { createContractRequestSchema, updateContractRequestSchema };
