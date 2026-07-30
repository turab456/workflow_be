const kieClient = require('../client/KieClient');
const WorkflowInstance = require('../models/WorkflowInstance');
const workflowStateMapper = require('./WorkflowStateMapper');
const AppError = require('../../../shared/exceptions/AppError');

const ACTIVE_TASK_STATUSES = ['Ready', 'Reserved', 'InProgress'];

class WorkflowTaskService {
  get legacyRoleToKieUser() {
    return {
      DEPARTMENT_HEAD: process.env.KIE_USER_DEPT_HEAD || 'department_head_user',
      PROCUREMENT: process.env.KIE_USER_PROCUREMENT || 'procurement_user',
      LEGAL: process.env.KIE_USER_LEGAL || 'legal_user',
      SUPER_ADMIN: process.env.KIE_SERVER_USER || 'wbadmin',
    };
  }

  async completeTask({ businessRecordId, workflowCode = null, outputVariables = {}, actor, taskId = null }) {
    const instance = await this._resolveInstance(businessRecordId, workflowCode);
    const kieUserId = this._resolveKieUser(actor);
    const task = await this._findActiveTask(instance, taskId);

    await this._claimAndStartIfNeeded(instance.container_id, task, kieUserId);

    await kieClient.completeTask(
      instance.container_id,
      task.id,
      kieUserId,
      outputVariables
    );

    const workflowState = await this.getWorkflowStateForInstance(instance);

    return {
      completedTask: task,
      workflowState,
      processInstanceId: instance.process_instance_id,
      containerId: instance.container_id,
      kieUserId,
    };
  }

  async completeWorkflowTask(businessRecordId, outputVariables = {}, actor, options = {}) {
    return this.completeTask({
      businessRecordId,
      outputVariables,
      actor,
      taskId: options.taskId || null,
      workflowCode: options.workflowCode || null,
    });
  }

  async releaseWorkflowTask(businessRecordId, actor, options = {}) {
    const instance = await this._resolveInstance(businessRecordId, options.workflowCode || null);
    const kieUserId = this._resolveKieUser(actor);
    const task = await this._findActiveTask(instance, options.taskId || null);

    await kieClient.releaseTask(instance.container_id, task.id, kieUserId);
    const workflowState = await this.getWorkflowStateForInstance(instance);

    return {
      taskId: task.id,
      processInstanceId: instance.process_instance_id,
      workflowState,
    };
  }

  async getWorkflowState(businessRecordId, workflowCode = null) {
    const instance = await this._resolveInstance(businessRecordId, workflowCode);
    return this.getWorkflowStateForInstance(instance);
  }

  async getWorkflowStateForInstance(instance) {
    const processInstance = await kieClient.getProcessInstance(
      instance.container_id,
      instance.process_instance_id,
      { withVars: true }
    );

    const activeTasks = await kieClient.getTasksByProcessInstance(
      instance.process_instance_id,
      ACTIVE_TASK_STATUSES
    );
    const taskDetails = await this._getTaskDetails(instance.container_id, activeTasks);
    const workflowState = workflowStateMapper.fromKie({
      processInstance,
      activeTasks,
      taskDetails,
    });

    await this._syncInstance(instance, workflowState);
    return workflowState;
  }

  async getActiveTasks(businessRecordId, workflowCode = null) {
    const instance = await this._resolveInstance(businessRecordId, workflowCode);
    return kieClient.getTasksByProcessInstance(
      instance.process_instance_id,
      ACTIVE_TASK_STATUSES
    );
  }

  async canUserActOnRecord(businessRecordId, actor, workflowCode = null) {
    try {
      const instance = await this._resolveInstance(businessRecordId, workflowCode);
      const kieUserId = this._resolveKieUser(actor);
      const activeTasks = await kieClient.getTasksByProcessInstance(
        instance.process_instance_id,
        ACTIVE_TASK_STATUSES
      );

      return activeTasks.some((task) => {
        const owner = task['task-actual-owner'] || task.taskActualOwner || task.actualOwner;
        return !owner || owner === kieUserId;
      });
    } catch (error) {
      return false;
    }
  }

