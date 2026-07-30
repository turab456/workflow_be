const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../database');

class WorkflowDefinition extends Model {}

WorkflowDefinition.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false, // e.g. CONTRACT_REQUEST
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  container_id: {
    type: DataTypes.STRING,
    allowNull: false, // jBPM container
  },
  process_id: {
    type: DataTypes.STRING,
    allowNull: false, // jBPM process id
  },
  version: {
    type: DataTypes.STRING,
  },
  customer_id: {
    type: DataTypes.STRING,
    allowNull: true, // For customer/tenant specific overrides (e.g. string or UUID)
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'ACTIVE',
  },
  description: {
    type: DataTypes.STRING,
  },
  /**
   * task_schemas — defines the output variables each Human Task expects.
   *
   * This is the contract between the BPMN and Docqube's generic approval UI.
   * Docqube reads this schema when rendering a task, builds the form dynamically,
   * and sends back the correct outputVariables on completion.
   *
   * Format:
   * {
   *   "<TaskName>": {
   *     "<variableName>": { "type": "boolean|string|number", "label": "...", "required": true }
   *   }
   * }
   *
   * Example:
   * {
   *   "DepartmentHeadApproval": {
   *     "deptHeadApproved": { "type": "boolean", "label": "Approve?", "required": true }
   *   },
   *   "ProcurementReview": {
   *     "procurementApproved": { "type": "boolean", "label": "Approve?", "required": true },
   *     "legalRequired":       { "type": "boolean", "label": "Route to Legal?", "required": false }
   *   }
   * }
   */
  task_schemas: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  createdBy: {
    type: DataTypes.UUID,
  },
  updatedBy: {
    type: DataTypes.UUID,
  }
}, {
  sequelize,
  modelName: 'WorkflowDefinition',
  tableName: 'workflow_definitions',
  timestamps: true,
  paranoid: true,
});

module.exports = WorkflowDefinition;
