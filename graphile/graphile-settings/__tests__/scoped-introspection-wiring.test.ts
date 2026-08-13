import { defaultPreset as graphileBuildPreset } from 'graphile-build';
import { defaultPreset as graphileBuildPgPreset } from 'graphile-build-pg';
import { resolvePreset } from 'graphile-config';
import {
  ConstructivePgIntrospectionPlugin,
  ScopedIntrospectionPreset,
  type ScopedIntrospectionServiceOptions,
} from 'graphile-scoped-introspection';

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
const makePgService = (
  options: TestUpstreamOptions & ScopedIntrospectionServiceOptions
) => makeConfiguredPgService(makeUpstreamPgService, options);

describe('scoped introspection settings wiring', () => {
  beforeEach(() => {
    makeUpstreamPgService.mockClear();
  });

  it('normalizes scoped service configuration without forwarding CNC fields upstream', () => {
    const service = makePgService({
      pubsub: false,
      schemas: ['tenant_a'],
      introspectionMode: 'scoped-required',
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

  it('keeps stock as the default and omits scoped-only capability state', () => {
    const service = makePgService({
      pubsub: false,
      schemas: ['tenant_a'],
    });

    expect(service.introspectionMode).toBe('stock');
    expect(service.introspectionCapabilityExtensions).toBeUndefined();
    expect(service.pgSettingsForIntrospection).toEqual({
      statement_timeout: '120s',
    });
  });

  it('fails deterministically on invalid scoped configuration', () => {
    expect(() =>
      makePgService({
        pubsub: false,
        introspectionScopedCatalogTypes: 'dependency-closure',
      })
    ).toThrow(
      'introspectionScopedCatalogTypes requires scoped-required introspection'
    );
    expect(() =>
      makePgService({
        pubsub: false,
        introspectionCapabilityExtensions: ['pg_trgm'],
      })
    ).toThrow(
      'introspectionCapabilityExtensions requires scoped-required introspection'
    );
    expect(() =>
      makePgService({
        pubsub: false,
        introspectionMode: 'scoped-required',
        introspectionAllowedDependencySchemas: ['pg_catalog'],
      })
    ).toThrow('must not be a system schema');
  });

  it('ConstructivePreset explicitly installs the independent owner preset', () => {
    const scoped = resolvePreset({
      extends: [
        graphileBuildPreset,
        graphileBuildPgPreset,
        ScopedIntrospectionPreset,
      ],
    });
    const constructive = resolvePreset(ConstructivePreset);

    expect(scoped.plugins).toContain(ConstructivePgIntrospectionPlugin);
    expect(constructive.plugins).toContain(ConstructivePgIntrospectionPlugin);
    expect(constructive.disablePlugins).toContain('PgIntrospectionPlugin');
  });
});
