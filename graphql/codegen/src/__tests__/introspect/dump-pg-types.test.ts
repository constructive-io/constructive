import { buildMetaFromTables } from '../../core/dump-pg-types';
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

describe('buildMetaFromTables', () => {
  it('should build MetaTableInfo[] from tables with pgType', () => {
    const tables = [
      makeTable('Document', [
        makeField('id', 'UUID', false, 'uuid'),
        makeField('vectorEmbedding', 'Float', true, 'vector'),
        makeField('tsvContent', 'FullText', false, 'tsvector'),
      ]),
    ];

    const result = buildMetaFromTables(tables);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Document');
    expect(result[0].fields).toEqual([
      { name: 'id', type: { pgType: 'uuid', gqlType: 'UUID', isArray: false } },
      { name: 'vectorEmbedding', type: { pgType: 'vector', gqlType: 'Float', isArray: true } },
      { name: 'tsvContent', type: { pgType: 'tsvector', gqlType: 'FullText', isArray: false } },
    ]);
  });

  it('should set pgType to "unknown" when not available', () => {
    const tables = [
      makeTable('User', [
        makeField('id', 'UUID'),
        makeField('name', 'String'),
      ]),
    ];

    const result = buildMetaFromTables(tables);
    expect(result).toHaveLength(1);
    expect(result[0].fields).toEqual([
      { name: 'id', type: { pgType: 'unknown', gqlType: 'UUID', isArray: false } },
      { name: 'name', type: { pgType: 'unknown', gqlType: 'String', isArray: false } },
    ]);
  });

  it('should preserve relations', () => {
    const tables: Table[] = [
      {
        name: 'Article',
        fields: [
          { name: 'id', type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' } },
        ],
        relations: {
          belongsTo: [],
          hasOne: [],
          hasMany: [],
          manyToMany: [{
            fieldName: 'tags',
            rightTable: 'Tag',
            junctionTable: 'ArticleTag',
            type: 'Tag',
            junctionLeftKeyFields: ['articleId'],
            junctionRightKeyFields: ['tagId'],
            leftKeyFields: ['id'],
            rightKeyFields: ['id'],
          }],
        },
      },
    ];

    const result = buildMetaFromTables(tables);
    expect(result[0].relations.manyToMany).toHaveLength(1);
    expect(result[0].relations.manyToMany[0].junctionTable.name).toBe('ArticleTag');
    expect(result[0].relations.manyToMany[0].rightTable.name).toBe('Tag');
  });

  it('should handle empty tables array', () => {
    expect(buildMetaFromTables([])).toEqual([]);
  });

  it('should handle tables with no fields', () => {
    const tables = [makeTable('Empty', [])];
    const result = buildMetaFromTables(tables);
    expect(result).toHaveLength(1);
    expect(result[0].fields).toEqual([]);
  });
});
