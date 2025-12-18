import { Logger } from '@pgpmjs/logger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

import {
  DEFAULT_ROLE_NAMES,
  EnsureBaseRolesOptions,
  EnsureLoginRoleOptions,
  EnsureRoleMembershipsOptions,
  GrantConnectOptions,
  CreateDbUserOptions,
  RoleNameMapping
} from './types';

const log = new Logger('role-utils');

/**
 * Load a SQL template file from the sql directory
 */
function loadSqlTemplate(templateName: string): string {
  const sqlPath = join(__dirname, 'sql', `${templateName}.sql`);
  return readFileSync(sqlPath, 'utf-8');
}

/**
 * Get resolved role names with defaults
 */
export function getRoleNames(roleNames?: RoleNameMapping): Required<RoleNameMapping> {
  return {
    ...DEFAULT_ROLE_NAMES,
    ...(roleNames || {})
  };
}

/**
 * Ensure base roles exist (anonymous, authenticated, administrator)
 * Creates the three standard NOLOGIN group roles with appropriate attributes
 */
export async function ensureBaseRoles(
  pool: Pool,
  options: EnsureBaseRolesOptions = {}
): Promise<void> {
  const names = getRoleNames(options.roleNames);
  
  log.info('Ensuring base roles exist...');
  
  const sql = loadSqlTemplate('ensure-base-roles');
  
  await pool.query(sql, [names.anonymous, names.authenticated, names.administrator]);
  
  log.success('Base roles ensured successfully');
}

/**
 * Ensure a login role exists with the given username and password
 * Optionally uses advisory locks for concurrent CI/CD safety
 */
export async function ensureLoginRole(
  pool: Pool,
  options: EnsureLoginRoleOptions
): Promise<void> {
  const { username, password, useLocks = false, lockNamespace = 42 } = options;
  
  log.info(`Ensuring login role exists: ${username}...`);
  
  const sql = loadSqlTemplate('ensure-login-role');
  
  await pool.query(sql, [username, password, useLocks, lockNamespace]);
  
  log.success(`Login role ensured: ${username}`);
}

/**
 * Ensure role membership (grant a role to a user)
 * Optionally uses advisory locks for concurrent CI/CD safety
 */
export async function ensureRoleMembership(
  pool: Pool,
  roleToGrant: string,
  username: string,
  options: {
    useLocks?: boolean;
    lockNamespace?: number;
    onMissingRole?: 'error' | 'notice' | 'ignore';
  } = {}
): Promise<void> {
  const { useLocks = false, lockNamespace = 43, onMissingRole = 'notice' } = options;
  
  const sql = loadSqlTemplate('ensure-membership');
  
  await pool.query(sql, [roleToGrant, username, useLocks, lockNamespace, onMissingRole]);
}

/**
 * Ensure multiple role memberships for a user
 * Grants all specified roles to the user
 */
export async function ensureRoleMemberships(
  pool: Pool,
  options: EnsureRoleMembershipsOptions
): Promise<void> {
  const { 
    username, 
    rolesToGrant, 
    useLocks = false, 
    lockNamespace = 43, 
    onMissingRole = 'notice' 
  } = options;
  
  log.info(`Ensuring role memberships for ${username}: ${rolesToGrant.join(', ')}...`);
  
  for (const role of rolesToGrant) {
    await ensureRoleMembership(pool, role, username, {
      useLocks,
      lockNamespace,
      onMissingRole
    });
  }
  
  log.success(`Role memberships ensured for ${username}`);
}

/**
 * Grant CONNECT privilege on a database to a role
 */
export async function grantConnect(
  pool: Pool,
  options: GrantConnectOptions
): Promise<void> {
  const { roleName, dbName } = options;
  
  log.info(`Granting CONNECT on ${dbName} to ${roleName}...`);
  
  const sql = loadSqlTemplate('grant-connect');
  
  await pool.query(sql, [roleName, dbName]);
  
  log.success(`CONNECT granted on ${dbName} to ${roleName}`);
}

/**
 * Create a database user with role memberships
 * This is a convenience function that combines ensureLoginRole and ensureRoleMemberships
 */
export async function createDbUser(
  pool: Pool,
  options: CreateDbUserOptions
): Promise<void> {
  const {
    username,
    password,
    rolesToGrant,
    useLocks = false,
    lockNamespace = 42,
    onMissingRole = 'notice',
    roleNames
  } = options;
  
  const names = getRoleNames(roleNames);
  
  // Default roles to grant if not specified
  const roles = rolesToGrant || [names.anonymous, names.authenticated];
  
  log.info(`Creating database user: ${username}...`);
  
  // Ensure login role exists
  await ensureLoginRole(pool, {
    username,
    password,
    useLocks,
    lockNamespace
  });
  
  // Grant role memberships
  await ensureRoleMemberships(pool, {
    username,
    rolesToGrant: roles,
    useLocks,
    lockNamespace: lockNamespace + 1, // Use different namespace for memberships
    onMissingRole
  });
  
  log.success(`Database user created: ${username}`);
}

/**
 * Create test users (app_user and app_admin) with appropriate role memberships
 * WARNING: This should NEVER be run on a production database!
 */
export async function createTestUsers(
  pool: Pool,
  options: {
    useLocks?: boolean;
    lockNamespace?: number;
    roleNames?: RoleNameMapping;
  } = {}
): Promise<void> {
  const { useLocks = false, lockNamespace = 42, roleNames } = options;
  const names = getRoleNames(roleNames);
  
  log.warn('WARNING: Creating test users - should NEVER be run on production!');
  
  // Create app_user with anonymous + authenticated
  await createDbUser(pool, {
    username: 'app_user',
    password: 'app_password',
    rolesToGrant: [names.anonymous, names.authenticated],
    useLocks,
    lockNamespace,
    roleNames
  });
  
  // Create app_admin with anonymous + authenticated + administrator
  await createDbUser(pool, {
    username: 'app_admin',
    password: 'admin_password',
    rolesToGrant: [names.anonymous, names.authenticated, names.administrator],
    useLocks,
    lockNamespace,
    roleNames
  });
  
  log.success('Test users created successfully');
}
