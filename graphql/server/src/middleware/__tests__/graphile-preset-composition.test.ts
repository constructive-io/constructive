import type { GraphileConfig } from 'graphile-config';
import { resolvePreset } from 'graphile-config';

import {
  assertGraphileCallerPresetsSafe,
  composeGraphilePreset,
  type ComposeGraphilePresetInput,
  type GraphilePresetProtectionPolicy,
} from '../graphile-preset-composition';

const callerPlugin: GraphileConfig.Plugin = {
  name: 'CallerPlugin',
  version: '1.0.0',
};

const protectedPlugin: GraphileConfig.Plugin = {
  name: 'ProtectedPlugin',
  version: '1.0.0',
};

const exactService = {
  name: 'main',
  adaptor: 'constructive-test-adaptor',
} as unknown as NonNullable<GraphileConfig.Preset['pgServices']>[number];

const protectedContext = jest.fn(() => ({
  pgSettings: { role: 'tenant_runtime' },
}));
const protectedMaskError = jest.fn((error) => error);

const protection: GraphilePresetProtectionPolicy = {
  protectedPaths: ['pgServices', 'grafast.context', 'grafserv.maskError'],
  protectedPluginNames: ['ProtectedPlugin'],
};

const compose = (
  overrides: Partial<ComposeGraphilePresetInput> = {}
): GraphileConfig.Preset =>
  composeGraphilePreset({
    basePresets: [],
    callerPresetsTrusted: true,
    protection,
    protectedPreset: {
      plugins: [protectedPlugin],
      pgServices: [exactService],
      grafserv: { maskError: protectedMaskError },
      grafast: { context: protectedContext },
    },
    ...overrides,
  });

const captureError = (callback: () => unknown): unknown => {
  try {
    callback();
  } catch (error) {
    return error;
  }
  throw new Error('Expected callback to throw');
};

