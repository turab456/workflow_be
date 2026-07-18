const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../../core/database');

class MasterContractType extends Model {}

MasterContractType.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.STRING,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.UUID,
  },
  updatedBy: {
    type: DataTypes.UUID,
  }
}, {
  sequelize,
  modelName: 'MasterContractType',
  tableName: 'master_contract_types',
  timestamps: true,
  paranoid: true,
});

module.exports = MasterContractType;
