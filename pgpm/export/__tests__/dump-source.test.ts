import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { copyBlockToInsert, copyTargetOf, loadDumpSource, preprocessDumpText } from '../src/dump-source';

describe('preprocessDumpText', () => {
  it('strips psql backslash meta-commands and reports them', () => {
    const { sql, metaCommands } = preprocessDumpText(
      [
        '\\restrict abc123',
        'CREATE SCHEMA app;',
        '\\connect mydb',
        'CREATE TABLE app.t (id int);',
        '\\unrestrict abc123'
      ].join('\n')
    );
    expect(metaCommands).toEqual(['\\restrict abc123', '\\connect mydb', '\\unrestrict abc123']);
    expect(sql).toContain('CREATE SCHEMA app;');
    expect(sql).toContain('CREATE TABLE app.t (id int);');
    expect(sql).not.toContain('\\connect');
  });

  it('extracts COPY ... FROM stdin blocks as a unit including the terminating \\.', () => {
    const { sql, copyBlocks } = preprocessDumpText(
      [
        'CREATE TABLE app.t (id int, name text);',
        'COPY app.t (id, name) FROM stdin;',
        '1\talice',
        '2\t\\N',
        '\\.',
        'CREATE INDEX t_idx ON app.t (id);'
      ].join('\n')
    );
    expect(copyBlocks).toHaveLength(1);
    expect(copyBlocks[0].statement).toBe('COPY app.t (id, name) FROM stdin;');
    expect(copyBlocks[0].dataLines).toEqual(['1\talice', '2\t\\N']);
    expect(sql).not.toContain('FROM stdin');
    expect(sql).toContain('CREATE INDEX t_idx');
  });

  it('leaves backslash lines inside dollar-quoted bodies untouched', () => {
    const body = [
      'CREATE FUNCTION app.f() RETURNS text AS $$',
      'BEGIN',
      "  RETURN '\\connect is not a command here';",
      'END;',
      '$$ LANGUAGE plpgsql;'
    ].join('\n');
    const { sql, metaCommands } = preprocessDumpText(body);
    expect(metaCommands).toEqual([]);
    expect(sql).toBe(body);
  });

  it('warns when a COPY block is missing its terminator', () => {
    const { copyBlocks, warnings } = preprocessDumpText(
      ['COPY app.t (id) FROM stdin;', '1'].join('\n')
    );
    expect(copyBlocks).toHaveLength(1);
    expect(warnings[0]).toMatch(/missing its terminating/);
  });
});

describe('loadDumpSource', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgpm-dump-source-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('concatenates directory .sql files in sorted order', () => {
    fs.writeFileSync(path.join(dir, '002-tables.sql'), 'CREATE TABLE app.t (id int);');
    fs.writeFileSync(path.join(dir, '001-schema.sql'), 'CREATE SCHEMA app;');
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'not sql');
    const source = loadDumpSource(dir);
    expect(source.files.map(f => path.basename(f))).toEqual(['001-schema.sql', '002-tables.sql']);
    expect(source.sql.indexOf('CREATE SCHEMA app;')).toBeLessThan(source.sql.indexOf('CREATE TABLE app.t'));
  });

  it('throws for a directory with no .sql files', () => {
    expect(() => loadDumpSource(dir)).toThrow(/No \.sql files/);
  });

  it('loads a single file', () => {
    const file = path.join(dir, 'dump.sql');
    fs.writeFileSync(file, 'CREATE SCHEMA app;');
    const source = loadDumpSource(file);
    expect(source.files).toEqual([file]);
    expect(source.sql).toBe('CREATE SCHEMA app;');
  });
});

describe('copyTargetOf / copyBlockToInsert', () => {
  it('parses schema-qualified targets and column lists', () => {
    const target = copyTargetOf({ statement: 'COPY app.users (id, email) FROM stdin;', dataLines: [] });
    expect(target).toEqual({ schema: 'app', name: 'users', columns: 'id, email' });
  });

  it('handles quoted identifiers', () => {
    const target = copyTargetOf({ statement: 'COPY "my schema"."My Table" FROM stdin;', dataLines: [] });
    expect(target.schema).toBe('my schema');
    expect(target.name).toBe('My Table');
  });

  it('converts data rows to a multi-row INSERT with NULLs and escapes decoded', () => {
    const insert = copyBlockToInsert({
      statement: 'COPY app.users (id, note) FROM stdin;',
      dataLines: ['1\tfirst\\torder', '2\t\\N', "3\tit's"]
    });
    expect(insert).toBe(
      [
        'INSERT INTO app.users (id, note) VALUES',
        "  ('1', 'first\torder'),",
        "  ('2', NULL),",
        "  ('3', 'it''s');"
      ].join('\n')
    );
  });

  it('returns an empty string for a COPY block with no rows', () => {
    expect(copyBlockToInsert({ statement: 'COPY app.t (id) FROM stdin;', dataLines: [] })).toBe('');
  });
});
