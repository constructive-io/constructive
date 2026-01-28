/**
 * Collect Simple Seed Services
 *
 * Collects the simple-seed and simple-seed-services bundles, along with
 * metaschema/services/modules DDL from pgpm packages, to generate fixture files
 * for integration tests.
 *
 * Reads directly from pre-generated bundle SQL files - no seed-generators dependency.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

// ============================================================================
// Paths to pre-generated bundle SQL files
// ============================================================================

const CONSTRUCTIVE_DB_ROOT = path.resolve(__dirname, '../../../../../constructive-db');
const TESTING_DIR = path.join(CONSTRUCTIVE_DB_ROOT, 'testing');
const PGPM_MODULES_DIR = path.join(CONSTRUCTIVE_DB_ROOT, 'pgpm-modules');

// Bundle file paths
const SIMPLE_SEED_BUNDLE = path.join(TESTING_DIR, 'simple-seed/sql/simple-seed--0.0.1.sql');
const SIMPLE_SEED_SERVICES_BUNDLE = path.join(TESTING_DIR, 'simple-seed-services/sql/simple-seed-services--0.0.1.sql');
const METASCHEMA_SCHEMA_BUNDLE = path.join(PGPM_MODULES_DIR, 'metaschema-schema/sql/metaschema-schema--0.15.5.sql');
const METASCHEMA_MODULES_BUNDLE = path.join(PGPM_MODULES_DIR, 'metaschema-modules/sql/metaschema-modules--0.15.5.sql');
const SERVICES_DEPLOY_DIR = path.join(PGPM_MODULES_DIR, 'services/deploy/schemas');

// Output directory
const DEST_DIR = path.resolve(__dirname, '../__fixtures__/seed/simple-seed-services');

// ============================================================================
// Fixed IDs (from seed-generators constants, stable for testing)
// ============================================================================

const FIXED_IDS = {
  DATABASE_ID: '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  PUBLIC_SCHEMA_ID: '6d264733-40be-4214-0c97-c3dbe8ba3b05',
  PETS_SCHEMA_ID: '6d263af4-8431-4454-0f8b-301a421fd6cc',
  APP_API_ID: '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
  PRIVATE_API_ID: 'e257c53d-6ba6-40de-b679-61b37188a316',
} as const;

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Strips the pgpm header from bundle SQL files.
 * Removes \echo and \quit lines that prevent direct execution.
 */
function stripPgpmHeader(sql: string): string {
  const lines = sql.split(/\r?\n/);
  const filtered = lines.filter((line) => {
    if (line.startsWith('\\echo Use "CREATE EXTENSION')) return false;
    if (line.trim() === '\\quit') return false;
    return true;
  });
  return filtered.join('\n').trim();
}

/**
 * Strips sqitch deploy file headers (BEGIN/COMMIT, comments).
 */
function stripSqitchHeader(sql: string): string {
  const lines = sql.split(/\r?\n/);
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('-- Deploy ')) return false;
    if (trimmed.startsWith('-- requires:')) return false;
    if (trimmed === 'BEGIN;') return false;
    if (trimmed === 'COMMIT;') return false;
    return true;
  });
  return filtered.join('\n').trim();
}

/**
 * Reads a bundle SQL file and strips the pgpm header.
 */
async function readBundle(bundlePath: string): Promise<string> {
  const sql = await fs.readFile(bundlePath, 'utf8');
  return stripPgpmHeader(sql);
}

/**
 * Reads a sqitch deploy file and strips headers.
 */
async function readDeployFile(filePath: string): Promise<string> {
  try {
    const sql = await fs.readFile(filePath, 'utf8');
    return stripSqitchHeader(sql);
  } catch {
    return '';
  }
}

/**
 * Reads the services schema DDL from deploy files.
 * Since services doesn't have a pre-built bundle, we concatenate the deploy files.
 */
