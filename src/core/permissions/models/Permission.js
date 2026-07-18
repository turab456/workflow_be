const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../database');

class Permission extends Model {}

Permission.init({
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
  module: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false, // create, read, update, delete, approve
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
  modelName: 'Permission',
  tableName: 'permissions',
  timestamps: true,
  paranoid: true,
});

module.exports = Permission;
