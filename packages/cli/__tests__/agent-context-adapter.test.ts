import { resolveConstructiveEnvironment } from '../src/agent/context-adapter';

describe('resolveConstructiveEnvironment', () => {
  const lookup = {
    getCurrentContext: jest.fn(() => ({
      name: 'current',
      endpoint: 'https://context.example/graphql',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })),
    loadContext: jest.fn((contextName: string) => {
      if (contextName === 'named') {
        return {
          name: 'named',
          endpoint: 'https://named.example/graphql',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        };
      }
      return null;
    }),
    hasValidCredentials: jest.fn((contextName: string) => contextName !== 'missing'),
    getContextCredentials: jest.fn(() => ({
      token: 'ctx-token',
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers explicit flags over env and context defaults', () => {
    const result = resolveConstructiveEnvironment({
      endpoint: 'https://flag.example/graphql',
      token: 'flag-token',
      operationsFile: './ops.json',
      baseEnv: {
        CONSTRUCTIVE_GRAPHQL_ENDPOINT: 'https://env.example/graphql',
        CONSTRUCTIVE_ACCESS_TOKEN: 'env-token',
        CONSTRUCTIVE_OPERATIONS_FILE: './env-ops.json',
      },
      lookup,
    });

    expect(result.endpoint).toBe('https://flag.example/graphql');
    expect(result.token).toBe('flag-token');
    expect(result.operationsFile).toBe('./ops.json');
    expect(result.endpointSource).toBe('flag');
    expect(result.tokenSource).toBe('flag');
    expect(result.operationsFileSource).toBe('flag');
  });

  it('prefers env values over context defaults', () => {
    const result = resolveConstructiveEnvironment({
      baseEnv: {
        CONSTRUCTIVE_GRAPHQL_ENDPOINT: 'https://env.example/graphql',
        CONSTRUCTIVE_ACCESS_TOKEN: 'env-token',
      },
      lookup,
    });

    expect(result.endpoint).toBe('https://env.example/graphql');
    expect(result.token).toBe('env-token');
    expect(result.endpointSource).toBe('env');
    expect(result.tokenSource).toBe('env');
  });

  it('falls back to context when flags/env are missing', () => {
    const result = resolveConstructiveEnvironment({
      contextName: 'named',
      lookup,
    });

    expect(result.contextName).toBe('named');
    expect(result.endpoint).toBe('https://named.example/graphql');
    expect(result.token).toBe('ctx-token');
    expect(result.endpointSource).toBe('context');
    expect(result.tokenSource).toBe('context');
  });

  it('can disable context defaults', () => {
    const result = resolveConstructiveEnvironment({
      noContextDefaults: true,
      lookup,
    });

    expect(result.endpoint).toBeUndefined();
    expect(result.token).toBeUndefined();
    expect(result.endpointSource).toBe('unset');
    expect(result.tokenSource).toBe('unset');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(lookup.getCurrentContext).not.toHaveBeenCalled();
  });
});
