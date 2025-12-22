import { pgpmDefaults, RoleMapping, DatabaseConnectionOptions } from '@pgpmjs/types';

/**
 * Options for role management operations
 */
export interface RoleManagementOptions {
  useLocks?: boolean;
}

/**
 * Options for test user creation
 */
export interface TestUserOptions {
  /** App user credentials (defaults from pgpmDefaults.db.connection) */
  appUser?: DatabaseConnectionOptions;
  /** App admin credentials */
  appAdmin?: {
    user?: string;
    password?: string;
  };
}

/**
 * Get resolved role mapping with defaults from pgpmDefaults
 */
export function getRoleMapping(config?: Partial<RoleMapping>): Required<RoleMapping> {
  const defaults = pgpmDefaults.db?.roles ?? {
    anonymous: 'anonymous',
    authenticated: 'authenticated',
    administrator: 'administrator',
    default: 'anonymous'
  };
  return {
    anonymous: defaults.anonymous ?? 'anonymous',
    authenticated: defaults.authenticated ?? 'authenticated',
    administrator: defaults.administrator ?? 'administrator',
    default: defaults.default ?? 'anonymous',
    ...(config || {})
  };
}

/**
 * Get resolved test user credentials with defaults from pgpmDefaults
 */
function getTestUserDefaults(options?: TestUserOptions): {
  appUser: { user: string; password: string };
  appAdmin: { user: string; password: string };
} {
  const connDefaults = pgpmDefaults.db?.connection ?? {
    user: 'app_user',
    password: 'app_password'
  };
  
  return {
    appUser: {
      user: options?.appUser?.user ?? connDefaults.user ?? 'app_user',
      password: options?.appUser?.password ?? connDefaults.password ?? 'app_password'
    },
    appAdmin: {
      user: options?.appAdmin?.user ?? 'app_admin',
      password: options?.appAdmin?.password ?? 'admin_password'
    }
  };
}

/**
 * Safely escape a string for use as a SQL string literal.
 * Doubles single quotes and wraps in single quotes.
 */
function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Generate SQL to create base roles (anonymous, authenticated, administrator)
 */
export function generateCreateBaseRolesSQL(roles?: Partial<RoleMapping>): string {
  const r = getRoleMapping(roles);
  
  return `
BEGIN;
DO $do$
DECLARE
  v_anonymous text := ${sqlLiteral(r.anonymous)};
  v_authenticated text := ${sqlLiteral(r.authenticated)};
  v_administrator text := ${sqlLiteral(r.administrator)};
BEGIN
  -- Create anonymous role: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_anonymous) THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I', v_anonymous);
    EXCEPTION
      WHEN duplicate_object THEN
        -- 42710: Role already exists (race condition); safe to ignore
        NULL;
      WHEN unique_violation THEN
        -- 23505: Concurrent CREATE ROLE hit unique index; safe to ignore
        NULL;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
    END;
  END IF;
  
  -- Create authenticated role: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_authenticated) THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I', v_authenticated);
    EXCEPTION
      WHEN duplicate_object THEN
        -- 42710: Role already exists (race condition); safe to ignore
        NULL;
      WHEN unique_violation THEN
        -- 23505: Concurrent CREATE ROLE hit unique index; safe to ignore
        NULL;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
    END;
  END IF;
  
  -- Create administrator role: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_administrator) THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I', v_administrator);
    EXCEPTION
      WHEN duplicate_object THEN
        -- 42710: Role already exists (race condition); safe to ignore
        NULL;
      WHEN unique_violation THEN
        -- 23505: Concurrent CREATE ROLE hit unique index; safe to ignore
        NULL;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
    END;
  END IF;
  
  -- Set role attributes (safe to run even if role already exists)
  EXECUTE format('ALTER ROLE %I WITH NOCREATEDB NOSUPERUSER NOCREATEROLE NOLOGIN NOREPLICATION NOBYPASSRLS', v_anonymous);
  EXECUTE format('ALTER ROLE %I WITH NOCREATEDB NOSUPERUSER NOCREATEROLE NOLOGIN NOREPLICATION NOBYPASSRLS', v_authenticated);
  EXECUTE format('ALTER ROLE %I WITH NOCREATEDB NOSUPERUSER NOCREATEROLE NOLOGIN NOREPLICATION BYPASSRLS', v_administrator);
END
$do$;
COMMIT;
`;
}

/**
 * Generate SQL to create a user with password and grant base roles
 */
