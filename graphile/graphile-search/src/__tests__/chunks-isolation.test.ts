import { getChunksInfo } from '../adapters/chunks';

function fixture(overrides: {
  chunksSchema?: string;
  duplicate?: boolean;
  dependencySchemas?: string[];
} = {}) {
  const parentCodec = {
    name: 'documents',
    attributes: { id: {} },
    extensions: {
      pg: { serviceName: 'main', schemaName: 'tenant_a', name: 'documents' },
      tags: {
        hasChunks: {
          chunksSchema: overrides.chunksSchema ?? 'tenant_a',
          chunksTable: 'documents_chunks',
          parentFk: 'document_id',
        },
      },
    },
  };
  const chunkCodec = {
    name: 'documentsChunks',
    attributes: {
      document_id: {},
      embedding: {},
      content: {},
    },
    extensions: {
      pg: {
        serviceName: 'main',
        schemaName: overrides.chunksSchema ?? 'tenant_a',
        name: 'documents_chunks',
      },
    },
  };
  const resource = { codec: chunkCodec };
  return {
    parentCodec,
    build: {
      input: {
        pgRegistry: {
          pgResources: overrides.duplicate
            ? { first: resource, second: { codec: chunkCodec } }
            : { chunks: resource },
        },
      },
      resolvedPreset: {
        pgServices: [{
          name: 'main',
          schemas: ['tenant_a'],
          introspectionAllowedDependencySchemas: overrides.dependencySchemas ?? [],
        }],
      },
    },
  };
}

describe('@hasChunks exact-build isolation', () => {
  it('resolves one exact resource inside the service schema allowlist', () => {
    const { parentCodec, build } = fixture();
    expect(getChunksInfo(parentCodec, build)).toMatchObject({
      chunksSchema: 'tenant_a',
      chunksTableName: 'documents_chunks',
      parentFkField: 'document_id',
    });
  });

  it('rejects a cross-schema resource even when it exists in the registry', () => {
    const { parentCodec, build } = fixture({ chunksSchema: 'tenant_b' });
    expect(() => getChunksInfo(parentCodec, build)).toThrow(/outside service 'main'/);
  });

  it('accepts a resource only when its dependency schema is explicitly allowlisted', () => {
    const { parentCodec, build } = fixture({
      chunksSchema: 'tenant_chunks',
      dependencySchemas: ['tenant_chunks'],
    });
    expect(getChunksInfo(parentCodec, build)?.chunksSchema).toBe('tenant_chunks');
  });

  it('rejects ambiguous exact resource matches', () => {
    const { parentCodec, build } = fixture({ duplicate: true });
    expect(() => getChunksInfo(parentCodec, build)).toThrow(/matches=2/);
  });

  it('rejects malformed tags instead of silently disabling chunk routing', () => {
    const { parentCodec, build } = fixture();
    parentCodec.extensions.tags.hasChunks = 'not-json' as any;
    expect(() => getChunksInfo(parentCodec, build)).toThrow(/valid JSON/);
  });
});
