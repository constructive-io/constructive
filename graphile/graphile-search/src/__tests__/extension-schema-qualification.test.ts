import sql from 'pg-sql2';

import { createPgvectorAdapter } from '../adapters/pgvector';
import { createTrgmAdapter } from '../adapters/trgm';
import { createTrgmOperatorFactories } from '../codecs/operator-factories';
import { VectorCodecPlugin } from '../codecs/vector-codec';
import {
  collectSearchExtensionSchemas,
  extensionSchemasByService,
  requireBuildExtensionSchema,
  resolveBuildExtensionSchema,
  type SearchExtensionSchemas,
} from '../extension-metadata';

const extensionBinding = (
  overrides: Partial<SearchExtensionSchemas> = {}
): SearchExtensionSchemas => ({
  serviceName: 'tenant_service',
  pgTrgmSchema: 'extension_tools',
  pgvectorSchema: 'extension_tools',
  ...overrides,
});

const introspection = (extensions: any[]) => ({
  extensions,
  getNamespace: ({ id }: { id: string }) =>
    id === '910' ? { nspname: 'extension_tools' } : undefined,
} as any);

describe('search extension schema binding', () => {
  it('collects exact pg_trgm and pgvector schemas from one service introspection', () => {
    expect(collectSearchExtensionSchemas(
      introspection([
        { extname: 'pg_trgm', extnamespace: '910' },
        { extname: 'vector', extnamespace: '910' },
      ]),
      'tenant_service'
    )).toEqual(extensionBinding());
  });

  it('fails closed on ambiguous or unresolved extension metadata', () => {
    expect(() => collectSearchExtensionSchemas(
      introspection([
        { extname: 'pg_trgm', extnamespace: '910' },
        { extname: 'pg_trgm', extnamespace: '910' },
      ]),
      'tenant_service'
    )).toThrow(/ambiguous pg_trgm/);

    expect(() => collectSearchExtensionSchemas(
      introspection([{ extname: 'pg_trgm', extnamespace: '999' }]),
      'tenant_service'
    )).toThrow(/cannot resolve the namespace/);
  });

  it('requires one complete build-wide schema for shared operator factories', () => {
    expect(requireBuildExtensionSchema({
      pgSearchExtensionSchemasByService: new Map([
        ['tenant_service', extensionBinding()],
      ]),
    }, 'pg_trgm')).toBe('extension_tools');

    expect(() => requireBuildExtensionSchema({
      pgSearchExtensionSchemasByService: new Map([
        ['a', extensionBinding({ serviceName: 'a', pgTrgmSchema: 'ext_a' })],
        ['b', extensionBinding({ serviceName: 'b', pgTrgmSchema: 'ext_b' })],
      ]),
    }, 'pg_trgm')).toThrow(/ambiguous schemas/);

    const absentBuild = {
      pgSearchExtensionSchemasByService: new Map([
        ['tenant_service', extensionBinding({ pgTrgmSchema: null })],
      ]),
    };
    expect(resolveBuildExtensionSchema(absentBuild, 'pg_trgm')).toBeNull();
    expect(() => requireBuildExtensionSchema(absentBuild, 'pg_trgm')).toThrow(
      /required by this feature but is not installed/
    );
  });

  it('disables optional operators for an empty service and still fails on missing record metadata', () => {
    const emptyBuild = {
      input: { pgRegistry: { pgCodecs: { text: { name: 'text' } } } },
    };
    expect(resolveBuildExtensionSchema(emptyBuild, 'pg_trgm')).toBeNull();
    expect(createTrgmOperatorFactories()(emptyBuild as any)).toEqual([]);

    const recordWithoutBinding = {
      input: {
        pgRegistry: {
          pgCodecs: {
            animals: { name: 'animals', attributes: {} },
          },
        },
      },
    };
    expect(() => resolveBuildExtensionSchema(
      recordWithoutBinding,
      'pg_trgm'
    )).toThrow(/requires service-bound extension metadata/);
  });

  it('retains service identity on a record codec even without attributes', () => {
    const binding = extensionBinding();
    const build = {
      input: {
        pgRegistry: {
          pgCodecs: {
            emptyRecord: {
              name: 'empty_record',
              extensions: { searchExtensionSchemas: binding },
            },
          },
        },
      },
    };
    expect(extensionSchemasByService(build).get('tenant_service')).toBe(binding);
  });
});

