import { Logger } from '@pgpmjs/logger';
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
 * Escape a SQL identifier (role name, database name, etc.)
 * This prevents SQL injection by properly quoting identifiers
 */
function escapeIdentifier(identifier: string): string {
  // Double any double quotes and wrap in double quotes
  return '"' + identifier.replace(/"/g, '""') + '"';
}

/**
 * Escape a SQL literal (string value)
 * This prevents SQL injection by properly quoting string literals
 */
function escapeLiteral(value: string): string {
  // Double any single quotes and wrap in single quotes
  return "'" + value.replace(/'/g, "''") + "'";
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
  
  // DO blocks don't support parameterized queries, so we use safe string interpolation
  // with format() inside PL/pgSQL for identifier escaping
  const sql = `
DO $do$
DECLARE
  v_anonymous TEXT := ${escapeLiteral(names.anonymous)};
  v_authenticated TEXT := ${escapeLiteral(names.authenticated)};
  v_administrator TEXT := ${escapeLiteral(names.administrator)};
BEGIN
  -- Create anonymous role
  BEGIN
    EXECUTE format('CREATE ROLE %I', v_anonymous);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
  
  -- Create authenticated role
  BEGIN
    EXECUTE format('CREATE ROLE %I', v_authenticated);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
  
  -- Create administrator role
  BEGIN
    EXECUTE format('CREATE ROLE %I', v_administrator);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
  
  -- Set role attributes (safe to run even if role already exists)
  EXECUTE format('ALTER ROLE %I WITH NOCREATEDB NOSUPERUSER NOCREATEROLE NOLOGIN NOREPLICATION NOBYPASSRLS', v_anonymous);
  EXECUTE format('ALTER ROLE %I WITH NOCREATEDB NOSUPERUSER NOCREATEROLE NOLOGIN NOREPLICATION NOBYPASSRLS', v_authenticated);
  EXECUTE format('ALTER ROLE %I WITH NOCREATEDB NOSUPERUSER NOCREATEROLE NOLOGIN NOREPLICATION BYPASSRLS', v_administrator);
END
$do$;
  `;
  
  await pool.query(sql);
  
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
  
  // DO blocks don't support parameterized queries, so we use safe string interpolation
  const sql = `
DO $do$
DECLARE
  v_username TEXT := ${escapeLiteral(username)};
  v_password TEXT := ${escapeLiteral(password)};
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_username) THEN
    BEGIN
      ${useLocks ? `PERFORM pg_advisory_xact_lock(${lockNamespace}, hashtext(v_username));` : '-- Locks disabled'}
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', v_username, v_password);
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
      WHEN unique_violation THEN
        NULL;
      WHEN insufficient_privilege THEN
        RAISE EXCEPTION 'Insufficient privileges to create role %: ensure the connecting user has CREATEROLE', v_username;
    END;
  END IF;
END
$do$;
  `;
  
  await pool.query(sql);
  
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
  
  // Build the exception handler based on onMissingRole option
  let undefinedObjectHandler: string;
  if (onMissingRole === 'error') {
    undefinedObjectHandler = `RAISE EXCEPTION 'Missing role when granting % to %', v_role_to_grant, v_username;`;
  } else if (onMissingRole === 'ignore') {
    undefinedObjectHandler = `NULL;`;
  } else {
    undefinedObjectHandler = `RAISE NOTICE 'Missing role when granting % to %', v_role_to_grant, v_username;`;
  }
  
  // DO blocks don't support parameterized queries, so we use safe string interpolation
  const sql = `
DO $do$
DECLARE
  v_role_to_grant TEXT := ${escapeLiteral(roleToGrant)};
  v_username TEXT := ${escapeLiteral(username)};
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = v_role_to_grant AND r2.rolname = v_username
  ) THEN
    BEGIN
      ${useLocks ? `PERFORM pg_advisory_xact_lock(${lockNamespace}, hashtext(v_role_to_grant || ':' || v_username));` : '-- Locks disabled'}
      EXECUTE format('GRANT %I TO %I', v_role_to_grant, v_username);
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
      WHEN undefined_object THEN
        ${undefinedObjectHandler}
    END;
  END IF;
END
$do$;
  `;
  
  await pool.query(sql);
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
  
  // DO blocks don't support parameterized queries, so we use safe string interpolation
  const sql = `
DO $do$
DECLARE
  v_role_name TEXT := ${escapeLiteral(roleName)};
  v_db_name TEXT := ${escapeLiteral(dbName)};
BEGIN
  BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', v_db_name, v_role_name);
  EXCEPTION
    WHEN undefined_object THEN
      RAISE NOTICE 'Role % does not exist, skipping GRANT CONNECT', v_role_name;
    WHEN invalid_catalog_name THEN
      RAISE NOTICE 'Database % does not exist, skipping GRANT CONNECT', v_db_name;
  END;
END
$do$;
  `;
  
  await pool.query(sql);
  
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