  async _resolveInstance(businessRecordId, workflowCode = null) {
    const where = {
      business_record_id: businessRecordId,
      status: 'ACTIVE',
    };

    if (workflowCode) where.business_module = workflowCode;

    const instance = await WorkflowInstance.findOne({
      where,
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

  async _findActiveTask(instance, taskId = null) {
    const activeTasks = await kieClient.getTasksByProcessInstance(
      instance.process_instance_id,
      ACTIVE_TASK_STATUSES
    );

    if (!activeTasks.length) {
      throw new AppError(
        `No active Human Task found on KIE Server for process instance ${instance.process_instance_id}`,
        404
      );
    }

    const task = taskId
      ? activeTasks.find((candidate) => String(this._taskId(candidate)) === String(taskId))
      : this._singleActiveTask(activeTasks, instance.process_instance_id);

    if (!task) {
      throw new AppError(
        `Task ${taskId} is not an active task for process instance ${instance.process_instance_id}`,
        409
      );
    }

    const details = await this._safeGetTask(instance.container_id, this._taskId(task));
    return workflowStateMapper.fromKie({
      processInstance: {},
      activeTasks: [task],
      taskDetails: details ? [details] : [],
    }).activeTask;
  }

  _singleActiveTask(activeTasks, processInstanceId) {
    if (activeTasks.length > 1) {
      throw new AppError(
        `Process instance ${processInstanceId} has multiple active tasks. Provide taskId to complete the intended task.`,
        409
      );
    }

    return activeTasks[0];
  }

  async _claimAndStartIfNeeded(containerId, task, kieUserId) {
    if (task.status === 'Ready') {
      await kieClient.claimTask(containerId, task.id, kieUserId);
    }

    if (task.status === 'Ready' || task.status === 'Reserved') {
      await kieClient.startTask(containerId, task.id, kieUserId);
    }
  }

  async _getTaskDetails(containerId, tasks) {
    return Promise.all(
      tasks.map((task) => this._safeGetTask(containerId, this._taskId(task)))
    );
  }

  async _safeGetTask(containerId, taskId) {
    try {
      return await kieClient.getTask(containerId, taskId);
    } catch (error) {
      return null;
    }
  }

  async _syncInstance(instance, workflowState) {
    const activeTask = workflowState.activeTask;

    await instance.update({
      status: workflowState.workflowInstanceStatus,
      process_state: workflowState.processStateName,
      current_task_id: activeTask?.id || null,
      current_task: activeTask?.name || null,
      current_task_status: activeTask?.status || null,
      current_assignee: activeTask?.actualOwner || null,
      assigned_groups: workflowState.assignedGroups,
      active_tasks: workflowState.activeTasks,
      workflow_variables: workflowState.variables,
      last_synced_at: new Date(),
      completed_at: workflowState.isCompleted && !instance.completed_at
        ? new Date()
        : instance.completed_at,
    });
  }

  _resolveKieUser(actor) {
    if (!actor) throw new AppError('Workflow actor is required.', 400);

    if (typeof actor === 'string') {
      return this._kieUserForRole(actor) || actor;
    }

    if (actor.kieUserId || actor.kie_user_id) {
      return actor.kieUserId || actor.kie_user_id;
    }

    if (actor.role) {
      const roleUser = this._kieUserForRole(actor.role);
      if (roleUser) return roleUser;
    }

    if (actor.username || actor.email) {
      return actor.username || actor.email;
    }

    throw new AppError('Unable to resolve KIE user for workflow actor.', 400);
  }

  _kieUserForRole(role) {
    const dynamicEnvKey = `KIE_USER_${String(role).replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`;
    return process.env[dynamicEnvKey] || this.legacyRoleToKieUser[role];
  }

  _taskId(task) {
    return task?.['task-id'] || task?.taskId || task?.id;
  }
}

module.exports = new WorkflowTaskService();
