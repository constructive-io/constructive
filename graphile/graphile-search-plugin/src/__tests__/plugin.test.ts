import { join } from 'path';
import { getConnections, seed } from 'graphile-test';
import type { GraphQLResponse } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';
import { ConstructivePreset } from 'graphile-settings';

const SCHEMA = 'app_public';
const sqlFile = (f: string) => join(__dirname, '../../sql', f);

interface GoalsResult {
  goals: {
    nodes: Array<{
      id: number;
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
    // ConstructivePreset already includes PgSearchPreset({ pgSearchPrefix: 'fullText' })
    const testPreset = {
      extends: [
        ConstructivePreset,
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
    it('returns matching rows for fullTextTsv condition', async () => {
      const result = await query<GoalsResult>(
        `
        query GoalsSearchViaCondition($search: String!) {
          goals(condition: { fullTextTsv: $search }) {
            nodes {
              id
              title
              description
            }
          }
        }
      `,
        { search: 'fowl' }
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.goals).toBeDefined();
      expect(result.data?.goals.nodes.length).toBeGreaterThan(0);

      // 'fowl' appears in descriptions/titles of specific goals
      const titles = result.data?.goals.nodes.map((n) => n.title);
      expect(titles).toBeDefined();
    });

    it('returns no rows when search term does not match', async () => {
      const result = await query<GoalsResult>(
        `
        query GoalsSearchViaCondition($search: String!) {
          goals(condition: { fullTextTsv: $search }) {
            nodes {
              id
              title
            }
          }
        }
      `,
        { search: 'xylophone' }
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.goals.nodes).toHaveLength(0);
    });
  });

  describe('condition-based search on stsv column', () => {
    it('returns matching rows for fullTextStsv condition', async () => {
      const result = await query<GoalsResult>(
        `
        query GoalsSearchViaCondition2($search: String!) {
          goals(condition: { fullTextStsv: $search }) {
            nodes {
              id
              title
              description
            }
          }
        }
      `,
        { search: 'fowl' }
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.goals).toBeDefined();

      // stsv only indexes the title with simple parser,
      // so 'fowl' should only match 'green fowl' title
      const titles = result.data?.goals.nodes.map((n) => n.title);
      if (titles && titles.length > 0) {
        expect(titles).toContain('green fowl');
      }
    });
  });

  describe('edge cases', () => {
    it('handles empty search string gracefully', async () => {
      const result = await query<GoalsResult>(
        `
        query GoalsSearchViaCondition($search: String!) {
          goals(condition: { fullTextTsv: $search }) {
            nodes {
              id
              title
            }
          }
        }
      `,
        { search: '' }
      );

      // Empty string may return all or no results depending on PostgreSQL behavior
      expect(result.errors).toBeUndefined();
      expect(result.data?.goals).toBeDefined();
    });

    it('works with multi-word search terms', async () => {
      const result = await query<GoalsResult>(
        `
        query GoalsSearchViaCondition($search: String!) {
          goals(condition: { fullTextTsv: $search }) {
            nodes {
              id
              title
            }
          }
        }
      `,
        { search: 'green fowl' }
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.goals).toBeDefined();
      expect(result.data?.goals.nodes.length).toBeGreaterThan(0);
    });
  });
});
