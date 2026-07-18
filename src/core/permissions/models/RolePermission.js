const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../database');

class RolePermission extends Model {}

RolePermission.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  role_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  permission_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'RolePermission',
  tableName: 'role_permissions',
  timestamps: true,
});

module.exports = RolePermission;
