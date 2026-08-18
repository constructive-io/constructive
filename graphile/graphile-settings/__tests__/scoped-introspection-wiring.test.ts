import type { ScopedIntrospectionServiceOptions } from '@constructive-io/graphql-types';
import { PgIntrospectionPlugin } from 'graphile-build-pg';
import { resolvePreset } from 'graphile-config';

import { ConstructivePreset } from '../src/presets/constructive-preset';
import { makeConfiguredPgService } from '../src/scoped-introspection-service';

type TestUpstreamOptions = {
  pubsub?: boolean;
  schemas?: string[];
  pgSettingsForIntrospection?:
    Record<string, string | undefined> | null | undefined;
};

const makeUpstreamPgService = jest.fn((options: TestUpstreamOptions) => ({
  ...options,
  upstream: true,
}));
const makeScopedPgService = (
  options: TestUpstreamOptions &
    Omit<ScopedIntrospectionServiceOptions, 'introspectionMode'>
) => makeConfiguredPgService(makeUpstreamPgService, options);

describe('scoped introspection settings wiring', () => {
  beforeEach(() => {
    makeUpstreamPgService.mockClear();
  });

  it('normalizes scoped service configuration without forwarding CNC fields upstream', () => {
    const service = makeScopedPgService({
      pubsub: false,
      schemas: ['tenant_a'],
      introspectionScopedCatalogTypes: 'dependency-closure',
      introspectionAllowedDependencySchemas: ['shared', 'shared'],
      introspectionCapabilityExtensions: ['pg_trgm', 'pg_trgm'],
      pgSettingsForIntrospection: { statement_timeout: '30s' },
    });

    expect(service).toMatchObject({
      schemas: ['tenant_a'],
      introspectionMode: 'scoped-required',
      introspectionScopedCatalogTypes: 'dependency-closure',
      introspectionAllowedDependencySchemas: ['shared'],
      introspectionCapabilityExtensions: ['pg_trgm'],
      pgSettingsForIntrospection: {
        statement_timeout: '30s',
        jit: 'off',
        work_mem: '512kB',
      },
    });
    expect(makeUpstreamPgService).toHaveBeenCalledWith({
      pubsub: false,
      schemas: ['tenant_a'],
      pgSettingsForIntrospection: {
        statement_timeout: '30s',
        jit: 'off',
        work_mem: '512kB',
      },
    });
  });

  it('fails deterministically on invalid scoped configuration', () => {
    expect(() =>
      makeScopedPgService({
        pubsub: false,
        introspectionScopedCatalogTypes: 'unsupported' as never,
      })
    ).toThrow("Unsupported scoped catalog type policy 'unsupported'");
    expect(() =>
      makeScopedPgService({
        pubsub: false,
        introspectionCapabilityExtensions: [' pg_trgm'],
      })
    ).toThrow(
      'introspectionCapabilityExtensions must contain exact non-empty extension names'
    );
    expect(() =>
      makeScopedPgService({
        pubsub: false,
        introspectionAllowedDependencySchemas: ['pg_catalog'],
      })
    ).toThrow('must not be a system schema');
  });

  it('keeps ConstructivePreset on the upstream introspection plugin', () => {
    const constructive = resolvePreset(ConstructivePreset);

    expect(constructive.plugins).toContain(PgIntrospectionPlugin);
    expect(constructive.plugins.map((plugin) => plugin.name)).not.toContain(
      'ConstructivePgIntrospectionPlugin'
    );
    expect(constructive.disablePlugins ?? []).not.toContain(
      'PgIntrospectionPlugin'
    );
  });
});
