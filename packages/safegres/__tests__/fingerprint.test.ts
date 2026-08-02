import { configFingerprint } from '../src/config/fingerprint';
import { loadConfig } from '../src/config/loader';
import type { SafegresConfig } from '../src/config/types';

const V = '1.0.0';

describe('configFingerprint', () => {
  it('is stable across key order and equivalent spellings of the same posture', () => {
    const a: SafegresConfig = { rules: { A3: 'off', A5: 'high' }, scoring: { densityK: 0.2 } };
    const b: SafegresConfig = { scoring: { densityK: 0.2 }, rules: { A5: 'high', A3: 'off' } };
    expect(configFingerprint(a, V)).toBe(configFingerprint(b, V));
  });

  it('moves when any knob that can move the score moves', () => {
    const base: SafegresConfig = { rules: { A3: 'high' } };
    const variants: SafegresConfig[] = [
      { rules: { A3: 'off' } },
      { rules: { A3: 'high' }, scoring: { densityK: 0.3 } },
      { rules: { A3: 'high' }, perf: { ignore: ['app.*'] } },
      { rules: { A3: 'high' }, public: { read: ['app.posts'] } },
      { rules: { A3: 'high' }, overrides: [{ tables: ['app.*'], rules: { A3: 'info' } }] },
      { rules: { A3: 'high' }, exposure: { schemas: ['app_public'] } }
    ];
    const seen = new Set([configFingerprint(base, V)]);
    for (const v of variants) seen.add(configFingerprint(v, V));
    expect(seen.size).toBe(variants.length + 1);
  });

  it('moves when the analyzer version moves — the same rule can mean something new', () => {
    const config: SafegresConfig = { rules: { A3: 'high' } };
    expect(configFingerprint(config, '1.0.0')).not.toBe(configFingerprint(config, '1.1.0'));
  });

  it('ignores everything that cannot move the score', () => {
    const bare: SafegresConfig = { rules: { A3: 'high' } };
    const noisy: SafegresConfig = {
      rules: { A3: 'high' },
      report: { github: { badges: false, annotations: 'none' } },
      failOn: { severity: 'critical' }
    };
    expect(configFingerprint(noisy, V)).toBe(configFingerprint(bare, V));
  });

  it('identifies an adapter by name, not by its (unhashable) implementation', () => {
    const withObject: SafegresConfig = {
      exposure: { adapters: [{ name: 'mine', detect: async () => true, resolve: async () => [] }] }
    };
    const withName: SafegresConfig = { exposure: { adapters: ['mine'] } };
    expect(configFingerprint(withObject, V)).toBe(configFingerprint(withName, V));
  });
});

describe('sealed config loading', () => {
  it('grades under the named preset alone, ignoring any config file in the tree', () => {
    // __dirname sits under the safegres package, which has its own config;
    // a sealed load must not see it.
    const sealed = loadConfig({ cwd: __dirname, sealed: true, preset: 'strict' });
    const open = loadConfig({ cwd: __dirname, preset: 'strict' });
    expect(sealed.filepath).toBeUndefined();
    expect(configFingerprint(sealed.config, V)).toBe(
      configFingerprint(loadConfig({ cwd: '/', sealed: true, preset: 'strict' }).config, V)
    );
    expect(open).toBeDefined();
  });

  it('defaults to recommended and rejects a preset that does not exist', () => {
    expect(loadConfig({ sealed: true }).config).toEqual(
      loadConfig({ sealed: true, preset: 'recommended' }).config
    );
    expect(() => loadConfig({ sealed: true, preset: 'nope' })).toThrow(/Unknown preset/);
  });

  it('gives every stack preset a distinct fingerprint', () => {
    const presets = ['recommended', 'strict', 'minimal', 'constructive', 'postgrest', 'supabase'];
    const prints = presets.map((p) => configFingerprint(loadConfig({ sealed: true, preset: p }).config, V));
    expect(new Set(prints).size).toBe(presets.length);
  });
});
