const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../database');

class WorkflowInstance extends Model {}

WorkflowInstance.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  workflow_definition_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  process_instance_id: {
    type: DataTypes.BIGINT, // KIE server process instance id
    allowNull: false,
  },
  container_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  business_module: {
    type: DataTypes.STRING, // e.g. CONTRACT_REQUEST
  },
  business_record_id: {
    type: DataTypes.STRING, // Supports UUIDs or custom string IDs from Docqube
  },
  status: {
    type: DataTypes.STRING,
  },
  process_state: {
    type: DataTypes.STRING,
  },
  current_task_id: {
    type: DataTypes.BIGINT,
  },
  current_task: {
    type: DataTypes.STRING,
  },
  current_task_status: {
    type: DataTypes.STRING,
  },
  current_assignee: {
    type: DataTypes.STRING,
  },
  assigned_groups: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  active_tasks: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  workflow_variables: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  last_synced_at: {
    type: DataTypes.DATE,
  },
  started_by: {
    type: DataTypes.STRING, // User ID string from Docqube
  },
  started_at: {
    type: DataTypes.DATE,
  },
  completed_at: {
    type: DataTypes.DATE,
  }
}, {
  sequelize,
  modelName: 'WorkflowInstance',
  tableName: 'workflow_instances',
  timestamps: true,
  paranoid: true,
});

module.exports = WorkflowInstance;
