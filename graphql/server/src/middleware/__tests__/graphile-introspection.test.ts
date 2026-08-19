import type { GraphileConfig } from 'graphile-config';
import type { Pool } from 'pg';

import { makeIntrospectionWiring } from '../graphile-introspection';

const pool = {} as Pool;

describe('Graphile introspection mode wiring', () => {
  it('uses untouched upstream service wiring without loading scoped code by default', async () => {
    const loadScopedPreset = jest.fn(async () => {
      throw new Error('scoped preset should not load');
    });

    const wiring = await makeIntrospectionWiring(
      pool,
      ['tenant_a'],
      undefined,
      loadScopedPreset
    );

    expect(loadScopedPreset).not.toHaveBeenCalled();
    expect(wiring.presets).toEqual([]);
    expect(wiring.pgService).not.toHaveProperty('scopedIntrospection');
    expect(wiring.pgService).not.toHaveProperty(
      'introspectionAllowedDependencySchemas'
    );
    expect(wiring.pgService).not.toHaveProperty(
      'introspectionCapabilityExtensions'
    );
    expect(wiring.pgService.pgSettingsForIntrospection).toBeUndefined();
  });

  it('loads and configures scoped introspection only when explicitly enabled', async () => {
    const scopedPreset: GraphileConfig.Preset = {
      disablePlugins: ['PgIntrospectionPlugin'],
    };
    const loadScopedPreset = jest.fn(async () => scopedPreset);

    const wiring = await makeIntrospectionWiring(
      pool,
      ['tenant_a'],
      {
        scopedIntrospection: true,
        introspectionJit: true,
        introspectionDependencySchemas: ['shared'],
        introspectionCapabilityExtensions: ['pg_trgm'],
      },
      loadScopedPreset
    );

    expect(loadScopedPreset).toHaveBeenCalledTimes(1);
    expect(wiring.presets).toEqual([scopedPreset]);
    expect(wiring.pgService).toMatchObject({
      scopedIntrospection: true,
      introspectionScopedCatalogTypes: 'dependency-closure',
      introspectionAllowedDependencySchemas: ['shared'],
      introspectionCapabilityExtensions: ['pg_trgm'],
      pgSettingsForIntrospection: {
        jit: 'on',
      },
    });
  });

  it.each([
    [
      'dependency schemas',
      { introspectionDependencySchemas: ['shared'] },
    ],
    [
      'capability extensions',
      { introspectionCapabilityExtensions: ['pg_trgm'] },
    ],
    ['enabled introspection JIT', { introspectionJit: true }],
  ])('fails closed on %s while scoped introspection is disabled', async (_label, option) => {
    const loadScopedPreset = jest.fn(async () => ({}));

    await expect(
      makeIntrospectionWiring(
        pool,
        ['tenant_a'],
        { scopedIntrospection: false, ...option },
        loadScopedPreset
      )
    ).rejects.toThrow(/require scopedIntrospection: true/);
    expect(loadScopedPreset).not.toHaveBeenCalled();
  });
});
