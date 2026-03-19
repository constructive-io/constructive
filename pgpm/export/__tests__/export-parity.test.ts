/**
 * Integration test: SQL vs GraphQL export parity.
 *
 * Sets up a real temporary PostgreSQL database with shim schemas, seeds it with
 * deterministic data, then runs both exportMigrations (SQL flow) and
 * exportGraphQL (GraphQL flow) against it. The GraphQL flow uses a mocked
 * GraphQLClient that reads directly from the same real DB (converting rows to
 * camelCase to simulate PostGraphile), and delegates exportGraphQLMeta to the
 * real exportMeta, guaranteeing identical metadata.  The test asserts that
 * every file path and its content are byte-identical across the two output
 * trees.
 *
 * PREREQUISITES: A local PostgreSQL server reachable via pg-env defaults.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Mock @pgpmjs/migrate-client (used by the GraphQL flow for sql_actions via ORM).
// ---------------------------------------------------------------------------
const mockFindMany = jest.fn();
jest.mock('@pgpmjs/migrate-client', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    sqlAction: {
      findMany: mockFindMany
    }
  }))
}));

// ---------------------------------------------------------------------------
// Mock the GraphQLClient (used by the GraphQL flow for meta endpoint only).
// ---------------------------------------------------------------------------
jest.mock('../src/graphql-client', () => ({
  GraphQLClient: jest.fn().mockImplementation(() => ({
    fetchAllNodes: jest.fn().mockResolvedValue([])
  }))
}));

// Mock exportGraphQLMeta so we can make it delegate to the real SQL exportMeta
jest.mock('../src/export-graphql-meta', () => ({
  exportGraphQLMeta: jest.fn()
}));

import { PgpmPackage, PgpmMigrate } from '@pgpmjs/core';
import { createClient } from '@pgpmjs/migrate-client';
import { exportGraphQL } from '../src/export-graphql';
import { exportMigrations } from '../src/export-migrations';
import { exportMeta } from '../src/export-meta';
import { GraphQLClient } from '../src/graphql-client';
import { exportGraphQLMeta } from '../src/export-graphql-meta';
import { camelize } from 'inflekt';
import { getConnections, seed } from 'pgsql-test';

import type { PgpmPackage as PgpmPackageType } from '@pgpmjs/core';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

jest.setTimeout(120_000);

const DATABASE_ID = 'a1b2c3d4-e5f6-4708-b250-000000000001';
const DATABASE_NAME = 'pets';
const EXTENSION_NAME = 'pets-export';
const META_EXTENSION_NAME = 'pets-export-svc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively collect every file under `dir` → { relativePath: content }. */
const collectFiles = (dir: string, base = dir): Record<string, string> => {
  const result: Record<string, string> = {};
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(result, collectFiles(full, base));
    } else {
      result[path.relative(base, full)] = fs.readFileSync(full, 'utf8');
    }
  }
  return result;
};

/** Convert a snake_case Postgres row to camelCase (simulating PostGraphile). */
const pgRowToCamel = (row: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[camelize(k, true)] = v;
  }
  return out;
};

// ---------------------------------------------------------------------------
// Database setup (mirrors core/__tests__/export/export-flow.test.ts)
// ---------------------------------------------------------------------------

