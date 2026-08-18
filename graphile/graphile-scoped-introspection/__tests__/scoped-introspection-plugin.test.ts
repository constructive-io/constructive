import { defaultPreset as graphileBuildPreset } from 'graphile-build';
import {
  defaultPreset as graphileBuildPgPreset,
  PgIntrospectionPlugin,
} from 'graphile-build-pg';
import { resolvePreset } from 'graphile-config';

import {
  ConstructivePgIntrospectionPlugin,
  ScopedIntrospectionPreset,
  scopedIntrospectionUpstreamContract,
} from '../src';

describe('CNC introspection replacement contract', () => {
  it('atomically replaces the upstream namespace owner exactly once', () => {
    const stock = resolvePreset({
      extends: [graphileBuildPreset, graphileBuildPgPreset],
    });
    const scoped = resolvePreset({
      extends: [
        graphileBuildPreset,
        graphileBuildPgPreset,
        ScopedIntrospectionPreset,
      ],
    });

    expect(
      stock.plugins.filter((plugin) => plugin.name === 'PgIntrospectionPlugin')
    ).toEqual([PgIntrospectionPlugin]);
    expect(
      scoped.plugins.filter(
        (plugin) =>
          plugin.name === 'PgIntrospectionPlugin' ||
          plugin.name === 'ConstructivePgIntrospectionPlugin'
      )
    ).toEqual([ConstructivePgIntrospectionPlugin]);
    expect(scoped.disablePlugins).toContain('PgIntrospectionPlugin');
    expect(ConstructivePgIntrospectionPlugin.provides).toContain(
      'PgIntrospectionPlugin'
    );
    expect(ConstructivePgIntrospectionPlugin.before).toContain(
      'PgRegistryPlugin'
    );
  });

  it('creates new plugin, gather, and helper objects without mutating upstream', () => {
    expect(ConstructivePgIntrospectionPlugin).not.toBe(PgIntrospectionPlugin);
    expect(ConstructivePgIntrospectionPlugin.gather).not.toBe(
      PgIntrospectionPlugin.gather
    );
    expect(ConstructivePgIntrospectionPlugin.gather!.helpers).not.toBe(
      PgIntrospectionPlugin.gather!.helpers
    );
    expect(PgIntrospectionPlugin.name).toBe('PgIntrospectionPlugin');
    expect(PgIntrospectionPlugin.provides).toBeUndefined();
  });

  it('reuses every upstream lifecycle seam and all unchanged helpers', () => {
    const upstream = PgIntrospectionPlugin.gather!;
    const replacement = ConstructivePgIntrospectionPlugin.gather!;
    const replacementHelpers = replacement.helpers as Record<string, unknown>;

    expect(replacement.initialCache).toBe(upstream.initialCache);
    expect(replacement.initialState).toBe(upstream.initialState);
    expect(replacement.watch).toBe(upstream.watch);
    expect(replacement.hooks).toBe(upstream.hooks);
    for (const [name, helper] of Object.entries(upstream.helpers!)) {
      if (name === 'getIntrospection' || name === 'getRangeByType') continue;
      expect(replacementHelpers[name]).toBe(helper);
    }
  });

  it('looks up scoped ranges directly from the parsed range collection', async () => {
    const helpers = ConstructivePgIntrospectionPlugin.gather!.helpers as Record<
      string,
      unknown
    >;
    const getRangeByType = helpers.getRangeByType as (
      info: unknown,
      serviceName: string,
      typeId: string
    ) => Promise<unknown>;
    const range = { rngtypid: '100', rngmultitypid: '101' };
    const info = {
      helpers: {
        pgIntrospection: {
          getIntrospection: () => [
            {
              pgService: { name: 'main' },
              introspection: { ranges: [range] },
            },
          ],
        },
      },
    };

    await expect(getRangeByType(info, 'main', '101')).resolves.toBe(range);
  });

  it('detects upstream contract drift at the pinned version', () => {
    expect(scopedIntrospectionUpstreamContract).toEqual({
      package: 'graphile-build-pg',
      version: '5.1.3',
      pluginName: 'PgIntrospectionPlugin',
      namespace: 'pgIntrospection',
      hasInitialCache: true,
      hasInitialState: true,
      hasWatch: true,
      helperNames: [
        'getAttribute',
        'getAttributesForClass',
        'getClass',
        'getClassByName',
        'getClasses',
        'getConstraint',
        'getConstraintsForClass',
        'getEnum',
        'getEnumsForType',
        'getExecutorForService',
        'getExtension',
        'getExtensionByName',
        'getForeignConstraintsForClass',
        'getIndex',
        'getInheritanceChildrenForClass',
        'getInheritedForClass',
        'getIntrospection',
        'getLanguage',
        'getNamespace',
        'getNamespaceByName',
        'getProc',
        'getRangeByType',
        'getRoles',
        'getService',
        'getType',
        'getTypeByArray',
        'getTypeByName',
      ],
      hookNames: [
        'pgRegistry_PgRegistryBuilder_init',
        'pgRegistry_PgRegistryBuilder_pgExecutors',
      ],
    });
  });
});
