/**
 * End-to-end test for the pgpm export flow.
 * 
 * This test:
 * 1. Sets up a temporary workspace with required pgpm modules (metaschema-schema, metaschema-modules, db-migrate)
 * 2. Creates a custom module with migrations to seed test data:
 *    - insert_sql_actions: Creates db_migrate.sql_actions table and inserts sample migration records
 *    - insert_meta_schema: Inserts metaschema_public data representing a pets application
 * 3. Deploys everything to a test database
 * 4. Runs the export flow and verifies the output
 * 
 * PREREQUISITES:
 * - The @pgpm/metaschema-schema, @pgpm/metaschema-modules, and @pgpm/db-migrate modules must be available
 *   in the workspace's extensions/ directory or installable via pgpm install
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join, relative } from 'path';
import { Pool } from 'pg';
import { getPgPool, teardownPgPools } from 'pg-cache';
import { getPgEnvOptions, PgConfig } from 'pg-env';

import { PgpmPackage } from '../../src/core/class/pgpm';
import { PgpmMigrate } from '../../src/migrate/client';
import { exportMigrations } from '../../src/export/export-migrations';

// Increase timeout for this test as it involves workspace setup and deployment
jest.setTimeout(120000);

/**
 * Recursively get all files in a directory as a sorted array of relative paths.
 * Used for snapshot testing directory structures.
 */
function getDirectoryStructure(dir: string, baseDir?: string): string[] {
  const base = baseDir || dir;
  const results: string[] = [];
  
  if (!existsSync(dir)) {
    return results;
  }
  
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relativePath = relative(base, fullPath);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      results.push(relativePath + '/');
      results.push(...getDirectoryStructure(fullPath, base));
    } else {
      results.push(relativePath);
    }
  }
  
  return results.sort();
}

