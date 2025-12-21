import { Logger } from '@pgpmjs/logger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import { PgConfig } from 'pg-env';

const log = new Logger('init');

export interface RoleManagementOptions {
  useLocks?: boolean;
}

export class PgpmInit {
  private pool: Pool;
  private pgConfig: PgConfig;

  constructor(config: PgConfig) {
    this.pgConfig = config;
    this.pool = getPgPool(this.pgConfig);
  }

  /**
   * Bootstrap standard roles (anonymous, authenticated, administrator)
   */
  async bootstrapRoles(): Promise<void> {
    try {
      log.info('Bootstrapping PGPM roles...');
      
      const sqlPath = join(__dirname, 'sql', 'bootstrap-roles.sql');
      const sql = readFileSync(sqlPath, 'utf-8');
      
      await this.pool.query(sql);
      
      log.success('Successfully bootstrapped PGPM roles');
    } catch (error) {
      log.error('Failed to bootstrap roles:', error);
      throw error;
    }
  }

  /**
   * Bootstrap test roles (roles only, no users)
   */
  async bootstrapTestRoles(): Promise<void> {
    try {
      log.warn('WARNING: This command creates test roles and should NEVER be run on a production database!');
      log.info('Bootstrapping PGPM test roles...');
      
      const sqlPath = join(__dirname, 'sql', 'bootstrap-test-roles.sql');
      const sql = readFileSync(sqlPath, 'utf-8');
      
      await this.pool.query(sql);
      
      log.success('Successfully bootstrapped PGPM test roles');
    } catch (error) {
      log.error('Failed to bootstrap test roles:', error);
      throw error;
    }
  }

  /**
   * Bootstrap database roles with custom username and password
   * @param username - The username to create
   * @param password - The password for the user
   * @param options - Optional settings including useLocks for advisory locking
   */
  async bootstrapDbRoles(username: string, password: string, options?: RoleManagementOptions): Promise<void> {
    try {
      log.info(`Bootstrapping PGPM database roles for user: ${username}...`);
      
      const useLocks = options?.useLocks ?? false;
      const lockStatement = useLocks 
        ? `PERFORM pg_advisory_xact_lock(42, hashtext(v_username));`
        : '';
      
      const sql = `
BEGIN;
DO $do$
DECLARE
  v_username TEXT := '${username.replace(/'/g, "''")}';
  v_password TEXT := '${password.replace(/'/g, "''")}';
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

-- Robust GRANTs under concurrency: GRANT can race on pg_auth_members unique index.
-- Pre-check + exception handling for TOCTOU safety.
DO $do$
DECLARE
  v_username TEXT := '${username.replace(/'/g, "''")}';
BEGIN
  -- Grant anonymous to user
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = 'anonymous' AND r2.rolname = v_username
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', 'anonymous', v_username);
    EXCEPTION
      WHEN unique_violation THEN
        -- 23505: Membership was granted concurrently; safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- 42704: One of the roles doesn't exist; log notice and continue
        RAISE NOTICE 'Missing role when granting % to %', 'anonymous', v_username;
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
    WHERE r1.rolname = 'authenticated' AND r2.rolname = v_username
  ) THEN
    BEGIN
      EXECUTE format('GRANT %I TO %I', 'authenticated', v_username);
    EXCEPTION
      WHEN unique_violation THEN
        -- 23505: Membership was granted concurrently; safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- 42704: One of the roles doesn't exist; log notice and continue
        RAISE NOTICE 'Missing role when granting % to %', 'authenticated', v_username;
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
      
      await this.pool.query(sql);
      
      log.success(`Successfully bootstrapped PGPM database roles for user: ${username}`);
    } catch (error) {
      log.error(`Failed to bootstrap database roles for user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Remove database roles and revoke grants
   * @param username - The username to remove
   * @param options - Optional settings including useLocks for advisory locking
   */
  async removeDbRoles(username: string, options?: RoleManagementOptions): Promise<void> {
    try {
      log.info(`Removing PGPM database roles for user: ${username}...`);
      
      const useLocks = options?.useLocks ?? false;
      const lockStatement = useLocks 
        ? `PERFORM pg_advisory_xact_lock(42, hashtext(v_username));`
        : '';
      
      const sql = `
BEGIN;
DO $do$
DECLARE
  v_username TEXT := '${username.replace(/'/g, "''")}';
BEGIN
  ${lockStatement}
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = v_username
  ) THEN
    -- REVOKE anonymous membership
    BEGIN
      EXECUTE format('REVOKE %I FROM %I', 'anonymous', v_username);
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
      EXECUTE format('REVOKE %I FROM %I', 'authenticated', v_username);
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
      
      await this.pool.query(sql);
      
      log.success(`Successfully removed PGPM database roles for user: ${username}`);
    } catch (error) {
      log.error(`Failed to remove database roles for user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
  }
}
