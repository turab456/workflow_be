const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../../core/database');

class ContractAttachment extends Model {}

ContractAttachment.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  contract_request_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file_type: {
    type: DataTypes.STRING, // e.g., application/pdf
  },
  file_size: {
    type: DataTypes.INTEGER, // in bytes
  },
  uploadedBy: {
    type: DataTypes.UUID,
  },
  deletedBy: {
    type: DataTypes.UUID,
  }
}, {
  sequelize,
  modelName: 'ContractAttachment',
  tableName: 'contract_attachments',
  timestamps: true,
  paranoid: true,
});

module.exports = ContractAttachment;
