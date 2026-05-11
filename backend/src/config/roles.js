/**
 * Role-based access control configuration
 * Defines permissions for each role in the system
 */

export const ROLES = {
  ADMIN: 'admin',
  RESEARCHER: 'researcher',
  VIEWER: 'viewer'
};

export const PERMISSIONS = {
  // User management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_MANAGE_ROLES: 'user:manage_roles',
  
  // Simulation management
  SIMULATION_CREATE: 'simulation:create',
  SIMULATION_READ: 'simulation:read',
  SIMULATION_UPDATE: 'simulation:update',
  SIMULATION_DELETE: 'simulation:delete',
  SIMULATION_EXECUTE: 'simulation:execute',
  
  // Traffic data management
  DATA_UPLOAD: 'data:upload',
  DATA_READ: 'data:read',
  DATA_UPDATE: 'data:update',
  DATA_DELETE: 'data:delete',
  DATA_VALIDATE: 'data:validate',
  
  // ML Model management
  MODEL_TRAIN: 'model:train',
  MODEL_READ: 'model:read',
  MODEL_UPDATE: 'model:update',
  MODEL_DELETE: 'model:delete',
  MODEL_DEPLOY: 'model:deploy',
  
  // RL Agent management
  AGENT_CREATE: 'agent:create',
  AGENT_READ: 'agent:read',
  AGENT_UPDATE: 'agent:update',
  AGENT_DELETE: 'agent:delete',
  AGENT_TRAIN: 'agent:train',
  AGENT_DEPLOY: 'agent:deploy',
  
  // Analytics and reports
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
  REPORT_GENERATE: 'report:generate',
  REPORT_READ: 'report:read',
  REPORT_DELETE: 'report:delete',
  
  // System configuration
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOGS: 'system:logs'
};

/**
 * Role permissions mapping
 */
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    // Full access to everything
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_MANAGE_ROLES,
    PERMISSIONS.SIMULATION_CREATE,
    PERMISSIONS.SIMULATION_READ,
    PERMISSIONS.SIMULATION_UPDATE,
    PERMISSIONS.SIMULATION_DELETE,
    PERMISSIONS.SIMULATION_EXECUTE,
    PERMISSIONS.DATA_UPLOAD,
    PERMISSIONS.DATA_READ,
    PERMISSIONS.DATA_UPDATE,
    PERMISSIONS.DATA_DELETE,
    PERMISSIONS.DATA_VALIDATE,
    PERMISSIONS.MODEL_TRAIN,
    PERMISSIONS.MODEL_READ,
    PERMISSIONS.MODEL_UPDATE,
    PERMISSIONS.MODEL_DELETE,
    PERMISSIONS.MODEL_DEPLOY,
    PERMISSIONS.AGENT_CREATE,
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.AGENT_UPDATE,
    PERMISSIONS.AGENT_DELETE,
    PERMISSIONS.AGENT_TRAIN,
    PERMISSIONS.AGENT_DEPLOY,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.REPORT_GENERATE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_DELETE,
    PERMISSIONS.SYSTEM_CONFIG,
    PERMISSIONS.SYSTEM_LOGS
  ],
  
  [ROLES.RESEARCHER]: [
    // Can read own user info
    PERMISSIONS.USER_READ,
    // Full simulation access
    PERMISSIONS.SIMULATION_CREATE,
    PERMISSIONS.SIMULATION_READ,
    PERMISSIONS.SIMULATION_UPDATE,
    PERMISSIONS.SIMULATION_DELETE,
    PERMISSIONS.SIMULATION_EXECUTE,
    // Can upload and manage data
    PERMISSIONS.DATA_UPLOAD,
    PERMISSIONS.DATA_READ,
    PERMISSIONS.DATA_UPDATE,
    PERMISSIONS.DATA_DELETE,
    PERMISSIONS.DATA_VALIDATE,
    // Full model access
    PERMISSIONS.MODEL_TRAIN,
    PERMISSIONS.MODEL_READ,
    PERMISSIONS.MODEL_UPDATE,
    PERMISSIONS.MODEL_DELETE,
    PERMISSIONS.MODEL_DEPLOY,
    // Full agent access
    PERMISSIONS.AGENT_CREATE,
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.AGENT_UPDATE,
    PERMISSIONS.AGENT_DELETE,
    PERMISSIONS.AGENT_TRAIN,
    PERMISSIONS.AGENT_DEPLOY,
    // Full analytics access
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.REPORT_GENERATE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_DELETE
  ],
  
  [ROLES.VIEWER]: [
    // Can read own user info
    PERMISSIONS.USER_READ,
    // Read-only simulation access
    PERMISSIONS.SIMULATION_READ,
    // Read-only data access
    PERMISSIONS.DATA_READ,
    // Read-only model access
    PERMISSIONS.MODEL_READ,
    // Read-only agent access
    PERMISSIONS.AGENT_READ,
    // Read-only analytics access
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.REPORT_READ
  ]
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} True if role has permission
 */
export const hasPermission = (role, permission) => {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
};

/**
 * Check if a role has any of the specified permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} True if role has any of the permissions
 */
export const hasAnyPermission = (role, permissions) => {
  return permissions.some(permission => hasPermission(role, permission));
};

/**
 * Check if a role has all of the specified permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean} True if role has all of the permissions
 */
export const hasAllPermissions = (role, permissions) => {
  return permissions.every(permission => hasPermission(role, permission));
};

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {string[]} Array of permissions
 */
export const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};
