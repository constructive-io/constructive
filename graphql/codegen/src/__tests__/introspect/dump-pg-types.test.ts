import { buildPgTypesMap } from '../../core/dump-pg-types';
import type { Table } from '../../types/schema';

function makeField(name: string, gqlType: string, isArray = false, pgType?: string | null) {
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

describe('buildPgTypesMap', () => {
  it('should build map from tables with pgType', () => {
    const tables = [
      makeTable('Document', [
        makeField('id', 'UUID', false, 'uuid'),
        makeField('vectorEmbedding', 'Float', true, 'vector'),
        makeField('tsvContent', 'FullText', false, 'tsvector'),
      ]),
    ];

    const result = buildPgTypesMap(tables);
    expect(result).toEqual({
      Document: {
        id: { pgType: 'uuid' },
        vectorEmbedding: { pgType: 'vector' },
        tsvContent: { pgType: 'tsvector' },
      },
    });
  });

  it('should set pgType to null when not available (template mode)', () => {
    const tables = [
      makeTable('User', [
        makeField('id', 'UUID'),
        makeField('name', 'String'),
      ]),
    ];

    const result = buildPgTypesMap(tables);
    expect(result).toEqual({
      User: {
        id: { pgType: null },
        name: { pgType: null },
      },
    });
  });

  it('should include pgAlias and typmod when present', () => {
    const tables: Table[] = [
      {
        name: 'Article',
        fields: [
          {
            name: 'embedding',
            type: {
              gqlType: 'Float',
              isArray: true,
              pgType: 'vector',
              pgAlias: 'vector',
              typmod: 768,
            },
          },
        ],
        relations: { belongsTo: [], hasOne: [], hasMany: [], manyToMany: [] },
      },
    ];

    const result = buildPgTypesMap(tables);
    expect(result.Article.embedding).toEqual({
      pgType: 'vector',
      pgAlias: 'vector',
      typmod: 768,
    });
  });

  it('should handle empty tables array', () => {
    expect(buildPgTypesMap([])).toEqual({});
  });

  it('should handle tables with no fields', () => {
    const tables = [makeTable('Empty', [])];
    expect(buildPgTypesMap(tables)).toEqual({});
  });
});
