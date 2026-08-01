import { diffChangeSets, loadModule, SemanticDeltaChange } from '@pgpmjs/transform';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  deltaChangesToRows,
  loadDiffSideFromDisk,
  resolveDiffSideKind,
  sqlToDiffChanges,
  stripDumpPreamble
} from '../src/diff-source';

beforeAll(async () => {
  await loadModule();
});

describe('resolveDiffSideKind', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pgpm-diff-source-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('classifies connection strings and db: specs as databases', () => {
    expect(resolveDiffSideKind('postgres://u:p@localhost:5432/mydb')).toBe('database');
    expect(resolveDiffSideKind('postgresql://localhost/mydb')).toBe('database');
    expect(resolveDiffSideKind('db:mydb')).toBe('database');
  });

  it('classifies a module directory and a sql file', () => {
    writeFileSync(join(dir, 'pgpm.plan'), '%project=x\n');
    expect(resolveDiffSideKind(dir)).toBe('module');
    const file = join(dir, 'schema.sql');
    writeFileSync(file, 'CREATE SCHEMA app;');
    expect(resolveDiffSideKind(file)).toBe('sql');
  });

  it('rejects a directory without pgpm.plan and a missing path', () => {
    const bare = join(dir, 'bare');
    mkdirSync(bare);
    expect(() => resolveDiffSideKind(bare)).toThrow(/no pgpm.plan/);
    expect(() => resolveDiffSideKind(join(dir, 'nope'))).toThrow(/not a module directory/);
  });
});

describe('stripDumpPreamble', () => {
  it('removes pg_dump session preamble but keeps DDL', () => {
    const dump = [
      '--',
      '-- PostgreSQL database dump',
      '--',
      '\\restrict abcdef',
      'SET statement_timeout = 0;',
      'SET lock_timeout = 0;',
      "SELECT pg_catalog.set_config('search_path', '', false);",
      "SET default_tablespace = '';",
      '\\connect mydb',
      'CREATE SCHEMA app;',
      'CREATE TABLE app.users (id int);',
      "COMMENT ON TABLE app.users IS 'people';",
      '\\unrestrict abcdef'
    ].join('\n');
    const stripped = stripDumpPreamble(dump);
    expect(stripped).not.toMatch(/^SET /m);
    expect(stripped).not.toContain('set_config');
    expect(stripped).not.toContain('\\connect');
    expect(stripped).not.toContain('\\restrict');
    expect(stripped).toContain('CREATE SCHEMA app;');
    expect(stripped).toContain('CREATE TABLE app.users (id int);');
    expect(stripped).toContain('COMMENT ON TABLE app.users');
  });

  it('keeps SET clauses inside function bodies', () => {
    const sql = [
      'CREATE FUNCTION app.f() RETURNS void AS $$',
      "  SET LOCAL search_path = 'app';",
      '$$ LANGUAGE sql;'
    ].join('\n');
    expect(stripDumpPreamble(sql)).toContain('SET LOCAL search_path');
  });
});

