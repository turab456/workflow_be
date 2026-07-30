const PROCESS_STATE_NAMES = {
  0: 'PENDING',
  1: 'ACTIVE',
  2: 'COMPLETED',
  3: 'ABORTED',
  4: 'SUSPENDED',
};

class WorkflowStateMapper {
  fromKie({ processInstance = {}, activeTasks = [], taskDetails = [] }) {
    const variables = this._normalizeVariables(
      this._pick(processInstance, [
        'process-instance-variables',
        'processInstanceVariables',
        'variables',
      ])
    );

    const taskDetailById = new Map(
      taskDetails
        .filter(Boolean)
        .map((detail) => [String(this._taskId(detail)), detail])
    );

    const normalizedTasks = activeTasks.map((task) => {
      const detail = taskDetailById.get(String(this._taskId(task)));
      return this._normalizeTask(task, detail);
    });

    const processState = this._pick(processInstance, [
      'process-instance-state',
      'process-state',
      'state',
    ]);
    const processStateName = this._processStateName(processState);
    const activeTask = normalizedTasks[0] || null;
    const assignedGroups = this._assignedGroups(variables, normalizedTasks);
    const businessStatus = this._businessStatus(variables, activeTask, processStateName);
    const isCompleted = processStateName === 'COMPLETED';

    return {
      processState,
      processStateName,
      workflowInstanceStatus: isCompleted ? 'COMPLETED' : 'ACTIVE',
      businessStatus,
      assignedGroup: assignedGroups[0] || null,
      assignedGroups,
      activeTask,
      activeTasks: normalizedTasks,
      variables,
      isCompleted,
    };
  }

  _normalizeTask(task, detail = null) {
    const source = { ...(detail || {}), ...(task || {}) };

    return {
      id: this._taskId(source),
      name: this._pick(source, ['task-name', 'taskName', 'name']),
      status: this._pick(source, ['task-status', 'taskStatus', 'status']),
      actualOwner: this._pick(source, ['task-actual-owner', 'taskActualOwner', 'actual-owner', 'actualOwner']),
      processInstanceId: this._pick(source, [
        'task-proc-inst-id',
        'task-process-instance-id',
        'taskProcessInstanceId',
        'processInstanceId',
      ]),
      processId: this._pick(source, ['task-proc-def-id', 'task-process-id', 'processId']),
      containerId: this._pick(source, ['task-container-id', 'taskContainerId', 'containerId']),
      potentialOwners: this._potentialOwners(task, detail),
      raw: source,
    };
  }

  _taskId(task) {
    return this._pick(task, ['task-id', 'taskId', 'task-instance-id', 'id']);
  }

  _assignedGroups(variables, tasks) {
    const fromVariables = this._firstPresent(variables, [
      'assignedGroups',
      'assigned_groups',
      'assignedGroup',
      'assigned_group',
      'assigned_to_group',
      'activeGroups',
      'active_groups',
    ]);

    if (fromVariables !== undefined && fromVariables !== null) {
      return this._stringArray(fromVariables);
    }

    const taskOwners = tasks.flatMap((task) => task.potentialOwners || []);
    return [...new Set(taskOwners)];
  }

  _businessStatus(variables, activeTask, processStateName) {
    const fromVariables = this._firstPresent(variables, [
      'businessStatus',
      'business_status',
      'workflowStatus',
      'workflow_status',
      'applicationStatus',
      'application_status',
      'contractStatus',
      'contract_status',
    ]);

    if (fromVariables) return String(fromVariables);
    if (activeTask?.name) return this._toStatusCode(activeTask.name);
    return processStateName || 'UNKNOWN';
  }

  _processStateName(state) {
    if (state === undefined || state === null || state === '') return 'UNKNOWN';
    return PROCESS_STATE_NAMES[Number(state)] || String(state).toUpperCase();
  }

  _normalizeVariables(value) {
    if (!value) return {};
    if (!Array.isArray(value)) return value;

    return value.reduce((acc, item) => {
      const key = this._pick(item, ['key', 'name', 'variable-id', 'variableId']);
      const variableValue = this._pick(item, ['value', 'variable-instance-value', 'variableValue']);
      if (key) acc[key] = variableValue;
      return acc;
    }, {});
  }

  _potentialOwners(task, detail) {
    const candidates = [
      this._pick(task, ['task-pot-owners', 'task-potential-owners', 'potential-owners', 'potentialOwners']),
      this._pick(detail || {}, ['task-pot-owners', 'task-potential-owners', 'potential-owners', 'potentialOwners']),
      this._pick(detail || {}, ['people-assignments.potential-owners', 'peopleAssignments.potentialOwners']),
    ];

    return [...new Set(candidates.flatMap((candidate) => this._stringArray(candidate)))];
  }

  _stringArray(value) {
    if (value === undefined || value === null || value === '') return [];
    if (Array.isArray(value)) {
      return value.flatMap((item) => this._stringArray(item));
    }
    if (typeof value === 'object') {
      const entity = this._pick(value, ['id', 'name', 'entity-id', 'entityId']);
      return entity ? [String(entity)] : [];
    }
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  _toStatusCode(value) {
    return String(value)
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  }

  _firstPresent(source, keys) {
    for (const key of keys) {
      const value = this._pick(source, [key]);
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
  }

  _pick(source, keys) {
    if (!source) return undefined;

    for (const key of keys) {
      const value = key.split('.').reduce((current, part) => {
        if (!current) return undefined;
        return current[part];
      }, source);

      if (value !== undefined && value !== null) return value;
    }

    return undefined;
  }
}

module.exports = new WorkflowStateMapper();
