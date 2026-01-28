/**
 * Collect Simple Seed
 *
 * Collects the simple-seed bundle and generates fixture files for integration tests.
 * Reads directly from pre-generated bundle SQL files - no seed-generators dependency.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

// ============================================================================
// Paths to pre-generated bundle SQL files
// ============================================================================

const CONSTRUCTIVE_DB_ROOT = path.resolve(__dirname, '../../../../../constructive-db');
const TESTING_DIR = path.join(CONSTRUCTIVE_DB_ROOT, 'testing');

// Bundle file paths
const SIMPLE_SEED_BUNDLE = path.join(TESTING_DIR, 'simple-seed/sql/simple-seed--0.0.1.sql');

// Output directory
const DEST_DIR = path.resolve(__dirname, '../__fixtures__/seed/simple-seed');

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
 * Reads a bundle SQL file and strips the pgpm header.
 */
async function readBundle(bundlePath: string): Promise<string> {
  const sql = await fs.readFile(bundlePath, 'utf8');
  return stripPgpmHeader(sql);
}

// ============================================================================
// Static SQL content
// ============================================================================

const SETUP_SQL = `-- Prerequisites
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-pets-pets-public".animals TO administrator, authenticated, anonymous;`;

// ============================================================================
// Main
// ============================================================================

async function writeSeedFiles(): Promise<void> {
  console.log('Reading bundle files...');
  console.log(`  simple-seed: ${SIMPLE_SEED_BUNDLE}`);

  // Read schema DDL from the simple-seed bundle
  const schemaSql = await readBundle(SIMPLE_SEED_BUNDLE);
  console.log(`  Read ${schemaSql.length} bytes from simple-seed bundle`);

  // Write fixture files
  await fs.mkdir(DEST_DIR, { recursive: true });
  await fs.writeFile(path.join(DEST_DIR, 'setup.sql'), `${SETUP_SQL}\n`, 'utf8');
  await fs.writeFile(path.join(DEST_DIR, 'schema.sql'), `${schemaSql}\n`, 'utf8');
  await fs.writeFile(path.join(DEST_DIR, 'test-data.sql'), `${TEST_DATA_SQL}\n`, 'utf8');

  console.log(`Seed SQL written to ${DEST_DIR}`);
}

writeSeedFiles().catch((error) => {
  console.error('Failed to collect simple-seed:', error);
  process.exitCode = 1;
});
