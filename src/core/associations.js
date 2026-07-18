/**
 * associations.js
 * Defines all Sequelize model associations.
 * Must be required AFTER all models are loaded.
 */

const User        = require('./auth/models/User');
const Role        = require('./roles/models/Role');
const UserRole    = require('./roles/models/UserRole');
const Permission  = require('./permissions/models/Permission');
const RolePermission = require('./permissions/models/RolePermission');

// User <-> Role (many-to-many through user_roles)
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'user_id',
  otherKey: 'role_id',
  as: 'roles',
});

Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'role_id',
  otherKey: 'user_id',
  as: 'users',
});

// Role <-> Permission (many-to-many through role_permissions)
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'role_id',
  otherKey: 'permission_id',
  as: 'permissions',
});

Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permission_id',
  otherKey: 'role_id',
  as: 'roles',
});
