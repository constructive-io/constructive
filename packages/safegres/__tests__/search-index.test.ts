import { checkUnindexedSearchColumns, checkUnindexedSortColumns } from '../src/checks/indexes';
import type { ColumnInfo, IndexInfo, TableIndexSnapshot } from '../src/pg/indexes';

/**
 * The pgvector paths are unit-tested against a synthetic snapshot rather than
 * a SQL fixture: `CREATE EXTENSION vector` is not available on every CI image,
 * and the check reads nothing but the catalog shape.
 */
function column(name: string, attnum: number, type: string, baseType = type): ColumnInfo {
  return { name, attnum, type, baseType };
}

function index(name: string, method: string, columns: number[], partial = false): IndexInfo {
  return {
    name,
    columns,
    columnNames: columns.map(String),
    unique: false,
    primary: false,
    constraint: false,
    partial,
    expression: false,
    method,
    definition: `CREATE INDEX ${name} ON t USING ${method} (...)`
  };
}

function table(over: Partial<TableIndexSnapshot> = {}): TableIndexSnapshot {
  return {
    schema: 'app_public',
    name: 'documents',
    oid: 1,
    isPartition: false,
    replicaIdentity: 'd',
    hasPrimaryKey: true,
    estimatedRows: 0,
    columns: [],
    indexes: [],
    foreignKeys: [],
    ...over
  };
}

describe('X7 — search column index coverage', () => {
  it('flags a vector column with no HNSW/IVFFlat index', () => {
    const findings = checkUnindexedSearchColumns(
      table({ columns: [column('embedding', 2, 'vector(1536)', 'vector')] })
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe('X7');
    expect(findings[0].context).toMatchObject({ column: 'embedding', methods: ['hnsw', 'ivfflat'] });
    expect(findings[0].hint).toContain('USING hnsw (embedding vector_cosine_ops)');
  });

  it.each(['hnsw', 'ivfflat'])('accepts a %s index on the vector column', (method) => {
    const findings = checkUnindexedSearchColumns(
      table({
        columns: [column('embedding', 2, 'vector(1536)', 'vector')],
        indexes: [index('documents_embedding_idx', method, [2])]
      })
    );
    expect(findings).toHaveLength(0);
  });

  it('does not accept a btree index as vector-search coverage', () => {
    const findings = checkUnindexedSearchColumns(
      table({
        columns: [column('embedding', 2, 'vector(1536)', 'vector')],
        indexes: [index('documents_embedding_idx', 'btree', [2])]
      })
    );
    expect(findings).toHaveLength(1);
  });

  it('covers halfvec and sparsevec, and ignores ordinary columns', () => {
    const findings = checkUnindexedSearchColumns(
      table({
        columns: [
          column('half', 2, 'halfvec(1536)', 'halfvec'),
          column('sparse', 3, 'sparsevec(1536)', 'sparsevec'),
          column('title', 4, 'text'),
          column('payload', 5, 'jsonb')
        ]
      })
    );
    expect(findings.map((f) => (f.context as { column: string }).column)).toEqual([
      'half',
      'sparse'
    ]);
  });

  it('leaves partitions to their parent', () => {
    const findings = checkUnindexedSearchColumns(
      table({ isPartition: true, columns: [column('search_doc', 2, 'tsvector')] })
    );
    expect(findings).toHaveLength(0);
  });
});

describe('X8 — sort column index coverage', () => {
  it('accepts a leading index and rejects a trailing or partial one', () => {
    const columns = [
      column('lead_at', 2, 'timestamptz'),
      column('trail_at', 3, 'timestamptz'),
      column('partial_at', 4, 'date')
    ];
    const findings = checkUnindexedSortColumns(
      table({
        columns,
        indexes: [
          index('lead_idx', 'btree', [2]),
          index('trail_idx', 'btree', [9, 3]),
          index('partial_idx', 'btree', [4], true)
        ]
      })
    );
    expect(findings.map((f) => (f.context as { column: string }).column)).toEqual([
      'trail_at',
      'partial_at'
    ]);
    expect(findings.every((f) => f.severity === 'info')).toBe(true);
  });

  it('ignores non-sort-shaped column types', () => {
    const findings = checkUnindexedSortColumns(
      table({ columns: [column('title', 2, 'text'), column('rank', 3, 'integer')] })
    );
    expect(findings).toHaveLength(0);
  });
});
