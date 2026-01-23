import { promises as fs } from 'node:fs';
import path from 'node:path';

const SIMPLE_SEED_SQL = path.resolve(
  __dirname,
  '../../../../constructive-db/testing/simple-seed/sql/simple-seed--0.0.1.sql'
);
const SERVICES_SQL = path.resolve(
  __dirname,
  '../../../../constructive-db/testing/simple-seed-services/sql/simple-seed-services--0.0.1.sql'
);
const DEST_DIR = path.resolve(
  __dirname,
  '../__fixtures__/seed/simple-seed-services'
);

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
$$ LANGUAGE plpgsql;
`;

const TEST_DATA_SQL = `-- Test data
INSERT INTO "simple-pets-pets-public".animals (name, species) VALUES
  ('Max', 'Dog'), ('Whiskers', 'Cat'), ('Buddy', 'Dog'), ('Luna', 'Cat'), ('Charlie', 'Bird');

-- Explicit grants (ALTER DEFAULT PRIVILEGES doesn't apply in test context)
GRANT SELECT, INSERT, UPDATE, DELETE ON "simple-pets-pets-public".animals TO administrator, authenticated, anonymous;
`;

function stripPgpmHeader(sql: string): string {
  const lines = sql.split(/\r?\n/);
  const filtered = lines.filter((line) => {
    if (line.startsWith('\\echo Use "CREATE EXTENSION')) {
      return false;
    }
    if (line.trim() === '\\quit') {
      return false;
    }
    return true;
  });
  return filtered.join('\n').trim();
}

async function writeSeedFiles(): Promise<void> {
  const baseSql = await fs.readFile(SIMPLE_SEED_SQL, 'utf8');
  const servicesSql = await fs.readFile(SERVICES_SQL, 'utf8');
  const schemaSql = [
    stripPgpmHeader(baseSql),
    stripPgpmHeader(servicesSql)
  ].join('\n\n');

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
