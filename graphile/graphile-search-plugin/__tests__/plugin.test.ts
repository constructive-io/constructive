import { join } from 'path';
import { getConnections, seed, snapshot } from 'graphile-test';
import type { GraphQLResponse } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';
import { PgSearchPreset } from '../src';

const SCHEMA = 'app_public';
const sqlFile = (f: string) => join(__dirname, '../sql', f);

interface GoalsResult {
  allGoals: {
    nodes: Array<{
      rowId: number;
      title: string;
      description: string;
    }>;
  };
}

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

describe('PgSearchPlugin', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const testPreset = {
      extends: [
        PgSearchPreset({ pgSearchPrefix: 'fullText' }),
      ],
    };

    const connections = await getConnections(
      {
        schemas: [SCHEMA],
        preset: testPreset,
        useRoot: true,
      },
      [seed.sqlfile([sqlFile('test.sql')])]
    );

    db = connections.db;
    teardown = connections.teardown;
    query = connections.query;

    // Start a transaction for savepoint-based test isolation
    await db.client.query('BEGIN');
  });

  afterAll(async () => {
    if (db) {
      try {
        await db.client.query('ROLLBACK');
      } catch {
        // Ignore rollback errors
      }
    }

    if (teardown) {
      await teardown();
    }
  });

  beforeEach(async () => {
    await db.beforeEach();
  });

  afterEach(async () => {
    await db.afterEach();
  });

  describe('condition-based search on tsv column', () => {
    it('returns matching rows with ts_rank as secondary sort', async () => {
      const result = await query<GoalsResult>(
        `
        query GoalsSearchViaCondition($search: String!) {
          allGoals(condition: { fullTextTsv: $search }) {
            nodes {
              rowId
              title
              description
            }
          }
        }
      `,
        { search: 'fowl' }
      );

      expect(result.errors).toBeUndefined();
      expect(snapshot(result.data)).toMatchSnapshot();
    });

    it('returns no rows when search term does not match', async () => {
      const result = await query<GoalsResult>(
        `
        query GoalsSearchViaCondition($search: String!) {
          allGoals(condition: { fullTextTsv: $search }) {
            nodes {
              rowId
              title
            }
          }
        }
      `,
        { search: 'xylophone' }
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.allGoals.nodes).toHaveLength(0);
    });
  });

  describe('condition-based search on stsv column', () => {
    it('returns only title-matched rows for fullTextStsv condition', async () => {
      const result = await query<GoalsResult>(
        `
        query GoalsSearchViaCondition2($search: String!) {
          allGoals(condition: { fullTextStsv: $search }) {
            nodes {
              rowId
              title
              description
            }
          }
        }
      `,
        { search: 'fowl' }
      );

      expect(result.errors).toBeUndefined();
      expect(snapshot(result.data)).toMatchSnapshot();
    });
  });

  describe('edge cases', () => {
    it('handles empty search string gracefully', async () => {
      const result = await query<GoalsResult>(
        `
        query GoalsSearchViaCondition($search: String!) {
          allGoals(condition: { fullTextTsv: $search }) {
            nodes {
              rowId
              title
            }
          }
        }
      `,
        { search: '' }
      );

      // Empty string may return all or no results depending on PostgreSQL behavior
      expect(result.errors).toBeUndefined();
      expect(result.data?.allGoals).toBeDefined();
    });

    it('works with multi-word search terms', async () => {
      const result = await query<GoalsResult>(
        `
        query GoalsSearchViaCondition($search: String!) {
          allGoals(condition: { fullTextTsv: $search }) {
            nodes {
              rowId
              title
            }
          }
        }
      `,
        { search: 'green fowl' }
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.allGoals).toBeDefined();
      expect(result.data?.allGoals.nodes.length).toBeGreaterThan(0);
    });
  });
});
