/**
 * Granularity dial for `pgpm export` (Phase 4 of the three-dial plan).
 *
 * Seeds db_migrate.sql_actions with ad-hoc `migrate/*` change chains (the
 * pre-dials export shape), exports with `granularity` set, and verifies:
 * - change paths are derived from the naming spec (identityOf + pathFor),
 *   not from the recorded ad-hoc names;
 * - `requires` are derived from the statement graph, not the hand-chained
 *   deps recorded at action time;
 * - the exported module deploys cleanly (round-trip) at both the atomic and
 *   consolidated granularities.
 *
 * PREREQUISITES: a running PostgreSQL instance via standard PG* env vars.
 */

import { PgpmMigrate, PgpmPackage } from '@pgpmjs/core';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { PgConfig } from 'pg-env';
import type { PgTestClient } from 'pgsql-test';
import { getConnections, seed } from 'pgsql-test';

import { exportMigrations } from '../src/export-migrations';

jest.setTimeout(180000);

const DATABASE_ID = 'a1b2c3d4-e5f6-4708-b250-000000000009';

const SHIMS_SQL = `
  CREATE SCHEMA IF NOT EXISTS metaschema_public;
  CREATE SCHEMA IF NOT EXISTS db_migrate;

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

  INSERT INTO metaschema_public.database (id, owner_id, name, hash) VALUES
    ('${DATABASE_ID}', '00000000-0000-0000-0000-000000000001', 'pets', 'f1e2d3c4-b5a6-5c2e-9a07-000000000009');

  INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, description) VALUES
    ('aaaa0001-0000-0000-0000-000000000009', '${DATABASE_ID}', 'public', 'pets_public', 'Public-facing tables');

  -- Ad-hoc migrate/* chain, atomic machine-emitted shape: bare CREATE TABLE
  -- plus one ALTER per column/constraint, hand-chained deps.
  INSERT INTO db_migrate.sql_actions (name, database_id, deploy, deps, content, revert, verify) VALUES
    (
      'create schema',
      '${DATABASE_ID}',
      'migrate/0001-schema',
      ARRAY[]::text[],
      'CREATE SCHEMA pets_public;',
      'DROP SCHEMA pets_public;',
      'SELECT 1;'
    ),
    (
      'create owners',
      '${DATABASE_ID}',
      'migrate/0002-owners',
      ARRAY['migrate/0001-schema']::text[],
      E'CREATE TABLE pets_public.owners ();\nALTER TABLE pets_public.owners ADD COLUMN id uuid;\nALTER TABLE pets_public.owners ADD CONSTRAINT owners_pkey PRIMARY KEY (id);\nALTER TABLE pets_public.owners ADD COLUMN name text;',
      'DROP TABLE pets_public.owners;',
      'SELECT 1;'
    ),
    (
      'create pets',
      '${DATABASE_ID}',
      'migrate/0003-pets',
      ARRAY['migrate/0002-owners']::text[],
      E'CREATE TABLE pets_public.pets ();\nALTER TABLE pets_public.pets ADD COLUMN id uuid;\nALTER TABLE pets_public.pets ADD COLUMN owner_id uuid;',
      'DROP TABLE pets_public.pets;',
      'SELECT 1;'
    ),
    (
      'pets fk',
      '${DATABASE_ID}',
      'migrate/0004-pets-fk',
      ARRAY['migrate/0003-pets']::text[],
      'ALTER TABLE pets_public.pets ADD CONSTRAINT pets_owner_fk FOREIGN KEY (owner_id) REFERENCES pets_public.owners (id);',
      'ALTER TABLE pets_public.pets DROP CONSTRAINT pets_owner_fk;',
      'SELECT 1;'
    );
`;

