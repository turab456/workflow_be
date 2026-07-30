const kieClient = require('../client/KieClient');
const WorkflowInstance = require('../models/WorkflowInstance');
const workflowStateMapper = require('./WorkflowStateMapper');
const AppError = require('../../../shared/exceptions/AppError');

const ACTIVE_TASK_STATUSES = ['Ready', 'Reserved', 'InProgress'];

class WorkflowTaskService {
  async completeWorkflow(businessRecordId, actor, options = {}) {
    const {
      outputVariables = {},
      workflowCode = null,
      taskReference = null,
    } = options;

    const instance = await this._resolveInstance(businessRecordId, workflowCode);
    const kieUserId = this._resolveKieUser(actor);
    const task = await this._findActiveTask(instance, taskReference);

    await this._claimAndStartIfNeeded(instance.container_id, task, kieUserId);

    await kieClient.completeTask(
      instance.container_id,
      task.id,
      kieUserId,
      outputVariables
    );

    const workflowState = await this.getWorkflowStateForBusinessRecord(businessRecordId, workflowCode);

    return {
      workflowState,
      actor: kieUserId,
      completed: true,
    };
  }

  async completeTask({ businessRecordId, workflowCode = null, outputVariables = {}, actor, taskId = null }) {
    return this.completeWorkflow(businessRecordId, actor, {
      outputVariables,
      workflowCode,
      taskReference: taskId,
    });
  }

  async completeWorkflowTask(businessRecordId, outputVariables = {}, actor, options = {}) {
    return this.completeWorkflow(businessRecordId, actor, {
      outputVariables,
      workflowCode: options.workflowCode || null,
      taskReference: options.taskId || options.taskReference || null,
    });
  }

  async releaseWorkflowTask(businessRecordId, actor, options = {}) {
    const workflowCode = options.workflowCode || null;
    const taskReference = options.taskId || options.taskReference || null;
    const instance = await this._resolveInstance(businessRecordId, workflowCode);
    const kieUserId = this._resolveKieUser(actor);
    const task = await this._findActiveTask(instance, taskReference);

    await kieClient.releaseTask(instance.container_id, task.id, kieUserId);
    const workflowState = await this.getWorkflowStateForBusinessRecord(businessRecordId, workflowCode);

    return {
      workflowState,
      released: true,
    };
  }

  async getWorkflowState(businessRecordId, workflowCode = null) {
    return this.getWorkflowStateForBusinessRecord(businessRecordId, workflowCode);
  }

