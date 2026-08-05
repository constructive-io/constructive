import { createBm25Adapter } from '../adapters/bm25';
import { collectBm25Indexes } from '../codecs/bm25-codec';

interface MockIndexOptions {
  schema: string;
  classId: string;
  table?: string;
  column?: string;
  attributeNumber?: number;
  index: string;
  accessMethod?: string;
  valid?: boolean | null;
  ready?: boolean | null;
  live?: boolean | null;
}

const mockIndex = ({
  schema,
  classId,
  table = 'documents',
  column = 'body',
  attributeNumber = 2,
  index,
  accessMethod = 'bm25',
  valid = true,
  ready = true,
  live = true
}: MockIndexOptions) => {
  const namespace = { nspname: schema };
  const tableClass = {
    _id: classId,
    relname: table,
    relnamespace: schema,
    getNamespace: () => namespace
  };
  const indexClass = {
    relname: index,
    getAccessMethod: () => ({ amname: accessMethod })
  };
  const attribute = { attnum: attributeNumber, attname: column };
  return {
    indisvalid: valid,
    indisready: ready,
    indislive: live,
    indnkeyatts: 1,
    indkey: [attributeNumber],
    getIndexClass: () => indexClass,
    getClass: () => tableClass,
    getKeys: () => [attribute]
  };
};

const introspectionWith = (...indexes: ReturnType<typeof mockIndex>[]) => ({
  indexes,
  extensions: [{ extname: 'pg_textsearch', extnamespace: '900' }],
  getNamespace: ({ id }: { id: string }) => id === '900'
    ? { _id: '900', nspname: 'extension_tools' }
    : { _id: id, nspname: id }
} as any);

