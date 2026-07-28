const axios = require('axios');
const AppError = require('../../../shared/exceptions/AppError');

/**
 * KieClient — low-level HTTP adapter for the jBPM KIE Server REST API.
 *
 * This is the ONLY file that may know about KIE Server endpoints.
 * All other services must use WorkflowProcessService or WorkflowTaskService.
 *
 * KIE Server REST reference:
 *   /containers/{containerId}/processes/{processId}/instances            → start process
 *   /containers/{containerId}/processes/instances/{pInstanceId}/tasks    → list tasks
 *   /containers/{containerId}/tasks/{taskId}/states/claimed              → claim
 *   /containers/{containerId}/tasks/{taskId}/states/started              → start
 *   /containers/{containerId}/tasks/{taskId}/states/completed            → complete
 *   /containers/{containerId}/tasks/{taskId}/states/released             → release
 */
class KieClient {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.KIE_SERVER_URL,
      auth: {
        username: process.env.KIE_SERVER_USER,
        password: process.env.KIE_SERVER_PASS,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 s
    });

    // Unified response/error logging
    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        const msg = err.response?.data?.message || err.response?.data || err.message;
        console.error(`[KieClient] HTTP ${err.response?.status || 'N/A'} — ${msg}`);
        return Promise.reject(err);
      }
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Process management
  // ─────────────────────────────────────────────────────────────

  /**
   * Start a new process instance.
   * @param {string} containerId
   * @param {string} processId
   * @param {object} variables  — BPMN process variables
   * @returns {Promise<number>} KIE process instance id
   */
  async startProcess(containerId, processId, variables = {}) {
    try {
      const response = await this.client.post(
        `/containers/${containerId}/processes/${processId}/instances`,
        variables
      );
      return response.data; // numeric process instance id
    } catch (error) {
      throw new AppError('Failed to start workflow process on KIE Server', 500);
    }
  }

  /**
   * Abort (cancel) a running process instance.
   */
  async abortProcess(containerId, processInstanceId) {
    try {
      await this.client.delete(
        `/containers/${containerId}/processes/instances/${processInstanceId}`
      );
      return true;
    } catch (error) {
      throw new AppError('Failed to abort workflow process on KIE Server', 500);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Human Task lifecycle
  // ─────────────────────────────────────────────────────────────

  /**
   * Get all human tasks for a given process instance that are in the
   * specified status (default: Ready, Reserved, InProgress).
   *
   * KIE Server query endpoint:
   *   GET /containers/{cId}/processes/instances/{pId}/tasks
   *       ?status=Ready&status=Reserved&status=InProgress
   *
   * @param {string} containerId
   * @param {number|string} processInstanceId
   * @param {string[]} statuses  — e.g. ['Ready','Reserved','InProgress']
   * @returns {Promise<Array>} array of task summary objects
   */
async getTasksByProcessInstance(
  processInstanceId,
  statuses = ['Ready', 'Reserved', 'InProgress']
) {
  console.log(processInstanceId)
  try {
    const response = await this.client.get(
      `/queries/tasks/instances/process/${processInstanceId}`,
      {
        params: {
          status: statuses,
          page: 0,
          pageSize: 10,
        },
      }
    );

    return response.data['task-summary'] || [];
  } catch (error) {
    throw new AppError(
      `Failed to fetch tasks for process instance ${processInstanceId}`,
      500
    );
  }
}

  /**
   * Claim a task (move from Ready → Reserved) so a specific user owns it.
   *
   * @param {string} containerId
   * @param {number|string} taskId
   * @param {string} userId  — KIE / jBPM user id of the claimant
   */
  async claimTask(containerId, taskId, userId) {
    try {
      await this.client.put(
        `/containers/${containerId}/tasks/${taskId}/states/claimed`,
        null,
        { params: { user: userId } }
      );
    } catch (error) {
      throw new AppError(`Failed to claim task ${taskId} on KIE Server`, 500);
    }
  }

  /**
   * Start a task (move from Reserved → InProgress).
   *
   * @param {string} containerId
   * @param {number|string} taskId
   * @param {string} userId
   */
  async startTask(containerId, taskId, userId) {
    try {
      await this.client.put(
        `/containers/${containerId}/tasks/${taskId}/states/started`,
        null,
        { params: { user: userId } }
      );
    } catch (error) {
      throw new AppError(`Failed to start task ${taskId} on KIE Server`, 500);
    }
  }

  /**
   * Complete a task (move from InProgress → Completed) and pass output variables.
   * These variables are evaluated by the gateway expression in the BPMN.
   *
   * @param {string} containerId
   * @param {number|string} taskId
   * @param {string} userId
   * @param {object} outputVariables  — e.g. { deptHeadApproved: true }
   */
  async completeTask(containerId, taskId, userId, outputVariables = {}) {
    try {
      await this.client.put(
        `/containers/${containerId}/tasks/${taskId}/states/completed`,
        outputVariables,
        { params: { user: userId } }
      );
    } catch (error) {
      throw new AppError(`Failed to complete task ${taskId} on KIE Server`, 500);
    }
  }

  /**
   * Release a task (move from Reserved → Ready), giving it back to the group pool.
   *
   * @param {string} containerId
   * @param {number|string} taskId
   * @param {string} userId
   */
  async releaseTask(containerId, taskId, userId) {
    try {
      await this.client.put(
        `/containers/${containerId}/tasks/${taskId}/states/released`,
        null,
        { params: { user: userId } }
      );
    } catch (error) {
      throw new AppError(`Failed to release task ${taskId} on KIE Server`, 500);
    }
  }
}

module.exports = new KieClient();
