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

  it('the b2b:storage preset includes config_secrets_module', () => {
    const preset = getModulePreset('b2b:storage');
    const names = (preset?.modules ?? []).map((m) => (Array.isArray(m) ? m[0] : m));
    expect(names).toContain('config_secrets_module');
    // and the emitted JSON reflects it too
    const emitted = artifacts['presets.json'].presets.find((p) => p.name === 'b2b:storage');
    const emittedNames = (emitted?.modules ?? []).map((m) => (Array.isArray(m) ? m[0] : m));
    expect(emittedNames).toContain('config_secrets_module');
  });
});
