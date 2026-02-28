import { VectorCodecPlugin, VectorCodecPreset } from '../src/plugins/vector-codec';

// Mock event shape matching GatherHooks.pgCodecs_findPgCodec
interface MockEvent {
  pgCodec: any;
  pgType: { typname: string; typnamespace?: string; _id?: string };
  serviceName: string;
}

function makeInfo(schemaName = 'public') {
  return {
    helpers: {
      pgIntrospection: {
        getNamespace: jest.fn().mockResolvedValue({ _id: '1', nspname: schemaName }),
      },
    },
  };
}

function makeEvent(typname: string, overrides: Partial<MockEvent> = {}): MockEvent {
  return {
    pgCodec: null,
    pgType: { typname, typnamespace: '100', _id: '284119' },
    serviceName: 'main',
    ...overrides,
  };
}

const gatherHook = (
  VectorCodecPlugin as unknown as {
    gather: { hooks: { pgCodecs_findPgCodec: Function } };
  }
).gather.hooks.pgCodecs_findPgCodec;

// ─── helpers to materialise the codec from the hook ──────────────────────────

async function buildCodec(schemaName = 'public') {
  const info = makeInfo(schemaName);
  const event = makeEvent('vector');
  await gatherHook(info, event);
  return event.pgCodec;
}

// ─── Plugin metadata ──────────────────────────────────────────────────────────

describe('VectorCodecPlugin', () => {
  it('has correct name', () => {
    expect(VectorCodecPlugin.name).toBe('VectorCodecPlugin');
  });

  it('has correct version', () => {
    expect(VectorCodecPlugin.version).toBe('1.0.0');
  });
});

describe('VectorCodecPreset', () => {
  it('contains VectorCodecPlugin', () => {
    expect(VectorCodecPreset.plugins).toContain(VectorCodecPlugin);
  });
});

// ─── gather hook ─────────────────────────────────────────────────────────────

describe('VectorCodecPlugin gather hook', () => {
  it('skips if pgCodec is already set', async () => {
    const info = makeInfo();
    const event = makeEvent('vector', { pgCodec: { name: 'already-set' } });
    await gatherHook(info, event);
    expect(info.helpers.pgIntrospection.getNamespace).not.toHaveBeenCalled();
    expect(event.pgCodec.name).toBe('already-set');
  });

  it('skips non-vector types', async () => {
    for (const typname of ['text', 'geometry', 'tsvector', 'json', 'float8']) {
      const info = makeInfo();
      const event = makeEvent(typname);
      await gatherHook(info, event);
      expect(event.pgCodec).toBeNull();
    }
  });

  it('skips if namespace is not found', async () => {
    const info = {
      helpers: { pgIntrospection: { getNamespace: jest.fn().mockResolvedValue(null) } },
    };
    const event = makeEvent('vector');
    await gatherHook(info, event);
    expect(event.pgCodec).toBeNull();
  });

  it('registers codec for vector type', async () => {
    const codec = await buildCodec();
    expect(codec).not.toBeNull();
    expect(codec.name).toBe('vector');
  });

  it('passes serviceName and namespace to getNamespace', async () => {
    const info = makeInfo();
    const event = makeEvent('vector');
    await gatherHook(info, event);
    expect(info.helpers.pgIntrospection.getNamespace).toHaveBeenCalledWith('main', '100');
  });

  it('sets correct extensions.pg metadata', async () => {
    const codec = await buildCodec('extensions');
    expect(codec.extensions.pg.serviceName).toBe('main');
    expect(codec.extensions.pg.schemaName).toBe('extensions');
    expect(codec.extensions.pg.name).toBe('vector');
  });

  it('sets oid from type._id', async () => {
    const codec = await buildCodec();
    expect(codec.extensions.oid).toBe('284119');
  });

  it('works regardless of schema (public, extensions, custom)', async () => {
    for (const schema of ['public', 'extensions', 'myschema']) {
      const codec = await buildCodec(schema);
      expect(codec.extensions.pg.schemaName).toBe(schema);
    }
  });
});

// ─── fromPg ──────────────────────────────────────────────────────────────────

