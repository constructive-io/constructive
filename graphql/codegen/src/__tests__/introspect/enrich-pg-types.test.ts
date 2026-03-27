import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  enrichPgTypesFromMeta,
  enrichPgTypesFromMetaFile,
  loadMetaFile,
} from '../../core/introspect/enrich-pg-types';
import type { MetaTableInfo } from '../../core/introspect/source/types';
import type { Table } from '../../types/schema';

function makeField(name: string, gqlType: string, isArray = false, pgType?: string) {
  return {
    name,
    type: {
      gqlType,
      isArray,
      ...(pgType !== undefined ? { pgType } : {}),
    },
  };
}

function makeTable(name: string, fields: ReturnType<typeof makeField>[]): Table {
  return {
    name,
    fields,
    relations: { belongsTo: [], hasOne: [], hasMany: [], manyToMany: [] },
  };
}

function makeMetaTable(
  name: string,
  fields: Array<{ name: string; pgType: string; gqlType?: string }>,
): MetaTableInfo {
  return {
    name,
    schemaName: 'public',
    fields: fields.map((f) => ({
      name: f.name,
      type: { pgType: f.pgType, gqlType: f.gqlType ?? 'String', isArray: false },
    })),
    relations: { manyToMany: [] },
  };
}

describe('enrichPgTypesFromMeta', () => {
  it('should enrich fields with pgType from _meta', () => {
    const tables = [
      makeTable('Document', [
        makeField('id', 'UUID'),
        makeField('vectorEmbedding', 'Float', true),
        makeField('tsvContent', 'FullText'),
      ]),
    ];

    const meta = [
      makeMetaTable('Document', [
        { name: 'id', pgType: 'uuid' },
        { name: 'vectorEmbedding', pgType: 'vector' },
        { name: 'tsvContent', pgType: 'tsvector' },
      ]),
    ];

    const count = enrichPgTypesFromMeta(tables, meta);

    expect(count).toBe(3);
    expect(tables[0].fields[0].type.pgType).toBe('uuid');
    expect(tables[0].fields[1].type.pgType).toBe('vector');
    expect(tables[0].fields[2].type.pgType).toBe('tsvector');
  });

  it('should skip tables not in meta', () => {
    const tables = [
      makeTable('User', [makeField('id', 'UUID')]),
    ];

    const meta = [
      makeMetaTable('Document', [{ name: 'vectorEmbedding', pgType: 'vector' }]),
    ];

    const count = enrichPgTypesFromMeta(tables, meta);
    expect(count).toBe(0);
  });

  it('should skip fields not in meta', () => {
    const tables = [
      makeTable('Document', [
        makeField('id', 'UUID'),
        makeField('title', 'String'),
      ]),
    ];

    const meta = [
      makeMetaTable('Document', [{ name: 'vectorEmbedding', pgType: 'vector' }]),
    ];

    const count = enrichPgTypesFromMeta(tables, meta);
    expect(count).toBe(0);
  });

  it('should not overwrite existing pgType', () => {
    const tables = [
      makeTable('Document', [
        makeField('vectorEmbedding', 'Float', true, 'existing_type'),
      ]),
    ];

    const meta = [
      makeMetaTable('Document', [{ name: 'vectorEmbedding', pgType: 'vector' }]),
    ];

    const count = enrichPgTypesFromMeta(tables, meta);
    expect(count).toBe(0);
    expect(tables[0].fields[0].type.pgType).toBe('existing_type');
  });

  it('should not overwrite gqlType or isArray', () => {
    const tables = [
      makeTable('Document', [
        makeField('vectorEmbedding', 'Float', true),
      ]),
    ];

    const meta = [
      makeMetaTable('Document', [{ name: 'vectorEmbedding', pgType: 'vector', gqlType: 'Int' }]),
    ];

    enrichPgTypesFromMeta(tables, meta);

    expect(tables[0].fields[0].type.gqlType).toBe('Float');
    expect(tables[0].fields[0].type.isArray).toBe(true);
    expect(tables[0].fields[0].type.pgType).toBe('vector');
  });

  it('should skip fields with pgType "unknown"', () => {
    const tables = [
      makeTable('User', [makeField('id', 'UUID')]),
    ];

    const meta = [
      makeMetaTable('User', [{ name: 'id', pgType: 'unknown' }]),
    ];

    const count = enrichPgTypesFromMeta(tables, meta);
    expect(count).toBe(0);
  });

  it('should handle empty meta gracefully', () => {
    const tables = [makeTable('User', [makeField('id', 'UUID')])];
    const count = enrichPgTypesFromMeta(tables, []);
    expect(count).toBe(0);
  });

  it('should handle meta without fields', () => {
    const tables = [makeTable('User', [makeField('id', 'UUID')])];
    const meta: MetaTableInfo[] = [{
      name: 'User',
      schemaName: 'public',
      relations: { manyToMany: [] },
    }];
    const count = enrichPgTypesFromMeta(tables, meta);
    expect(count).toBe(0);
  });
});

describe('loadMetaFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return null for non-existent file', () => {
    const result = loadMetaFile(path.join(tmpDir, 'nonexistent.json'));
    expect(result).toBeNull();
  });

  it('should load valid JSON file', () => {
    const filePath = path.join(tmpDir, '_meta.json');
    const meta = [makeMetaTable('Document', [{ name: 'vectorEmbedding', pgType: 'vector' }])];
    fs.writeFileSync(filePath, JSON.stringify(meta));

    const result = loadMetaFile(filePath);
    expect(result).toEqual(meta);
  });

  it('should throw on invalid JSON', () => {
    const filePath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(filePath, 'not json');

    expect(() => loadMetaFile(filePath)).toThrow();
  });

  it('should throw on non-array JSON', () => {
    const filePath = path.join(tmpDir, 'object.json');
    fs.writeFileSync(filePath, '{"not": "an array"}');

    expect(() => loadMetaFile(filePath)).toThrow(/expected a JSON array/);
  });
});

describe('enrichPgTypesFromMetaFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return 0 for non-existent file', () => {
    const tables = [makeTable('User', [makeField('id', 'UUID')])];
    const count = enrichPgTypesFromMetaFile(tables, path.join(tmpDir, 'nope.json'));
    expect(count).toBe(0);
  });

  it('should load file and enrich tables', () => {
    const filePath = path.join(tmpDir, '_meta.json');
    const meta = [makeMetaTable('Document', [{ name: 'tsvContent', pgType: 'tsvector' }])];
    fs.writeFileSync(filePath, JSON.stringify(meta));

    const tables = [
      makeTable('Document', [
        makeField('tsvContent', 'FullText'),
      ]),
    ];

    const count = enrichPgTypesFromMetaFile(tables, filePath);
    expect(count).toBe(1);
    expect(tables[0].fields[0].type.pgType).toBe('tsvector');
  });
});
