import { parseProvisionManifest } from '../src/provision-database/manifest';
import {
  DEFAULT_PROVISION_PRESET,
  getModulePreset,
  type ProvisionModule,
} from '../src/provision-database/presets';
import { moduleKey, resolveProvisionModules } from '../src/provision-database/resolve';

function names(modules: ProvisionModule[]): string[] {
  return modules.map((m) => (Array.isArray(m) ? m[0] : m));
}

describe('resolveProvisionModules', () => {
  it('defaults to the base preset unchanged when no overlays are given', () => {
    const base = getModulePreset(DEFAULT_PROVISION_PRESET)!;
    expect(resolveProvisionModules()).toEqual(base.modules);
    expect(resolveProvisionModules([])).toEqual(base.modules);
  });

  it('includes config_secrets_module (the dependency the old list dropped)', () => {
    expect(names(resolveProvisionModules())).toContain('config_secrets_module');
  });

  it('selects a named preset via the last layer that sets one', () => {
    const full = resolveProvisionModules([{ preset: 'b2b' }, { preset: 'full' }]);
    expect(full).toEqual(getModulePreset('full')!.modules);
  });

  it('throws on an unknown preset', () => {
    expect(() => resolveProvisionModules([{ preset: 'nope' }])).toThrow(/Unknown provision preset/);
  });

  it('appends new modules and overrides same-key modules by options', () => {
    const resolved = resolveProvisionModules([
      {
        add: [
          'my_custom_module',
          ['storage_module', { api_name: 'api', prefix: 'app', buckets: [{ key: 'public' }] }],
        ],
      },
    ]);
    expect(names(resolved)).toContain('my_custom_module');
    const storage = resolved.find((m) => Array.isArray(m) && m[0] === 'storage_module');
    expect(storage).toEqual([
      'storage_module',
      { api_name: 'api', prefix: 'app', buckets: [{ key: 'public' }] },
    ]);
    // Override replaces in place — no duplicate storage entry.
    expect(names(resolved).filter((n) => n === 'storage_module')).toHaveLength(1);
  });

  it('removes a module by bare name (all scopes) and by name:scope', () => {
    const base = names(resolveProvisionModules());
    expect(base).toContain('devices_module');

    const dropped = names(resolveProvisionModules([{ remove: ['devices_module'] }]));
    expect(dropped).not.toContain('devices_module');

    // permissions_module exists at both app and org scope in b2b:storage.
    const scoped = resolveProvisionModules([{ remove: ['permissions_module:org'] }]);
    const permKeys = scoped.filter((m) => moduleKey(m).startsWith('permissions_module'));
    expect(permKeys.map(moduleKey)).toEqual(['permissions_module:app']);
  });

  it('applies remove before add within a layer, letting add re-introduce', () => {
    const resolved = resolveProvisionModules([
      { remove: ['storage_module'], add: [['storage_module', { api_name: 'api' }]] },
    ]);
    const storage = resolved.filter((m) => moduleKey(m) === 'storage_module');
    expect(storage).toEqual([['storage_module', { api_name: 'api' }]]);
  });
});

describe('parseProvisionManifest', () => {
  it('accepts a valid overlay', () => {
    expect(
      parseProvisionManifest({ preset: 'full', add: ['x_module'], remove: ['devices_module'] }),
    ).toEqual({ preset: 'full', add: ['x_module'], remove: ['devices_module'] });
  });

  it('accepts scoped tuple modules', () => {
    expect(parseProvisionManifest({ add: [['storage_module', { api_name: 'api' }]] })).toEqual({
      add: [['storage_module', { api_name: 'api' }]],
    });
  });

  it('rejects unknown keys and wrong shapes', () => {
    expect(() => parseProvisionManifest({ nope: true })).toThrow();
    expect(() => parseProvisionManifest({ remove: [1] })).toThrow();
    expect(() => parseProvisionManifest({ add: [[1, {}]] })).toThrow();
  });
});
