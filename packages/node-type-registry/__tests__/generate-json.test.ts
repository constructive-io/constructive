import { buildJsonArtifacts } from '../src/codegen/generate-json';
import { allNodeTypes } from '../src/index';
import { allModulePresets, getModulePreset } from '../src/module-presets';

describe('json artifacts', () => {
  const artifacts = buildJsonArtifacts('9.9.9');

  it('carries the registry version for range-checking', () => {
    expect(artifacts['presets.json'].registryVersion).toBe('9.9.9');
    expect(artifacts['node-types.json'].registryVersion).toBe('9.9.9');
  });

  it('presets.json is the in-code presets, not a copy', () => {
    expect(artifacts['presets.json'].presets).toEqual(allModulePresets);
  });

  it('node-types.json is the in-code node types', () => {
    expect(artifacts['node-types.json'].nodeTypes).toEqual(allNodeTypes);
  });

  it('is pure JSON data (round-trips with no loss)', () => {
    for (const payload of Object.values(artifacts)) {
      expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
    }
  });

  it('the b2b:storage preset scopes the secret/identity/storage modules the backend requires', () => {
    const preset = getModulePreset('b2b:storage');
    const entries = preset?.modules ?? [];
    // config_secrets_module was split into internal_secrets_module (app-level, no
    // namespace dep) on the backend — the preset must use the scoped replacement.
    const names = entries.map((m) => (Array.isArray(m) ? m[0] : m));
    expect(names).toContain('internal_secrets_module');
    expect(names).not.toContain('config_secrets_module');
    // scope-required modules must carry an explicit scope (bare form is rejected
    // by metaschema_generators.provision_database_modules).
    for (const name of ['internal_secrets_module', 'identity_providers_module', 'storage_module']) {
      const entry = entries.find((m) => Array.isArray(m) && m[0] === name);
      expect(Array.isArray(entry) && entry[1]?.scope).toBe('app');
    }
    // and the emitted JSON reflects it too
    const emitted = artifacts['presets.json'].presets.find((p) => p.name === 'b2b:storage');
    const emittedNames = (emitted?.modules ?? []).map((m) => (Array.isArray(m) ? m[0] : m));
    expect(emittedNames).toContain('internal_secrets_module');
    expect(emittedNames).not.toContain('config_secrets_module');
  });
});
