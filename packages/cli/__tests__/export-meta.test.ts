/**
 * Integration tests for export-meta functionality
 * 
 * These tests verify that the exportMeta function correctly exports data from
 * collections_public and meta_public tables with proper table names and queries.
 */

jest.setTimeout(120000);
process.env.PGPM_SKIP_UPDATE_CHECK = 'true';

import { randomUUID } from 'crypto';

import { exportMeta } from '@pgpmjs/core';
import { teardownPgPools } from 'pg-cache';
import { getPgEnvOptions } from 'pg-env';

import { CLIDeployTestFixture } from '../test-utils';

describe('Export Meta Integration', () => {
  let fixture: CLIDeployTestFixture;
  let testDb: any;

  beforeAll(async () => {
    // Use the sqitch/simple-w-tags fixture as a base workspace
    fixture = new CLIDeployTestFixture('sqitch', 'simple-w-tags');
  });

  beforeEach(async () => {
    testDb = await fixture.setupTestDatabase();
  });

  afterAll(async () => {
    await fixture.cleanup();
    await teardownPgPools();
  });

  describe('exportMeta function', () => {
    it('should use correct table name database_extension (singular)', async () => {
      // First, create the required schemas
      await testDb.query(`CREATE SCHEMA IF NOT EXISTS collections_public`);
      await testDb.query(`CREATE SCHEMA IF NOT EXISTS meta_public`);

      // Create the collections_public.database table
      await testDb.query(`
        CREATE TABLE IF NOT EXISTS collections_public.database (
          id UUID PRIMARY KEY,
          owner_id UUID,
          name TEXT,
          hash UUID
        )
      `);

      // Create the collections_public.database_extension table (singular, not plural)
      await testDb.query(`
        CREATE TABLE IF NOT EXISTS collections_public.database_extension (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT,
          database_id UUID REFERENCES collections_public.database(id)
        )
      `);

      // Create the collections_public.schema table
      await testDb.query(`
        CREATE TABLE IF NOT EXISTS collections_public.schema (
          id UUID PRIMARY KEY,
          database_id UUID REFERENCES collections_public.database(id),
          name TEXT,
          schema_name TEXT,
          description TEXT
        )
      `);

      // Create the collections_public.table table
      await testDb.query(`
        CREATE TABLE IF NOT EXISTS collections_public.table (
          id UUID PRIMARY KEY,
          database_id UUID REFERENCES collections_public.database(id),
          schema_id UUID REFERENCES collections_public.schema(id),
          name TEXT,
          description TEXT
        )
      `);

      // Create the collections_public.field table
      await testDb.query(`
        CREATE TABLE IF NOT EXISTS collections_public.field (
          id UUID PRIMARY KEY,
          database_id UUID REFERENCES collections_public.database(id),
          table_id UUID REFERENCES collections_public.table(id),
          name TEXT,
          type TEXT,
          description TEXT
        )
      `);

      // Create minimal meta_public tables for the export
      await testDb.query(`
        CREATE TABLE IF NOT EXISTS meta_public.apis (
          id UUID PRIMARY KEY,
          database_id UUID,
          name TEXT,
          dbname TEXT,
          is_public BOOLEAN,
          role_name TEXT,
          anon_role TEXT
        )
      `);

      await testDb.query(`
        CREATE TABLE IF NOT EXISTS meta_public.sites (
          id UUID PRIMARY KEY,
          database_id UUID,
          title TEXT,
          description TEXT,
          dbname TEXT
        )
      `);

      await testDb.query(`
        CREATE TABLE IF NOT EXISTS meta_public.domains (
          id UUID PRIMARY KEY,
          database_id UUID,
          site_id UUID,
          api_id UUID,
          domain TEXT,
          subdomain TEXT
        )
      `);

      // Seed test data
      const databaseId = randomUUID();
      const schemaId = randomUUID();
      const tableId = randomUUID();
      const fieldId = randomUUID();
      const apiId = randomUUID();
      const siteId = randomUUID();

      await testDb.query(`
        INSERT INTO collections_public.database (id, owner_id, name, hash)
        VALUES ($1, $2, $3, $4)
      `, [databaseId, randomUUID(), 'test-database', randomUUID()]);

      await testDb.query(`
        INSERT INTO collections_public.database_extension (name, database_id)
        VALUES ($1, $2)
      `, ['uuid-ossp', databaseId]);

      await testDb.query(`
        INSERT INTO collections_public.schema (id, database_id, name, schema_name, description)
        VALUES ($1, $2, $3, $4, $5)
      `, [schemaId, databaseId, 'test_schema', 'test_schema', 'Test schema']);

      await testDb.query(`
        INSERT INTO collections_public.table (id, database_id, schema_id, name, description)
        VALUES ($1, $2, $3, $4, $5)
      `, [tableId, databaseId, schemaId, 'test_table', 'Test table']);

      await testDb.query(`
        INSERT INTO collections_public.field (id, database_id, table_id, name, type, description)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [fieldId, databaseId, tableId, 'test_field', 'text', 'Test field']);

      await testDb.query(`
        INSERT INTO meta_public.apis (id, database_id, name, dbname, is_public, role_name, anon_role)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [apiId, databaseId, 'test-api', testDb.name, true, 'app_user', 'anon']);

      await testDb.query(`
        INSERT INTO meta_public.sites (id, database_id, title, description, dbname)
        VALUES ($1, $2, $3, $4, $5)
      `, [siteId, databaseId, 'Test Site', 'Test site description', testDb.name]);

      // Now test the exportMeta function
      const options = { pg: getPgEnvOptions() };
      const exportedSql = await exportMeta({
        opts: options,
        dbname: testDb.name,
        database_id: databaseId
      });

      // Verify the exported SQL contains the correct table names
      expect(exportedSql).toContain('collections_public.database');
      expect(exportedSql).toContain('collections_public.database_extension');
      expect(exportedSql).toContain('collections_public.schema');
      expect(exportedSql).toContain('collections_public.table');
      expect(exportedSql).toContain('collections_public.field');
      expect(exportedSql).toContain('meta_public.apis');
      expect(exportedSql).toContain('meta_public.sites');

      // Verify the exported SQL does NOT contain the incorrect plural table name
      expect(exportedSql).not.toContain('collections_public.database_extensions');

      // Verify the exported SQL contains our test data
      expect(exportedSql).toContain('test-database');
      expect(exportedSql).toContain('uuid-ossp');
      expect(exportedSql).toContain('test_schema');
      expect(exportedSql).toContain('test_table');
      expect(exportedSql).toContain('test_field');
      expect(exportedSql).toContain('test-api');
      expect(exportedSql).toContain('Test Site');
    });

    it('should return empty string when no data exists for database_id', async () => {
      // Create the required schemas and tables
      await testDb.query(`CREATE SCHEMA IF NOT EXISTS collections_public`);
      await testDb.query(`CREATE SCHEMA IF NOT EXISTS meta_public`);

      await testDb.query(`
        CREATE TABLE IF NOT EXISTS collections_public.database (
          id UUID PRIMARY KEY,
          owner_id UUID,
          name TEXT,
          hash UUID
        )
      `);

      const options = { pg: getPgEnvOptions() };
      const nonExistentId = randomUUID();

      const exportedSql = await exportMeta({
        opts: options,
        dbname: testDb.name,
        database_id: nonExistentId
      });

      // Should return empty string when no data exists
      expect(exportedSql).toBe('');
    });
  });
});