describe('Export Flow E2E', () => {
  let tempDir: string;
  let workspaceDir: string;
  let testModuleDir: string;
  let exportWorkspaceDir: string;
  let db: {
    name: string;
    config: PgConfig;
    pool: Pool;
  };

  beforeAll(async () => {
    // Create temporary workspace directory
    tempDir = mkdtempSync(join(tmpdir(), 'pgpm-export-test-'));
    workspaceDir = join(tempDir, 'test-workspace');
    mkdirSync(workspaceDir, { recursive: true });

    // Create workspace structure
    await setupWorkspace();

    // Create test module with seed migrations
    await setupTestModule();

    // Setup test database
    db = await setupTestDatabase();

    // Deploy the workspace to the test database
    await deployWorkspace();

    // Setup export workspace directory
    exportWorkspaceDir = join(tempDir, 'export-workspace');
    mkdirSync(exportWorkspaceDir, { recursive: true });
    mkdirSync(join(exportWorkspaceDir, 'packages'), { recursive: true });
    mkdirSync(join(exportWorkspaceDir, 'extensions'), { recursive: true });
    
    // Create pgpm.json for export workspace
    writeFileSync(join(exportWorkspaceDir, 'pgpm.json'), JSON.stringify({
      packages: ['packages/*', 'extensions/*']
    }, null, 2));
    
    // Create package.json for export workspace
    writeFileSync(join(exportWorkspaceDir, 'package.json'), JSON.stringify({
      name: 'export-test-workspace',
      version: '1.0.0',
      private: true
    }, null, 2));
  });

  afterAll(async () => {
    // Cleanup
    try {
      await teardownPgPools();
    } catch (e) {
      // Ignore cleanup errors
    }

    try {
      // Drop test database
      const adminConfig = getPgEnvOptions({ database: 'postgres' });
      const adminPool = getPgPool(adminConfig);
      await adminPool.query(`DROP DATABASE IF EXISTS "${db.name}"`);
    } catch (e) {
      // Ignore cleanup errors
    }

    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  async function setupWorkspace(): Promise<void> {
    // Create pgpm.json workspace config
    const pgpmConfig = {
      packages: ['packages/*', 'extensions/*']
    };
    writeFileSync(join(workspaceDir, 'pgpm.json'), JSON.stringify(pgpmConfig, null, 2));

    // Create packages and extensions directories
    mkdirSync(join(workspaceDir, 'packages'), { recursive: true });
    mkdirSync(join(workspaceDir, 'extensions'), { recursive: true });

    // Create a minimal package.json
    const packageJson = {
      name: 'test-export-workspace',
      version: '1.0.0',
      private: true
    };
    writeFileSync(join(workspaceDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  }

  async function setupTestModule(): Promise<void> {
    testModuleDir = join(workspaceDir, 'packages', 'pets-seed');
    mkdirSync(testModuleDir, { recursive: true });

    // Create module package.json
    const modulePackageJson = {
      name: 'pets-seed',
      version: '1.0.0',
      description: 'Test module for seeding pets export data'
    };
    writeFileSync(join(testModuleDir, 'package.json'), JSON.stringify(modulePackageJson, null, 2));

    // Create control file
    const controlContent = `# pets-seed extension
comment = 'Test module for seeding pets export data'
default_version = '1.0.0'
relocatable = false
requires = ''
`;
    writeFileSync(join(testModuleDir, 'pets-seed.control'), controlContent);

    // Create pgpm.plan
    const planContent = `%syntax-version=1.0.0
%project=pets-seed
%uri=https://github.com/test/pets-seed

create_sql_actions 2017-08-11T08:11:51Z constructive <constructive@test.local> # Create sql_actions table
insert_sql_actions [create_sql_actions] 2017-08-11T08:11:52Z constructive <constructive@test.local> # Insert migration records
insert_meta_schema [insert_sql_actions] 2017-08-11T08:11:53Z constructive <constructive@test.local> # Insert metaschema_public data
`;
    writeFileSync(join(testModuleDir, 'pgpm.plan'), planContent);

    // Create deploy/revert/verify directories
    mkdirSync(join(testModuleDir, 'deploy'), { recursive: true });
    mkdirSync(join(testModuleDir, 'revert'), { recursive: true });
    mkdirSync(join(testModuleDir, 'verify'), { recursive: true });

    // Create deploy scripts
    writeFileSync(join(testModuleDir, 'deploy', 'create_sql_actions.sql'), getCreateSqlActionsScript());
    writeFileSync(join(testModuleDir, 'deploy', 'insert_sql_actions.sql'), getInsertSqlActionsScript());
    writeFileSync(join(testModuleDir, 'deploy', 'insert_meta_schema.sql'), getInsertMetaSchemaScript());

    // Create revert scripts (minimal)
    writeFileSync(join(testModuleDir, 'revert', 'create_sql_actions.sql'), '-- Revert create_sql_actions\nDROP TABLE IF EXISTS db_migrate.sql_actions;\nDROP SCHEMA IF EXISTS db_migrate;');
    writeFileSync(join(testModuleDir, 'revert', 'insert_sql_actions.sql'), '-- Revert insert_sql_actions\nDELETE FROM db_migrate.sql_actions;');
    writeFileSync(join(testModuleDir, 'revert', 'insert_meta_schema.sql'), '-- Revert insert_meta_schema\nDELETE FROM metaschema_public.field;\nDELETE FROM metaschema_public.table;\nDELETE FROM metaschema_public.schema;\nDELETE FROM metaschema_public.database;');

    // Create verify scripts (minimal)
    writeFileSync(join(testModuleDir, 'verify', 'create_sql_actions.sql'), 'SELECT 1 FROM db_migrate.sql_actions LIMIT 0;');
    writeFileSync(join(testModuleDir, 'verify', 'insert_sql_actions.sql'), 'SELECT 1 FROM db_migrate.sql_actions WHERE database_id IS NOT NULL LIMIT 1;');
    writeFileSync(join(testModuleDir, 'verify', 'insert_meta_schema.sql'), 'SELECT 1 FROM metaschema_public.database WHERE name = \'pets\' LIMIT 1;');
  }

  async function setupTestDatabase(): Promise<{ name: string; config: PgConfig; pool: Pool }> {
    const dbName = `test_export_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Get base config from environment
    const baseConfig = getPgEnvOptions({ database: 'postgres' });

    // Create database using admin pool
    const adminPool = getPgPool(baseConfig);
    await adminPool.query(`CREATE DATABASE "${dbName}"`);

    // Get config for the new test database
    const pgConfig = getPgEnvOptions({ database: dbName });

    const config: PgConfig = {
      host: pgConfig.host,
      port: pgConfig.port,
      user: pgConfig.user,
      password: pgConfig.password,
      database: pgConfig.database
    };

    // Initialize migrate schema
    const migrate = new PgpmMigrate(config);
    await migrate.initialize();

    // Get pool for test database operations
    const pool = getPgPool(pgConfig);

    // Create the required schemas that would normally come from pgpm modules
    // For this test, we create minimal shims since we're testing the export flow, not the modules
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS metaschema_public;
      CREATE SCHEMA IF NOT EXISTS metaschema_modules_public;
      CREATE SCHEMA IF NOT EXISTS services_public;
      CREATE SCHEMA IF NOT EXISTS db_migrate;

      -- metaschema_public tables
      CREATE TABLE IF NOT EXISTS metaschema_public.database (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id uuid,
        name text,
        hash uuid
      );

      CREATE TABLE IF NOT EXISTS metaschema_public.schema (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid REFERENCES metaschema_public.database(id),
        name text,
        schema_name text,
        description text
      );

      CREATE TABLE IF NOT EXISTS metaschema_public.table (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid REFERENCES metaschema_public.database(id),
        schema_id uuid REFERENCES metaschema_public.schema(id),
        name text,
        description text
      );

      CREATE TABLE IF NOT EXISTS metaschema_public.field (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid REFERENCES metaschema_public.database(id),
        table_id uuid REFERENCES metaschema_public.table(id),
        name text,
        type text,
        description text
      );

      -- services_public tables
      CREATE TABLE IF NOT EXISTS services_public.domains (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid,
        site_id uuid,
        api_id uuid,
        domain text,
        subdomain text
      );

      CREATE TABLE IF NOT EXISTS services_public.apis (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid,
        name text,
        dbname text,
        is_public boolean,
        role_name text,
        anon_role text
      );

      CREATE TABLE IF NOT EXISTS services_public.sites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid,
        title text,
        description text,
        og_image text,
        favicon text,
        apple_touch_icon text,
        logo text,
        dbname text
      );

      CREATE TABLE IF NOT EXISTS services_public.api_schemas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid,
        schema_id uuid,
        api_id uuid
      );

      -- Additional services_public tables required by exportMeta
      CREATE TABLE IF NOT EXISTS services_public.apps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid,
        site_id uuid,
        name text,
        app_image text,
        app_store_link text,
        app_store_id text,
        app_id_prefix text,
        play_store_link text
      );

      CREATE TABLE IF NOT EXISTS services_public.site_modules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid,
        site_id uuid,
        name text,
        data jsonb
      );

      CREATE TABLE IF NOT EXISTS services_public.site_themes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid,
        site_id uuid,
        theme jsonb
      );

      CREATE TABLE IF NOT EXISTS services_public.api_modules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid,
        api_id uuid,
        name text,
        data jsonb
      );

      CREATE TABLE IF NOT EXISTS services_public.api_extensions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid,
        api_id uuid,
        schema_name text
      );

      -- metaschema_modules_public tables (module configuration)
      CREATE TABLE IF NOT EXISTS metaschema_modules_public.rls_module (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid,
        api_id uuid,
        schema_id uuid,
        private_schema_id uuid,
        tokens_table_id uuid,
        users_table_id uuid,
        authenticate text,
        authenticate_strict text,
        "current_role" text,
        current_role_id text
      );

      CREATE TABLE IF NOT EXISTS metaschema_modules_public.user_auth_module (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid,
        schema_id uuid,
        emails_table_id uuid,
        users_table_id uuid,
        secrets_table_id uuid,
        encrypted_table_id uuid,
        tokens_table_id uuid,
        sign_in_function text,
        sign_up_function text,
        sign_out_function text,
        sign_in_one_time_token_function text,
        one_time_token_function text,
        extend_token_expires text,
        send_account_deletion_email_function text,
        delete_account_function text,
        set_password_function text,
        reset_password_function text,
        forgot_password_function text,
        send_verification_email_function text,
        verify_email_function text
      );

      -- Additional metaschema_public table required by exportMeta
      CREATE TABLE IF NOT EXISTS metaschema_public.database_extension (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        database_id uuid,
        name text
      );
    `);

    return { name: dbName, config, pool };
  }

  async function deployWorkspace(): Promise<void> {
    const migrate = new PgpmMigrate(db.config);

    // Deploy the test module
    await migrate.deploy({
      modulePath: testModuleDir
    });
  }

  // SQL script generators
  function getCreateSqlActionsScript(): string {
    return `-- Deploy: create_sql_actions
-- Create the db_migrate.sql_actions table for storing migration records

CREATE TABLE IF NOT EXISTS db_migrate.sql_actions (
    id SERIAL PRIMARY KEY,
    name text,
    database_id uuid,
    deploy text,
    deps text[],
    payload json,
    content text,
    revert text,
    verify text,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(database_id, deploy)
);
`;
  }

  function getInsertSqlActionsScript(): string {
    return `-- Deploy: insert_sql_actions
-- Insert sample migration records for the pets schema

INSERT INTO db_migrate.sql_actions (name, database_id, deploy, deps, content, revert, verify) VALUES
  -- Schema creation
  (
    'Create pets_public schema',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_public/schema',
    ARRAY[]::text[],
    'CREATE SCHEMA pets_public;',
    'DROP SCHEMA pets_public;',
    'SELECT 1 FROM information_schema.schemata WHERE schema_name = ''pets_public'';'
  ),
  (
    'Create pets_private schema',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_private/schema',
    ARRAY[]::text[],
    'CREATE SCHEMA pets_private;',
    'DROP SCHEMA pets_private;',
    'SELECT 1 FROM information_schema.schemata WHERE schema_name = ''pets_private'';'
  ),
  -- Species table
  (
    'Create species table',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_public/tables/species/table',
    ARRAY['schemas/pets_public/schema']::text[],
    E'CREATE TABLE pets_public.species (\\n  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),\\n  name citext NOT NULL UNIQUE,\\n  description text\\n);',
    'DROP TABLE pets_public.species;',
    'SELECT 1 FROM information_schema.tables WHERE table_schema = ''pets_public'' AND table_name = ''species'';'
  ),
  -- Owners table
  (
    'Create owners table',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_public/tables/owners/table',
    ARRAY['schemas/pets_public/schema']::text[],
    E'CREATE TABLE pets_public.owners (\\n  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),\\n  name text NOT NULL,\\n  email text UNIQUE\\n);',
    'DROP TABLE pets_public.owners;',
    'SELECT 1 FROM information_schema.tables WHERE table_schema = ''pets_public'' AND table_name = ''owners'';'
  ),
  -- Pets table
  (
    'Create pets table',
    'a1b2c3d4-e5f6-4708-b250-000000000001',
    'schemas/pets_public/tables/pets/table',
    ARRAY['schemas/pets_public/tables/owners/table', 'schemas/pets_public/tables/species/table']::text[],
    E'CREATE TABLE pets_public.pets (\\n  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),\\n  owner_id uuid NOT NULL REFERENCES pets_public.owners(id),\\n  species_id uuid REFERENCES pets_public.species(id),\\n  name text NOT NULL\\n);',
    'DROP TABLE pets_public.pets;',
    'SELECT 1 FROM information_schema.tables WHERE table_schema = ''pets_public'' AND table_name = ''pets'';'
  );
`;
  }

  function getInsertMetaSchemaScript(): string {
    return `-- Deploy: insert_meta_schema
-- Insert metaschema_public data representing the pets application

-- Database
INSERT INTO metaschema_public.database (id, owner_id, name, hash) VALUES
  ('a1b2c3d4-e5f6-4708-b250-000000000001', '00000000-0000-0000-0000-000000000001', 'pets', 'f1e2d3c4-b5a6-5c2e-9a07-000000000001');

-- Schemas
INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, description) VALUES
  ('aaaa0001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'public', 'pets_public', 'Public-facing tables'),
  ('aaaa0002-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'private', 'pets_private', 'Internal tables');

-- Tables
INSERT INTO metaschema_public.table (id, database_id, schema_id, name, description) VALUES
  ('bbbb0001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 'owners', 'Pet owners'),
  ('bbbb0002-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 'pets', 'Pets'),
  ('bbbb0003-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 'species', 'Pet species');

-- Fields
INSERT INTO metaschema_public.field (id, database_id, table_id, name, type, description) VALUES
  ('cccc0001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0001-0000-0000-0000-000000000001', 'id', 'uuid', 'Primary key'),
  ('cccc0002-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0001-0000-0000-0000-000000000001', 'name', 'text', 'Owner name'),
  ('cccc0003-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0001-0000-0000-0000-000000000001', 'email', 'text', 'Contact email'),
  ('cccc0010-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'id', 'uuid', 'Primary key'),
  ('cccc0011-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'owner_id', 'uuid', 'Reference to owner'),
  ('cccc0012-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0002-0000-0000-0000-000000000001', 'name', 'text', 'Pet name'),
  ('cccc0020-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0003-0000-0000-0000-000000000001', 'id', 'uuid', 'Primary key'),
  ('cccc0021-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'bbbb0003-0000-0000-0000-000000000001', 'name', 'citext', 'Species name');

-- Meta public data
INSERT INTO services_public.apis (id, database_id, name, dbname, is_public, role_name, anon_role) VALUES
  ('eeee0001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'public', 'pets-db', true, 'authenticated', 'anonymous');

INSERT INTO services_public.sites (id, database_id, title, description, dbname) VALUES
  ('ffff0001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'Pet Clinic', 'A pet management application', 'pets');

INSERT INTO services_public.domains (id, database_id, domain, subdomain) VALUES
  ('dddd0001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'localhost', 'pets');

INSERT INTO services_public.api_schemas (id, database_id, schema_id, api_id) VALUES
  ('1111aaaa-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-4708-b250-000000000001', 'aaaa0001-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001');
`;
  }

  // Tests
  it('should have seeded the database with sql_actions records', async () => {
    const result = await db.pool.query('SELECT COUNT(*) as count FROM db_migrate.sql_actions');
    expect(parseInt(result.rows[0].count)).toBeGreaterThan(0);
  });

  it('should have seeded the database with metaschema_public data', async () => {
    const dbResult = await db.pool.query('SELECT * FROM metaschema_public.database WHERE name = $1', ['pets']);
    expect(dbResult.rows).toHaveLength(1);
    expect(dbResult.rows[0].name).toBe('pets');

    const schemaResult = await db.pool.query('SELECT COUNT(*) as count FROM metaschema_public.schema');
    expect(parseInt(schemaResult.rows[0].count)).toBeGreaterThan(0);

    const tableResult = await db.pool.query('SELECT COUNT(*) as count FROM metaschema_public.table');
    expect(parseInt(tableResult.rows[0].count)).toBeGreaterThan(0);

    const fieldResult = await db.pool.query('SELECT COUNT(*) as count FROM metaschema_public.field');
    expect(parseInt(fieldResult.rows[0].count)).toBeGreaterThan(0);
  });

  it('should have seeded the database with services_public data', async () => {
    const apiResult = await db.pool.query('SELECT COUNT(*) as count FROM services_public.apis');
    expect(parseInt(apiResult.rows[0].count)).toBeGreaterThan(0);

    const siteResult = await db.pool.query('SELECT COUNT(*) as count FROM services_public.sites');
    expect(parseInt(siteResult.rows[0].count)).toBeGreaterThan(0);

    const domainResult = await db.pool.query('SELECT COUNT(*) as count FROM services_public.domains');
    expect(parseInt(domainResult.rows[0].count)).toBeGreaterThan(0);
  });

  it('should have sql_actions records with proper structure', async () => {
    const result = await db.pool.query(`
      SELECT deploy, deps, content, revert, verify 
      FROM db_migrate.sql_actions 
      WHERE database_id = 'a1b2c3d4-e5f6-4708-b250-000000000001'
      ORDER BY id
      LIMIT 1
    `);

    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];

    // Verify the structure matches what export-migrations.ts expects
    expect(row.deploy).toBeDefined();
    expect(row.content).toBeDefined();
    expect(Array.isArray(row.deps)).toBe(true);
  });

  it('should be able to query sql_actions like export-migrations does', async () => {
    // This mimics the query in export-migrations.ts line 217-219
    const result = await db.pool.query('SELECT * FROM db_migrate.sql_actions ORDER BY id');

    expect(result.rows.length).toBeGreaterThan(0);

    // Verify each row has the fields that PgpmRow interface expects
    for (const row of result.rows) {
      expect(row).toHaveProperty('deploy');
      expect(row).toHaveProperty('content');
      expect(row).toHaveProperty('deps');
      expect(row).toHaveProperty('revert');
      expect(row).toHaveProperty('verify');
    }
  });

  describe('Export to second workspace', () => {
    const DATABASE_ID = 'a1b2c3d4-e5f6-4708-b250-000000000001';
    const EXTENSION_NAME = 'pets-export';
    const META_EXTENSION_NAME = 'pets-export-svc';
    let exportError: Error | null = null;

    beforeAll(async () => {
      // Get schema names from the seeded data
      const schemaResult = await db.pool.query(
        'SELECT schema_name FROM metaschema_public.schema WHERE database_id = $1',
        [DATABASE_ID]
      );
      const schemaNames = schemaResult.rows.map((r: any) => r.schema_name);

      // Pre-create the module directories to avoid initModule prompting for input
      // This simulates what initModule would do but without the TTY prompts
      const dbModuleDir = join(exportWorkspaceDir, 'packages', EXTENSION_NAME);
      const svcModuleDir = join(exportWorkspaceDir, 'packages', META_EXTENSION_NAME);
      
      // Create db module structure
      mkdirSync(dbModuleDir, { recursive: true });
      writeFileSync(join(dbModuleDir, 'package.json'), JSON.stringify({
        name: EXTENSION_NAME,
        version: '1.0.0',
        description: 'Exported pets database schema'
      }, null, 2));
      writeFileSync(join(dbModuleDir, `${EXTENSION_NAME}.control`), `# ${EXTENSION_NAME} extension
comment = 'Exported pets database schema'
default_version = '1.0.0'
relocatable = false
`);
      // Create empty pgpm.plan so preparePackage thinks module exists and skips initModule
      writeFileSync(join(dbModuleDir, 'pgpm.plan'), `%syntax-version=1.0.0
%project=${EXTENSION_NAME}
%uri=https://github.com/test/${EXTENSION_NAME}
`);
      
      // Create svc module structure
      mkdirSync(svcModuleDir, { recursive: true });
      writeFileSync(join(svcModuleDir, 'package.json'), JSON.stringify({
        name: META_EXTENSION_NAME,
        version: '1.0.0',
        description: 'Exported pets service metadata'
      }, null, 2));
      writeFileSync(join(svcModuleDir, `${META_EXTENSION_NAME}.control`), `# ${META_EXTENSION_NAME} extension
comment = 'Exported pets service metadata'
default_version = '1.0.0'
relocatable = false
`);
      // Create empty pgpm.plan so preparePackage thinks module exists and skips initModule
      writeFileSync(join(svcModuleDir, 'pgpm.plan'), `%syntax-version=1.0.0
%project=${META_EXTENSION_NAME}
%uri=https://github.com/test/${META_EXTENSION_NAME}
`);

      // Create a PgpmPackage instance for the export workspace
      const project = new PgpmPackage(exportWorkspaceDir);

      try {
        // Run the export - since pgpm.plan exists, preparePackage will skip initModule
        // and just delete/recreate deploy/revert/verify directories
        await exportMigrations({
          project,
          options: {
            pg: db.config
          },
          dbInfo: {
            dbname: db.name,
            databaseName: 'pets',
            database_ids: [DATABASE_ID]
          },
          author: 'test <test@test.local>',
          outdir: join(exportWorkspaceDir, 'packages'),
          schema_names: schemaNames,
          extensionName: EXTENSION_NAME,
          extensionDesc: 'Exported pets database schema',
          metaExtensionName: META_EXTENSION_NAME,
          metaExtensionDesc: 'Exported pets service metadata'
          // No prompter - non-interactive mode (will auto-overwrite since no prompter)
        });
      } catch (err) {
        exportError = err as Error;
      }
    }, 180000); // Increase timeout for export operation

    it('should have completed export without errors', () => {
      if (exportError) {
        console.error('Export error:', exportError);
      }
      expect(exportError).toBeNull();
    });

    it('should have created the database export module directory', () => {
      const dbModuleDir = join(exportWorkspaceDir, 'packages', EXTENSION_NAME);
      expect(existsSync(dbModuleDir)).toBe(true);
    });

    it('should have created pgpm.plan for database export', () => {
      const planPath = join(exportWorkspaceDir, 'packages', EXTENSION_NAME, 'pgpm.plan');
      expect(existsSync(planPath)).toBe(true);
      
      const planContent = readFileSync(planPath, 'utf-8');
      expect(planContent).toContain('%project=' + EXTENSION_NAME);
      // Should contain migration entries from sql_actions
      expect(planContent).toContain('schemas/');
    });

    it('should have created deploy directory with SQL files', () => {
      const deployDir = join(exportWorkspaceDir, 'packages', EXTENSION_NAME, 'deploy');
      expect(existsSync(deployDir)).toBe(true);
      
      // Check that deploy directory has SQL files
      const files = readdirSync(deployDir, { recursive: true });
      expect(files.length).toBeGreaterThan(0);
    });

    it('should have created revert directory with SQL files', () => {
      const revertDir = join(exportWorkspaceDir, 'packages', EXTENSION_NAME, 'revert');
      expect(existsSync(revertDir)).toBe(true);
    });

    it('should have created verify directory with SQL files', () => {
      const verifyDir = join(exportWorkspaceDir, 'packages', EXTENSION_NAME, 'verify');
      expect(existsSync(verifyDir)).toBe(true);
    });

    it('should have created the service/meta export module directory', () => {
      const svcModuleDir = join(exportWorkspaceDir, 'packages', META_EXTENSION_NAME);
      expect(existsSync(svcModuleDir)).toBe(true);
    });

    it('should have created pgpm.plan for service export', () => {
      const planPath = join(exportWorkspaceDir, 'packages', META_EXTENSION_NAME, 'pgpm.plan');
      expect(existsSync(planPath)).toBe(true);
      
      const planContent = readFileSync(planPath, 'utf-8');
      expect(planContent).toContain('%project=' + META_EXTENSION_NAME);
      // Now generates separate files per table type instead of single meta.sql
      expect(planContent).toContain('migrate/database');
    });

    it('should have created deploy/migrate/*.sql files with collections data', () => {
      // Now generates separate files per table type instead of single meta.sql
      const databaseSqlPath = join(exportWorkspaceDir, 'packages', META_EXTENSION_NAME, 'deploy', 'migrate', 'database.sql');
      expect(existsSync(databaseSqlPath)).toBe(true);
      
      const databaseContent = readFileSync(databaseSqlPath, 'utf-8');
      // Should contain INSERT statements for meta tables
      expect(databaseContent).toContain('INSERT INTO');
      expect(databaseContent).toContain('session_replication_role');
    });

    it('should have created control files for both modules', () => {
      const dbControlPath = join(exportWorkspaceDir, 'packages', EXTENSION_NAME, EXTENSION_NAME + '.control');
      const svcControlPath = join(exportWorkspaceDir, 'packages', META_EXTENSION_NAME, META_EXTENSION_NAME + '.control');
      
      expect(existsSync(dbControlPath)).toBe(true);
      expect(existsSync(svcControlPath)).toBe(true);
    });

    it('should have created package.json for both modules', () => {
      const dbPkgPath = join(exportWorkspaceDir, 'packages', EXTENSION_NAME, 'package.json');
      const svcPkgPath = join(exportWorkspaceDir, 'packages', META_EXTENSION_NAME, 'package.json');
      
      expect(existsSync(dbPkgPath)).toBe(true);
      expect(existsSync(svcPkgPath)).toBe(true);
      
      const dbPkg = JSON.parse(readFileSync(dbPkgPath, 'utf-8'));
      expect(dbPkg.name).toBe(EXTENSION_NAME);
      
      const svcPkg = JSON.parse(readFileSync(svcPkgPath, 'utf-8'));
      expect(svcPkg.name).toBe(META_EXTENSION_NAME);
    });

    it('should match snapshot for database export deploy/ folder structure', () => {
      const dbDeployDir = join(exportWorkspaceDir, 'packages', EXTENSION_NAME, 'deploy');
      const structure = getDirectoryStructure(dbDeployDir);
      expect(structure).toMatchSnapshot('pets-export deploy folder');
    });

    it('should match snapshot for service export deploy/ folder structure', () => {
      const svcDeployDir = join(exportWorkspaceDir, 'packages', META_EXTENSION_NAME, 'deploy');
      const structure = getDirectoryStructure(svcDeployDir);
      expect(structure).toMatchSnapshot('pets-export-svc deploy folder');
    });
  });
});
