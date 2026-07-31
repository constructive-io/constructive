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
