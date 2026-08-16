import { buildPgSettings } from '@constructive-io/express-context';

import type { PublicKeyChallengeConfig } from '../src/plugins/PublicKeySignature';
import {
  PublicKeySignature,
  queryPublicKeyFunction,
  withAnonymousPublicKeyClient,
} from '../src/plugins/PublicKeySignature';

const defaultConfig: PublicKeyChallengeConfig = {
  schema: 'app_private',
  anonymousRole: 'anonymous_runtime',
  crypto_network: 'btc',
  sign_up_with_key: 'sign_up_with_key',
  sign_in_request_challenge: 'sign_in_request_challenge',
  sign_in_record_failure: 'sign_in_record_failure',
  sign_in_with_challenge: 'sign_in_with_challenge',
};

describe('PublicKeySignature plugin factory', () => {
  it('returns a valid GraphileConfig.Plugin object', () => {
    const plugin = PublicKeySignature(defaultConfig);
    expect(plugin).toBeDefined();
    expect(typeof plugin).toBe('object');
    // extendSchema returns a plugin with a name and version
    expect(plugin.name).toBeDefined();
    expect(typeof plugin.name).toBe('string');
  });

  it('returns a plugin with schema hooks', () => {
    const plugin = PublicKeySignature(defaultConfig);
    expect(plugin.schema).toBeDefined();
    expect(plugin.schema!.hooks).toBeDefined();
  });

  it('accepts custom config values', () => {
    const customConfig: PublicKeyChallengeConfig = {
      schema: 'custom_schema',
      anonymousRole: 'custom_anonymous',
      crypto_network: 'eth',
      sign_up_with_key: 'custom_signup',
      sign_in_request_challenge: 'custom_challenge',
      sign_in_record_failure: 'custom_failure',
      sign_in_with_challenge: 'custom_verify',
    };
    const plugin = PublicKeySignature(customConfig);
    expect(plugin).toBeDefined();
    expect(typeof plugin.name).toBe('string');
  });

  it('default export matches named export', async () => {
    const mod = await import('../src/plugins/PublicKeySignature');
    expect(mod.default).toBe(mod.PublicKeySignature);
  });
});

describe('PublicKeyChallengeConfig interface', () => {
  it('requires all config fields', () => {
    // TypeScript enforces this at compile time; this runtime check
    // verifies that the factory does not throw with a complete config.
    expect(() => PublicKeySignature(defaultConfig)).not.toThrow();
  });
});

describe('PublicKeySignature config validation', () => {
  it('throws on invalid schema name', () => {
    expect(() => PublicKeySignature({ ...defaultConfig, schema: 'DROP TABLE' })).toThrow(/invalid schema/);
  });

  it('throws on invalid anonymous role', () => {
    expect(() =>
      PublicKeySignature({
        ...defaultConfig,
        anonymousRole: 'anonymous; RESET ALL',
      })
    ).toThrow(/invalid anonymousRole/);
  });

  it('throws on invalid function name', () => {
    expect(() => PublicKeySignature({ ...defaultConfig, sign_up_with_key: 'evil"; DROP' })).toThrow(
      /invalid sign_up_with_key/,
    );
  });

  it('throws on invalid crypto_network value', () => {
    expect(() => PublicKeySignature({ ...defaultConfig, crypto_network: 'btc mainnet' })).toThrow(
      /invalid crypto_network/,
    );
  });

  it('throws on function name with uppercase letters', () => {
    expect(() => PublicKeySignature({ ...defaultConfig, sign_in_request_challenge: 'BadName' })).toThrow(
      /invalid sign_in_request_challenge/,
    );
  });

  it('throws on function name starting with a number', () => {
    expect(() => PublicKeySignature({ ...defaultConfig, sign_in_record_failure: '1bad' })).toThrow(
      /invalid sign_in_record_failure/,
    );
  });

  it('accepts valid snake_case identifiers', () => {
    expect(() => PublicKeySignature(defaultConfig)).not.toThrow();
  });
});

describe('PublicKeySignature request context', () => {
  const pgSettings = buildPgSettings({
    api: {
      apiId: 'api-1',
      databaseId: 'database-1',
      dbname: 'tenant_db',
      anonRole: 'anonymous_runtime',
      roleName: 'authenticated_runtime',
      schema: ['app_public'],
    },
    token: {
      id: 'token-1',
      user_id: 'user-1',
      entity_id: 'entity-1',
    },
    requestId: 'request-1',
    dependencySchemas: ['app_shared'],
  });

  it('copies every setting and replaces only the role', async () => {
    const original = { ...pgSettings };
    const query = jest.fn();
    const callback = jest.fn(async () => 'ok');
    const withPgClient = jest.fn(async (settings, fn) => fn({ query }));

    await expect(
      withAnonymousPublicKeyClient(
        withPgClient,
        pgSettings,
        'anonymous_runtime',
        callback
      )
    ).resolves.toBe('ok');

    const anonymousSettings = withPgClient.mock.calls[0][0];
    expect(anonymousSettings).toEqual({
      ...pgSettings,
      role: 'anonymous_runtime',
    });
    expect(anonymousSettings).not.toBe(pgSettings);
    expect(Object.keys(anonymousSettings)).toEqual(Object.keys(pgSettings));
    expect(anonymousSettings['jwt.claims.api_id']).toBe('api-1');
    expect(anonymousSettings['jwt.claims.database_id']).toBe('database-1');
    expect(anonymousSettings['request.id']).toBe('request-1');
    expect(anonymousSettings.row_security).toBe('on');
    expect(anonymousSettings.search_path).toBe(
      'pg_catalog, "app_shared", "app_public"'
    );
    expect(anonymousSettings['jwt.claims.email']).toBe('');
    expect(pgSettings).toEqual(original);
  });

  it.each([
    [
      'missing withPgClient',
      undefined,
      pgSettings,
      'PUBLIC_KEY_PG_CLIENT_CONTEXT_UNAVAILABLE',
    ],
    ['missing settings', jest.fn(), undefined, 'PublicKeySignature pgSettings'],
    ['null settings', jest.fn(), null, 'PublicKeySignature pgSettings'],
    ['array settings', jest.fn(), [], 'PublicKeySignature pgSettings'],
    [
      'incomplete settings',
      jest.fn(),
      { role: 'authenticated_runtime' },
      'PublicKeySignature pgSettings',
    ],
  ])('fails closed for %s', async (_label, withPgClient, settings, message) => {
    await expect(
      withAnonymousPublicKeyClient(
        withPgClient,
        settings,
        'anonymous_runtime',
        async (): Promise<void> => undefined
      )
    ).rejects.toThrow(message);
  });

  it('uses the native query config and validates database identifiers', async () => {
    const query = jest.fn(async () => ({
      rows: [{ sign_in_request_challenge: 'challenge' }],
      rowCount: 1,
    }));

    await expect(
      queryPublicKeyFunction(
        { query } as never,
        'app_private',
        'sign_in_request_challenge',
        ['public-key']
      )
    ).resolves.toMatchObject({ rowCount: 1 });

    expect(query).toHaveBeenCalledWith({
      text: 'SELECT * FROM app_private.sign_in_request_challenge($1)',
      values: ['public-key'],
    });
    expect(() =>
      queryPublicKeyFunction(
        { query } as never,
        'unsafe.schema',
        'sign_in_request_challenge',
        []
      )
    ).toThrow(/invalid schema/);
    expect(() =>
      queryPublicKeyFunction(
        { query } as never,
        'app_private',
        'unsafe_function()',
        []
      )
    ).toThrow(/invalid function/);
  });
});
