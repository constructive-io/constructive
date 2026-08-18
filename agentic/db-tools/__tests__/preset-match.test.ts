import { matchPresetSlug, selectProvisionRequest } from '../src/provision-database/preset-match';
import { DEFAULT_PROVISION_PRESET, type ProvisionModule } from '../src/provision-database/presets';
import { resolveProvisionModules } from '../src/provision-database/resolve';

describe('matchPresetSlug', () => {
  it('matches the default preset resolved with no overlays', () => {
    expect(matchPresetSlug(resolveProvisionModules())).toBe(DEFAULT_PROVISION_PRESET);
  });

  it('matches order-insensitively', () => {
    const shuffled = [...resolveProvisionModules()].reverse();
    expect(matchPresetSlug(shuffled)).toBe(DEFAULT_PROVISION_PRESET);
  });

  it('treats a bare name and a tuple with empty options as the same entry', () => {
    const modules = resolveProvisionModules().map(
      (m): ProvisionModule => (m === 'users_module' ? ['users_module', {}] : m),
    );
    expect(matchPresetSlug(modules)).toBe(DEFAULT_PROVISION_PRESET);
  });

  it('compares options by value, not key insertion order', () => {
    const modules = resolveProvisionModules().map((m): ProvisionModule => {
      if (!Array.isArray(m)) return m;
      const reversed: Record<string, unknown> = {};
      for (const key of Object.keys(m[1]).reverse()) reversed[key] = m[1][key];
      return [m[0], reversed];
    });
    expect(matchPresetSlug(modules)).toBe(DEFAULT_PROVISION_PRESET);
  });

  it('does not match when an overlay changes module options', () => {
    const overlaid = resolveProvisionModules([
      {
        add: [
          [
            'storage_module',
            { scope: 'app', api_name: 'api', prefix: 'app', buckets: [{ key: 'public' }] },
          ],
        ],
      },
    ]);
    expect(matchPresetSlug(overlaid)).toBeUndefined();
  });

  it('does not match when a module is removed or added', () => {
    expect(
      matchPresetSlug(resolveProvisionModules([{ remove: ['devices_module'] }])),
    ).toBeUndefined();
    expect(matchPresetSlug(resolveProvisionModules([{ add: ['extra_module'] }]))).toBeUndefined();
  });

  it('never matches a set with duplicate normalized entries', () => {
    expect(matchPresetSlug([...resolveProvisionModules(), 'users_module'])).toBeUndefined();
  });
});

describe('selectProvisionRequest', () => {
  it('sends presetSlug — and nothing else — for a preset-equal set', () => {
    expect(selectProvisionRequest(resolveProvisionModules())).toEqual({
      presetSlug: DEFAULT_PROVISION_PRESET,
    });
  });

  it('sends the explicit modules — and no presetSlug — for any delta', () => {
    const modules = resolveProvisionModules([{ remove: ['devices_module'] }]);
    expect(selectProvisionRequest(modules)).toEqual({ modules });
  });
});
