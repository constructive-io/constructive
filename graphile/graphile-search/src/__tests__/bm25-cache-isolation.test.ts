import { createBm25Adapter } from '../adapters/bm25';
import { Bm25CodecPlugin, collectBm25Indexes } from '../codecs/bm25-codec';

const row = (indexName: string) => ({
  class_id: '100',
  attribute_number: 2,
  schema_name: 'tenant_a',
  table_name: 'documents',
  column_name: 'body',
  index_name: indexName,
});

describe('BM25 gather cache ownership', () => {
  it('does not retain index discovery across gather states', () => {
    const first = collectBm25Indexes([row('first_idx')]);
    const rebuilt = collectBm25Indexes([]);

    expect(first.size).toBe(1);
    expect(rebuilt.size).toBe(0);
  });

  it('binds and consumes only the current gather state', () => {
    const first = collectBm25Indexes([row('first_idx')]);
    const rebuilt = collectBm25Indexes([row('rebuilt_idx')]);
    const attributeHook = (Bm25CodecPlugin.gather as any).hooks
      .pgCodecs_attribute;
    const attribute: any = { codec: { name: 'text' } };

    attributeHook(
      { state: { indexesByService: new Map([['main', rebuilt]]) } },
      {
        serviceName: 'main',
        pgClass: { _id: '100' },
        pgAttribute: { attnum: 2 },
        attribute,
      }
    );

    expect(attribute.extensions.bm25Index.indexName).toBe('rebuilt_idx');
    expect([...first.values()][0].indexName).toBe('first_idx');

    const adapter = createBm25Adapter();
    expect(
      adapter.detectColumns({ attributes: { body: attribute } }, {})
    ).toEqual([
      {
        attributeName: 'body',
        adapterData: {
          bm25Index: attribute.extensions.bm25Index,
          chunksInfo: undefined,
        },
      },
    ]);
  });
});
