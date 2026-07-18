const kieClient = require('../client/KieClient');
const WorkflowDefinition = require('../models/WorkflowDefinition');
const WorkflowInstance = require('../models/WorkflowInstance');
const AppError = require('../../../shared/exceptions/AppError');

class WorkflowProcessService {
  /**
   * Starts a workflow process based on the workflow code.
   * Resolves customer specific workflow if customerId is provided.
   */
  async startProcess(workflowCode, businessRecordId, variables = {}, customerId = null, userId = null) {
    // 1. Resolve Definition
    let definition = null;

    if (customerId) {
      definition = await WorkflowDefinition.findOne({
        where: { code: workflowCode, customer_id: customerId, status: 'ACTIVE' }
      });
    }

    // Fallback to global definition
    if (!definition) {
      definition = await WorkflowDefinition.findOne({
        where: { code: workflowCode, customer_id: null, status: 'ACTIVE' }
      });
    }

    if (!definition) {
      throw new AppError(`Workflow definition not found for code: ${workflowCode}`, 404);
    }

    // 2. Start KIE Process
    const processInstanceId = await kieClient.startProcess(definition.container_id, definition.process_id, variables);

    // 3. Create Internal Instance Record
    const instance = await WorkflowInstance.create({
      workflow_definition_id: definition.id,
      process_instance_id: processInstanceId,
      container_id: definition.container_id,
      business_module: workflowCode,
      business_record_id: businessRecordId,
      status: 'ACTIVE',
      started_by: userId,
      started_at: new Date()
    });

    return instance;
  }
}

module.exports = new WorkflowProcessService();
