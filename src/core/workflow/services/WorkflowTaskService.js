const kieClient = require('../client/KieClient');
const WorkflowInstance = require('../models/WorkflowInstance');
const AppError = require('../../../shared/exceptions/AppError');

/**
 * WorkflowTaskService — Production-grade Human Task orchestrator.
 *
 * Responsibilities:
 *   • Resolve container_id & process_instance_id from the local WorkflowInstance table.
 *   • Discover the currently active Human Task via KIE Server query.
 *   • Execute the full Claim → Start → Complete lifecycle in a single call.
 *   • Never expose KIE task ids to the business layer.
 *
 * Business modules must call ONLY:
 *   completeWorkflowTask(businessRecordId, outputVariables, kieUserId)
 *
 * Role-to-KIE-user mapping:
 *   Your jBPM BPMN assigns Human Tasks to groups (e.g. "department_heads").
 *   To complete a task you still need a KIE user identity that BELONGS to that group.
 *   We use the role-keyed KIE users defined in the BPMN / KIE user store.
 *   Override KIE_USER_* env vars to match your jBPM user/group configuration.
 */
class WorkflowTaskService {
  /**
   * Map application roles → jBPM user identity used for task operations.
   * These must exist in your jBPM user store and belong to the correct groups.
   *
   * Override via environment variables if your jBPM setup differs.
   */
  get roleToKieUser() {
    return {
      DEPARTMENT_HEAD: process.env.KIE_USER_DEPT_HEAD    || 'department_head_user',
      PROCUREMENT:     process.env.KIE_USER_PROCUREMENT  || 'procurement_user',
      LEGAL:           process.env.KIE_USER_LEGAL        || 'legal_user',
      SUPER_ADMIN:     process.env.KIE_SERVER_USER       || 'wbadmin',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────────────────────

  /**
   * Resolve the active WorkflowInstance for a business record (e.g. contract request id).
   * Throws 404 if no active instance is found.
   *
   * @param {string} businessRecordId  — UUID of the business record
   * @returns {Promise<WorkflowInstance>}
   */
  async _resolveInstance(businessRecordId) {
    const instance = await WorkflowInstance.findOne({
      where: {
        business_record_id: businessRecordId,
        status: 'ACTIVE',
      },
      order: [['started_at', 'DESC']],
    });

    if (!instance) {
      throw new AppError(
        `No active workflow instance found for record ${businessRecordId}`,
        404
      );
    }

    return instance;
  }

  /**
   * Find the first active Human Task for a process instance.
   * Queries KIE Server for tasks in Ready, Reserved, or InProgress status
   * and returns the first match.
   *
   * @param {string} containerId
   * @param {number|string} processInstanceId
   * @returns {Promise<object>} KIE task summary object
   */
  async _findActiveTask(processInstanceId) {
    console.log(processInstanceId,"processInstanceId")
    const tasks = await kieClient.getTasksByProcessInstance(
    processInstanceId,
    ['Ready', 'Reserved', 'InProgress']
);

    if (!tasks || tasks.length === 0) {
      throw new AppError(
        `No active Human Task found on KIE Server for process instance ${processInstanceId}. ` +
        'The process may have already completed or the task may be in an unexpected state.',
        404
      );
    }

    // Return the most recently created task (first in list, KIE orders by id desc)
    return tasks[0];
  }

  // ─────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────

  /**
   * Complete the currently active Human Task for a business record.
   *
   * Full lifecycle executed internally:
   *   1. Resolve WorkflowInstance from PostgreSQL  → get containerId + processInstanceId
   *   2. Query KIE Server for active tasks         → get taskId + taskStatus
   *   3. If task is Ready     → Claim it first (Reserved)
   *   4. If task is Reserved  → Start it (InProgress)
   *   5. Complete task with outputVariables        → BPMN gateway evaluates variables
   *   6. Return task summary to caller (ContractRequestService)
   *
   * Business modules pass their semantic variables; this service handles all KIE mechanics.
   *
   * @param {string} businessRecordId   — UUID of the business record (e.g. contract request)
   * @param {object} outputVariables    — BPMN variables evaluated by gateway
   *                                      e.g. { deptHeadApproved: true }
   * @param {string} actorRole          — Application role of the acting user (e.g. 'DEPARTMENT_HEAD')
   * @returns {Promise<object>}         — { taskId, taskName, processInstanceId, containerId }
   */
  async completeWorkflowTask(businessRecordId, outputVariables, actorRole) {
    console.log(outputVariables)
    // 1. Resolve DB instance
    const instance = await this._resolveInstance(businessRecordId);
    const { container_id: containerId, process_instance_id: processInstanceId } = instance;

    // 2. Map app role → KIE user
    const kieUserId = this.roleToKieUser[actorRole];
    if (!kieUserId) {
      throw new AppError(
        `No KIE user mapping found for role "${actorRole}"`,
        400
      );
    }

    // 3. Discover the active task on KIE Server
    const task = await this._findActiveTask(processInstanceId);
    const taskId   = task['task-id'];
    const taskName = task['task-name'];
    const taskStatus = task['task-status'];

    console.log(
      `[WorkflowTaskService] Processing task "${taskName}" (id=${taskId}, status=${taskStatus}) ` +
      `for process instance ${processInstanceId} as KIE user "${kieUserId}"`
    );

    // 4. Claim task if it is in Ready state (group task, not yet owned by anyone)
    if (taskStatus === 'Ready') {
      await kieClient.claimTask(containerId, taskId, kieUserId);
      console.log(`[WorkflowTaskService] Task ${taskId} claimed by ${kieUserId}`);
    }

    // 5. Start task if it is in Reserved (claimed) state
    if (taskStatus === 'Ready' || taskStatus === 'Reserved') {
      await kieClient.startTask(containerId, taskId, kieUserId);
      console.log(`[WorkflowTaskService] Task ${taskId} started by ${kieUserId}`);
    }

    // 6. Complete task — this passes variables to the BPMN process.
    //    The gateway expression (return deptHeadApproved == true;) is evaluated NOW.
    await kieClient.completeTask(containerId, taskId, kieUserId, outputVariables);
    console.log(
      `[WorkflowTaskService] Task ${taskId} completed with variables:`,
      JSON.stringify(outputVariables)
    );

    // 7. Update WorkflowInstance snapshot in our DB
    await instance.update({
      current_task: taskName,
      current_assignee: kieUserId,
    });

    return {
      taskId,
      taskName,
      processInstanceId,
      containerId,
    };
  }

  /**
   * Release a previously claimed task back to the group pool.
   * Useful if a reviewer needs to un-assign themselves.
   *
   * @param {string} businessRecordId
   * @param {string} actorRole
   */
  async releaseWorkflowTask(businessRecordId, actorRole) {
    const instance  = await this._resolveInstance(businessRecordId);
    const { container_id: containerId, process_instance_id: processInstanceId } = instance;

    const kieUserId = this.roleToKieUser[actorRole];
    if (!kieUserId) {
      throw new AppError(`No KIE user mapping found for role "${actorRole}"`, 400);
    }

    const task = await this._findActiveTask( processInstanceId);
    const taskId = task['task-id'];

    await kieClient.releaseTask(containerId, taskId, kieUserId);
    console.log(`[WorkflowTaskService] Task ${taskId} released by ${kieUserId}`);

    return { taskId, processInstanceId };
  }

  /**
   * Retrieve all active tasks for a business record — useful for status dashboards.
   *
   * @param {string} businessRecordId
   * @returns {Promise<Array>}
   */
  async getActiveTasks(businessRecordId) {
    const instance = await this._resolveInstance(businessRecordId);
    const { container_id: containerId, process_instance_id: processInstanceId } = instance;

   return kieClient.getTasksByProcessInstance(
    processInstanceId,
    ['Ready', 'Reserved', 'InProgress']
);
  }
}

module.exports = new WorkflowTaskService();
