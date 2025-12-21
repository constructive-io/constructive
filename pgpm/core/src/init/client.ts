import { Logger } from '@pgpmjs/logger';
import { RoleMapping } from '@pgpmjs/types';
import { Pool } from 'pg';
import { getPgPool } from 'pg-cache';
import { PgConfig } from 'pg-env';
import { 
  generateCreateBaseRolesSQL, 
  generateCreateUserSQL, 
  generateCreateTestUsersSQL,
  generateRemoveUserSQL,
  RoleManagementOptions 
} from '../roles';

const log = new Logger('init');

export { RoleManagementOptions } from '../roles';

export class PgpmInit {
  private pool: Pool;
  private pgConfig: PgConfig;

  constructor(config: PgConfig) {
    this.pgConfig = config;
    this.pool = getPgPool(this.pgConfig);
  }

  /**
   * Bootstrap standard roles (anonymous, authenticated, administrator)
   * @param roles - Optional custom role mapping (defaults to canonical names)
   */
  async bootstrapRoles(roles?: Partial<RoleMapping>): Promise<void> {
    try {
      log.info('Bootstrapping PGPM roles...');
      
      const sql = generateCreateBaseRolesSQL(roles);
      await this.pool.query(sql);
      
      log.success('Successfully bootstrapped PGPM roles');
    } catch (error) {
      log.error('Failed to bootstrap roles:', error);
      throw error;
    }
  }

  /**
   * Bootstrap test roles (app_user, app_admin with grants to base roles)
   * @param roles - Optional custom role mapping (defaults to canonical names)
   */
  async bootstrapTestRoles(roles?: Partial<RoleMapping>): Promise<void> {
    try {
      log.warn('WARNING: This command creates test roles and should NEVER be run on a production database!');
      log.info('Bootstrapping PGPM test roles...');
      
      const sql = generateCreateTestUsersSQL(roles);
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
   * @param roles - Optional custom role mapping (defaults to canonical names)
   * @param options - Optional settings including useLocks for advisory locking
   */
  async bootstrapDbRoles(
    username: string, 
    password: string, 
    roles?: Partial<RoleMapping>,
    options?: RoleManagementOptions
  ): Promise<void> {
    try {
      log.info(`Bootstrapping PGPM database roles for user: ${username}...`);
      
      const sql = generateCreateUserSQL(username, password, roles, options);
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
   * @param roles - Optional custom role mapping (defaults to canonical names)
   * @param options - Optional settings including useLocks for advisory locking
   */
  async removeDbRoles(
    username: string, 
    roles?: Partial<RoleMapping>,
    options?: RoleManagementOptions
  ): Promise<void> {
    try {
      log.info(`Removing PGPM database roles for user: ${username}...`);
      
      const sql = generateRemoveUserSQL(username, roles, options);
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