  async getWorkflowStateForBusinessRecord(businessRecordId, workflowCode = null) {
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

  async getActiveTask(businessRecordId, workflowCode = null) {
    const instance = await this._resolveInstance(businessRecordId, workflowCode);
    const activeTasks = await kieClient.getTasksByProcessInstance(
      instance.process_instance_id,
      ACTIVE_TASK_STATUSES
    );

    if (!activeTasks.length) return null;

    const task = this._singleActiveTask(activeTasks, instance.process_instance_id);
    const details = await this._safeGetTask(instance.container_id, this._taskId(task));
    return workflowStateMapper.fromKie({
      processInstance: {},
      activeTasks: [task],
      taskDetails: details ? [details] : [],
    }).activeTask;
  }

  async getActiveTasks(businessRecordId, workflowCode = null) {
    const instance = await this._resolveInstance(businessRecordId, workflowCode);
    const activeTasks = await kieClient.getTasksByProcessInstance(
      instance.process_instance_id,
      ACTIVE_TASK_STATUSES
    );

    if (!activeTasks.length) return [];

    const taskDetails = await this._getTaskDetails(instance.container_id, activeTasks);
    const workflowState = workflowStateMapper.fromKie({
      processInstance: {},
      activeTasks,
      taskDetails,
    });

    return workflowState.activeTasks;
  }

  async canUserActOnRecord(businessRecordId, actor, workflowCode = null) {
    try {
      const instance = await this._resolveInstance(businessRecordId, workflowCode);
      const kieUserId = this._resolveKieUser(actor);
      const activeTasks = await kieClient.getTasksByProcessInstance(
        instance.process_instance_id,
        ACTIVE_TASK_STATUSES
      );
      const taskDetails = await this._getTaskDetails(instance.container_id, activeTasks);
      const workflowState = workflowStateMapper.fromKie({
        processInstance: {},
        activeTasks,
        taskDetails,
      });

      return workflowState.activeTasks.some((task) => {
        if (task.actualOwner) return task.actualOwner === kieUserId;
        return task.potentialOwners.some((owner) => {
          return owner === kieUserId || this._matchesKieGroup(actor, owner);
        });
      });
    } catch (error) {
      return false;
    }
  }

  async _resolveInstance(recordOrInstanceId, workflowCode = null) {
    if (!recordOrInstanceId) {
      throw new AppError('Workflow instance ID or business record ID is required.', 400);
    }

    // 1. Try finding by WorkflowInstance Primary Key (id)
    let instance = await WorkflowInstance.findByPk(recordOrInstanceId);

    // 2. If not found, try finding by process_instance_id (if numeric)
    if (!instance && !isNaN(Number(recordOrInstanceId))) {
      instance = await WorkflowInstance.findOne({
        where: { process_instance_id: Number(recordOrInstanceId) }
      });
    }

    // 3. If not found, try finding by business_record_id
    if (!instance) {
      const where = {
        business_record_id: recordOrInstanceId,
        status: 'ACTIVE',
      };
      if (workflowCode) where.business_module = workflowCode;

      instance = await WorkflowInstance.findOne({
        where,
        order: [['started_at', 'DESC']],
      });
    }

    if (!instance) {
      throw new AppError(
        `No active workflow instance found for identifier "${recordOrInstanceId}"`,
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

    // 1. Explicit KIE user identity on the actor/JWT
    if (actor.kieUserId || actor.kie_user_id) {
      return actor.kieUserId || actor.kie_user_id;
    }

    // 2. Role mapped to a KIE user via env var (e.g. KIE_USER_DEPARTMENT_HEAD)
    if (actor.role) {
      const roleUser = this._kieUserForRole(actor.role);
      if (roleUser) return roleUser;
    }

    // 3. Use the actor's username or email if set
    if (actor.username || actor.email) {
      return actor.username || actor.email;
    }

    // 4. Final fallback: use the configured KIE Server admin user.
    //    This applies when Docqube passes a JWT with only id/tenantId/groups
    //    and no KIE-specific user identity.
    const kieAdmin = process.env.KIE_SERVER_USER;
    if (kieAdmin) {
      console.warn(
        `[WorkflowTaskService] No KIE user identity found on actor — ` +
        `falling back to KIE_SERVER_USER ("${kieAdmin}"). ` +
        `Set kieUserId in the JWT or KIE_USER_<ROLE> env var to avoid this.`
      );
      return kieAdmin;
    }

    throw new AppError(
      'Unable to resolve KIE user for workflow actor. ' +
      'Provide kieUserId in the JWT payload or set KIE_SERVER_USER in env.',
      400
    );
  }

  _matchesKieGroup(actor, owner) {
    const kieGroups = this._resolveKieGroups(actor);
    return kieGroups.includes(owner);
  }

  _resolveKieGroups(actor) {
    if (!actor || typeof actor === 'string') return [];

    const explicitGroups = actor.kieGroups || actor.kie_groups || actor.workflowGroups || actor.groups;
    if (explicitGroups) return this._stringArray(explicitGroups);

    if (!actor.role) return [];

    const dynamicEnvKey = `KIE_GROUPS_${String(actor.role).replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`;
    const envGroups = process.env[dynamicEnvKey];

    if (envGroups) return this._stringArray(envGroups);

    return [];
  }

  _kieUserForRole(role) {
    const dynamicEnvKey = `KIE_USER_${String(role).replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`;
    return process.env[dynamicEnvKey];
  }

  _stringArray(value) {
    if (Array.isArray(value)) return value.flatMap((item) => this._stringArray(item));
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  _taskId(task) {
    return task?.['task-id'] || task?.taskId || task?.id;
  }
}

module.exports = new WorkflowTaskService();
