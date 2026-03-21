/**
 * ORM M:N Integration Test
 *
 * Tests the full codegen -> ORM runtime chain against a real PostgreSQL database:
 *   1. Seeds DB with M:N tables (posts, tags, post_tags junction)
 *   2. Builds a Graphile schema via graphile-test with ManyToManyOptInPreset
 *   3. Runs the codegen pipeline (introspection -> inferTables -> generateOrm)
 *   4. Loads the generated createClient and instantiates models
 *   5. Exercises ORM model methods (findMany, create, delete) via QueryBuilder
 *
 * This validates that the codegen pipeline produces valid ORM code that
 * works against a real PostGraphile schema with +manyToMany enabled.
 */
import path from 'path';
import { getConnectionsObject, seed } from 'graphile-test';
import type { GraphQLQueryFnObj, GraphQLResponse } from 'graphile-test';
import type { PgTestClient } from 'pgsql-test';
import { ManyToManyOptInPreset } from 'graphile-settings';
import { runCodegenAndLoad } from './helpers/codegen-helper';
import { GraphileTestAdapter } from './helpers/graphile-adapter';

jest.setTimeout(120000);

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
  let orm: Record<string, any>;

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

    // Run the full codegen pipeline against the live schema
    const { createClient } = await runCodegenAndLoad(query, 'm2n');

    // Create the ORM client with the GraphileTestAdapter
    const adapter = new GraphileTestAdapter(query);
    orm = createClient({ adapter });
  });

  afterAll(async () => {
    if (teardown) {
      await teardown();
    }
  });

  /** Extract the first connection/mutation result regardless of field name */
  function unwrapData(data: any): any {
    return Object.values(data)[0];
  }

  /** Raw GraphQL for operations the ORM doesn't generate (e.g. junction delete) */
  async function gql<T = unknown>(
    queryStr: string,
    variables?: Record<string, unknown>,
  ): Promise<GraphQLResponse<T>> {
    return query<T>({ query: queryStr, variables });
  }

  // =========================================================================
  // Smoke test: verify codegen produced the expected models
  // =========================================================================
  describe('codegen smoke test', () => {
    it('createClient returns model instances for all tables', () => {
      expect(orm).toBeDefined();
      expect(orm.post).toBeDefined();
      expect(orm.tag).toBeDefined();
      expect(orm.postTag).toBeDefined();
    });

    it('models have the expected CRUD methods', () => {
      expect(typeof orm.post.findMany).toBe('function');
      expect(typeof orm.post.findFirst).toBe('function');
      expect(typeof orm.post.create).toBe('function');
      expect(typeof orm.tag.findMany).toBe('function');
      expect(typeof orm.postTag.findMany).toBe('function');
      expect(typeof orm.postTag.create).toBe('function');
    });
  });

  // =========================================================================
  // Test: ORM findMany with M:N relations
  // =========================================================================
  describe('findMany with M:N relations', () => {
    it('post.findMany returns posts with M:N tags connection', async () => {
      const result = await orm.post
        .findMany({
          select: {
            rowId: true,
            title: true,
            tagsByPostTagPostIdAndTagId: {
              select: { rowId: true, name: true },
            },
          },
        })
        .execute();

      expect(result.ok).toBe(true);
      const posts = unwrapData(result.data).nodes;
      expect(posts).toBeDefined();
      expect(posts.length).toBe(2);

      const post1 = posts.find((p: any) => p.rowId === POST_1);
      expect(post1).toBeDefined();
      expect(post1.tagsByPostTagPostIdAndTagId.nodes).toHaveLength(1);
      expect(post1.tagsByPostTagPostIdAndTagId.nodes[0].name).toBe(
        'Technology',
      );

      const post2 = posts.find((p: any) => p.rowId === POST_2);
      expect(post2).toBeDefined();
      expect(post2.tagsByPostTagPostIdAndTagId.nodes).toHaveLength(0);
    });

    it('tag.findMany returns tags with M:N posts connection', async () => {
      const result = await orm.tag
        .findMany({
          select: {
            rowId: true,
            name: true,
            postsByPostTagTagIdAndPostId: {
              select: { rowId: true, title: true },
            },
          },
        })
        .execute();

      expect(result.ok).toBe(true);
      const tags = unwrapData(result.data).nodes;
      expect(tags).toBeDefined();
      expect(tags.length).toBe(3);

      const tech = tags.find((t: any) => t.name === 'Technology');
      expect(tech.postsByPostTagTagIdAndPostId.nodes).toHaveLength(1);

      const design = tags.find((t: any) => t.name === 'Design');
      expect(design.postsByPostTagTagIdAndPostId.nodes).toHaveLength(0);
    });
  });

  // =========================================================================
  // Test: addTag pattern (create junction row via ORM postTag.create)
  // =========================================================================
  describe('addTag (create junction row via ORM)', () => {
    it('creates a junction row via postTag.create', async () => {
      const result = await orm.postTag
        .create({
          data: { postId: POST_1, tagId: TAG_DESIGN },
          select: { rowId: true, postId: true, tagId: true },
        })
        .execute();

      expect(result.ok).toBe(true);
      const postTag = unwrapData(result.data).postTag;
      expect(postTag).toBeDefined();
      expect(postTag.postId).toBe(POST_1);
      expect(postTag.tagId).toBe(TAG_DESIGN);

      // Verify via ORM: post1 should now have 2 tags
      const verifyResult = await orm.post
        .findMany({
          select: {
            rowId: true,
            tagsByPostTagPostIdAndTagId: {
              select: { rowId: true, name: true },
            },
          },
          condition: { rowId: POST_1 },
        })
        .execute();

      expect(verifyResult.ok).toBe(true);
      const post1Tags =
        unwrapData(verifyResult.data).nodes[0]?.tagsByPostTagPostIdAndTagId
          ?.nodes;
      expect(post1Tags).toHaveLength(2);
      const tagNames = post1Tags.map((t: any) => t.name).sort();
      expect(tagNames).toEqual(['Design', 'Technology']);
    });

    it('creates multiple junction rows for different posts', async () => {
      const result = await orm.postTag
        .create({
          data: { postId: POST_2, tagId: TAG_SCIENCE },
          select: { rowId: true, postId: true, tagId: true },
        })
        .execute();

      expect(result.ok).toBe(true);
      const postTag = unwrapData(result.data).postTag;
      expect(postTag.postId).toBe(POST_2);
      expect(postTag.tagId).toBe(TAG_SCIENCE);
    });

    it('rejects duplicate junction rows (unique constraint)', async () => {
      const result = await orm.postTag
        .create({
          data: { postId: POST_1, tagId: TAG_TECH },
          select: { rowId: true },
        })
        .execute();

      expect(result.ok).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Test: removeTag pattern (delete junction row via ORM postTag.delete)
  // =========================================================================
  describe('removeTag (delete junction row)', () => {
    // The codegen doesn't generate a delete method for post_tags because
    // inferTablesFromIntrospection reports primaryKey: undefined for this
    // junction table. We use ORM findMany to locate the row, then raw
    // GraphQL deletePostTagByPostIdAndTagId (composite unique key) to remove it.

    it('deletes a junction row by composite key', async () => {
      // ORM: verify post1 currently has Technology + Design
      const beforeResult = await orm.postTag
        .findMany({
          select: { rowId: true, postId: true, tagId: true },
          condition: { postId: POST_1 },
        })
        .execute();

      expect(beforeResult.ok).toBe(true);
      const beforeNodes = unwrapData(beforeResult.data).nodes;
      expect(beforeNodes.length).toBeGreaterThanOrEqual(2);

      // Raw GraphQL: delete by composite key (postId + tagId)
      const deleteResult = await gql<{ deletePostTagByPostIdAndTagId: { postTag: { postId: string; tagId: string } } }>(`
        mutation ($postId: UUID!, $tagId: UUID!) {
          deletePostTagByPostIdAndTagId(input: { postId: $postId, tagId: $tagId }) {
            postTag { postId tagId }
          }
        }
      `, { postId: POST_1, tagId: TAG_DESIGN });

      expect(deleteResult.errors).toBeUndefined();
      expect(deleteResult.data?.deletePostTagByPostIdAndTagId.postTag.tagId).toBe(TAG_DESIGN);

      // ORM: verify post1 is back to just Technology
      const afterResult = await orm.post
        .findMany({
          select: {
            rowId: true,
            tagsByPostTagPostIdAndTagId: {
              select: { name: true },
            },
          },
          condition: { rowId: POST_1 },
        })
        .execute();

      expect(afterResult.ok).toBe(true);
      const post1Tags =
        unwrapData(afterResult.data).nodes[0]?.tagsByPostTagPostIdAndTagId
          ?.nodes;
      expect(post1Tags).toHaveLength(1);
      expect(post1Tags[0].name).toBe('Technology');
    });

    it('deletes a junction row by rowId', async () => {
      // ORM: find the science junction row
      const findResult = await orm.postTag
        .findMany({
          select: { rowId: true, postId: true, tagId: true },
          condition: { postId: POST_2 },
        })
        .execute();

      expect(findResult.ok).toBe(true);
      const scienceRow = unwrapData(findResult.data).nodes.find(
        (r: any) => r.tagId === TAG_SCIENCE,
      );
      expect(scienceRow).toBeDefined();

      // Raw GraphQL: delete by rowId
      const deleteResult = await gql<{ deletePostTagByRowId: { postTag: { rowId: string } } }>(`
        mutation ($rowId: UUID!) {
          deletePostTagByRowId(input: { rowId: $rowId }) {
            postTag { rowId }
          }
        }
      `, { rowId: scienceRow.rowId });

      expect(deleteResult.errors).toBeUndefined();
    });
  });

  // =========================================================================
  // Test: CRUD on entities (posts, tags) via ORM
  // =========================================================================
  describe('CRUD operations via ORM', () => {
    it('creates a post via post.create', async () => {
      const result = await orm.post
        .create({
          data: {
            title: 'ORM Test Post',
            body: 'Created by orm-test',
            isPublished: true,
          },
          select: { rowId: true, title: true, body: true, isPublished: true },
        })
        .execute();

      expect(result.ok).toBe(true);
      const post = unwrapData(result.data).post;
      expect(post).toBeDefined();
      expect(post.title).toBe('ORM Test Post');
      expect(post.isPublished).toBe(true);
    });

    it('creates a tag and immediately links it to a post', async () => {
      // Create tag via ORM
      const tagResult = await orm.tag
        .create({
          data: { name: 'NewTag', color: '#FF0000' },
          select: { rowId: true, name: true },
        })
        .execute();

      expect(tagResult.ok).toBe(true);
      const newTag = unwrapData(tagResult.data).tag;
      expect(newTag).toBeDefined();

      // Link it to post2 via ORM
      const linkResult = await orm.postTag
        .create({
          data: { postId: POST_2, tagId: newTag.rowId },
          select: { postId: true, tagId: true },
        })
        .execute();

      expect(linkResult.ok).toBe(true);
      expect(unwrapData(linkResult.data).postTag.tagId).toBe(newTag.rowId);

      // Verify via ORM findMany
      const verifyResult = await orm.post
        .findMany({
          select: {
            rowId: true,
            tagsByPostTagPostIdAndTagId: {
              select: { name: true },
            },
          },
          condition: { rowId: POST_2 },
        })
        .execute();

      expect(verifyResult.ok).toBe(true);
      const post2Tags =
        unwrapData(verifyResult.data).nodes[0]?.tagsByPostTagPostIdAndTagId
          ?.nodes;
      expect(post2Tags.map((t: any) => t.name)).toContain('NewTag');
    });
  });

  // =========================================================================
  // Test: reverse M:N direction (tag.posts)
  // =========================================================================
  describe('reverse M:N direction via ORM', () => {
    it('queries tags with their posts via ORM findMany', async () => {
      const result = await orm.tag
        .findMany({
          select: {
            name: true,
            postsByPostTagTagIdAndPostId: {
              select: { title: true },
            },
          },
        })
        .execute();

      expect(result.ok).toBe(true);
      const tags = unwrapData(result.data).nodes;
      expect(tags).toBeDefined();

      const tech = tags.find((t: any) => t.name === 'Technology');
      expect(
        tech.postsByPostTagTagIdAndPostId.nodes.length,
      ).toBeGreaterThanOrEqual(1);
    });
  });
});