describe('pg_trgm SQL qualification', () => {
  const adapter = createTrgmAdapter({ requireIntentionalSearch: false });

  it('binds metadata to the eligible attribute and qualifies similarity', () => {
    const codec = {
      name: 'documents',
      attributes: {
        title: {
          codec: { name: 'text' },
          extensions: { searchExtensionSchemas: extensionBinding() },
        },
      },
    };
    const [column] = adapter.detectColumns(codec, {});
    const result = adapter.buildFilterApply(
      sql,
      sql.identifier('documents'),
      column,
      { value: 'memory density', threshold: 0.2 },
      {}
    );
    const compiled = sql.compile(result!.whereClause!);
    expect(compiled.text).toContain(
      '"extension_tools"."similarity"("documents"."title", $1)'
    );
    expect(compiled.text).not.toMatch(/(^|[^."])similarity\(/);
  });

  it('qualifies similarity and word_similarity in operator factories', () => {
    const registrations = createTrgmOperatorFactories()({
      sql,
      pgSearchExtensionSchemasByService: new Map([
        ['tenant_service', extensionBinding()],
      ]),
      getTypeByName: () => ({ name: 'TrgmSearchInput' }),
    } as any);
    const similar = registrations.find((entry) => entry.operatorName === 'similarTo')!;
    const word = registrations.find((entry) => entry.operatorName === 'wordSimilarTo')!;

    const similarSql = similar.spec.resolve!(
      sql.identifier('title'),
      sql.null,
      { value: 'memory', threshold: 0.3 },
      null,
      { fieldName: 'title', operatorName: 'similarTo' }
    );
    const wordSql = word.spec.resolve!(
      sql.identifier('title'),
      sql.null,
      { value: 'memory', threshold: 0.3 },
      null,
      { fieldName: 'title', operatorName: 'wordSimilarTo' }
    );
    expect(sql.compile(similarSql!).text).toContain(
      '"extension_tools"."similarity"'
    );
    expect(sql.compile(wordSql!).text).toContain(
      '"extension_tools"."word_similarity"'
    );
  });

  it('fails closed when an eligible attribute has no bound schema', () => {
    expect(() => adapter.detectColumns({
      name: 'documents',
      attributes: { title: { codec: { name: 'text' } } },
    }, {})).toThrow(/missing service-bound extension schema/);
  });

  it('disables the adapter and operator factory when pg_trgm is absent', () => {
    const absent = extensionBinding({ pgTrgmSchema: null });
    const defaultAdapter = createTrgmAdapter();
    expect(defaultAdapter.detectColumns({
      name: 'documents',
      attributes: {
        title: {
          codec: { name: 'text' },
          extensions: { searchExtensionSchemas: absent },
        },
      },
    }, {})).toEqual([]);

    expect(createTrgmOperatorFactories()({
      sql,
      pgSearchExtensionSchemasByService: new Map([
        ['tenant_service', absent],
      ]),
    } as any)).toEqual([]);
  });

  it('fails closed when an explicit trgm feature requires an absent extension', () => {
    expect(() => adapter.detectColumns({
      name: 'documents',
      attributes: {
        title: {
          codec: { name: 'text' },
          extensions: {
            searchExtensionSchemas: extensionBinding({ pgTrgmSchema: null }),
          },
        },
      },
    }, {})).toThrow(/required .* but is not installed/);
  });
});

describe('pgvector SQL qualification', () => {
  const vectorCodec = {
    name: 'vector',
    extensions: {
      pg: {
        serviceName: 'tenant_service',
        schemaName: 'extension_tools',
        name: 'vector',
      },
    },
  };

  it('qualifies and annotates a native vector codec during gather', async () => {
    const gatherHook = (VectorCodecPlugin as any).gather.hooks.pgCodecs_findPgCodec;
    const event: any = {
      pgCodec: {
        name: 'vector',
        sqlType: sql.fragment`vector`,
        extensions: undefined,
      },
      pgType: { typname: 'vector', typnamespace: '910', _id: '912' },
      serviceName: 'tenant_service',
    };
    const originalCodec = event.pgCodec;
    await gatherHook({
      helpers: {
        pgIntrospection: {
          getNamespace: jest.fn().mockResolvedValue({ nspname: 'extension_tools' }),
        },
      },
    }, event);

    expect(event.pgCodec).toBe(originalCodec);
    expect(event.pgCodec.extensions).toMatchObject({
      oid: '912',
      pg: {
        serviceName: 'tenant_service',
        schemaName: 'extension_tools',
        name: 'vector',
      },
    });
    expect(sql.compile(event.pgCodec.sqlType).text).toBe('"extension_tools"."vector"');
  });

  it('fails closed when the vector type namespace cannot be resolved', async () => {
    const gatherHook = (VectorCodecPlugin as any).gather.hooks.pgCodecs_findPgCodec;
    await expect(gatherHook({
      helpers: {
        pgIntrospection: {
          getNamespace: jest.fn().mockResolvedValue(undefined),
        },
      },
    }, {
      pgType: { typname: 'vector', typnamespace: '999', _id: '912' },
      serviceName: 'tenant_service',
    })).rejects.toThrow(/cannot resolve the vector type namespace/i);
  });

  it('qualifies the vector cast and distance operator', () => {
    const adapter = createPgvectorAdapter();
    const [column] = adapter.detectColumns({
      name: 'documents',
      attributes: {
        embedding: {
          codec: vectorCodec,
          extensions: { searchExtensionSchemas: extensionBinding() },
        },
      },
    }, {});
    const result = adapter.buildFilterApply(
      sql,
      sql.identifier('documents'),
      column,
      { vector: [1, 0, 0], metric: 'COSINE' },
      {}
    );
    const compiled = sql.compile(result!.scoreExpression);
    expect(compiled.text).toContain('::"extension_tools"."vector"');
    expect(compiled.text).toContain('OPERATOR("extension_tools".<=>)');
  });

  it('fails closed when codec and extension identities disagree', () => {
    const adapter = createPgvectorAdapter();
    expect(() => adapter.detectColumns({
      name: 'documents',
      attributes: {
        embedding: {
          codec: vectorCodec,
          extensions: {
            searchExtensionSchemas: extensionBinding({
              pgvectorSchema: 'other_extension_schema',
            }),
          },
        },
      },
    }, {})).toThrow(/does not match extension/);
  });
});