const SCHEMA_SHIMS_SQL = `
  CREATE SCHEMA IF NOT EXISTS metaschema_public;
  CREATE SCHEMA IF NOT EXISTS metaschema_modules_public;
  CREATE SCHEMA IF NOT EXISTS services_public;
  CREATE SCHEMA IF NOT EXISTS db_migrate;

  CREATE TABLE IF NOT EXISTS metaschema_public.database (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid, name text, hash uuid
  );
  CREATE TABLE IF NOT EXISTS metaschema_public.database_extension (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid, name text
  );
  CREATE TABLE IF NOT EXISTS metaschema_public.schema (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid REFERENCES metaschema_public.database(id),
    name text, schema_name text, description text
  );
  CREATE TABLE IF NOT EXISTS metaschema_public.table (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid REFERENCES metaschema_public.database(id),
    schema_id uuid REFERENCES metaschema_public.schema(id), name text, description text
  );
  CREATE TABLE IF NOT EXISTS metaschema_public.field (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid REFERENCES metaschema_public.database(id),
    table_id uuid REFERENCES metaschema_public.table(id), name text, type text, description text
  );

  CREATE TABLE IF NOT EXISTS services_public.domains (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid, site_id uuid, api_id uuid, domain text, subdomain text
  );
  CREATE TABLE IF NOT EXISTS services_public.apis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid, name text, dbname text,
    is_public boolean, role_name text, anon_role text
  );
  CREATE TABLE IF NOT EXISTS services_public.sites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid, title text, description text,
    og_image text, favicon text, apple_touch_icon text, logo text, dbname text
  );
  CREATE TABLE IF NOT EXISTS services_public.api_schemas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid, schema_id uuid, api_id uuid
  );
  CREATE TABLE IF NOT EXISTS services_public.apps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid, site_id uuid, name text,
    app_image text, app_store_link text, app_store_id text, app_id_prefix text, play_store_link text
  );
  CREATE TABLE IF NOT EXISTS services_public.site_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid, site_id uuid, name text, data jsonb
  );
  CREATE TABLE IF NOT EXISTS services_public.site_themes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid, site_id uuid, theme jsonb
  );
  CREATE TABLE IF NOT EXISTS services_public.site_metadata (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid, site_id uuid, key text, value text
  );
  CREATE TABLE IF NOT EXISTS services_public.api_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid, api_id uuid, name text, data jsonb
  );
  CREATE TABLE IF NOT EXISTS services_public.api_extensions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), database_id uuid, api_id uuid, schema_name text
  );

  CREATE TABLE IF NOT EXISTS db_migrate.sql_actions (
    id SERIAL PRIMARY KEY, name text, database_id uuid, deploy text, deps text[], payload json,
    content text, revert text, verify text, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(database_id, deploy)
  );
`;