export function generateCreateUserSQL(
  username: string, 
  password: string, 
  roles?: Partial<RoleMapping>,
  options?: RoleManagementOptions
): string {
  const r = getRoleMapping(roles);
  const useLocks = options?.useLocks ?? false;
  const lockStatement = useLocks 
    ? `PERFORM pg_advisory_xact_lock(42, hashtext(v_username));`
    : '';
  
  return `
BEGIN;
DO $do$
DECLARE
  v_username text := ${sqlLiteral(username)};
  v_password text := ${sqlLiteral(password)};
  v_anonymous text := ${sqlLiteral(r.anonymous)};
  v_authenticated text := ${sqlLiteral(r.authenticated)};
BEGIN
  ${lockStatement}
  -- Pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_username) THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', v_username, v_password);
    EXCEPTION
      WHEN duplicate_object THEN
        -- 42710: Role already exists (race condition); safe to ignore
        NULL;
      WHEN unique_violation THEN
        -- 23505: Concurrent CREATE ROLE hit unique index; safe to ignore
        NULL;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
    END;
  END IF;

  -- Grant anonymous to user
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = v_anonymous AND r2.rolname = v_username
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', v_anonymous, v_username);
    EXCEPTION
      WHEN unique_violation THEN
        -- 23505: Membership was granted concurrently; safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- 42704: One of the roles doesn't exist; log notice and continue
        RAISE NOTICE 'Missing role when granting % to %', v_anonymous, v_username;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
      WHEN invalid_grant_operation THEN
        -- 0LP01: Must surface this error - invalid grant operation
        RAISE;
    END;
  END IF;

  -- Grant authenticated to user
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = v_authenticated AND r2.rolname = v_username
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', v_authenticated, v_username);
    EXCEPTION
      WHEN unique_violation THEN
        -- 23505: Membership was granted concurrently; safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- 42704: One of the roles doesn't exist; log notice and continue
        RAISE NOTICE 'Missing role when granting % to %', v_authenticated, v_username;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
      WHEN invalid_grant_operation THEN
        -- 0LP01: Must surface this error - invalid grant operation
        RAISE;
    END;
  END IF;
END
$do$;
COMMIT;
`;
}

/**
 * Generate SQL to create test users with grants to base roles.
 * Defaults to app_user/app_password and app_admin/admin_password from pgpmDefaults.
 */
export function generateCreateTestUsersSQL(
  roles?: Partial<RoleMapping>,
  testUsers?: TestUserOptions
): string {
  const r = getRoleMapping(roles);
  const users = getTestUserDefaults(testUsers);
  
  return `
BEGIN;
DO $do$
DECLARE
  v_app_user text := ${sqlLiteral(users.appUser.user)};
  v_app_user_password text := ${sqlLiteral(users.appUser.password)};
  v_app_admin text := ${sqlLiteral(users.appAdmin.user)};
  v_app_admin_password text := ${sqlLiteral(users.appAdmin.password)};
  v_anonymous text := ${sqlLiteral(r.anonymous)};
  v_authenticated text := ${sqlLiteral(r.authenticated)};
  v_administrator text := ${sqlLiteral(r.administrator)};
BEGIN
  -- Create app_user: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_app_user) THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', v_app_user, v_app_user_password);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN unique_violation THEN NULL;
      WHEN insufficient_privilege THEN RAISE;
    END;
  END IF;
  
  -- Create app_admin: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_app_admin) THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', v_app_admin, v_app_admin_password);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN unique_violation THEN NULL;
      WHEN insufficient_privilege THEN RAISE;
    END;
  END IF;

  -- Grant anonymous to app_user
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = v_anonymous AND r2.rolname = v_app_user
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', v_anonymous, v_app_user);
    EXCEPTION
      WHEN unique_violation THEN NULL;
      WHEN undefined_object THEN RAISE NOTICE 'Missing role when granting % to %', v_anonymous, v_app_user;
      WHEN insufficient_privilege THEN RAISE;
      WHEN invalid_grant_operation THEN RAISE;
    END;
  END IF;

  -- Grant authenticated to app_user
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = v_authenticated AND r2.rolname = v_app_user
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', v_authenticated, v_app_user);
    EXCEPTION
      WHEN unique_violation THEN NULL;
      WHEN undefined_object THEN RAISE NOTICE 'Missing role when granting % to %', v_authenticated, v_app_user;
      WHEN insufficient_privilege THEN RAISE;
      WHEN invalid_grant_operation THEN RAISE;
    END;
  END IF;

  -- Grant anonymous to administrator
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = v_anonymous AND r2.rolname = v_administrator
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', v_anonymous, v_administrator);
    EXCEPTION
      WHEN unique_violation THEN NULL;
      WHEN undefined_object THEN RAISE NOTICE 'Missing role when granting % to %', v_anonymous, v_administrator;
      WHEN insufficient_privilege THEN RAISE;
      WHEN invalid_grant_operation THEN RAISE;
    END;
  END IF;

  -- Grant authenticated to administrator
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = v_authenticated AND r2.rolname = v_administrator
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', v_authenticated, v_administrator);
    EXCEPTION
      WHEN unique_violation THEN NULL;
      WHEN undefined_object THEN RAISE NOTICE 'Missing role when granting % to %', v_authenticated, v_administrator;
      WHEN insufficient_privilege THEN RAISE;
      WHEN invalid_grant_operation THEN RAISE;
    END;
  END IF;

  -- Grant administrator to app_admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = v_administrator AND r2.rolname = v_app_admin
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', v_administrator, v_app_admin);
    EXCEPTION
      WHEN unique_violation THEN NULL;
      WHEN undefined_object THEN RAISE NOTICE 'Missing role when granting % to %', v_administrator, v_app_admin;
      WHEN insufficient_privilege THEN RAISE;
      WHEN invalid_grant_operation THEN RAISE;
    END;
  END IF;
END
$do$;
COMMIT;
`;
}

