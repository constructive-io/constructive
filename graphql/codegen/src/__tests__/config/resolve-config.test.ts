import type {
  GraphQLSDKConfigTarget,
  GraphQLSDKMultiConfig,
} from '../../types/config';
import {
  mergeConfig,
  resolveConfig,
  resolveConfigTargets,
  isMultiConfig,
  DEFAULT_CONFIG,
} from '../../types/config';

describe('config resolution', () => {
  it('resolves single-target defaults', () => {
    const config: GraphQLSDKConfigTarget = {
      endpoint: 'https://api.example.com/graphql',
    };

    const resolved = resolveConfig(config);

    expect(resolved.endpoint).toBe('https://api.example.com/graphql');
    expect(resolved.schemaFile).toBeUndefined();
    expect(resolved.output).toBe(DEFAULT_CONFIG.output);
    expect(resolved.tables.include).toEqual(DEFAULT_CONFIG.tables.include);
    expect(resolved.queries.exclude).toEqual(DEFAULT_CONFIG.queries.exclude);
    expect(resolved.queries.systemExclude).toEqual(DEFAULT_CONFIG.queries.systemExclude);
  });

  it('merges nested config values with overrides', () => {
    const base: GraphQLSDKConfigTarget = {
      headers: { Authorization: 'Bearer base' },
      tables: { include: ['User'] },
      queryKeys: {
        relationships: {
          database: { parent: 'organization', foreignKey: 'organizationId' },
        },
      },
    };

    const overrides: GraphQLSDKConfigTarget = {
      output: './generated/custom',
      headers: { 'X-Custom': '1' },
      tables: { exclude: ['_internal'] },
      queryKeys: {
        relationships: {
          table: { parent: 'database', foreignKey: 'databaseId' },
        },
      },
    };

    const merged = mergeConfig(base, overrides);

    expect(merged.output).toBe('./generated/custom');
    expect(merged.headers).toEqual({
      Authorization: 'Bearer base',
      'X-Custom': '1',
    });
    expect(merged.tables).toEqual({
      include: ['User'],
      exclude: ['_internal'],
    });
    expect(merged.queryKeys?.relationships).toEqual({
      database: { parent: 'organization', foreignKey: 'organizationId' },
      table: { parent: 'database', foreignKey: 'databaseId' },
    });
  });

  it('resolves multi-target configs with defaults', () => {
    const config: GraphQLSDKMultiConfig = {
      defaults: {
        headers: { Authorization: 'Bearer token' },
        queries: { exclude: ['_meta'] },
      },
      targets: {
        public: {
          endpoint: 'https://api.example.com/graphql',
          output: './generated/public',
        },
        admin: {
          schemaFile: './admin.schema.graphql',
          output: './generated/admin',
          headers: { 'X-Admin': '1' },
        },
      },
    };

    const resolvedTargets = resolveConfigTargets(config);
    const publicTarget = resolvedTargets.find(
      (target) => target.name === 'public'
    );
    const adminTarget = resolvedTargets.find(
      (target) => target.name === 'admin'
    );

    expect(publicTarget?.config.output).toBe('./generated/public');
    expect(publicTarget?.config.headers).toEqual({
      Authorization: 'Bearer token',
    });
    expect(publicTarget?.config.queries.exclude).toEqual(['_meta']);

    expect(adminTarget?.config.output).toBe('./generated/admin');
    expect(adminTarget?.config.headers).toEqual({
      Authorization: 'Bearer token',
      'X-Admin': '1',
    });
    expect(adminTarget?.config.schemaFile).toBe('./admin.schema.graphql');
  });

  it('detects multi-target configs', () => {
    const multiConfig: GraphQLSDKMultiConfig = { targets: {} };
    const singleConfig: GraphQLSDKConfigTarget = { endpoint: 'x' };

    expect(isMultiConfig(multiConfig)).toBe(true);
    expect(isMultiConfig(singleConfig)).toBe(false);
  });

  it('throws when resolving multi-target config with resolveConfig', () => {
    const multiConfig: GraphQLSDKMultiConfig = { targets: {} };

    expect(() => resolveConfig(multiConfig)).toThrow(
      'Multi-target config cannot be resolved with resolveConfig(). Use resolveConfigTargets().'
    );
  });
});
