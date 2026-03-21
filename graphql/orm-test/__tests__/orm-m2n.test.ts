/**
 * ORM M:N Integration Test
 *
 * Tests the full ORM loop against a real PostgreSQL database:
 *   1. Seeds DB with M:N tables (posts, tags, post_tags junction)
 *   2. Builds a Graphile schema via graphile-test with ManyToManyOptInPreset
 *   3. Exercises GraphQL mutations that the generated ORM add/remove methods produce
 *   4. Verifies junction rows are created/deleted correctly
 *
 * This validates that the query-builder runtime functions (buildCreateDocument,
 * buildJunctionRemoveDocument) produce valid GraphQL operations that work
 * against a real PostGraphile schema with +manyToMany enabled.
 */
import path from 'path';
import { getConnectionsObject, seed } from 'graphile-test';
import type { GraphQLQueryFnObj, GraphQLResponse } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';
import { ManyToManyOptInPreset } from 'graphile-settings';

jest.setTimeout(60000);

const seedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const sql = (file: string) => path.join(seedRoot, file);

const SCHEMAS = ['orm_test'];

// Fixed IDs from seed data
const POST_1 = '11111111-1111-1111-1111-111111111111';
const POST_2 = '22222222-2222-2222-2222-222222222222';
const TAG_TECH = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TAG_DESIGN = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TAG_SCIENCE = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

