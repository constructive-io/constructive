/**
 * Role name mapping for customizable role names
 */
export interface RoleNameMapping {
  anonymous?: string;
  authenticated?: string;
  administrator?: string;
}

/**
 * Default role names used throughout the system
 */
export const DEFAULT_ROLE_NAMES: Required<RoleNameMapping> = {
  anonymous: 'anonymous',
  authenticated: 'authenticated',
  administrator: 'administrator'
};

/**
 * How to handle missing base roles during membership grants
 */
export type OnMissingRoleAction = 'error' | 'notice' | 'ignore';

/**
 * Options for ensuring a login role exists
 */
export interface EnsureLoginRoleOptions {
  username: string;
  password: string;
  useLocks?: boolean;
  lockNamespace?: number;
}

/**
 * Options for ensuring role memberships
 */
export interface EnsureRoleMembershipsOptions {
  username: string;
  rolesToGrant: string[];
  useLocks?: boolean;
  lockNamespace?: number;
  onMissingRole?: OnMissingRoleAction;
}

/**
 * Options for ensuring base roles exist
 */
export interface EnsureBaseRolesOptions {
  roleNames?: RoleNameMapping;
}

/**
 * Options for granting database connect privilege
 */
export interface GrantConnectOptions {
  roleName: string;
  dbName: string;
}

/**
 * Combined options for creating a database user with memberships
 */
export interface CreateDbUserOptions {
  username: string;
  password: string;
  rolesToGrant?: string[];
  useLocks?: boolean;
  lockNamespace?: number;
  onMissingRole?: OnMissingRoleAction;
  roleNames?: RoleNameMapping;
}

/**
 * Options for bootstrapping test users
 */
export interface BootstrapTestUsersOptions {
  useLocks?: boolean;
  lockNamespace?: number;
  roleNames?: RoleNameMapping;
}