describe('VectorCodecPlugin codec.fromPg', () => {
  let fromPg: (v: string) => number[];

  beforeAll(async () => {
    const codec = await buildCodec();
    fromPg = codec.fromPg;
  });

  it('parses standard vector string', () => {
    const result = fromPg('[0.1,0.2,0.3]');
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it('parses negative values', () => {
    const result = fromPg('[-0.5,0.25,-0.75]');
    expect(result).toEqual([-0.5, 0.25, -0.75]);
  });

  it('parses 768-dimensional vector', () => {
    const dims = Array.from({ length: 768 }, (_, i) => (i * 0.001).toFixed(6));
    const pgString = `[${dims.join(',')}]`;
    const result = fromPg(pgString);
    expect(result).toHaveLength(768);
    expect(typeof result[0]).toBe('number');
  });

  it('parses single-element vector', () => {
    expect(fromPg('[1.0]')).toEqual([1.0]);
  });

  it('handles spaces around values', () => {
    const result = fromPg('[ 0.1 , 0.2 , 0.3 ]');
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it('returns an array', () => {
    expect(Array.isArray(fromPg('[1,2,3]'))).toBe(true);
  });
});

// ─── toPg ────────────────────────────────────────────────────────────────────

describe('VectorCodecPlugin codec.toPg', () => {
  let toPg: (v: number[]) => string;

  beforeAll(async () => {
    const codec = await buildCodec();
    toPg = codec.toPg;
  });

  it('serialises number[] to pgvector text format', () => {
    expect(toPg([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]');
  });

  it('serialises negative values', () => {
    expect(toPg([-0.5, 0.25, -0.75])).toBe('[-0.5,0.25,-0.75]');
  });

  it('round-trips through fromPg → toPg', async () => {
    const codec = await buildCodec();
    const original = [0.1, -0.2, 0.3, 0.0, -1.0];
    const pgString = codec.toPg(original);
    const parsed = codec.fromPg(pgString);
    expect(parsed).toEqual(original);
  });

  it('serialises 768-dimensional vector', () => {
    const vec = Array.from({ length: 768 }, (_, i) => i * 0.001);
    const result = toPg(vec);
    expect(result.startsWith('[')).toBe(true);
    expect(result.endsWith(']')).toBe(true);
    expect(result.split(',').length).toBe(768);
  });

  it('throws on non-array input', () => {
    expect(() => toPg('not-an-array' as any)).toThrow();
  });
});

// ─── Vector scalar ───────────────────────────────────────────────────────────

describe('VectorCodecPlugin Vector scalar', () => {
  // Extract the scalar config via a minimal build mock
  let scalar: {
    serialize: (v: unknown) => unknown;
    parseValue: (v: unknown) => unknown;
    parseLiteral: (ast: any) => unknown;
  };

  beforeAll(() => {
    let registeredScalar: any = null;

    const mockBuild = {
      registerScalarType: (_name: string, _scope: any, configFn: () => any) => {
        registeredScalar = configFn();
      },
      setGraphQLTypeForPgCodec: jest.fn(),
      input: { pgRegistry: { pgCodecs: {} } },
    };

    const initCallback = (
      VectorCodecPlugin as unknown as {
        schema: { hooks: { init: { callback: Function } } };
      }
    ).schema.hooks.init.callback;

    initCallback({}, mockBuild);
    scalar = registeredScalar;
  });

  describe('serialize', () => {
    it('passes through number[]', () => {
      expect(scalar.serialize([0.1, 0.2])).toEqual([0.1, 0.2]);
    });

    it('parses bracket string', () => {
      expect(scalar.serialize('[0.1,0.2]')).toEqual([0.1, 0.2]);
    });

    it('throws on invalid type', () => {
      expect(() => scalar.serialize(42)).toThrow();
    });
  });

  describe('parseValue', () => {
    it('accepts number[]', () => {
      expect(scalar.parseValue([0.1, 0.2, 0.3])).toEqual([0.1, 0.2, 0.3]);
    });

    it('throws on non-array', () => {
      expect(() => scalar.parseValue('not-an-array')).toThrow();
      expect(() => scalar.parseValue(42)).toThrow();
    });
  });

  describe('parseLiteral', () => {
    it('parses ListValue of FloatValues', () => {
      const ast = {
        kind: 'ListValue',
        values: [
          { kind: 'FloatValue', value: '0.1' },
          { kind: 'FloatValue', value: '0.2' },
          { kind: 'IntValue', value: '1' },
        ],
      };
      expect(scalar.parseLiteral(ast)).toEqual([0.1, 0.2, 1]);
    });

    it('parses StringValue in bracket format', () => {
      const ast = { kind: 'StringValue', value: '[0.1,0.2,0.3]' };
      expect(scalar.parseLiteral(ast)).toEqual([0.1, 0.2, 0.3]);
    });

    it('returns null for NullValue', () => {
      expect(scalar.parseLiteral({ kind: 'NullValue' })).toBeNull();
    });

    it('throws on non-float ListValue elements', () => {
      const ast = {
        kind: 'ListValue',
        values: [{ kind: 'StringValue', value: 'bad' }],
      };
      expect(() => scalar.parseLiteral(ast)).toThrow();
    });

    it('throws on unsupported AST kind', () => {
      expect(() => scalar.parseLiteral({ kind: 'ObjectValue', fields: [] })).toThrow();
    });
  });
});
