/**
 * Cross-flow parity test: SQL export vs GraphQL export.
 *
 * Seeds a test database with known metadata, runs exportMeta (SQL flow)
 * and exportGraphQLMeta (GraphQL flow with a mocked client that reads
 * from the same database), then asserts both flows produce identical
 * SQL INSERT output.
 *
 * This is the definitive test that the two flows are functionally equivalent.
 *
 * PREREQUISITES:
 * - A running PostgreSQL instance accessible via standard PG* env vars
 */

import { getConnections, seed } from 'pgsql-test';
import type { PgTestClient } from 'pgsql-test';
import type { PgConfig } from 'pg-env';
import { toCamelCase } from 'inflekt';

import { exportMeta } from '../src/export-meta';
import { exportGraphQLMeta } from '../src/export-graphql-meta';
import { GraphQLClient } from '../src/graphql-client';
import { META_TABLE_CONFIG } from '../src/export-utils';
import { getGraphQLQueryName } from '../src/graphql-naming';

jest.setTimeout(60000);

// =============================================================================
// Test data — deterministic UUIDs so output is reproducible
// =============================================================================

const DATABASE_ID = 'dd000000-0000-0000-0000-000000000001';
const OWNER_ID = '00000000-0000-0000-0000-000000000099';
const SCHEMA_ID_PUB = 'a0000001-0000-0000-0000-000000000001';
const SCHEMA_ID_PRI = 'a0000002-0000-0000-0000-000000000001';
const TABLE_ID_USERS = 'b0000001-0000-0000-0000-000000000001';
const TABLE_ID_POSTS = 'b0000002-0000-0000-0000-000000000001';
const FIELD_ID_1 = 'ff000001-0000-0000-0000-000000000001';
const FIELD_ID_2 = 'ff000002-0000-0000-0000-000000000001';
const FIELD_ID_3 = 'ff000003-0000-0000-0000-000000000001';
const API_ID = 'c0000001-0000-0000-0000-000000000001';
const SITE_ID = 'c1000001-0000-0000-0000-000000000001';
const DOMAIN_ID = 'c2000001-0000-0000-0000-000000000001';
const API_SCHEMA_ID = 'c3000001-0000-0000-0000-000000000001';

// =============================================================================
// Helper: build a mock GraphQLClient that reads from the real database
// and returns data in the same shape as PostGraphile would
// =============================================================================

function createMockGraphQLClient(pgClient: PgTestClient): GraphQLClient {
  const client = new GraphQLClient({ endpoint: 'http://mock' });

  // Override fetchAllNodes to query the real database and return camelCase rows
  client.fetchAllNodes = async <T = Record<string, unknown>>(
    queryFieldName: string,
    _fieldsFragment: string,
    condition?: Record<string, unknown>
  ): Promise<T[]> => {
    // Find the matching config entry by reversing the GraphQL query name
    let matchedKey: string | undefined;
    for (const [key, config] of Object.entries(META_TABLE_CONFIG)) {
      if (getGraphQLQueryName(config.table) === queryFieldName) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      return [];
    }

    const config = META_TABLE_CONFIG[matchedKey];
    const schemaTable = `${config.schema}.${config.table}`;

    // Build WHERE clause — mirror what the real GraphQL flow does
    let whereClause: string;
    let params: unknown[];

    if (matchedKey === 'database') {
      // database table uses id = $1
      const id = condition?.id;
      whereClause = 'WHERE id = $1';
      params = [id];
    } else {
      // All other tables use database_id = $1
      const dbId = condition?.databaseId;
      whereClause = 'WHERE database_id = $1';
      params = [dbId];
    }

    try {
      const result = await pgClient.query(`SELECT * FROM ${schemaTable} ${whereClause}`, params);

      // Convert snake_case PG rows to camelCase (simulating PostGraphile)
      return result.rows.map(row => {
        const camelRow: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          camelRow[toCamelCase(key)] = value;
        }
        return camelRow as T;
      });
    } catch (err: unknown) {
      const pgError = err as { code?: string };
      if (pgError.code === '42P01') {
        // Table doesn't exist — return empty (same as GraphQL schema not exposing it)
        return [];
      }
      throw err;
    }
  };

  return client;
}

// =============================================================================
// Test suite
// =============================================================================

