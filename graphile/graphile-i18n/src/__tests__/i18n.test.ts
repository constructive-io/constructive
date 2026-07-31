/**
 * Integration tests for graphile-i18n v5 plugin.
 *
 * Uses graphile-test with a real PostgreSQL database to verify:
 * - @i18n smart tag discovery
 * - localeStrings field generation
 * - Language-aware translation resolution
 * - Fallback to base table values when no translation exists
 */

import type { GraphQLResponse } from 'graphile-test';
import { getConnections, seed } from 'graphile-test';
import { join } from 'path';

import { createI18nPlugin } from '../plugin';

type QueryFn = <TResult = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  commit?: boolean,
  reqOptions?: Record<string, unknown>
) => Promise<GraphQLResponse<TResult>>;

interface PostLocaleStrings {
  langCode: string | null;
  title: string;
  body: string | null;
}

interface PostNode {
  rowId: number;
  title: string;
  body: string | null;
  localeStrings: PostLocaleStrings;
}

interface AllPostsResult {
  allPosts: {
    nodes: PostNode[];
  };
}

interface PostByIdResult {
  postByRowId: PostNode | null;
}

describe('graphile-i18n plugin', () => {
  let db: any;
  let teardown: () => Promise<void>;
  let query: QueryFn;

  beforeAll(async () => {
    const i18nPlugin = createI18nPlugin({
      defaultLanguages: ['en'],
    });

    const testPreset = {
      plugins: [i18nPlugin],
    };

    const connections = await (getConnections as any)(
      {
        schemas: ['i18n_test'],
        preset: testPreset,
        useRoot: true,
        authRole: 'postgres',
      },
      [seed.sqlfile([join(__dirname, './setup.sql')])]
    );

    db = connections.db;
    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    await teardown();
  });

  it('should add localeStrings field to posts with @i18n tag', async () => {
    const result = await query<AllPostsResult>(`
      {
        allPosts(orderBy: ROW_ID_ASC) {
          nodes {
            rowId
            title
            body
            localeStrings {
              langCode
              title
              body
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();
    const nodes = result.data!.allPosts.nodes;
    expect(nodes.length).toBeGreaterThanOrEqual(2);

    // First post has translations — should get English
    const post1 = nodes.find(n => n.rowId === 1);
    expect(post1).toBeDefined();
    expect(post1!.localeStrings).toBeDefined();
    expect(post1!.localeStrings.langCode).toBe('en');
    expect(post1!.localeStrings.title).toBe('Hello World (EN)');
    expect(post1!.localeStrings.body).toBe('English translation body');
  });

  it('should fall back to base table values when no translation exists', async () => {
    const result = await query<AllPostsResult>(`
      {
        allPosts(orderBy: ROW_ID_ASC) {
          nodes {
            rowId
            title
            localeStrings {
              langCode
              title
              body
            }
          }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const nodes = result.data!.allPosts.nodes;

    // Second post has no translations — should fall back to base values
    const post2 = nodes.find(n => n.rowId === 2);
    expect(post2).toBeDefined();
    expect(post2!.localeStrings.langCode).toBeNull();
    expect(post2!.localeStrings.title).toBe('Untranslated Post');
    expect(post2!.localeStrings.body).toBe('This post has no translations');
  });

  it('should resolve Spanish translation when langCodes context is set', async () => {
    const result = await query<PostByIdResult>(
      `
        query ($id: Int!) {
          postByRowId(rowId: $id) {
            rowId
            title
            localeStrings {
              langCode
              title
              body
            }
          }
        }
      `,
      { id: 1 },
      false,
      { langCodes: ['es'] }
    );

    expect(result.errors).toBeUndefined();
    const post = result.data!.postByRowId;
    expect(post).toBeDefined();
    expect(post!.localeStrings.langCode).toBe('es');
    expect(post!.localeStrings.title).toBe('Hola Mundo');
    expect(post!.localeStrings.body).toBe('Cuerpo de traduccion en espanol');
  });

  it('should resolve French translation', async () => {
    const result = await query<PostByIdResult>(
      `
        query ($id: Int!) {
          postByRowId(rowId: $id) {
            rowId
            localeStrings {
              langCode
              title
              body
            }
          }
        }
      `,
      { id: 1 },
      false,
      { langCodes: ['fr'] }
    );

    expect(result.errors).toBeUndefined();
    const post = result.data!.postByRowId;
    expect(post).toBeDefined();
    expect(post!.localeStrings.langCode).toBe('fr');
    expect(post!.localeStrings.title).toBe('Bonjour le Monde');
  });

  it('should fall back to first available language when requested language has no translation', async () => {
    const result = await query<PostByIdResult>(
      `
        query ($id: Int!) {
          postByRowId(rowId: $id) {
            rowId
            localeStrings {
              langCode
              title
            }
          }
        }
      `,
      { id: 1 },
      false,
      { langCodes: ['de', 'en'] }
    );

    expect(result.errors).toBeUndefined();
    const post = result.data!.postByRowId;
    expect(post).toBeDefined();
    // 'de' doesn't exist, so should fall back to 'en'
    expect(post!.localeStrings.langCode).toBe('en');
    expect(post!.localeStrings.title).toBe('Hello World (EN)');
  });
});