describe('Graphile caller preset composition', () => {
  it.each([
    { callerExtends: [{ plugins: [callerPlugin] }] },
    { callerPreset: { schema: { defaultBehavior: '-delete' } } },
  ])(
    'rejects non-empty caller code until it is explicitly trusted',
    (caller) => {
      const getter = jest.fn(() => ({ context: protectedContext }));
      const callerPreset = caller.callerPreset ?? {};
      Object.defineProperty(callerPreset, 'unrelatedAccessor', {
        enumerable: true,
        get: getter,
      });

      expect(() =>
        compose({
          ...caller,
          callerPreset,
          callerPresetsTrusted: false,
        })
      ).toThrow(
        expect.objectContaining({ code: 'GRAPHILE_CALLER_PRESET_NOT_TRUSTED' })
      );
      expect(getter).not.toHaveBeenCalled();
    }
  );

  it('allows empty defaults without widening the trust boundary', () => {
    expect(() =>
      compose({
        callerExtends: [],
        callerPreset: {},
        callerPresetsTrusted: false,
      })
    ).not.toThrow();
  });

  it('applies layers in deterministic base, caller, protected order', () => {
    const basePreset: GraphileConfig.Preset = { schema: {} };
    const callerExtension: GraphileConfig.Preset = { grafserv: {} };
    const callerPreset: GraphileConfig.Preset = { grafast: {} };
    const protectedExtension: GraphileConfig.Preset = { schema: {} };
    const protectedRootExtension: GraphileConfig.Preset = { grafserv: {} };

    const result = compose({
      basePresets: [basePreset],
      callerExtends: [callerExtension],
      callerPreset,
      protectedPresets: [protectedExtension],
      protectedPreset: {
        extends: [protectedRootExtension],
        plugins: [protectedPlugin],
      },
    });

    expect(result).toEqual({
      extends: [
        basePreset,
        callerExtension,
        callerPreset,
        protectedExtension,
        protectedRootExtension,
      ],
      plugins: [protectedPlugin],
    });
  });

  it('allows caller plugins and unprotected scope settings', () => {
    const resolved = resolvePreset(
      compose({
        callerPreset: {
          plugins: [callerPlugin],
          schema: { defaultBehavior: '-delete' },
          grafserv: { maxRequestLength: 123_456 },
        },
      })
    );

    expect(resolved.plugins).toEqual(
      expect.arrayContaining([callerPlugin, protectedPlugin])
    );
    expect(resolved.schema).toMatchObject({ defaultBehavior: '-delete' });
    expect(resolved.grafserv).toMatchObject({
      maxRequestLength: 123_456,
      maskError: protectedMaskError,
    });
    expect(resolved.grafast).toMatchObject({ context: protectedContext });
    expect(resolved.pgServices).toEqual([exactService]);
  });

  it.each([
    [{ pgServices: [{ name: 'other' }] }, 'pgServices'],
    [{ grafast: { context: () => ({}) } }, 'grafast.context'],
    [
      { grafserv: { maskError: (error: unknown) => error } },
      'grafserv.maskError',
    ],
  ])(
    'rejects caller ownership of protected paths',
    (callerPreset, protectedSetting) => {
      const error = captureError(() =>
        compose({
          callerPreset: callerPreset as unknown as GraphileConfig.Preset,
        })
      );

      expect(error).toMatchObject({
        code: 'GRAPHILE_PROTECTED_PRESET_OVERRIDE',
        context: {
          presetPath: 'graphile.preset',
          protectedSetting,
        },
      });
    }
  );

  it('rejects protected paths hidden behind accessors without invoking them', () => {
    const getter = jest.fn(() => ({ context: protectedContext }));
    const callerPreset: GraphileConfig.Preset = {};
    Object.defineProperty(callerPreset, 'grafast', {
      enumerable: true,
      get: getter,
    });

    expect(() => compose({ callerPreset })).toThrow(
      expect.objectContaining({
        code: 'GRAPHILE_PROTECTED_PRESET_OVERRIDE',
        context: expect.objectContaining({
          protectedSetting: 'grafast.context',
        }),
      })
    );
    expect(getter).not.toHaveBeenCalled();
  });

  it.each([
    [{ plugins: [protectedPlugin] }, 'plugins.ProtectedPlugin'],
    [{ disablePlugins: ['ProtectedPlugin'] }, 'disablePlugins.ProtectedPlugin'],
  ])(
    'rejects protected plugin replacement and disablement',
    (callerPreset, protectedSetting) => {
      const error = captureError(() =>
        compose({ callerPreset: callerPreset as GraphileConfig.Preset })
      );

      expect(error).toMatchObject({
        code: 'GRAPHILE_PROTECTED_PRESET_OVERRIDE',
        context: {
          presetPath: 'graphile.preset',
          protectedSetting,
        },
      });
    }
  );

  it('rejects protected settings in nested extends with their exact path', () => {
    const error = captureError(() =>
      compose({
        callerExtends: [
          {
            extends: [
              {
                grafserv: { maskError: protectedMaskError },
              },
            ],
          },
        ],
      })
    );

    expect(error).toMatchObject({
      code: 'GRAPHILE_PROTECTED_PRESET_OVERRIDE',
      context: {
        presetPath: 'graphile.extends[0].extends[0]',
        protectedSetting: 'grafserv.maskError',
      },
    });
  });

  it('rejects circular caller preset graphs deterministically', () => {
    const cyclic: GraphileConfig.Preset = {};
    cyclic.extends = [cyclic];

    const error = captureError(() =>
      assertGraphileCallerPresetsSafe(
        {
          callerExtends: [cyclic],
          callerPresetsTrusted: true,
        },
        protection
      )
    );

    expect(error).toMatchObject({
      code: 'GRAPHILE_CALLER_PRESET_INVALID',
      context: {
        presetPath: 'graphile.extends[0].extends[0]',
        reason: 'extends must not contain a cycle',
      },
    });
  });

  it('does not admit configuration inherited through a preset prototype', () => {
    const callerPreset = Object.create({
      extends: [{ pgServices: [{ name: 'other' }] }],
    }) as GraphileConfig.Preset;

    expect(() =>
      compose({ callerPreset, callerPresetsTrusted: false })
    ).toThrow(
      expect.objectContaining({ code: 'GRAPHILE_CALLER_PRESET_NOT_TRUSTED' })
    );

    expect(() => compose({ callerPreset })).toThrow(
      expect.objectContaining({
        code: 'GRAPHILE_CALLER_PRESET_INVALID',
        context: expect.objectContaining({
          presetPath: 'graphile.preset',
          reason: 'preset must be a plain object',
        }),
      })
    );
  });

  it.each([
    [{ extends: {} }, 'extends must be an array'],
    [{ plugins: {} }, 'plugins must be an array'],
    [
      { disablePlugins: [protectedPlugin] },
      'disabled plugin name must be a string',
    ],
  ])('rejects malformed caller preset fields', (callerPreset, reason) => {
    const error = captureError(() =>
      compose({
        callerPreset: callerPreset as unknown as GraphileConfig.Preset,
      })
    );

    expect(error).toMatchObject({
      code: 'GRAPHILE_CALLER_PRESET_INVALID',
      context: expect.objectContaining({ reason }),
    });
  });

  it('accepts a shared nested preset that is not circular', () => {
    const shared: GraphileConfig.Preset = {
      schema: { defaultBehavior: '-delete' },
    };

    expect(() =>
      compose({
        callerExtends: [{ extends: [shared] }, { extends: [shared] }],
      })
    ).not.toThrow();
  });

  it('accepts future feature-owned protection without changing the primitive', () => {
    const futureProtection: GraphilePresetProtectionPolicy = {
      protectedPaths: ['schema.futureSecuritySetting'],
      protectedPluginNames: ['FutureAdmissionPlugin'],
    };

    expect(() =>
      assertGraphileCallerPresetsSafe(
        {
          callerPreset: {
            schema: { futureSecuritySetting: false },
          } as unknown as GraphileConfig.Preset,
          callerPresetsTrusted: true,
        },
        futureProtection
      )
    ).toThrow(
      expect.objectContaining({
        code: 'GRAPHILE_PROTECTED_PRESET_OVERRIDE',
        context: expect.objectContaining({
          protectedSetting: 'schema.futureSecuritySetting',
        }),
      })
    );
  });
});
