import type { PublicKeyChallengeConfig } from '../src/plugins/PublicKeySignature';
import {
  PublicKeySignature,
  withAnonymousPublicKeyClient,
} from '../src/plugins/PublicKeySignature';

const defaultConfig: PublicKeyChallengeConfig = {
  schema: 'app_private',
  anonymousRole: 'api_anonymous',
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

  it('throws on an invalid anonymous role', () => {
    expect(() => PublicKeySignature({ ...defaultConfig, anonymousRole: 'tenant-a; SET ROLE owner' }))
      .toThrow(/invalid anonymousRole/);
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
  it('preserves the complete request GUC contract while forcing the anonymous role', async () => {
    const pgSettings = {
      role: 'authenticated',
      'jwt.claims.api_id': 'api-a',
      'jwt.claims.database_id': 'database-a',
      'jwt.claims.user_id': '',
      'jwt.claims.session_id': '',
      'request.id': 'request-a',
      transaction_read_only: 'off',
      search_path: 'pg_catalog, "tenant_a"',
      row_security: 'on',
    };
    const pgClient = {
      query: jest.fn(async (): Promise<{ rows: Record<string, unknown>[] }> => ({ rows: [] })),
    };
    const callback = jest.fn(async (client) => client);
    const withPgClient = jest.fn(async (settings, fn) => {
      expect(settings).toEqual({ ...pgSettings, role: 'api_anonymous' });
      expect(settings).not.toBe(pgSettings);
      return fn(pgClient);
    });

    await expect(withAnonymousPublicKeyClient(
      withPgClient,
      pgSettings,
      'api_anonymous',
      callback,
    )).resolves.toBe(pgClient);

    expect(withPgClient).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(pgClient);
    expect(pgSettings.role).toBe('authenticated');
  });

  it.each([
    ['missing withPgClient', undefined, { role: 'anonymous' }, 'PG_CLIENT_CONTEXT_UNAVAILABLE'],
    ['missing pgSettings', jest.fn(), undefined, 'PG_SETTINGS_UNAVAILABLE'],
    ['null pgSettings', jest.fn(), null, 'PG_SETTINGS_UNAVAILABLE'],
  ])('fails closed for %s', async (_label, withPgClient, pgSettings, expected) => {
    await expect(withAnonymousPublicKeyClient(
      withPgClient as any,
      pgSettings,
      'api_anonymous',
      async (): Promise<null> => null,
    )).rejects.toThrow(expected);
  });
});
