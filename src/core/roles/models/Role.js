const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../database');

class Role extends Model {}

Role.init({
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
  createdBy: {
    type: DataTypes.UUID,
  },
  updatedBy: {
    type: DataTypes.UUID,
  }
}, {
  sequelize,
  modelName: 'Role',
  tableName: 'roles',
  timestamps: true,
  paranoid: true,
});

module.exports = Role;
