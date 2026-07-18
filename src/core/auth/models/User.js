const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../database');

class User extends Model {}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: {
    type: DataTypes.STRING,
  },
  lastName: {
    type: DataTypes.STRING,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  role: {
    type: DataTypes.ENUM(
      'BUSINESS_USER',
      'DEPARTMENT_HEAD',
      'PROCUREMENT',
      'LEGAL',
      'SUPER_ADMIN'
    ),
    defaultValue: 'BUSINESS_USER',
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.UUID,
  },
  updatedBy: {
    type: DataTypes.UUID,
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  paranoid: true, // Soft delete (deletedAt)
});

module.exports = User;
