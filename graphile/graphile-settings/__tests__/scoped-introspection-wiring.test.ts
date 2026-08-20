import { PgIntrospectionPlugin } from 'graphile-build-pg';
import { resolvePreset } from 'graphile-config';

import { resolveIntrospectionSettings } from '../src/introspection-settings';
import { ConstructivePreset } from '../src/presets/constructive-preset';

describe('scoped introspection settings wiring', () => {
  it('disables introspection JIT while preserving other session settings', () => {
    expect(
      resolveIntrospectionSettings(false, {
        statement_timeout: '30s',
        jit: 'on',
        work_mem: '1MB',
      })
    ).toEqual({
      statement_timeout: '30s',
      jit: 'off',
      work_mem: '1MB',
    });
  });

  it('enables introspection JIT only when explicitly requested', () => {
    expect(resolveIntrospectionSettings(true, undefined)).toEqual({
      jit: 'on',
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
