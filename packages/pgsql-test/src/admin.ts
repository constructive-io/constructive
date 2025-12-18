import { Logger } from '@pgpmjs/logger';
import { PgTestConnectionOptions } from '@pgpmjs/types';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { getPgEnvOptions, PgConfig } from 'pg-env';

import { getRoleName } from './roles';
import { SeedAdapter } from './seed/types';
import { streamSql as stream } from './stream';

const log = new Logger('db-admin');

/**
 * Escape a SQL literal (string value)
 * This prevents SQL injection by properly quoting string literals
 */
function escapeLiteral(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

/**
 * Options for creating a user role in the test framework
 */
export interface CreateUserRoleOptions {
  /** Enable advisory locks for concurrent CI/CD safety (default: false) */
  useLocks?: boolean;
  /** Lock namespace for advisory locks (default: 42) */
  lockNamespace?: number;
  /** Grant administrator role to the user (default: true for backward compat) */
  grantAdmin?: boolean;
  /** How to handle missing base roles: 'error', 'notice', or 'ignore' (default: 'notice') */
  onMissingRole?: 'error' | 'notice' | 'ignore';
}

export class DbAdmin {
  constructor(
    private config: PgConfig,
    private verbose: boolean = false,
    private roleConfig?: PgTestConnectionOptions
  ) {
    this.config = getPgEnvOptions(config);
  }

  private getEnv(): Record<string, string> {
    return {
      PGHOST: this.config.host,
      PGPORT: String(this.config.port),
      PGUSER: this.config.user,
      PGPASSWORD: this.config.password
    };
  }

  private run(command: string): void {
    try {
      execSync(command, {
        stdio: this.verbose ? 'inherit' : 'pipe',
        env: {
          ...process.env,
          ...this.getEnv()
        }
      });
      if (this.verbose) log.success(`Executed: ${command}`);
    } catch (err: any) {
      log.error(`Command failed: ${command}`);
      if (this.verbose) log.error(err.message);
      throw err;
    }
  }

  private safeDropDb(name: string): void {
    try {
      this.run(`dropdb "${name}"`);
    } catch (err: any) {
      if (!err.message.includes('does not exist')) {
        log.warn(`Could not drop database ${name}: ${err.message}`);
      }
    }
  }

  drop(dbName?: string): void {
    this.safeDropDb(dbName ?? this.config.database);
  }

  dropTemplate(dbName: string): void {
    this.run(`psql -c "UPDATE pg_database SET datistemplate='false' WHERE datname='${dbName}';"`);
    this.drop(dbName);
  }

  create(dbName?: string): void {
    const db = dbName ?? this.config.database;
    this.run(`createdb -U ${this.config.user} -h ${this.config.host} -p ${this.config.port} "${db}"`);
  }

  createFromTemplate(template: string, dbName?: string): void {
    const db = dbName ?? this.config.database;
    this.run(`createdb -U ${this.config.user} -h ${this.config.host} -p ${this.config.port} -e "${db}" -T "${template}"`);
  }

  installExtensions(extensions: string[] | string, dbName?: string): void {
    const db = dbName ?? this.config.database;
    const extList = typeof extensions === 'string' ? extensions.split(',') : extensions;

    for (const extension of extList) {
      this.run(`psql --dbname "${db}" -c 'CREATE EXTENSION IF NOT EXISTS "${extension}" CASCADE;'`);
    }
  }

  connectionString(dbName?: string): string {
    const { user, password, host, port } = this.config;
    const db = dbName ?? this.config.database;
    return `postgres://${user}:${password}@${host}:${port}/${db}`;
  }

  createTemplateFromBase(base: string, template: string): void {
    this.run(`createdb -T "${base}" "${template}"`);
    this.run(`psql -c "UPDATE pg_database SET datistemplate = true WHERE datname = '${template}';"`);
  }

  cleanupTemplate(template: string): void {
    try {
      this.run(`psql -c "UPDATE pg_database SET datistemplate = false WHERE datname = '${template}'"`);
    } catch {
      log.warn(`Skipping failed UPDATE of datistemplate for ${template}`);
    }
    this.safeDropDb(template);
  }
  
  /**
   * Grant a role to a user with optional advisory locks for concurrent CI/CD safety
   */
  async grantRole(
    role: string,
    user: string,
    dbName?: string,
    options?: {
      useLocks?: boolean;
      lockNamespace?: number;
      onMissingRole?: 'error' | 'notice' | 'ignore';
    }
  ): Promise<void> {
    const db = dbName ?? this.config.database;
    const { useLocks = false, lockNamespace = 43, onMissingRole = 'notice' } = options || {};
    
    // Build the exception handler based on onMissingRole option
    let undefinedObjectHandler: string;
    if (onMissingRole === 'error') {
      undefinedObjectHandler = `RAISE EXCEPTION 'Role % does not exist when granting to %', v_role, v_user;`;
    } else if (onMissingRole === 'ignore') {
      undefinedObjectHandler = `NULL;`;
    } else {
      undefinedObjectHandler = `RAISE NOTICE 'Missing role when granting % to %', v_role, v_user;`;
    }
    
    // DO blocks don't support parameterized queries, so we use safe string interpolation
    const sql = `
DO $$
DECLARE
  v_user TEXT := ${escapeLiteral(user)};
  v_role TEXT := ${escapeLiteral(role)};
BEGIN
  -- Pre-check to avoid unnecessary GRANTs; still catch TOCTOU under concurrency
  IF NOT EXISTS (
    SELECT 1 FROM pg_auth_members am
    JOIN pg_roles r1 ON am.roleid = r1.oid
    JOIN pg_roles r2 ON am.member = r2.oid
    WHERE r1.rolname = v_role AND r2.rolname = v_user
  ) THEN
    BEGIN
      ${useLocks ? `PERFORM pg_advisory_xact_lock(${lockNamespace}, hashtext(v_role || ':' || v_user));` : '-- Locks disabled'}
      EXECUTE format('GRANT %I TO %I', v_role, v_user);
    EXCEPTION
      WHEN unique_violation THEN
        -- Concurrent membership grant; safe to ignore
        NULL;
      WHEN undefined_object THEN
        -- Role or user missing
        ${undefinedObjectHandler}
      WHEN insufficient_privilege THEN
        RAISE EXCEPTION 'Insufficient privileges to grant % to %', v_role, v_user;
    END;
  END IF;
END
$$;
    `;
    await this.streamSql(sql, db);
  }

  async grantConnect(role: string, dbName?: string): Promise<void> {
    const db = dbName ?? this.config.database;
    const sql = `GRANT CONNECT ON DATABASE "${db}" TO ${role};`;
    await this.streamSql(sql, db);
  }

  /**
   * Create a user role with role memberships for testing
   * 
   * By default, grants anonymous, authenticated, AND administrator roles for backward compatibility.
   * Use the `grantAdmin` option to control whether administrator role is granted.
   * 
   * WARNING: This grants elevated privileges and should NEVER be used in production!
   * 
   * @param user - Username for the new role
   * @param password - Password for the new role
   * @param dbName - Database name to connect to
   * @param options - Optional configuration for locks and role grants
   */
  async createUserRole(
    user: string,
    password: string,
    dbName: string,
    options?: CreateUserRoleOptions
  ): Promise<void> {
    const { 
      useLocks = false, 
      lockNamespace = 42, 
      grantAdmin = true,  // Default true for backward compatibility
      onMissingRole = 'notice' 
    } = options || {};
    
    const anonRole = getRoleName('anonymous', this.roleConfig);
    const authRole = getRoleName('authenticated', this.roleConfig);
    const adminRole = getRoleName('administrator', this.roleConfig);
    
    // Build the list of roles to grant
    const rolesToGrant = [anonRole, authRole];
    if (grantAdmin) {
      rolesToGrant.push(adminRole);
    }
    
    // Create the login role with optional advisory locks
    // DO blocks don't support parameterized queries, so we use safe string interpolation
    const createRoleSql = `
DO $$
DECLARE
  v_user TEXT := ${escapeLiteral(user)};
  v_password TEXT := ${escapeLiteral(password)};
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_user) THEN
    BEGIN
      ${useLocks ? `PERFORM pg_advisory_xact_lock(${lockNamespace}, hashtext(v_user));` : '-- Locks disabled'}
      EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', v_user, v_password);
    EXCEPTION
      WHEN duplicate_object THEN
        -- Role was created concurrently, safe to ignore
        NULL;
      WHEN unique_violation THEN
        -- Concurrent insert, safe to ignore
        NULL;
      WHEN insufficient_privilege THEN
        RAISE EXCEPTION 'Insufficient privileges to create role %: ensure the connecting user has CREATEROLE', v_user;
    END;
  END IF;
END
$$;
    `;
    
    await this.streamSql(createRoleSql, dbName);
    
    // Grant role memberships
    for (const role of rolesToGrant) {
      await this.grantRole(role, user, dbName, {
        useLocks,
        lockNamespace: lockNamespace + 1,  // Use different namespace for memberships
        onMissingRole
      });
    }
  }

  loadSql(file: string, dbName: string): void {
    if (!existsSync(file)) {
      throw new Error(`Missing SQL file: ${file}`);
    }
    this.run(`psql -f ${file} ${dbName}`);
  }

  async streamSql(sql: string, dbName: string): Promise<void> {
    await stream(
      {
        ...this.config,
        database: dbName
      },
      sql
    );
  }

  async createSeededTemplate(templateName: string, adapter: SeedAdapter): Promise<void> {
    const seedDb = this.config.database;
    this.create(seedDb);

    await adapter.seed({
      admin: this,
      config: this.config,
      pg: null, // placeholder for PgTestClient
      connect: null // placeholder for connection factory
    });

    this.cleanupTemplate(templateName);
    this.createTemplateFromBase(seedDb, templateName);
    this.drop(seedDb);
  }
}