describe('Export granularity dial', () => {
  let tempDir: string;
  let exportWorkspaceDir: string;
  let pg: PgTestClient;
  let dbConfig: PgConfig;
  let teardown: () => Promise<void>;

  const scaffoldModule = (name: string, description: string): string => {
    const moduleDir = join(exportWorkspaceDir, 'packages', name);
    mkdirSync(moduleDir, { recursive: true });
    writeFileSync(join(moduleDir, 'package.json'), JSON.stringify({
      name,
      version: '1.0.0',
      description
    }, null, 2));
    writeFileSync(join(moduleDir, `${name}.control`), `# ${name} extension
comment = '${description}'
default_version = '1.0.0'
relocatable = false
`);
    writeFileSync(join(moduleDir, 'pgpm.plan'), `%syntax-version=1.0.0
%project=${name}
%uri=https://github.com/test/${name}
`);
    return moduleDir;
  };

  const runExport = async (extensionName: string, granularity: 'atomic' | 'object' | 'consolidated'): Promise<void> => {
    scaffoldModule(extensionName, `Exported pets database schema (${granularity})`);
    scaffoldModule(`${extensionName}-svc`, `Exported pets service metadata (${granularity})`);

    const project = new PgpmPackage(exportWorkspaceDir);

    await exportMigrations({
      project,
      options: {
        pg: dbConfig
      },
      dbInfo: {
        dbname: dbConfig.database,
        databaseName: 'pets',
        database_ids: [DATABASE_ID]
      },
      author: 'test <test@test.local>',
      outdir: join(exportWorkspaceDir, 'packages'),
      schema_names: ['pets_public'],
      extensionName,
      extensionDesc: `Exported pets database schema (${granularity})`,
      metaExtensionName: `${extensionName}-svc`,
      metaExtensionDesc: `Exported pets service metadata (${granularity})`,
      granularity
    });
  };

  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pgpm-export-granularity-'));
    exportWorkspaceDir = join(tempDir, 'export-workspace');
    mkdirSync(join(exportWorkspaceDir, 'packages'), { recursive: true });
    mkdirSync(join(exportWorkspaceDir, 'extensions'), { recursive: true });
    writeFileSync(join(exportWorkspaceDir, 'pgpm.json'), JSON.stringify({
      packages: ['packages/*', 'extensions/*']
    }, null, 2));
    writeFileSync(join(exportWorkspaceDir, 'package.json'), JSON.stringify({
      name: 'export-granularity-workspace',
      version: '1.0.0',
      private: true
    }, null, 2));

    ({ pg, teardown } = await getConnections({}, [
      seed.fn(async ({ pg, config }) => {
        dbConfig = config;
        const migrate = new PgpmMigrate(config);
        await migrate.initialize();
        await pg.query(SHIMS_SQL);
      })
    ]));
  });

  afterAll(async () => {
    await teardown();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('consolidated granularity', () => {
    const EXTENSION_NAME = 'pets-consolidated';

    beforeAll(async () => {
      await runExport(EXTENSION_NAME, 'consolidated');
    });

    it('derives change paths from the naming spec, not the ad-hoc migrate/* names', () => {
      const planPath = join(exportWorkspaceDir, 'packages', EXTENSION_NAME, 'pgpm.plan');
      const plan = readFileSync(planPath, 'utf-8');

      expect(plan).not.toContain('migrate/');
      expect(plan).toContain('schemas/pets_consolidated_public/schema');
      expect(plan).toContain('schemas/pets_consolidated_public/tables/owners/table');
      expect(plan).toContain('schemas/pets_consolidated_public/tables/pets/table');
    });

    it('derives requires from the statement graph', () => {
      const planPath = join(exportWorkspaceDir, 'packages', EXTENSION_NAME, 'pgpm.plan');
      const plan = readFileSync(planPath, 'utf-8');

      const tableLine = plan.split('\n').find(line => line.startsWith('schemas/pets_consolidated_public/tables/pets/table'));
      expect(tableLine).toBeDefined();
      // pets requires its schema; the FK on owners is folded or edged via the graph
      expect(tableLine).toContain('schemas/pets_consolidated_public/schema');
    });

    it('consolidates the table changes (columns folded into CREATE TABLE)', () => {
      const tableSqlPath = join(
        exportWorkspaceDir, 'packages', EXTENSION_NAME,
        'deploy', 'schemas', 'pets_consolidated_public', 'tables', 'owners', 'table.sql'
      );
      expect(existsSync(tableSqlPath)).toBe(true);
      const sql = readFileSync(tableSqlPath, 'utf-8');
      expect(sql).toContain('-- Deploy: schemas/pets_consolidated_public/tables/owners/table');
      // columns are folded into the CREATE TABLE, not separate ALTERs
      expect(sql).toMatch(/CREATE TABLE pets_consolidated_public\.owners \([\s\S]*id uuid/);
      expect(sql).not.toMatch(/ALTER TABLE pets_consolidated_public\.owners ADD COLUMN/);
    });

    it('deploys the exported module cleanly (round-trip)', async () => {
      const moduleDir = join(exportWorkspaceDir, 'packages', EXTENSION_NAME);
      const deployer = new PgpmMigrate(dbConfig);
      await deployer.deploy({ modulePath: moduleDir });

      const tables = await pg.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'pets_consolidated_public'
        ORDER BY table_name
      `);
      expect(tables.rows.map((r: any) => r.table_name)).toEqual(['owners', 'pets']);

      const fk = await pg.query(`
        SELECT conname FROM pg_constraint
        WHERE conname = 'pets_owner_fk'
      `);
      expect(fk.rows).toHaveLength(1);
    });

    it('generates populated revert/verify scripts for each change', () => {
      const moduleDir = join(exportWorkspaceDir, 'packages', EXTENSION_NAME);

      const ownersVerify = readFileSync(
        join(moduleDir, 'verify', 'schemas', 'pets_consolidated_public', 'tables', 'owners', 'table.sql'),
        'utf-8'
      );
      expect(ownersVerify).toContain("to_regclass('pets_consolidated_public.owners')");

      const ownersRevert = readFileSync(
        join(moduleDir, 'revert', 'schemas', 'pets_consolidated_public', 'tables', 'owners', 'table.sql'),
        'utf-8'
      );
      expect(ownersRevert).toContain('DROP TABLE pets_consolidated_public.owners;');
      expect(ownersRevert).not.toContain('CASCADE');

      const schemaRevert = readFileSync(
        join(moduleDir, 'revert', 'schemas', 'pets_consolidated_public', 'schema.sql'),
        'utf-8'
      );
      expect(schemaRevert).toContain('DROP SCHEMA pets_consolidated_public;');
    });

    it('verifies the deployed module with the generated verify scripts', async () => {
      const moduleDir = join(exportWorkspaceDir, 'packages', EXTENSION_NAME);
      const migrate = new PgpmMigrate(dbConfig);
      const result = await migrate.verify({ modulePath: moduleDir });
      expect(result.failed).toEqual([]);
      expect(result.verified.length).toBeGreaterThan(0);
    });

    it('reverts the module with the generated revert scripts, leaving the DB clean', async () => {
      const moduleDir = join(exportWorkspaceDir, 'packages', EXTENSION_NAME);
      const migrate = new PgpmMigrate(dbConfig);
      const result = await migrate.revert({ modulePath: moduleDir });
      expect(result.failed).toBeUndefined();

      const schema = await pg.query(`
        SELECT schema_name FROM information_schema.schemata
        WHERE schema_name = 'pets_consolidated_public'
      `);
      expect(schema.rows).toHaveLength(0);
    });
  });

  describe('atomic granularity', () => {
    const EXTENSION_NAME = 'pets-atomic';

    beforeAll(async () => {
      await runExport(EXTENSION_NAME, 'atomic');
    });

    it('derives spec paths while keeping the atomic statement shape', () => {
      const planPath = join(exportWorkspaceDir, 'packages', EXTENSION_NAME, 'pgpm.plan');
      const plan = readFileSync(planPath, 'utf-8');

      expect(plan).not.toContain('migrate/');
      expect(plan).toContain('schemas/pets_atomic_public/tables/owners/table');

      const tableSqlPath = join(
        exportWorkspaceDir, 'packages', EXTENSION_NAME,
        'deploy', 'schemas', 'pets_atomic_public', 'tables', 'owners', 'table.sql'
      );
      const sql = readFileSync(tableSqlPath, 'utf-8');
      // atomic keeps the bare CREATE TABLE + one ALTER per column/constraint
      expect(sql).toMatch(/CREATE TABLE pets_atomic_public\.owners \(\s*\)/);
      expect(sql).toMatch(/ALTER TABLE pets_atomic_public\.owners\s+ADD COLUMN id uuid/);
    });

    it('deploys the exported module cleanly (round-trip)', async () => {
      const moduleDir = join(exportWorkspaceDir, 'packages', EXTENSION_NAME);
      const deployer = new PgpmMigrate(dbConfig);
      await deployer.deploy({ modulePath: moduleDir });

      const tables = await pg.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'pets_atomic_public'
        ORDER BY table_name
      `);
      expect(tables.rows.map((r: any) => r.table_name)).toEqual(['owners', 'pets']);
    });
  });

  describe('no granularity (default)', () => {
    const EXTENSION_NAME = 'pets-passthrough';

    beforeAll(async () => {
      scaffoldModule(EXTENSION_NAME, 'Exported pets database schema (passthrough)');
      scaffoldModule(`${EXTENSION_NAME}-svc`, 'Exported pets service metadata (passthrough)');

      const project = new PgpmPackage(exportWorkspaceDir);

      await exportMigrations({
        project,
        options: {
          pg: dbConfig
        },
        dbInfo: {
          dbname: dbConfig.database,
          databaseName: 'pets',
          database_ids: [DATABASE_ID]
        },
        author: 'test <test@test.local>',
        outdir: join(exportWorkspaceDir, 'packages'),
        schema_names: ['pets_public'],
        extensionName: EXTENSION_NAME,
        extensionDesc: 'Exported pets database schema (passthrough)',
        metaExtensionName: `${EXTENSION_NAME}-svc`,
        metaExtensionDesc: 'Exported pets service metadata (passthrough)'
      });
    });

    it('keeps the recorded ad-hoc change names when granularity is omitted', () => {
      const planPath = join(exportWorkspaceDir, 'packages', EXTENSION_NAME, 'pgpm.plan');
      const plan = readFileSync(planPath, 'utf-8');

      expect(plan).toContain('migrate/0001-schema');
      expect(plan).toContain('migrate/0002-owners');
    });
  });
});
