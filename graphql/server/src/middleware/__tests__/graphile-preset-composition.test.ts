import type { GraphileConfig } from 'graphile-config';
import { resolvePreset } from 'graphile-config';

import {
  composeGraphilePreset,
  GRAPHILE_CALLER_PRESET_NOT_TRUSTED_CODE,
  GRAPHILE_PROTECTED_PRESET_OVERRIDE_CODE,
  GraphileCallerPresetNotTrustedError,
  GraphileProtectedPresetOverrideError
} from '../graphile-preset-composition';

const callerPlugin: GraphileConfig.Plugin = {
  name: 'CallerSchemaPlugin',
  version: '1.0.0'
};

const authPlugin: GraphileConfig.Plugin = {
  name: 'AuthCookiePlugin',
  version: '1.0.0'
};

const websocketAdmissionPlugin: GraphileConfig.Plugin = {
  name: 'ConstructiveWebSocketOperationAdmissionPlugin',
  version: '1.0.0'
};

const exactService = {
  name: 'main',
  adaptor: 'constructive-test-adaptor'
} as unknown as NonNullable<GraphileConfig.Preset['pgServices']>[number];

const protectedContext = jest.fn(() => ({
  pgSettings: { role: 'tenant_runtime' }
}));
const protectedMaskError = jest.fn((error) => error);

const compose = (
  overrides: Partial<Parameters<typeof composeGraphilePreset>[0]> = {}
): GraphileConfig.Preset => composeGraphilePreset({
  basePresets: [],
  callerPresetsTrusted: true,
  protectedPlugins: [authPlugin, websocketAdmissionPlugin],
  pgServices: [exactService],
  schema: { releaseBuildStateAfterValidation: true },
  grafserv: {
    graphqlPath: '/graphql',
    graphiqlPath: '/graphiql',
    graphiql: true,
    graphiqlOnGraphQLGET: false,
    websockets: true,
    maskError: protectedMaskError
  },
  grafast: {
    context: protectedContext,
    explain: false
  },
  ...overrides
});

describe('Graphile caller preset composition', () => {
  it('rejects every non-empty caller preset unless startup admitted it as trusted code', () => {
    for (const input of [
      { callerExtends: [{ plugins: [callerPlugin] }] },
      { callerPreset: { schema: { defaultBehavior: '-delete' } } }
    ]) {
      expect(() => compose({
        ...input,
        callerPresetsTrusted: false
      })).toThrow(expect.objectContaining({
        code: GRAPHILE_CALLER_PRESET_NOT_TRUSTED_CODE
      }));
    }
  });

  it('allows empty defaults without widening the production trust boundary', () => {
    expect(() => compose({
      callerExtends: [],
      callerPreset: {},
      callerPresetsTrusted: false
    })).not.toThrow();
  });

  it('reports caller trust admission as a startup configuration error', () => {
    expect(() => compose({
      callerExtends: [{ plugins: [callerPlugin] }],
      callerPresetsTrusted: false
    })).toThrow(GraphileCallerPresetNotTrustedError);
  });

  it('applies caller plugins and safe schema/runtime configuration', () => {
    const resolved = resolvePreset(compose({
      callerExtends: [{ plugins: [callerPlugin] }],
      callerPreset: {
        schema: { defaultBehavior: '-delete' },
        grafserv: { maxRequestLength: 123_456 }
      }
    }));

    expect(resolved.plugins).toEqual(expect.arrayContaining([
      callerPlugin,
      authPlugin,
      websocketAdmissionPlugin
    ]));
    expect(resolved.schema).toMatchObject({
      defaultBehavior: '-delete',
      releaseBuildStateAfterValidation: true
    });
    expect(resolved.grafserv).toMatchObject({
      maxRequestLength: 123_456,
      graphqlPath: '/graphql',
      websockets: true,
      maskError: protectedMaskError
    });
    expect(resolved.grafast).toMatchObject({
      context: protectedContext,
      explain: false
    });
    expect(resolved.pgServices).toEqual([exactService]);
  });

  it.each([
    [
      'runtime service',
      { pgServices: [{ name: 'attacker' }] },
      'pgServices'
    ],
    [
      'tenant context',
      { grafast: { context: () => ({ pgSettings: {} }) } },
      'grafast.context'
    ],
    [
      'error masking',
      { grafserv: { maskError: (error: unknown) => error } },
      'grafserv.maskError'
    ],
    [
      'WebSocket transport',
      { grafserv: { websockets: false } },
      'grafserv.websockets'
    ],
    [
      'server build-state policy',
      { schema: { releaseBuildStateAfterValidation: false } },
      'schema.releaseBuildStateAfterValidation'
    ],
    [
      'protected plugin replacement',
      { plugins: [{ name: 'AuthCookiePlugin' }] },
      'plugins.AuthCookiePlugin'
    ],
    [
      'protected plugin disable',
      { disablePlugins: ['ConstructiveWebSocketOperationAdmissionPlugin'] },
      'disablePlugins.ConstructiveWebSocketOperationAdmissionPlugin'
    ]
  ])('rejects caller %s overrides', (_label, callerPreset, protectedSetting) => {
    let thrown: unknown;
    try {
      compose({
        callerPreset: callerPreset as unknown as GraphileConfig.Preset
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(GraphileProtectedPresetOverrideError);
    expect(thrown).toMatchObject({
      code: GRAPHILE_PROTECTED_PRESET_OVERRIDE_CODE,
      presetPath: 'graphile.preset',
      protectedSetting
    });
  });

  it('rejects protected overrides hidden in nested caller extends', () => {
    expect(() => compose({
      callerExtends: [{
        extends: [{
          pgServices: [{ name: 'attacker' }]
        } as unknown as GraphileConfig.Preset]
      }]
    })).toThrow(expect.objectContaining({
      code: GRAPHILE_PROTECTED_PRESET_OVERRIDE_CODE,
      presetPath: 'graphile.extends[0].extends[0]',
      protectedSetting: 'pgServices'
    }));
  });
});
