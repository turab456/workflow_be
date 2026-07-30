const kieClient = require('../client/KieClient');
const WorkflowDefinition = require('../models/WorkflowDefinition');
const WorkflowInstance = require('../models/WorkflowInstance');
const AppError = require('../../../shared/exceptions/AppError');

class WorkflowProcessService {
  /**
   * Starts a workflow process based on the workflow code.
   * Resolves a customer-specific workflow definition when available.
   */
  async startProcess(workflowCode, businessRecordId, variables = {}, customerId = null, userId = null) {
    const definition = await this._resolveDefinition(workflowCode, customerId);
    const processInstanceId = await kieClient.startProcess(
      definition.container_id,
      definition.process_id,
      variables
    );

    return WorkflowInstance.create({
      workflow_definition_id: definition.id,
      process_instance_id: processInstanceId,
      container_id: definition.container_id,
      business_module: workflowCode,
      business_record_id: businessRecordId,
      status: 'ACTIVE',
      started_by: userId,
      started_at: new Date()
    });
  }

  async getProcessVariables(instanceOrId) {
    const instance = await this._resolveInstance(instanceOrId);
    const processData = await kieClient.getProcessInstance(instance.container_id, instance.process_instance_id, {
      withVars: true,
    });

    return processData?.variables || {};
  }

  async getProcessMetadata(instanceOrId) {
    const instance = await this._resolveInstance(instanceOrId);
    const processData = await kieClient.getProcessInstance(instance.container_id, instance.process_instance_id, {
      withVars: false,
    });

    return {
      instance: instance.toJSON ? instance.toJSON() : instance,
      processData,
    };
  }

  async getProcessState(instanceOrId) {
    const instance = await this._resolveInstance(instanceOrId);
    return kieClient.getProcessInstance(instance.container_id, instance.process_instance_id, {
      withVars: false,
    });
  }

  async _resolveDefinition(workflowCode, customerId = null) {
    let definition = null;

    if (customerId) {
      definition = await WorkflowDefinition.findOne({
        where: { code: workflowCode, customer_id: customerId, status: 'ACTIVE' }
      });
    }

    if (!definition) {
      definition = await WorkflowDefinition.findOne({
        where: { code: workflowCode, customer_id: null, status: 'ACTIVE' }
      });
    }

    if (!definition) {
      throw new AppError(`Workflow definition not found for code: ${workflowCode}`, 404);
    }

    return definition;
  }

  async _resolveInstance(instanceOrId) {
    if (instanceOrId && typeof instanceOrId === 'object' && instanceOrId.id) {
      return instanceOrId;
    }

    if (instanceOrId) {
      const instance = await WorkflowInstance.findByPk(instanceOrId);
      if (!instance) {
        throw new AppError('Workflow instance not found.', 404);
      }
      return instance;
    }

    throw new AppError('Workflow instance reference is required.', 400);
  }
}

module.exports = new WorkflowProcessService();