const SEED_SQL = `
  INSERT INTO metaschema_public.database (id, owner_id, name, hash) VALUES
    ('${DATABASE_ID}', '00000000-0000-0000-0000-000000000001', '${DATABASE_NAME}', 'f1e2d3c4-b5a6-5c2e-9a07-000000000001');

  INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, description) VALUES
    ('aaaa0001-0000-0000-0000-000000000001', '${DATABASE_ID}', 'public', 'pets_public', 'Public-facing tables'),
    ('aaaa0002-0000-0000-0000-000000000001', '${DATABASE_ID}', 'private', 'pets_private', 'Internal tables');

  INSERT INTO metaschema_public.table (id, database_id, schema_id, name, description) VALUES
    ('bbbb0001-0000-0000-0000-000000000001', '${DATABASE_ID}', 'aaaa0001-0000-0000-0000-000000000001', 'owners', 'Pet owners'),
    ('bbbb0002-0000-0000-0000-000000000001', '${DATABASE_ID}', 'aaaa0001-0000-0000-0000-000000000001', 'pets', 'Pets'),
    ('bbbb0003-0000-0000-0000-000000000001', '${DATABASE_ID}', 'aaaa0001-0000-0000-0000-000000000001', 'species', 'Pet species');

  INSERT INTO metaschema_public.field (id, database_id, table_id, name, type, description) VALUES
    ('cccc0001-0000-0000-0000-000000000001', '${DATABASE_ID}', 'bbbb0001-0000-0000-0000-000000000001', 'id', 'uuid', 'Primary key'),
    ('cccc0002-0000-0000-0000-000000000001', '${DATABASE_ID}', 'bbbb0001-0000-0000-0000-000000000001', 'name', 'text', 'Owner name'),
    ('cccc0003-0000-0000-0000-000000000001', '${DATABASE_ID}', 'bbbb0001-0000-0000-0000-000000000001', 'email', 'text', 'Contact email');

  INSERT INTO services_public.apis (id, database_id, name, dbname, is_public, role_name, anon_role) VALUES
    ('eeee0001-0000-0000-0000-000000000001', '${DATABASE_ID}', 'public', 'pets-db', true, 'authenticated', 'anonymous');

  INSERT INTO services_public.sites (id, database_id, title, description, dbname) VALUES
    ('ffff0001-0000-0000-0000-000000000001', '${DATABASE_ID}', 'Pet Clinic', 'A pet management application', '${DATABASE_NAME}');

  INSERT INTO services_public.domains (id, database_id, domain, subdomain) VALUES
    ('dddd0001-0000-0000-0000-000000000001', '${DATABASE_ID}', 'localhost', 'pets');

  INSERT INTO services_public.api_schemas (id, database_id, schema_id, api_id) VALUES
    ('1111aaaa-0000-0000-0000-000000000001', '${DATABASE_ID}', 'aaaa0001-0000-0000-0000-000000000001', 'eeee0001-0000-0000-0000-000000000001');

  INSERT INTO db_migrate.sql_actions (name, database_id, deploy, deps, content, revert, verify) VALUES
    ('Create pets_public schema', '${DATABASE_ID}', 'schemas/pets_public/schema',
     ARRAY[]::text[], 'CREATE SCHEMA pets_public;', 'DROP SCHEMA pets_public;',
     $$SELECT 1 FROM information_schema.schemata WHERE schema_name = 'pets_public';$$),
    ('Create pets_private schema', '${DATABASE_ID}', 'schemas/pets_private/schema',
     ARRAY[]::text[], 'CREATE SCHEMA pets_private;', 'DROP SCHEMA pets_private;',
     $$SELECT 1 FROM information_schema.schemata WHERE schema_name = 'pets_private';$$),
    ('Create species table', '${DATABASE_ID}', 'schemas/pets_public/tables/species/table',
     ARRAY['schemas/pets_public/schema']::text[],
     E'CREATE TABLE pets_public.species (\\n  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),\\n  name citext NOT NULL UNIQUE,\\n  description text\\n);',
     'DROP TABLE pets_public.species;',
     $$SELECT 1 FROM information_schema.tables WHERE table_schema = 'pets_public' AND table_name = 'species';$$),
    ('Create owners table', '${DATABASE_ID}', 'schemas/pets_public/tables/owners/table',
     ARRAY['schemas/pets_public/schema']::text[],
     E'CREATE TABLE pets_public.owners (\\n  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),\\n  name text NOT NULL,\\n  email text UNIQUE\\n);',
     'DROP TABLE pets_public.owners;',
     $$SELECT 1 FROM information_schema.tables WHERE table_schema = 'pets_public' AND table_name = 'owners';$$),
    ('Create pets table', '${DATABASE_ID}', 'schemas/pets_public/tables/pets/table',
     ARRAY['schemas/pets_public/tables/owners/table', 'schemas/pets_public/tables/species/table']::text[],
     E'CREATE TABLE pets_public.pets (\\n  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),\\n  owner_id uuid NOT NULL REFERENCES pets_public.owners(id),\\n  species_id uuid REFERENCES pets_public.species(id),\\n  name text NOT NULL\\n);',
     'DROP TABLE pets_public.pets;',
     $$SELECT 1 FROM information_schema.tables WHERE table_schema = 'pets_public' AND table_name = 'pets';$$);
`;

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('export parity — SQL vs GraphQL (integration)', () => {
  let tempDir: string;
  let dbConfig: any;
  let sqlWorkspaceDir: string;
  let graphqlWorkspaceDir: string;
  let teardown: () => Promise<void>;

  // Pre-fetched from the real DB in beforeAll (before exportMigrations ends the pool)
  let schemaNames: string[];
  let schemas: any[];
  let camelActions: Record<string, unknown>[];
  let metaResult: Record<string, string>;

  // Suppress noisy console output from internal export functions
  const originalLog = console.log;
  beforeAll(async () => {
    console.log = () => {};
  });
  afterAll(() => {
    console.log = originalLog;
  });

  // ---- one-time setup: create temp DB + seed it ----
  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'pgpm-parity-int-'));

    ({ teardown } = await getConnections({}, [
      seed.fn(async ({ pg: pgClient, config }: any) => {
        dbConfig = config;

        // Initialize pgpm_migrate schema
        const migrate = new PgpmMigrate(config);
        await migrate.initialize();

        // Create shim schemas + tables
        await pgClient.query(SCHEMA_SHIMS_SQL);

        // Seed data
        await pgClient.query(SEED_SQL);

        const schemaResult = await pgClient.query(
          'SELECT * FROM metaschema_public.schema WHERE database_id = $1',
          [DATABASE_ID]
        );
        schemas = schemaResult.rows;
        schemaNames = schemas.map((r: any) => r.schema_name);

        const sqlActionsResult = await pgClient.query(
          'SELECT * FROM db_migrate.sql_actions WHERE database_id = $1 ORDER BY id',
          [DATABASE_ID]
        );
        camelActions = sqlActionsResult.rows.map(pgRowToCamel);

        // Run the real SQL-based exportMeta to get the meta result that both flows will use
        metaResult = await exportMeta({ opts: { pg: config }, dbname: config.database, database_id: DATABASE_ID });
      })
    ]));

    // ---- Prepare two isolated workspaces for the exports ----
    for (const label of ['sql-flow', 'graphql-flow']) {
      const wsDir = path.join(tempDir, label);
      const pkgsDir = path.join(wsDir, 'packages');
      fs.mkdirSync(path.join(wsDir, 'extensions'), { recursive: true });
      fs.mkdirSync(pkgsDir, { recursive: true });
      fs.writeFileSync(path.join(wsDir, 'pgpm.json'), JSON.stringify({ packages: ['packages/*', 'extensions/*'] }));
      fs.writeFileSync(path.join(wsDir, 'package.json'), JSON.stringify({ name: label, version: '1.0.0', private: true }));

      // Pre-create module dirs so preparePackage skips initModule (no TTY)
      for (const mod of [EXTENSION_NAME, META_EXTENSION_NAME]) {
        const modDir = path.join(pkgsDir, mod);
        fs.mkdirSync(modDir, { recursive: true });
        fs.writeFileSync(path.join(modDir, 'package.json'), JSON.stringify({ name: mod, version: '1.0.0' }));
        fs.writeFileSync(path.join(modDir, `${mod}.control`), `comment='test'\ndefault_version='1.0.0'\n`);
        fs.writeFileSync(path.join(modDir, 'pgpm.plan'), `%syntax-version=1.0.0\n%project=${mod}\n%uri=${mod}\n`);
      }
    }

    sqlWorkspaceDir = path.join(tempDir, 'sql-flow');
    graphqlWorkspaceDir = path.join(tempDir, 'graphql-flow');
  });

  afterAll(async () => {
    await teardown();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // =========================================================================
  // Main parity test
  // =========================================================================

  it('should produce identical output for SQL and GraphQL export flows', async () => {
    // ---- SQL flow (real DB, no mocks) ----
    const sqlProject = new PgpmPackage(sqlWorkspaceDir);
    await exportMigrations({
      project: sqlProject,
      options: { pg: dbConfig },
      dbInfo: {
        dbname: dbConfig.database,
        databaseName: DATABASE_NAME,
        database_ids: [DATABASE_ID]
      },
      schema_names: schemaNames,
      author: 'test <test@test.local>',
      outdir: path.join(sqlWorkspaceDir, 'packages'),
      extensionName: EXTENSION_NAME,
      metaExtensionName: META_EXTENSION_NAME
    });

    // ---- GraphQL flow (mock ORM + exportGraphQLMeta) ----

    // Mock the migrate-client ORM's findMany to return all camelCase actions
    // in a single page (simulating the ORM's unwrap() result format).
    mockFindMany.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({
        sqlActions: {
          nodes: camelActions,
          totalCount: camelActions.length,
          pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null }
        }
      })
    });

    // exportGraphQLMeta returns the pre-fetched meta result (same as SQL flow used)
    (exportGraphQLMeta as any).mockImplementation(async () => metaResult);

    const graphqlProject = new PgpmPackage(graphqlWorkspaceDir);
    await exportGraphQL({
      project: graphqlProject,
      metaEndpoint: 'http://localhost:3002/graphql',
      migrateEndpoint: 'http://db_migrate.localhost:3000/graphql',
      token: undefined,
      headers: { 'X-Meta-Schema': 'true' },
      databaseId: DATABASE_ID,
      databaseName: DATABASE_NAME,
      schema_names: schemaNames,
      schemas,
      author: 'test <test@test.local>',
      outdir: path.join(graphqlWorkspaceDir, 'packages'),
      extensionName: EXTENSION_NAME,
      metaExtensionName: META_EXTENSION_NAME
    });

    // ---- Compare full output trees ----
    const sqlPkgs = path.join(sqlWorkspaceDir, 'packages');
    const gqlPkgs = path.join(graphqlWorkspaceDir, 'packages');

    const sqlFiles = collectFiles(sqlPkgs);
    const graphqlFiles = collectFiles(gqlPkgs);

    // Exclude pre-created scaffold files (package.json, .control, pgpm.plan)
    // that exist before the export ran — we only care about what export wrote.
    const isScaffold = (p: string) =>
      p.endsWith('package.json') || p.endsWith('.control');
    const filterScaffold = (files: Record<string, string>) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(files)) {
        if (!isScaffold(k)) out[k] = v;
      }
      return out;
    };

    const sqlFiltered = filterScaffold(sqlFiles);
    const gqlFiltered = filterScaffold(graphqlFiles);

    const sqlPaths = Object.keys(sqlFiltered).sort();
    const gqlPaths = Object.keys(gqlFiltered).sort();

    // Same set of files
    expect(sqlPaths).toEqual(gqlPaths);

    // Identical content for every file
    for (const relPath of sqlPaths) {
      expect({ path: relPath, content: sqlFiltered[relPath] })
        .toEqual({ path: relPath, content: gqlFiltered[relPath] });
    }

    // Sanity checks
    expect(sqlPaths.some(p => p.includes(EXTENSION_NAME) && p.endsWith('pgpm.plan'))).toBe(true);
    expect(sqlPaths.some(p => p.includes(META_EXTENSION_NAME) && p.endsWith('pgpm.plan'))).toBe(true);
    expect(sqlPaths.some(p => p.includes('/deploy/'))).toBe(true);
    expect(sqlPaths.some(p => p.includes('/revert/'))).toBe(true);
    expect(sqlPaths.some(p => p.includes('/verify/'))).toBe(true);
  });

  // =========================================================================
  // Graceful handling when sql_actions are absent
  // =========================================================================

  it('should handle missing sql_actions gracefully in GraphQL flow', async () => {
    const noMigrateWs = path.join(tempDir, 'graphql-no-migrate');
    const pkgsDir = path.join(noMigrateWs, 'packages');
    fs.mkdirSync(path.join(noMigrateWs, 'extensions'), { recursive: true });
    fs.mkdirSync(pkgsDir, { recursive: true });
    fs.writeFileSync(path.join(noMigrateWs, 'pgpm.json'), JSON.stringify({ packages: ['packages/*', 'extensions/*'] }));
    fs.writeFileSync(path.join(noMigrateWs, 'package.json'), JSON.stringify({ name: 'no-migrate', version: '1.0.0', private: true }));

    // Pre-create svc module dir
    const svcDir = path.join(pkgsDir, META_EXTENSION_NAME);
    fs.mkdirSync(svcDir, { recursive: true });
    fs.writeFileSync(path.join(svcDir, 'package.json'), JSON.stringify({ name: META_EXTENSION_NAME, version: '1.0.0' }));
    fs.writeFileSync(path.join(svcDir, `${META_EXTENSION_NAME}.control`), `comment='test'\ndefault_version='1.0.0'\n`);
    fs.writeFileSync(path.join(svcDir, 'pgpm.plan'), `%syntax-version=1.0.0\n%project=${META_EXTENSION_NAME}\n%uri=${META_EXTENSION_NAME}\n`);

    // ORM mock returns empty (no sql_actions) — but migrateEndpoint is undefined
    // so the ORM won't even be called. Reset it anyway for cleanliness.
    mockFindMany.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({
        sqlActions: {
          nodes: [],
          totalCount: 0,
          pageInfo: { hasNextPage: false, hasPreviousPage: false, endCursor: null }
        }
      })
    });

    // exportGraphQLMeta returns the pre-fetched meta result
    (exportGraphQLMeta as any).mockImplementation(async () => metaResult);

    const project = new PgpmPackage(noMigrateWs);
    await exportGraphQL({
      project,
      metaEndpoint: 'http://localhost:3002/graphql',
      migrateEndpoint: undefined,
      token: undefined,
      headers: { 'X-Meta-Schema': 'true' },
      databaseId: DATABASE_ID,
      databaseName: DATABASE_NAME,
      schema_names: schemas.map((s: any) => s.schema_name),
      schemas,
      author: 'test <test@test.local>',
      outdir: pkgsDir,
      extensionName: EXTENSION_NAME,
      metaExtensionName: META_EXTENSION_NAME
    });

    // Service module should exist (meta data was available)
    expect(fs.existsSync(path.join(pkgsDir, META_EXTENSION_NAME, 'deploy'))).toBe(true);
    // Database module should NOT exist (no sql_actions, no migrateEndpoint)
    expect(fs.existsSync(path.join(pkgsDir, EXTENSION_NAME, 'deploy'))).toBe(false);
  });
});
