const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../database');

class UserRole extends Model {}

UserRole.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  role_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  assignedBy: {
    type: DataTypes.UUID,
  },
}, {
  sequelize,
  modelName: 'UserRole',
  tableName: 'user_roles',
  timestamps: true,
});

module.exports = UserRole;
