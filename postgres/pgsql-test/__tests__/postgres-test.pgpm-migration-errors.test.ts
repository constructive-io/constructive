process.env.LOG_SCOPE = 'pgsql-test';

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { PgpmMigrate } from '@pgpmjs/core';

import { getConnections } from '../src/connect';
import { PgTestClient } from '../src/test-client';

/**
 * PGPM Migration Error Tests
 * 
 * These tests simulate real pgpm migration failures to capture and snapshot
 * the enhanced error messages. Unlike the basic enhanced-errors tests that
 * use simple SQL queries, these tests run actual pgpm deployments with
 * broken migrations to verify the error formatting in the full migration flow.
 * 
 * The tests use getConnections() from pgsql-test to get the database config,
 * then pass that config to PgpmMigrate for deployment.
 */

jest.setTimeout(30000);

interface TestChange {
  name: string;
  dependencies?: string[];
}

function createPlanFile(packageName: string, changes: TestChange[], tempDirs: string[]): string {
  const tempDir = mkdtempSync(join(tmpdir(), 'pgsql-test-migrate-'));
  tempDirs.push(tempDir);

  const lines = [
    '%syntax-version=1.0.0',
    `%project=${packageName}`,
    `%uri=https://github.com/test/${packageName}`,
    ''
  ];

  for (const change of changes) {
    let line = change.name;
    
    if (change.dependencies && change.dependencies.length > 0) {
      line += ` [${change.dependencies.join(' ')}]`;
    }
    
    line += ` ${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}`;
    line += ` test`;
    line += ` <test@example.com>`;
    
    lines.push(line);
  }

  const planPath = join(tempDir, 'pgpm.plan');
  writeFileSync(planPath, lines.join('\n'));
  
  return tempDir;
}

function createScript(dir: string, type: 'deploy' | 'revert' | 'verify', name: string, content: string): void {
  const scriptDir = join(dir, type);
  mkdirSync(scriptDir, { recursive: true });
  writeFileSync(join(scriptDir, `${name}.sql`), content);
}

describe('PGPM Migration Error Messages', () => {
  let pg: PgTestClient;
  let teardown: () => Promise<void>;
  const tempDirs: string[] = [];

  beforeAll(async () => {
    ({ pg, teardown } = await getConnections());
  });

  afterAll(async () => {
    // Clean up temp directories
    for (const dir of tempDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    await teardown();
  });

  describe('Nested EXECUTE Migration Errors', () => {
    it('snapshot: nested EXECUTE migration error', async () => {
      const tempDir = createPlanFile('test-nested-execute-snapshot', [
        { name: 'broken_nested_execute' }
      ], tempDirs);
      
      createScript(tempDir, 'deploy', 'broken_nested_execute', `
DO $$
BEGIN
  EXECUTE 'INSERT INTO nonexistent_migration_table_xyz (col) VALUES (1)';
END;
$$;
      `);
      
      const client = new PgpmMigrate(pg.config);
      await client.initialize();
      
      let caughtError: any = null;
      try {
        await client.deploy({
          modulePath: tempDir,
          useTransaction: true
        });
      } catch (err) {
        caughtError = err;
      }
      
      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatch(/nonexistent_migration_table_xyz.*does not exist/i);
      // Snapshot the full error message (should include enhanced fields if available)
      expect(caughtError.message).toMatchSnapshot('error message');
      // Also snapshot the raw error properties to see what PostgreSQL fields are available
      expect({
        code: caughtError.code,
        detail: caughtError.detail,
        hint: caughtError.hint,
        where: caughtError.where,
        schema: caughtError.schema,
        table: caughtError.table,
        constraint: caughtError.constraint,
        position: caughtError.position,
        internalQuery: caughtError.internalQuery
      }).toMatchSnapshot('error fields');
    });
  });

  describe('Constraint Violation in Migration', () => {
    it('snapshot: constraint violation in migration', async () => {
      const tempDir = createPlanFile('test-constraint-snapshot', [
        { name: 'setup_constraint_table' },
        { name: 'violate_constraint', dependencies: ['setup_constraint_table'] }
      ], tempDirs);
      
      createScript(tempDir, 'deploy', 'setup_constraint_table', `
CREATE TABLE test_snapshot_products (
  id serial PRIMARY KEY,
  sku text UNIQUE NOT NULL
);
INSERT INTO test_snapshot_products (sku) VALUES ('PROD-001');
      `);
      
      createScript(tempDir, 'deploy', 'violate_constraint', `
INSERT INTO test_snapshot_products (sku) VALUES ('PROD-001');
      `);
      
      const client = new PgpmMigrate(pg.config);
      await client.initialize();
      
      let caughtError: any = null;
      try {
        await client.deploy({
          modulePath: tempDir,
          useTransaction: true
        });
      } catch (err) {
        caughtError = err;
      }
      
      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatch(/duplicate key value violates unique constraint/i);
      // Snapshot the full error message (should include enhanced fields if available)
      expect(caughtError.message).toMatchSnapshot('error message');
      // Also snapshot the raw error properties to see what PostgreSQL fields are available
      expect({
        code: caughtError.code,
        detail: caughtError.detail,
        hint: caughtError.hint,
        where: caughtError.where,
        schema: caughtError.schema,
        table: caughtError.table,
        constraint: caughtError.constraint,
        position: caughtError.position,
        internalQuery: caughtError.internalQuery
      }).toMatchSnapshot('error fields');
    });
  });

  describe('JSON Type Mismatch in Migration', () => {
    it('snapshot: JSON type mismatch error in migration', async () => {
      const tempDir = createPlanFile('test-json-migration', [
        { name: 'create_json_table' },
        { name: 'insert_bad_json', dependencies: ['create_json_table'] }
      ], tempDirs);
      
      createScript(tempDir, 'deploy', 'create_json_table', `
CREATE TABLE test_migration_config (
  id serial PRIMARY KEY,
  name text NOT NULL,
  settings jsonb NOT NULL
);
      `);
      
      createScript(tempDir, 'deploy', 'insert_bad_json', `
INSERT INTO test_migration_config (name, settings) VALUES ('test', 'not_valid_json');
      `);
      
      const client = new PgpmMigrate(pg.config);
      await client.initialize();
      
      let caughtError: any = null;
      try {
        await client.deploy({
          modulePath: tempDir,
          useTransaction: true
        });
      } catch (err) {
        caughtError = err;
      }
      
      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toMatch(/invalid input syntax for type json/i);
      // Snapshot the full error message (should include enhanced fields if available)
      expect(caughtError.message).toMatchSnapshot('error message');
      // Also snapshot the raw error properties to see what PostgreSQL fields are available
      expect({
        code: caughtError.code,
        detail: caughtError.detail,
        hint: caughtError.hint,
        where: caughtError.where,
        schema: caughtError.schema,
        table: caughtError.table,
        constraint: caughtError.constraint,
        position: caughtError.position,
        internalQuery: caughtError.internalQuery
      }).toMatchSnapshot('error fields');
    });
  });
});