async function readServicesDeployFiles(): Promise<string> {
  const parts: string[] = [];

  // Read services_public schema
  const publicSchemaFile = path.join(SERVICES_DEPLOY_DIR, 'services_public', 'schema.sql');
  const publicSchema = await readDeployFile(publicSchemaFile);
  if (publicSchema) parts.push(publicSchema);

  // Read tables in order (dependencies matter)
  const tables = ['apis', 'sites', 'domains', 'api_schemas', 'api_modules', 'site_modules', 'site_metadata', 'site_themes', 'apps'];
  const tablesDir = path.join(SERVICES_DEPLOY_DIR, 'services_public', 'tables');

  for (const table of tables) {
    const tableFile = path.join(tablesDir, table, 'table.sql');
    const tableSql = await readDeployFile(tableFile);
    if (tableSql) parts.push(tableSql);
  }

  // Read services_private schema if exists
  const privateSchemaFile = path.join(SERVICES_DEPLOY_DIR, 'services_private', 'schema.sql');
  const privateSchema = await readDeployFile(privateSchemaFile);
  if (privateSchema) parts.push(privateSchema);

  return parts.join('\n\n');
}

// ============================================================================
// Static SQL content
// ============================================================================

const SETUP_SQL = `-- Prerequisites
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Custom domain types from @pgpm/types (required by services_public tables)
CREATE DOMAIN hostname AS text CHECK (VALUE ~ '^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9])\\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\\-]*[A-Za-z0-9])$');
CREATE DOMAIN attachment AS text CHECK (VALUE ~ '^(https?)://[^\\s/$.?#].[^\\s]*$');
CREATE DOMAIN image AS jsonb CHECK (
  jsonb_typeof(VALUE) = 'object' AND
  VALUE ? 'url' AND
  VALUE ? 'width' AND
  VALUE ? 'height'
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'administrator') THEN CREATE ROLE administrator; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN CREATE ROLE anonymous; END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS stamps;
CREATE OR REPLACE FUNCTION stamps.timestamps() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN NEW.created_at = COALESCE(NEW.created_at, now()); END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

const TEST_DATA_SQL = `-- Test data
INSERT INTO "simple-pets-pets-public".animals (name, species) VALUES
  ('Max', 'Dog'), ('Whiskers', 'Cat'), ('Buddy', 'Dog'), ('Luna', 'Cat'), ('Charlie', 'Bird');

