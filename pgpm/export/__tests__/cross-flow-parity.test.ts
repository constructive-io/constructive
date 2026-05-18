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
import { META_TABLE_CONFIG, FieldType } from '../src/export-utils';
import { getGraphQLQueryName, getGraphQLTypeName, GraphQLTypeInfo } from '../src/graphql-naming';

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
const INDEX_ID = 'd0000001-0000-0000-0000-000000000001';
const RLS_FUNCTION_ID = 'd1000001-0000-0000-0000-000000000001';
const CORS_SETTINGS_ID = 'd2000001-0000-0000-0000-000000000001';
const USER_AUTH_MODULE_ID = 'd3000001-0000-0000-0000-000000000001';

// =============================================================================
// Helper: build a mock GraphQLClient that reads from the real database
// and returns data in the same shape as PostGraphile would
// =============================================================================

function createMockGraphQLClient(pgClient: PgTestClient): GraphQLClient {
  const client = new GraphQLClient({ endpoint: 'http://mock' });

  // Override introspectType to query information_schema and return GraphQL-style type info
  client.introspectType = async (typeName: string): Promise<Map<string, GraphQLTypeInfo>> => {
    // Reverse-lookup: find the META_TABLE_CONFIG entry whose GraphQL type name matches
    let matchedKey: string | undefined;
    for (const [key, config] of Object.entries(META_TABLE_CONFIG)) {
      if (getGraphQLTypeName(config.table) === typeName) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      return new Map();
    }

    const config = META_TABLE_CONFIG[matchedKey];

    try {
      // Query information_schema to get column names, types, and enum info
      const result = await pgClient.query(`
        SELECT column_name, udt_name, is_updatable
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [config.schema, config.table]);

      // Also query enum types for this schema to detect enum columns
      let enumTypes: Map<string, string[]> = new Map();
      try {
        const enumResult = await pgClient.query(`
          SELECT t.typname AS enum_name, e.enumlabel AS enum_value
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          JOIN pg_namespace n ON t.typnamespace = n.oid
          WHERE n.nspname = $1
        `, [config.schema]);
        for (const row of enumResult.rows) {
          const vals = enumTypes.get(row.enum_name) || [];
          vals.push(row.enum_value);
          enumTypes.set(row.enum_name, vals);
        }
      } catch {
        // Enum query failed — skip enum detection
      }

      const fields = new Map<string, GraphQLTypeInfo>();
      for (const row of result.rows) {
        // Convert snake_case column name to camelCase (PostGraphile style)
        const camelName = toCamelCase(row.column_name);
        const udtName = row.udt_name;
        const isList = udtName.startsWith('_');
        const baseUdt = isList ? udtName.slice(1) : udtName;

        // Check if this is an enum type
        if (enumTypes.has(baseUdt)) {
          fields.set(camelName, { typeName: baseUdt, kind: 'ENUM', list: isList, nonNull: false });
          continue;
        }

        // Map PostgreSQL udt_name to GraphQL type info
        const gqlTypeName = pgUdtToGraphQLType(baseUdt);
        const gqlKind = pgUdtToGraphQLKind(baseUdt);
        fields.set(camelName, { typeName: gqlTypeName, kind: gqlKind, list: isList, nonNull: false });
      }
      return fields;
    } catch {
      return new Map();
    }
  };

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

      // Get column type info for this table to simulate PostGraphile transformations
      const colResult = await pgClient.query(`
        SELECT column_name, udt_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
      `, [config.schema, config.table]);
      const colTypes = new Map<string, string>();
      for (const r of colResult.rows) {
        colTypes.set(r.column_name, r.udt_name);
      }

      // Get enum types to simulate custom inflector uppercase behavior
      let enumColumns: Set<string> = new Set();
      try {
        const enumResult = await pgClient.query(`
          SELECT DISTINCT attname, t.typname
          FROM pg_attribute a
          JOIN pg_class c ON a.attrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          JOIN pg_type t ON a.atttypid = t.oid
          WHERE n.nspname = $1 AND c.relname = $2 AND t.typtype = 'e'
        `, [config.schema, config.table]);
        for (const r of enumResult.rows) {
          enumColumns.add(r.attname);
        }
      } catch {
        // Enum detection failed — skip
      }

      // Convert snake_case PG rows to camelCase (simulating PostGraphile)
      return result.rows.map(row => {
        const camelRow: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          const camelKey = toCamelCase(key);
          const udtName = colTypes.get(key);

          if (value === null || value === undefined) {
            camelRow[camelKey] = value;
            continue;
          }

          // Simulate PostGraphile Interval OBJECT type: convert PG interval strings
          // to { seconds, minutes, hours, days, months, years } objects
          if (udtName === 'interval' && typeof value === 'string') {
            camelRow[camelKey] = parsePgInterval(value);
            continue;
          }

          // Simulate custom inflector ENUM uppercase (e.g., 'app' → 'APP')
          if (enumColumns.has(key) && typeof value === 'string') {
            camelRow[camelKey] = value.toUpperCase();
            continue;
          }

          // Simulate PostGraphile BigInt scalar: bigint values arrive as strings
          if (udtName === 'int8' && typeof value === 'number') {
            camelRow[camelKey] = String(value);
            continue;
          }

          // Simulate PostGraphile Datetime scalar: truncate timestamptz to second precision
          // and return as ISO string (matching real PostGraphile JSON response)
          if ((udtName === 'timestamptz' || udtName === 'timestamp') && value instanceof Date) {
            camelRow[camelKey] = new Date(Math.floor(value.getTime() / 1000) * 1000).toISOString();
            continue;
          }

          camelRow[camelKey] = value;
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

/**
 * Map PostgreSQL udt_name to the GraphQL type name that PostGraphile would expose.
 * Must stay aligned with mapPgTypeToFieldType and mapGraphQLTypeToFieldType.
 */
function pgUdtToGraphQLType(udtName: string): string {
  if (udtName.startsWith('_')) {
    // Array type — map the inner type
    return pgUdtToGraphQLType(udtName.slice(1));
  }
  switch (udtName) {
    case 'uuid': return 'UUID';
    case 'text':
    case 'varchar':
    case 'bpchar':
    case 'name': return 'String';
    case 'bool': return 'Boolean';
    case 'jsonb':
    case 'json': return 'JSON';
    case 'int2':
    case 'int4': return 'Int';
    case 'int8': return 'BigInt';
    case 'numeric': return 'BigFloat';
    case 'float4':
    case 'float8': return 'Float';
    case 'interval': return 'Interval';
    case 'timestamptz':
    case 'timestamp': return 'Datetime';
    default: return 'String'; // safe fallback
  }
}

/**
 * Map PostgreSQL udt_name to the GraphQL kind that PostGraphile would report.
 * Most types are SCALAR, but Interval is registered as OBJECT in PostGraphile v5.
 */
function pgUdtToGraphQLKind(udtName: string): string {
  switch (udtName) {
    case 'interval': return 'OBJECT';
    default: return 'SCALAR';
  }
}

/**
 * Parse a PostgreSQL interval string into the object shape that PostGraphile's
 * Interval type returns: { years, months, days, hours, minutes, seconds }.
 * This simulates what the real PostGraphile server does.
 *
 * Handles formats like:
 *   '30 days' → { years: 0, months: 0, days: 30, hours: 0, minutes: 0, seconds: 0 }
 *   '01:30:00' → { years: 0, months: 0, days: 0, hours: 1, minutes: 30, seconds: 0 }
 */
function parsePgInterval(value: string): Record<string, number> {
  const result = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

  // Try HH:MM:SS format
  const timeMatch = value.match(/^(\d+):(\d+):(\d+)/);
  if (timeMatch) {
    result.hours = parseInt(timeMatch[1], 10);
    result.minutes = parseInt(timeMatch[2], 10);
    result.seconds = parseInt(timeMatch[3], 10);
    return result;
  }

  // Try descriptive format: 'N unit N unit ...'
  const parts = value.trim().split(/\s+/);
  for (let i = 0; i < parts.length - 1; i += 2) {
    const num = parseInt(parts[i], 10);
    const unit = parts[i + 1].toLowerCase();
    if (unit.startsWith('year')) result.years = num;
    else if (unit.startsWith('mon')) result.months = num;
    else if (unit.startsWith('day')) result.days = num;
    else if (unit.startsWith('hour')) result.hours = num;
    else if (unit.startsWith('minute')) result.minutes = num;
    else if (unit.startsWith('second')) result.seconds = num;
  }

  return result;
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

          -- Extended coverage tables (dynamic fields, array types, jsonb, renamed fields)
          CREATE TABLE metaschema_public.index (
            id uuid PRIMARY KEY,
            database_id uuid,
            schema_id uuid,
            table_id uuid,
            name text,
            type text,
            columns uuid[],
            predicates jsonb,
            is_unique boolean
          );
          CREATE TABLE metaschema_public.rls_function (
            id uuid PRIMARY KEY,
            database_id uuid,
            schema_id uuid,
            table_id uuid,
            role_name text,
            command text,
            function_name text,
            is_using boolean,
            with_check text,
            force_enabled boolean,
            priority int4
          );
          CREATE TABLE services_public.cors_settings (
            id uuid PRIMARY KEY,
            database_id uuid,
            api_id uuid,
            allowed_origins text[],
            allow_credentials boolean,
            max_age int4
          );
          CREATE TABLE metaschema_modules_public.user_auth_module (
            id uuid PRIMARY KEY,
            database_id uuid,
            schema_id uuid,
            sign_in_cross_origin_function text,
            one_time_token_function text,
            sign_in_function text,
            sign_up_function text,
            sign_out_function text
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

        // Seed extended coverage tables
        // index table — tests uuid[] and jsonb columns
        await pg.query(`
          INSERT INTO metaschema_public.index (id, database_id, schema_id, table_id, name, type, columns, predicates, is_unique)
          VALUES ($1, $2, $3, $4, 'users_pkey', 'btree', ARRAY[$5]::uuid[], '{"columns": ["id"]}'::jsonb, true)
        `, [INDEX_ID, DATABASE_ID, SCHEMA_ID_PUB, TABLE_ID_USERS, FIELD_ID_1]);

        // rls_function table — tests boolean and int columns
        await pg.query(`
          INSERT INTO metaschema_public.rls_function (id, database_id, schema_id, table_id, role_name, command, function_name, is_using, force_enabled, priority)
          VALUES ($1, $2, $3, $4, 'authenticated', 'SELECT', 'check_owner', true, true, 10)
        `, [RLS_FUNCTION_ID, DATABASE_ID, SCHEMA_ID_PUB, TABLE_ID_USERS]);

        // cors_settings table — tests text[] columns
        await pg.query(`
          INSERT INTO services_public.cors_settings (id, database_id, api_id, allowed_origins, allow_credentials, max_age)
          VALUES ($1, $2, $3, ARRAY['http://localhost:3000', 'https://example.com']::text[], true, 3600)
        `, [CORS_SETTINGS_ID, DATABASE_ID, API_ID]);

        // user_auth_module — tests the renamed field from PR #1172
        await pg.query(`
          INSERT INTO metaschema_modules_public.user_auth_module (id, database_id, schema_id, sign_in_cross_origin_function, one_time_token_function, sign_in_function, sign_up_function, sign_out_function)
          VALUES ($1, $2, $3, 'sign_in_cross_origin', 'generate_token', 'sign_in', 'sign_up', 'sign_out')
        `, [USER_AUTH_MODULE_ID, DATABASE_ID, SCHEMA_ID_PUB]);
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

    // We didn't seed some modules, so those tables should be absent from both
    const unseededTables = [
      'rls_module', 'memberships_module', 'permissions_module', 'limits_module', 'levels_module'
    ];

    for (const table of unseededTables) {
      expect(sqlResult[table]).toBeUndefined();
      expect(gqlResult[table]).toBeUndefined();
    }
  });

  it('index table with uuid[] and jsonb columns should be identical across both flows', async () => {
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

    // Both flows should export the index table
    expect(sqlResult['index']).toBeDefined();
    expect(gqlResult['index']).toBeDefined();
    expect(gqlResult['index']?.trim()).toBe(sqlResult['index']?.trim());
  });

  it('rls_function table with boolean and int columns should be identical across both flows', async () => {
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

    expect(sqlResult['rls_function']).toBeDefined();
    expect(gqlResult['rls_function']).toBeDefined();
    expect(gqlResult['rls_function']?.trim()).toBe(sqlResult['rls_function']?.trim());
  });

  it('cors_settings table with text[] columns should be identical across both flows', async () => {
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

    expect(sqlResult['cors_settings']).toBeDefined();
    expect(gqlResult['cors_settings']).toBeDefined();
    expect(gqlResult['cors_settings']?.trim()).toBe(sqlResult['cors_settings']?.trim());
  });

  it('user_auth_module (PR #1172 renamed field) should be identical across both flows', async () => {
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

    // The key bug that PR #1172 fixed: sign_in_one_time_token_function → sign_in_cross_origin_function
    // With dynamic fields, both flows discover this field from the DB schema automatically
    expect(sqlResult['user_auth_module']).toBeDefined();
    expect(gqlResult['user_auth_module']).toBeDefined();
    expect(gqlResult['user_auth_module']?.trim()).toBe(sqlResult['user_auth_module']?.trim());

    // Verify the renamed field is present in the output
    expect(sqlResult['user_auth_module']).toContain('sign_in_cross_origin');
  });
});
