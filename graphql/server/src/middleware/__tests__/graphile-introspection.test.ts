import type { GraphileConfig } from 'graphile-config';
import type { Pool } from 'pg';

jest.mock('graphile-settings', () => {
  const { makePgService } = jest.requireActual('postgraphile/adaptors/pg');
  return { makePgService };
});

import { makeIntrospectionWiring } from '../graphile-introspection';

const pool = {} as Pool;

describe('Graphile introspection wiring', () => {
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
    expect(wiring.pgService).toMatchObject({
      name: 'main',
      schemas: ['tenant_a']
    });
    expect(wiring.pgService.pgSettingsForIntrospection).toBeUndefined();
  });

  it('loads scoped introspection for a resolved gather configuration', async () => {
    const scopedPreset: GraphileConfig.Preset = {
      disablePlugins: ['PgIntrospectionPlugin']
    };
    const loadScopedPreset = jest.fn(async () => scopedPreset);

    const wiring = await makeIntrospectionWiring(
      pool,
      ['tenant_a'],
      {
        preset: {
          gather: {
            pgScopedIntrospection: {
              main: {
                catalogTypes: 'dependency-closure',
                capabilityExtensions: ['pg_trgm']
              }
            }
          }
        }
      },
      loadScopedPreset
    );

    expect(loadScopedPreset).toHaveBeenCalledTimes(1);
    expect(wiring.presets).toEqual([scopedPreset]);
    expect(wiring.pgService).toMatchObject({
      name: 'main',
      schemas: ['tenant_a']
    });
    expect(wiring.pgService.pgSettingsForIntrospection).toBeUndefined();
  });

  it('uses nested preset precedence before deciding whether to load scoped code', async () => {
    const scopedPreset: GraphileConfig.Preset = {
      disablePlugins: ['PgIntrospectionPlugin']
    };
    const loadScopedPreset = jest.fn(async () => scopedPreset);
    const nestedPreset: GraphileConfig.Preset = {
      extends: [
        {
          gather: {
            pgScopedIntrospection: { main: true }
          }
        }
      ],
      gather: {
        pgScopedIntrospection: { main: false }
      }
    };

    await makeIntrospectionWiring(
      pool,
      ['tenant_a'],
      {
        extends: [nestedPreset],
        preset: {
          gather: {
            pgScopedIntrospection: { main: false }
          }
        }
      },
      loadScopedPreset
    );

    // A false entry is still configuration. The replacement must be loaded so
    // it can validate unknown service keys instead of silently using stock.
    expect(loadScopedPreset).toHaveBeenCalledTimes(1);
  });

  it('loads the replacement for an unknown service entry even when disabled', async () => {
    const scopedPreset: GraphileConfig.Preset = {
      disablePlugins: ['PgIntrospectionPlugin']
    };
    const loadScopedPreset = jest.fn(async () => scopedPreset);

    await makeIntrospectionWiring(
      pool,
      ['tenant_a'],
      {
        preset: {
          gather: {
            pgScopedIntrospection: { unknown: false }
          }
        }
      },
      loadScopedPreset
    );

    expect(loadScopedPreset).toHaveBeenCalledTimes(1);
  });

  it('loads the replacement so malformed explicit gather values are diagnosed', async () => {
    for (const value of [[], null] as const) {
      const scopedPreset: GraphileConfig.Preset = {
        disablePlugins: ['PgIntrospectionPlugin']
      };
      const loadScopedPreset = jest.fn(async () => scopedPreset);

      await makeIntrospectionWiring(
        pool,
        ['tenant_a'],
        {
          preset: {
            gather: {
              pgScopedIntrospection: value as never
            }
          }
        },
        loadScopedPreset
      );

      expect(loadScopedPreset).toHaveBeenCalledTimes(1);
    }
  });

  it('keeps an explicitly supplied local replacement preset without importing it', async () => {
    const loadScopedPreset = jest.fn(async () => {
      throw new Error('scoped preset should not load');
    });
    const localPreset = {
      plugins: [{ name: 'ConstructivePgIntrospectionPlugin' }],
      disablePlugins: ['PgIntrospectionPlugin'],
      gather: {
        pgScopedIntrospection: { main: true }
      }
    } as GraphileConfig.Preset;

    const wiring = await makeIntrospectionWiring(
      pool,
      ['tenant_a'],
      { extends: [localPreset] },
      loadScopedPreset
    );

    expect(loadScopedPreset).not.toHaveBeenCalled();
    expect(wiring.presets).toEqual([]);
  });

  it('disables stock introspection for a raw local replacement plugin', async () => {
    const loadScopedPreset = jest.fn(async () => {
      throw new Error('scoped preset should not load');
    });
    const localPlugin = {
      // Include the upstream plugin to mirror the core preset that the server
      // adds later; the local replacement must disable it atomically.
      plugins: [
        { name: 'PgIntrospectionPlugin' },
        { name: 'ConstructivePgIntrospectionPlugin' }
      ]
    } as GraphileConfig.Preset;

    const wiring = await makeIntrospectionWiring(
      pool,
      ['tenant_a'],
      { extends: [localPlugin] },
      loadScopedPreset
    );

    expect(loadScopedPreset).not.toHaveBeenCalled();
    expect(wiring.presets).toEqual([
      { disablePlugins: ['PgIntrospectionPlugin'] }
    ]);
  });

  it.each([
    true,
    false,
    { catalogTypes: 'dependency-closure' as const }
  ])(
    'preserves the configured introspection role for scoped setting %p',
    async (setting) => {
      const wiring = await makeIntrospectionWiring(
        pool,
        ['tenant_a'],
        {
          preset: {
            gather: {
              pgScopedIntrospection: { main: setting }
            }
          }
        },
        async () => ({}),
        'tenant_introspector'
      );
      expect(wiring.pgService.pgSettingsForIntrospection).toEqual({
        role: 'tenant_introspector'
      });
    }
  );
});
