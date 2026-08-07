/**
 * The restore contract: what `pgpm dump` writes must load into a fresh
 * database under `psql -v ON_ERROR_STOP=1`.
 *
 * The fixture is the shape that broke it — a pgvector column and a trigger
 * whose `WHEN` clause compares it with `IS DISTINCT FROM`, an operator lookup
 * that goes through `search_path` and cannot be schema-qualified in the DDL.
 */
import { spawn } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { teardownPgPools } from 'pg-cache';
import type { PgConfig } from 'pg-env';
import { getPgClientCommand, getSpawnEnvWithPg } from 'pg-env';

import { LEDGER_SCHEMAS, pgDump } from '../../src/dump/pg-dump';
import { applyExtensionSearchPathToFile, getExtensionSchemas } from '../../src/dump/search-path';
import { MigrateTestFixture } from '../../test-utils/MigrateTestFixture';
import { TestDatabase } from '../../test-utils/TestDatabase';

interface RestoreResult {
  code: number;
  stderr: string;
}

/**
 * Feed a dump to `psql` on stdin rather than `--file`: the version-matched
 * client may live in a container (PGPM_PSQL), where the host's path is
 * meaningless.
 */
const psqlRestore = (config: PgConfig, sql: string): Promise<RestoreResult> => {
  const [cmd, ...prefixArgs] = getPgClientCommand('psql');
  const args = [...prefixArgs, '-v', 'ON_ERROR_STOP=1', '--quiet', '--dbname', config.database];
  return new Promise<RestoreResult>((resolve, reject) => {
    const child = spawn(cmd, args, {
      env: getSpawnEnvWithPg(config),
      stdio: ['pipe', 'ignore', 'pipe']
    });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code: code ?? -1, stderr }));
    child.stdin.end(sql);
  });
};

describe('a dump of a database with extension-typed triggers', () => {
  const fixture = new MigrateTestFixture();
  let source: TestDatabase;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'pgpm-dump-restore-'));
    source = await fixture.setupTestDatabase();

    // The extension deliberately does NOT live in `public`: the rewrite must
    // read the source's actual extension schemas, not assume one.
    await source.query('CREATE SCHEMA extensions');
    await source.query('CREATE EXTENSION vector SCHEMA extensions');
    await source.query('CREATE TABLE documents (id int PRIMARY KEY, embedding extensions.vector(3))');
    await source.query(`
      CREATE FUNCTION touch_document() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RETURN new; END $$
    `);
    // The operator has to be on the path to create the trigger too — the very
    // lookup the restore later has to be able to make.
    await source.query(`
      SET search_path TO extensions, public;
      CREATE TRIGGER documents_embedding_changed
        BEFORE UPDATE ON documents
        FOR EACH ROW
        WHEN (old.embedding IS DISTINCT FROM new.embedding)
        EXECUTE FUNCTION touch_document()
    `);
  });

  afterAll(async () => {
    rmSync(tempDir, { recursive: true, force: true });
    await fixture.cleanup();
    await teardownPgPools();
  });

  const dumpToFile = async (name: string): Promise<string> => {
    const file = join(tempDir, name);
    await pgDump({
      config: source.config,
      format: 'plain',
      noOwner: true,
      noPrivileges: true,
      // Targets come from the same fixture, so they already carry the
      // migration ledger; it is not what is under test here.
      excludeSchemas: [...LEDGER_SCHEMAS],
      file
    });
    return file;
  };

  it('does not restore as pg_dump emits it (the bug this guards)', async () => {
    const dump = readFileSync(await dumpToFile('unpatched.sql'), 'utf8');
    const target = await fixture.setupTestDatabase();
    const { code, stderr } = await psqlRestore(target.config, dump);
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/operator does not exist: extensions\.vector = extensions\.vector/);
  });

  it('restores with zero errors once the extension search_path is applied', async () => {
    const file = await dumpToFile('patched.sql');
    const schemas = await applyExtensionSearchPathToFile(source.config, file);
    expect(schemas).toEqual([...schemas].sort());
    expect(schemas).toContain('extensions');
    expect(readFileSync(file, 'utf8')).toContain(
      `SELECT pg_catalog.set_config('search_path', '${schemas.map(s => `"${s}"`).join(', ')}', false);`
    );

    const target = await fixture.setupTestDatabase();
    const { code, stderr } = await psqlRestore(target.config, readFileSync(file, 'utf8'));
    expect(stderr).toBe('');
    expect(code).toBe(0);

    const restored = await target.query(
      `SELECT tgname FROM pg_trigger WHERE tgname = 'documents_embedding_changed'`
    );
    expect(restored.rows).toHaveLength(1);
  });

  it('reports the schemas its extensions actually live in', async () => {
    expect(await getExtensionSchemas(source.config)).toEqual(['extensions', 'pg_catalog']);
  });
});
