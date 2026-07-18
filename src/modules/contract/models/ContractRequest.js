const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../../core/database');

class ContractRequest extends Model {}

ContractRequest.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  requester_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING,
  },
  vendor: {
    type: DataTypes.STRING,
  },
  contract_type: {
    type: DataTypes.STRING,
  },
  contract_value: {
    type: DataTypes.DECIMAL(15, 2),
  },
  contract_duration: {
    type: DataTypes.INTEGER, // in months
  },
  scope_of_work: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'DRAFT', // DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED
  },
  assigned_to_group: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  timeline: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  workflow_instance_id: {
    type: DataTypes.UUID,
  },
  createdBy: {
    type: DataTypes.UUID,
  },
  updatedBy: {
    type: DataTypes.UUID,
  }
}, {
  sequelize,
  modelName: 'ContractRequest',
  tableName: 'contract_requests',
  timestamps: true,
  paranoid: true,
});

module.exports = ContractRequest;
