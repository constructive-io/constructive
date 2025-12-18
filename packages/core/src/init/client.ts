import { Logger } from '@pgpmjs/logger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import { PgConfig } from 'pg-env';

import {
  ensureBaseRoles,
  ensureLoginRole,
  ensureRoleMemberships,
  createDbUser,
  createTestUsers,
  getRoleNames
} from './role-utils';
import {
  CreateDbUserOptions,
  BootstrapTestUsersOptions,
  RoleNameMapping
} from './types';

const log = new Logger('init');

export class PgpmInit {
  private pool: Pool;
  private pgConfig: PgConfig;

  constructor(config: PgConfig) {
    this.pgConfig = config;
    this.pool = getPgPool(this.pgConfig);
  }

  /**
   * Bootstrap standard roles (anonymous, authenticated, administrator)
   * Uses the new modular ensureBaseRoles function
   */
  async bootstrapRoles(options?: { roleNames?: RoleNameMapping }): Promise<void> {
    try {
      log.info('Bootstrapping PGPM roles...');
      
      await ensureBaseRoles(this.pool, options);
      
      log.success('Successfully bootstrapped PGPM roles');
    } catch (error) {
      log.error('Failed to bootstrap roles:', error);
      throw error;
    }
  }

  /**
   * Bootstrap test users (app_user and app_admin) with appropriate role memberships
   * WARNING: This should NEVER be run on a production database!
   */
  async bootstrapTestRoles(options?: BootstrapTestUsersOptions): Promise<void> {
    try {
      log.warn('WARNING: This command creates test users and should NEVER be run on a production database!');
      log.info('Bootstrapping PGPM test users...');
      
      await createTestUsers(this.pool, options);
      
      log.success('Successfully bootstrapped PGPM test users');
    } catch (error) {
      log.error('Failed to bootstrap test users:', error);
      throw error;
    }
  }

  /**
   * Bootstrap database roles with custom username and password
   * Creates a login role and grants anonymous + authenticated memberships
   * 
   * @param username - The username for the new role
   * @param password - The password for the new role
   * @param options - Optional configuration for locks and role names
   */
  async bootstrapDbRoles(
    username: string,
    password: string,
    options?: Omit<CreateDbUserOptions, 'username' | 'password'>
  ): Promise<void> {
    try {
      log.info(`Bootstrapping PGPM database roles for user: ${username}...`);
      
      const names = getRoleNames(options?.roleNames);
      
      await createDbUser(this.pool, {
        username,
        password,
        rolesToGrant: options?.rolesToGrant || [names.anonymous, names.authenticated],
        useLocks: options?.useLocks,
        lockNamespace: options?.lockNamespace,
        onMissingRole: options?.onMissingRole,
        roleNames: options?.roleNames
      });
      
      log.success(`Successfully bootstrapped PGPM database roles for user: ${username}`);
    } catch (error) {
      log.error(`Failed to bootstrap database roles for user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Remove database roles and revoke grants
   */
  async removeDbRoles(username: string, options?: { roleNames?: RoleNameMapping }): Promise<void> {
    try {
      log.info(`Removing PGPM database roles for user: ${username}...`);
      
      const names = getRoleNames(options?.roleNames);
      
      const sql = `
BEGIN;
DO $do$
DECLARE
  v_username TEXT := $1;
  v_anonymous TEXT := $2;
  v_authenticated TEXT := $3;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = v_username
  ) THEN
    BEGIN
      EXECUTE format('REVOKE %I FROM %I', v_anonymous, v_username);
    EXCEPTION
      WHEN undefined_object THEN
        NULL;
    END;
    BEGIN
      EXECUTE format('REVOKE %I FROM %I', v_authenticated, v_username);
    EXCEPTION
      WHEN undefined_object THEN
        NULL;
    END;
    EXECUTE format('DROP ROLE %I', v_username);
  END IF;
END
$do$;
COMMIT;
      `;
      
      await this.pool.query(sql, [username, names.anonymous, names.authenticated]);
      
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
