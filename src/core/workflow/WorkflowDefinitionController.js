const WorkflowDefinition = require('./models/WorkflowDefinition');
const ApiResponse = require('../../shared/responses/ApiResponse');

/**
 * WorkflowDefinitionController
 *
 * Manages WorkflowDefinition records — the configuration registry
 * that maps workflow codes to jBPM containers/processes and stores
 * per-task output variable schemas (task_schemas).
 *
 * Docqube uses these endpoints to:
 *   - Register a new workflow definition when a tenant purchases a workflow.
 *   - Update task_schemas when the BPMN is updated with new variable names.
 *   - List available workflows for a tenant.
 */
class WorkflowDefinitionController {

  /**
   * GET /api/v1/workflow/definitions
   *
   * List all workflow definitions. Optionally filter by tenantId.
   * Query params: ?tenantId=<id>&code=<code>
   */
  async list(req, res, next) {
    try {
      const where = { status: 'ACTIVE' };

      if (req.query.tenantId) where.customer_id = req.query.tenantId;
      if (req.query.code) where.code = req.query.code;

      const definitions = await WorkflowDefinition.findAll({ where });
      return ApiResponse.success(res, definitions, 'Workflow definitions retrieved.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/workflow/definitions/:id
   *
   * Get a single workflow definition by ID.
   */
  async getOne(req, res, next) {
    try {
      const definition = await WorkflowDefinition.findByPk(req.params.id);
      if (!definition) {
        return res.status(404).json({ status: 'error', message: 'Workflow definition not found.' });
      }
      return ApiResponse.success(res, definition, 'Workflow definition retrieved.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/workflow/definitions
   *
   * Register a new workflow definition for a tenant.
   *
   * Body: {
   *   code:        string  — unique identifier e.g. "CONTRACT_REQUEST"
   *   name:        string  — human readable name
   *   container_id: string — jBPM container ID
   *   process_id:  string  — jBPM process definition ID
   *   version:     string? — e.g. "1.0.0"
   *   tenantId:    string? — customer/tenant ID (omit for global default)
   *   description: string?
   *   task_schemas: object — per-task output variable schemas
   *
   *   task_schemas example:
   *   {
   *     "Department Head Approval": {
   *       "deptHeadApproved": { "type": "boolean", "label": "Approve?", "required": true }
   *     },
   *     "Procurement Review": {
   *       "procurementApproved": { "type": "boolean", "label": "Approve?",  "required": true },
   *       "legalRequired":       { "type": "boolean", "label": "Route to Legal?", "required": false }
   *     }
   *   }
   * }
   */
  async create(req, res, next) {
    try {
      const {
        code, name, container_id, process_id,
        version, tenantId, description, task_schemas = {},
      } = req.body;

      if (!code || !name || !container_id || !process_id) {
        return res.status(400).json({
          status: 'error',
          message: 'code, name, container_id, and process_id are required.',
        });
      }

      const definition = await WorkflowDefinition.create({
        code,
        name,
        container_id,
        process_id,
        version,
        customer_id: tenantId || req.user?.tenantId || null,
        description,
        task_schemas,
        createdBy: req.user?.id,
      });

      return ApiResponse.success(res, definition, 'Workflow definition registered.', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/workflow/definitions/:id/task-schemas
   *
   * Update the task_schemas for a workflow definition.
   * Use this when the BPMN is updated and variable names change —
   * without modifying any backend code.
   *
   * Body: {
   *   task_schemas: { "<TaskName>": { "<varName>": { type, label, required } } }
   * }
   */
  async updateTaskSchemas(req, res, next) {
    try {
      const definition = await WorkflowDefinition.findByPk(req.params.id);
      if (!definition) {
        return res.status(404).json({ status: 'error', message: 'Workflow definition not found.' });
      }

      const { task_schemas } = req.body;
      if (!task_schemas || typeof task_schemas !== 'object') {
        return res.status(400).json({ status: 'error', message: 'task_schemas must be an object.' });
      }

      await definition.update({ task_schemas, updatedBy: req.user?.id });
      return ApiResponse.success(res, definition, 'Task schemas updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/workflow/definitions/:id
   *
   * Soft-delete (deactivate) a workflow definition.
   */
  async deactivate(req, res, next) {
    try {
      const definition = await WorkflowDefinition.findByPk(req.params.id);
      if (!definition) {
        return res.status(404).json({ status: 'error', message: 'Workflow definition not found.' });
      }
      await definition.update({ status: 'INACTIVE', updatedBy: req.user?.id });
      return ApiResponse.success(res, null, 'Workflow definition deactivated.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WorkflowDefinitionController();
