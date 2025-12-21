import { RoleMapping } from '@pgpmjs/types';

/**
 * Options for role management operations
 */
export interface RoleManagementOptions {
  useLocks?: boolean;
}

/**
 * Default role mapping - canonical role names
 */
export const DEFAULT_ROLES: Required<RoleMapping> = {
  anonymous: 'anonymous',
  authenticated: 'authenticated',
  administrator: 'administrator',
  default: 'anonymous'
};

/**
 * Get resolved role mapping with defaults
 */
export function getRoleMapping(config?: Partial<RoleMapping>): Required<RoleMapping> {
  return {
    ...DEFAULT_ROLES,
    ...(config || {})
  };
}

/**
 * Generate SQL to create base roles (anonymous, authenticated, administrator)
 */
export function generateCreateBaseRolesSQL(roles?: Partial<RoleMapping>): string {
  const r = getRoleMapping(roles);
  
  return `
BEGIN;
DO $do$
BEGIN
  -- ${r.anonymous}: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${r.anonymous}') THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I', '${r.anonymous}');
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
  
  -- ${r.authenticated}: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${r.authenticated}') THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I', '${r.authenticated}');
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
  
  -- ${r.administrator}: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${r.administrator}') THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I', '${r.administrator}');
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
END
$do$;

-- Set role attributes (safe to run even if role already exists)
ALTER USER ${r.anonymous} WITH NOCREATEDB;
ALTER USER ${r.anonymous} WITH NOSUPERUSER;
ALTER USER ${r.anonymous} WITH NOCREATEROLE;
ALTER USER ${r.anonymous} WITH NOLOGIN;
ALTER USER ${r.anonymous} WITH NOREPLICATION;
ALTER USER ${r.anonymous} WITH NOBYPASSRLS;

ALTER USER ${r.authenticated} WITH NOCREATEDB;
ALTER USER ${r.authenticated} WITH NOSUPERUSER;
ALTER USER ${r.authenticated} WITH NOCREATEROLE;
ALTER USER ${r.authenticated} WITH NOLOGIN;
ALTER USER ${r.authenticated} WITH NOREPLICATION;
ALTER USER ${r.authenticated} WITH NOBYPASSRLS;

ALTER USER ${r.administrator} WITH NOCREATEDB;
ALTER USER ${r.administrator} WITH NOSUPERUSER;
ALTER USER ${r.administrator} WITH NOCREATEROLE;
ALTER USER ${r.administrator} WITH NOLOGIN;
ALTER USER ${r.administrator} WITH NOREPLICATION;
-- administrator CAN bypass RLS
ALTER USER ${r.administrator} WITH BYPASSRLS;
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
  const escapedUsername = username.replace(/'/g, "''");
  const escapedPassword = password.replace(/'/g, "''");
  const lockStatement = useLocks 
    ? `PERFORM pg_advisory_xact_lock(42, hashtext(v_username));`
    : '';
  
  return `
BEGIN;
DO $do$
DECLARE
  v_username TEXT := '${escapedUsername}';
  v_password TEXT := '${escapedPassword}';
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
END
$do$;

-- Grant base roles to user
DO $do$
DECLARE
  v_username TEXT := '${escapedUsername}';
BEGIN
  -- Grant ${r.anonymous} to user
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = '${r.anonymous}' AND r2.rolname = v_username
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', '${r.anonymous}', v_username);
    EXCEPTION
      WHEN unique_violation THEN
        -- 23505: Membership was granted concurrently; safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- 42704: One of the roles doesn't exist; log notice and continue
        RAISE NOTICE 'Missing role when granting % to %', '${r.anonymous}', v_username;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
      WHEN invalid_grant_operation THEN
        -- 0LP01: Must surface this error - invalid grant operation
        RAISE;
    END;
  END IF;

  -- Grant ${r.authenticated} to user
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = '${r.authenticated}' AND r2.rolname = v_username
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', '${r.authenticated}', v_username);
    EXCEPTION
      WHEN unique_violation THEN
        -- 23505: Membership was granted concurrently; safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- 42704: One of the roles doesn't exist; log notice and continue
        RAISE NOTICE 'Missing role when granting % to %', '${r.authenticated}', v_username;
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
 * Generate SQL to create test users (app_user, app_admin) with hardcoded passwords
 */
export function generateCreateTestUsersSQL(roles?: Partial<RoleMapping>): string {
  const r = getRoleMapping(roles);
  
  return `
BEGIN;
DO $do$
BEGIN
  -- app_user: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', 'app_user', 'app_password');
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
  
  -- app_admin: pre-check + exception handling for TOCTOU safety
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'app_admin') THEN
    BEGIN
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', 'app_admin', 'admin_password');
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
END
$do$;

DO $do$
BEGIN
  -- Grant ${r.anonymous} to app_user
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = '${r.anonymous}' AND r2.rolname = 'app_user'
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', '${r.anonymous}', 'app_user');
    EXCEPTION
      WHEN unique_violation THEN NULL;
      WHEN undefined_object THEN RAISE NOTICE 'Missing role when granting % to %', '${r.anonymous}', 'app_user';
      WHEN insufficient_privilege THEN RAISE;
      WHEN invalid_grant_operation THEN RAISE;
    END;
  END IF;

  -- Grant ${r.authenticated} to app_user
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = '${r.authenticated}' AND r2.rolname = 'app_user'
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', '${r.authenticated}', 'app_user');
    EXCEPTION
      WHEN unique_violation THEN NULL;
      WHEN undefined_object THEN RAISE NOTICE 'Missing role when granting % to %', '${r.authenticated}', 'app_user';
      WHEN insufficient_privilege THEN RAISE;
      WHEN invalid_grant_operation THEN RAISE;
    END;
  END IF;

  -- Grant ${r.anonymous} to ${r.administrator}
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = '${r.anonymous}' AND r2.rolname = '${r.administrator}'
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', '${r.anonymous}', '${r.administrator}');
    EXCEPTION
      WHEN unique_violation THEN NULL;
      WHEN undefined_object THEN RAISE NOTICE 'Missing role when granting % to %', '${r.anonymous}', '${r.administrator}';
      WHEN insufficient_privilege THEN RAISE;
      WHEN invalid_grant_operation THEN RAISE;
    END;
  END IF;

  -- Grant ${r.authenticated} to ${r.administrator}
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = '${r.authenticated}' AND r2.rolname = '${r.administrator}'
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', '${r.authenticated}', '${r.administrator}');
    EXCEPTION
      WHEN unique_violation THEN NULL;
      WHEN undefined_object THEN RAISE NOTICE 'Missing role when granting % to %', '${r.authenticated}', '${r.administrator}';
      WHEN insufficient_privilege THEN RAISE;
      WHEN invalid_grant_operation THEN RAISE;
    END;
  END IF;

  -- Grant ${r.administrator} to app_admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = '${r.administrator}' AND r2.rolname = 'app_admin'
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', '${r.administrator}', 'app_admin');
    EXCEPTION
      WHEN unique_violation THEN NULL;
      WHEN undefined_object THEN RAISE NOTICE 'Missing role when granting % to %', '${r.administrator}', 'app_admin';
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
  const escapedRole = role.replace(/'/g, "''");
  const escapedUser = user.replace(/'/g, "''");
  
  return `
DO $$
DECLARE
  v_user TEXT := '${escapedUser}';
  v_role TEXT := '${escapedRole}';
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
  const escapedUsername = username.replace(/'/g, "''");
  const lockStatement = useLocks 
    ? `PERFORM pg_advisory_xact_lock(42, hashtext(v_username));`
    : '';
  
  return `
BEGIN;
DO $do$
DECLARE
  v_username TEXT := '${escapedUsername}';
BEGIN
  ${lockStatement}
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = v_username
  ) THEN
    -- REVOKE ${r.anonymous} membership
    BEGIN
      EXECUTE format('REVOKE %I FROM %I', '${r.anonymous}', v_username);
    EXCEPTION
      WHEN undefined_object THEN
        -- 42704: Role doesn't exist; safe to ignore
        NULL;
      WHEN insufficient_privilege THEN
        -- 42501: Must surface this error - caller lacks permission
        RAISE;
    END;

    -- REVOKE ${r.authenticated} membership
    BEGIN
      EXECUTE format('REVOKE %I FROM %I', '${r.authenticated}', v_username);
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
  const escapedUsername = username.replace(/'/g, "''");
  const escapedPassword = password.replace(/'/g, "''");
  const lockStatement = useLocks 
    ? `PERFORM pg_advisory_xact_lock(42, hashtext(v_user));`
    : '';
  
  const grantBlocks = rolesToGrant.map(role => {
    const escapedRole = role.replace(/'/g, "''");
    return `
        -- Grant ${escapedRole}
        IF NOT EXISTS (
          SELECT 1 FROM pg_auth_members am
          JOIN pg_roles r1 ON am.roleid = r1.oid
          JOIN pg_roles r2 ON am.member = r2.oid
          WHERE r1.rolname = '${escapedRole}' AND r2.rolname = v_user
        ) THEN
          BEGIN
            EXECUTE format('GRANT %I TO %I', '${escapedRole}', v_user);
          EXCEPTION
            WHEN unique_violation THEN NULL;
            WHEN undefined_object THEN RAISE NOTICE 'Missing role when granting % to %', '${escapedRole}', v_user;
            WHEN insufficient_privilege THEN RAISE;
            WHEN invalid_grant_operation THEN RAISE;
          END;
        END IF;`;
  }).join('\n');
  
  return `
DO $$
DECLARE
  v_user TEXT := '${escapedUsername}';
  v_password TEXT := '${escapedPassword}';
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