/**
 * Generate SQL to grant a role to a user
 */
export function generateGrantRoleSQL(
  role: string, 
  user: string
): string {
  return `
DO $$
DECLARE
  v_user text := ${sqlLiteral(user)};
  v_role text := ${sqlLiteral(role)};
BEGIN
  -- Pre-check to avoid unnecessary GRANTs; still catch TOCTOU under concurrency
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = v_role AND r2.rolname = v_user
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', v_role, v_user);
    EXCEPTION
      WHEN unique_violation THEN
        -- 23505: Concurrent membership grant; safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- 42704: Role or user missing; emit notice and continue
        RAISE NOTICE 'Missing role when granting % to %', v_role, v_user;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
      WHEN invalid_grant_operation THEN
        -- 0LP01: Must surface this error - invalid grant operation
        RAISE;
    END;
  END IF;
END
$$;
`;
}

/**
 * Generate SQL to remove a user and revoke grants
 */
export function generateRemoveUserSQL(
  username: string, 
  roles?: Partial<RoleMapping>,
  options?: RoleManagementOptions
): string {
  const r = getRoleMapping(roles);
  const useLocks = options?.useLocks ?? false;
  const lockStatement = useLocks 
    ? `PERFORM pg_advisory_xact_lock(42, hashtext(v_username));`
    : '';
  
  return `
BEGIN;
DO $do$
DECLARE
  v_username text := ${sqlLiteral(username)};
  v_anonymous text := ${sqlLiteral(r.anonymous)};
  v_authenticated text := ${sqlLiteral(r.authenticated)};
BEGIN
  ${lockStatement}
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = v_username
  ) THEN
    -- REVOKE anonymous membership
    BEGIN
      EXECUTE format('REVOKE %I FROM %I', v_anonymous, v_username);
    EXCEPTION
      WHEN undefined_object THEN
        -- 42704: Role doesn't exist; safe to ignore
        NULL;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
    END;

    -- REVOKE authenticated membership
    BEGIN
      EXECUTE format('REVOKE %I FROM %I', v_authenticated, v_username);
    EXCEPTION
      WHEN undefined_object THEN
        -- 42704: Role doesn't exist; safe to ignore
        NULL;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
    END;

    -- DROP ROLE
    BEGIN
      EXECUTE format('DROP ROLE %I', v_username);
    EXCEPTION
      WHEN undefined_object THEN
        -- 42704: Role doesn't exist; safe to ignore
        NULL;
      WHEN dependent_objects_still_exist THEN
        -- 2BP01: Must surface this error - role has dependent objects
        RAISE;
      WHEN object_in_use THEN
        -- 55006: Must surface this error - role is in use
        RAISE;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
    END;
  END IF;
END
$do$;
COMMIT;
`;
}

/**
 * Generate SQL to create a user with grants to specified roles (for test harness)
 */
export function generateCreateUserWithGrantsSQL(
  username: string,
  password: string,
  rolesToGrant: string[],
  options?: RoleManagementOptions
): string {
  const useLocks = options?.useLocks ?? false;
  const lockStatement = useLocks 
    ? `PERFORM pg_advisory_xact_lock(42, hashtext(v_user));`
    : '';
  
  // Generate variable declarations for all roles
  const roleVarDeclarations = rolesToGrant.map((role, i) => 
    `  v_role_${i} text := ${sqlLiteral(role)};`
  ).join('\n');
  
  // Generate grant blocks using the variables
  const grantBlocks = rolesToGrant.map((_, i) => `
        -- Grant role ${i}
        IF NOT EXISTS (
          SELECT 1 FROM pg_auth_members am
          JOIN pg_roles r1 ON am.roleid = r1.oid
          JOIN pg_roles r2 ON am.member = r2.oid
          WHERE r1.rolname = v_role_${i} AND r2.rolname = v_user
        ) THEN
          BEGIN
            EXECUTE format('GRANT %I TO %I', v_role_${i}, v_user);
          EXCEPTION
            WHEN unique_violation THEN NULL;
            WHEN undefined_object THEN RAISE NOTICE 'Missing role when granting % to %', v_role_${i}, v_user;
            WHEN insufficient_privilege THEN RAISE;
            WHEN invalid_grant_operation THEN RAISE;
          END;
        END IF;`
  ).join('\n');
  
  return `
DO $$
DECLARE
  v_user text := ${sqlLiteral(username)};
  v_password text := ${sqlLiteral(password)};
${roleVarDeclarations}
BEGIN
  ${lockStatement}
  -- Create role: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_user) THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', v_user, v_password);
    EXCEPTION
      WHEN duplicate_object THEN
        -- 42710: Role already exists (race condition); safe to ignore
        NULL;
      WHEN unique_violation THEN
        -- 23505: Concurrent CREATE ROLE hit unique index; safe to ignore
        NULL;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
    END;
  END IF;
${grantBlocks}
END $$;
`;
}
