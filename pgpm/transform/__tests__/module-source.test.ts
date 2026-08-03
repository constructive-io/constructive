import type { ExtendedPlanFile } from '@pgpmjs/ast';
import { parsePlanFile } from '@pgpmjs/ast';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { loadModuleSource, stripTransactionWrapper } from '../src/module-source';
import { parsePartitionConfig } from '../src/partition';

describe('stripTransactionWrapper', () => {
  it('removes standalone BEGIN/COMMIT lines', () => {
    const sql = 'BEGIN;\n\nCREATE SCHEMA app;\n\nCOMMIT;\n';
    expect(stripTransactionWrapper(sql)).toBe('CREATE SCHEMA app;');
  });

  it('keeps BEGIN inside function bodies', () => {
    const sql = [
      'CREATE FUNCTION app.f() RETURNS void AS $$',
      'BEGIN',
      '  RETURN;',
      'END;',
      '$$ LANGUAGE plpgsql;'
    ].join('\n');
    expect(stripTransactionWrapper(sql)).toContain('BEGIN');
    expect(stripTransactionWrapper(sql)).toContain('END;');
  });
});

describe('loadModuleSource', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pgpm-module-source-'));
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
        'schemas/app/schema 2017-08-11T08:11:51Z tester <tester@x> # add schema',
        'schemas/app/tables/users/table [schemas/app/schema] 2017-08-11T08:11:51Z tester <tester@x> # add table',
        ''
      ].join('\n')
    );
    mkdirSync(join(dir, 'deploy', 'schemas', 'app', 'tables', 'users'), { recursive: true });
    writeFileSync(
      join(dir, 'deploy', 'schemas', 'app', 'schema.sql'),
      '-- Deploy: schemas/app/schema to pg\nBEGIN;\nCREATE SCHEMA app;\nCOMMIT;\n'
    );
    writeFileSync(
      join(dir, 'deploy', 'schemas', 'app', 'tables', 'users', 'table.sql'),
      '-- Deploy: schemas/app/tables/users/table to pg\n-- requires: schemas/app/schema\nBEGIN;\nCREATE TABLE app.users (id int);\nCOMMIT;\n'
    );
  };

  it('flattens deploy scripts in plan order with deps', () => {
    writeModule();
    const source = loadModuleSource(dir);
    expect(source.name).toBe('my-mod');
    expect(source.changes.map(c => c.name)).toEqual([
      'schemas/app/schema',
      'schemas/app/tables/users/table'
    ]);
    expect(source.changes[0].deploy).toBe('CREATE SCHEMA app;');
    expect(source.changes[1].deploy).toBe('CREATE TABLE app.users (id int);');
    expect(source.changes[1].dependencies).toEqual(['schemas/app/schema']);
    expect(source.warnings).toEqual([]);
  });

  it('warns and skips changes with missing deploy scripts', () => {
    writeModule();
    rmSync(join(dir, 'deploy', 'schemas', 'app', 'tables'), { recursive: true });
    const source = loadModuleSource(dir);
    expect(source.changes.map(c => c.name)).toEqual(['schemas/app/schema']);
    expect(source.warnings).toEqual([
      'schemas/app/tables/users/table: no deploy script found, skipping'
    ]);
  });

  it('throws on a missing plan', () => {
    expect(() => loadModuleSource(join(dir, 'nope'))).toThrow();
  });

  const writeTaggedModule = (dep: string) => {
    writeFileSync(
      join(dir, 'pgpm.plan'),
      [
        '%syntax-version=1.0.0',
        '%project=my-mod',
        '%uri=my-mod',
        '',
        'schemas/app/schema 2017-08-11T08:11:51Z tester <tester@x> # add schema',
        '@v1 schemas/app/schema 2017-08-11T08:11:51Z tester <tester@x> # release v1',
        `schemas/app/tables/users/table [${dep}] 2017-08-11T08:11:51Z tester <tester@x> # add table`,
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

  it('resolves a local tag dependency to its change name', () => {
    writeTaggedModule('@v1');
    const source = loadModuleSource(dir);
    const table = source.changes.find(c => c.name === 'schemas/app/tables/users/table')!;
    expect(table.dependencies).toEqual(['schemas/app/schema']);
    expect(source.warnings).toEqual([]);
  });

  it('leaves plain (non-tag) dependencies untouched', () => {
    writeTaggedModule('schemas/app/schema');
    const source = loadModuleSource(dir);
    const table = source.changes.find(c => c.name === 'schemas/app/tables/users/table')!;
    expect(table.dependencies).toEqual(['schemas/app/schema']);
    expect(source.warnings).toEqual([]);
  });

  it('warns and keeps an unknown tag dependency verbatim', () => {
    writeTaggedModule('@nope');
    const source = loadModuleSource(dir);
    const table = source.changes.find(c => c.name === 'schemas/app/tables/users/table')!;
    expect(table.dependencies).toEqual(['@nope']);
    expect(source.warnings.some(w => w.includes('@nope'))).toBe(true);
  });

  it('leaves a cross-package tag dependency unresolved with a warning when no plan is in context', () => {
    writeTaggedModule('other:@v1');
    const source = loadModuleSource(dir);
    const table = source.changes.find(c => c.name === 'schemas/app/tables/users/table')!;
    expect(table.dependencies).toEqual(['other:@v1']);
    expect(source.warnings.some(w => w.includes('cross-package'))).toBe(true);
  });

  it('resolves a cross-package tag to pkg:change when the owning plan is in context', () => {
    writeTaggedModule('other:@v1');
    // The "other" package's plan: a tag @v1 pointing at a concrete change.
    const otherPlan = parsePlanFile(writeOtherPlan());
    expect(otherPlan.data).toBeTruthy();
    const crossPackagePlans = new Map<string, ExtendedPlanFile>([
      ['other', otherPlan.data!]
    ]);

    const source = loadModuleSource(dir, { crossPackagePlans });
    const table = source.changes.find(c => c.name === 'schemas/app/tables/users/table')!;
    expect(table.dependencies).toEqual(['other:schemas/other/schema']);
    expect(source.warnings).toEqual([]);
  });

  const writeOtherPlan = (): string => {
    const otherPlanPath = join(dir, 'other.plan');
    writeFileSync(
      otherPlanPath,
      [
        '%syntax-version=1.0.0',
        '%project=other',
        '%uri=other',
        '',
        'schemas/other/schema 2017-08-11T08:11:51Z tester <tester@x> # add schema',
        '@v1 schemas/other/schema 2017-08-11T08:11:51Z tester <tester@x> # release v1',
        ''
      ].join('\n')
    );
    return otherPlanPath;
  };
});

describe('parsePartitionConfig', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pgpm-partition-config-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const writeConfig = (contents: string): string => {
    const file = join(dir, 'partition.json');
    writeFileSync(file, contents);
    return file;
  };

  it('parses a valid config', () => {
    const file = writeConfig(
      JSON.stringify({
        defaultPackage: 'pkg-app',
        rules: [{ package: 'pkg-security', select: [{ kind: 'policy' }] }]
      })
    );
    const config = parsePartitionConfig(file);
    expect(config.defaultPackage).toBe('pkg-app');
    expect(config.rules).toHaveLength(1);
  });

  it('rejects a missing file', () => {
    expect(() => parsePartitionConfig(join(dir, 'nope.json'))).toThrow(/not found/);
  });

  it('rejects invalid JSON', () => {
    const file = writeConfig('{nope');
    expect(() => parsePartitionConfig(file)).toThrow(/not valid JSON/);
  });

  it('rejects a missing defaultPackage', () => {
    const file = writeConfig(JSON.stringify({ rules: [] }));
    expect(() => parsePartitionConfig(file)).toThrow(/defaultPackage/);
  });

  it('rejects non-array rules', () => {
    const file = writeConfig(JSON.stringify({ defaultPackage: 'a', rules: {} }));
    expect(() => parsePartitionConfig(file)).toThrow(/"rules" must be an array/);
  });

  it('rejects a rule without selectors', () => {
    const file = writeConfig(
      JSON.stringify({ defaultPackage: 'a', rules: [{ package: 'b', select: [] }] })
    );
    expect(() => parsePartitionConfig(file)).toThrow(/select/);
  });

  it('rejects an invalid style', () => {
    const file = writeConfig(
      JSON.stringify({ defaultPackage: 'a', rules: [], style: 'nested' })
    );
    expect(() => parsePartitionConfig(file)).toThrow(/style/);
  });
});
