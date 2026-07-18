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
    type: DataTypes.UUID,
    allowNull: true, // For customer specific overrides
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'ACTIVE',
  },
  description: {
    type: DataTypes.STRING,
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