describe('BM25 introspection binding', () => {
  it('keeps identical tenant table names isolated by the configured schema', () => {
    const introspection = introspectionWith(
      mockIndex({
        schema: 'tenant_a',
        classId: '100',
        index: 'tenant_a_documents_body_bm25_idx'
      }),
      mockIndex({
        schema: 'tenant_b',
        classId: '200',
        index: 'tenant_b_documents_body_bm25_idx'
      })
    );

    const tenantA = collectBm25Indexes(introspection, ['tenant_a'], 'service_a');
    const tenantB = collectBm25Indexes(introspection, ['tenant_b'], 'service_b');

    expect([...tenantA.values()]).toEqual([
      {
        serviceName: 'service_a',
        extensionSchema: 'extension_tools',
        schemaName: 'tenant_a',
        tableName: 'documents',
        columnName: 'body',
        indexName: 'tenant_a_documents_body_bm25_idx'
      }
    ]);
    expect([...tenantB.values()]).toEqual([
      {
        serviceName: 'service_b',
        extensionSchema: 'extension_tools',
        schemaName: 'tenant_b',
        tableName: 'documents',
        columnName: 'body',
        indexName: 'tenant_b_documents_body_bm25_idx'
      }
    ]);
  });

  it('does not retain indexes across rebuilds', () => {
    const first = collectBm25Indexes(
      introspectionWith(
        mockIndex({ schema: 'tenant_a', classId: '100', index: 'first_idx' })
      ),
      ['tenant_a'],
      'main'
    );
    const rebuilt = collectBm25Indexes(introspectionWith(), ['tenant_a'], 'main');

    expect(first.size).toBe(1);
    expect(rebuilt.size).toBe(0);
  });

  it('skips invalid and non-BM25 indexes', () => {
    const result = collectBm25Indexes(
      introspectionWith(
        mockIndex({
          schema: 'tenant_a',
          classId: '100',
          index: 'invalid_idx',
          valid: false
        }),
        mockIndex({
          schema: 'tenant_a',
          classId: '100',
          index: 'unknown_state_idx',
          live: null
        }),
        mockIndex({
          schema: 'tenant_a',
          classId: '100',
          index: 'btree_idx',
          accessMethod: 'btree'
        })
      ),
      ['tenant_a'],
      'main'
    );

    expect(result.size).toBe(0);
  });

  it('fails deterministically when two BM25 indexes target one attribute', () => {
    const introspection = introspectionWith(
      mockIndex({ schema: 'tenant_a', classId: '100', index: 'z_idx' }),
      mockIndex({ schema: 'tenant_a', classId: '100', index: 'a_idx' })
    );

    expect(() => collectBm25Indexes(introspection, ['tenant_a'], 'main')).toThrow(
      'Multiple BM25 indexes target tenant_a.documents.body: a_idx, z_idx'
    );
  });

  it('lets the adapter consume metadata bound to the exact codec attribute', () => {
    const adapter = createBm25Adapter();
    const codec = {
      attributes: {
        body: {
          codec: { name: 'text' },
          extensions: {
            bm25Index: {
              serviceName: 'main',
              extensionSchema: 'extension_tools',
              schemaName: 'tenant_a',
              tableName: 'documents',
              columnName: 'body',
              indexName: 'tenant_a_documents_body_bm25_idx'
            }
          }
        }
      }
    };

    expect(adapter.detectColumns(codec, {})).toEqual([
      {
        attributeName: 'body',
        adapterData: {
          bm25Index: codec.attributes.body.extensions.bm25Index,
          chunksInfo: undefined
        }
      }
    ]);
  });

  it('binds chunk search to its introspected physical index name', () => {
    const adapter = createBm25Adapter();
    const parentIndex = {
      serviceName: 'service_a',
      extensionSchema: 'extension_tools',
      schemaName: 'tenant_a',
      tableName: 'documents',
      columnName: 'body',
      indexName: 'parent_idx'
    };
    const chunkIndex = {
      serviceName: 'service_a',
      extensionSchema: 'extension_tools',
      schemaName: 'tenant_a',
      tableName: 'document_chunks',
      columnName: 'content',
      indexName: 'nonconventional_exact_chunk_idx'
    };
    const parentCodec = {
      attributes: {
        id: { codec: { name: 'uuid' } },
        body: {
          codec: { name: 'text' },
          extensions: { bm25Index: parentIndex }
        }
      },
      extensions: {
        pg: { serviceName: 'service_a', schemaName: 'tenant_a', name: 'documents' },
        tags: {
          hasChunks: {
            chunksTable: 'document_chunks',
            contentField: 'content',
            searchIndexes: ['bm25']
          }
        }
      }
    };
    const chunksCodec = {
      attributes: {
        parent_id: {},
        embedding: {},
        content: { extensions: { bm25Index: chunkIndex } }
      },
      extensions: {
        pg: {
          serviceName: 'service_a',
          schemaName: 'tenant_a',
          name: 'document_chunks'
        }
      }
    };
    const build = {
      input: {
        pgRegistry: {
          pgCodecs: {
            wrongServiceChunks: {
              attributes: {
                content: {
                  extensions: {
                    bm25Index: {
                      ...chunkIndex,
                      serviceName: 'service_b',
                      indexName: 'wrong_service_idx'
                    }
                  }
                }
              }
            },
            chunks: chunksCodec
          },
          pgResources: { chunks: { codec: chunksCodec } }
        }
      },
      resolvedPreset: {
        pgServices: [{ name: 'service_a', schemas: ['tenant_a'] }]
      }
    };

    const [column] = adapter.detectColumns(parentCodec, build);
    expect(column.adapterData).toEqual({
      bm25Index: parentIndex,
      chunksInfo: {
        chunksSchema: 'tenant_a',
        chunksTableName: 'document_chunks',
        parentFkField: 'parent_id',
        parentPkField: 'id',
        embeddingField: 'embedding',
        contentField: 'content',
        searchField: null,
        searchIndexes: ['bm25']
      },
      chunkBm25Index: chunkIndex
    });

    const sql = Object.assign(
      (strings: TemplateStringsArray, ...values: any[]) =>
        strings.reduce((text, part, index) => text + part + (values[index] ?? ''), ''),
      {
        identifier: (...names: string[]) => names.map((name) => `"${name}"`).join('.'),
        value: (value: any) => `'${value}'`
      }
    );
    const result = adapter.buildFilterApply(
      sql,
      'docs' as any,
      column,
      { query: 'tenant memory' },
      build
    );
    expect(String(result?.scoreExpression)).toContain(
      'tenant_a.nonconventional_exact_chunk_idx'
    );
    expect(String(result?.scoreExpression)).toContain(
      'OPERATOR("extension_tools".<@>)'
    );
    expect(String(result?.scoreExpression)).not.toContain('wrong_service_idx');
  });

  it('fails closed when chunk BM25 metadata cannot be bound', () => {
    const adapter = createBm25Adapter();
    const codec = {
      attributes: {
        id: { codec: { name: 'uuid' } },
        body: {
          codec: { name: 'text' },
          extensions: {
            bm25Index: {
              serviceName: 'main',
              extensionSchema: 'extension_tools',
              schemaName: 'tenant_a',
              tableName: 'documents',
              columnName: 'body',
              indexName: 'parent_idx'
            }
          }
        }
      },
      extensions: {
        pg: { serviceName: 'main', schemaName: 'tenant_a', name: 'documents' },
        tags: {
          hasChunks: {
            chunksTable: 'document_chunks',
            searchIndexes: ['bm25']
          }
        }
      }
    };
    const chunksCodec = {
      attributes: { parent_id: {}, embedding: {}, content: {} },
      extensions: {
        pg: { serviceName: 'main', schemaName: 'tenant_a', name: 'document_chunks' }
      }
    };

    expect(() => adapter.detectColumns(codec, {
      input: {
        pgRegistry: {
          pgCodecs: { chunks: chunksCodec },
          pgResources: { chunks: { codec: chunksCodec } }
        }
      },
      resolvedPreset: { pgServices: [{ name: 'main', schemas: ['tenant_a'] }] }
    })).toThrow(
      'BM25 chunk search could not bind an introspected index for '
      + 'tenant_a.document_chunks.content'
    );
  });
});