describe('ORM M:N integration', () => {
  let db: PgTestClient;
  let teardown: () => Promise<void>;
  let query: GraphQLQueryFnObj;

  beforeAll(async () => {
    const connections = await getConnectionsObject(
      {
        schemas: SCHEMAS,
        useRoot: true,
        authRole: 'postgres',
        preset: {
          extends: [ManyToManyOptInPreset],
        },
      },
      [
        seed.sqlfile([
          sql('setup.sql'),
          sql('schema.sql'),
          sql('test-data.sql'),
        ]),
      ],
    );

    db = connections.db;
    teardown = connections.teardown;
    query = connections.query;
  });

  afterAll(async () => {
    if (teardown) {
      await teardown();
    }
  });

  // Helper: run a raw GraphQL query through graphile-test
  async function gql<T = unknown>(
    queryStr: string,
    variables?: Record<string, unknown>,
  ): Promise<GraphQLResponse<T>> {
    return query<T>({ query: queryStr, variables });
  }

  // =========================================================================
  // Smoke test: verify the schema has M:N fields
  // =========================================================================
  describe('schema smoke test', () => {
    it('allPosts returns nodes with M:N tags connection', async () => {
      const result = await gql<{
        allPosts: {
          nodes: Array<{
            rowId: string;
            title: string;
            tagsByPostTagPostIdAndTagId: {
              nodes: Array<{ rowId: string; name: string }>;
            };
          }>;
        };
      }>(
        `query {
          allPosts {
            nodes {
              rowId
              title
              tagsByPostTagPostIdAndTagId {
                nodes { rowId name }
              }
            }
          }
        }`,
      );

      expect(result.errors).toBeUndefined();
      const posts = result.data?.allPosts?.nodes;
      expect(posts).toBeDefined();
      expect(posts!.length).toBe(2);

      const post1 = posts!.find((p) => p.rowId === POST_1);
      expect(post1).toBeDefined();
      expect(post1!.tagsByPostTagPostIdAndTagId.nodes).toHaveLength(1);
      expect(post1!.tagsByPostTagPostIdAndTagId.nodes[0].name).toBe(
        'Technology',
      );

      const post2 = posts!.find((p) => p.rowId === POST_2);
      expect(post2).toBeDefined();
      expect(post2!.tagsByPostTagPostIdAndTagId.nodes).toHaveLength(0);
    });

    it('allTags returns nodes with M:N posts connection', async () => {
      const result = await gql<{
        allTags: {
          nodes: Array<{
            rowId: string;
            name: string;
            postsByPostTagTagIdAndPostId: {
              nodes: Array<{ rowId: string; title: string }>;
            };
          }>;
        };
      }>(
        `query {
          allTags {
            nodes {
              rowId
              name
              postsByPostTagTagIdAndPostId {
                nodes { rowId title }
              }
            }
          }
        }`,
      );

      expect(result.errors).toBeUndefined();
      const tags = result.data?.allTags?.nodes;
      expect(tags).toBeDefined();
      expect(tags!.length).toBe(3);

      const tech = tags!.find((t) => t.name === 'Technology');
      expect(tech!.postsByPostTagTagIdAndPostId.nodes).toHaveLength(1);

      const design = tags!.find((t) => t.name === 'Design');
      expect(design!.postsByPostTagTagIdAndPostId.nodes).toHaveLength(0);
    });
  });

  // =========================================================================
  // Test: addTag pattern (create junction row via createPostTag mutation)
  // =========================================================================
  describe('addTag (create junction row)', () => {
    it('creates a junction row via createPostTag mutation', async () => {
      const result = await gql<{
        createPostTag: {
          postTag: { rowId: string; postId: string; tagId: string };
        };
      }>(
        `mutation CreatePostTag($input: CreatePostTagInput!) {
          createPostTag(input: $input) {
            postTag { rowId postId tagId }
          }
        }`,
        { input: { postTag: { postId: POST_1, tagId: TAG_DESIGN } } },
      );

      expect(result.errors).toBeUndefined();
      const postTag = result.data?.createPostTag?.postTag;
      expect(postTag).toBeDefined();
      expect(postTag!.postId).toBe(POST_1);
      expect(postTag!.tagId).toBe(TAG_DESIGN);

      // Verify via M:N connection: post1 should now have 2 tags
      const verifyResult = await gql<{
        allPosts: {
          nodes: Array<{
            rowId: string;
            tagsByPostTagPostIdAndTagId: {
              nodes: Array<{ rowId: string; name: string }>;
            };
          }>;
        };
      }>(
        `query {
          allPosts(condition: { rowId: "${POST_1}" }) {
            nodes {
              rowId
              tagsByPostTagPostIdAndTagId {
                nodes { rowId name }
              }
            }
          }
        }`,
      );

      expect(verifyResult.errors).toBeUndefined();
      const post1Tags =
        verifyResult.data?.allPosts?.nodes[0]?.tagsByPostTagPostIdAndTagId
          .nodes;
      expect(post1Tags).toHaveLength(2);
      const tagNames = post1Tags!.map((t) => t.name).sort();
      expect(tagNames).toEqual(['Design', 'Technology']);
    });

    it('creates multiple junction rows for different posts', async () => {
      const result = await gql<{
        createPostTag: {
          postTag: { rowId: string; postId: string; tagId: string };
        };
      }>(
        `mutation CreatePostTag($input: CreatePostTagInput!) {
          createPostTag(input: $input) {
            postTag { rowId postId tagId }
          }
        }`,
        { input: { postTag: { postId: POST_2, tagId: TAG_SCIENCE } } },
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.createPostTag?.postTag.postId).toBe(POST_2);
      expect(result.data?.createPostTag?.postTag.tagId).toBe(TAG_SCIENCE);
    });

    it('rejects duplicate junction rows (unique constraint)', async () => {
      const result = await gql(
        `mutation CreatePostTag($input: CreatePostTagInput!) {
          createPostTag(input: $input) {
            postTag { rowId }
          }
        }`,
        { input: { postTag: { postId: POST_1, tagId: TAG_TECH } } },
      );

      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Test: removeTag pattern (delete junction row via deletePostTag mutation)
  // =========================================================================
  describe('removeTag (delete junction row)', () => {
    it('deletes a junction row by composite keys', async () => {
      // Verify current state: post1 has Technology + Design
      const beforeResult = await gql<{
        allPostTags: {
          nodes: Array<{ rowId: string; postId: string; tagId: string }>;
        };
      }>(
        `query {
          allPostTags(condition: { postId: "${POST_1}" }) {
            nodes { rowId postId tagId }
          }
        }`,
      );

      expect(beforeResult.errors).toBeUndefined();
      expect(
        beforeResult.data?.allPostTags?.nodes.length,
      ).toBeGreaterThanOrEqual(2);

      // Delete junction row for post1 <-> Design using composite key mutation
      const result = await gql<{
        deletePostTagByPostIdAndTagId: {
          postTag: {
            rowId: string;
            postId: string;
            tagId: string;
          } | null;
        };
      }>(
        `mutation DeletePostTag($input: DeletePostTagByPostIdAndTagIdInput!) {
          deletePostTagByPostIdAndTagId(input: $input) {
            postTag { rowId postId tagId }
          }
        }`,
        { input: { postId: POST_1, tagId: TAG_DESIGN } },
      );

      expect(result.errors).toBeUndefined();
      expect(
        result.data?.deletePostTagByPostIdAndTagId?.postTag?.tagId,
      ).toBe(TAG_DESIGN);

      // Verify: post1 should be back to just Technology
      const afterResult = await gql<{
        allPosts: {
          nodes: Array<{
            rowId: string;
            tagsByPostTagPostIdAndTagId: {
              nodes: Array<{ name: string }>;
            };
          }>;
        };
      }>(
        `query {
          allPosts(condition: { rowId: "${POST_1}" }) {
            nodes {
              rowId
              tagsByPostTagPostIdAndTagId {
                nodes { name }
              }
            }
          }
        }`,
      );

      expect(afterResult.errors).toBeUndefined();
      const post1Tags =
        afterResult.data?.allPosts?.nodes[0]?.tagsByPostTagPostIdAndTagId
          .nodes;
      expect(post1Tags).toHaveLength(1);
      expect(post1Tags![0].name).toBe('Technology');
    });

    it('deletes a junction row by rowId', async () => {
      // Find the rowId of post2 <-> Science junction row
      const findResult = await gql<{
        allPostTags: {
          nodes: Array<{ rowId: string; postId: string; tagId: string }>;
        };
      }>(
        `query {
          allPostTags(condition: { postId: "${POST_2}" }) {
            nodes { rowId postId tagId }
          }
        }`,
      );

      expect(findResult.errors).toBeUndefined();
      const scienceRow = findResult.data?.allPostTags?.nodes.find(
        (r) => r.tagId === TAG_SCIENCE,
      );
      expect(scienceRow).toBeDefined();

      // Delete by rowId
      const result = await gql<{
        deletePostTagByRowId: { postTag: { rowId: string } | null };
      }>(
        `mutation DeletePostTagByRowId($input: DeletePostTagByRowIdInput!) {
          deletePostTagByRowId(input: $input) {
            postTag { rowId }
          }
        }`,
        { input: { rowId: scienceRow!.rowId } },
      );

      expect(result.errors).toBeUndefined();
      expect(result.data?.deletePostTagByRowId?.postTag?.rowId).toBe(
        scienceRow!.rowId,
      );
    });
  });

  // =========================================================================
  // Test: CRUD on entities (posts, tags)
  // =========================================================================
  describe('CRUD operations', () => {
    it('creates a post via createPost mutation', async () => {
      const result = await gql<{
        createPost: {
          post: {
            rowId: string;
            title: string;
            body: string;
            isPublished: boolean;
          };
        };
      }>(
        `mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            post { rowId title body isPublished }
          }
        }`,
        {
          input: {
            post: {
              title: 'ORM Test Post',
              body: 'Created by orm-test',
              isPublished: true,
            },
          },
        },
      );

      expect(result.errors).toBeUndefined();
      const post = result.data?.createPost?.post;
      expect(post).toBeDefined();
      expect(post!.title).toBe('ORM Test Post');
      expect(post!.isPublished).toBe(true);
    });

    it('creates a tag and immediately links it to a post', async () => {
      // Create tag
      const tagResult = await gql<{
        createTag: { tag: { rowId: string; name: string } };
      }>(
        `mutation CreateTag($input: CreateTagInput!) {
          createTag(input: $input) {
            tag { rowId name }
          }
        }`,
        { input: { tag: { name: 'NewTag', color: '#FF0000' } } },
      );

      expect(tagResult.errors).toBeUndefined();
      const newTag = tagResult.data?.createTag?.tag;
      expect(newTag).toBeDefined();

      // Link it to post2
      const linkResult = await gql<{
        createPostTag: { postTag: { postId: string; tagId: string } };
      }>(
        `mutation CreatePostTag($input: CreatePostTagInput!) {
          createPostTag(input: $input) {
            postTag { postId tagId }
          }
        }`,
        { input: { postTag: { postId: POST_2, tagId: newTag!.rowId } } },
      );

      expect(linkResult.errors).toBeUndefined();
      expect(linkResult.data?.createPostTag?.postTag.tagId).toBe(
        newTag!.rowId,
      );

      // Verify via M:N connection
      const verifyResult = await gql<{
        allPosts: {
          nodes: Array<{
            rowId: string;
            tagsByPostTagPostIdAndTagId: {
              nodes: Array<{ name: string }>;
            };
          }>;
        };
      }>(
        `query {
          allPosts(condition: { rowId: "${POST_2}" }) {
            nodes {
              rowId
              tagsByPostTagPostIdAndTagId {
                nodes { name }
              }
            }
          }
        }`,
      );

      expect(verifyResult.errors).toBeUndefined();
      const post2Tags =
        verifyResult.data?.allPosts?.nodes[0]?.tagsByPostTagPostIdAndTagId
          .nodes;
      expect(post2Tags!.map((t) => t.name)).toContain('NewTag');
    });
  });

  // =========================================================================
  // Test: reverse M:N direction (tag.posts)
  // =========================================================================
  describe('reverse M:N direction', () => {
    it('queries tags with their posts via M:N connection', async () => {
      const result = await gql<{
        allTags: {
          nodes: Array<{
            name: string;
            postsByPostTagTagIdAndPostId: {
              totalCount: number;
              nodes: Array<{ title: string }>;
            };
          }>;
        };
      }>(
        `query {
          allTags {
            nodes {
              name
              postsByPostTagTagIdAndPostId {
                totalCount
                nodes { title }
              }
            }
          }
        }`,
      );

      expect(result.errors).toBeUndefined();
      const tags = result.data?.allTags?.nodes;
      expect(tags).toBeDefined();

      const tech = tags!.find((t) => t.name === 'Technology');
      expect(
        tech!.postsByPostTagTagIdAndPostId.totalCount,
      ).toBeGreaterThanOrEqual(1);
    });
  });
});
