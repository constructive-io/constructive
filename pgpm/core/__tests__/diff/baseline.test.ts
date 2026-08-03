import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { baselineBackfillEntries, buildBaselineBackfill } from '../../src/diff/ledger';
import { loadPlanSideModules } from '../../src/diff/sides';

describe('baseline backfill (whole-plan ledger adoption)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pgpm-baseline-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const writeModule = () => {
    writeFileSync(
      join(dir, 'pgpm.plan'),
      [
        '%syntax-version=1.0.0',
        '%project=my-mod',
        '%uri=my-mod',
        '',
        'schemas/app/schema 2017-08-11T08:11:51Z t <t@x> # schema',
        'schemas/app/tables/users/table [schemas/app/schema] 2017-08-11T08:11:51Z t <t@x> # table',
        ''
      ].join('\n')
    );
    mkdirSync(join(dir, 'deploy', 'schemas', 'app', 'tables', 'users'), { recursive: true });
    writeFileSync(
      join(dir, 'deploy', 'schemas', 'app', 'schema.sql'),
      '-- Deploy: schemas/app/schema to pg\nCREATE SCHEMA app;\n'
    );
    writeFileSync(
      join(dir, 'deploy', 'schemas', 'app', 'tables', 'users', 'table.sql'),
      '-- Deploy: schemas/app/tables/users/table to pg\nCREATE TABLE app.users (id int);\n'
    );
  };

  it('emits a backfill row for every plan change, in plan order', async () => {
    writeModule();
    const modules = await loadPlanSideModules(dir);
    const entries = await baselineBackfillEntries(modules);

    expect(entries.map(e => e.changeName)).toEqual([
      'schemas/app/schema',
      'schemas/app/tables/users/table'
    ]);
    expect(entries.every(e => e.package === 'my-mod')).toBe(true);
    expect(entries.every(e => e.scriptHash.length > 0)).toBe(true);
    expect(entries[1].requires).toEqual(['schemas/app/schema']);
  });

  it('builds an idempotent, log-only backfill script', async () => {
    writeModule();
    const { entries, backfillSql } = await buildBaselineBackfill(dir);

    expect(entries).toHaveLength(2);
    // Every change is recorded log-only (p_log_only => TRUE), no DDL body.
    const calls = backfillSql.match(/CALL pgpm_migrate\.deploy\(/g) ?? [];
    expect(calls).toHaveLength(2);
    expect(backfillSql).toContain("'schemas/app/schema'");
    expect(backfillSql).toContain("'schemas/app/tables/users/table'");
    expect(backfillSql).toContain('TRUE');
    expect(backfillSql).toContain('BEGIN;');
    expect(backfillSql).toContain('COMMIT;');
  });

  it('skips changes whose deploy script is missing (no candidate hash)', async () => {
    writeModule();
    rmSync(join(dir, 'deploy', 'schemas', 'app', 'tables'), { recursive: true });
    const { entries } = await buildBaselineBackfill(dir);
    expect(entries.map(e => e.changeName)).toEqual(['schemas/app/schema']);
  });
});
