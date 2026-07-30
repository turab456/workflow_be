const axios = require('axios');
const AppError = require('../../../shared/exceptions/AppError');

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
      timeout: Number(process.env.KIE_SERVER_TIMEOUT_MS || 10000),
    });

    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        const msg = err.response?.data?.message || err.response?.data || err.message;
        console.error(`[KieClient] HTTP ${err.response?.status || 'N/A'} - ${msg}`);
        return Promise.reject(err);
      }
    );
  }

  async startProcess(containerId, processId, variables = {}) {
    try {
      const response = await this.client.post(
        `/containers/${containerId}/processes/${processId}/instances`,
        variables
      );
      return response.data;
    } catch (error) {
      throw new AppError('Failed to start workflow process on KIE Server', 500);
    }
  }

  async getProcessInstance(containerId, processInstanceId, { withVars = true } = {}) {
    try {
      const response = await this.client.get(
        `/containers/${containerId}/processes/instances/${processInstanceId}`,
        { params: { withVars } }
      );
      return response.data;
    } catch (error) {
      throw new AppError(
        `Failed to fetch process instance ${processInstanceId} from KIE Server`,
        500
      );
    }
  }

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

  async getTasksByProcessInstance(
    processInstanceId,
    statuses = ['Ready', 'Reserved', 'InProgress'],
    { page = 0, pageSize = 10 } = {}
  ) {
    const params = this._queryParams({ status: statuses, page, pageSize });

    try {
      const response = await this.client.get(
        `/queries/tasks/instances/process/${processInstanceId}?${params.toString()}`
      );
      return this._taskSummaryList(response.data);
    } catch (error) {
      throw new AppError(
        `Failed to fetch tasks for process instance ${processInstanceId}`,
        500
      );
    }
  }

  async getTask(containerId, taskId) {
    try {
      const response = await this.client.get(`/containers/${containerId}/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      throw new AppError(`Failed to fetch task ${taskId} from KIE Server`, 500);
    }
  }

  async claimTask(containerId, taskId, userId) {
    try {
      await this.client.put(
        `/containers/${containerId}/tasks/${taskId}/states/claimed`,
        null,
        { params: { user: userId } }
      );
    } catch (error) {
      const detail = error.response?.data?.message || error.response?.data || error.message;
      throw new AppError(
        `Failed to claim task ${taskId} as user "${userId}" on KIE Server: ${detail}`,
        error.response?.status || 500
      );
    }
  }

  async startTask(containerId, taskId, userId) {
    try {
      await this.client.put(
        `/containers/${containerId}/tasks/${taskId}/states/started`,
        null,
        { params: { user: userId } }
      );
    } catch (error) {
      const detail = error.response?.data?.message || error.response?.data || error.message;
      throw new AppError(
        `Failed to start task ${taskId} as user "${userId}" on KIE Server: ${detail}`,
        error.response?.status || 500
      );
    }
  }

  async completeTask(containerId, taskId, userId, outputVariables = {}) {
    try {
      await this.client.put(
        `/containers/${containerId}/tasks/${taskId}/states/completed`,
        outputVariables,
        { params: { user: userId } }
      );
    } catch (error) {
      const detail = error.response?.data?.message || error.response?.data || error.message;
      throw new AppError(
        `Failed to complete task ${taskId} as user "${userId}" on KIE Server: ${detail}`,
        error.response?.status || 500
      );
    }
  }

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

  _queryParams(params) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => query.append(key, item));
        return;
      }

      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    });

    return query;
  }

  _taskSummaryList(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data['task-summary'])) return data['task-summary'];
    if (data['task-summary']) return [data['task-summary']];
    return [];
  }
}

module.exports = new KieClient();
