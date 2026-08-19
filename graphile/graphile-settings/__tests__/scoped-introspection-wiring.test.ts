import { PgIntrospectionPlugin } from 'graphile-build-pg';
import { resolvePreset } from 'graphile-config';

import { ConstructivePreset } from '../src/presets/constructive-preset';
import {
  makeConfiguredPgService,
  type ScopedIntrospectionOptions,
} from '../src/scoped-introspection-service';

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
  options: TestUpstreamOptions & ScopedIntrospectionOptions
) => makeConfiguredPgService(makeUpstreamPgService, options);

describe('scoped introspection settings wiring', () => {
  beforeEach(() => {
    makeUpstreamPgService.mockClear();
  });

  it('forwards scoped service configuration without interpreting it', () => {
    const service = makeScopedPgService({
      pubsub: false,
      schemas: ['tenant_a'],
      introspectionScopedCatalogTypes: 'dependency-closure',
      introspectionAllowedDependencySchemas: ['shared', 'shared'],
      introspectionCapabilityExtensions: ['pg_trgm', 'pg_trgm'],
      pgSettingsForIntrospection: {
        statement_timeout: '30s',
        jit: 'on',
        work_mem: '1MB',
      },
    });

    expect(service).toMatchObject({
      schemas: ['tenant_a'],
      scopedIntrospection: true,
      introspectionScopedCatalogTypes: 'dependency-closure',
      introspectionAllowedDependencySchemas: ['shared', 'shared'],
      introspectionCapabilityExtensions: ['pg_trgm', 'pg_trgm'],
      pgSettingsForIntrospection: {
        statement_timeout: '30s',
        jit: 'off',
        work_mem: '1MB',
      },
    });
    expect(makeUpstreamPgService).toHaveBeenCalledWith({
      pubsub: false,
      schemas: ['tenant_a'],
      pgSettingsForIntrospection: {
        statement_timeout: '30s',
        jit: 'off',
        work_mem: '1MB',
      },
    });
  });

  it('enables introspection JIT only when explicitly configured', () => {
    const service = makeScopedPgService({
      pubsub: false,
      introspectionJit: true,
    });

    expect(service.pgSettingsForIntrospection).toEqual({ jit: 'on' });
    expect(makeUpstreamPgService).toHaveBeenCalledWith({
      pubsub: false,
      pgSettingsForIntrospection: { jit: 'on' },
    });
  });

  it('keeps ConstructivePreset on the upstream introspection plugin', () => {
    const constructive = resolvePreset(ConstructivePreset);

    expect(constructive.plugins).toContain(PgIntrospectionPlugin);
    expect(constructive.plugins.map((plugin) => plugin.name)).not.toContain(
      'PgScopedIntrospectionPlugin'
    );
    expect(constructive.disablePlugins ?? []).not.toContain(
      'PgIntrospectionPlugin'
    );
  });
});
