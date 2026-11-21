import type { PublicKeyChallengeConfig } from '../src/plugins/PublicKeySignature';
import { PublicKeySignature } from '../src/plugins/PublicKeySignature';

const defaultConfig: PublicKeyChallengeConfig = {
  schema: 'app_private',
  crypto_network: 'btc',
  sign_up_with_key: 'sign_up_with_key',
  sign_in_request_challenge: 'sign_in_request_challenge',
  sign_in_record_failure: 'sign_in_record_failure',
  sign_in_with_challenge: 'sign_in_with_challenge',
};

describe('PublicKeySignature plugin factory', () => {
  it('returns a valid GraphileConfig.Plugin object', () => {
    const plugin = PublicKeySignature(defaultConfig, 'custom_anon');
    expect(plugin).toBeDefined();
    expect(typeof plugin).toBe('object');
    // extendSchema returns a plugin with a name and version
    expect(plugin.name).toBeDefined();
    expect(typeof plugin.name).toBe('string');
  });

  it('returns a plugin with schema hooks', () => {
    const plugin = PublicKeySignature(defaultConfig, 'custom_anon');
    expect(plugin.schema).toBeDefined();
    expect(plugin.schema!.hooks).toBeDefined();
  });

  it('accepts custom config values', () => {
    const customConfig: PublicKeyChallengeConfig = {
      schema: 'custom_schema',
      crypto_network: 'eth',
      sign_up_with_key: 'custom_signup',
      sign_in_request_challenge: 'custom_challenge',
      sign_in_record_failure: 'custom_failure',
      sign_in_with_challenge: 'custom_verify',
    };
    const plugin = PublicKeySignature(customConfig, 'custom_anon');
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
    expect(() => PublicKeySignature(defaultConfig, 'custom_anon')).not.toThrow();
  });
});

describe('PublicKeySignature config validation', () => {
  it.each(['', '   ', undefined])('rejects a missing anonymous role %p', (role) => {
    expect(() => PublicKeySignature(defaultConfig, role as string)).toThrow(/anonymous role is required/);
  });
  it('throws on invalid schema name', () => {
    expect(() => PublicKeySignature({ ...defaultConfig, schema: 'DROP TABLE' }, 'custom_anon')).toThrow(/invalid schema/);
  });

  it('throws on invalid function name', () => {
    expect(() => PublicKeySignature({ ...defaultConfig, sign_up_with_key: 'evil"; DROP' }, 'custom_anon')).toThrow(
      /invalid sign_up_with_key/,
    );
  });

  it('throws on invalid crypto_network value', () => {
    expect(() => PublicKeySignature({ ...defaultConfig, crypto_network: 'btc mainnet' }, 'custom_anon')).toThrow(
      /invalid crypto_network/,
    );
  });

  it('throws on function name with uppercase letters', () => {
    expect(() => PublicKeySignature({ ...defaultConfig, sign_in_request_challenge: 'BadName' }, 'custom_anon')).toThrow(
      /invalid sign_in_request_challenge/,
    );
  });

  it('throws on function name starting with a number', () => {
    expect(() => PublicKeySignature({ ...defaultConfig, sign_in_record_failure: '1bad' }, 'custom_anon')).toThrow(
      /invalid sign_in_record_failure/,
    );
  });

  it('accepts valid snake_case identifiers', () => {
    expect(() => PublicKeySignature(defaultConfig, 'custom_anon')).not.toThrow();
  });
});

describe('PublicKeySignature query roles', () => {
  it('uses the served anonymous role for signup and challenge queries', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ sign_in_request_challenge: 'challenge' }] });
    let plans: any;
    jest.isolateModules(() => {
      jest.doMock('graphile-utils', () => ({
        gql: () => '',
        extendSchema: (factory: any) => { plans = factory().plans; return {}; }
      }));
      jest.doMock('grafast', () => ({
        context: () => ({ get: (): undefined => undefined }),
        object: (value: any) => value,
        lambda: (_value: any, callback: any) => callback
      }));
      jest.doMock('pg-query-context', () => ({ __esModule: true, default: query }));
      const { PublicKeySignature: factory } = require('../src/plugins/PublicKeySignature');
      factory(defaultConfig, 'served_anon');
    });
    const client = { query: jest.fn() };
    const args = { input: { publicKey: 'key' }, withPgClient: (_: any, callback: any) => callback(client) };
    const fieldArgs = { getRaw: (): undefined => undefined };
    await expect(plans.Mutation.createUserAccountWithPublicKey(null, fieldArgs)(args)).resolves.toEqual({ message: 'challenge' });
    await expect(plans.Mutation.getMessageForSigning(null, fieldArgs)(args)).resolves.toEqual({ message: 'challenge' });
    expect(query).toHaveBeenCalledTimes(3);
    for (const [options] of query.mock.calls) expect(options.context).toEqual({ role: 'served_anon' });
    query.mockRejectedValueOnce(new Error('query failed'));
    await expect(plans.Mutation.createUserAccountWithPublicKey(null, fieldArgs)(args)).rejects.toThrow('query failed');
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
    await expect(plans.Mutation.getMessageForSigning(null, fieldArgs)({ ...args, input: { publicKey: '' } })).rejects.toThrow('INVALID_PUBLIC_KEY');
  });
});
