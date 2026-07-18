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
    type: DataTypes.UUID,
  },
  status: {
    type: DataTypes.STRING,
  },
  current_task: {
    type: DataTypes.STRING,
  },
  current_assignee: {
    type: DataTypes.STRING,
  },
  started_by: {
    type: DataTypes.UUID,
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
