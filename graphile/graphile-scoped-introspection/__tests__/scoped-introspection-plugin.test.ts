import { defaultPreset as graphileBuildPreset } from 'graphile-build';
import {
  defaultPreset as graphileBuildPgPreset,
  PgIntrospectionPlugin,
} from 'graphile-build-pg';
import { resolvePreset } from 'graphile-config';

import {
  PgScopedIntrospectionPlugin,
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
          plugin.name === 'PgScopedIntrospectionPlugin'
      )
    ).toEqual([PgScopedIntrospectionPlugin]);
    expect(scoped.disablePlugins).toContain('PgIntrospectionPlugin');
    expect(PgScopedIntrospectionPlugin.provides).toContain(
      'PgIntrospectionPlugin'
    );
    expect(PgScopedIntrospectionPlugin.before).toContain('PgRegistryPlugin');
  });

  it('creates new plugin, gather, and helper objects without mutating upstream', () => {
    expect(PgScopedIntrospectionPlugin).not.toBe(PgIntrospectionPlugin);
    expect(PgScopedIntrospectionPlugin.gather).not.toBe(
      PgIntrospectionPlugin.gather
    );
    expect(PgScopedIntrospectionPlugin.gather!.helpers).not.toBe(
      PgIntrospectionPlugin.gather!.helpers
    );
    expect(PgIntrospectionPlugin.name).toBe('PgIntrospectionPlugin');
    expect(PgIntrospectionPlugin.provides).toBeUndefined();
  });

  it('preserves every upstream lifecycle seam in the copied implementation', () => {
    const upstream = PgIntrospectionPlugin.gather!;
    const replacement = PgScopedIntrospectionPlugin.gather!;

    expect(replacement.namespace).toBe(upstream.namespace);
    expect(typeof replacement.initialCache).toBe(typeof upstream.initialCache);
    expect(typeof replacement.initialState).toBe(typeof upstream.initialState);
    expect(typeof replacement.watch).toBe(typeof upstream.watch);
    expect(Object.keys(replacement.helpers ?? {}).sort()).toEqual(
      Object.keys(upstream.helpers ?? {}).sort()
    );
    expect(Object.keys(replacement.hooks ?? {}).sort()).toEqual(
      Object.keys(upstream.hooks ?? {}).sort()
    );
  });

  it('looks up scoped ranges directly from the parsed range collection', async () => {
    const helpers = PgScopedIntrospectionPlugin.gather!.helpers as Record<
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
