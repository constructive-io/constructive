/**
 * Regression: DatabaseSchemaSource must return GraphQL introspection and
 * tablesMeta from the same correlated build result, never from the legacy
 * process-global `_cachedTablesMeta` channel — which another build in the
 * same process can overwrite between builds.
 */
import { DatabaseSchemaSource } from '../../core/introspect/source/database';

const SDL_A = `
type Query {
  alphaItems: [AlphaItem!]
}

type AlphaItem {
  id: Int!
  title: String!
}
`;

const SDL_B = `
type Query {
  betaWidgets: [BetaWidget!]
}

type BetaWidget {
  id: Int!
  label: String!
}
`;

const tableMetaA = { name: 'AlphaItem', tableName: 'alpha_items' };
const tableMetaB = { name: 'BetaWidget', tableName: 'beta_widgets' };

// Simulates the legacy process-global: the *last* build in the process wins.
let lastBuildGlobal: unknown[] = [];

jest.mock('graphile-schema', () => ({
  buildSchemaArtifacts: jest.fn(async (opts: { schemas: string[]; _onMetaCollected?: () => Promise<void> }) => {
    const isA = opts.schemas.includes('schema_a');
    const tablesMeta = isA ? [tableMetaA] : [tableMetaB];
    lastBuildGlobal = tablesMeta;
    if (opts._onMetaCollected) await opts._onMetaCollected();
    return { sdl: isA ? SDL_A : SDL_B, tablesMeta };
  }),
}));

function typeNames(introspection: { __schema: { types: { name: string }[] } }): string[] {
  return introspection.__schema.types.map((t) => t.name);
}

describe('DatabaseSchemaSource result correlation', () => {
  it('returns introspection and tablesMeta belonging to the same schema', async () => {
    const source = new DatabaseSchemaSource({
      database: 'test_db',
      schemas: ['schema_a'],
    });

    const result = await source.fetch();

    expect(typeNames(result.introspection)).toContain('AlphaItem');
    expect(result.tablesMeta).toEqual([tableMetaA]);
  });

  it('is unaffected by another schema build completing mid-fetch (A write -> B write -> A read)', async () => {
    const sourceA = new DatabaseSchemaSource({
      database: 'test_db',
      schemas: ['schema_a'],
      // Pause A after its metadata is collected so B can build and overwrite
      // the simulated process-global before A's fetch resumes.
      _onMetaCollected: async () => {
        const sourceB = new DatabaseSchemaSource({
          database: 'test_db',
          schemas: ['schema_b'],
        });
        await sourceB.fetch();
        expect(lastBuildGlobal).toEqual([tableMetaB]);
      },
    });

    const resultA = await sourceA.fetch();

    // A must return its own metadata even though B's build wrote last.
    expect(typeNames(resultA.introspection)).toContain('AlphaItem');
    expect(resultA.tablesMeta).toEqual([tableMetaA]);
  });
});
