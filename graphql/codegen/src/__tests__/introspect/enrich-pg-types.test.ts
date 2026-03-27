import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  enrichPgTypes,
  enrichPgTypesFromFile,
  loadPgTypesFile,
} from '../../core/introspect/enrich-pg-types';
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

describe('enrichPgTypes', () => {
  it('should enrich fields with pgType from map', () => {
    const tables = [
      makeTable('Document', [
        makeField('id', 'UUID'),
        makeField('vectorEmbedding', 'Float', true),
        makeField('tsvContent', 'FullText'),
      ]),
    ];

    const count = enrichPgTypes(tables, {
      Document: {
        vectorEmbedding: { pgType: 'vector' },
        tsvContent: { pgType: 'tsvector' },
      },
    });

    expect(count).toBe(2);
    expect(tables[0].fields[1].type.pgType).toBe('vector');
    expect(tables[0].fields[2].type.pgType).toBe('tsvector');
    // Should NOT touch fields not in the map
    expect(tables[0].fields[0].type.pgType).toBeUndefined();
  });

  it('should enrich pgAlias and typmod', () => {
    const tables = [
      makeTable('Article', [
        makeField('bodyEmbedding', 'Float', true),
      ]),
    ];

    const count = enrichPgTypes(tables, {
      Article: {
        bodyEmbedding: { pgType: 'vector', pgAlias: 'vector', typmod: 768 },
      },
    });

    expect(count).toBe(1);
    expect(tables[0].fields[0].type.pgType).toBe('vector');
    expect(tables[0].fields[0].type.pgAlias).toBe('vector');
    expect(tables[0].fields[0].type.typmod).toBe(768);
  });

  it('should skip tables not in the map', () => {
    const tables = [
      makeTable('User', [makeField('id', 'UUID')]),
    ];

    const count = enrichPgTypes(tables, {
      Document: { vectorEmbedding: { pgType: 'vector' } },
    });

    expect(count).toBe(0);
  });

  it('should skip fields not in the map', () => {
    const tables = [
      makeTable('Document', [
        makeField('id', 'UUID'),
        makeField('title', 'String'),
      ]),
    ];

    const count = enrichPgTypes(tables, {
      Document: { vectorEmbedding: { pgType: 'vector' } },
    });

    expect(count).toBe(0);
  });

  it('should not overwrite gqlType or isArray', () => {
    const tables = [
      makeTable('Document', [
        makeField('vectorEmbedding', 'Float', true),
      ]),
    ];

    enrichPgTypes(tables, {
      Document: { vectorEmbedding: { pgType: 'vector' } },
    });

    expect(tables[0].fields[0].type.gqlType).toBe('Float');
    expect(tables[0].fields[0].type.isArray).toBe(true);
    expect(tables[0].fields[0].type.pgType).toBe('vector');
  });

  it('should handle empty map gracefully', () => {
    const tables = [makeTable('User', [makeField('id', 'UUID')])];
    const count = enrichPgTypes(tables, {});
    expect(count).toBe(0);
  });
});

describe('loadPgTypesFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-types-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return null for non-existent file', () => {
    const result = loadPgTypesFile(path.join(tmpDir, 'nonexistent.json'));
    expect(result).toBeNull();
  });

  it('should load valid JSON file', () => {
    const filePath = path.join(tmpDir, 'pg-types.json');
    fs.writeFileSync(filePath, JSON.stringify({
      Document: { vectorEmbedding: { pgType: 'vector' } },
    }));

    const result = loadPgTypesFile(filePath);
    expect(result).toEqual({
      Document: { vectorEmbedding: { pgType: 'vector' } },
    });
  });

  it('should throw on invalid JSON', () => {
    const filePath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(filePath, 'not json');

    expect(() => loadPgTypesFile(filePath)).toThrow();
  });

  it('should throw on non-object JSON', () => {
    const filePath = path.join(tmpDir, 'array.json');
    fs.writeFileSync(filePath, '["not", "an", "object"]');

    expect(() => loadPgTypesFile(filePath)).toThrow(/expected a JSON object/);
  });
});

describe('enrichPgTypesFromFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-types-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return 0 for non-existent file', () => {
    const tables = [makeTable('User', [makeField('id', 'UUID')])];
    const count = enrichPgTypesFromFile(tables, path.join(tmpDir, 'nope.json'));
    expect(count).toBe(0);
  });

  it('should load file and enrich tables', () => {
    const filePath = path.join(tmpDir, 'pg-types.json');
    fs.writeFileSync(filePath, JSON.stringify({
      Document: { tsvContent: { pgType: 'tsvector' } },
    }));

    const tables = [
      makeTable('Document', [
        makeField('tsvContent', 'FullText'),
      ]),
    ];

    const count = enrichPgTypesFromFile(tables, filePath);
    expect(count).toBe(1);
    expect(tables[0].fields[0].type.pgType).toBe('tsvector');
  });
});