describe('Cross-flow parity: exportMeta vs exportGraphQLMeta', () => {
  let pg: PgTestClient;
  let dbConfig: PgConfig;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    ({ pg, teardown } = await getConnections({}, [
      seed.fn(async ({ pg, config }) => {
        dbConfig = config;

        // Create schemas and tables
        await pg.query(`
          CREATE SCHEMA IF NOT EXISTS metaschema_public;
          CREATE SCHEMA IF NOT EXISTS services_public;
          CREATE SCHEMA IF NOT EXISTS metaschema_modules_public;

          -- metaschema_public tables
          CREATE TABLE metaschema_public.database (
            id uuid PRIMARY KEY,
            owner_id uuid,
            name text,
            hash uuid
          );
          CREATE TABLE metaschema_public.database_extension (
            id uuid PRIMARY KEY,
            database_id uuid,
            name text,
            schema_id uuid
          );
          CREATE TABLE metaschema_public.schema (
            id uuid PRIMARY KEY,
            database_id uuid,
            name text,
            schema_name text,
            description text,
            is_public boolean
          );
          CREATE TABLE metaschema_public."table" (
            id uuid PRIMARY KEY,
            database_id uuid,
            schema_id uuid,
            name text,
            description text
          );
          CREATE TABLE metaschema_public.field (
            id uuid PRIMARY KEY,
            database_id uuid,
            table_id uuid,
            name text,
            type text,
            description text
          );

          -- services_public tables
          CREATE TABLE services_public.domains (
            id uuid PRIMARY KEY,
            database_id uuid,
            site_id uuid,
            api_id uuid,
            domain text,
            subdomain text
          );
          CREATE TABLE services_public.sites (
            id uuid PRIMARY KEY,
            database_id uuid,
            title text,
            description text,
            og_image text,
            favicon text,
            apple_touch_icon text,
            logo text
          );
          CREATE TABLE services_public.apis (
            id uuid PRIMARY KEY,
            database_id uuid,
            name text,
            is_public boolean,
            role_name text,
            anon_role text
          );
          CREATE TABLE services_public.api_schemas (
            id uuid PRIMARY KEY,
            database_id uuid,
            schema_id uuid,
            api_id uuid
          );
        `);

        // Seed data
        await pg.query(`
          INSERT INTO metaschema_public.database (id, owner_id, name, hash)
          VALUES ($1, $2, 'testapp', $3)
        `, [DATABASE_ID, OWNER_ID, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee']);

        await pg.query(`
          INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, description, is_public)
          VALUES
            ($1, $2, 'public', 'testapp_public', 'Public schema', true),
            ($3, $2, 'private', 'testapp_private', 'Private schema', false)
        `, [SCHEMA_ID_PUB, DATABASE_ID, SCHEMA_ID_PRI]);

        await pg.query(`
          INSERT INTO metaschema_public."table" (id, database_id, schema_id, name, description)
          VALUES
            ($1, $2, $3, 'users', 'User accounts'),
            ($4, $2, $3, 'posts', 'Blog posts')
        `, [TABLE_ID_USERS, DATABASE_ID, SCHEMA_ID_PUB, TABLE_ID_POSTS]);

        await pg.query(`
          INSERT INTO metaschema_public.field (id, database_id, table_id, name, type, description)
          VALUES
            ($1, $2, $3, 'id', 'uuid', 'Primary key'),
            ($4, $2, $3, 'name', 'text', 'User name'),
            ($5, $2, $6, 'id', 'uuid', 'Primary key')
        `, [FIELD_ID_1, DATABASE_ID, TABLE_ID_USERS, FIELD_ID_2, FIELD_ID_3, TABLE_ID_POSTS]);

        await pg.query(`
          INSERT INTO services_public.apis (id, database_id, name, is_public, role_name, anon_role)
          VALUES ($1, $2, 'public-api', true, 'authenticated', 'anonymous')
        `, [API_ID, DATABASE_ID]);

        await pg.query(`
          INSERT INTO services_public.sites (id, database_id, title, description)
          VALUES ($1, $2, 'Test App', 'A test application')
        `, [SITE_ID, DATABASE_ID]);

        await pg.query(`
          INSERT INTO services_public.domains (id, database_id, domain, subdomain)
          VALUES ($1, $2, 'example.com', 'app')
        `, [DOMAIN_ID, DATABASE_ID]);

        await pg.query(`
          INSERT INTO services_public.api_schemas (id, database_id, schema_id, api_id)
          VALUES ($1, $2, $3, $4)
        `, [API_SCHEMA_ID, DATABASE_ID, SCHEMA_ID_PUB, API_ID]);
      })
    ]));
  });

  afterAll(() => teardown());

  it('both flows should produce the same set of table keys', async () => {
    // SQL flow
    const sqlResult = await exportMeta({
      opts: { pg: dbConfig },
      dbname: dbConfig.database,
      database_id: DATABASE_ID
    });

    // GraphQL flow (mocked client reading from same DB)
    const mockClient = createMockGraphQLClient(pg);
    const gqlResult = await exportGraphQLMeta({
      client: mockClient,
      database_id: DATABASE_ID
    });

    const sqlKeys = Object.keys(sqlResult).sort();
    const gqlKeys = Object.keys(gqlResult).sort();

    expect(gqlKeys).toEqual(sqlKeys);
  });

  it('both flows should produce identical SQL INSERT output for each table', async () => {
    // SQL flow
    const sqlResult = await exportMeta({
      opts: { pg: dbConfig },
      dbname: dbConfig.database,
      database_id: DATABASE_ID
    });

    // GraphQL flow (mocked client reading from same DB)
    const mockClient = createMockGraphQLClient(pg);
    const gqlResult = await exportGraphQLMeta({
      client: mockClient,
      database_id: DATABASE_ID
    });

    // Compare every table's SQL output
    const allKeys = new Set([...Object.keys(sqlResult), ...Object.keys(gqlResult)]);

    for (const key of allKeys) {
      const sqlSql = sqlResult[key];
      const gqlSql = gqlResult[key];

      // Both should exist
      expect(sqlSql).toBeDefined();
      expect(gqlSql).toBeDefined();

      // Normalize whitespace for comparison (both go through the same Parser,
      // but minor differences in trailing newlines are acceptable)
      const normSql = sqlSql?.trim();
      const normGql = gqlSql?.trim();

      expect(normGql).toBe(normSql);
    }
  });

  it('SQL output for database table should contain the seeded database name', async () => {
    const sqlResult = await exportMeta({
      opts: { pg: dbConfig },
      dbname: dbConfig.database,
      database_id: DATABASE_ID
    });

    expect(sqlResult['database']).toContain('testapp');
    expect(sqlResult['database']).toContain(DATABASE_ID);
  });

  it('SQL output for schema table should contain both schemas', async () => {
    const sqlResult = await exportMeta({
      opts: { pg: dbConfig },
      dbname: dbConfig.database,
      database_id: DATABASE_ID
    });

    expect(sqlResult['schema']).toContain('testapp_public');
    expect(sqlResult['schema']).toContain('testapp_private');
  });

  it('SQL output for field table should contain all seeded fields', async () => {
    const sqlResult = await exportMeta({
      opts: { pg: dbConfig },
      dbname: dbConfig.database,
      database_id: DATABASE_ID
    });

    expect(sqlResult['field']).toContain(FIELD_ID_1);
    expect(sqlResult['field']).toContain(FIELD_ID_2);
    expect(sqlResult['field']).toContain(FIELD_ID_3);
  });

  it('SQL output for services tables should contain seeded data', async () => {
    const sqlResult = await exportMeta({
      opts: { pg: dbConfig },
      dbname: dbConfig.database,
      database_id: DATABASE_ID
    });

    expect(sqlResult['apis']).toContain('public-api');
    expect(sqlResult['sites']).toContain('Test App');
    expect(sqlResult['domains']).toContain('example.com');
    expect(sqlResult['api_schemas']).toContain(API_SCHEMA_ID);
  });

  it('GraphQL flow output should also contain the seeded data', async () => {
    const mockClient = createMockGraphQLClient(pg);
    const gqlResult = await exportGraphQLMeta({
      client: mockClient,
      database_id: DATABASE_ID
    });

    expect(gqlResult['database']).toContain('testapp');
    expect(gqlResult['apis']).toContain('public-api');
    expect(gqlResult['sites']).toContain('Test App');
    expect(gqlResult['domains']).toContain('example.com');
  });

  it('tables with no data should be absent from both results', async () => {
    const sqlResult = await exportMeta({
      opts: { pg: dbConfig },
      dbname: dbConfig.database,
      database_id: DATABASE_ID
    });

    const mockClient = createMockGraphQLClient(pg);
    const gqlResult = await exportGraphQLMeta({
      client: mockClient,
      database_id: DATABASE_ID
    });

    // We didn't seed any modules, so module tables should be absent from both
    const moduleTables = [
      'rls_module', 'user_auth_module', 'memberships_module',
      'permissions_module', 'limits_module', 'levels_module'
    ];

    for (const table of moduleTables) {
      expect(sqlResult[table]).toBeUndefined();
      expect(gqlResult[table]).toBeUndefined();
    }
  });
});