-- Explicit grants (ALTER DEFAULT PRIVILEGES doesn't apply in test context)
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-pets-pets-public".animals TO administrator, authenticated, anonymous;


-- Admin access for meta schemas
GRANT USAGE ON SCHEMA metaschema_public TO administrator;
GRANT SELECT ON ALL TABLES IN SCHEMA metaschema_public TO administrator;
GRANT USAGE ON SCHEMA metaschema_modules_public TO administrator;
GRANT SELECT ON ALL TABLES IN SCHEMA metaschema_modules_public TO administrator;

-- Admin access for services schema (required for API lookup via GraphQL)
GRANT USAGE ON SCHEMA services_public TO administrator;
GRANT SELECT ON ALL TABLES IN SCHEMA services_public TO administrator;


-- Services API wiring for integration tests
UPDATE services_public.apis
SET dbname = current_database()
WHERE database_id = '${FIXED_IDS.DATABASE_ID}';

-- Domain for public API (app.test.constructive.io)
INSERT INTO services_public.domains (
  id,
  database_id,
  site_id,
  api_id,
  domain,
  subdomain
) VALUES (
  uuid_generate_v4(),
  '${FIXED_IDS.DATABASE_ID}',
  NULL,
  '${FIXED_IDS.APP_API_ID}',
  'constructive.io',
  'app.test'
) ON CONFLICT (subdomain, domain)
DO UPDATE SET api_id = EXCLUDED.api_id;

-- Domain for private API (private.test.constructive.io)
INSERT INTO services_public.domains (
  id,
  database_id,
  site_id,
  api_id,
  domain,
  subdomain
) VALUES (
  uuid_generate_v4(),
  '${FIXED_IDS.DATABASE_ID}',
  NULL,
  '${FIXED_IDS.PRIVATE_API_ID}',
  'constructive.io',
  'private.test'
) ON CONFLICT (subdomain, domain)
DO UPDATE SET api_id = EXCLUDED.api_id;

-- API schemas for public API
INSERT INTO services_public.api_schemas (
  id,
  database_id,
  schema_id,
  api_id
) VALUES
(uuid_generate_v4(), '${FIXED_IDS.DATABASE_ID}', '${FIXED_IDS.PUBLIC_SCHEMA_ID}', '${FIXED_IDS.APP_API_ID}'),
(uuid_generate_v4(), '${FIXED_IDS.DATABASE_ID}', '${FIXED_IDS.PETS_SCHEMA_ID}', '${FIXED_IDS.APP_API_ID}')
ON CONFLICT (api_id, schema_id) DO NOTHING;

-- API schemas for private API
INSERT INTO services_public.api_schemas (
  id,
  database_id,
  schema_id,
  api_id
)
SELECT
  uuid_generate_v4(),
  '${FIXED_IDS.DATABASE_ID}',
  schema_id,
  '${FIXED_IDS.PRIVATE_API_ID}'
FROM (VALUES
  ('${FIXED_IDS.PUBLIC_SCHEMA_ID}'::uuid),
  ('${FIXED_IDS.PETS_SCHEMA_ID}'::uuid)
) AS v(schema_id)
ON CONFLICT (api_id, schema_id) DO NOTHING;`;

// ============================================================================
// Main
// ============================================================================

async function writeSeedFiles(): Promise<void> {
  console.log('Reading bundle files...');

  // Read all bundle files
  const [simpleSeedSql, servicesSeedSql, metaschemaSchemaSql, metaschemaModulesSql, servicesSchemaSql] = await Promise.all([
    readBundle(SIMPLE_SEED_BUNDLE),
    readBundle(SIMPLE_SEED_SERVICES_BUNDLE),
    readBundle(METASCHEMA_SCHEMA_BUNDLE),
    readBundle(METASCHEMA_MODULES_BUNDLE),
    readServicesDeployFiles()
  ]);

  console.log(`  simple-seed: ${simpleSeedSql.length} bytes`);
  console.log(`  simple-seed-services: ${servicesSeedSql.length} bytes`);
  console.log(`  metaschema-schema: ${metaschemaSchemaSql.length} bytes`);
  console.log(`  metaschema-modules: ${metaschemaModulesSql.length} bytes`);
  console.log(`  services (from deploy): ${servicesSchemaSql.length} bytes`);

  // Combine all schema DDL in the correct order:
  // 1. Metaschema-schema (creates metaschema_public tables) - MUST come first
  // 2. Services schema (creates services_public tables)
  // 3. Metaschema-modules (creates metaschema_modules_public tables)
  // 4. Simple seed schemas (creates the actual app tables)
  // 5. Simple seed services data (inserts into metaschema/services tables)
  const schemaSql = [
    '-- Metaschema Schema DDL',
    metaschemaSchemaSql,
    '',
    '-- Services Schema DDL',
    servicesSchemaSql,
    '',
    '-- Metaschema Modules Schema DDL',
    metaschemaModulesSql,
    '',
    '-- Simple Seed Schema DDL',
    simpleSeedSql,
    '',
    '-- Simple Seed Services Data',
    servicesSeedSql
  ].join('\n\n');

  // Write fixture files
  await fs.mkdir(DEST_DIR, { recursive: true });
  await fs.writeFile(path.join(DEST_DIR, 'setup.sql'), `${SETUP_SQL}\n`, 'utf8');
  await fs.writeFile(path.join(DEST_DIR, 'schema.sql'), `${schemaSql}\n`, 'utf8');
  await fs.writeFile(path.join(DEST_DIR, 'test-data.sql'), `${TEST_DATA_SQL}\n`, 'utf8');

  console.log(`Seed SQL written to ${DEST_DIR}`);
}

writeSeedFiles().catch((error) => {
  console.error('Failed to collect simple-seed-services:', error);
  process.exitCode = 1;
});
