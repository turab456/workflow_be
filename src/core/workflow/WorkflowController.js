const workflowProcessService = require('./services/WorkflowProcessService');
const workflowTaskService = require('./services/WorkflowTaskService');
const ApiResponse = require('../../shared/responses/ApiResponse');

/**
 * WorkflowController
 *
 * Generic, business-agnostic HTTP surface for the Docqube workflow engine.
 * All business domain context (tenant, record ID, BPMN variables) is provided
 * by the caller. This controller delegates entirely to the core workflow
 * services and returns the normalized workflow state.
 *
 * JWT payload from Docqube should include:
 *   { id, tenantId, groups, kieGroups, kieUserId? }
 *
 * Routes (mounted at /api/v1/workflow):
 *   POST   /instances                                  → startProcess
 *   GET    /instances/:instanceId/state                → getState
 *   GET    /instances/:instanceId/tasks                → getActiveTasks
 *   POST   /instances/:instanceId/tasks/:taskId/complete → completeTask
 */
class WorkflowController {
  /**
   * POST /api/v1/workflow/instances
   *
   * Start a new workflow process instance.
   *
   * Body: {
   *   workflowCode:     string  — e.g. "CONTRACT_REQUEST" (matches WorkflowDefinition.code)
   *   businessRecordId: string  — UUID of the business record in Docqube
   *   variables:        object  — BPMN process variables (pure business facts)
   *   tenantId:         string? — customer/tenant override for definition lookup
   * }
   *
   * Returns: WorkflowInstance record
   */
  async startProcess(req, res, next) {
    try {
      const { workflowCode, businessRecordId, variables = {}, tenantId } = req.body;

      if (!workflowCode) {
        return res.status(400).json({ status: 'error', message: 'workflowCode is required.' });
      }
      if (!businessRecordId) {
        return res.status(400).json({ status: 'error', message: 'businessRecordId is required.' });
      }

      // tenantId from body takes precedence; fall back to JWT claim
      const resolvedTenantId = tenantId || req.user?.tenantId || req.user?.customerId || null;

      const instance = await workflowProcessService.startProcess(
        workflowCode,
        businessRecordId,
        variables,
        resolvedTenantId,
        req.user?.id
      );

      return ApiResponse.success(res, instance, 'Workflow process started successfully.', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/workflow/instances/:instanceId/state
   *
   * Fetch the live workflow state for a process instance from jBPM.
   * Syncs the WorkflowInstance record in PostgreSQL before returning.
   *
   * Params: instanceId — UUID of the WorkflowInstance (not the jBPM process ID)
   *
   * Returns: normalized workflowState {
   *   processStateName, businessStatus, assignedGroup, assignedGroups,
   *   activeTask, activeTasks, variables, isCompleted
   * }
   */
  async getState(req, res, next) {
    try {
      const { instanceId } = req.params;
      const workflowState = await workflowTaskService.getWorkflowStateForBusinessRecord(instanceId);
      return ApiResponse.success(res, workflowState, 'Workflow state retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/workflow/instances/:instanceId/tasks
   *
   * List all active Human Tasks for a process instance.
   *
   * Params: instanceId — UUID of the WorkflowInstance
   *
   * Returns: array of normalized task objects {
   *   id, name, status, actualOwner, potentialOwners, processInstanceId
   * }
   */
  async getActiveTasks(req, res, next) {
    try {
      const { instanceId } = req.params;
      const tasks = await workflowTaskService.getActiveTasks(instanceId);
      return ApiResponse.success(res, tasks, 'Active tasks retrieved successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/workflow/instances/:instanceId/tasks/:taskId/complete
   *
   * Complete a specific Human Task on the active process instance.
   * Triggers the full Claim → Start → Complete lifecycle on jBPM,
   * then synchronises the WorkflowInstance record in PostgreSQL.
   *
   * Params:
   *   instanceId — UUID of the WorkflowInstance (used to resolve jBPM process)
   *   taskId     — jBPM task ID to complete
   *
   * Body: {
   *   outputVariables: object  — BPMN output variables to pass to the engine
   * }
   *
   * Returns: updated workflowState after task completion
   */
  async completeTask(req, res, next) {
    try {
      const { instanceId, taskId } = req.params;
      const { outputVariables = {} } = req.body;

      // The actor is the authenticated user from the JWT.
      // WorkflowTaskService reads kieUserId / kieGroups / groups from this object.
      const actor = req.user;

      const result = await workflowTaskService.completeWorkflow(
        instanceId,
        actor,
        {
          outputVariables,
          taskReference: taskId,
        }
      );

      return ApiResponse.success(res, result, 'Task completed successfully.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WorkflowController();