describe('loadDiffSideFromDisk', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pgpm-diff-side-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const writeModule = (moduleDir: string, name: string, changes: { name: string; deps?: string[]; sql: string }[]) => {
    mkdirSync(moduleDir, { recursive: true });
    const planLines = changes.map(c => {
      const deps = c.deps?.length ? ` [${c.deps.join(' ')}]` : '';
      return `${c.name}${deps} 2024-01-01T00:00:00Z t <t@x> # add ${c.name}`;
    });
    writeFileSync(
      join(moduleDir, 'pgpm.plan'),
      `%syntax-version=1.0.0\n%project=${name}\n%uri=${name}\n\n${planLines.join('\n')}\n`
    );
    for (const c of changes) {
      const file = join(moduleDir, 'deploy', `${c.name}.sql`);
      mkdirSync(join(file, '..'), { recursive: true });
      writeFileSync(file, `-- Deploy ${c.name} to pg\nBEGIN;\n${c.sql}\nCOMMIT;\n`);
    }
  };

  it('loads a module in plan order and a sql file as one change', () => {
    const moduleDir = join(dir, 'mod');
    writeModule(moduleDir, 'mod', [
      { name: 'schemas/app/schema', sql: 'CREATE SCHEMA app;' },
      { name: 'schemas/app/tables/users/table', deps: ['schemas/app/schema'], sql: 'CREATE TABLE app.users (id int);' }
    ]);
    const side = loadDiffSideFromDisk(moduleDir);
    expect(side.kind).toBe('module');
    expect(side.label).toBe('mod');
    expect(side.changes.map(c => c.name)).toEqual(['schemas/app/schema', 'schemas/app/tables/users/table']);

    const file = join(dir, 'schema.sql');
    writeFileSync(file, 'BEGIN;\nCREATE SCHEMA app;\nCOMMIT;\n');
    const sqlSide = loadDiffSideFromDisk(file);
    expect(sqlSide.kind).toBe('sql');
    expect(sqlSide.changes).toEqual([
      { name: 'schema', dependencies: [], deploy: 'CREATE SCHEMA app;' }
    ]);
  });

  it('is dial-invariant: the same schema authored at different granularity/naming diffs as empty', () => {
    const atomicDir = join(dir, 'atomic-mod');
    writeModule(atomicDir, 'atomic-mod', [
      { name: 'app_schema', sql: 'CREATE SCHEMA app;' },
      { name: 'users_bare', deps: ['app_schema'], sql: 'CREATE TABLE app.users ();' },
      { name: 'users_id', deps: ['users_bare'], sql: 'ALTER TABLE app.users ADD COLUMN id uuid;' },
      { name: 'users_name', deps: ['users_id'], sql: 'ALTER TABLE app.users ADD COLUMN name text;' },
      { name: 'fn', deps: ['users_name'], sql: 'CREATE FUNCTION app.n() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM app.users $$;' }
    ]);
    const consolidatedDir = join(dir, 'consolidated-mod');
    writeModule(consolidatedDir, 'consolidated-mod', [
      {
        name: 'everything',
        sql: [
          'CREATE SCHEMA app;',
          'CREATE TABLE app.users (id uuid, name text);',
          'CREATE FUNCTION app.n() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM app.users $$;'
        ].join('\n')
      }
    ]);
    const sqlFile = join(dir, 'flat.sql');
    writeFileSync(sqlFile, [
      'CREATE SCHEMA app;',
      'CREATE TABLE app.users ();',
      'ALTER TABLE app.users ADD COLUMN id uuid;',
      'ALTER TABLE app.users ADD COLUMN name text;',
      'CREATE FUNCTION app.n() RETURNS bigint LANGUAGE sql AS $$ SELECT count(*) FROM app.users $$;'
    ].join('\n'));

    const atomic = loadDiffSideFromDisk(atomicDir);
    const consolidated = loadDiffSideFromDisk(consolidatedDir);
    const flat = loadDiffSideFromDisk(sqlFile);

    expect(diffChangeSets(atomic.changes, consolidated.changes).identical).toBe(true);
    expect(diffChangeSets(consolidated.changes, flat.changes).identical).toBe(true);
    expect(diffChangeSets(flat.changes, atomic.changes).identical).toBe(true);
  });
});

describe('sqlToDiffChanges', () => {
  it('strips transaction wrappers and dump preamble', () => {
    const changes = sqlToDiffChanges('BEGIN;\nSET x = 1;\nCREATE SCHEMA app;\nCOMMIT;\n', 'dump');
    expect(changes).toEqual([
      { name: 'dump', dependencies: [], deploy: 'CREATE SCHEMA app;' }
    ]);
  });
});

describe('deltaChangesToRows', () => {
  const change = (name: string, deps: string[] = []): SemanticDeltaChange => ({
    name,
    dependencies: deps,
    deploy: `-- deploy ${name}`,
    revert: `-- revert ${name}`,
    verify: `-- verify ${name}`
  });

  it('maps delta changes to pgpm rows with scripts', () => {
    const rows = deltaChangesToRows([change('a'), change('b', ['a'])]);
    expect(rows).toEqual([
      { name: 'a', deploy: 'a', deps: [], content: '-- deploy a', revert: '-- revert a', verify: '-- verify a' },
      { name: 'b', deploy: 'b', deps: ['a'], content: '-- deploy b', revert: '-- revert b', verify: '-- verify b' }
    ]);
  });

  it('applies the alteration convention to colliding paths', () => {
    const rows = deltaChangesToRows([change('schemas/app/tables/users/table'), change('schemas/app/tables/users/table')]);
    expect(rows[0].deploy).toBe('schemas/app/tables/users/table');
    expect(rows[1].deploy).not.toBe('schemas/app/tables/users/table');
    expect(rows[1].deps).toContain('schemas/app/tables/users/table');
  });
});
