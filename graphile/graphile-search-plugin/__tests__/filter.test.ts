import { join } from 'path';
import { getConnectionsObject, seed } from 'graphile-test';
import type { GraphQLQueryFnObj } from 'graphile-test';
import { PostGraphileConnectionFilterPreset } from 'postgraphile-plugin-connection-filter';
import type { GraphileConfig } from 'graphile-config';
import { PgSearchPreset } from '../src';

const SCHEMA = 'filter_test';
const SIMPLE_SCHEMA = 'filter_simple_test';
const sqlFile = (f: string) => join(__dirname, '../sql', f);

type QueryFn = GraphQLQueryFnObj;

// Enable filtering on all columns regardless of index status
const EnableAllFilterColumnsPlugin: GraphileConfig.Plugin = {
  name: 'EnableAllFilterColumnsPlugin',
  version: '1.0.0',
  schema: {
    entityBehavior: {
      pgCodecAttribute: {
        inferred: {
          after: ['postInferred'],
          provides: ['enableAllFilters'],
          callback(behavior: any) {
            return [behavior, 'filterBy'];
          },
        },
      },
    },
  },
};

describe('PgSearchPlugin filter (matches operator)', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [
        PostGraphileConnectionFilterPreset,
        PgSearchPreset({ pgSearchPrefix: 'fullText' }),
      ],
      plugins: [EnableAllFilterColumnsPlugin],
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('filter-test.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) {
      await teardown();
    }
  });

  it('table with unfiltered full-text field works', async () => {
    const result = await query<{ allJobs: { nodes: any[] } }>({
      query: `
        query {
          allJobs {
            nodes {
              id
              name
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.allJobs.nodes).toHaveLength(2);
  });

  it('matches operator filters by full text search', async () => {
    // Search for "fruit" - should match both rows
    const fruitResult = await query<{ allJobs: { nodes: any[] } }>({
      query: `
        query {
          allJobs(
            filter: {
              fullText: {
                matches: "fruit"
              }
            }
          ) {
            nodes {
              id
              name
            }
          }
        }
      `,
    });

    expect(fruitResult.errors).toBeUndefined();
    expect(fruitResult.data?.allJobs.nodes).toHaveLength(2);

    // Search for "banana" - should match only one row
    const bananaResult = await query<{ allJobs: { nodes: any[] } }>({
      query: `
        query {
          allJobs(
            filter: {
              fullText: {
                matches: "banana"
              }
            }
          ) {
            nodes {
              id
              name
            }
          }
        }
      `,
    });

    expect(bananaResult.errors).toBeUndefined();
    expect(bananaResult.data?.allJobs.nodes).toHaveLength(1);
  });

  it.todo('querying rank without filter works (requires rank feature)');

  it.todo('sort by full text rank field works (requires rank orderBy enums)');

  it('FullText scalar type is correctly exposed in schema', async () => {
    const result = await query<{ __type: { name: string; kind: string } | null }>({
      query: `
        query {
          __type(name: "FullText") {
            name
            kind
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.__type).not.toBeNull();
    expect(result.data?.__type?.name).toBe('FullText');
    expect(result.data?.__type?.kind).toBe('SCALAR');
  });

  it('matches operator does NOT appear on StringFilter', async () => {
    const result = await query<{ __type: { inputFields: any[] } | null }>({
      query: `
        query {
          __type(name: "StringFilter") {
            inputFields {
              name
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    if (result.data?.__type) {
      const fieldNames = result.data.__type.inputFields.map((f: any) => f.name);
      expect(fieldNames).not.toContain('matches');
    }
  });

  it('matches operator appears on FullTextFilter', async () => {
    const result = await query<{ __type: { inputFields: any[] } | null }>({
      query: `
        query {
          __type(name: "FullTextFilter") {
            inputFields {
              name
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.__type).not.toBeNull();
    if (result.data?.__type) {
      const fieldNames = result.data.__type.inputFields.map((f: any) => f.name);
      expect(fieldNames).toContain('matches');
    }
  });

  it('handles empty search string', async () => {
    const result = await query<{ allJobs: { nodes: any[] } }>({
      query: `
        query {
          allJobs(
            filter: {
              fullText: {
                matches: ""
              }
            }
          ) {
            nodes {
              id
              name
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.allJobs).toBeDefined();
  });
});

describe('PgSearchPlugin filter with multiple tsvector columns', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [
        PostGraphileConnectionFilterPreset,
        PgSearchPreset({ pgSearchPrefix: 'fullText' }),
      ],
      plugins: [EnableAllFilterColumnsPlugin],
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('filter-test.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) {
      await teardown();
    }
  });

  it('fulltext search with multiple fields works', async () => {
    // Filter both columns
    const result = await query<{ allMultiTsvJobs: { nodes: any[] } }>({
      query: `
        query {
          allMultiTsvJobs(
            filter: {
              fullText: { matches: "fruit" }
              otherFullText: { matches: "vegetable" }
            }
          ) {
            nodes {
              id
              name
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.allMultiTsvJobs.nodes).toHaveLength(2);

    // Filter only other column for "potato"
    const potatoResult = await query<{ allMultiTsvJobs: { nodes: any[] } }>({
      query: `
        query {
          allMultiTsvJobs(
            filter: {
              otherFullText: { matches: "potato" }
            }
          ) {
            nodes {
              id
              name
            }
          }
        }
      `,
    });

    expect(potatoResult.errors).toBeUndefined();
    expect(potatoResult.data?.allMultiTsvJobs.nodes).toHaveLength(1);
  });
});

describe('PgSearchPlugin filter with connectionFilterRelations', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [
        PostGraphileConnectionFilterPreset,
        PgSearchPreset({ pgSearchPrefix: 'fullText' }),
      ],
      plugins: [EnableAllFilterColumnsPlugin],
      schema: {
        connectionFilterRelations: true,
      },
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('filter-test.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) {
      await teardown();
    }
  });

  it('works with connectionFilterRelations (OR with local + relation filter)', async () => {
    const result = await query<{ allOrders: { nodes: any[] } }>({
      query: `
        query {
          allOrders(filter: {
            or: [
              { comment: { includes: "Z"} },
              { clientByClientId: { tsv: { matches: "apple" } } }
            ]
          }) {
            nodes {
              id
              comment
              clientByClientId {
                id
                comment
              }
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // OR condition: comment includes "Z" (orders 3, 6) OR client has "apple" (orders 1, 2, 3)
    // Result: orders 1, 2, 3, 6 = 4 results
    expect(result.data?.allOrders.nodes).toHaveLength(4);
  });

  it('works with connectionFilterRelations with no local filter', async () => {
    const result = await query<{ allOrders: { nodes: any[] } }>({
      query: `
        query {
          allOrders(filter: {
            clientByClientId: { tsv: { matches: "avocado" } }
          }) {
            nodes {
              id
              comment
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    // Client 2 has "avocado", so orders 4, 5, 6 = 3 results
    expect(result.data?.allOrders.nodes).toHaveLength(3);
  });
});

describe('PgSearchPlugin without connection-filter (graceful degradation)', () => {
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    // Preset WITHOUT connection-filter
    const testPreset = {
      extends: [
        PgSearchPreset({ pgSearchPrefix: 'fullText' }),
      ],
    };

    const connections = await getConnectionsObject(
      {
        schemas: [SIMPLE_SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('filter-test-simple.sql')])]
    );

    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) {
      await teardown();
    }
  });

  it('condition-based search still works without connection-filter', async () => {
    const result = await query<{ allSimpleJobs: { nodes: any[] } }>({
      query: `
        query {
          allSimpleJobs(condition: { fullTextTsv: "apple" }) {
            nodes {
              id
              name
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.allSimpleJobs.nodes).toHaveLength(1);
  });

  it('no errors when connection-filter not loaded', async () => {
    const result = await query<{ allSimpleJobs: { nodes: any[] } }>({
      query: `
        query {
          allSimpleJobs {
            nodes {
              id
              name
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.allSimpleJobs).toBeDefined();
  });
});
