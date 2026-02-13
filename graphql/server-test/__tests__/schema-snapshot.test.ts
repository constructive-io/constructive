/**
 * Schema Snapshot Test
 *
 * This test verifies that our GraphQL schema generation produces consistent output.
 * It uses a comprehensive test schema with:
 * - 5 tables (users, posts, tags, post_tags, comments)
 * - Many-to-many relationships (posts <-> tags via post_tags)
 * - Self-referential relationships (comments.parent_id)
 * - Foreign key relationships (posts.author_id, comments.author_id)
 * - Unique constraints (email, username, slug)
 * - Various column types (uuid, text, boolean, integer, timestamptz)
 *
 * The snapshot captures how our plugins sculpt the GraphQL API:
 * - InflektPreset: table/field naming conventions
 * - PostGraphileConnectionFilterPreset: filter fields on connections
 * - ManyToManyOptInPreset: many-to-many fields via @behavior +manyToMany
 * - MetaSchemaPreset: _meta query for introspection
 * - MinimalPreset: no Node/Relay (id stays as id)
 * - NoUniqueLookupPreset: no *ByEmail, *ByUsername lookups
 *
 * Run tests:
 *   pnpm test -- --testPathPattern=schema-snapshot
 */

import path from 'path';
import { buildSchemaSDL } from '@constructive-io/graphql-server';
import { getConnections, seed } from '../src';

jest.setTimeout(60000);

const seedRoot = path.join(__dirname, '..', '__fixtures__', 'seed');
const sql = (seedDir: string, file: string) =>
  path.join(seedRoot, seedDir, file);

const schemas = ['snapshot_public'];

describe('Schema Snapshot', () => {
  let teardown: () => Promise<void>;
  let sdl: string;

  beforeAll(async () => {
    const connections = await getConnections(
      {
        schemas,
        authRole: 'anonymous',
        server: {
          api: { enableServicesApi: false, isPublic: false },
        },
      },
      [
        seed.sqlfile([
          sql('schema-snapshot', 'setup.sql'),
          sql('schema-snapshot', 'schema.sql'),
          sql('schema-snapshot', 'test-data.sql'),
        ]),
      ]
    );
    teardown = connections.teardown;
    
    sdl = await buildSchemaSDL({
      database: connections.pg.config.database,
      schemas,
    });
  });

  afterAll(async () => {
    if (teardown) {
      await teardown();
    }
  });

  it('should generate consistent GraphQL SDL from the test schema', () => {
    expect(sdl).toMatchSnapshot();
  });
});
