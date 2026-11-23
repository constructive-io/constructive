import { ConnectionFilterPreset } from 'graphile-connection-filter';
import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';

import { createPgvectorAdapter } from '../adapters/pgvector';
import { createTsvectorAdapter } from '../adapters/tsvector';
import { TsvectorCodecPlugin } from '../codecs/tsvector-codec';
import { VectorCodecPlugin } from '../codecs/vector-codec';
import { createUnifiedSearchPlugin } from '../plugin';

type Fields = { __type: { fields: Array<{ name: string }> } };
type QueryFn = <T>(query: string, variables?: Record<string, unknown>) => Promise<GraphQLResponse<T>>;

const FIELDS = '{ __type(name: "Doc") { fields { name } } }';

// One plugin instance (as a module-level preset would hold) building schemas
// for two databases that both have an `app.docs` table, with different
// searchable columns.
describe('one plugin instance building two schemas', () => {
  const teardowns: Array<() => Promise<void>> = [];

  const plugin = createUnifiedSearchPlugin({
    adapters: [createTsvectorAdapter(), createPgvectorAdapter()],
  });

  async function build(sqlFile: string): Promise<QueryFn> {
    const connections = await getConnections({
      schemas: ['app'],
      preset: {
        extends: [ConnectionFilterPreset()],
        plugins: [TsvectorCodecPlugin, VectorCodecPlugin, plugin],
      },
      useRoot: true,
      authRole: 'postgres',
    }, [seed.sqlfile([join(__dirname, 'sql', sqlFile)])]);
    teardowns.push(connections.teardown);
    return connections.query as QueryFn;
  }

  async function fieldNames(query: QueryFn) {
    const result = await query<Fields>(FIELDS);
    expect(result.errors).toBeUndefined();
    return result.data!.__type.fields.map((f) => f.name);
  }

  afterAll(async () => {
    for (const teardown of teardowns) await teardown();
  });

  it('each schema exposes the search fields of its own table', async () => {
    const tsvQuery = await build('docs-tsv.sql');
    const embeddingQuery = await build('docs-embedding.sql');

    const tsvFields = await fieldNames(tsvQuery);
    expect(tsvFields).toContain('tsvRank');
    expect(tsvFields).not.toContain('embeddingVectorDistance');

    const embeddingFields = await fieldNames(embeddingQuery);
    expect(embeddingFields).toContain('embeddingVectorDistance');
    expect(embeddingFields).not.toContain('tsvRank');
  });
});
